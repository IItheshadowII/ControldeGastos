import crypto from 'crypto'
import prisma from '@/lib/prisma'

const ACCESS_TTL_SECONDS = 60 * 60
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60
const CODE_TTL_SECONDS = 5 * 60

type SignedPayload = Record<string, unknown> & {
    type: string
    exp?: number
}

export type McpClient = {
    type: 'client'
    clientName: string
    redirectUris: string[]
    tokenEndpointAuthMethod: 'none'
    iat: number
}

export type McpTokenPayload = {
    type: 'access' | 'refresh'
    userId: string
    clientId: string
    resource: string
    scope: string
    exp: number
    jti: string
}

export type McpAuthorizationRequest = {
    clientId: string
    redirectUri: string
    codeChallenge: string
    state: string
    resource: string
    scope: string
}

function oauthSecret() {
    const secret = process.env.MCP_OAUTH_SECRET
    if (!secret || secret.length < 32) {
        throw new Error('MCP_OAUTH_SECRET must contain at least 32 characters')
    }
    return secret
}

function encode(value: string | Buffer) {
    return Buffer.from(value).toString('base64url')
}

function decode(value: string) {
    return Buffer.from(value, 'base64url').toString('utf8')
}

function signature(value: string) {
    return crypto.createHmac('sha256', oauthSecret()).update(value).digest('base64url')
}

export function signPayload(payload: SignedPayload) {
    const encoded = encode(JSON.stringify(payload))
    return `${encoded}.${signature(encoded)}`
}

export function verifyPayload<T extends SignedPayload>(token: string, expectedType: T['type']): T | null {
    const [encoded, providedSignature] = token.split('.')
    if (!encoded || !providedSignature) return null
    const expectedSignature = signature(encoded)
    const left = Buffer.from(providedSignature)
    const right = Buffer.from(expectedSignature)
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null

    try {
        const payload = JSON.parse(decode(encoded)) as T
        if (payload.type !== expectedType) return null
        if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) return null
        return payload
    } catch {
        return null
    }
}

export function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export function mcpResourceUrl(origin?: string) {
    return process.env.MCP_PUBLIC_URL || `${origin || 'https://gastos.accesoit.com.ar'}/mcp`
}

export function mcpIssuerUrl(origin?: string) {
    const configured = process.env.MCP_PUBLIC_URL
    if (configured) return new URL(configured).origin
    return origin || 'https://gastos.accesoit.com.ar'
}

export function createClientId(clientName: string, redirectUris: string[]) {
    return signPayload({
        type: 'client',
        clientName: clientName.slice(0, 120),
        redirectUris,
        tokenEndpointAuthMethod: 'none',
        iat: Math.floor(Date.now() / 1000),
    } satisfies McpClient)
}

export function verifyClientId(clientId: string): McpClient | null {
    return verifyPayload<McpClient>(clientId, 'client')
}

export function isAllowedRedirectUri(uri: string) {
    try {
        const parsed = new URL(uri)
        if (parsed.protocol === 'https:' && parsed.hostname === 'chatgpt.com') return true
        return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)
    } catch {
        return false
    }
}

export function validateAuthorizationRequest(params: URLSearchParams, origin?: string): McpAuthorizationRequest {
    const responseType = params.get('response_type')
    const clientId = params.get('client_id') || ''
    const redirectUri = params.get('redirect_uri') || ''
    const codeChallenge = params.get('code_challenge') || ''
    const challengeMethod = params.get('code_challenge_method')
    const state = params.get('state') || ''
    const resource = params.get('resource') || mcpResourceUrl(origin)
    const requestedScope = params.get('scope') || 'expenses:read'
    const client = verifyClientId(clientId)

    if (responseType !== 'code') throw new Error('response_type must be code')
    if (!client) throw new Error('Unknown OAuth client')
    if (!client.redirectUris.includes(redirectUri) || !isAllowedRedirectUri(redirectUri)) {
        throw new Error('Invalid redirect_uri')
    }
    if (challengeMethod !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) {
        throw new Error('PKCE S256 is required')
    }
    if (resource !== mcpResourceUrl(origin)) throw new Error('Invalid resource')
    const scopes = requestedScope.split(/\s+/).filter(Boolean)
    if (!scopes.includes('expenses:read') || scopes.some(scope => scope !== 'expenses:read')) {
        throw new Error('Unsupported scope')
    }

    return { clientId, redirectUri, codeChallenge, state, resource, scope: 'expenses:read' }
}

export async function issueAuthorizationCode(userId: string, request: McpAuthorizationRequest) {
    const now = Math.floor(Date.now() / 1000)
    const code = signPayload({
        type: 'code',
        userId,
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        codeChallenge: request.codeChallenge,
        resource: request.resource,
        scope: request.scope,
        exp: now + CODE_TTL_SECONDS,
        jti: crypto.randomUUID(),
    })
    await prisma.session.create({
        data: {
            sessionToken: `mcp:code:${hashToken(code)}`,
            userId,
            expires: new Date((now + CODE_TTL_SECONDS) * 1000),
        },
    })
    return code
}

type CodePayload = SignedPayload & {
    type: 'code'
    userId: string
    clientId: string
    redirectUri: string
    codeChallenge: string
    resource: string
    scope: string
    exp: number
    jti: string
}

export async function exchangeAuthorizationCode(input: {
    code: string
    clientId: string
    redirectUri: string
    codeVerifier: string
    resource: string
}) {
    const payload = verifyPayload<CodePayload>(input.code, 'code')
    if (!payload) throw new Error('invalid_grant')
    if (payload.clientId !== input.clientId || payload.redirectUri !== input.redirectUri || payload.resource !== input.resource) {
        throw new Error('invalid_grant')
    }
    const challenge = crypto.createHash('sha256').update(input.codeVerifier).digest('base64url')
    if (challenge !== payload.codeChallenge) throw new Error('invalid_grant')

    const stored = await prisma.session.findUnique({
        where: { sessionToken: `mcp:code:${hashToken(input.code)}` },
    })
    if (!stored || stored.userId !== payload.userId || stored.expires <= new Date()) throw new Error('invalid_grant')
    await prisma.session.delete({ where: { sessionToken: stored.sessionToken } })

    return issueTokenPair(payload.userId, payload.clientId, payload.resource, payload.scope)
}

async function issueSignedToken(type: 'access' | 'refresh', userId: string, clientId: string, resource: string, scope: string, ttl: number) {
    const now = Math.floor(Date.now() / 1000)
    const token = signPayload({
        type,
        userId,
        clientId,
        resource,
        scope,
        exp: now + ttl,
        jti: crypto.randomUUID(),
    } satisfies McpTokenPayload)
    await prisma.session.create({
        data: {
            sessionToken: `mcp:${type}:${hashToken(token)}`,
            userId,
            expires: new Date((now + ttl) * 1000),
        },
    })
    return token
}

async function issueTokenPair(userId: string, clientId: string, resource: string, scope: string) {
    const [accessToken, refreshToken] = await Promise.all([
        issueSignedToken('access', userId, clientId, resource, scope, ACCESS_TTL_SECONDS),
        issueSignedToken('refresh', userId, clientId, resource, scope, REFRESH_TTL_SECONDS),
    ])
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS, scope }
}

export async function exchangeRefreshToken(refreshToken: string, clientId: string, resource: string) {
    const payload = verifyPayload<McpTokenPayload>(refreshToken, 'refresh')
    if (!payload || payload.clientId !== clientId || payload.resource !== resource) throw new Error('invalid_grant')
    const storedToken = `mcp:refresh:${hashToken(refreshToken)}`
    const stored = await prisma.session.findUnique({ where: { sessionToken: storedToken } })
    if (!stored || stored.userId !== payload.userId || stored.expires <= new Date()) throw new Error('invalid_grant')
    await prisma.session.delete({ where: { sessionToken: storedToken } })
    return issueTokenPair(payload.userId, payload.clientId, payload.resource, payload.scope)
}

export async function verifyAccessToken(token: string, expectedResource: string) {
    const payload = verifyPayload<McpTokenPayload>(token, 'access')
    if (!payload || payload.resource !== expectedResource || !payload.scope.split(' ').includes('expenses:read')) return null
    const stored = await prisma.session.findUnique({
        where: { sessionToken: `mcp:access:${hashToken(token)}` },
        include: { user: true },
    })
    if (!stored || stored.expires <= new Date() || !stored.user?.isActive || stored.userId !== payload.userId) return null
    return { payload, user: stored.user }
}

export function getBearerToken(request: Request) {
    const authorization = request.headers.get('authorization')
    return authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null
}

