"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
    Bell,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    Info,
    X,
    Wallet,
    PieChart,
    Scale,
    Sparkles,
    CheckCheck
} from "lucide-react"
import { getNotifications, AppNotification } from "@/actions/notification-actions"
import { cn } from "@/lib/utils"

export function NotificationPopover() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        if (typeof window === "undefined") return new Set()
        try {
            const storedRead = localStorage.getItem("hisabe_notifications_read")
            return storedRead ? new Set(JSON.parse(storedRead)) : new Set()
        } catch {
            return new Set()
        }
    })
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
        if (typeof window === "undefined") return new Set()
        try {
            const storedDismissed = localStorage.getItem("hisabe_notifications_dismissed")
            return storedDismissed ? new Set(JSON.parse(storedDismissed)) : new Set()
        } catch {
            return new Set()
        }
    })
    const [filter, setFilter] = useState<'all' | 'budget' | 'debt' | 'account'>('all')
    const [loading, setLoading] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    // Fetch dynamic notifications from server action
    const fetchNotificationsData = useCallback(() => {
        let isMounted = true
        getNotifications()
            .then((data) => {
                if (isMounted) {
                    setNotifications(data)
                    setLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error("Failed to load notifications:", err)
                    setLoading(false)
                }
            })
        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        const cleanup = fetchNotificationsData()
        return cleanup
    }, [fetchNotificationsData])

    // Close popover when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id))
    const filteredNotifications = visibleNotifications.filter(n => {
        if (filter === 'all') return true
        return n.category === filter
    })

    const unreadCount = visibleNotifications.filter(n => !readIds.has(n.id) && n.category !== 'system').length

    const markAsRead = (id: string) => {
        const next = new Set(readIds)
        next.add(id)
        setReadIds(next)
        localStorage.setItem("hisabe_notifications_read", JSON.stringify(Array.from(next)))
    }

    const markAllAsRead = () => {
        const next = new Set(readIds)
        visibleNotifications.forEach(n => next.add(n.id))
        setReadIds(next)
        localStorage.setItem("hisabe_notifications_read", JSON.stringify(Array.from(next)))
    }

    const dismissNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const next = new Set(dismissedIds)
        next.add(id)
        setDismissedIds(next)
        localStorage.setItem("hisabe_notifications_dismissed", JSON.stringify(Array.from(next)))
    }

    const getCategoryIcon = (category: AppNotification['category'], type: AppNotification['type']) => {
        if (type === 'danger') return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        if (type === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />

        switch (category) {
            case 'budget':
                return <PieChart className="h-4 w-4 text-sky-500 shrink-0" />
            case 'debt':
                return <Scale className="h-4 w-4 text-purple-500 shrink-0" />
            case 'account':
                return <Wallet className="h-4 w-4 text-amber-500 shrink-0" />
            default:
                return <Info className="h-4 w-4 text-blue-500 shrink-0" />
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            {/* Bell Trigger Button */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen)
                    if (!isOpen) fetchNotificationsData()
                }}
                className={cn(
                    "relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                    isOpen && "bg-accent text-foreground"
                )}
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border/80 bg-background/95 p-0 text-foreground shadow-2xl backdrop-blur-md z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            {unreadCount > 0 ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                    {unreadCount} new
                                </span>
                            ) : (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" /> All caught up
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 border-b px-3 py-1.5 bg-muted/10 text-xs">
                        {(['all', 'budget', 'debt', 'account'] as const).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setFilter(tab)}
                                className={cn(
                                    "rounded-md px-2.5 py-1 capitalize font-medium transition-all",
                                    filter === tab
                                        ? "bg-background text-foreground shadow-xs font-semibold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                {tab === 'all' ? 'All' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Notification Items List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                        {loading ? (
                            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                                Checking financial status...
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/80 mb-2" />
                                <p className="text-sm font-medium text-foreground">No notifications</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    No alerts for this category right now.
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map(notification => {
                                const isRead = readIds.has(notification.id)
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={cn(
                                            "group relative flex items-start gap-3 p-3.5 transition-colors hover:bg-accent/40",
                                            !isRead && "bg-primary/5 dark:bg-primary/10"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className="mt-0.5">
                                            {getCategoryIcon(notification.category, notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pr-4">
                                            <Link
                                                href={notification.link}
                                                onClick={() => setIsOpen(false)}
                                                className="block"
                                            >
                                                <p className={cn(
                                                    "text-xs leading-tight font-medium text-foreground hover:underline",
                                                    !isRead && "font-semibold"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                                    {notification.description}
                                                </p>
                                            </Link>
                                        </div>

                                        {/* Actions / Dismiss */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {!isRead && (
                                                <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => dismissNotification(notification.id, e)}
                                                className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                                                title="Dismiss"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t p-2 bg-muted/20 text-center rounded-b-xl">
                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                        >
                            Notification Preferences
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
