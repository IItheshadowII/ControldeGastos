import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { authFromRequest } from "@/auth"
import prisma from "@/lib/prisma"
import { broadcastRealtime } from "@/lib/realtime"

const recurringKey = (transaction: { description: string; currency: string }) =>
    `${transaction.description.trim().toLocaleLowerCase()}::${transaction.currency}`

export async function POST(req: NextRequest) {
    const session = await authFromRequest(req)
    const userId = session?.user?.id

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    try {
        let result: { created: number; skipped: number } | null = null

        // Serializable evita que dos dispositivos que abren la app al mismo
        // tiempo creen dos copias del mismo gasto fijo.
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                result = await prisma.$transaction(async (db) => {
                    const previousFixedExpenses = await db.transaction.findMany({
                        where: {
                            userId,
                            type: "EXPENSE",
                            frequency: "FIXED",
                            date: {
                                gte: previousMonthStart,
                                lt: currentMonthStart,
                            },
                        },
                        orderBy: { date: "desc" },
                    })

                    const currentFixedExpenses = await db.transaction.findMany({
                        where: {
                            userId,
                            type: "EXPENSE",
                            frequency: "FIXED",
                            date: {
                                gte: currentMonthStart,
                                lt: nextMonthStart,
                            },
                        },
                        select: { description: true, currency: true },
                    })

                    const existingKeys = new Set(currentFixedExpenses.map(recurringKey))
                    const previousKeys = new Set<string>()
                    let created = 0
                    let skipped = 0

                    for (const expense of previousFixedExpenses) {
                        const key = recurringKey(expense)

                        // Evita duplicados tanto del mes anterior como del actual.
                        if (previousKeys.has(key) || existingKeys.has(key)) {
                            skipped += 1
                            continue
                        }
                        previousKeys.add(key)

                        await db.transaction.create({
                            data: {
                                description: expense.description,
                                amount: 0,
                                currency: expense.currency,
                                type: "EXPENSE",
                                category: expense.category,
                                frequency: "FIXED",
                                isPaid: false,
                                isSavings: false,
                                date: currentMonthStart,
                                userId,
                            },
                        })
                        existingKeys.add(key)
                        created += 1
                    }

                    return { created, skipped }
                }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
                break
            } catch (error: any) {
                // P2034 indica conflicto de escritura; reintentamos la operación.
                if (error?.code !== "P2034" || attempt === 2) throw error
            }
        }

        const created = result?.created ?? 0
        if (created > 0) {
            broadcastRealtime("transactions.changed", { action: "reset-month", count: created })
        }

        return NextResponse.json({
            message: created > 0
                ? `Se renovaron ${created} gastos fijos para el nuevo mes.`
                : "Los gastos fijos del mes ya están actualizados.",
            created,
            skipped: result?.skipped ?? 0,
        })
    } catch (error) {
        console.error("Error resetting month:", error)
        return NextResponse.json({ error: "Failed to reset month" }, { status: 500 })
    }
}
