"use client"

import React from 'react'
import { motion } from 'framer-motion'

export const Card = ({ children, className = "", delay = 0, hover = true, contentPadding = 'p-8' }: { children: React.ReactNode, className?: string, delay?: number, hover?: boolean, contentPadding?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
        className={`relative rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-3xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 ${hover ? 'hover:border-white/[0.15] hover:bg-black/50 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]' : ''} group ${contentPadding} ${className}`}
    >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative z-10">
            {children}
        </div>
    </motion.div>
)

export const Button = ({ children, onClick, className = "", variant = "primary", type = "button", disabled = false, fullWidth = false, ariaLabel }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: "primary" | "secondary" | "glow" | "danger" | "success", type?: "button" | "submit" | "reset", disabled?: boolean, fullWidth?: boolean, ariaLabel?: string }) => {
    const baseStyles = "relative px-8 py-4 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-[0.1em] overflow-hidden group select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"

    const variants = {
        primary: "bg-white text-black hover:bg-zinc-200",
        secondary: "bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/[0.1] backdrop-blur-xl hover:border-white/20",
        glow: "bg-blue-600 text-white shadow-[0_0_40px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_-5px_rgba(37,99,235,0.6)] hover:bg-blue-500",
        danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40",
        success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40"
    }

    return (
        <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            type={type}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </motion.button>
    )
}

export const Input = React.forwardRef<HTMLInputElement, any>(({ label, icon: Icon, error, ...props }, ref) => (
    <div className="space-y-2">
        {label && <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">{label}</label>}
        <div className="relative group">
            {Icon && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <input
                ref={ref}
                {...props}
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? `${props.id}-error` : undefined}
                className={`w-full bg-white/[0.03] border ${error ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-4 ${Icon ? 'pl-12' : ''} outline-none focus:border-white/30 focus:bg-white/[0.06] transition-all text-white placeholder:text-white/10 ${props.className || ''}`}
            />
        </div>
        {error && <p id={`${props.id}-error`} className="text-rose-400 text-xs ml-1" role="alert">{error}</p>}
    </div>
))

Input.displayName = 'Input'

export const Badge = ({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: "default" | "success" | "warning" | "error" | "info", className?: string }) => {
    const variants = {
        default: "bg-white/10 text-white/70 border-white/20",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        info: "bg-blue-500/10 text-blue-400 border-blue-500/20"
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${variants[variant]} ${className}`}>
            {children}
        </span>
    )
}

export const Alert = ({ children, variant = "info", className = "", icon: Icon }: { children: React.ReactNode, variant?: "success" | "warning" | "error" | "info", className?: string, icon?: any }) => {
    const variants = {
        success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        error: "bg-rose-500/10 border-rose-500/30 text-rose-400",
        info: "bg-blue-500/10 border-blue-500/30 text-blue-400"
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border backdrop-blur-xl p-4 flex items-start gap-3 ${variants[variant]} ${className}`}
            role="alert"
        >
            {Icon && <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm">{children}</div>
        </motion.div>
    )
}

export const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
)

export const SkeletonCard = () => (
    <Card hover={false}>
        <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    </Card>
)
