import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

const DATA_DIR = path.join(process.cwd(), '.data')
const SETTINGS_FILE = path.join(DATA_DIR, 'google_settings.json')

async function ensureDir() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true })
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const me = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!me?.isAdmin) return null
  return me
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({}, { status: 200 })
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    await ensureDir()
    await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(body, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Error al guardar configuración' }, { status: 500 })
  }
}

export async function DELETE() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await fs.promises.unlink(SETTINGS_FILE)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Error al eliminar configuración' }, { status: 500 })
  }
}
