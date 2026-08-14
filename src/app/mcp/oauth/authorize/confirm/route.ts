import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { issueAuthorizationCode, validateAuthorizationRequest } from '@/lib/mcp-auth'

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const form = await request.formData()
    const params = new URLSearchParams()
    const fieldMap: Record<string, string> = {
        clientId: 'client_id',
        redirectUri: 'redirect_uri',
        codeChallenge: 'code_challenge',
        state: 'state',
        resource: 'resource',
        scope: 'scope',
    }
    for (const [formField, queryField] of Object.entries(fieldMap)) {
        params.set(queryField, String(form.get(formField) || ''))
    }
    params.set('response_type', 'code')
    params.set('code_challenge_method', 'S256')

    let authorization
    try {
        authorization = validateAuthorizationRequest(params, request.nextUrl.origin)
    } catch {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }
    const redirectUrl = new URL(authorization.redirectUri)
    if (String(form.get('decision')) !== 'allow') {
        redirectUrl.searchParams.set('error', 'access_denied')
        if (authorization.state) redirectUrl.searchParams.set('state', authorization.state)
        return NextResponse.redirect(redirectUrl)
    }

    const code = await issueAuthorizationCode(session.user.id, authorization)
    redirectUrl.searchParams.set('code', code)
    if (authorization.state) redirectUrl.searchParams.set('state', authorization.state)
    return NextResponse.redirect(redirectUrl)
}

