"use client"

import React, { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, DollarSign, TrendingUp, Settings, FileText, Home, X, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CommandMenuProps {
    isOpen: boolean
    onClose: () => void
    onAddExpense?: () => void
    onAddIncome?: () => void
    onAddLoan?: () => void
}

export const CommandMenu = ({ isOpen, onClose, onAddExpense, onAddIncome, onAddLoan }: CommandMenuProps) => {
    const router = useRouter()
    const [search, setSearch] = useState('')

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                onClose()
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [onClose])

    const handleSelect = (callback: () => void) => {
        callback()
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-2xl"
                    >
                        <Command className="rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-3xl shadow-2xl overflow-hidden">
                            <div className="flex items-center gap-3 px-4 border-b border-white/10">
                                <Search className="w-5 h-5 text-white/40" />
                                <Command.Input
                                    value={search}
                                    onValueChange={setSearch}
                                    placeholder="Buscar transacciones, navegar, ejecutar comandos..."
                                    className="w-full bg-transparent border-none outline-none py-4 text-white placeholder:text-white/30"
                                />
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                                    aria-label="Cerrar búsqueda"
                                >
                                    <X className="w-4 h-4 text-white/40" />
                                </button>
                            </div>

                            <Command.List className="max-h-[400px] overflow-y-auto p-2">
                                <Command.Empty className="py-12 text-center text-white/40 text-sm">
                                    No se encontraron resultados.
                                </Command.Empty>

                                <Command.Group heading="Navegación" className="px-2 py-2">
                                    <CommandItem
                                        icon={<Home className="w-5 h-5" />}
                                        label="Dashboard"
                                        shortcut="⌘H"
                                        onSelect={() => handleSelect(() => router.push('/dashboard'))}
                                    />
                                    <CommandItem
                                        icon={<FileText className="w-5 h-5" />}
                                        label="Reportes"
                                        shortcut="⌘R"
                                        onSelect={() => handleSelect(() => router.push('/reports'))}
                                    />
                                    <CommandItem
                                        icon={<Settings className="w-5 h-5" />}
                                        label="Configuración de IA"
                                        shortcut="⌘,"
                                        onSelect={() => handleSelect(() => router.push('/settings/ai'))}
                                    />
                                </Command.Group>

                                <Command.Separator className="h-px bg-white/10 my-2" />

                                <Command.Group heading="Acciones" className="px-2 py-2">
                                    <CommandItem
                                        icon={<DollarSign className="w-5 h-5" />}
                                        label="Registrar Gasto"
                                        shortcut="⌘E"
                                        onSelect={() => handleSelect(() => onAddExpense?.())}
                                    />
                                    <CommandItem
                                        icon={<TrendingUp className="w-5 h-5" />}
                                        label="Registrar Ingreso"
                                        shortcut="⌘I"
                                        onSelect={() => handleSelect(() => onAddIncome?.())}
                                    />
                                    <CommandItem
                                        icon={<Wallet className="w-5 h-5" />}
                                        label="Registrar Préstamo"
                                        shortcut="⌘P"
                                        onSelect={() => handleSelect(() => onAddLoan?.())}
                                    />
                                </Command.Group>
                            </Command.List>
                        </Command>

                        <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-xs text-white/30">
                            <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded">⌘K</kbd>
                            <span>para abrir</span>
                            <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded">ESC</kbd>
                            <span>para cerrar</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

interface CommandItemProps {
    icon: React.ReactNode
    label: string
    shortcut?: string
    onSelect: () => void
}

const CommandItem = ({ icon, label, shortcut, onSelect }: CommandItemProps) => {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer data-[selected=true]:bg-white/10 transition-all mb-1 group outline-none"
        >
            <div className="flex items-center gap-3">
                <div className="text-white/60 group-data-[selected=true]:text-blue-400 transition-colors">
                    {icon}
                </div>
                <span className="text-sm text-white/80 group-data-[selected=true]:text-white">
                    {label}
                </span>
            </div>
            {shortcut && (
                <kbd className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/40 group-data-[selected=true]:border-white/20">
                    {shortcut}
                </kbd>
            )}
        </Command.Item>
    )
}
