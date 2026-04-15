import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export const SESSION_COOKIE_NAME = "session_token"

export type AppSession = {
    user: {
        id: string
        name: string | null
        email: string | null
        image?: string | null
    }
    expires: string
    sessionToken: string
}

export const auth = async (): Promise<AppSession | null> => {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!token) return null

    const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
    })

    if (!session || !session.user) return null

    if (new Date(session.expires) < new Date()) {
        await prisma.session.delete({ where: { sessionToken: token } })
        return null
    }

    return {
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
        },
        expires: session.expires.toISOString(),
        sessionToken: token,
    }
}

function getBearerToken(req: NextRequest): string | null {
    const header = req.headers.get("authorization") || req.headers.get("Authorization")
    if (!header) return null
    const match = header.match(/^Bearer\s+(.+)$/i)
    return match?.[1]?.trim() || null
}

export async function authFromRequest(req: NextRequest): Promise<AppSession | null> {
    const bearerToken = getBearerToken(req)
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
    const token = bearerToken || cookieToken
    if (!token) return null

    const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
    })

    if (!session || !session.user) return null

    if (new Date(session.expires) < new Date()) {
        await prisma.session.delete({ where: { sessionToken: token } })
        return null
    }

    return {
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
        },
        expires: session.expires.toISOString(),
        sessionToken: token,
    }
}

export async function signInWithCredentials(email: string, password: string, name?: string) {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.isActive || !user.passwordHash) {
        throw new Error("Credenciales inválidas")
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
        throw new Error("Credenciales inválidas")
    }

    const sessionToken = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días

    await prisma.session.create({
        data: {
            sessionToken,
            userId: user.id,
            expires,
        },
    })

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
        },
        expires: expires.toISOString(),
        sessionToken,
    } satisfies AppSession
}

export async function signOut() {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (token) {
        await prisma.session.deleteMany({ where: { sessionToken: token } })
    }

    cookieStore.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    })
}
