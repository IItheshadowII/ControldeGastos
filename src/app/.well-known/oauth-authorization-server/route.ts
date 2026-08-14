import { NextRequest, NextResponse } from 'next/server'
import { mcpIssuerUrl } from '@/lib/mcp-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const issuer = mcpIssuerUrl(request.nextUrl.origin)
    return NextResponse.json({
        issuer,
        authorization_endpoint: `${issuer}/mcp/oauth/authorize`,
        token_endpoint: `${issuer}/mcp/oauth/token`,
        registration_endpoint: `${issuer}/mcp/oauth/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: ['expenses:read'],
    }, {
        headers: { 'Cache-Control': 'public, max-age=300' },
    })
}

