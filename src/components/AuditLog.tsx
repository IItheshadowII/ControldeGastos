"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
    Activity, ChevronDown, ChevronLeft, ChevronRight,
    Clock3, FilePlus2, Pencil, Search, ShieldCheck, Trash2, UserRound,
} from "lucide-react"
import { Card } from "@/components/ui-glass"

type AuditEntry = {
    id: string
    actorName: string | null
    actorEmail: string | null
    action: "CREATE" | "UPDATE" | "DELETE"
    entityType: "TRANSACTION" | "USER"
    entityId: string | null
    description: string | null
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
    ipAddress: string | null
    createdAt: string
}

const labels: Record<string, string> = {
    description: "Concepto",
    amount: "Monto",
    currency: "Moneda",
    type: "Tipo",
    category: "Categoría",
    frequency: "Frecuencia",
    isPaid: "Estado de pago",
    isSavings: "Marcado como ahorro",
    incomeType: "Tipo de ingreso",
    loanType: "Tipo de préstamo",
    loanStatus: "Estado del préstamo",
    loanParty: "Persona",
    loanInstallments: "Cuotas",
    loanNotes: "Notas",
    date: "Fecha del movimiento",
    name: "Nombre",
    email: "Correo",
    isActive: "Usuario activo",
    isAdmin: "Administrador",
    passwordChanged: "Contraseña",
}

const ignoredFields = new Set(["id", "userId"])

function formatValue(key: string, value: unknown) {
    if (value === null || typeof value === "undefined" || value === "") return "Sin dato"
    if (typeof value === "boolean") {
        if (key === "isPaid") return value ? "Pagado" : "Pendiente"
        if (key === "isSavings") return value ? "Sí" : "No"
        return value ? "Sí" : "No"
    }
    if (key === "amount" && typeof value === "number") return value.toLocaleString("es-AR")
    if (key === "date" && typeof value === "string") return new Date(value).toLocaleString("es-AR")
    const translations: Record<string, string> = {
        INCOME: "Ingreso", EXPENSE: "Gasto", LOAN: "Préstamo",
        FIXED: "Fijo", VARIABLE: "Variable", PAID: "Pagado", PENDING: "Pendiente",
        BLANCO: "En blanco", NEGRO: "En negro", LENT: "Prestado", BORROWED: "Recibido",
    }
    return translations[String(value)] || String(value)
}

function changesFor(entry: AuditEntry) {
    const before = entry.before || {}
    const after = entry.after || {}
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])

    return [...keys]
        .filter(key => !ignoredFields.has(key) && labels[key])
        .filter(key => entry.action !== "UPDATE" || JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        .map(key => ({ key, label: labels[key] || key, before: before[key], after: after[key] }))
}

function actionInfo(action: AuditEntry["action"]) {
    if (action === "CREATE") return { label: "Creado", classes: "bg-emerald-500/10 border-emerald-500/15 text-emerald-400", icon: FilePlus2 }
    if (action === "DELETE") return { label: "Eliminado", classes: "bg-rose-500/10 border-rose-500/15 text-rose-400", icon: Trash2 }
    return { label: "Modificado", classes: "bg-blue-500/10 border-blue-500/15 text-blue-400", icon: Pencil }
}

export function AuditLog() {
    const [entries, setEntries] = useState<AuditEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [action, setAction] = useState("ALL")
    const [entityType, setEntityType] = useState("ALL")
    const [query, setQuery] = useState("")
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        const timer = window.setTimeout(async () => {
            setLoading(true)
            setError("")
            const params = new URLSearchParams({ page: String(page), limit: "30" })
            if (action !== "ALL") params.set("action", action)
            if (entityType !== "ALL") params.set("entityType", entityType)
            if (query.trim()) params.set("query", query.trim())

            try {
                const res = await fetch(`/api/audit?${params}`, { signal: controller.signal })
                if (!res.ok) throw new Error(res.status === 403 ? "Sólo los administradores pueden ver la auditoría." : "No se pudo cargar la auditoría.")
                const data = await res.json()
                setEntries(Array.isArray(data.items) ? data.items : [])
                setTotal(data.total || 0)
                setPages(data.pages || 1)
            } catch (err) {
                if ((err as Error).name !== "AbortError") setError((err as Error).message)
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        }, query ? 300 : 0)

        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [page, action, entityType, query])

    useEffect(() => setPage(1), [action, entityType, query])

    const summary = useMemo(() => ({
        creates: entries.filter(item => item.action === "CREATE").length,
        updates: entries.filter(item => item.action === "UPDATE").length,
        deletes: entries.filter(item => item.action === "DELETE").length,
    }), [entries])

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Summary title="Registros auditados" value={total} icon={ShieldCheck} color="violet" />
                <Summary title="Altas en esta página" value={summary.creates} icon={FilePlus2} color="emerald" />
                <Summary title="Cambios en esta página" value={summary.updates} icon={Pencil} color="blue" />
                <Summary title="Bajas en esta página" value={summary.deletes} icon={Trash2} color="rose" />
            </div>

            <Card className="!p-0 !rounded-[20px] overflow-hidden">
                <div className="p-5 lg:p-6 border-b border-white/[0.07] space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <Activity className="w-5 h-5 text-violet-400" />
                                <h2 className="text-xl font-bold">Historial de actividad</h2>
                            </div>
                            <p className="mt-1.5 text-xs text-white/35">Cada alta, edición y eliminación queda registrada con su autor.</p>
                        </div>
                        <div className="relative w-full lg:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                placeholder="Buscar concepto, usuario o ID..."
                                className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-white/20 focus:border-violet-500/40"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <FilterGroup value={action} onChange={setAction} options={[
                            ["ALL", "Todas las acciones"], ["CREATE", "Altas"], ["UPDATE", "Modificaciones"], ["DELETE", "Eliminaciones"],
                        ]} />
                        <div className="hidden sm:block w-px bg-white/10 mx-1" />
                        <FilterGroup value={entityType} onChange={setEntityType} options={[
                            ["ALL", "Todo"], ["TRANSACTION", "Movimientos"], ["USER", "Usuarios"],
                        ]} />
                    </div>
                </div>

                <div className="divide-y divide-white/[0.055]">
                    {loading && <div className="p-16 text-center text-xs uppercase tracking-[0.2em] text-white/25">Cargando actividad...</div>}
                    {!loading && error && <div className="p-16 text-center text-sm text-rose-400">{error}</div>}
                    {!loading && !error && entries.length === 0 && <div className="p-16 text-center text-xs uppercase tracking-[0.2em] text-white/20">No hay actividad para estos filtros</div>}
                    {!loading && !error && entries.map(entry => {
                        const info = actionInfo(entry.action)
                        const Icon = info.icon
                        const isOpen = expanded === entry.id
                        const changes = changesFor(entry)
                        return (
                            <div key={entry.id} className="transition-colors hover:bg-white/[0.018]">
                                <button
                                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[150px_minmax(220px,1.1fr)_minmax(180px,0.8fr)_190px_auto] items-center gap-3 lg:gap-5 px-5 py-4 text-left"
                                >
                                    <div className={`flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${info.classes}`}>
                                        <Icon className="w-3.5 h-3.5" /> {info.label}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-white/85">{entry.description || "Sin descripción"}</p>
                                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/25">
                                            {entry.entityType === "USER" ? "Usuario" : movementLabel(entry)}
                                        </p>
                                    </div>
                                    <div className="hidden min-w-0 lg:block">
                                        <p className="truncate text-xs font-semibold text-white/60">{entry.actorName || "Usuario eliminado"}</p>
                                        <p className="mt-1 truncate text-[10px] text-white/25">{entry.actorEmail || "Sin correo disponible"}</p>
                                    </div>
                                    <div className="hidden lg:block">
                                        <p className="flex items-center gap-1.5 text-xs text-white/50"><Clock3 className="w-3.5 h-3.5" /> {new Date(entry.createdAt).toLocaleString("es-AR")}</p>
                                        {entry.ipAddress && <p className="mt-1 pl-5 font-mono text-[9px] text-white/20">IP {entry.ipAddress}</p>}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-white/25 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                </button>

                                {isOpen && (
                                    <div className="border-t border-white/[0.04] bg-black/30 px-5 py-5 lg:px-[170px]">
                                        <div className="mb-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:hidden">
                                            <p className="flex items-center gap-2 text-white/45"><UserRound className="w-3.5 h-3.5" /> {entry.actorName || entry.actorEmail || "Usuario eliminado"}</p>
                                            <p className="flex items-center gap-2 text-white/45"><Clock3 className="w-3.5 h-3.5" /> {new Date(entry.createdAt).toLocaleString("es-AR")}</p>
                                        </div>
                                        {changes.length === 0 ? (
                                            <p className="text-xs text-white/30">No hay diferencias de campos para mostrar.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                                                {changes.map(change => (
                                                    <div key={change.key} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                                                        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{change.label}</p>
                                                        {entry.action === "UPDATE" ? (
                                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                                                                <span className="truncate text-rose-300/70 line-through">{formatValue(change.key, change.before)}</span>
                                                                <ArrowIcon />
                                                                <span className="truncate font-semibold text-emerald-300">{formatValue(change.key, change.after)}</span>
                                                            </div>
                                                        ) : (
                                                            <p className={entry.action === "DELETE" ? "text-rose-300/80" : "text-emerald-300"}>
                                                                {formatValue(change.key, entry.action === "DELETE" ? change.before : change.after)}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p className="mt-4 break-all font-mono text-[9px] text-white/15">Registro: {entry.entityId || "sin ID"}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4">
                    <p className="text-[10px] uppercase tracking-wider text-white/25">Página {page} de {pages}</p>
                    <div className="flex gap-2">
                        <PageButton disabled={page <= 1} onClick={() => setPage(value => value - 1)} icon={ChevronLeft} label="Anterior" />
                        <PageButton disabled={page >= pages} onClick={() => setPage(value => value + 1)} icon={ChevronRight} label="Siguiente" right />
                    </div>
                </div>
            </Card>
        </div>
    )
}

function movementLabel(entry: AuditEntry) {
    const data = entry.after || entry.before || {}
    if (data.loanType || data.type === "LOAN") return "Préstamo"
    if (data.isSavings) return "Ahorro"
    return data.type === "INCOME" ? "Ingreso" : "Gasto"
}

function ArrowIcon() {
    return <span className="text-white/20">→</span>
}

function FilterGroup({ value, onChange, options }: { value: string, onChange: (value: string) => void, options: string[][] }) {
    return <div className="flex flex-wrap gap-2">{options.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} className={`rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${value === id ? "border-white bg-white text-black" : "border-white/10 text-white/35 hover:border-white/25 hover:text-white/60"}`}>{label}</button>
    ))}</div>
}

function Summary({ title, value, icon: Icon, color }: { title: string, value: number, icon: React.ComponentType<{ className?: string }>, color: string }) {
    const colorClasses: Record<string, string> = {
        violet: "border-violet-500/15 bg-violet-500/[0.035] text-violet-400",
        emerald: "border-emerald-500/15 bg-emerald-500/[0.035] text-emerald-400",
        blue: "border-blue-500/15 bg-blue-500/[0.035] text-blue-400",
        rose: "border-rose-500/15 bg-rose-500/[0.035] text-rose-400",
    }
    return <div className={`rounded-[18px] border p-4 ${colorClasses[color]}`}>
        <div className="flex items-start justify-between gap-2"><p className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-60">{title}</p><Icon className="w-4 h-4 shrink-0" /></div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-white">{value.toLocaleString("es-AR")}</p>
    </div>
}

function PageButton({ disabled, onClick, icon: Icon, label, right }: { disabled: boolean, onClick: () => void, icon: React.ComponentType<{ className?: string }>, label: string, right?: boolean }) {
    return <button disabled={disabled} onClick={onClick} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/45 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-25">
        {!right && <Icon className="w-3.5 h-3.5" />}{label}{right && <Icon className="w-3.5 h-3.5" />}
    </button>
}
