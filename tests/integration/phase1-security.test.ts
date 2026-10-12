/**
 * Phase 1 Security Integration Tests - Hisabe
 *
 * Exercises REAL production server actions against an ISOLATED test database:
 * 1. Debt ownership & cross-user rejection
 * 2. Recurring transaction account ownership
 * 3. Genuine atomic rollback across multi-statement transaction
 *
 * Runner:
 *   npx tsx --test tests/integration/phase1-security.test.ts
 */

import '../helpers/preload'
import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { setTestActiveUser } from '../helpers/preload'
import { assertDatabaseIsolation } from '../helpers/db-guard'

// Production modules dynamically imported inside before() after isolation checks
let sql: typeof import('@/lib/db').sql
let recordDebtRepayment: typeof import('@/actions/debt-actions').recordDebtRepayment
let createRecurringTransaction: typeof import('@/actions/recurring-actions').createRecurringTransaction

const USER_A = 'test_usr_a_iso'
const USER_B = 'test_usr_b_iso'

const ACC_A_ID = '00000000-0000-4000-a000-000000000001'
const ACC_B_ID = '00000000-0000-4000-b000-000000000002'
const CAT_A_ID = '00000000-0000-4000-c000-000000000001'
const DEBT_A_ID = '00000000-0000-4000-d000-000000000001'
const DEBT_B_ID = '00000000-0000-4000-d000-000000000002'

async function cleanupTestFixtures() {
    if (!sql) return
    try {
        await sql`DELETE FROM transactions WHERE user_id IN (${USER_A}, ${USER_B})`
        await sql`DELETE FROM debts WHERE user_id IN (${USER_A}, ${USER_B})`
        await sql`DELETE FROM recurring_transactions WHERE user_id IN (${USER_A}, ${USER_B})`
        await sql`DELETE FROM categories WHERE user_id IN (${USER_A}, ${USER_B})`
        await sql`DELETE FROM accounts WHERE user_id IN (${USER_A}, ${USER_B})`
        await sql`DELETE FROM profiles WHERE id IN (${USER_A}, ${USER_B})`
        await sql`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_test_atomic_rollback`
    } catch {
        // Ignored if cleanup runs when tables are not yet seeded
    }
}

async function seedTestFixtures() {
    await cleanupTestFixtures()

    // 1. Profiles
    await sql`
        INSERT INTO profiles (id, email, full_name, default_currency)
        VALUES
            (${USER_A}, 'userA@test.local', 'User A', 'ETB'),
            (${USER_B}, 'userB@test.local', 'User B', 'ETB')
        ON CONFLICT (id) DO NOTHING
    `

    // 2. Accounts
    await sql`
        INSERT INTO accounts (id, user_id, name, type, currency, balance, allow_overdraft)
        VALUES
            (${ACC_A_ID}, ${USER_A}, 'Account A', 'bank', 'ETB', 1000.00, false),
            (${ACC_B_ID}, ${USER_B}, 'Account B', 'bank', 'ETB', 1000.00, false)
        ON CONFLICT (id) DO NOTHING
    `

    // 3. Categories
    await sql`
        INSERT INTO categories (id, user_id, name, type, icon, color, is_system)
        VALUES
            (${CAT_A_ID}, ${USER_A}, 'Test Category', 'expense', 'wallet', '#3b82f6', false)
        ON CONFLICT (id) DO NOTHING
    `

    // 4. Debts
    await sql`
        INSERT INTO debts (id, user_id, person_name, type, amount, paid_amount, status)
        VALUES
            (${DEBT_A_ID}, ${USER_A}, 'Lender A', 'owed_by_me', 500.00, 0.00, 'pending'),
            (${DEBT_B_ID}, ${USER_B}, 'Lender B', 'owed_by_me', 500.00, 0.00, 'pending')
        ON CONFLICT (id) DO NOTHING
    `
}

describe('Phase 1 Security Integration Tests', () => {
    before(async () => {
        // 1. Enforce strict database isolation guard before ANY operation
        await assertDatabaseIsolation()

        // 2. Dynamically import database and production actions AFTER isolation guard succeeds
        const dbMod = await import('@/lib/db')
        sql = dbMod.sql

        const debtMod = await import('@/actions/debt-actions')
        recordDebtRepayment = debtMod.recordDebtRepayment

        const recMod = await import('@/actions/recurring-actions')
        createRecurringTransaction = recMod.createRecurringTransaction

        // 3. Seed isolated test fixtures
        await seedTestFixtures()
    })

    after(async () => {
        setTestActiveUser(null)
        await cleanupTestFixtures()
    })

    beforeEach(async () => {
        await seedTestFixtures()
    })

    afterEach(async () => {
        setTestActiveUser(null)
        if (sql) {
            try {
                await sql`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_test_atomic_rollback`
            } catch {
                // Ignore cleanup errors
            }
        }
    })

    it('1. Debt Ownership: User A cannot repay User B debt or use User B account', async () => {
        setTestActiveUser({ userId: USER_A })

        // Attempt 1: User A attempts to repay User B's debt
        await assert.rejects(
            async () => {
                await recordDebtRepayment({
                    debtId: DEBT_B_ID,
                    amount: 100,
                    accountId: ACC_A_ID,
                })
            },
            {
                message: 'Debt record not found',
            }
        )

        // Attempt 2: User A attempts to repay Debt A using User B's account
        await assert.rejects(
            async () => {
                await recordDebtRepayment({
                    debtId: DEBT_A_ID,
                    amount: 100,
                    accountId: ACC_B_ID,
                })
            },
            {
                message: 'Account not found or access denied.',
            }
        )

        // Verify financial data integrity: strictly unchanged
        const [accA] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_A_ID}`
        const [accB] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_B_ID}`
        const [debtA] = await sql`SELECT paid_amount, status FROM debts WHERE id = ${DEBT_A_ID}`
        const [debtB] = await sql`SELECT paid_amount, status FROM debts WHERE id = ${DEBT_B_ID}`
        const txns = await sql`SELECT count(*) as cnt FROM transactions WHERE user_id IN (${USER_A}, ${USER_B})`

        assert.equal(parseFloat(accA.balance), 1000.00, 'Account A balance must remain 1000.00')
        assert.equal(parseFloat(accB.balance), 1000.00, 'Account B balance must remain 1000.00')
        assert.equal(parseFloat(debtA.paid_amount), 0.00, 'Debt A paid amount must remain 0.00')
        assert.equal(debtA.status, 'pending', 'Debt A status must remain pending')
        assert.equal(parseFloat(debtB.paid_amount), 0.00, 'Debt B paid amount must remain 0.00')
        assert.equal(debtB.status, 'pending', 'Debt B status must remain pending')
        assert.equal(parseInt(txns[0].cnt), 0, 'No transactions must be created')
    })

    it('2. Recurring Account Ownership: User A cannot create recurring transaction for User B account', async () => {
        setTestActiveUser({ userId: USER_A })

        // Attempt: User A attempts to create recurring transaction referencing Account B
        await assert.rejects(
            async () => {
                await createRecurringTransaction({
                    accountId: ACC_B_ID,
                    categoryId: CAT_A_ID,
                    type: 'expense',
                    amount: 250,
                    frequency: 'monthly',
                    startDate: '2026-11-01',
                    description: 'Tampered Recurring',
                })
            },
            {
                message: 'Account not found or access denied.',
            }
        )

        // Verify no recurring record was inserted
        const recurringRows = await sql`
            SELECT id FROM recurring_transactions WHERE user_id IN (${USER_A}, ${USER_B})
        `
        assert.equal(recurringRows.length, 0, 'Zero recurring transactions must exist')
    })

    it('3. Atomic Rollback: Induced failure mid-transaction rolls back all writes', async () => {
        setTestActiveUser({ userId: USER_A })

        try {
            // Add a temporary test check constraint to force statement 3 (UPDATE accounts) to fail
            // Account balance starts at 1000.00. Repaying 200 would set balance to 800.00.
            // CHECK (balance >= 950.00) will cause Query 3 to violate the constraint.
            // Execute statements separately as Neon prepared statements do not allow multiple SQL commands in one query.
            await sql`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_test_atomic_rollback`
            await sql`ALTER TABLE accounts ADD CONSTRAINT chk_test_atomic_rollback CHECK (balance >= 950.00)`
            // Execute repayment:
            // Query 1: UPDATE debts SET paid_amount = 200 (succeeds)
            // Query 2: INSERT INTO transactions (succeeds)
            // Query 3: UPDATE accounts SET balance = balance - 200 -> balance becomes 800 -> VIOLATES CONSTRAINT
            await assert.rejects(
                async () => {
                    await recordDebtRepayment({
                        debtId: DEBT_A_ID,
                        amount: 200,
                        accountId: ACC_A_ID,
                    })
                }
            )

            // Assert that rollback occurred: Query 1 (debt) and Query 2 (transaction) were NOT committed
            const [debt] = await sql`SELECT paid_amount, status FROM debts WHERE id = ${DEBT_A_ID}`
            const [account] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_A_ID}`
            const txns = await sql`SELECT count(*) as cnt FROM transactions WHERE user_id = ${USER_A}`

            assert.equal(parseFloat(debt.paid_amount), 0.00, 'Debt paid_amount must be rolled back to 0.00')
            assert.equal(debt.status, 'pending', 'Debt status must remain pending')
            assert.equal(parseFloat(account.balance), 1000.00, 'Account balance must remain 1000.00')
            assert.equal(parseInt(txns[0].cnt), 0, 'Transaction insert must be rolled back (0 transactions)')
        } finally {
            // Safely drop the temporary test constraint
            await sql`
                ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_test_atomic_rollback
            `
        }
    })
})
