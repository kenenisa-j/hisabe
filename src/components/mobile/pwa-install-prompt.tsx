'use client'

import React, { useState, useEffect, useCallback, useId } from 'react'
import {
    Download,
    X,
    Share,
    PlusSquare,
    MoreVertical,
    Sparkles,
    Smartphone,
    Monitor,
    ArrowLeft,
    Check,
} from 'lucide-react'
import { HisabeLogoMark } from '@/components/layout/HisabeLogo'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>
    prompt(): Promise<void>
}

const SESSION_DISMISSED_KEY = 'hisabe_pwa_dismissed'
const LOCAL_INSTALLED_KEY = 'hisabe_pwa_installed'

/**
 * Checks whether HISABE is already running in standalone mode
 * across Android, iOS Safari, desktop PWAs, or previously confirmed installed.
 */
export function checkIsAppInstalled(): boolean {
    if (typeof window === 'undefined') return false

    // 1. Standard W3C display-mode matches (Android Chrome, Edge, desktop Chrome)
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
    const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches

    // 2. iOS Safari standalone mode
    const isIOSStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true

    // 3. Android TWA / installed web APK referrer
    const isAndroidApp =
        typeof document !== 'undefined' &&
        document.referrer?.startsWith('android-app://')

    // 4. Confirmed recorded installation from user accepting native prompt
    let isRecorded = false
    try {
        isRecorded = localStorage.getItem(LOCAL_INSTALLED_KEY) === 'true'
    } catch {
        // localStorage may be disabled in private mode
    }

    return (
        isStandaloneDisplay ||
        isFullscreen ||
        isMinimalUi ||
        isIOSStandalone ||
        Boolean(isAndroidApp) ||
        isRecorded
    )
}

/**
 * Checks if the user is currently typing in a form or interacting with a modal/financial form,
 * ensuring the install prompt does not interrupt active inputs, transactions, or logins.
 */
function isUserBusyWithFormOrModal(): boolean {
    if (typeof document === 'undefined') return false

    // Active input, password field, or textarea focus
    const active = document.activeElement
    if (
        active &&
        (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT' ||
            (active as HTMLElement).isContentEditable)
    ) {
        return true
    }

    // Check if another dialog (e.g. transaction modal, repayment modal) is open
    const otherDialogs = document.querySelectorAll(
        '[role="dialog"]:not([data-pwa-dialog="true"])'
    )
    if (otherDialogs.length > 0) {
        return true
    }

    return false
}

export function PWAInstallPrompt() {
    const [isOpen, setIsOpen] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android')
    const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android')

    const titleId = useId()
    const descId = useId()

    // Detect client platform
    useEffect(() => {
        if (typeof window === 'undefined') return

        const ua = window.navigator.userAgent.toLowerCase()
        const isIOS =
            /iphone|ipad|ipod/.test(ua) ||
            (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
        const isAndroid = /android/.test(ua)

        if (isIOS) {
            setPlatform('ios')
            setActiveTab('ios')
        } else if (isAndroid) {
            setPlatform('android')
            setActiveTab('android')
        } else {
            setPlatform('desktop')
            setActiveTab('desktop')
        }
    }, [])

    // Register service worker and handle install events & display rules
    useEffect(() => {
        if (typeof window === 'undefined') return

        // 1. Check if already installed
        if (checkIsAppInstalled()) {
            setIsInstalled(true)
            return
        }

        // 2. Register service worker for PWA support
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.debug('PWA ServiceWorker registration error:', err)
            })
        }

        // 3. Listen for native install prompt (Android Chrome, Edge, desktop Chrome)
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        // 4. Listen for app installed event (browser confirmation)
        const handleAppInstalled = () => {
            setIsInstalled(true)
            setIsOpen(false)
            try {
                localStorage.setItem(LOCAL_INSTALLED_KEY, 'true')
            } catch {
                // ignore
            }
        }

        // 5. Listen for display-mode changes
        const mediaQuery = window.matchMedia('(display-mode: standalone)')
        const handleDisplayModeChange = (e: MediaQueryListEvent) => {
            if (e.matches) {
                setIsInstalled(true)
                setIsOpen(false)
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall)
        window.addEventListener('appinstalled', handleAppInstalled)
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleDisplayModeChange)
        }

        // 6. Check session dismissal
        let isSessionDismissed = false
        try {
            isSessionDismissed = sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true'
        } catch {
            // ignore
        }

        if (isSessionDismissed) {
            return () => {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
                window.removeEventListener('appinstalled', handleAppInstalled)
                if (mediaQuery.removeEventListener) {
                    mediaQuery.removeEventListener('change', handleDisplayModeChange)
                }
            }
        }

        // 7. Schedule display without requiring beforeinstallprompt to fire
        // Check if user is typing or in a modal before showing
        let retryInterval: NodeJS.Timeout | null = null

        const attemptShow = () => {
            if (checkIsAppInstalled()) {
                setIsInstalled(true)
                return
            }

            // Do not interrupt active form input or open financial modal
            if (isUserBusyWithFormOrModal()) {
                if (!retryInterval) {
                    retryInterval = setInterval(() => {
                        if (!isUserBusyWithFormOrModal() && !checkIsAppInstalled()) {
                            if (retryInterval) clearInterval(retryInterval)
                            setIsOpen(true)
                        }
                    }, 2000)
                }
                return
            }

            setIsOpen(true)
        }

        const timer = setTimeout(attemptShow, 600)

        return () => {
            clearTimeout(timer)
            if (retryInterval) clearInterval(retryInterval)
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
            window.removeEventListener('appinstalled', handleAppInstalled)
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleDisplayModeChange)
            }
        }
    }, [])

    // Dismiss popup for current session only ("Maybe Later")
    const handleDismiss = useCallback(() => {
        try {
            sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true')
        } catch {
            // ignore
        }
        setIsOpen(false)
        setShowInstructions(false)
    }, [])

    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleDismiss()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, handleDismiss])

    // Primary action: Install Now
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt()
                const choiceResult = await deferredPrompt.userChoice

                if (choiceResult.outcome === 'accepted') {
                    // Browser confirmed user accepted
                    setDeferredPrompt(null)
                    setIsInstalled(true)
                    setIsOpen(false)
                    try {
                        localStorage.setItem(LOCAL_INSTALLED_KEY, 'true')
                    } catch {
                        // ignore
                    }
                } else {
                    // User dismissed the browser prompt: do NOT claim installation succeeded
                    console.debug('User dismissed native install prompt')
                }
            } catch (err) {
                console.error('Failed to trigger native install prompt:', err)
                setShowInstructions(true)
            }
        } else {
            // Native prompt unavailable: display browser-specific instructions
            setShowInstructions(true)
        }
    }

    // Do not show if already installed or not open
    if (isInstalled || !isOpen) {
        return null
    }

    return (
        <div
            data-pwa-dialog="true"
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
                onClick={handleDismiss}
                aria-hidden="true"
            />

            {/* Modal Dialog Card */}
            <div
                className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl bg-card border border-border shadow-2xl p-5 sm:p-6 overflow-hidden z-10 text-card-foreground animate-in zoom-in-95 duration-200 my-auto"
                onClick={(e) => e.stopPropagation()}
                style={{
                    paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
                }}
            >
                {/* Header Ethiopian flag subtle decorative bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                    <div className="h-full w-1/3 bg-emerald-500" />
                    <div className="h-full w-1/3 bg-amber-400" />
                    <div className="h-full w-1/3 bg-red-500" />
                </div>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="absolute top-3.5 right-3.5 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="overflow-y-auto pr-0.5 -mr-0.5">
                    {!showInstructions ? (
                        /* Main View */
                        <div className="flex flex-col items-center text-center mt-1">
                            {/* Glowing Logo Container */}
                            <div className="relative mb-3 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-lg" />
                                <div className="relative rounded-2xl p-1 bg-gradient-to-br from-emerald-500/30 via-amber-500/20 to-red-500/20 border border-emerald-500/40 shadow-inner">
                                    <HisabeLogoMark size={52} />
                                </div>
                            </div>

                            {/* Ethiopian Personal Finance Badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2.5 border border-emerald-500/20">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Ethiopian Personal Finance</span>
                            </div>

                            {/* Title */}
                            <h2
                                id={titleId}
                                className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
                            >
                                Install HISABE 🇪🇹
                            </h2>

                            {/* Message */}
                            <div
                                id={descId}
                                className="text-sm text-muted-foreground mt-2 leading-relaxed space-y-1.5 px-1 sm:px-2"
                            >
                                <p className="font-semibold text-foreground/90">
                                    Take control of your money! 💰
                                </p>
                                <p>
                                    Track your expenses, manage your budget, and reach your savings goals with HISABE.
                                </p>
                                <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                    Install HISABE on your phone for quick and easy access anytime!
                                </p>
                            </div>

                            {/* Key Benefits */}
                            <div className="w-full my-4 grid grid-cols-1 gap-2 text-left bg-muted/40 rounded-2xl p-3 border border-border/60">
                                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                    <span>One-tap access directly from your Home Screen</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                    <span>Fast offline loading & full screen native app feel</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                    <span>Track ETB & USD balances anytime, anywhere</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="w-full space-y-2 mt-1">
                                <Button
                                    type="button"
                                    onClick={handleInstallClick}
                                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition-all text-sm gap-2"
                                >
                                    📲 Install Now
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleDismiss}
                                    className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground font-medium text-sm border-border hover:bg-muted"
                                >
                                    Maybe Later
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Instructions View (When native prompt is unavailable) */
                        <div className="flex flex-col text-left mt-1">
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInstructions(false)}
                                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
                                    aria-label="Go back"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                                        How to install HISABE
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Add HISABE to your device in 3 quick steps
                                    </p>
                                </div>
                            </div>

                            {/* Tabs for platform instructions */}
                            <div className="flex rounded-xl bg-muted p-1 mb-3.5 border border-border/50 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('android')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'android'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Smartphone className="h-3.5 w-3.5" />
                                    Android
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('ios')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'ios'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Smartphone className="h-3.5 w-3.5" />
                                    iPhone/iPad
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('desktop')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                        activeTab === 'desktop'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                    Desktop
                                </button>
                            </div>

                            {/* Platform Instructions Content */}
                            {activeTab === 'android' && (
                                <div className="space-y-3 bg-muted/40 rounded-2xl p-3.5 border border-border/60 text-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Open browser menu
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                Tap the <MoreVertical className="inline h-3.5 w-3.5 text-foreground align-text-bottom mx-0.5" /> three-dots menu in the top-right corner of Chrome.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Select Install or Add
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                Choose <strong className="text-foreground">&quot;Install app&quot;</strong> or <strong className="text-foreground">&quot;Add to Home screen&quot;</strong> from the menu options.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            3
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Confirm installation
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                Tap <strong className="text-foreground">&quot;Install&quot;</strong> to place HISABE on your home screen.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ios' && (
                                <div className="space-y-3 bg-muted/40 rounded-2xl p-3.5 border border-border/60 text-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Tap the Share button
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                In Safari, tap the <Share className="inline h-3.5 w-3.5 text-blue-500 align-text-bottom mx-0.5" /> Share button in the navigation bar.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Select &quot;Add to Home Screen&quot;
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                Scroll down the share sheet and tap <PlusSquare className="inline h-3.5 w-3.5 text-emerald-500 align-text-bottom mx-0.5" /> <strong className="text-foreground">&quot;Add to Home Screen&quot;</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            3
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Tap &quot;Add&quot; to finish
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                Tap <strong className="text-foreground">&quot;Add&quot;</strong> in the top-right corner to place HISABE on your home screen.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'desktop' && (
                                <div className="space-y-3 bg-muted/40 rounded-2xl p-3.5 border border-border/60 text-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Look for the Install icon
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                In Chrome, Edge, or Brave, click the <Download className="inline h-3.5 w-3.5 text-emerald-500 align-text-bottom mx-0.5" /> Install icon in your browser&apos;s address (URL) bar.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Or open browser menu
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                Click the menu (three dots or lines) and choose <strong className="text-foreground">&quot;Install HISABE&quot;</strong> or <strong className="text-foreground">&quot;Save and Share &gt; Install app&quot;</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-0.5">
                                            3
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-xs sm:text-sm">
                                                Confirm installation
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                Click <strong className="text-foreground">&quot;Install&quot;</strong> to add HISABE directly to your desktop or taskbar.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Instructions Action Buttons */}
                            <div className="w-full mt-4 space-y-2">
                                <Button
                                    type="button"
                                    onClick={handleDismiss}
                                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm"
                                >
                                    Got it
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowInstructions(false)}
                                    className="w-full h-9 rounded-xl text-muted-foreground hover:text-foreground text-xs"
                                >
                                    Back to install overview
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}