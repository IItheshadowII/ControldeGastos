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

    const data = await req.json().catch(() => ({}));

    // Normalize amount server-side to accept formats like "400.000", "1.234.567,89" or "400000"
    function normalizeNumberInput(input: any) {
        if (input === null || typeof input === 'undefined') return null
        let s = String(input)
        // keep digits, dots and commas
        s = s.replace(/[^0-9.,]/g, '')
        if (!s) return null
        // normalize commas to dots
        s = s.replace(/,/g, '.')
        const dotCount = (s.match(/\./g) || []).length
        if (dotCount > 1) {
            // keep only last dot as decimal separator, remove other dots (thousand separators)
            const last = s.lastIndexOf('.')
            const intPart = s.slice(0, last).replace(/\./g, '')
            const fracPart = s.slice(last + 1)
            return fracPart ? `${intPart}.${fracPart}` : intPart
        }
        if (dotCount === 1) {
            const [intPart, fracPart] = s.split('.')
            // heuristic: if fractional part has 3 digits, it's probably a thousands grouping (e.g. 400.000)
            if (fracPart.length === 3) {
                return `${intPart}${fracPart}`
            }
            return fracPart ? `${intPart}.${fracPart}` : intPart
        }
        return s
    }

    const normalizedAmountRaw = normalizeNumberInput(data.amount)
    const amountNumber = normalizedAmountRaw !== null ? parseFloat(normalizedAmountRaw) : null
    if (amountNumber === null || Number.isNaN(amountNumber) || amountNumber <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (typeof data.description !== 'string' || data.description.trim().length < 3) {
        return NextResponse.json({ error: 'Description is required and must be at least 3 characters long' }, { status: 400 })
    }

    const rawType = typeof data.type === 'string' ? data.type.toUpperCase() : null;
    if (rawType !== 'INCOME' && rawType !== 'EXPENSE' && rawType !== 'LOAN') {
        return NextResponse.json({ error: 'Tipo de transacción inválido' }, { status: 400 })
    }

    const allowedFields: any = {
        description: data.description,
        type: rawType
    };

    if (typeof data.category === 'string') allowedFields.category = data.category;
    if (typeof data.currency === 'string' && ['ARS', 'USD'].includes(data.currency)) allowedFields.currency = data.currency;
    if (typeof data.frequency === 'string' && ['VARIABLE', 'FIXED'].includes(data.frequency.toUpperCase())) allowedFields.frequency = data.frequency.toUpperCase();
    if (typeof data.incomeType === 'string' && ['BLANCO', 'NEGRO'].includes(data.incomeType.toUpperCase())) allowedFields.incomeType = data.incomeType.toUpperCase();
    if (typeof data.isPaid === 'boolean') allowedFields.isPaid = data.isPaid;
    if (typeof data.isSavings === 'boolean') allowedFields.isSavings = data.isSavings;
    if (typeof data.loanType === 'string' && ['LENT', 'BORROWED'].includes(data.loanType.toUpperCase())) allowedFields.loanType = data.loanType.toUpperCase();
    if (typeof data.loanStatus === 'string' && ['PENDING', 'PAID'].includes(data.loanStatus.toUpperCase())) allowedFields.loanStatus = data.loanStatus.toUpperCase();
    if (typeof data.loanParty === 'string') allowedFields.loanParty = data.loanParty;
    if (typeof data.loanInstallments === 'number' && Number.isInteger(data.loanInstallments)) allowedFields.loanInstallments = data.loanInstallments;
    if (typeof data.loanNotes === 'string') allowedFields.loanNotes = data.loanNotes;
    if (typeof data.date === 'string' && !Number.isNaN(new Date(data.date).getTime())) {
        allowedFields.date = new Date(data.date);
    }

    const transaction = await prisma.transaction.create({
        data: {
            ...allowedFields,
            amount: amountNumber,
            userId,
            date: allowedFields.date ? allowedFields.date as Date : new Date(),
        },
    });

    broadcastRealtime('transactions.changed', { action: 'created', id: transaction.id });

    return NextResponse.json(transaction);
}

export async function GET(req: NextRequest) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
    });

    return NextResponse.json(transactions);
}
