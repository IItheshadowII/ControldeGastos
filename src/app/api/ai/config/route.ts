import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { broadcastRealtime } from "@/lib/realtime";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Config global compartida: usamos el primer registro como configuración efectiva
    const existing = await prisma.aIConfig.findFirst();
    if (!existing) {
        return NextResponse.json({ provider: "google", apiKey: "", modelName: "" });
    }

    const maskedKey = existing.apiKey
        ? existing.apiKey.slice(0, 4) + '...' + existing.apiKey.slice(-4)
        : '';

    return NextResponse.json({
        provider: existing.provider,
        apiKey: maskedKey,
        modelName: existing.modelName || "",
        hasKey: !!existing.apiKey,
    });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { provider, apiKey, modelName } = await req.json();

    const existing = await prisma.aIConfig.findFirst({ where: { userId: session.user.id } });
    if (existing) {
        await prisma.aIConfig.update({
            where: { id: existing.id },
            data: { provider, apiKey, modelName },
        });
    } else {
        await prisma.aIConfig.create({
            data: { userId: session.user.id, provider, apiKey, modelName },
        });
    }

    broadcastRealtime('ai.config.changed');
    return NextResponse.json({ success: true });
}
