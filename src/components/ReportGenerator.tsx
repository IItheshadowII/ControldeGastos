"use client"

import React, { useState } from 'react'
import { Card, Button } from './ui-glass'
import { FileText, Download, Calendar } from 'lucide-react'
import { generateCSV, filterTransactionsByRange } from '@/lib/report-service'

export const ReportGenerator = () => {
    const [loading, setLoading] = useState(false)

    const downloadReport = async (range: 'week' | 'month') => {
        setLoading(true)
        try {
            const res = await fetch('/api/transactions')
            const transactions = await res.json()
            const filtered = filterTransactionsByRange(transactions, range)
            const csv = generateCSV(filtered)

            const blob = new Blob([csv], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.setAttribute('hidden', '')
            a.setAttribute('href', url)
            a.setAttribute('download', `reporte-${range}-${new Date().toISOString().split('T')[0]}.csv`)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                    <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Exportar</p>
                    <h3 className="text-2xl font-bold">Generar Reportes</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => downloadReport('week')}
                    disabled={loading}
                    className="flex flex-col items-center gap-3 p-8 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all group disabled:opacity-50"
                >
                    <Calendar className="w-8 h-8 opacity-30 group-hover:opacity-50 transition-opacity" />
                    <span className="font-bold text-sm">Última Semana</span>
                </button>
                <button
                    onClick={() => downloadReport('month')}
                    disabled={loading}
                    className="flex flex-col items-center gap-3 p-8 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all group disabled:opacity-50"
                >
                    <FileText className="w-8 h-8 opacity-30 group-hover:opacity-50 transition-opacity" />
                    <span className="font-bold text-sm">Último Mes</span>
                </button>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-center">
                <p className="text-xs opacity-40 font-medium">Los reportes se descargan en formato CSV compatible con Excel</p>
            </div>
        </div>
    )
}
