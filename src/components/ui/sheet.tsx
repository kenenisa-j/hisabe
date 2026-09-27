'use client'

import * as React from 'react'

interface SheetProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <div className="fixed inset-0" onClick={() => onOpenChange?.(false)} />
            {children}
        </div>
    )
}

export function SheetTrigger({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <div onClick={onClick} className="inline-block cursor-pointer">
            {children}
        </div>
    )
}

export function SheetContent({
    children,
    className = '',
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`relative z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 shadow-xl overflow-y-auto ${className}`}>
            {children}
        </div>
    )
}

export function SheetHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`space-y-1 mb-4 ${className}`}>{children}</div>
}

export function SheetTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <h2 className={`text-lg font-semibold text-white ${className}`}>{children}</h2>
}
