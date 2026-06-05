import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { broadcastRealtime } from "@/lib/realtime";

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get last month's date
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthNumber = lastMonth.getMonth();
        const lastMonthYear = lastMonth.getFullYear();

        // Get all transactions from last month for this user (FIXED and USD expenses)
        const lastMonthTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(lastMonthYear, lastMonthNumber, 1),
                    lt: new Date(currentYear, currentMonth, 1),
                },
                // Only copy FIXED expenses and USD expenses (recurring items)
                OR: [
                    { type: 'EXPENSE', frequency: 'FIXED' },
                    { type: 'EXPENSE', currency: 'USD' },
                ]
            },
        });

        // Check if we already have transactions for this month
        const existingCurrentMonth = await prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(currentYear, currentMonth, 1),
                    lt: new Date(currentYear, currentMonth + 1, 1),
                },
            },
        });

        // If there are already transactions this month, don't reset
        if (existingCurrentMonth.length > 0) {
            return NextResponse.json({
                message: "Current month already has transactions",
                created: 0
            });
        }

        // Create new transactions for this month based on last month's structure
        const createdTransactions = [];

        for (const tx of lastMonthTransactions) {
            // Create a new transaction with amount = 0, isPaid = false
            const newTransaction = await prisma.transaction.create({
                data: {
                    description: tx.description,
                    type: tx.type,
                    currency: tx.currency,
                    category: tx.category,
                    frequency: tx.frequency,
                    incomeType: tx.incomeType,
                    isSavings: false,
                    isPaid: false, // Reset to unpaid
                    loanType: tx.loanType,
                    loanStatus: tx.loanStatus,
                    loanParty: tx.loanParty,
                    loanInstallments: tx.loanInstallments,
                    loanNotes: tx.loanNotes,
                    amount: 0, // Reset amount to 0
                    date: new Date(currentYear, currentMonth, 1),
                    userId,
                },
            });

            createdTransactions.push(newTransaction);
        }

        broadcastRealtime('transactions.changed', { action: 'reset-month', count: createdTransactions.length });

        return NextResponse.json({
            message: `Month reset completed. Created ${createdTransactions.length} transactions.`,
            created: createdTransactions.length,
            transactions: createdTransactions,
        });
    } catch (error) {
        console.error('Error resetting month:', error);
        return NextResponse.json(
            { error: 'Failed to reset month' },
            { status: 500 }
        );
    }
}
