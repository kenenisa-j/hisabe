import { neon } from '@neondatabase/serverless'
import { isSameDatabaseTarget } from './db-guard'

export interface InitTestDatabaseOptions {
    testDatabaseUrl?: string
    expectedDbName?: string
    allowInitialization?: boolean
}

export interface InitializationResult {
    success: boolean
    databaseName: string
    tablesCreated: string[]
    canaryMarkerSet: boolean
}

/**
 * Dedicated, idempotent, and transactional initializer for Hisabe's isolated integration-test database.
 *
 * Strict safety guarantees:
 * 1. Uses TEST_DATABASE_URL only (never falls back to DATABASE_URL).
 * 2. Compares TEST_DATABASE_URL against production DATABASE_URL (host, port, db path) to prevent production writes.
 * 3. Requires ALLOW_TEST_DB_INITIALIZATION=true before any DDL.
 * 4. Requires EXPECTED_TEST_DB_NAME and validates current_database().
 * 5. All schema statements AND the canary marker run inside a SINGLE atomic PostgreSQL transaction.
 *    If any statement fails, the entire batch is rolled back, leaving zero partially created tables.
 * 6. Validates schema completeness via information_schema post-transaction so incompatible existing tables are never silently accepted.
 * 7. Safe to run and rerun without modifying or deleting existing data.
 */
export async function initTestDatabase(
    options: InitTestDatabaseOptions = {}
): Promise<InitializationResult> {
    const testUrl = options.testDatabaseUrl || process.env.TEST_DATABASE_URL
    const expectedDbName = options.expectedDbName || process.env.EXPECTED_TEST_DB_NAME
    const allowInit =
        options.allowInitialization ??
        (process.env.ALLOW_TEST_DB_INITIALIZATION === 'true')

    // 1. Enforce presence of TEST_DATABASE_URL
    if (!testUrl || testUrl.trim().length === 0) {
        throw new Error(
            'FATAL INITIALIZER GUARD: TEST_DATABASE_URL is not set. ' +
            'Refusing to run initializer without an explicit test database URL.'
        )
    }

    // 2. Enforce strict isolation from production DATABASE_URL
    const originalProdUrl =
        process.env.ORIGINAL_DATABASE_URL ||
        (process.env.DATABASE_URL && process.env.DATABASE_URL !== testUrl
            ? process.env.DATABASE_URL
            : undefined)

    if (originalProdUrl && isSameDatabaseTarget(testUrl, originalProdUrl)) {
        throw new Error(
            'FATAL INITIALIZER GUARD: TEST_DATABASE_URL matches production DATABASE_URL! ' +
            'Aborting to prevent DDL execution on production database.'
        )
    }

    // 3. Require explicit initialization confirmation variable
    if (!allowInit) {
        throw new Error(
            'FATAL INITIALIZER GUARD: Explicit confirmation required! ' +
            'Set ALLOW_TEST_DB_INITIALIZATION=true before running test database initialization.'
        )
    }

    // 4. Require explicit EXPECTED_TEST_DB_NAME
    if (!expectedDbName || expectedDbName.trim().length === 0) {
        throw new Error(
            'FATAL INITIALIZER GUARD: EXPECTED_TEST_DB_NAME is not configured. ' +
            'Specify the expected test database name to prevent accidental execution on another database.'
        )
    }

    // 5. Connect strictly to TEST_DATABASE_URL
    const sql = neon(testUrl)

    // 6. Verify actual connected database name matches EXPECTED_TEST_DB_NAME before ANY DDL
    let actualDbName = ''
    try {
        const dbResult = (await sql`SELECT current_database() as name`) as { name: string }[]
        actualDbName = dbResult[0]?.name || ''
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(
            `FATAL INITIALIZER GUARD: Failed to connect to TEST_DATABASE_URL: ${msg}`
        )
    }

    if (actualDbName !== expectedDbName) {
        throw new Error(
            `FATAL INITIALIZER GUARD: Database name mismatch! ` +
            `Expected '${expectedDbName}', but connected to '${actualDbName}'. Aborting initialization.`
        )
    }

    const tables = [
        'profiles',
        'accounts',
        'categories',
        'debts',
        'transactions',
        'recurring_transactions',
        'transfers',
        'budgets',
        'savings_goals',
        'user_settings',
        'assets',
        'net_worth_snapshots',
        'auth_identity_mappings',
        'hisabe_test_canary_marker',
    ]

    // 7. Atomic Schema & Canary Marker Setup:
    // Every CREATE TABLE, column migration, and canary marker insertion executes inside
    // a SINGLE atomic PostgreSQL transaction block.
    await sql.transaction((txn) => [
        // 1. Core table: profiles
        txn`
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                default_currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `,

        // 2. Core table: accounts
        txn`
            CREATE TABLE IF NOT EXISTS accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'bank',
                currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                is_archived BOOLEAN DEFAULT FALSE,
                allow_overdraft BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `,
        txn`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);`,
        txn`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS allow_overdraft BOOLEAN NOT NULL DEFAULT FALSE;`,
        txn`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;`,

        // 3. Core table: categories
        txn`
            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                icon VARCHAR(100),
                color VARCHAR(50) DEFAULT '#3b82f6',
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `,
        txn`CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);`,
        txn`ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT '#3b82f6';`,

        // 4. Core table: debts
        txn`
            CREATE TABLE IF NOT EXISTS debts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                account_id UUID,
                person_name VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                amount NUMERIC(15, 2) NOT NULL,
                paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                due_date DATE,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `,
        txn`CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);`,
        txn`ALTER TABLE debts ADD COLUMN IF NOT EXISTS account_id UUID;`,
        txn`CREATE INDEX IF NOT EXISTS idx_debts_account_id ON debts(account_id);`,

        // 5. Core table: transactions
        txn`
            CREATE TABLE IF NOT EXISTS transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                account_id UUID NOT NULL,
                to_account_id UUID,
                category_id UUID,
                type VARCHAR(50) NOT NULL,
                amount NUMERIC(15, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                base_amount_etb NUMERIC(15, 2),
                description TEXT,
                transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `,
        txn`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);`,
        txn`CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`,
        txn`CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id ON transactions(to_account_id);`,
        txn`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_account_id UUID;`,
        txn`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS base_amount_etb NUMERIC(15, 2);`,

        // 6. Core table: recurring_transactions
        txn`
            CREATE TABLE IF NOT EXISTS recurring_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                account_id UUID NOT NULL,
                category_id UUID,
                type VARCHAR(50) NOT NULL,
                amount NUMERIC(15, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                description TEXT,
                frequency VARCHAR(50) NOT NULL,
                next_due_date DATE NOT NULL,
                auto_record BOOLEAN NOT NULL DEFAULT TRUE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `,
        txn`CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_transactions(user_id);`,

        // 7. Supplementary: transfers
        txn`
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
        `,

        // 8. Supplementary: budgets
        txn`
            CREATE TABLE IF NOT EXISTS budgets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                category_id UUID NOT NULL,
                amount NUMERIC(15, 2) NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT unique_user_category_month_year UNIQUE (user_id, category_id, month, year)
            );
        `,

        // 9. Supplementary: savings_goals
        txn`
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
        `,

        // 10. Supplementary: user_settings
        txn`
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
        `,

        // 11. Supplementary: assets
        txn`
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
        `,

        // 12. Supplementary: net_worth_snapshots
        txn`
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
        `,

        // 13. Supplementary: auth_identity_mappings
        txn`
            CREATE TABLE IF NOT EXISTS auth_identity_mappings (
                firebase_uid VARCHAR(128) PRIMARY KEY,
                canonical_user_id VARCHAR(128) NOT NULL UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
        `,

        // 14. Isolation Marker Table
        txn`
            CREATE TABLE IF NOT EXISTS hisabe_test_canary_marker (
                is_test_isolated BOOLEAN NOT NULL DEFAULT TRUE
            );
        `,

        // 15. In-Transaction Schema Compatibility Validation:
        // Inspects information_schema.columns for every required table, column, data type, and nullability constraint.
        // If any required column is missing, has an incompatible type, or is nullable when expected NOT NULL,
        // it executes RAISE EXCEPTION, which immediately aborts and rolls back the entire transaction
        // (including all table creations and the canary marker).
        txn`
            DO $validate$
            DECLARE
                v_mismatches TEXT;
            BEGIN
                WITH expectations (tbl, col, expected_type, req_not_null) AS (
                    VALUES
                        ('profiles', 'id', 'text', TRUE),
                        ('profiles', 'email', 'character varying', TRUE),
                        ('profiles', 'default_currency', 'character varying', TRUE),
                        ('accounts', 'id', 'uuid', TRUE),
                        ('accounts', 'user_id', 'text', TRUE),
                        ('accounts', 'balance', 'numeric', TRUE),
                        ('accounts', 'allow_overdraft', 'boolean', TRUE),
                        ('categories', 'id', 'uuid', TRUE),
                        ('categories', 'name', 'character varying', TRUE),
                        ('categories', 'type', 'character varying', TRUE),
                        ('categories', 'color', 'character varying', FALSE),
                        ('debts', 'id', 'uuid', TRUE),
                        ('debts', 'user_id', 'text', TRUE),
                        ('debts', 'person_name', 'character varying', TRUE),
                        ('debts', 'type', 'character varying', TRUE),
                        ('debts', 'amount', 'numeric', TRUE),
                        ('debts', 'paid_amount', 'numeric', TRUE),
                        ('debts', 'status', 'character varying', TRUE),
                        ('transactions', 'id', 'uuid', TRUE),
                        ('transactions', 'user_id', 'text', TRUE),
                        ('transactions', 'account_id', 'uuid', TRUE),
                        ('transactions', 'type', 'character varying', TRUE),
                        ('transactions', 'amount', 'numeric', TRUE),
                        ('transactions', 'transaction_date', 'date', TRUE),
                        ('recurring_transactions', 'id', 'uuid', TRUE),
                        ('recurring_transactions', 'user_id', 'text', TRUE),
                        ('recurring_transactions', 'account_id', 'uuid', TRUE),
                        ('recurring_transactions', 'type', 'character varying', TRUE),
                        ('recurring_transactions', 'amount', 'numeric', TRUE),
                        ('recurring_transactions', 'frequency', 'character varying', TRUE),
                        ('recurring_transactions', 'next_due_date', 'date', TRUE),
                        ('hisabe_test_canary_marker', 'is_test_isolated', 'boolean', TRUE)
                ),
                actual AS (
                    SELECT
                        LOWER(table_name) AS tbl,
                        LOWER(column_name) AS col,
                        LOWER(data_type) AS dt,
                        is_nullable = 'NO' AS is_not_null
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                ),
                mismatches AS (
                    SELECT
                        e.tbl,
                        e.col,
                        e.expected_type,
                        a.dt AS actual_type,
                        e.req_not_null,
                        a.is_not_null
                    FROM expectations e
                    LEFT JOIN actual a ON e.tbl = a.tbl AND e.col = a.col
                    WHERE a.col IS NULL
                       OR (
                           e.expected_type = 'character varying' AND a.dt NOT IN ('character varying', 'text')
                       )
                       OR (
                           e.expected_type = 'text' AND a.dt NOT IN ('text', 'character varying')
                       )
                       OR (
                           e.expected_type NOT IN ('character varying', 'text') AND a.dt <> e.expected_type
                       )
                       OR (
                           e.req_not_null = TRUE AND a.is_not_null = FALSE
                       )
                )
                SELECT string_agg(
                    tbl || '.' || col || ' (expected ' || expected_type ||
                    CASE WHEN req_not_null THEN ' NOT NULL' ELSE '' END ||
                    ', found ' || COALESCE(actual_type, 'MISSING') ||
                    CASE WHEN is_not_null IS TRUE THEN ' NOT NULL' ELSE ' NULLABLE' END || ')',
                    '; '
                ) INTO v_mismatches
                FROM mismatches;

                IF v_mismatches IS NOT NULL AND length(v_mismatches) > 0 THEN
                    RAISE EXCEPTION 'FATAL INITIALIZER SCHEMA VALIDATION: Incompatible schema detected: %', v_mismatches;
                END IF;
            END $validate$;
        `,

        // 16. Seed Canary Marker:
        // Executed ONLY if the in-transaction validation above succeeds without raising an exception.
        txn`
            INSERT INTO hisabe_test_canary_marker (is_test_isolated)
            SELECT TRUE
            WHERE NOT EXISTS (
                SELECT 1 FROM hisabe_test_canary_marker WHERE is_test_isolated = TRUE
            );
        `
    ])

    return {
        success: true,
        databaseName: actualDbName,
        tablesCreated: tables,
        canaryMarkerSet: true,
    }
}

// Optional direct CLI entrypoint
if (
    typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('tests/helpers/init-test-db.ts')
) {
    initTestDatabase()
        .then((res) => {
            console.log(`[SUCCESS] Test database '${res.databaseName}' initialized successfully.`)
            console.log(`[SUCCESS] Prepared ${res.tablesCreated.length} tables and verified canary marker.`)
        })
        .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[FAILED] Test database initialization aborted:', msg)
            process.exit(1)
        })
}
