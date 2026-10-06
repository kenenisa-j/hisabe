'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { UserSettings } from '@/types/settings'
import { getUserSettings, updateUserSettings } from '@/actions/settings-actions'
import { formatDateWithCalendar } from '@/lib/ethiopian-calendar'

interface UserSettingsContextType {
    settings: UserSettings
    loading: boolean
    updateSettings: (partialSettings: Partial<UserSettings>) => Promise<boolean>
    maskAmount: (amount: number, currency?: string) => string
    formatDateDisplay: (date: Date | string) => { main: string; sub?: string }
}

const DEFAULT_SETTINGS: UserSettings = {
    user_id: '',
    theme: 'light',
    font_size: 'medium',
    reduced_motion: false,
    hide_balances: false,
    privacy_mode: false,
    auto_lock: 'never',
    passkey_enabled: false,
    default_currency: 'ETB',
    default_account_id: null,
    number_format: 'standard',
    financial_month_start: 1,
    calendar_type: 'gregorian',
    language: 'en',
    timezone: 'Africa/Addis_Ababa',
    tax_income_type: 'employee',
    tax_period: '2018 E.C. / 2025-2026',
    tax_reminders_enabled: true,
    tax_estimated_income: 0,
    tax_estimated_tax: 0,
    tax_paid: 0,
    notification_large_expense: true,
    notification_income_received: true,
    notification_transfer_completed: true,
    notification_budget_warning: true,
    notification_budget_exceeded: true,
    notification_goal_milestone: true,
    notification_goal_reminder: true,
    notification_recurring_upcoming: true,
    notification_debt_reminder: true,
    notification_debt_overdue: true,
    notification_new_login: true,
    notification_security_changes: true,
    content_width: 'standard',
    display_density: 'comfortable',
    sidebar_state: 'expanded',
    tables_density: 'comfortable',
    cards_density: 'comfortable',
}

const UserSettingsContext = createContext<UserSettingsContextType>({
    settings: DEFAULT_SETTINGS,
    loading: true,
    updateSettings: async () => false,
    maskAmount: (val) => `${val} Br`,
    formatDateDisplay: (d) => ({ main: String(d) }),
})

export function UserSettingsProvider({
    children,
    initialSettings,
}: {
    children: React.ReactNode
    initialSettings?: UserSettings
}) {
    const [settings, setSettings] = useState<UserSettings>(initialSettings || DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(!initialSettings)

    useEffect(() => {
        if (!initialSettings) {
            getUserSettings()
                .then((res) => setSettings(res))
                .catch(console.error)
                .finally(() => setLoading(false))
        }
    }, [initialSettings])

    // Apply CSS theme classes to <html> whenever settings change
    useEffect(() => {
        if (typeof document === 'undefined') return

        const root = document.documentElement

        // Font size
        root.classList.remove('font-small', 'font-medium', 'font-large')
        root.classList.add(`font-${settings.font_size}`)

        // Reduced motion
        if (settings.reduced_motion) {
            root.classList.add('motion-reduce')
        } else {
            root.classList.remove('motion-reduce')
        }

        // Theme — remove all theme classes first, then apply chosen one
        root.classList.remove(
            'theme-light',
            'theme-light-emerald',
            'theme-light-blue',
            'theme-light-amber',
            'theme-light-purple',
            'theme-hisabe-classic',
            'theme-dark',
            'theme-emerald',
            'theme-violet',
            'dark'
        )

        if (settings.theme === 'dark') {
            root.classList.add('dark', 'theme-dark')
        } else if (settings.theme === 'hisabe-classic') {
            root.classList.add('dark', 'theme-hisabe-classic')
        } else if (settings.theme === 'emerald') {
            root.classList.add('dark', 'theme-emerald')
        } else if (settings.theme === 'violet') {
            root.classList.add('dark', 'theme-violet')
        } else if (settings.theme === 'light-emerald') {
            root.classList.add('theme-light-emerald')
        } else if (settings.theme === 'light-blue') {
            root.classList.add('theme-light-blue')
        } else if (settings.theme === 'light-amber') {
            root.classList.add('theme-light-amber')
        } else if (settings.theme === 'light-purple') {
            root.classList.add('theme-light-purple')
        } else if (settings.theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (prefersDark) {
                root.classList.add('dark', 'theme-dark')
            } else {
                root.classList.add('theme-light')
            }
        } else {
            // Default: light mode
            root.classList.add('theme-light')
        }
    }, [settings.font_size, settings.reduced_motion, settings.theme])

    const handleUpdateSettings = async (partial: Partial<UserSettings>): Promise<boolean> => {
        const updated = { ...settings, ...partial }
        setSettings(updated)
        const res = await updateUserSettings(partial)
        return res.success
    }

    const maskAmount = (amount: number, currency: string = 'ETB'): string => {
        const symbol = currency === 'USD' ? '$' : 'Br'

        if (settings.hide_balances || settings.privacy_mode) {
            return `•••••• ${symbol}`
        }

        let numStr = ''
        if (settings.number_format === 'european') {
            numStr = new Intl.NumberFormat('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount)
        } else if (settings.number_format === 'space') {
            numStr = new Intl.NumberFormat('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount)
        } else {
            numStr = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount)
        }

        return currency === 'USD' ? `$${numStr}` : `${numStr} ${symbol}`
    }

    const formatDateDisplay = (dateInput: Date | string) => {
        return formatDateWithCalendar(dateInput, settings.calendar_type)
    }

    return (
        <UserSettingsContext.Provider
            value={{
                settings,
                loading,
                updateSettings: handleUpdateSettings,
                maskAmount,
                formatDateDisplay,
            }}
        >
            {children}
        </UserSettingsContext.Provider>
    )
}

export function useUserSettings() {
    return useContext(UserSettingsContext)
}
