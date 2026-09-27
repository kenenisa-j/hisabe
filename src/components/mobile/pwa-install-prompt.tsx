'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null)
    const [isIOS] = useState(() => {
        if (typeof window === 'undefined') return false
        return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    })
    const [isStandalone] = useState(() => {
        if (typeof window === 'undefined') return false
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true
        )
    })
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // Capture standard install prompt event (Android / Chromium)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        await deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice

        if (choiceResult.outcome === 'accepted') {
            setDeferredPrompt(null)
        }
    }

    // Hide if already installed, dismissed, or no install option available
    if (isStandalone || dismissed || (!deferredPrompt && !isIOS)) {
        return null
    }

    return (
        <div className="fixed top-4 left-4 right-4 z-50 md:hidden bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3 pr-2">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Download className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold">Install Hisabe</h4>
                    {isIOS ? (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            Tap <Share className="h-3 w-3 inline text-blue-400" /> then &quot;Add to
                            Home Screen&quot;
                        </p>
                    ) : (
                        <p className="text-xs text-slate-400">Add to Home Screen for fast access</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                {!isIOS && deferredPrompt && (
                    <Button
                        size="sm"
                        onClick={handleInstallClick}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 px-3 rounded-lg"
                    >
                        Install
                    </Button>
                )}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDismissed(true)}
                    className="h-9 w-9 text-slate-400 hover:text-white"
                    aria-label="Close install banner"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}