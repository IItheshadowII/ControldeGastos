"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { Card } from './ui-glass'
import { TrendingUp, TrendingDown, DollarSign, Wallet, PiggyBank, Eye, EyeOff, Trash2 } from 'lucide-react'

interface DashboardStatsProps {
    transactions: any[]
    usdRate?: number
}

export const DashboardStats = ({ transactions, usdRate = 1 }: DashboardStatsProps) => {
    interface SavingsGoal {
        id: string
        name: string
        amount: number
        visible?: boolean
    }

    const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])

    useEffect(() => {
        try {
            const raw = localStorage.getItem('savingsGoals')
            if (raw) {
                const parsed = JSON.parse(raw)
                setSavingsGoals(parsed)
            } else {
                setSavingsGoals([])
            }
        } catch (e) {
            setSavingsGoals([])
        }
    }, [transactions])

    const persistGoals = (next: SavingsGoal[]) => {
        localStorage.setItem('savingsGoals', JSON.stringify(next))
        setSavingsGoals(next)
    }

    const toggleGoalVisibility = (id: string) => {
        const next = savingsGoals.map((g: SavingsGoal) => g.id === id ? { ...g, visible: !g.visible } : g)
        persistGoals(next)
    }

    const deleteGoal = (id: string) => {
        const next = savingsGoals.filter((g: SavingsGoal) => g.id !== id)
        persistGoals(next)
    }
    const stats = useMemo(() => {
        const now = new Date()
        const rate = usdRate > 0 ? usdRate : 1

        const currentMonth = transactions.filter(t => {
            const d = new Date(t.date)
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })

        const totalIncomeARS = currentMonth
            .filter(t => t.type === 'INCOME' && t.currency === 'ARS')
            .reduce((acc, t) => acc + t.amount, 0)

        const totalIncomeUSD = currentMonth
            .filter(t => t.type === 'INCOME' && t.currency === 'USD')
            .reduce((acc, t) => acc + t.amount, 0)

        const totalExpensesARS = currentMonth
            .filter(t => t.type === 'EXPENSE' && t.currency === 'ARS')
            .reduce((acc, t) => acc + t.amount, 0)

        const totalExpensesUSD = currentMonth
            .filter(t => t.type === 'EXPENSE' && t.currency === 'USD')
            .reduce((acc, t) => acc + t.amount, 0)

        // Totales pagados (solo items con isPaid === true) — usados para calcular Balance Neto
        const paidIncomeARS = currentMonth
            .filter(t => t.type === 'INCOME' && t.currency === 'ARS' && t.isPaid)
            .reduce((acc, t) => acc + t.amount, 0)

        const paidIncomeUSD = currentMonth
            .filter(t => t.type === 'INCOME' && t.currency === 'USD' && t.isPaid)
            .reduce((acc, t) => acc + t.amount, 0)

        const paidExpensesARS = currentMonth
            .filter(t => t.type === 'EXPENSE' && t.currency === 'ARS' && t.isPaid)
            .reduce((acc, t) => acc + t.amount, 0)

        const paidExpensesUSD = currentMonth
            .filter(t => t.type === 'EXPENSE' && t.currency === 'USD' && t.isPaid)
            .reduce((acc, t) => acc + t.amount, 0)

        // Convertimos todo a ARS usando la cotización configurada
        const totalIncome = totalIncomeARS + totalIncomeUSD * rate
        const totalExpenses = totalExpensesARS + totalExpensesUSD * rate

        // Balance Neto debe usar solo los items pagados (paidIncome / paidExpenses)
        const paidTotalIncome = paidIncomeARS + paidIncomeUSD * rate
        const paidTotalExpenses = paidExpensesARS + paidExpensesUSD * rate

        const balance = paidTotalIncome - paidTotalExpenses
        const savingsRate = paidTotalIncome > 0 ? ((balance / paidTotalIncome) * 100) : 0

        return {
            totalIncome,
            totalExpenses,
            balance,
            savingsRate,
            transactionCount: currentMonth.length
        }
    }, [transactions, usdRate])

    const statCards: StatCardProps[] = [
        {
            label: 'Ingresos del Mes',
            value: `$${stats.totalIncome.toLocaleString()}`,
            icon: TrendingUp,
            color: 'emerald' as const,
            trend: '+12%',
            delay: 0
        },
        {
            label: 'Gastos del Mes',
            value: `$${stats.totalExpenses.toLocaleString()}`,
            icon: TrendingDown,
            color: 'rose' as const,
            trend: '-8%',
            delay: 0.1
        },
        {
            label: 'Balance Neto',
            value: `$${stats.balance.toLocaleString()}`,
            icon: DollarSign,
            color: stats.balance >= 0 ? ('emerald' as const) : ('rose' as const),
            trend: stats.balance >= 0 ? 'Positivo' : 'Negativo',
            delay: 0.2
        },
        {
            label: 'Tasa de Ahorro',
            value: `${stats.savingsRate.toFixed(1)}%`,
            icon: Wallet,
            color: 'blue' as const,
            trend: `${stats.transactionCount} movimientos`,
            delay: 0.3
        }
    ]

    // Add a card per visible savings goal
    if (savingsGoals && savingsGoals.length > 0) {
        // compute total saved (only transactions marked as savings and in ARS)
        const totalSaved = transactions.reduce((acc, t) => {
            if (t.currency && t.currency !== 'ARS') return acc
            if (!t.isSavings) return acc
            return acc + t.amount
        }, 0)

        savingsGoals.filter(g => g.visible !== false).forEach((g, idx) => {
            const remaining = Math.max(0, Math.round((g.amount || 0) - totalSaved))
            statCards.push({
                label: `Meta: ${g.name}`,
                value: `$${g.amount.toLocaleString()} (Faltan $${remaining.toLocaleString()})`,
                icon: PiggyBank,
                color: 'blue' as const,
                trend: remaining === 0 ? '¡Alcanzada!' : 'En progreso',
                delay: 0.4 + idx * 0.03,
                actions: (
                    <div className="flex items-center gap-2">
                        <button title="Mostrar/Ocultar" onClick={() => toggleGoalVisibility(g.id)} className="p-2 rounded-md hover:bg-white/5 text-white/40">
                            {g.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button title="Eliminar" onClick={() => deleteGoal(g.id)} className="p-2 rounded-md hover:bg-red-600/20 text-rose-400">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )
            } as StatCardProps)
        })
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statCards.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </div>

            {/* Hidden goals panel: allow re-showing or deleting hidden goals */}
            {savingsGoals && savingsGoals.filter(g => g.visible === false).length > 0 && (
                <div className="mt-4">
                    <p className="text-sm text-white/30 mb-2 uppercase tracking-wide font-bold">Metas ocultas</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {savingsGoals.filter(g => g.visible === false).map(g => (
                            <div key={g.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white/5 border border-white/5 w-full sm:w-auto">
                                <div>
                                    <p className="font-bold">{g.name}</p>
                                    <p className="text-xs text-white/40">$ {g.amount.toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button title="Mostrar" onClick={() => toggleGoalVisibility(g.id)} className="p-2 rounded-full hover:bg-white/5 text-white/40">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button title="Eliminar" onClick={() => deleteGoal(g.id)} className="p-2 rounded-full hover:bg-rose-600/10 text-rose-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}

interface StatCardProps {
    label: string
    value: string
    icon: React.ComponentType<{ className?: string }>
    color: 'emerald' | 'rose' | 'blue'
    trend: string
    delay: number
    actions?: React.ReactNode
    key?: React.Key
}

const StatCard = ({ label, value, icon: Icon, color, trend, delay, actions }: StatCardProps) => {
    const colors = {
        emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
        rose: 'from-rose-500/10 to-rose-500/5 text-rose-400 border-rose-500/20',
        blue: 'from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/20'
    }

    return (
        <Card delay={delay} className="!p-6 group hover:scale-[1.02] transition-transform">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
                        {trend}
                    </span>
                    {actions}
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">
                    {label}
                </p>
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                    {value}
                </p>
            </div>
        </Card>
    )
}
