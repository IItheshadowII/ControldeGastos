import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import prisma from '@/lib/prisma'

type TransactionRecord = Awaited<ReturnType<typeof loadTransactions>>[number]

function monthRange(year?: number, month?: number) {
    const now = new Date()
    const resolvedYear = year || now.getFullYear()
    const resolvedMonth = month || now.getMonth() + 1
    // Argentina uses UTC-03:00. Boundaries at 03:00 UTC preserve local calendar months.
    const start = new Date(Date.UTC(resolvedYear, resolvedMonth - 1, 1, 3, 0, 0))
    const end = new Date(Date.UTC(resolvedMonth === 12 ? resolvedYear + 1 : resolvedYear, resolvedMonth % 12, 1, 3, 0, 0))
    return { year: resolvedYear, month: resolvedMonth, start, end }
}

async function loadTransactions(userId: string, year?: number, month?: number) {
    const range = monthRange(year, month)
    return prisma.transaction.findMany({
        where: { userId, date: { gte: range.start, lt: range.end } },
        orderBy: { date: 'desc' },
    })
}

function moneyByCurrency(transactions: TransactionRecord[], predicate: (transaction: TransactionRecord) => boolean) {
    return transactions.filter(predicate).reduce<Record<string, number>>((totals, transaction) => {
        const currency = transaction.currency || 'ARS'
        totals[currency] = (totals[currency] || 0) + transaction.amount
        return totals
    }, {})
}

function roundedCurrencies(values: Record<string, number>) {
    return Object.fromEntries(Object.entries(values).map(([currency, amount]) => [currency, Math.round(amount * 100) / 100]))
}

function result(data: Record<string, unknown>, summary: string) {
    return {
        structuredContent: data,
        content: [{ type: 'text' as const, text: summary }],
    }
}

const periodSchema = {
    year: z.number().int().min(2000).max(2100).optional().describe('Año, por ejemplo 2026. Por defecto usa el actual.'),
    month: z.number().int().min(1).max(12).optional().describe('Mes del 1 al 12. Por defecto usa el actual.'),
}

export function createExpensesMcpServer(userId: string) {
    const server = new McpServer(
        { name: 'control-de-gastos', version: '1.0.0' },
        {
            instructions: 'Herramientas financieras de solo lectura. Los importes ARS y USD se informan separados y nunca deben sumarse sin una cotización explícita. Para un análisis mensual, comenzar con get_monthly_summary y luego profundizar con categorías o movimientos.',
        },
    )

    server.registerTool('get_monthly_summary', {
        title: 'Obtener resumen mensual',
        description: 'Resume ingresos, gastos, pagos pendientes, ahorros y préstamos de un mes. Es la mejor herramienta para comenzar un análisis financiero mensual.',
        inputSchema: periodSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async ({ year, month }) => {
        const period = monthRange(year, month)
        const transactions = await loadTransactions(userId, period.year, period.month)
        const incomes = roundedCurrencies(moneyByCurrency(transactions, item => item.type === 'INCOME' && !item.isSavings))
        const expenses = roundedCurrencies(moneyByCurrency(transactions, item => item.type === 'EXPENSE' && !item.isSavings && !item.loanType))
        const savings = roundedCurrencies(moneyByCurrency(transactions, item => item.isSavings))
        const pendingExpenses = roundedCurrencies(moneyByCurrency(transactions, item => item.type === 'EXPENSE' && !item.isSavings && !item.loanType && !item.isPaid))
        const netCashFlow = Object.fromEntries([...new Set([...Object.keys(incomes), ...Object.keys(expenses)])].map(currency => [
            currency,
            Math.round(((incomes[currency] || 0) - (expenses[currency] || 0)) * 100) / 100,
        ]))
        const pendingLoans = transactions.filter(item => item.loanType && item.loanStatus !== 'PAID').length
        const data = {
            period: `${period.year}-${String(period.month).padStart(2, '0')}`,
            transactionCount: transactions.length,
            incomes,
            expenses,
            netCashFlow,
            savings,
            pendingExpenses,
            pendingLoans,
        }
        return result(data, `Resumen ${data.period}: ${transactions.length} movimientos. Ingresos ${JSON.stringify(incomes)}, gastos ${JSON.stringify(expenses)}, ahorro ${JSON.stringify(savings)}.`)
    })

    server.registerTool('list_transactions', {
        title: 'Listar movimientos',
        description: 'Lista movimientos de un mes con filtros opcionales. Útil para explicar en detalle un total, encontrar gastos concretos o revisar pagos pendientes.',
        inputSchema: {
            ...periodSchema,
            type: z.enum(['INCOME', 'EXPENSE', 'LOAN', 'SAVINGS']).optional(),
            category: z.string().min(1).max(80).optional(),
            paymentStatus: z.enum(['PAID', 'PENDING']).optional(),
            limit: z.number().int().min(1).max(200).default(100),
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async ({ year, month, type, category, paymentStatus, limit }) => {
        let transactions = await loadTransactions(userId, year, month)
        transactions = transactions.filter(item => {
            if (type === 'SAVINGS' && !item.isSavings) return false
            if (type === 'LOAN' && !item.loanType) return false
            if (type === 'INCOME' && (item.type !== 'INCOME' || item.isSavings)) return false
            if (type === 'EXPENSE' && (item.type !== 'EXPENSE' || item.isSavings || !!item.loanType)) return false
            if (category && item.category?.toLowerCase() !== category.toLowerCase()) return false
            if (paymentStatus === 'PAID' && !(item.isPaid || item.loanStatus === 'PAID')) return false
            if (paymentStatus === 'PENDING' && (item.isPaid || item.loanStatus === 'PAID')) return false
            return true
        }).slice(0, limit)
        const items = transactions.map(item => ({
            id: item.id,
            date: item.date.toISOString(),
            description: item.description,
            amount: item.amount,
            currency: item.currency,
            type: item.isSavings ? 'SAVINGS' : item.loanType ? 'LOAN' : item.type,
            category: item.category,
            frequency: item.frequency,
            paymentStatus: item.isPaid || item.loanStatus === 'PAID' ? 'PAID' : 'PENDING',
            loanType: item.loanType,
            loanParty: item.loanParty,
        }))
        return result({ count: items.length, transactions: items }, `Se encontraron ${items.length} movimientos para los filtros solicitados.`)
    })

    server.registerTool('get_spending_by_category', {
        title: 'Analizar gastos por categoría',
        description: 'Agrupa los gastos de un mes por categoría y moneda, con cantidad de operaciones y porcentaje dentro de cada moneda.',
        inputSchema: periodSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async ({ year, month }) => {
        const transactions = (await loadTransactions(userId, year, month)).filter(item => item.type === 'EXPENSE' && !item.isSavings && !item.loanType)
        const totalsByCurrency = moneyByCurrency(transactions, () => true)
        const grouped = new Map<string, { category: string, currency: string, amount: number, count: number }>()
        for (const item of transactions) {
            const category = item.category || 'Sin categoría'
            const key = `${item.currency}:${category}`
            const current = grouped.get(key) || { category, currency: item.currency, amount: 0, count: 0 }
            current.amount += item.amount
            current.count += 1
            grouped.set(key, current)
        }
        const categories = [...grouped.values()].map(item => ({
            ...item,
            amount: Math.round(item.amount * 100) / 100,
            percentage: totalsByCurrency[item.currency] ? Math.round((item.amount / totalsByCurrency[item.currency]) * 1000) / 10 : 0,
        })).sort((a, b) => b.amount - a.amount)
        return result({ categories, totalsByCurrency: roundedCurrencies(totalsByCurrency) }, `Gastos agrupados en ${categories.length} combinaciones de categoría y moneda.`)
    })

    server.registerTool('compare_months', {
        title: 'Comparar meses',
        description: 'Compara ingresos, gastos y ahorros de los últimos meses para detectar tendencias y variaciones.',
        inputSchema: {
            months: z.number().int().min(2).max(12).default(6).describe('Cantidad de meses anteriores, incluyendo el actual.'),
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async ({ months }) => {
        const now = new Date()
        const periods = []
        for (let offset = months - 1; offset >= 0; offset--) {
            const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
            const transactions = await loadTransactions(userId, date.getFullYear(), date.getMonth() + 1)
            periods.push({
                period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                incomes: roundedCurrencies(moneyByCurrency(transactions, item => item.type === 'INCOME' && !item.isSavings)),
                expenses: roundedCurrencies(moneyByCurrency(transactions, item => item.type === 'EXPENSE' && !item.isSavings && !item.loanType)),
                savings: roundedCurrencies(moneyByCurrency(transactions, item => item.isSavings)),
                transactionCount: transactions.length,
            })
        }
        return result({ periods }, `Comparación preparada para ${periods.length} meses, desde ${periods[0]?.period} hasta ${periods.at(-1)?.period}.`)
    })

    server.registerTool('get_savings_overview', {
        title: 'Obtener panorama de ahorros',
        description: 'Muestra los movimientos marcados como ahorro y sus totales mensuales. No modifica metas ni movimientos.',
        inputSchema: periodSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async ({ year, month }) => {
        const savings = (await loadTransactions(userId, year, month)).filter(item => item.isSavings)
        const totals = roundedCurrencies(moneyByCurrency(savings, () => true))
        const items = savings.map(item => ({ id: item.id, date: item.date.toISOString(), description: item.description, amount: item.amount, currency: item.currency }))
        return result({ totals, count: items.length, savings: items }, `Ahorro registrado: ${JSON.stringify(totals)} en ${items.length} movimientos.`)
    })

    server.registerTool('get_loans_overview', {
        title: 'Obtener panorama de préstamos',
        description: 'Resume dinero prestado y recibido, separando préstamos pendientes y pagados, sin modificar su estado.',
        inputSchema: periodSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async ({ year, month }) => {
        const loans = (await loadTransactions(userId, year, month)).filter(item => !!item.loanType)
        const items = loans.map(item => ({
            id: item.id,
            date: item.date.toISOString(),
            description: item.description,
            amount: item.amount,
            currency: item.currency,
            direction: item.loanType,
            status: item.loanStatus || (item.isPaid ? 'PAID' : 'PENDING'),
            party: item.loanParty,
            installments: item.loanInstallments,
        }))
        const pendingLent = roundedCurrencies(moneyByCurrency(loans, item => item.loanType === 'LENT' && item.loanStatus !== 'PAID'))
        const pendingBorrowed = roundedCurrencies(moneyByCurrency(loans, item => item.loanType === 'BORROWED' && item.loanStatus !== 'PAID'))
        return result({ count: items.length, pendingLent, pendingBorrowed, loans: items }, `${items.length} préstamos. A cobrar ${JSON.stringify(pendingLent)}; a pagar ${JSON.stringify(pendingBorrowed)}.`)
    })

    return server
}

