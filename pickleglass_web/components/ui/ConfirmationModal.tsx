'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './button'

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    onConfirm,
    onCancel,
    variant = 'danger'
}: ConfirmationModalProps) {
    const [isRendered, setIsRendered] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true)
            setTimeout(() => setIsVisible(true), 10)
        } else {
            setIsVisible(false)
            const timer = setTimeout(() => setIsRendered(false), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!isRendered) return null

    const getIcon = () => {
        switch (variant) {
            case 'danger':
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-red-500" />
            default:
                return <AlertTriangle className="h-6 w-6 text-blue-500" />
        }
    }

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-0 opacity-0'
                }`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel()
            }}
        >
            <div
                className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 transform ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-50' : 'bg-blue-50'}`}>
                                {getIcon()}
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                {title}
                            </h3>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <X className="h-5 w-5 text-zinc-500" />
                        </button>
                    </div>

                    <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-end mt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-secondary"
                        >
                            <span>{cancelText}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm()
                                onCancel() // Close after confirm
                            }}
                            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
                        >
                            <span>{confirmText}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
