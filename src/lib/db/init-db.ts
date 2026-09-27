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

        isInitialized = true
    } catch (error) {
        console.error('Failed to initialize database tables:', error)
    }
}
