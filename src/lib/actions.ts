import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { writeAudit } from "@/lib/audit"

export async function getTransactions() {
    const session = await auth()
    if (!session?.user?.id) return []

    return await prisma.transaction.findMany({
        where: { userId: session.user.id },
        orderBy: { date: 'desc' },
    })
}

export async function addTransaction(data: any) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    return prisma.$transaction(async (db) => {
        const created = await db.transaction.create({
            data: {
                ...data,
                userId: session.user.id,
            },
        })
        await writeAudit(db, {
            actor: session.user,
            action: "CREATE",
            entityType: "TRANSACTION",
            entityId: created.id,
            description: created.description,
            after: created,
        })
        return created
    })
}
