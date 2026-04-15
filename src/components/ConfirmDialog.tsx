"use client"

import React from 'react'
import { Modal } from './Modal'
import { Button } from './ui-glass'
import { AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    isLoading?: boolean
}

export const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    isLoading = false
}: ConfirmDialogProps) => {
    const icons = {
        danger: <AlertTriangle className="w-12 h-12" />,
        warning: <AlertTriangle className="w-12 h-12" />,
        info: <Info className="w-12 h-12" />
    }

    const colors = {
        danger: 'text-rose-400 bg-rose-500/10',
        warning: 'text-amber-400 bg-amber-500/10',
        info: 'text-blue-400 bg-blue-500/10'
    }

    const handleConfirm = () => {
        onConfirm()
        if (!isLoading) {
            onClose()
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center ${colors[variant]}`}
                >
                    {icons[variant]}
                </motion.div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
                    <p className="text-white/60 text-sm max-w-sm">{message}</p>
                </div>

                <div className="flex gap-3 w-full pt-4">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        fullWidth
                        disabled={isLoading}
                        ariaLabel="Cancelar acción"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'danger' : 'glow'}
                        fullWidth
                        disabled={isLoading}
                        ariaLabel={`Confirmar ${title.toLowerCase()}`}
                    >
                        {isLoading ? 'Procesando...' : confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
