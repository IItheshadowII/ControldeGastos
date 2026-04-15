import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ ok: false }, { status: 401 })
    }

    const me = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!me || !me.isActive) {
        return NextResponse.json({ ok: false }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
}
