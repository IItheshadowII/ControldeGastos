import { NextRequest, NextResponse } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createExpensesMcpServer } from '@/lib/mcp-server'
import { getBearerToken, mcpResourceUrl, verifyAccessToken } from '@/lib/mcp-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID',
        'Access-Control-Expose-Headers': 'MCP-Protocol-Version, MCP-Session-Id',
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

async function handleMcp(request: NextRequest) {
    const resource = mcpResourceUrl(request.nextUrl.origin)
    const token = getBearerToken(request)
    const authenticated = token ? await verifyAccessToken(token, resource) : null
    if (!token || !authenticated) {
        return NextResponse.json({ error: 'unauthorized' }, {
            status: 401,
            headers: {
                ...corsHeaders(),
                'WWW-Authenticate': `Bearer resource_metadata="${request.nextUrl.origin}/.well-known/oauth-protected-resource", scope="expenses:read"`,
            },
        })
    }

    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true })
    const server = createExpensesMcpServer(authenticated.user.id)
    await server.connect(transport)
    const response = await transport.handleRequest(request, {
        authInfo: {
            token,
            clientId: authenticated.payload.clientId,
            scopes: authenticated.payload.scope.split(' '),
            expiresAt: authenticated.payload.exp,
            resource: new URL(authenticated.payload.resource),
            extra: { userId: authenticated.user.id },
        },
    })
    const headers = new Headers(response.headers)
    Object.entries(corsHeaders()).forEach(([key, value]) => headers.set(key, value))
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export const GET = handleMcp
export const POST = handleMcp
export const DELETE = handleMcp

