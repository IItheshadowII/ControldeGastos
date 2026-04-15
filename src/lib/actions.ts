import { auth } from "@/auth"
import prisma from "@/lib/prisma"

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

    return await prisma.transaction.create({
        data: {
            ...data,
            userId: session.user.id,
        },
    })
}
