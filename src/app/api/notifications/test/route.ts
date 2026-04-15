import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authFromRequest } from "@/auth";

async function sendExpoPush(tokens: string[], title: string, body: string) {
    if (!tokens.length) return { ok: true, result: [] };

    const messages = tokens.map((to) => ({
        to,
        sound: "default",
        title,
        body,
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
    });

    const json = await res.json().catch(() => null);
    return { ok: res.ok, result: json };
}

export async function POST(req: NextRequest) {
    const session = await authFromRequest(req);
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.pushToken.findMany({
        where: { userId },
        select: { token: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
    });

    const tokens = rows.map((r) => r.token);
    if (!tokens.length) {
        return NextResponse.json({ error: "No push tokens registered" }, { status: 400 });
    }

    const result = await sendExpoPush(tokens, "Control de Gastos", "Notificación de prueba ✅");
    return NextResponse.json({ ok: true, tokens: tokens.length, expo: result });
}
