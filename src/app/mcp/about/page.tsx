export default function McpAboutPage() {
    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <article className="max-w-2xl w-full p-8 rounded-3xl border border-white/10 bg-white/[0.03]">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Control de Gastos MCP</p>
                <h1 className="text-3xl font-bold mt-3">Datos financieros para ChatGPT</h1>
                <p className="text-white/50 mt-5 leading-relaxed">Esta integración permite analizar ingresos, gastos, categorías, ahorros y préstamos mediante herramientas de solo lectura. Cada usuario debe iniciar sesión y autorizar expresamente el acceso.</p>
                <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-sm text-emerald-200">La integración no puede crear, editar ni eliminar movimientos.</div>
            </article>
        </main>
    )
}

