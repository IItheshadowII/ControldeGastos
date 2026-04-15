import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { broadcastRealtime } from "@/lib/realtime";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    const existing = await prisma.transaction.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updateData: any = {};

    if (typeof data.amount === 'number' && !Number.isNaN(data.amount)) {
        updateData.amount = data.amount;
    }
    if (typeof data.description === 'string') {
        updateData.description = data.description;
    }
    if (typeof data.type === 'string') {
        const normalizedType = data.type.toUpperCase()
        if (normalizedType === 'INCOME' || normalizedType === 'EXPENSE' || normalizedType === 'LOAN') updateData.type = normalizedType
    }
    if (data.currency === 'ARS' || data.currency === 'USD') {
        updateData.currency = data.currency;
    }
    if (typeof data.frequency === 'string') {
        updateData.frequency = data.frequency;
    }
    if (typeof data.incomeType === 'string' || data.incomeType === null) {
        updateData.incomeType = data.incomeType;
    }
    if (typeof data.isPaid !== 'undefined') {
        updateData.isPaid = !!data.isPaid;
    }
    if (typeof data.isSavings !== 'undefined') {
        updateData.isSavings = !!data.isSavings;
    }
    if (typeof data.loanType === 'string') {
        const normalizedLoanType = data.loanType.toUpperCase()
        if (normalizedLoanType === 'LENT' || normalizedLoanType === 'BORROWED') updateData.loanType = normalizedLoanType
    }
    if (typeof data.loanStatus === 'string') {
        const normalizedLoanStatus = data.loanStatus.toUpperCase()
        if (normalizedLoanStatus === 'PENDING' || normalizedLoanStatus === 'PAID') updateData.loanStatus = normalizedLoanStatus
    }
    if (typeof data.loanParty === 'string' || data.loanParty === null) {
        updateData.loanParty = data.loanParty;
    }
    if (typeof data.loanInstallments === 'number' && Number.isInteger(data.loanInstallments)) {
        updateData.loanInstallments = data.loanInstallments;
    }
    if (typeof data.loanNotes === 'string' || data.loanNotes === null) {
        updateData.loanNotes = data.loanNotes;
    }
    if (typeof data.date === 'string' && !Number.isNaN(new Date(data.date).getTime())) {
        updateData.date = new Date(data.date);
    }

    const updated = await prisma.transaction.update({
        where: { id },
        data: updateData,
    });

    broadcastRealtime('transactions.changed', { action: 'updated', id });

    return NextResponse.json(updated);
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.transaction.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.transaction.delete({
        where: { id },
    });

    broadcastRealtime('transactions.changed', { action: 'deleted', id });

    return NextResponse.json({ success: true });
}
