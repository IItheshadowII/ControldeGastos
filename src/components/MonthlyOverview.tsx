import React, { useMemo } from 'react'
import { Card } from './ui-glass'
import { ArrowUpCircle, ArrowDownCircle, DollarSign, CreditCard } from 'lucide-react'

export const MonthlyOverview = ({ transactions, usdRate = 1 }: { transactions: any[]; usdRate?: number }) => {
    // Filter for Current Month
    const currentMonthData = useMemo(() => {
        const now = new Date()
        return transactions.filter(t => {
            const d = new Date(t.date)
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
    }, [transactions])

    // Grouping Data
    const income = currentMonthData.filter(t => t.type === 'INCOME')
    const expenses = currentMonthData.filter(t => t.type === 'EXPENSE')

    const incomeBlanco = income.filter(t => t.incomeType === 'BLANCO')
    const incomeNegro = income.filter(t => t.incomeType === 'NEGRO')

    const expensesFixed = expenses.filter(t => t.frequency === 'FIXED' && t.currency === 'ARS')
    const expensesVariable = expenses.filter(t => t.frequency === 'VARIABLE' && t.currency === 'ARS')
    const expensesUSD = expenses.filter(t => t.currency === 'USD')

    const rate = usdRate > 0 ? usdRate : 1

    // Totals para visualización (se mantienen como estaban)
    const totalIncomeARS = income.reduce((acc, t) => t.currency === 'ARS' ? acc + t.amount : acc, 0)
    const totalFixed = expensesFixed.reduce((acc, t) => acc + t.amount, 0)
    const totalVariable = expensesVariable.reduce((acc, t) => acc + t.amount, 0)
    const totalUSD = expensesUSD.reduce((acc, t) => acc + t.amount, 0)

    // Balance Neto alineado con DashboardStats: solo montos pagados y convertido todo a ARS
    const paidIncomeARS = income
        .filter(t => t.isPaid && t.currency === 'ARS')
        .reduce((acc, t) => acc + t.amount, 0)

    const paidIncomeUSD = income
        .filter(t => t.isPaid && t.currency === 'USD')
        .reduce((acc, t) => acc + t.amount, 0)

    const paidFixedARS = expensesFixed
        .filter(t => t.isPaid)
        .reduce((acc, t) => acc + t.amount, 0)

    const paidVariableARS = expensesVariable
        .filter(t => t.isPaid)
        .reduce((acc, t) => acc + t.amount, 0)

    const paidExpensesUSD = expensesUSD
        .filter(t => t.isPaid)
        .reduce((acc, t) => acc + t.amount, 0)

    const paidIncomeTotalARS = paidIncomeARS + paidIncomeUSD * rate
    const paidExpensesTotalARS = paidFixedARS + paidVariableARS + paidExpensesUSD * rate

    const balance = paidIncomeTotalARS - paidExpensesTotalARS

    return (
        <Card className="h-full !p-0 !bg-zinc-950/20 shadow-none border-white/[0.03] overflow-hidden flex flex-col group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />

            {/* Header */}
            <div className="p-4 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 relative z-10 bg-white/[0.01]">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/20">Análisis Mensual</p>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight">
                        {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </h3>
                </div>
                <div className="text-left sm:text-right space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/20">Balance Neto</p>
                    <p className={`text-2xl md:text-3xl font-bold tracking-tighter ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        $ {balance.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x lg:divide-x divide-white/5 flex-1 relative z-10">

                {/* Col 1: Ingresos */}
                <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-emerald-500/[0.01]">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-500/40">Total Ingresos</p>
                            <h4 className="flex items-center gap-2 font-bold text-base md:text-lg">
                                <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                                $ {totalIncomeARS.toLocaleString()}
                            </h4>
                        </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                        <SectionBlock title="Flujos en Blanco" items={incomeBlanco} color="text-emerald-400" />
                        <SectionBlock title="Flujos en Negro" items={incomeNegro} color="text-emerald-400/60" />
                    </div>
                </div>

                {/* Col 2: Gastos Fijos */}
                <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-rose-500/[0.01]">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-rose-500/40">Fijos Mensuales</p>
                            <h4 className="flex items-center gap-2 font-bold text-base md:text-lg">
                                <CreditCard className="w-4 h-4 text-rose-500" />
                                $ {totalFixed.toLocaleString()}
                            </h4>
                        </div>
                    </div>

                    <div className="space-y-1 max-h-[250px] md:max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                        {expensesFixed.length > 0 ? expensesFixed.map(t => (
                            <RowItem key={t.id} label={t.description} amount={t.amount} currency={t.currency} isPaid={t.isPaid} />
                        )) : <EmptyState label="Sin gastos fijos registrados" />}
                    </div>
                </div>

                {/* Col 3: Extras */}
                <div className="flex flex-col bg-zinc-900/[0.01]">
                    {/* USD Section */}
                    <div className="p-4 md:p-8 border-b border-white/5">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-500/40">Gastos en Moneda</p>
                                <h4 className="flex items-center gap-2 font-bold text-base md:text-lg text-blue-400">
                                    <DollarSign className="w-4 h-4" />
                                    U$D {totalUSD.toLocaleString()}
                                </h4>
                            </div>
                        </div>
                        <div className="space-y-1 max-h-[100px] md:max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                            {expensesUSD.length > 0 ? expensesUSD.map(t => (
                                <RowItem key={t.id} label={t.description} amount={t.amount} currency="USD" isPaid={t.isPaid} />
                            )) : <EmptyState label="Sin movimientos en USD" />}
                        </div>
                    </div>

                    {/* Variables Section */}
                    <div className="p-4 md:p-8 flex-1">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500/40">Gastos Adicionales</p>
                                <h4 className="flex items-center gap-2 font-bold text-base md:text-lg text-zinc-300">
                                    <ArrowDownCircle className="w-4 h-4" />
                                    $ {totalVariable.toLocaleString()}
                                </h4>
                            </div>
                        </div>
                        <div className="space-y-1 max-h-[150px] md:max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                            {expensesVariable.length > 0 ? expensesVariable.map(t => (
                                <RowItem key={t.id} label={t.description} amount={t.amount} currency={t.currency} isPaid={t.isPaid} />
                            )) : <EmptyState label="Sin gastos adicionales" />}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

const SectionBlock = ({ title, items, color }: any) => (
    <div className="space-y-3">
        <h5 className="text-[9px] uppercase font-bold text-white/10 tracking-[0.2em] flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-white/10" />
            {title}
        </h5>
        {items.length > 0 ? (
            <div className="space-y-1">
                {items.map((t: any) => (
                    <RowItem key={t.id} label={t.description} amount={t.amount} currency={t.currency} color={color} isPaid={true} />
                ))}
            </div>
        ) : (
            <p className="text-[10px] text-white/5 pl-3 italic font-medium uppercase tracking-wider">No se registran datos</p>
        )}
    </div>
)

const RowItem = ({ label, amount, currency, color = "text-white/60", isPaid = true }: any) => (
    <div className="flex items-center justify-between p-2 md:p-3 rounded-xl hover:bg-white/[0.03] transition-all group/row border border-transparent hover:border-white/5">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPaid
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse'
                    : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                }`} />
            <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wide truncate ${color} group-hover/row:text-white transition-colors`}>{label || 'Sin concepto'}</span>
        </div>
        <div className="flex items-center gap-2">
            {!isPaid && (
                <span className="hidden sm:inline text-[9px] text-amber-500/60 font-bold uppercase tracking-wider">Pendiente</span>
            )}
            <span className="text-[10px] md:text-[11px] font-mono font-bold text-white/80 shrink-0">
                {currency === 'USD' ? 'U$D' : '$'} {amount.toLocaleString()}
            </span>
        </div>
    </div>
)

const EmptyState = ({ label }: { label: string }) => (
    <div className="py-6 px-4 text-center border border-dashed border-white/[0.03] rounded-2xl">
        <p className="text-[9px] text-white/10 uppercase font-bold tracking-[0.2em]">{label}</p>
    </div>
)
