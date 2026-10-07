import { sql } from '@/lib/db'

let isInitialized = false

export async function ensureTablesExist() {
    if (isInitialized) return

    try {
        await sql`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        value NUMERIC(14, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

        await sql`
      CREATE TABLE IF NOT EXISTS net_worth_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        total_net_worth NUMERIC(14, 2) NOT NULL DEFAULT 0,
        total_assets NUMERIC(14, 2) NOT NULL DEFAULT 0,
        liquid_assets NUMERIC(14, 2) NOT NULL DEFAULT 0,
        manual_assets NUMERIC(14, 2) NOT NULL DEFAULT 0,
        total_liabilities NUMERIC(14, 2) NOT NULL DEFAULT 0,
        snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date)
      );
    `

        await sql`
      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        from_account_id UUID NOT NULL,
        to_account_id UUID NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
        exchange_rate NUMERIC(10, 6) DEFAULT 1.0,
        transferred_amount NUMERIC(15, 2),
        fee NUMERIC(15, 2) DEFAULT 0.00,
        fee_account_id UUID,
        description TEXT,
        transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

        await sql`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        target_amount NUMERIC(14, 2) NOT NULL,
        current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        target_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

        await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        theme VARCHAR(30) DEFAULT 'light',
        font_size VARCHAR(20) DEFAULT 'medium',
        reduced_motion BOOLEAN DEFAULT FALSE,
        hide_balances BOOLEAN DEFAULT FALSE,
        privacy_mode BOOLEAN DEFAULT FALSE,
        auto_lock VARCHAR(20) DEFAULT 'never',
        passkey_enabled BOOLEAN DEFAULT FALSE,
        default_currency VARCHAR(10) DEFAULT 'ETB',
        default_account_id UUID,
        number_format VARCHAR(20) DEFAULT 'standard',
        financial_month_start INTEGER DEFAULT 1,
        calendar_type VARCHAR(20) DEFAULT 'gregorian',
        language VARCHAR(10) DEFAULT 'en',
        timezone VARCHAR(50) DEFAULT 'Africa/Addis_Ababa',
        tax_income_type VARCHAR(50) DEFAULT 'employee',
        tax_period VARCHAR(50) DEFAULT '2018 E.C. / 2025-2026',
        tax_reminders_enabled BOOLEAN DEFAULT TRUE,
        tax_estimated_income NUMERIC(14, 2) DEFAULT 0.00,
        tax_estimated_tax NUMERIC(14, 2) DEFAULT 0.00,
        tax_paid NUMERIC(14, 2) DEFAULT 0.00,
        notification_large_expense BOOLEAN DEFAULT TRUE,
        notification_income_received BOOLEAN DEFAULT TRUE,
        notification_transfer_completed BOOLEAN DEFAULT TRUE,
        notification_budget_warning BOOLEAN DEFAULT TRUE,
        notification_budget_exceeded BOOLEAN DEFAULT TRUE,
        notification_goal_milestone BOOLEAN DEFAULT TRUE,
        notification_goal_reminder BOOLEAN DEFAULT TRUE,
        notification_recurring_upcoming BOOLEAN DEFAULT TRUE,
        notification_debt_reminder BOOLEAN DEFAULT TRUE,
        notification_debt_overdue BOOLEAN DEFAULT TRUE,
        notification_new_login BOOLEAN DEFAULT TRUE,
        notification_security_changes BOOLEAN DEFAULT TRUE,
        content_width VARCHAR(20) DEFAULT 'standard',
        display_density VARCHAR(20) DEFAULT 'comfortable',
        sidebar_state VARCHAR(20) DEFAULT 'expanded',
        tables_density VARCHAR(20) DEFAULT 'comfortable',
        cards_density VARCHAR(20) DEFAULT 'comfortable',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

        await sql`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT '#3b82f6';
    `

        await sql`
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS allow_overdraft BOOLEAN NOT NULL DEFAULT FALSE;
    `

        isInitialized = true
    } catch (error) {
        console.error('Failed to initialize database tables:', error)
    }
}
