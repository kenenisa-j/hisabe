'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { ensureTablesExist } from '@/lib/db/init-db'
import { UserSettings } from '@/types/settings'

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
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

export async function getUserSettings(): Promise<UserSettings> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await ensureTablesExist()

    try {
        const rows = await sql`
            SELECT * FROM user_settings WHERE user_id = ${userId}
        `

        if (rows.length === 0) {
            await sql`
                INSERT INTO user_settings (user_id)
                VALUES (${userId})
                ON CONFLICT (user_id) DO NOTHING
            `
            return {
                user_id: userId,
                ...DEFAULT_SETTINGS,
            }
        }

        const r = rows[0]
        return {
            user_id: userId,
            theme: r.theme || 'light',
            font_size: r.font_size || 'medium',
            reduced_motion: r.reduced_motion ?? false,
            hide_balances: r.hide_balances ?? false,
            privacy_mode: r.privacy_mode ?? false,
            auto_lock: r.auto_lock || 'never',
            passkey_enabled: r.passkey_enabled ?? false,
            default_currency: r.default_currency || 'ETB',
            default_account_id: r.default_account_id || null,
            number_format: r.number_format || 'standard',
            financial_month_start: parseInt(r.financial_month_start || '1', 10),
            calendar_type: r.calendar_type || 'gregorian',
            language: r.language || 'en',
            timezone: r.timezone || 'Africa/Addis_Ababa',
            tax_income_type: r.tax_income_type || 'employee',
            tax_period: r.tax_period || '2018 E.C. / 2025-2026',
            tax_reminders_enabled: r.tax_reminders_enabled ?? true,
            tax_estimated_income: parseFloat(r.tax_estimated_income || '0'),
            tax_estimated_tax: parseFloat(r.tax_estimated_tax || '0'),
            tax_paid: parseFloat(r.tax_paid || '0'),
            notification_large_expense: r.notification_large_expense ?? true,
            notification_income_received: r.notification_income_received ?? true,
            notification_transfer_completed: r.notification_transfer_completed ?? true,
            notification_budget_warning: r.notification_budget_warning ?? true,
            notification_budget_exceeded: r.notification_budget_exceeded ?? true,
            notification_goal_milestone: r.notification_goal_milestone ?? true,
            notification_goal_reminder: r.notification_goal_reminder ?? true,
            notification_recurring_upcoming: r.notification_recurring_upcoming ?? true,
            notification_debt_reminder: r.notification_debt_reminder ?? true,
            notification_debt_overdue: r.notification_debt_overdue ?? true,
            notification_new_login: r.notification_new_login ?? true,
            notification_security_changes: r.notification_security_changes ?? true,
            content_width: r.content_width || 'standard',
            display_density: r.display_density || 'comfortable',
            sidebar_state: r.sidebar_state || 'expanded',
            tables_density: r.tables_density || 'comfortable',
            cards_density: r.cards_density || 'comfortable',
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    } catch (error) {
        console.error('Error fetching user settings:', error)
        return {
            user_id: userId,
            ...DEFAULT_SETTINGS,
        }
    }
}

export async function updateUserSettings(s: Partial<UserSettings>): Promise<{ success: boolean }> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await ensureTablesExist()

    try {
        await sql`
            INSERT INTO user_settings (user_id)
            VALUES (${userId})
            ON CONFLICT (user_id) DO NOTHING
        `

        await sql`
            UPDATE user_settings
            SET
                theme = COALESCE(${s.theme ?? null}, theme),
                font_size = COALESCE(${s.font_size ?? null}, font_size),
                reduced_motion = COALESCE(${s.reduced_motion ?? null}, reduced_motion),
                hide_balances = COALESCE(${s.hide_balances ?? null}, hide_balances),
                privacy_mode = COALESCE(${s.privacy_mode ?? null}, privacy_mode),
                auto_lock = COALESCE(${s.auto_lock ?? null}, auto_lock),
                passkey_enabled = COALESCE(${s.passkey_enabled ?? null}, passkey_enabled),
                default_currency = COALESCE(${s.default_currency ?? null}, default_currency),
                default_account_id = ${s.default_account_id !== undefined ? s.default_account_id : null},
                number_format = COALESCE(${s.number_format ?? null}, number_format),
                financial_month_start = COALESCE(${s.financial_month_start ?? null}, financial_month_start),
                calendar_type = COALESCE(${s.calendar_type ?? null}, calendar_type),
                language = COALESCE(${s.language ?? null}, language),
                timezone = COALESCE(${s.timezone ?? null}, timezone),
                tax_income_type = COALESCE(${s.tax_income_type ?? null}, tax_income_type),
                tax_period = COALESCE(${s.tax_period ?? null}, tax_period),
                tax_reminders_enabled = COALESCE(${s.tax_reminders_enabled ?? null}, tax_reminders_enabled),
                tax_estimated_income = COALESCE(${s.tax_estimated_income ?? null}, tax_estimated_income),
                tax_estimated_tax = COALESCE(${s.tax_estimated_tax ?? null}, tax_estimated_tax),
                tax_paid = COALESCE(${s.tax_paid ?? null}, tax_paid),
                notification_large_expense = COALESCE(${s.notification_large_expense ?? null}, notification_large_expense),
                notification_income_received = COALESCE(${s.notification_income_received ?? null}, notification_income_received),
                notification_transfer_completed = COALESCE(${s.notification_transfer_completed ?? null}, notification_transfer_completed),
                notification_budget_warning = COALESCE(${s.notification_budget_warning ?? null}, notification_budget_warning),
                notification_budget_exceeded = COALESCE(${s.notification_budget_exceeded ?? null}, notification_budget_exceeded),
                notification_goal_milestone = COALESCE(${s.notification_goal_milestone ?? null}, notification_goal_milestone),
                notification_goal_reminder = COALESCE(${s.notification_goal_reminder ?? null}, notification_goal_reminder),
                notification_recurring_upcoming = COALESCE(${s.notification_recurring_upcoming ?? null}, notification_recurring_upcoming),
                notification_debt_reminder = COALESCE(${s.notification_debt_reminder ?? null}, notification_debt_reminder),
                notification_debt_overdue = COALESCE(${s.notification_debt_overdue ?? null}, notification_debt_overdue),
                notification_new_login = COALESCE(${s.notification_new_login ?? null}, notification_new_login),
                notification_security_changes = COALESCE(${s.notification_security_changes ?? null}, notification_security_changes),
                content_width = COALESCE(${s.content_width ?? null}, content_width),
                display_density = COALESCE(${s.display_density ?? null}, display_density),
                sidebar_state = COALESCE(${s.sidebar_state ?? null}, sidebar_state),
                tables_density = COALESCE(${s.tables_density ?? null}, tables_density),
                cards_density = COALESCE(${s.cards_density ?? null}, cards_density),
                updated_at = NOW()
            WHERE user_id = ${userId}
        `

        revalidatePath('/settings')
        revalidatePath('/dashboard')
        revalidatePath('/accounts')
        revalidatePath('/transactions')
        return { success: true }
    } catch (error) {
        console.error('Error updating user settings:', error)
        return { success: false }
    }
}

export async function deleteUserAccountData(): Promise<{ success: boolean; message?: string }> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    try {
        await sql`DELETE FROM transactions WHERE user_id = ${userId}`
        await sql`DELETE FROM transfers WHERE user_id = ${userId}`
        await sql`DELETE FROM budgets WHERE user_id = ${userId}`
        await sql`DELETE FROM savings_goals WHERE user_id = ${userId}`
        await sql`DELETE FROM debts WHERE user_id = ${userId}`
        await sql`DELETE FROM recurring_transactions WHERE user_id = ${userId}`
        await sql`DELETE FROM assets WHERE user_id = ${userId}`
        await sql`DELETE FROM net_worth_snapshots WHERE user_id = ${userId}`
        await sql`DELETE FROM categories WHERE user_id = ${userId}`
        await sql`DELETE FROM accounts WHERE user_id = ${userId}`
        await sql`DELETE FROM user_settings WHERE user_id = ${userId}`
        await sql`DELETE FROM profiles WHERE id = ${userId}`

        revalidatePath('/')
        return { success: true, message: 'All personal financial data deleted successfully.' }
    } catch (error: any) {
        console.error('Failed to delete user account data:', error)
        return { success: false, message: error?.message || 'Failed to delete account data.' }
    }
}
