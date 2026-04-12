import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '.data')
const SETTINGS_FILE = path.join(DATA_DIR, 'google_settings.json')

async function loadSettingsForUser(userId: string | undefined) {
    // Try DB first (config global compartida)
    const aiConfig = await prisma.aIConfig.findFirst()
    if (aiConfig && aiConfig.apiKey) {
        // El modelo se guarda como modelName en la tabla AIConfig
        return { apiKey: aiConfig.apiKey, model: aiConfig.modelName }
    }

    // Fallback to local .data settings
    try {
        const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf-8')
        const parsed = JSON.parse(raw)
        if (parsed && parsed.apiKey) return { apiKey: parsed.apiKey, model: parsed.model, baseUrl: parsed.baseUrl }
    } catch (e) { }

    return null
}

function extractTextFromGoogleResponse(data: any) {
    // Try several common shapes
    try {
        if (!data) return null
        if (data.candidates && data.candidates[0]) {
            const c = data.candidates[0]
            // Gemini format: candidates[0].content.parts[].text
            if (c.content && Array.isArray(c.content.parts)) {
                return c.content.parts.map((p: any) => p.text || '').join('\n')
            }
            return c.output || c.content || (c.message && c.message.content && c.message.content[0] && c.message.content[0].text) || null
        }
        if (data.output && data.output[0] && data.output[0].content) {
            const cont = data.output[0].content
            if (Array.isArray(cont)) return cont.map((x: any) => x.text).join('\n')
            return cont.text || null
        }
        if (data.responses && data.responses[0]) {
            const r = data.responses[0]
            if (r.candidates && r.candidates[0]) return r.candidates[0].output || r.candidates[0].content
        }
        if (data.choices && data.choices[0] && data.choices[0].text) return data.choices[0].text
        // fallback stringify
        return typeof data === 'string' ? data : JSON.stringify(data)
    } catch (e) {
        return null
    }
}

export async function GET(req: NextRequest) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await loadSettingsForUser(userId || undefined)
    if (!settings || !settings.apiKey) {
        return NextResponse.json({ recommendations: ["Configura tu API Key en ajustes para recibir consejos."] });
    }

    const transactions = await prisma.transaction.findMany({
        where: { userId },
        take: 50,
        orderBy: { date: 'desc' }
    });

    const prompt = `Analiza estas transacciones financieras y dame 3 consejos cortos y accionables en español para ahorrar más. Devuelve SOLO los consejos en un array JSON de strings. Transacciones: ${JSON.stringify(transactions)}`;

    try {
        const apiKey = settings.apiKey
        const model = settings.model || 'gemini-2.0'
        const baseUrl = (settings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')

        const modelPath = model.startsWith('models/') ? model : `models/${model}`
        const endpointBase = `${baseUrl}/${modelPath}:generateContent`
        const isSimpleApiKey = typeof apiKey === 'string' && apiKey.startsWith('AIza')
        const endpoint = isSimpleApiKey ? `${endpointBase}?key=${encodeURIComponent(apiKey)}` : endpointBase

        const headers: any = { 'Content-Type': 'application/json' }
        if (!isSimpleApiKey) headers['Authorization'] = `Bearer ${apiKey}`

        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 512,
                },
            }),
        })

        const data = await res.json()
        if (!res.ok) {
            const message = (data && data.error && (data.error.message || JSON.stringify(data.error))) || 'Respuesta no válida de la IA'
            return NextResponse.json({ recommendations: [`Error IA: ${message}`] })
        }
        const text = extractTextFromGoogleResponse(data)
        if (!text) return NextResponse.json({ recommendations: ["Error al conectar con la IA. Revisa tu API Key."] })

        const cleanJson = (typeof text === 'string' ? text : JSON.stringify(text)).replace(/```json|```/g, '').trim()
        let recommendations: string[] = []
        try {
            recommendations = JSON.parse(cleanJson)
        } catch (e) {
            // If parsing fails, fall back to returning the raw text as single recommendation
            recommendations = [cleanJson]
        }

        return NextResponse.json({ recommendations })
    } catch (e) {
        return NextResponse.json({ recommendations: ["Error al conectar con la IA. Revisa tu API Key."] });
    }
}
