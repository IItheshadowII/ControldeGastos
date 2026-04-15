"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './ui-glass'
import { Eye, EyeOff, Trash2, Plus } from 'lucide-react'

interface Goal {
    id: string
    name: string
    amount: number
    visible?: boolean
}

interface Props {
    onSaved?: () => void
}

const STORAGE_KEY = 'savingsGoals'

export const SavingsGoalForm = ({ onSaved }: Props) => {
    const [name, setName] = useState('')
    const [amount, setAmount] = useState<number | ''>('')
    const [goals, setGoals] = useState<Goal[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw)
                setGoals(parsed)
            }
        } catch (e) { }
    }, [])

    const persist = (next: Goal[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        setGoals(next)
        if (onSaved) onSaved()
    }

    const save = () => {
        const parsedAmount = typeof amount === 'string' && amount !== '' ? parseFloat(amount) : amount
        const payload = {
            id: editingId || `${Date.now()}-${Math.round(Math.random()*10000)}`,
            name: name || 'Meta',
            amount: Number(parsedAmount || 0),
            visible: true
        }

        if (editingId) {
            const next = goals.map(g => g.id === editingId ? payload : g)
            persist(next)
        } else {
            const next = [payload, ...goals]
            persist(next)
        }

        setName('')
        setAmount('')
        setEditingId(null)
    }

    const edit = (g: Goal) => {
        setEditingId(g.id)
        setName(g.name)
        setAmount(g.amount)
    }

    const remove = (id: string) => {
        const next = goals.filter(g => g.id !== id)
        persist(next)
    }

    const toggleVisible = (id: string) => {
        const next = goals.map(g => g.id === id ? { ...g, visible: !g.visible } : g)
        persist(next)
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Nombre de la meta</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-2 p-3 rounded-lg bg-white/5 border border-white/5 text-white" placeholder="Ej: Viaje a Bariloche" />
            </div>

            <div>
                <label className="text-xs text-white/40 uppercase tracking-wider">Monto objetivo (ARS)</label>
                <input value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} type="number" className="w-full mt-2 p-3 rounded-lg bg-white/5 border border-white/5 text-white" placeholder="0" />
            </div>

            <div className="flex gap-2">
                <Button onClick={save} fullWidth variant="glow"><Plus className="w-4 h-4 mr-2" />{editingId ? 'Actualizar' : 'Añadir Meta'}</Button>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2">
                {goals.length === 0 && (
                    <p className="text-sm text-white/30">No hay metas creadas.</p>
                )}

                {goals.map(g => (
                    <div key={g.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                        <div>
                            <p className="font-bold">{g.name}</p>
                            <p className="text-xs text-white/40">$ {g.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button title={g.visible ? 'Ocultar' : 'Mostrar'} onClick={() => toggleVisible(g.id)} className="p-2 rounded-md hover:bg-white/5">
                                {g.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button title="Editar" onClick={() => edit(g)} className="p-2 rounded-md hover:bg-white/5">Editar</button>
                            <button title="Eliminar" onClick={() => remove(g.id)} className="p-2 rounded-md hover:bg-red-600/20 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default SavingsGoalForm
