'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

export function UserNav() {
    const { user, signOut } = useAuth()
    const [open, setOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!user) {
        return null
    }


    const displayName = user.displayName || user.email?.split('@')[0] || 'User'
    const photoURL = user.photoURL
    const initial = displayName.charAt(0).toUpperCase()

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-semibold text-slate-950 shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                aria-label="User profile menu"
            >
                {photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photoURL}
                        alt={displayName}
                        className="h-full w-full rounded-full object-cover"
                    />
                ) : (
                    <span>{initial}</span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                        <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-[10px] font-mono text-amber-300">
                            <span className="truncate">UID: {user.uid}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    navigator.clipboard.writeText(user.uid)
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 2000)
                                }}
                                className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    <Link
                        href="/settings"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Settings</span>
                    </Link>

                    <button
                        type="button"
                        onClick={async () => {
                            setOpen(false)
                            await signOut()
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                    </button>
                </div>
            )}
        </div>
    )
}
