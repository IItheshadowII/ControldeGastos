"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Home, Settings, BarChart3, PlusCircle, PiggyBank } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileNavProps {
    onAddClick?: () => void
    onSavingsClick?: () => void
}

export const MobileNav = ({ onAddClick, onSavingsClick }: MobileNavProps) => {
    const pathname = usePathname()

    const navItems = [
        { icon: Home, label: 'Inicio', href: '/dashboard', active: pathname === '/dashboard' },
        { icon: BarChart3, label: 'Reportes', href: '/reports', active: pathname === '/reports' },
        { icon: PiggyBank, label: 'Ahorro', href: '/savings', active: false },
        { icon: Settings, label: 'Ajustes', href: '/settings/ai', active: pathname.startsWith('/settings') },
    ]

    return (
        <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-white/10"
        >
            <div className="safe-area-inset-bottom">
                <div className="flex items-center justify-around px-4 py-3">
                    {navItems.map((item, index) => {
                        // Mantener botón central de agregar en la posición 1
                        if (index === 1 && onAddClick) {
                            return (
                                <React.Fragment key="add-button">
                                    <NavItem {...item} />
                                    <button
                                        onClick={onAddClick}
                                        className="relative -mt-8 p-4 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full shadow-[0_0_40px_-5px_rgba(37,99,235,0.6)] hover:shadow-[0_0_50px_-5px_rgba(37,99,235,0.8)] active:scale-95 transition-all"
                                        aria-label="Agregar transacción"
                                    >
                                        <PlusCircle className="w-8 h-8 text-white" />
                                    </button>
                                </React.Fragment>
                            )
                        }

                        // Botón de Ahorro usa onSavingsClick si está disponible
                        if (item.label === 'Ahorro' && onSavingsClick) {
                            return (
                                <button key="savings-button" onClick={onSavingsClick} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${item.active ? 'text-blue-400' : 'text-white/40 hover:text-white/70'}`}>
                                    <PiggyBank className="w-6 h-6" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                                </button>
                            )
                        }

                        return <NavItem key={item.href} {...item} />
                    })}
                </div>
            </div>
        </motion.nav>
    )
}

interface NavItemProps {
    icon: React.ComponentType<{ className?: string }>
    label: string
    href: string
    active: boolean
}

const NavItem = ({ icon: Icon, label, href, active }: NavItemProps) => {
    return (
        <Link
            href={href}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                active ? 'text-blue-400' : 'text-white/40 hover:text-white/70'
            }`}
        >
            <Icon className={`w-6 h-6 ${active ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            {active && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"
                />
            )}
        </Link>
    )
}
