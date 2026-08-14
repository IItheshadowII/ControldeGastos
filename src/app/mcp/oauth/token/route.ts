import { NextRequest, NextResponse } from 'next/server'
import {
    exchangeAuthorizationCode,
    exchangeRefreshToken,
    mcpResourceUrl,
    verifyClientId,
} from '@/lib/mcp-auth'

function tokenResponse(tokens: { accessToken: string, refreshToken: string, expiresIn: number, scope: string }) {
    return NextResponse.json({
        access_token: tokens.accessToken,
        token_type: 'Bearer',
        expires_in: tokens.expiresIn,
        refresh_token: tokens.refreshToken,
        scope: tokens.scope,
    }, { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } })
}

export async function POST(request: NextRequest) {
    const form = await request.formData()
    const grantType = String(form.get('grant_type') || '')
    const clientId = String(form.get('client_id') || '')
    const resource = String(form.get('resource') || mcpResourceUrl(request.nextUrl.origin))
    if (!verifyClientId(clientId) || resource !== mcpResourceUrl(request.nextUrl.origin)) {
        return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
    }

    try {
        if (grantType === 'authorization_code') {
            const tokens = await exchangeAuthorizationCode({
                code: String(form.get('code') || ''),
                clientId,
                redirectUri: String(form.get('redirect_uri') || ''),
                codeVerifier: String(form.get('code_verifier') || ''),
                resource,
            })
            return tokenResponse(tokens)
        }
        if (grantType === 'refresh_token') {
            const tokens = await exchangeRefreshToken(String(form.get('refresh_token') || ''), clientId, resource)
            return tokenResponse(tokens)
        }
        return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
    } catch {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    }
}

