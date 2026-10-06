export interface UserSettings {
    user_id: string
    theme: 'light' | 'light-emerald' | 'light-blue' | 'light-amber' | 'light-purple' | 'hisabe-classic' | 'dark' | 'emerald' | 'violet' | 'system'
    font_size: 'small' | 'medium' | 'large'
    reduced_motion: boolean
    hide_balances: boolean
    privacy_mode: boolean
    auto_lock: 'never' | '5m' | '15m' | '30m' | '1h'
    passkey_enabled: boolean
    default_currency: string
    default_account_id: string | null
    number_format: 'standard' | 'european' | 'space'
    financial_month_start: number
    calendar_type: 'gregorian' | 'ethiopian' | 'both'
    language: 'en'
    timezone: string
    tax_income_type: string
    tax_period: string
    tax_reminders_enabled: boolean
    tax_estimated_income: number
    tax_estimated_tax: number
    tax_paid: number
    notification_large_expense: boolean
    notification_income_received: boolean
    notification_transfer_completed: boolean
    notification_budget_warning: boolean
    notification_budget_exceeded: boolean
    notification_goal_milestone: boolean
    notification_goal_reminder: boolean
    notification_recurring_upcoming: boolean
    notification_debt_reminder: boolean
    notification_debt_overdue: boolean
    notification_new_login: boolean
    notification_security_changes: boolean
    content_width: 'standard' | 'wide' | 'full'
    display_density: 'compact' | 'comfortable' | 'spacious'
    sidebar_state: 'expanded' | 'collapsed'
    tables_density: 'compact' | 'comfortable'
    cards_density: 'compact' | 'comfortable'
    created_at?: string
    updated_at?: string
}
