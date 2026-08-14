import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { authFromRequest } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
    const session = await authFromRequest(req)
    if (!session?.user?.id || !session.user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const params = req.nextUrl.searchParams
    const page = Math.max(1, Number(params.get("page")) || 1)
    const limit = Math.min(100, Math.max(10, Number(params.get("limit")) || 30))
    const action = params.get("action")
    const entityType = params.get("entityType")
    const query = params.get("query")?.trim()

    const where: Prisma.AuditLogWhereInput = {}
    if (action && ["CREATE", "UPDATE", "DELETE"].includes(action)) where.action = action
    if (entityType && ["TRANSACTION", "USER"].includes(entityType)) where.entityType = entityType
    if (query) {
        where.OR = [
            { description: { contains: query, mode: "insensitive" } },
            { actorName: { contains: query, mode: "insensitive" } },
            { actorEmail: { contains: query, mode: "insensitive" } },
            { entityId: { contains: query, mode: "insensitive" } },
        ]
    }

    const [items, total] = await prisma.$transaction([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
        items,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
    })
}
