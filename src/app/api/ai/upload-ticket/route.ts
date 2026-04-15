import { NextRequest, NextResponse } from "next/server";
import { authFromRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { extractTicketData, type AIProvider } from "@/lib/ai-service";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const SETTINGS_FILE = path.join(DATA_DIR, "google_settings.json");

function normalizeProvider(provider: unknown): AIProvider | null {
    if (typeof provider !== "string") return null;
    const p = provider.trim().toLowerCase();
    if (p === "google" || p === "gemini") return "google";
    if (p === "openai") return "openai";
    return null;
}

async function loadTicketAiConfigForUser(userId: string) {
    const dbConfig = await prisma.aIConfig.findFirst({ where: { userId } });
    if (dbConfig?.apiKey) {
        const provider = normalizeProvider(dbConfig.provider) || "google";
        return { provider, apiKey: dbConfig.apiKey, modelName: dbConfig.modelName || undefined };
    }

    // Fallback: si hay una config cargada por otro usuario (modo "global" previo)
    const anyConfig = await prisma.aIConfig.findFirst();
    if (anyConfig?.apiKey) {
        const provider = normalizeProvider(anyConfig.provider) || "google";
        return { provider, apiKey: anyConfig.apiKey, modelName: anyConfig.modelName || undefined };
    }

    // Fallback: configuración global en .data (misma que usa el consejero)
    try {
        const raw = await fs.promises.readFile(SETTINGS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed?.apiKey) {
            return {
                provider: "google" as const,
                apiKey: String(parsed.apiKey),
                modelName: parsed?.model ? String(parsed.model) : undefined,
            };
        }
    } catch {
        // ignore
    }

    // Fallback: variables de entorno (útil en deploys donde .data no persiste)
    if (process.env.GOOGLE_API_KEY) {
        return {
            provider: "google" as const,
            apiKey: String(process.env.GOOGLE_API_KEY),
            modelName: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
        };
    }
    if (process.env.OPENAI_API_KEY) {
        return {
            provider: "openai" as const,
            apiKey: String(process.env.OPENAI_API_KEY),
            modelName: process.env.OPENAI_MODEL || "gpt-4o",
        };
    }

    return null;
}

export async function POST(req: NextRequest) {
    const session = await authFromRequest(req);
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const aiConfig = await loadTicketAiConfigForUser(userId);
    if (!aiConfig) {
        return NextResponse.json(
            {
                error: "AI not configured",
                message: "Por favor configura una API Key de Google u OpenAI primero (Ajustes > IA o Ajustes > Google).",
            },
            { status: 400 }
        );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
        const extraction = await extractTicketData(
            buffer,
            aiConfig.provider,
            aiConfig.apiKey,
            { modelName: aiConfig.modelName }
        );

        if (!extraction) {
            return NextResponse.json({ error: 'No se pudieron extraer los datos del ticket. Revisa la configuración de IA o intenta otra foto.' }, { status: 500 });
        }

        return NextResponse.json(extraction);
    } catch (e: any) {
        console.error('Error procesando ticket:', e?.message || e)
        return NextResponse.json({ error: 'Error interno al procesar el ticket.', details: String(e?.message || e) }, { status: 500 })
    }
}
