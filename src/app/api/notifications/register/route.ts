import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authFromRequest } from "@/auth";

function isProbablyExpoPushToken(token: string): boolean {
    const t = token.trim();
    return t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[");
}

export async function POST(req: NextRequest) {
    const session = await authFromRequest(req);
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as {
        token?: string;
        platform?: string;
    };

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const platform = typeof body.platform === "string" ? body.platform.trim() : undefined;

    if (!token) {
        return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    if (!isProbablyExpoPushToken(token)) {
        return NextResponse.json({ error: "Invalid Expo push token" }, { status: 400 });
    }

    await prisma.pushToken.upsert({
        where: { token },
        update: { userId, platform },
        create: { token, userId, platform },
    });

    return NextResponse.json({ ok: true });
}
