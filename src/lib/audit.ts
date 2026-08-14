import type { Prisma } from "@prisma/client"
import type { NextRequest } from "next/server"

type AuditActor = {
    id: string
    name: string | null
    email: string | null
}

type AuditInput = {
    actor: AuditActor
    action: "CREATE" | "UPDATE" | "DELETE"
    entityType: "TRANSACTION" | "USER"
    entityId?: string | null
    description?: string | null
    before?: unknown
    after?: unknown
    ipAddress?: string | null
    userAgent?: string | null
}

const toJson = (value: unknown): Prisma.InputJsonValue | undefined => {
    if (typeof value === "undefined" || value === null) return undefined
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export function auditRequestMetadata(req: NextRequest) {
    const forwarded = req.headers.get("x-forwarded-for")
    return {
        ipAddress: forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent")?.slice(0, 500) || null,
    }
}

export async function writeAudit(
    db: Prisma.TransactionClient,
    input: AuditInput,
) {
    return db.auditLog.create({
        data: {
            actorId: input.actor.id,
            actorName: input.actor.name,
            actorEmail: input.actor.email,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            description: input.description,
            before: toJson(input.before),
            after: toJson(input.after),
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        },
    })
}

export function publicUserSnapshot(user: {
    id: string
    name: string | null
    email: string | null
    isActive: boolean
    isAdmin: boolean
}) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
    }
}
