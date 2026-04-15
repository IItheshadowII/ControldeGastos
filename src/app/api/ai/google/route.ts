import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '.data')
const SETTINGS_FILE = path.join(DATA_DIR, 'google_settings.json')

async function loadGoogleSettingsForUser(userId: string) {
  // DB first (persistente)
  const dbConfig = await prisma.aIConfig.findFirst({ where: { userId } })
  if (dbConfig?.apiKey) {
    return {
      apiKey: dbConfig.apiKey,
      model: dbConfig.modelName || 'gemini-2.0-flash',
      baseUrl: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    }
  }

  // Env fallback
  if (process.env.GOOGLE_API_KEY) {
    return {
      apiKey: process.env.GOOGLE_API_KEY,
      model: process.env.GOOGLE_MODEL || 'gemini-2.0-flash',
      baseUrl: process.env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    }
  }

  // File fallback (legacy)
  try {
    const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && parsed.apiKey) return { apiKey: parsed.apiKey, model: parsed.model, baseUrl: parsed.baseUrl }
  } catch (e) {
    // ignore
  }

  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, temperature = 0.2, maxTokens = 512 } = body

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const settings = await loadGoogleSettingsForUser(userId)
    if (!settings) {
      return NextResponse.json({ ok: false, error: 'No API settings configured' }, { status: 400 })
    }

    const apiKey = settings.apiKey
    const model = settings.model || 'gemini-2.0-flash'
    const baseUrl = settings.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'API key missing in settings' }, { status: 400 })
    }

    // Call Google Generative Language API (Gemini).
    // If the stored key is a simple API key (starts with 'AIza'), use `?key=` param.
    const base = baseUrl.replace(/\/$/, '')
    const modelPath = model.startsWith('models/') ? model : `models/${model}`
    const endpointBase = `${base}/${modelPath}:generateContent`
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
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data.error || data }, { status: res.status })
    }
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
