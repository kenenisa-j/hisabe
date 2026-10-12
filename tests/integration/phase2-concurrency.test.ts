import '../helpers/preload'
import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { setTestActiveUser } from '../helpers/preload'
import { assertDatabaseIsolation } from '../helpers/db-guard'

let sql: typeof import('@/lib/db').sql
let createTransaction: typeof import('@/actions/transaction-actions').createTransaction
let createTransfer: typeof import('@/actions/transfer-actions').createTransfer
let bulkImportTransactions: typeof import('@/actions/import-actions').bulkImportTransactions

const USER_C    = 'test_usr_c_conc'
const ACC_C1_ID = '00000000-0000-4000-c000-000000000011'
const ACC_C2_ID = '00000000-0000-4000-c000-000000000012'
const ACC_OD_ID = '00000000-0000-4000-c000-000000000013'
const CAT_C_ID  = '00000000-0000-4000-c000-000000000099'

async function cleanupConcurrencyFixtures() {
    if (!sql) return
    try {
        await sql`DELETE FROM transactions WHERE user_id = ${USER_C}`
        await sql`DELETE FROM transfers     WHERE user_id = ${USER_C}`
        await sql`DELETE FROM accounts      WHERE user_id = ${USER_C}`
        await sql`DELETE FROM categories    WHERE user_id = ${USER_C}`
        await sql`DELETE FROM profiles      WHERE id      = ${USER_C}`
    } catch { /* ignored if not yet seeded */ }
}

async function seedConcurrencyFixtures() {
    await cleanupConcurrencyFixtures()
    await sql`
        INSERT INTO profiles (id, email, full_name, default_currency)
        VALUES (${USER_C}, 'userC@test.local', 'User C Concurrency', 'ETB')
        ON CONFLICT (id) DO NOTHING
    `
    await sql`
        INSERT INTO categories (id, user_id, name, type, icon, color, is_system)
        VALUES (${CAT_C_ID}, ${USER_C}, 'Concurrency Test', 'expense', 'wallet', '#ff0000', false)
        ON CONFLICT (id) DO NOTHING
    `
    await sql`
        INSERT INTO accounts (id, user_id, name, type, currency, balance, allow_overdraft)
        VALUES
            (${ACC_C1_ID}, ${USER_C}, 'Main Acct',      'bank', 'ETB', 500.00, false),
            (${ACC_C2_ID}, ${USER_C}, 'Transfer Dest',  'bank', 'ETB', 200.00, false),
            (${ACC_OD_ID}, ${USER_C}, 'Overdraft Acct', 'bank', 'ETB', 500.00, true)
        ON CONFLICT (id) DO NOTHING
    `
}

describe('Phase 2 Concurrency and Atomicity Integration Tests', () => {
    before(async () => {
        await assertDatabaseIsolation()
        sql = (await import('@/lib/db')).sql
        createTransaction   = (await import('@/actions/transaction-actions')).createTransaction
        createTransfer      = (await import('@/actions/transfer-actions')).createTransfer
        bulkImportTransactions = (await import('@/actions/import-actions')).bulkImportTransactions
        await seedConcurrencyFixtures()
    })

    after(async () => {
        setTestActiveUser(null)
        await cleanupConcurrencyFixtures()
    })

    beforeEach(async () => {
        await seedConcurrencyFixtures()
        setTestActiveUser({ userId: USER_C })
    })

    afterEach(() => {
        setTestActiveUser(null)
    })

    // ── Test 1 ───────────────────────────────────────────────────────────────
    it('1. Concurrent overdraft: two simultaneous 300-ETB withdrawals from 500-ETB account — exactly one succeeds', async () => {
        const input = {
            amount: 300,
            type: 'expense' as const,
            accountId: ACC_C1_ID,
            categoryId: CAT_C_ID,
            date: '2026-10-12',
            description: 'Concurrent withdrawal test',
        }

        // Fire both in parallel to race at the DB level
        const [r1, r2] = await Promise.all([
            createTransaction(input),
            createTransaction(input),
        ])

        const successes = [r1, r2].filter(r => r.success).length
        const failures  = [r1, r2].filter(r => !r.success).length
        assert.equal(successes, 1, 'Exactly one concurrent withdrawal must succeed')
        assert.equal(failures,  1, 'Exactly one concurrent withdrawal must fail')

        const [acc] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_C1_ID}`
        assert.equal(parseFloat(acc.balance), 200.00,
            `Balance must be exactly 200.00 (500 - 300), got ${acc.balance}`)

        const txns = await sql`SELECT count(*) as cnt FROM transactions WHERE account_id = ${ACC_C1_ID}`
        assert.equal(parseInt(txns[0].cnt), 1, 'Exactly one transaction row must be committed')
    })

    // ── Test 2 ───────────────────────────────────────────────────────────────
    it('2. CTE guard rolls back entire batch: an expense exceeding balance must not leave a phantom transaction row', async () => {
        // Account has 500.00, attempting to spend 600.00.
        // The CTE guard raises division-by-zero, aborting the batch INCLUDING
        // the INSERT that comes before the UPDATE in the batch array.
        const result = await createTransaction({
            amount: 600,
            type: 'expense',
            accountId: ACC_C1_ID,
            categoryId: CAT_C_ID,
            date: '2026-10-12',
            description: 'Should be fully rolled back',
        })

        assert.equal(result.success, false, 'Overdraft attempt must return success: false')

        const [acc] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_C1_ID}`
        assert.equal(parseFloat(acc.balance), 500.00, 'Balance must remain 500.00')

        const txns = await sql`SELECT count(*) as cnt FROM transactions WHERE account_id = ${ACC_C1_ID}`
        assert.equal(parseInt(txns[0].cnt), 0,
            'Zero transaction rows must exist — the INSERT was rolled back with the batch')
    })

    // ── Test 3 ───────────────────────────────────────────────────────────────
    it('3. Overdraft-enabled account: expense exceeding balance succeeds and balance goes negative', async () => {
        const result = await createTransaction({
            amount: 800,
            type: 'expense',
            accountId: ACC_OD_ID,
            categoryId: CAT_C_ID,
            date: '2026-10-12',
            description: 'Overdraft account withdrawal',
        })
        assert.equal(result.success, true, 'Overdraft-enabled account must allow negative balance')

        const [acc] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_OD_ID}`
        assert.equal(parseFloat(acc.balance), -300.00,
            'Balance must be -300.00 (500 - 800) for overdraft account')

        const txns = await sql`SELECT count(*) as cnt FROM transactions WHERE account_id = ${ACC_OD_ID}`
        assert.equal(parseInt(txns[0].cnt), 1, 'One transaction row must be committed')
    })

    // ── Test 4 ───────────────────────────────────────────────────────────────
    it('4. Transfer: insufficient source funds abort entire batch — destination must NOT be credited', async () => {
        // Before the CTE fix, addToStmt (credit dest) could commit even when
        // deductFromStmt returned 0 rows, creating money out of thin air.
        // The CTE guard now raises a DB exception that aborts the entire batch.
        const result = await createTransfer({
            fromAccountId: ACC_C1_ID,
            toAccountId:   ACC_C2_ID,
            amount: 600,
            description: 'Should be fully rolled back',
        })
        assert.equal(result.success, false, 'Transfer with insufficient funds must return success: false')

        const [src]  = await sql`SELECT balance FROM accounts WHERE id = ${ACC_C1_ID}`
        const [dest] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_C2_ID}`
        assert.equal(parseFloat(src.balance),  500.00, 'Source must remain 500.00')
        assert.equal(parseFloat(dest.balance), 200.00,
            'Destination must remain 200.00 — no money must have been created')

        const transfers = await sql`SELECT count(*) as cnt FROM transfers WHERE user_id = ${USER_C}`
        assert.equal(parseInt(transfers[0].cnt), 0, 'No transfer record must exist')
    })

    // ── Test 5 ───────────────────────────────────────────────────────────────
    it('5. Transfer: valid amount commits atomically — both balances update correctly', async () => {
        const result = await createTransfer({
            fromAccountId: ACC_C1_ID,
            toAccountId:   ACC_C2_ID,
            amount: 200,
            description: 'Valid transfer',
        })
        assert.equal(result.success, true, 'Valid transfer must succeed')

        const [src]  = await sql`SELECT balance FROM accounts WHERE id = ${ACC_C1_ID}`
        const [dest] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_C2_ID}`
        assert.equal(parseFloat(src.balance),  300.00, 'Source must be 300 (500 - 200)')
        assert.equal(parseFloat(dest.balance), 400.00, 'Destination must be 400 (200 + 200)')

        const transfers = await sql`SELECT count(*) as cnt FROM transfers WHERE user_id = ${USER_C}`
        assert.equal(parseInt(transfers[0].cnt), 1, 'One transfer record must exist')
    })

    // ── Test 6 ───────────────────────────────────────────────────────────────
    it('6. Bulk import: a row with an invalid date aborts the entire batch — no rows committed', async () => {
        // Three rows sent as one sql.transaction([...]) batch.
        // Row 2 has an out-of-range date that PostgreSQL cannot cast to ::date,
        // which throws an exception and rolls back the whole batch.
        await assert.rejects(
            async () => {
                await bulkImportTransactions(ACC_C1_ID, [
                    { date: '2026-10-01', amount: 100, type: 'INCOME',  description: 'Row 1 valid' },
                    { date: '2026-13-01', amount: 50,  type: 'EXPENSE', description: 'Row 2 invalid month 13 — aborts batch' },
                    { date: '2026-10-03', amount: 200, type: 'INCOME',  description: 'Row 3 valid' },
                ])
            },
            'Bulk import with invalid row must throw'
        )

        const txns = await sql`SELECT count(*) as cnt FROM transactions WHERE account_id = ${ACC_C1_ID}`
        assert.equal(parseInt(txns[0].cnt), 0,
            'Zero transaction rows — all inserts must have been rolled back')

        const [acc] = await sql`SELECT balance FROM accounts WHERE id = ${ACC_C1_ID}`
        assert.equal(parseFloat(acc.balance), 500.00,
            'Balance must remain 500.00 — all balance updates must have been rolled back')
    })
})
