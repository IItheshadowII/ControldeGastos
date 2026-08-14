"use client"

import React, { useState, useEffect } from 'react'
import { Card, Button } from "@/components/ui-glass"
import { Modal } from "@/components/Modal"
import { TransactionForm } from "@/components/TransactionForm"
import { ExpenseUploader } from "@/components/ExpenseUploader"
import { MobileNav } from "@/components/MobileNav"
import { CommandMenu } from "@/components/CommandMenu"
import { DashboardStats } from "@/components/DashboardStats"
import {
    Settings, Plus, Image as ImageIcon, Wallet, LogOut,
    FileText, TrendingUp, LayoutDashboard, Database, PieChart,
    Activity, ChevronLeft, ChevronRight, Menu, X, ArrowUpRight,
    ArrowDownRight, Search, Calendar, Filter, AlertCircle, Trash2, Edit3,
    Users, Sparkles, Target, Eye, EyeOff,
} from 'lucide-react'
import { CheckCircle2 } from 'lucide-react'
import { PiggyBank } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { SavingsChart } from "@/components/SavingsChart"
import { MonthlyOverview } from "@/components/MonthlyOverview"
import { AIRecommendations } from "@/components/AIRecommendations"
import { ReportGenerator } from "@/components/ReportGenerator"
import SettingsPage from '@/app/settings/page'
import { UsersManagement } from '@/components/UsersManagement'

type ViewState = 'DASHBOARD' | 'TRANSACTIONS' | 'ANALYTICS' | 'SAVINGS' | 'SETTINGS' | 'USERS'

export default function DashboardPage() {
    // Estado de sesión: intentamos cargar el usuario real desde el backend, si no existe usamos un genérico
    const [session, setSession] = useState<any | null>(null)

    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD')
    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)

    // Modal States
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
    const [isAIModalOpen, setIsAIModalOpen] = useState(false)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null)
    const [usdRate, setUsdRate] = useState<number>(1)

    // Data States
    const [chartData, setChartData] = useState<{ name: string, income: number, expenses: number }[]>([])
    const [transactions, setTransactions] = useState<any[]>([])

    // Command Palette Keyboard Shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsCommandMenuOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const fetchData = () => {
        fetch('/api/transactions')
            .then(res => res.ok ? res.json() : [])
            .then((data: any[]) => {
                if (!Array.isArray(data)) return
                setTransactions(data)
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                const transformed = months.map((m, i) => {
                    const monthData = data.filter((t: any) => new Date(t.date).getMonth() === i)
                    const income = monthData.filter((t: any) => t.type === 'INCOME').reduce((acc: any, t: any) => acc + t.amount, 0)
                    const expenses = monthData.filter((t: any) => t.type === 'EXPENSE' && !t.isSavings).reduce((acc: any, t: any) => acc + t.amount, 0)
                    return { name: m, income, expenses }
                }).filter(m => m.income > 0 || m.expenses > 0)
                setChartData(transformed)
            })
            .catch(() => {
                setTransactions([])
                setChartData([])
            })
    }

    const openEdit = (t: any) => {
        setEditingTransaction(t)
        setIsEditModalOpen(true)
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Realtime updates (SSE)
    useEffect(() => {
        let es: EventSource | null = null
        try {
            es = new EventSource('/api/realtime')
            es.onmessage = () => {
                // Cambios hechos por cualquier usuario
                fetchData()
            }
            es.onerror = () => {
                // Dejar que el navegador reintente; no spamear
            }
        } catch (e) {
            // SSE no disponible (browser/proxy). Sin realtime.
        }

        return () => {
            if (es) es.close()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Load current user (or default demo user) to show proper name in greeting
    useEffect(() => {
        const loadUser = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (res.status === 401) {
                    window.location.href = '/login'
                    return
                }
                if (!res.ok) return
                const data = await res.json().catch(() => ({}))
                if (data?.user) setSession({ user: data.user })
            } catch (e) {
                // keep session null
            }
        }

        loadUser()
    }, [])

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const update = () => setIsDesktop(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    // Load USD -> ARS rate from backend (internet)
    useEffect(() => {
        const loadRate = async () => {
            try {
                const res = await fetch('/api/rates/usd-ars')
                const data = await res.json().catch(() => ({}))
                const rate = Number(data?.rate)
                if (rate && rate > 0) setUsdRate(rate)
            } catch (e) {
                console.error('Error obteniendo cotización USD->ARS:', e)
            }
        }

        loadRate()
    }, [])

    // Auto-reset month when a new month starts
    useEffect(() => {
        const checkAndResetMonth = async () => {
            try {
                const now = new Date()
                const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`
                const lastResetMonth = localStorage.getItem('lastResetMonth')

                // Only reset if we haven't reset for this month yet
                if (lastResetMonth !== currentMonthKey) {
                    const res = await fetch('/api/transactions/reset-month', {
                        method: 'POST',
                    })

                    if (res.ok) {
                        localStorage.setItem('lastResetMonth', currentMonthKey)
                        // Refresh data after reset
                        fetchData()
                    }
                }
            } catch (e) {
                console.error('Error auto-resetting month:', e)
            }
        }

        checkAndResetMonth()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleTogglePaid = async (transactionId: string, currentStatus: boolean, loanStatus?: string) => {
        try {
            const body = loanStatus
                ? {
                    loanStatus: loanStatus === 'PAID' ? 'PENDING' : 'PAID',
                    isPaid: loanStatus !== 'PAID',
                }
                : { isPaid: !currentStatus }

            await fetch(`/api/transactions/${transactionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            fetchData()
        } catch (error) {
            console.error('Error updating payment status:', error)
        }
    }

    const handleToggleSavings = async (transactionId: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/transactions/${transactionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSavings: !currentStatus })
            })
            fetchData()
        } catch (error) {
            console.error('Error updating savings status:', error)
        }
    }

    const handleDelete = async (transactionId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) return

        try {
            const res = await fetch(`/api/transactions/${transactionId}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                fetchData()
            } else {
                alert('Error al eliminar')
            }
        } catch (error) {
            console.error('Error deleting transaction:', error)
        }
    }

    const renderContent = () => {
        switch (currentView) {
            case 'TRANSACTIONS':
                return <TransactionsView transactions={transactions} onUpdate={fetchData} onEdit={openEdit} />
            case 'ANALYTICS':
                return <AnalyticsView chartData={chartData} transactions={transactions} />
            case 'SAVINGS':
                return (
                    <SavingsGoalsView
                        transactions={transactions}
                        usdRate={usdRate}
                    />
                )
            case 'SETTINGS':
                return <SettingsPage />
            case 'USERS':
                return <UsersManagement />
            case 'DASHBOARD':
            default:
                return (
                    <div className="space-y-5">
                        {/* Dashboard Stats Cards */}
                        <DashboardStats transactions={transactions} usdRate={usdRate} />

                        <div className="grid min-w-0 grid-cols-1 2xl:grid-cols-[minmax(0,1.9fr)_minmax(360px,0.8fr)] gap-5">
                            {/* Main Monthly Overview Section - Replaces Chart */}
                            <div className="min-w-0 space-y-5">
                                <div>
                                    <MonthlyOverview transactions={transactions} usdRate={usdRate} onEdit={openEdit} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_0.8fr_1.4fr] gap-4">
                                    <div
                                        onClick={() => setCurrentView('TRANSACTIONS')}
                                        className="p-6 min-h-[148px] bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 hover:border-amber-500/20 transition-all group cursor-pointer rounded-[20px] backdrop-blur-xl shadow-2xl overflow-hidden"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-5">
                                            <div className="p-2 bg-amber-500/10 rounded-[11px] group-hover:scale-105 transition-transform duration-300">
                                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <span className="pr-1 text-[10px] text-amber-500/60 font-bold uppercase tracking-wider">Pendientes</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Gastos por Pagar</h3>
                                            <div className="text-2xl font-bold tracking-tighter text-amber-400 mb-1">
                                                $ {transactions
                                                    .filter(t => t.type === 'EXPENSE' && !t.isSavings && !t.isPaid)
                                                    .reduce((acc, t) => {
                                                        const rate = usdRate > 0 ? usdRate : 1
                                                        if (t.currency === 'USD') return acc + t.amount * rate
                                                        return acc + t.amount
                                                    }, 0)
                                                    .toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-2 text-white/40">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                <p className="text-xs font-medium">
                                                    {transactions.filter(t => t.type === 'EXPENSE' && !t.isSavings && !t.isPaid).length} gastos pendientes
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Card className="!p-6 !rounded-[20px] !overflow-hidden border-dashed border-white/5 bg-transparent flex flex-col justify-center gap-3 group cursor-default min-h-[148px]">
                                        <div className="p-2 bg-emerald-500/10 w-fit rounded-[11px] group-hover:scale-105 transition-transform duration-300">
                                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Ahorro Potencial</h3>
                                            <div className="text-2xl font-bold tracking-tighter text-white">
                                                $ 142.060 <span className="text-sm font-medium text-white/20 ml-2">ARS</span>
                                            </div>
                                            <p className="text-xs text-white/40 mt-2">Basado en tus hábitos de consumo.</p>
                                        </div>
                                    </Card>

                                    <AIRecommendations />
                                </div>
                            </div>

                            {/* Sidebar/Actions Section */}
                            <div className="min-w-0 space-y-5">
                                <Card className="!p-6 !rounded-[20px] !overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent">
                                    <h4 className="text-[10px] font-bold text-white/35 uppercase tracking-[0.2em] mb-5">Comandos Rápidos</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <ActionButton onClick={() => setIsExpenseModalOpen(true)} icon={<Plus className="w-5 h-5" />} label="Gasto" color="rose" />
                                        <ActionButton onClick={() => setIsIncomeModalOpen(true)} icon={<Wallet className="w-5 h-5" />} label="Ingreso" color="emerald" />
                                        <ActionButton onClick={() => setIsLoanModalOpen(true)} icon={<Sparkles className="w-5 h-5" />} label="Préstamo" color="violet" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <ActionButton onClick={() => setIsAIModalOpen(true)} icon={<ImageIcon className="w-5 h-5" />} label="Scan Ticket IA" color="blue" full />
                                        <ActionButton onClick={() => setIsReportModalOpen(true)} icon={<FileText className="w-5 h-5" />} label="Generar Reporte" color="indigo" full />
                                    </div>
                                </Card>

                                <Card className="!p-6 !rounded-[20px] !overflow-hidden border-dashed border-violet-500/10 bg-gradient-to-br from-violet-500/5 to-transparent">
                                    <div className="flex items-start justify-between mb-5 gap-5">
                                        <div>
                                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Préstamos</p>
                                            <h3 className="text-lg font-bold text-white">Control de Deudas</h3>
                                        </div>
                                        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-300 shrink-0 mr-1">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-[14px] bg-white/5 border border-violet-500/10">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70 mb-2">Total a cobrar</p>
                                            <p className="text-lg font-bold text-violet-100">$ {transactions.filter(t => t.loanType === 'LENT' && t.loanStatus === 'PENDING').reduce((acc, t) => {
                                                const rate = usdRate > 0 ? usdRate : 1
                                                return acc + (t.currency === 'USD' ? t.amount * rate : t.amount)
                                            }, 0).toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 rounded-[14px] bg-white/5 border border-violet-500/10">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/70 mb-2">Total a pagar</p>
                                            <p className="text-lg font-bold text-violet-100">$ {transactions.filter(t => t.loanType === 'BORROWED' && t.loanStatus === 'PENDING').reduce((acc, t) => {
                                                const rate = usdRate > 0 ? usdRate : 1
                                                return acc + (t.currency === 'USD' ? t.amount * rate : t.amount)
                                            }, 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </Card>
                                <Card className="!p-0 !rounded-[20px] overflow-hidden flex flex-col">
                                    <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center gap-4">
                                        <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider">Últimos Movimientos</h4>
                                        <button onClick={() => setCurrentView('TRANSACTIONS')} className="shrink-0 pr-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider">Ver Todos</button>
                                    </div>
                                    <div className="max-h-[420px] overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                        {transactions.slice(0, 10).map((t: any) => (
                                            <div
                                                key={t.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openEdit(t)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        openEdit(t)
                                                    }
                                                }}
                                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 rounded-[14px] hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5 cursor-pointer focus:outline-none focus-visible:border-blue-500/40 focus-visible:bg-white/[0.04]"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className={`p-2 rounded-[10px] shrink-0 ${t.isSavings ? 'bg-blue-500/10 text-blue-400' : t.loanType ? 'bg-violet-500/10 text-violet-300' : t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {t.isSavings ? <PiggyBank className="w-4 h-4" /> : t.loanType ? <Sparkles className="w-4 h-4" /> : t.type === 'INCOME' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex min-w-0 flex-col">
                                                        <span className="text-sm font-bold text-white/90 group-hover:text-white truncate">
                                                            {t.description || 'Sin descripción'}
                                                        </span>
                                                        <span className="text-[10px] text-white/40 truncate">
                                                            {t.isSavings ? 'Ahorro' : t.loanType ? `${t.loanParty || 'Préstamo'} · ${t.loanStatus || 'Pendiente'}` : (t.category && t.category.toLowerCase()) || 'Varios'} · {new Date(t.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="text-right">
                                                        <span className={`whitespace-nowrap text-xs font-bold ${t.isSavings ? 'text-blue-400' : t.loanType ? 'text-violet-300' : t.type === 'INCOME' ? 'text-emerald-400' : 'text-white/70'}`}>
                                                            {t.currency === 'USD' ? 'U$D' : '$'} {t.amount.toLocaleString()}
                                                        </span>
                                                        {!t.isSavings && (t.type === 'EXPENSE' || t.loanType) && (
                                                            <button onClick={(event) => { event.stopPropagation(); handleTogglePaid(t.id, t.isPaid, t.loanStatus) }} className={`mt-1 ml-auto flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${t.isPaid || t.loanStatus === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`} title={t.isPaid || t.loanStatus === 'PAID' ? 'Desmarcar pagado' : 'Marcar como pagado'}>
                                                                {t.isPaid || t.loanStatus === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : null}
                                                                {t.isPaid || t.loanStatus === 'PAID' ? 'Pagado' : 'Pendiente'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button onClick={(event) => { event.stopPropagation(); handleToggleSavings(t.id, t.isSavings) }} className={`p-1.5 rounded-lg border ${t.isSavings ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/30'}`} title={t.isSavings ? 'Quitar ahorro' : 'Marcar como ahorro'}>
                                                            <PiggyBank className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={(event) => { event.stopPropagation(); openEdit(t) }} className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-white/30 hover:text-white" title="Editar">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={(event) => { event.stopPropagation(); handleDelete(t.id) }} className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-white/30 hover:text-rose-400" title="Eliminar">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )
        }
    }

    return (
        <div className="min-h-screen bg-[#000000] text-white font-inter selection:bg-blue-500/30 overflow-x-hidden flex relative">
            {/* Ambient Background layer */}
            <div className="fixed inset-0 bg-mesh opacity-[0.07] pointer-events-none z-0" />

            {/* Mobile Header Toggle */}
            <div className="lg:hidden fixed top-0 left-0 right-0 p-4 z-50 flex justify-between items-center bg-black/60 backdrop-blur-md border-b border-white/5">
                <div className="font-bold text-sm tracking-wider flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[10px] italic">F</div>
                    FINANCE AI
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white">
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Sidebar Navigation */}
            <DesktopSidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                currentView={currentView}
                setCurrentView={setCurrentView}
            />

            {/* Main Content Wrapper */}
            <motion.main
                animate={{
                    paddingLeft: isDesktop ? (isSidebarOpen ? 240 : 80) : 0,
                }}
                transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
                className={`dashboard-main flex-1 min-h-screen w-full transition-all duration-300 ${isMobileMenuOpen ? 'overflow-hidden' : ''}`}
            >
                <div className="w-full max-w-[1680px] mx-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7 space-y-5">

                    {/* Header */}
                    <div className="pb-5 border-b border-white/5 space-y-3">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-[1px] shadow-2xl overflow-hidden ring-1 ring-white/10">
                                    <img src={session?.user?.image || "https://ui-avatars.com/api/?name=User"} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                                <div className="space-y-1">
                                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                        Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{session?.user?.name ? session.user.name.split(' ')[0] : 'Usuario'}</span>
                                    </h1>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                        {currentView === 'DASHBOARD' ? 'Panel de Control' : currentView === 'SAVINGS' ? 'Ahorro Pretendido' : currentView}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-stretch gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
                                {(() => {
                                    const rate = usdRate > 0 ? usdRate : 1

                                    const totalIncomeARS = transactions.reduce((acc, t) => {
                                        if (t.type !== 'INCOME') return acc
                                        // incluir solo items pagados en el Balance Total
                                        if (!t.isPaid) return acc
                                        return acc + (t.currency === 'USD' ? t.amount * rate : t.amount)
                                    }, 0)

                                    const totalExpensesARS = transactions.reduce((acc, t) => {
                                        if (t.type !== 'EXPENSE') return acc
                                        if (t.isSavings) return acc
                                        if (!t.isPaid) return acc
                                        return acc + (t.currency === 'USD' ? t.amount * rate : t.amount)
                                    }, 0)

                                    const balanceTotal = totalIncomeARS - totalExpensesARS

                                    return (
                                        <SummaryCard
                                            label="Balance Total"
                                            amount={balanceTotal.toLocaleString()}
                                            currency="ARS"
                                        />
                                    )
                                })()}
                                <SummaryCard label="Gastos USD" amount={transactions.reduce((acc, t) => t.type === 'EXPENSE' && !t.isSavings && t.currency === 'USD' ? acc + t.amount : acc, 0).toLocaleString()} currency="USD" />
                                <SummaryCard label="Ahorro USD" amount={transactions.reduce((acc, t) => t.isSavings && t.currency === 'USD' ? acc + t.amount : acc, 0).toLocaleString()} currency="USD" trend="neutral" />
                            </div>
                        </div>

                        <div className="text-[10px] text-white/40 font-bold tracking-[0.2em] mt-1">
                            {usdRate && usdRate > 0 && (
                                <span>
                                    DÓLAR OFICIAL (VENTA) · $ {usdRate.toLocaleString('es-AR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Dynamic View Content */}
                    <motion.div
                        key={currentView}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {renderContent()}
                    </motion.div>

                </div>
            </motion.main>

            {/* Modals */}
            <AnimatePresence>
                {isExpenseModalOpen && (
                    <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Registrar Gasto">
                        <TransactionForm type="EXPENSE" onSuccess={() => {
                            setIsExpenseModalOpen(false)
                            fetchData()
                        }} />
                    </Modal>
                )}
                {isIncomeModalOpen && (
                    <Modal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} title="Registrar Ingreso">
                        <TransactionForm type="INCOME" onSuccess={() => {
                            setIsIncomeModalOpen(false)
                            fetchData()
                        }} />
                    </Modal>
                )}
                {isLoanModalOpen && (
                    <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title="Registrar Préstamo">
                        <TransactionForm type="LOAN" onSuccess={() => {
                            setIsLoanModalOpen(false)
                            fetchData()
                        }} />
                    </Modal>
                )}
                {isAIModalOpen && (
                    <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="Escanear Ticket con IA">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <ImageIcon className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Herramienta IA</p>
                                    <h3 className="text-2xl font-bold">Scanner Inteligente</h3>
                                </div>
                            </div>
                            <ExpenseUploader onSaved={fetchData} />
                        </div>
                    </Modal>
                )}
                {isReportModalOpen && (
                    <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Generar Reporte">
                        <ReportGenerator />
                    </Modal>
                )}
                {isEditModalOpen && editingTransaction && (
                    <Modal
                        isOpen={isEditModalOpen}
                        onClose={() => { setIsEditModalOpen(false); setEditingTransaction(null) }}
                        title={editingTransaction.loanType ? 'Editar Préstamo' : editingTransaction.type === 'INCOME' ? 'Editar Ingreso' : 'Editar Gasto'}
                    >
                        <TransactionForm
                            type={editingTransaction.loanType ? 'LOAN' : editingTransaction.type}
                            mode="edit"
                            transaction={editingTransaction}
                            onSuccess={() => {
                                setIsEditModalOpen(false)
                                setEditingTransaction(null)
                                fetchData()
                            }}
                        />
                    </Modal>
                )}
            </AnimatePresence>

            {/* Command Menu */}
            <CommandMenu
                isOpen={isCommandMenuOpen}
                onClose={() => setIsCommandMenuOpen(false)}
                onAddExpense={() => setIsExpenseModalOpen(true)}
                onAddIncome={() => setIsIncomeModalOpen(true)}
                onAddLoan={() => setIsLoanModalOpen(true)}
            />

            {/* Mobile Navigation */}
            <MobileNav
                onAddClick={() => setIsExpenseModalOpen(true)}
                onSavingsClick={() => setCurrentView('SAVINGS')}
                savingsActive={currentView === 'SAVINGS'}
            />
        </div>
    )
}

// --- SUBCOMPONENTS ---

interface SavingsGoal {
    id: string
    name: string
    amount: number
    visible?: boolean
}

function SavingsGoalsView({ transactions, usdRate }: {
    transactions: any[]
    usdRate: number
}) {
    const [goals, setGoals] = useState<SavingsGoal[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
    const [goalName, setGoalName] = useState('')
    const [goalAmount, setGoalAmount] = useState('')

    const loadGoals = () => {
        try {
            const raw = localStorage.getItem('savingsGoals')
            const parsed = raw ? JSON.parse(raw) : []
            setGoals(Array.isArray(parsed) ? parsed : [])
        } catch {
            setGoals([])
        }
    }

    useEffect(() => {
        loadGoals()
    }, [])

    const persistGoals = (next: SavingsGoal[]) => {
        localStorage.setItem('savingsGoals', JSON.stringify(next))
        setGoals(next)
    }

    const toggleVisibility = (id: string) => {
        persistGoals(goals.map(goal => goal.id === id ? { ...goal, visible: goal.visible === false } : goal))
    }

    const deleteGoal = (id: string) => {
        if (!confirm('¿Querés eliminar esta meta de ahorro?')) return
        persistGoals(goals.filter(goal => goal.id !== id))
    }

    const openGoalForm = (goal?: SavingsGoal) => {
        setEditingGoalId(goal?.id || null)
        setGoalName(goal?.name || '')
        setGoalAmount(goal ? String(goal.amount) : '')
        setIsFormOpen(true)
    }

    const closeGoalForm = () => {
        setIsFormOpen(false)
        setEditingGoalId(null)
        setGoalName('')
        setGoalAmount('')
    }

    const saveGoal = () => {
        const name = goalName.trim()
        const amount = Number(goalAmount)
        if (!name || !Number.isFinite(amount) || amount <= 0) return

        const goal: SavingsGoal = {
            id: editingGoalId || `${Date.now()}-${Math.round(Math.random() * 10000)}`,
            name,
            amount,
            visible: true,
        }
        const next = editingGoalId
            ? goals.map(current => current.id === editingGoalId ? { ...current, ...goal } : current)
            : [goal, ...goals]
        persistGoals(next)
        closeGoalForm()
    }

    const rate = usdRate > 0 ? usdRate : 1
    const totalSaved = transactions.reduce((total, transaction) => {
        if (!transaction.isSavings) return total
        return total + (transaction.currency === 'USD' ? transaction.amount * rate : transaction.amount)
    }, 0)
    const totalTarget = goals.reduce((total, goal) => total + Number(goal.amount || 0), 0)
    const overallProgress = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0
    const visibleGoals = goals.filter(goal => goal.visible !== false)
    const hiddenGoals = goals.filter(goal => goal.visible === false)

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-400 mb-2">Plan de ahorro</p>
                    <h2 className="text-2xl font-bold tracking-tight">Tus ahorros pretendidos</h2>
                    <p className="text-sm text-white/40 mt-2">Organizá tus objetivos y seguí cuánto te falta para alcanzarlos.</p>
                </div>
                <Button onClick={() => isFormOpen ? closeGoalForm() : openGoalForm()} variant="glow">
                    <Plus className="w-4 h-4 mr-2" /> Nueva meta
                </Button>
            </div>

            <AnimatePresence>
                {isFormOpen && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <Card className="!p-6 !rounded-[22px] border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] to-transparent">
                            <div className="flex items-center justify-between gap-4 mb-5">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-1">{editingGoalId ? 'Editar objetivo' : 'Nuevo objetivo'}</p>
                                    <h3 className="text-lg font-bold">{editingGoalId ? 'Actualizá tu meta' : 'Creá una meta de ahorro'}</h3>
                                </div>
                                <button onClick={closeGoalForm} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5" aria-label="Cerrar formulario"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_0.7fr_auto] gap-3 items-end">
                                <label className="space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Nombre de la meta</span>
                                    <input value={goalName} onChange={event => setGoalName(event.target.value)} className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500/50" placeholder="Ej: Auto nuevo" autoFocus />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Monto objetivo (ARS)</span>
                                    <input value={goalAmount} onChange={event => setGoalAmount(event.target.value)} type="number" min="1" className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500/50" placeholder="0" />
                                </label>
                                <button onClick={saveGoal} disabled={!goalName.trim() || Number(goalAmount) <= 0} className="h-12 px-6 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                                    {editingGoalId ? 'Guardar cambios' : 'Añadir meta'}
                                </button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SavingsSummaryCard label="Objetivo total" value={`$ ${totalTarget.toLocaleString('es-AR')}`} detail={`${goals.length} ${goals.length === 1 ? 'meta' : 'metas'}`} icon={<Target className="w-5 h-5" />} />
                <SavingsSummaryCard label="Ahorro registrado" value={`$ ${Math.round(totalSaved).toLocaleString('es-AR')}`} detail="Movimientos marcados como ahorro" icon={<PiggyBank className="w-5 h-5" />} />
                <SavingsSummaryCard label="Progreso general" value={`${overallProgress.toFixed(0)}%`} detail={totalTarget > 0 ? `$ ${Math.max(0, Math.round(totalTarget - totalSaved)).toLocaleString('es-AR')} por completar` : 'Creá una meta para comenzar'} icon={<TrendingUp className="w-5 h-5" />} />
            </div>

            {goals.length === 0 ? (
                <Card className="!p-10 !rounded-[24px] border-dashed border-blue-500/20 bg-gradient-to-br from-blue-500/[0.06] to-transparent text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5">
                        <PiggyBank className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold">Todavía no tenés metas de ahorro</h3>
                    <p className="text-sm text-white/40 mt-2 mb-6">Creá tu primer objetivo para verlo y seguir su avance desde acá.</p>
                    <Button onClick={() => openGoalForm()} variant="glow"><Plus className="w-4 h-4 mr-2" /> Crear primera meta</Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {visibleGoals.map(goal => {
                        const amount = Number(goal.amount || 0)
                        const progress = amount > 0 ? Math.min(100, (totalSaved / amount) * 100) : 0
                        const remaining = Math.max(0, amount - totalSaved)
                        return (
                            <Card key={goal.id} className="!p-6 !rounded-[22px] !overflow-hidden bg-gradient-to-br from-blue-500/[0.07] to-transparent">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0"><Target className="w-5 h-5" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Meta de ahorro</p>
                                            <h3 className="font-bold text-lg truncate">{goal.name}</h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => openGoalForm(goal)} title="Editar meta" className="p-2 rounded-lg text-white/35 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => toggleVisibility(goal.id)} title="Ocultar meta" className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/5 transition-colors"><EyeOff className="w-4 h-4" /></button>
                                        <button onClick={() => deleteGoal(goal.id)} title="Eliminar meta" className="p-2 rounded-lg text-white/35 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-2xl font-bold">$ {amount.toLocaleString('es-AR')}</p>
                                        <p className="text-xs text-white/40 mt-1">Objetivo en ARS</p>
                                    </div>
                                    <p className="text-sm font-bold text-blue-400">{progress.toFixed(0)}%</p>
                                </div>
                                <div className="h-2 rounded-full bg-white/5 overflow-hidden mt-4">
                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-400 transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-xs text-white/40 mt-3">{remaining === 0 ? '¡Objetivo alcanzado!' : `Faltan $ ${Math.round(remaining).toLocaleString('es-AR')}`}</p>
                            </Card>
                        )
                    })}
                </div>
            )}

            {hiddenGoals.length > 0 && (
                <Card className="!p-5 !rounded-[20px]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">Metas ocultas</p>
                    <div className="flex flex-wrap gap-2">
                        {hiddenGoals.map(goal => (
                            <button key={goal.id} onClick={() => toggleVisibility(goal.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-white/60 hover:text-white hover:border-white/10 transition-colors">
                                <Eye className="w-4 h-4" /> {goal.name}
                            </button>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}

function SavingsSummaryCard({ label, value, detail, icon }: { label: string, value: string, detail: string, icon: React.ReactNode }) {
    return (
        <Card className="!p-5 !rounded-[20px]">
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{label}</p>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">{icon}</div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-xs text-white/35 mt-2">{detail}</p>
        </Card>
    )
}

function DesktopSidebar({ isOpen, setIsOpen, currentView, setCurrentView }: any) {
    return (
        <motion.aside
            initial={false}
            animate={{ width: isOpen ? 240 : 80 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
            className="hidden lg:flex flex-col border-r border-white/5 bg-black/40 backdrop-blur-3xl h-screen fixed left-0 top-0 z-40"
        >
            <div className="p-6 flex items-center justify-between h-20">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="min-w-[32px] w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-[10px] italic shrink-0 shadow-lg shadow-blue-500/20">F</div>
                    {isOpen && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="font-bold text-sm tracking-wider whitespace-nowrap"
                        >
                            FINANCE AI
                        </motion.span>
                    )}
                </div>
            </div>

            <nav className="flex-1 px-3 py-8 flex flex-col gap-2">
                <SidebarItem
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    label="Dashboard"
                    isOpen={isOpen}
                    active={currentView === 'DASHBOARD'}
                    onClick={() => setCurrentView('DASHBOARD')}
                />
                <SidebarItem
                    icon={<Database className="w-5 h-5" />}
                    label="Transacciones"
                    isOpen={isOpen}
                    active={currentView === 'TRANSACTIONS'}
                    onClick={() => setCurrentView('TRANSACTIONS')}
                />
                <SidebarItem
                    icon={<PieChart className="w-5 h-5" />}
                    label="Análisis"
                    isOpen={isOpen}
                    active={currentView === 'ANALYTICS'}
                    onClick={() => setCurrentView('ANALYTICS')}
                />
                <SidebarItem
                    icon={<PiggyBank className="w-5 h-5" />}
                    label="Ahorro Pretendido"
                    isOpen={isOpen}
                    active={currentView === 'SAVINGS'}
                    onClick={() => setCurrentView('SAVINGS')}
                />
                <SidebarItem
                    icon={<Settings className="w-5 h-5" />}
                    label="Configuración"
                    isOpen={isOpen}
                    active={currentView === 'SETTINGS'}
                    onClick={() => setCurrentView('SETTINGS')}
                />
                <SidebarItem
                    icon={<Users className="w-5 h-5" />}
                    label="Usuarios"
                    isOpen={isOpen}
                    active={currentView === 'USERS'}
                    onClick={() => setCurrentView('USERS')}
                />
            </nav>

            <div className="p-3 border-t border-white/5">
                <button
                    onClick={async () => {
                        try {
                            await fetch('/api/auth/logout', { method: 'POST' })
                            window.location.href = '/'
                        } catch (e) {
                            console.error('Error al cerrar sesión', e)
                        }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-white/40 hover:text-rose-500 transition-all w-full ${!isOpen && 'justify-center'}`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {isOpen && <span className="text-xs font-medium whitespace-nowrap">Cerrar Sesión</span>}
                </button>
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#000000] border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors z-50 hover:scale-110"
            >
                {isOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
        </motion.aside>
    )
}

function SidebarItem({ icon, label, isOpen, active = false, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                ${active ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}
                ${!isOpen && 'justify-center px-0'}
            `}
        >
            <div className={`shrink-0 transition-colors ${active ? 'text-black' : ''}`}>{icon}</div>
            {isOpen && (
                <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-bold whitespace-nowrap"
                >
                    {label}
                </motion.span>
            )}
            {active && !isOpen && (
                <div className="absolute right-1 top-1 w-1.5 h-1.5 bg-blue-500 rounded-full box-content border-2 border-black" />
            )}
        </button>
    )
}

function SummaryCard({ label, amount, currency, trend = "up" }: { label: string, amount: string, currency: string, trend?: "up" | "down" | "neutral" }) {
    return (
        <div className="flex flex-col min-w-[190px] px-4 py-3 rounded-[16px] bg-white/[0.02] border border-white/[0.08] shadow-2xl relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[9px] font-bold text-white/25 uppercase tracking-[0.2em] mb-1 relative z-10">{label}</span>
            <div className="flex items-baseline gap-2 relative z-10">
                <span className="text-sm font-light text-white/30">{currency === 'USD' ? 'U$D' : '$'}</span>
                <span className="text-2xl font-bold tracking-tighter tabular-nums text-white group-hover:text-glow transition-all duration-500">
                    {amount}
                </span>
            </div>
            <div className={`mt-1 flex items-center gap-1.5 text-[9px] font-bold ${trend === 'neutral' ? 'text-blue-400' : trend === 'up' ? 'text-emerald-500' : 'text-rose-500'} relative z-10`}>
                <div className={`w-1.5 h-1.5 rounded-full ${trend === 'neutral' ? 'bg-blue-400' : trend === 'up' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                {trend === 'neutral' ? 'Capital reservado' : trend === 'up' ? '+2.4%' : '-0.8%'}
                {trend !== 'neutral' && <span className="text-white/10 uppercase tracking-widest ml-1">vs mes anterior</span>}
            </div>
        </div>
    )
}

function ActionButton({ onClick, icon, label, color, full = false }: any) {
    const colors: any = {
        rose: "hover:bg-rose-500/10 hover:border-rose-500/30 hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.2)] text-rose-400",
        emerald: "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)] text-emerald-400",
        blue: "hover:bg-blue-500/10 hover:border-blue-500/30 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)] text-blue-400",
        indigo: "hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.2)] text-indigo-400",
        violet: "hover:bg-violet-500/10 hover:border-violet-500/30 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.2)] text-violet-400",
    }

    return (
        <button
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-[15px] border border-white/[0.08] bg-zinc-900/40 transition-all duration-300
                hover:bg-white/[0.04] active:scale-[0.98] group relative overflow-hidden
                ${colors[color]}
                ${full ? 'flex-row !py-2.5' : ''}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={`${full ? '!p-0 !border-0 !bg-transparent' : 'p-2'} rounded-[11px] bg-white/[0.03] border border-white/5 group-hover:border-current transition-all duration-300 shadow-xl`}>
                {React.cloneElement(icon, { size: full ? 16 : 20 })}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 group-hover:text-white transition-colors">
                {label}
            </span>
        </button>
    )
}

// --- VIEWS ---

function TransactionsView({ transactions, onUpdate, onEdit }: { transactions: any[], onUpdate?: () => void, onEdit?: (t: any) => void }) {
    const [filter, setFilter] = useState('ALL')
    const [paymentFilter, setPaymentFilter] = useState('ALL')
    const [currencyFilter, setCurrencyFilter] = useState('ALL')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMonth, setSelectedMonth] = useState<string>('')

    const filtered = transactions.filter(t => {
        const isLoan = !!t.loanType

        // Filter by Type
        const typeMatch = filter === 'ALL'
            || (filter === 'SAVINGS' && !!t.isSavings)
            || (filter === 'LOAN' && isLoan)
            || (filter === 'EXPENSE' && !isLoan && !t.isSavings && t.type === 'EXPENSE')
            || (filter === 'INCOME' && !isLoan && t.type === 'INCOME')

        // Filter by Payment Status
        const paymentMatch = paymentFilter === 'ALL'
            || (paymentFilter === 'PAID' && ((isLoan && t.loanStatus === 'PAID') || (!isLoan && t.isPaid)))
            || (paymentFilter === 'PENDING' && ((isLoan && t.loanStatus === 'PENDING') || (!isLoan && !t.isSavings && !t.isPaid && t.type === 'EXPENSE')))

        // Filter by Currency
        const currencyMatch = currencyFilter === 'ALL' || t.currency === currencyFilter

        // Filter by Search Term
        const searchMatch = searchTerm === '' ||
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.loanParty && t.loanParty.toLowerCase().includes(searchTerm.toLowerCase()))

        // Filter by Month
        const date = new Date(t.date)
        const monthMatch = selectedMonth === '' ||
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === selectedMonth

        return typeMatch && paymentMatch && currencyMatch && searchMatch && monthMatch
    })

    const filteredTotals = filtered.reduce((totals, transaction) => {
        const currency = transaction.currency === 'USD' ? 'USD' : 'ARS'
        totals[currency] += Number(transaction.amount) || 0
        return totals
    }, { ARS: 0, USD: 0 })

    const resultLabel = filter === 'EXPENSE'
        ? 'Total de gastos'
        : filter === 'INCOME'
            ? 'Total de ingresos'
            : filter === 'SAVINGS'
                ? 'Total ahorrado'
                : filter === 'LOAN'
                    ? 'Total de préstamos'
                    : 'Total de movimientos'

    const selectedPeriodLabel = selectedMonth
        ? new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        : 'Todos los períodos'

    const handleTogglePaid = async (transactionId: string, currentStatus: boolean, loanStatus?: string) => {
        try {
            const body = loanStatus
                ? {
                    loanStatus: loanStatus === 'PAID' ? 'PENDING' : 'PAID',
                    isPaid: loanStatus !== 'PAID',
                }
                : { isPaid: !currentStatus }

            await fetch(`/api/transactions/${transactionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (onUpdate) onUpdate()
            else window.location.reload()
        } catch (error) {
            console.error('Error updating payment status:', error)
        }
    }

    const handleToggleSavings = async (transactionId: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/transactions/${transactionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSavings: !currentStatus })
            })
            if (onUpdate) onUpdate()
            else window.location.reload()
        } catch (error) {
            console.error('Error updating savings status:', error)
        }
    }

    const handleDelete = async (transactionId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) return

        try {
            const res = await fetch(`/api/transactions/${transactionId}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                if (onUpdate) onUpdate()
                else window.location.reload()
            } else {
                alert('Error al eliminar')
            }
        } catch (error) {
            console.error('Error deleting transaction:', error)
        }
    }

    return (
        <Card className="h-full min-h-[500px] flex flex-col !p-0">
            <div className="flex flex-col gap-6 p-8 border-b border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-xl font-bold">Historial de Transacciones</h3>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder="Buscar por concepto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-64 bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                            />
                        </div>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all [color-scheme:dark]"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-2">
                        {['ALL', 'INCOME', 'EXPENSE', 'SAVINGS', 'LOAN'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${filter === f ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'}`}
                            >
                                {f === 'ALL' ? 'Todos' : f === 'INCOME' ? 'Ingresos' : f === 'EXPENSE' ? 'Gastos' : f === 'SAVINGS' ? 'Ahorros' : 'Préstamos'}
                            </button>
                        ))}
                    </div>
                    <div className="w-[1px] h-6 bg-white/10 hidden md:block" />
                    <div className="flex gap-2 items-center">
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Estado:</span>
                        {['ALL', 'PAID', 'PENDING'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setPaymentFilter(f)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${paymentFilter === f
                                    ? f === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : f === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                            : 'bg-white text-black border-white'
                                    : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'
                                    }`}
                            >
                                {f === 'ALL' ? 'Todos' : f === 'PAID' ? 'Pagados' : 'Pendientes'}
                            </button>
                        ))}
                    </div>
                    <div className="w-[1px] h-6 bg-white/10 hidden md:block" />
                    <div className="flex gap-2 items-center">
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Moneda:</span>
                        {['ALL', 'ARS', 'USD'].map((currency) => (
                            <button
                                key={currency}
                                onClick={() => setCurrencyFilter(currency)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${currencyFilter === currency
                                    ? currency === 'USD'
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        : 'bg-white text-black border-white'
                                    : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'
                                    }`}
                            >
                                {currency === 'ALL' ? 'Todas' : currency}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.025] px-5 py-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Resultados</p>
                        <p className="mt-2 text-xl font-bold text-white">{filtered.length}</p>
                        <p className="mt-1 text-[10px] capitalize text-white/30">{selectedPeriodLabel}</p>
                    </div>
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.025] px-5 py-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">{resultLabel} ARS</p>
                        <p className="mt-2 text-xl font-bold tabular-nums text-white">$ {filteredTotals.ARS.toLocaleString('es-AR')}</p>
                        <p className="mt-1 text-[10px] text-white/30">Según los filtros activos</p>
                    </div>
                    <div className="rounded-[16px] border border-blue-500/20 bg-blue-500/[0.035] px-5 py-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400/60">{resultLabel} USD</p>
                        <p className="mt-2 text-xl font-bold tabular-nums text-blue-400">U$D {filteredTotals.USD.toLocaleString('es-AR')}</p>
                        <p className="mt-1 text-[10px] text-white/30">Sin convertir a pesos</p>
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/[0.03] font-bold text-[10px] uppercase text-white/30 tracking-widest">
                        <tr>
                            <th className="p-5 rounded-l-xl">Estado</th>
                            <th className="p-5">Fecha</th>
                            <th className="p-5">Concepto</th>
                            <th className="p-5">Categoría</th>
                            <th className="p-5 text-right">Monto</th>
                            <th className="p-5 text-right rounded-r-xl w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-medium">
                        {filtered.map((t) => (
                            <tr key={t.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="p-4">
                                    {t.isSavings ? (
                                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400">
                                            <PiggyBank className="w-3 h-3" />
                                            Ahorro
                                        </span>
                                    ) : t.loanType ? (
                                        <button
                                            onClick={() => handleTogglePaid(t.id, t.isPaid, t.loanStatus)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${t.loanStatus === 'PAID'
                                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                : 'bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${t.loanStatus === 'PAID' ? 'bg-emerald-500' : 'bg-violet-500'}`} />
                                            {t.loanStatus === 'PAID' ? 'Pagado' : 'Pendiente'}
                                        </button>
                                    ) : t.type === 'EXPENSE' ? (
                                        <button
                                            onClick={() => handleTogglePaid(t.id, t.isPaid)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${t.isPaid
                                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${t.isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {t.isPaid ? 'Pagado' : 'Pendiente'}
                                        </button>
                                    ) : (
                                        <span className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Ingreso
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-white/30 font-mono text-[11px]">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="p-4 text-white/80 group-hover:text-white transition-colors">{t.description || '-'}</td>
                                <td className="p-4 capitalize opacity-40 text-xs">{t.loanType ? `${t.loanParty || 'Préstamo'}` : t.category?.toLowerCase() || 'General'}</td>
                                <td className={`p-4 text-right font-bold ${t.isSavings ? 'text-blue-400' : t.loanType ? 'text-violet-300' : t.type === 'INCOME' ? 'text-emerald-400' : 'text-white'}`}>
                                    {t.isSavings ? '' : t.type === 'INCOME' ? '+' : '-'} {t.currency === 'USD' ? 'U$D' : '$'} {t.amount.toLocaleString()}
                                </td>
                                <td className="p-4 text-right flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onEdit && onEdit(t)}
                                        className="p-2 hover:bg-blue-500/20 rounded-lg text-white/20 hover:text-blue-400 transition-all"
                                        title="Editar registro"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        className="p-2 hover:bg-rose-500/20 rounded-lg text-white/20 hover:text-rose-500 transition-all"
                                        title="Eliminar registro"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="p-20 text-center text-white/10 font-bold uppercase tracking-widest text-[10px]">Sin movimientos registrados</div>
                )}
            </div>
        </Card>
    )
}

function AnalyticsView({ chartData, transactions }: any) {
    return (
        <div className="space-y-8">
            <Card className="p-8">
                <h3 className="text-xl font-bold mb-6">Análisis de Flujo</h3>
                <div className="h-[400px]">
                    <SavingsChart data={chartData} />
                </div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AIRecommendations />
                <Card className="p-8 border-dashed border-white/10 bg-transparent flex items-center justify-center">
                    <p className="text-white/30 text-center text-sm">Más estadísticas próximamente...</p>
                </Card>
            </div>
        </div>
    )
}
