import { NextRequest, NextResponse } from "next/server"
import { signInWithCredentials, SESSION_COOKIE_NAME } from "@/auth"

export async function POST(req: NextRequest) {
    const { email, password, name } = await req.json().catch(() => ({})) as {
        email?: string
        password?: string
        name?: string
    }

    if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 })
    }

    try {
        const session = await signInWithCredentials(email, password, name)

        const response = NextResponse.json({
            ok: true,
            user: session.user,
        })

        response.cookies.set(SESSION_COOKIE_NAME, session.sessionToken, {
            httpOnly: true,
            sameSite: "lax",
            // Mantenerlo en false para evitar bucles de login cuando el sitio corre sin HTTPS
            // (algunos proxies terminan SSL y el backend puede quedar en HTTP).
            secure: process.env.NODE_ENV === 'production',
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            expires: new Date(session.expires),
        })

        return response
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Credenciales inválidas" }, { status: 401 })
    }
}
