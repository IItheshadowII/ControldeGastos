import { NextRequest, NextResponse } from "next/server"
import { signInWithCredentials } from "@/auth"

export async function POST(req: NextRequest) {
    const { email, password } = await req.json().catch(() => ({})) as {
        email?: string
        password?: string
    }

    if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 })
    }

    try {
        const session = await signInWithCredentials(email, password)
        return NextResponse.json({
            ok: true,
            token: session.sessionToken,
            expires: session.expires,
            user: session.user,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Credenciales inválidas" }, { status: 401 })
    }
}
