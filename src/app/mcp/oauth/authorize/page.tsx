import { auth } from '@/auth'
import { mcpResourceUrl, validateAuthorizationRequest } from '@/lib/mcp-auth'
import { redirect } from 'next/navigation'
import { Lock, WalletCards } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function McpAuthorizePage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const paramsObject = await searchParams
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(paramsObject)) {
        if (typeof value === 'string') params.set(key, value)
    }
    const session = await auth()
    if (!session) redirect(`/login?from=${encodeURIComponent(`/mcp/oauth/authorize?${params.toString()}`)}`)

    let authorization
    try {
        authorization = validateAuthorizationRequest(params, new URL(mcpResourceUrl()).origin)
    } catch (error) {
        return (
            <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <div className="max-w-lg w-full p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5">
                    <h1 className="text-xl font-bold">Solicitud de conexión inválida</h1>
                    <p className="text-sm text-white/50 mt-3">{error instanceof Error ? error.message : 'No se pudo validar la solicitud OAuth.'}</p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="fixed inset-0 bg-mesh opacity-[0.07] pointer-events-none" />
            <div className="relative max-w-xl w-full p-8 sm:p-10 rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                    <WalletCards className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Conectar con ChatGPT</p>
                <h1 className="text-2xl font-bold mt-2">Autorizar análisis de gastos</h1>
                <p className="text-sm text-white/50 leading-relaxed mt-4">
                    ChatGPT solicita acceso de solo lectura a los movimientos financieros de <strong className="text-white">{session.user.name || session.user.email}</strong>.
                </p>
                <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3">
                    <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold">Permiso: consultar gastos</p>
                        <p className="text-xs text-white/40 mt-1">Podrá leer resúmenes, categorías, ahorros y préstamos. No podrá crear, editar ni eliminar registros.</p>
                    </div>
                </div>
                <form action="/mcp/oauth/authorize/confirm" method="post" className="mt-8 grid grid-cols-2 gap-3">
                    {Object.entries(authorization).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
                    <button name="decision" value="deny" className="h-12 rounded-xl border border-white/10 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5">Cancelar</button>
                    <button name="decision" value="allow" className="h-12 rounded-xl bg-blue-600 text-sm font-bold hover:bg-blue-500">Autorizar</button>
                </form>
            </div>
        </main>
    )
}

