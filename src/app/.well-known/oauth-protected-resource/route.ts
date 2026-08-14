import { NextRequest, NextResponse } from 'next/server'
import { mcpIssuerUrl, mcpResourceUrl } from '@/lib/mcp-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const origin = request.nextUrl.origin
    return NextResponse.json({
        resource: mcpResourceUrl(origin),
        authorization_servers: [mcpIssuerUrl(origin)],
        scopes_supported: ['expenses:read'],
        resource_documentation: `${origin}/mcp/about`,
        bearer_methods_supported: ['header'],
    }, {
        headers: { 'Cache-Control': 'public, max-age=300' },
    })
}

