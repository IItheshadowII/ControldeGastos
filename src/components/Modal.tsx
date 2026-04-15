"use client"

import React, { useEffect, useRef } from 'react'
import { Card, Button } from './ui-glass'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const Modal = ({ isOpen, onClose, children, title }: { isOpen: boolean, onClose: () => void, children: React.ReactNode, title?: string }) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)

    // Focus management
    useEffect(() => {
        if (isOpen) {
            // Save the current focused element
            const previouslyFocusedElement = document.activeElement as HTMLElement
            
            // Focus the close button when modal opens
            closeButtonRef.current?.focus()

            // Prevent body scroll
            document.body.style.overflow = 'hidden'

            // Handle escape key
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose()
                }
            }

            document.addEventListener('keydown', handleEscape)

            return () => {
                document.body.style.overflow = ''
                document.removeEventListener('keydown', handleEscape)
                // Restore focus to the previously focused element
                previouslyFocusedElement?.focus()
            }
        }
    }, [isOpen, onClose])

    // Focus trap
    useEffect(() => {
        if (!isOpen) return

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return

            const focusableElements = modalRef.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
            
            if (!focusableElements || focusableElements.length === 0) return

            const firstElement = focusableElements[0] as HTMLElement
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus()
                    e.preventDefault()
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus()
                    e.preventDefault()
                }
            }
        }

        document.addEventListener('keydown', handleTabKey)
        return () => document.removeEventListener('keydown', handleTabKey)
    }, [isOpen])

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 text-white overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={title ? "modal-title" : undefined}
                    ref={modalRef}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-lg bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl mx-4"
                    >
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-all group z-[70] bg-black/40 backdrop-blur-md border border-white/10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black outline-none"
                            aria-label="Cerrar modal"
                        >
                            <X className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="px-6 py-8 overflow-y-auto max-h-[90vh] custom-scrollbar">
                            {title && (
                                <h2 id="modal-title" className="sr-only">{title}</h2>
                            )}
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
