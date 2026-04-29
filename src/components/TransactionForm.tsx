"use client"

import React, { useState } from 'react'
import { Button, Input } from './ui-glass'
import { Minus, Wallet, CheckCircle2, Loader2, ArrowRight, Sparkles, Users, FileText, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'

const transactionFormSchema = z.object({
    amount: z.string()
        .min(1, 'El monto es requerido')
        .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Ingresa un monto válido mayor a 0'),
    description: z.string()
        .min(3, 'La descripción debe tener al menos 3 caracteres')
        .max(100, 'La descripción no puede exceder 100 caracteres'),
    currency: z.enum(['ARS', 'USD']),
    frequency: z.enum(['VARIABLE', 'FIXED']),
    incomeType: z.enum(['BLANCO', 'NEGRO']).optional(),
    isPaid: z.boolean(),
    isSavings: z.boolean().optional(),
    // Loan fields
    loanType: z.enum(['LENT', 'BORROWED']).optional(),
    loanStatus: z.enum(['PENDING', 'PAID']).optional(),
    loanParty: z.string().optional(),
    loanInstallments: z.string().optional(),
    loanNotes: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionFormSchema>
type TransactionFormProps = {
    type?: 'EXPENSE' | 'INCOME' | 'LOAN'
    onSuccess?: () => void
    mode?: 'create' | 'edit'
    transaction?: any
}

export const TransactionForm = ({ type = 'EXPENSE', onSuccess, mode = 'create', transaction }: TransactionFormProps) => {
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE')
    const toast = useToast()
    const router = useRouter()

    const effectiveType: 'EXPENSE' | 'INCOME' | 'LOAN' = (transaction?.type === 'INCOME' || transaction?.type === 'EXPENSE' || transaction?.type === 'LOAN') ? transaction.type : (type || 'EXPENSE')

    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<TransactionFormData>({
        resolver: zodResolver(transactionFormSchema),
        defaultValues: {
            amount: transaction && typeof transaction.amount === 'number' ? String(transaction.amount) : '',
            description: transaction?.description || '',
            currency: transaction?.currency || 'ARS',
            frequency: transaction?.frequency || 'VARIABLE',
            incomeType: transaction?.incomeType || 'BLANCO',
            isPaid: typeof transaction?.isPaid === 'boolean' ? transaction.isPaid : false,
            isSavings: typeof transaction?.isSavings === 'boolean' ? transaction.isSavings : false,
            loanType: transaction?.loanType || undefined,
            loanStatus: transaction?.loanStatus || 'PENDING',
            loanParty: transaction?.loanParty || '',
            loanInstallments: transaction?.loanInstallments ? String(transaction.loanInstallments) : '',
            loanNotes: transaction?.loanNotes || '',
        }
    })

    const isPaid = watch('isPaid')
    const isSavings = watch('isSavings')
    const frequency = watch('frequency')
    const incomeType = watch('incomeType')
    const currency = watch('currency')
    const loanType = watch('loanType')
    const loanStatus = watch('loanStatus')
    const loanParty = watch('loanParty')
    const loanInstallments = watch('loanInstallments')
    const loanNotes = watch('loanNotes')

    function normalizeNumberInput(input: string) {
        // Keep only digits, dots and commas
        let s = String(input || '').replace(/[^0-9.,]/g, '')
        if (!s) return ''

        // Normalize commas to dots (treat comma as decimal separator)
        s = s.replace(/,/g, '.')

        const dotCount = (s.match(/\./g) || []).length

        if (dotCount > 1) {
            // Remove all dots except the last (they were thousand separators)
            const lastIndex = s.lastIndexOf('.')
            const intPart = s.slice(0, lastIndex).replace(/\./g, '')
            const fracPart = s.slice(lastIndex + 1)
            return fracPart ? `${intPart}.${fracPart}` : intPart
        }

        if (dotCount === 1) {
            const [intPart, fracPart] = s.split('.')
            // Heuristic: if fractional part has exactly 3 digits, it's likely a thousand separator
            if (fracPart.length === 3) {
                return `${intPart}${fracPart}`
            }
            return fracPart ? `${intPart}.${fracPart}` : intPart
        }

        return s
    }

    const onSubmit = async (data: TransactionFormData) => {
        setStatus('LOADING')

        try {
            const isEdit = mode === 'edit' && transaction?.id
            const url = isEdit ? `/api/transactions/${transaction.id}` : '/api/transactions'
            const method = isEdit ? 'PATCH' : 'POST'

            const payload: any = {
                // normalize before sending
                amount: parseFloat(normalizeNumberInput(data.amount)),
                description: data.description,
                currency: data.currency,
                type: effectiveType,
                frequency: data.frequency,
                isPaid: effectiveType === 'LOAN' ? (data.loanStatus === 'PAID') : (effectiveType === 'EXPENSE' ? data.isPaid : true),
                isSavings: !!data.isSavings
            }

            // Add type-specific fields
            if (effectiveType === 'INCOME') {
                payload.incomeType = data.incomeType
            } else if (effectiveType === 'LOAN') {
                payload.loanType = data.loanType
                payload.loanStatus = data.loanStatus
                payload.loanParty = data.loanParty
                if (data.loanInstallments) {
                    payload.loanInstallments = parseInt(data.loanInstallments)
                }
                payload.loanNotes = data.loanNotes
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setStatus('SUCCESS')
                const typeLabels = {
                    'INCOME': 'Ingreso',
                    'EXPENSE': 'Gasto',
                    'LOAN': loanType === 'LENT' ? 'Préstamo otorgado' : 'Préstamo recibido'
                }
                toast.success(
                    isEdit
                        ? `${typeLabels[effectiveType]} actualizado`
                        : `${typeLabels[effectiveType]} registrado`,
                    isEdit
                        ? `Se actualizó correctamente ${data.description}`
                        : `Se ha registrado correctamente ${data.description}`
                )

                // Refresh sin reload completo
                setTimeout(() => {
                    router.refresh()
                    if (onSuccess) {
                        onSuccess()
                    } else {
                        setStatus('IDLE')
                    }
                }, 1500)
            } else {
                const error = await res.json()
                toast.error('Error al registrar', error.message || 'Intenta nuevamente')
                setStatus('IDLE')
            }
        } catch (error) {
            toast.error('Error de conexión', 'No se pudo conectar con el servidor')
            setStatus('IDLE')
            console.error(error)
        }
    }

    if (status === 'SUCCESS') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
                <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)]"
                >
                    <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                <div className="space-y-2">
                    <h3 className="text-3xl font-bold tracking-tight">¡Operación Exitosa!</h3>
                    <p className="text-white/40 font-medium">Actualizando tu centro de control...</p>
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500/40" />
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Header Section */}
            <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                <div className={`p-3 rounded-xl ${
                    effectiveType === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' :
                    effectiveType === 'LOAN' ? 'bg-violet-500/10 text-violet-400' :
                    'bg-rose-500/10 text-rose-400'
                }`}>
                    {effectiveType === 'INCOME' ? <Wallet size={24} /> :
                     effectiveType === 'LOAN' ? <Users size={24} /> :
                     <Minus size={24} />}
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Registrar</p>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {effectiveType === 'INCOME' ? 'Nuevo Ingreso' :
                         effectiveType === 'LOAN' ? 'Nuevo Préstamo' :
                         'Nuevo Gasto'}
                    </h2>
                </div>
            </div>

            {/* Main Entry Section */}
            <div className="space-y-6">
                {/* Amount Entry */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Monto</label>
                    <div className={`flex items-center gap-3 p-6 ${errors.amount ? 'bg-rose-500/5 border-rose-500/30' : 'bg-white/[0.02] border-white/10'} border rounded-2xl focus-within:border-white/20 focus-within:bg-white/[0.04] transition-all`}>
                        <span className="text-2xl font-light text-white/30">{currency === 'USD' ? 'U$D' : '$'}</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={(watch('amount') || '') as string}
                            onChange={(e) => {
                                const incoming = e.target.value
                                const filtered = incoming.replace(/[^0-9.,]/g, '')
                                setValue('amount', filtered, { shouldValidate: true, shouldDirty: true })
                            }}
                            className="flex-1 bg-transparent border-none outline-none text-4xl font-bold tracking-tighter text-white placeholder:text-white/10 font-mono"
                            autoFocus
                            aria-invalid={errors.amount ? "true" : "false"}
                            aria-describedby={errors.amount ? "amount-error" : undefined}
                        />
                        <select
                            {...register('currency')}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 outline-none cursor-pointer transition-all"
                        >
                            <option value="ARS" className="bg-zinc-900">ARS</option>
                            <option value="USD" className="bg-zinc-900">USD</option>
                        </select>
                    </div>
                    {errors.amount && (
                        <p id="amount-error" className="text-rose-400 text-xs ml-1" role="alert">
                            {errors.amount.message}
                        </p>
                    )}
                </div>

                {/* Concept Input */}
                <div className="space-y-2">
                    <Input
                        label="Concepto / Descripción"
                        placeholder="Ej: Supermercado, Alquiler, Sueldo..."
                        {...register('description')}
                        error={errors.description?.message}
                        id="description"
                        aria-required="true"
                    />
                </div>

                {/* Loan Type Selection (Only for Loans) */}
                {effectiveType === 'LOAN' && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Tipo de Préstamo</label>
                        <div className="grid grid-cols-2 gap-3 p-1.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                            <TypeButton
                                active={loanType === 'LENT'}
                                onClick={() => setValue('loanType', 'LENT')}
                                label="Presté Dinero"
                                icon={<ArrowRight size={14} />}
                                color="violet"
                            />
                            <TypeButton
                                active={loanType === 'BORROWED'}
                                onClick={() => setValue('loanType', 'BORROWED')}
                                label="Me Prestaron"
                                icon={<ArrowRight size={14} className="rotate-180" />}
                                color="violet"
                            />
                        </div>
                    </div>
                )}

                {/* Classification Toggles */}
                {effectiveType !== 'LOAN' && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Clasificación</label>
                        <div className="grid grid-cols-2 gap-3 p-1.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                            {effectiveType === 'EXPENSE' ? (
                                <>
                                    <TypeButton
                                        active={frequency === 'VARIABLE'}
                                        onClick={() => setValue('frequency', 'VARIABLE')}
                                        label="Adicional"
                                        icon={<Sparkles size={14} />}
                                    />
                                    <TypeButton
                                        active={frequency === 'FIXED'}
                                        onClick={() => setValue('frequency', 'FIXED')}
                                        label="Fijo Mensual"
                                    />
                                </>
                            ) : (
                                <>
                                    <TypeButton
                                        active={incomeType === 'BLANCO'}
                                        onClick={() => setValue('incomeType', 'BLANCO')}
                                        label="En Blanco"
                                        color="emerald"
                                    />
                                    <TypeButton
                                        active={incomeType === 'NEGRO'}
                                        onClick={() => setValue('incomeType', 'NEGRO')}
                                        label="En Negro"
                                        color="emerald"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Loan Fields */}
                {effectiveType === 'LOAN' && (
                    <div className="space-y-6">
                        {/* Loan Party */}
                        <div className="space-y-2">
                            <Input
                                label="Persona"
                                placeholder="Nombre de quien prestó/recibió"
                                {...register('loanParty')}
                                error={errors.loanParty?.message}
                                icon={<Users size={16} />}
                                id="loanParty"
                            />
                        </div>

                        {/* Loan Status */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Estado</label>
                            <div className="grid grid-cols-2 gap-3 p-1.5 bg-white/[0.03] border border-white/5 rounded-2xl">
                                <TypeButton
                                    active={loanStatus === 'PENDING'}
                                    onClick={() => setValue('loanStatus', 'PENDING')}
                                    label="Pendiente"
                                    color="violet"
                                />
                                <TypeButton
                                    active={loanStatus === 'PAID'}
                                    onClick={() => setValue('loanStatus', 'PAID')}
                                    label="Pagado"
                                    color="violet"
                                />
                            </div>
                        </div>

                        {/* Loan Installments */}
                        <div className="space-y-2">
                            <Input
                                label="Cuotas (opcional)"
                                placeholder="Número de cuotas"
                                type="number"
                                {...register('loanInstallments')}
                                error={errors.loanInstallments?.message}
                                icon={<Calendar size={16} />}
                                id="loanInstallments"
                            />
                        </div>

                        {/* Loan Notes */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Notas (opcional)</label>
                            <textarea
                                {...register('loanNotes')}
                                placeholder="Detalles adicionales del préstamo..."
                                className="w-full p-4 bg-white/[0.02] border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:border-violet-500/50 focus:bg-white/[0.04] transition-all resize-none"
                                rows={3}
                                id="loanNotes"
                            />
                        </div>
                    </div>
                )}

                {/* Payment Status (Only for Expenses) */}
                {effectiveType === 'EXPENSE' && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Estado de Pago</label>
                        <button
                            type="button"
                            onClick={() => setValue('isPaid', !isPaid)}
                            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${isPaid
                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]'
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                }`}
                            aria-pressed={isPaid}
                            aria-label={isPaid ? 'Marcado como pagado' : 'Marcado como pendiente'}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                                        }`}>
                                        {isPaid && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="text-white"
                                            >
                                                <CheckCircle2 size={16} />
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className={`text-sm font-bold ${isPaid ? 'text-emerald-400' : 'text-white/60'}`}>
                                        {isPaid ? 'Pagado' : 'Pendiente de Pago'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Savings Toggle (Only for Income) */}
                {effectiveType === 'INCOME' && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">¿Es Ahorro?</label>
                        <button
                            type="button"
                            onClick={() => setValue('isSavings', !isSavings)}
                            className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${isSavings
                                ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_-5px_rgba(59,130,246,0.2)]'
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                }`}
                            aria-pressed={isSavings}
                            aria-label={isSavings ? 'Marcado como ahorro' : 'No es ahorro'}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSavings ? 'bg-blue-500 border-blue-500' : 'border-white/20'
                                    }`}>
                                    {isSavings && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="text-white"
                                        >
                                            <CheckCircle2 size={16} />
                                        </motion.div>
                                    )}
                                </div>
                                <span className={`text-sm font-bold ${isSavings ? 'text-blue-400' : 'text-white/60'}`}>
                                    {isSavings ? 'Sí, es ahorro' : 'No es ahorro'}
                                </span>
                            </div>
                        </button>
                    </div>
                )}

                {/* Submit Button */}
                <Button
                    type="submit"
                    disabled={status === 'LOADING'}
                    className="w-full py-6 text-lg font-bold bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {status === 'LOADING' ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Registrando...
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5" />
                            {mode === 'edit' ? 'Actualizar' : 'Registrar'} {effectiveType === 'INCOME' ? 'Ingreso' : effectiveType === 'LOAN' ? 'Préstamo' : 'Gasto'}
                        </div>
                    )}
                </Button>
            </div>
        </form>
    )
}

// Type Button Component
const TypeButton = ({ active, onClick, label, icon, color = 'default' }: {
    active: boolean
    onClick: () => void
    label: string
    icon?: React.ReactNode
    color?: 'default' | 'emerald' | 'violet'
}) => {
    const colorClasses = {
        default: active ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-transparent text-white/40 hover:text-white/60',
        emerald: active ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-transparent border-transparent text-white/40 hover:text-white/60',
        violet: active ? 'bg-violet-500/20 border-violet-500/40 text-violet-400' : 'bg-transparent border-transparent text-white/40 hover:text-white/60'
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all font-bold text-sm ${colorClasses[color]}`}
        >
            {icon}
            {label}
        </button>
    )
}
