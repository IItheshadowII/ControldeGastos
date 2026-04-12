import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"

async function requireAdmin() {
    // Intento 1: si hay sesión y el usuario es admin, úsalo
    const session = await auth()
    if (session?.user?.id) {
        const me = await prisma.user.findUnique({ where: { id: session.user.id } })
        if (me?.isAdmin) return me
    }

    // Sin sesión admin válida
    return null
}

// Reservado para futuro: hoy no se usa, pero lo dejamos por si se vuelve a exigir login estricto.
async function requireAuth() {
    const session = await auth()
    if (!session?.user?.id) return null
    const me = await prisma.user.findUnique({ where: { id: session.user.id } })
    return me
}

export async function GET() {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, isActive: true, isAdmin: true },
        orderBy: { email: "asc" },
    })

    return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
    const me = await requireAdmin()
    if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { name, email, password, isAdmin } = await req.json().catch(() => ({})) as {
        name?: string
        email?: string
        password?: string
        isAdmin?: boolean
    }

    if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            email,
            name: name || email.split("@")[0],
            passwordHash,
            isActive: true,
            isAdmin: !!isAdmin,
        },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, isActive: user.isActive, isAdmin: user.isAdmin })
}
