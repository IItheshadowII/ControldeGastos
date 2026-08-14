import { NextRequest, NextResponse } from 'next/server'
import { createClientId, isAllowedRedirectUri } from '@/lib/mcp-auth'

export async function POST(request: NextRequest) {
    const data = await request.json().catch(() => ({})) as {
        client_name?: string
        redirect_uris?: string[]
        token_endpoint_auth_method?: string
    }
    const redirectUris = Array.isArray(data.redirect_uris) ? [...new Set(data.redirect_uris)] : []
    if (!redirectUris.length || redirectUris.length > 10 || redirectUris.some(uri => !isAllowedRedirectUri(uri))) {
        return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 })
    }
    if (data.token_endpoint_auth_method && data.token_endpoint_auth_method !== 'none') {
        return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 })
    }

    const clientId = createClientId(data.client_name || 'ChatGPT', redirectUris)
    return NextResponse.json({
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: (data.client_name || 'ChatGPT').slice(0, 120),
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
    }, { status: 201 })
}

