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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const me = await requireAdmin()
    if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await req.json().catch(() => ({})) as {
        name?: string
        password?: string
        isActive?: boolean
        isAdmin?: boolean
    }

    const data: any = {}
    if (typeof body.name !== "undefined") data.name = body.name
    if (typeof body.isActive !== "undefined") data.isActive = body.isActive
    if (typeof body.isAdmin !== "undefined") data.isAdmin = body.isAdmin
    if (body.password) {
        data.passwordHash = await bcrypt.hash(body.password, 10)
    }

    const updated = await prisma.user.update({
        where: { id },
        data,
    })

    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, isActive: updated.isActive, isAdmin: updated.isAdmin })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const me = await requireAdmin()
    if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params

    // No permitir eliminar tu propio usuario
    if (id === me.id) {
        return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 })
    }

    // Verificar que el usuario objetivo exista
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Si el usuario objetivo es admin, permitir la eliminación solo si hay al menos
    // otro administrador (evitar eliminar al último admin)
    if (target.isAdmin) {
        const otherAdmins = await prisma.user.count({ where: { isAdmin: true, id: { not: id } } })
        if (otherAdmins < 1) {
            return NextResponse.json({ error: "No puedes eliminar el último administrador" }, { status: 400 })
        }
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
}
