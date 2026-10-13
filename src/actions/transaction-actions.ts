'use server'

import { revalidatePath } from 'next/cache'
import { sql, sqlRaw } from '@/lib/db'
import {
    enforceAuth,
    verifyAccountOwnership,
    verifyCategoryAccess,
    verifyTransactionOwnership,
} from '@/lib/security-guards'
import { transactionFormSchema, TransactionFormValues } from '@/lib/validations/transaction'

/**
 * Create a new income or expense transaction.
 * Validates input, verifies account ownership, then atomically inserts the
 * transaction row and adjusts the account balance in a single Neon SQL call.
 */
export async function createTransaction(input: TransactionFormValues) {
    const userId = await enforceAuth()

    // 1. Schema Validation
    const validated = transactionFormSchema.safeParse(input)
    if (!validated.success) {
        return {
            success: false,
            error: validated.error.issues[0]?.message || 'Invalid transaction data',
        }
    }

    const { amount, type, accountId, categoryId, date, description } = validated.data

    // 2. Ownership Guard
    const isOwner = await verifyAccountOwnership(accountId, userId)
    if (!isOwner) {
        return { success: false, error: 'Account not found or access denied.' }
    }

    // 3. Category Guard
    if (categoryId) {
        const isCategoryValid = await verifyCategoryAccess(categoryId, userId)
        if (!isCategoryValid) {
            return { success: false, error: 'Invalid category selection.' }
        }
    }

    try {
        const balanceDelta = type === 'income' ? amount : -amount

        // 4. Atomically insert the transaction and update the account balance.
        // For expense transactions, the balance UPDATE uses a CTE guard:
        // if the account has insufficient funds, the CTE computes 1/0
        // (division by zero), causing a PostgreSQL exception that aborts the
        // ENTIRE batch before any row commits. Note: do NOT use FOR UPDATE inside
        // a CTE referenced by DML — it is not valid in PostgreSQL and causes the
        // CASE WHEN to not short-circuit properly. The UPDATE itself locks the row.
        // SERIALIZABLE isolation prevents the concurrent TOCTOU race window.
        await sql.transaction([
            sqlRaw`
              INSERT INTO transactions (
                user_id,
                account_id,
                category_id,
                amount,
                base_amount_etb,
                type,
                description,
                transaction_date,
                created_at
              ) VALUES (
                ${userId},
                ${accountId},
                ${categoryId || null},
                ${amount},
                ${amount},
                ${type},
                ${description?.trim() || null},
                ${new Date(date).toISOString().split('T')[0]}::date,
                NOW()
              )
            `,
            sqlRaw`
              WITH guard AS (
                SELECT 1 / (CASE WHEN allow_overdraft = false AND balance + ${balanceDelta} < 0 THEN 0 ELSE 1 END) as ok
                FROM accounts
                WHERE id = ${accountId} AND user_id = ${userId}
              )
              UPDATE accounts
              SET balance = balance + ${balanceDelta}, updated_at = NOW()
              FROM guard
              WHERE accounts.id = ${accountId} AND accounts.user_id = ${userId}
                AND guard.ok = 1
            `
        ], { isolationLevel: 'Serializable' })

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/transactions')
        revalidatePath('/accounts')

        return { success: true }
    } catch (error: any) {
        console.error('Unexpected transaction error:', error)
        if (error?.code === '22012') {
            return {
                success: false,
                error: 'This account does not have enough balance to cover this expense. Please add funds or choose a different account.',
            }
        }
        return { success: false, error: 'An unexpected error occurred. Please try again.' }
    }
}

/**
 * Fetch transactions for the current user (most recent first).
 */
export async function getTransactions(limit = 200) {
    const userId = await enforceAuth()

    const rows = await sql`
    SELECT
      t.id,
      t.user_id,
      t.account_id,
      t.category_id,
      t.type,
      t.amount,
      t.currency,
      t.base_amount_etb,
      t.description,
      t.transaction_date,
      t.created_at,
      a.name AS account_name,
      c.name AS category_name,
      c.icon AS category_icon
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${userId}
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT ${limit}
  `

    return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        account_id: r.account_id,
        category_id: r.category_id,
        type: r.type,
        amount: parseFloat(r.amount),
        currency: r.currency,
        base_amount_etb: parseFloat(r.base_amount_etb),
        description: r.description,
        transaction_date: r.transaction_date,
        created_at: r.created_at,
        account_name: r.account_name,
        category_name: r.category_name,
        category_icon: r.category_icon,
    }))
}

/**
 * Edit an existing transaction.
 * Reverses the original balance effect, then applies the new one atomically.
 */
export async function updateTransaction(
    transactionId: string,
    input: TransactionFormValues
) {
    const userId = await enforceAuth()

    // 1. Verify transaction ownership
    const isOwner = await verifyTransactionOwnership(transactionId, userId)
    if (!isOwner) {
        return { success: false, error: 'Transaction not found or access denied.' }
    }

    // 2. Schema Validation
    const validated = transactionFormSchema.safeParse(input)
    if (!validated.success) {
        return {
            success: false,
            error: validated.error.issues[0]?.message || 'Invalid transaction data',
        }
    }

    const { amount, type, accountId, categoryId, date, description } = validated.data

    try {
        // 3. Fetch original transaction to compute the balance reversal delta.
        // This read-only query is safe before the transaction because we only use
        // it to calculate deltas; the actual balance mutation is guarded atomically below.
        const [original] = await sql`
      SELECT account_id, amount, type
      FROM transactions
      WHERE id = ${transactionId} AND user_id = ${userId}
    `

        if (!original) {
            return { success: false, error: 'Transaction not found.' }
        }

        const originalDelta = original.type === 'income'
            ? -parseFloat(original.amount)
            : parseFloat(original.amount)
        const newDelta = type === 'income' ? amount : -amount

        // Net effect on the target account balance after this edit.
        // If the original and new account are the same, we first undo the old
        // delta and then apply the new one, so the combined net change is used.
        const isSameAccount = original.account_id === accountId

        // 4. Execute atomic update:
        //    a) Reverse the original account balance unconditionally.
        //    b) Update the transaction record.
        //    c) Apply the new balance delta, guarded by a CTE that raises a
        //       division-by-zero exception if the account would go negative,
        //       aborting the entire batch before anything commits.
        //       Note: do NOT use FOR UPDATE inside a CTE referenced by DML.
        await sql.transaction([
            sqlRaw`
              UPDATE accounts
              SET balance = balance + ${originalDelta}, updated_at = NOW()
              WHERE id = ${original.account_id} AND user_id = ${userId}
            `,
            sqlRaw`
              UPDATE transactions
              SET
                account_id = ${accountId},
                category_id = ${categoryId || null},
                amount = ${amount},
                base_amount_etb = ${amount},
                type = ${type},
                description = ${description?.trim() || null},
                transaction_date = ${new Date(date).toISOString().split('T')[0]}::date
              WHERE id = ${transactionId} AND user_id = ${userId}
            `,
            sqlRaw`
              WITH guard AS (
                SELECT 1 / (CASE WHEN allow_overdraft = false AND balance + ${newDelta} < 0 THEN 0 ELSE 1 END) as ok
                FROM accounts
                WHERE id = ${accountId} AND user_id = ${userId}
              )
              UPDATE accounts
              SET balance = balance + ${newDelta}, updated_at = NOW()
              FROM guard
              WHERE accounts.id = ${accountId} AND accounts.user_id = ${userId}
                AND guard.ok = 1
            `
        ], { isolationLevel: 'Serializable' })

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/transactions')
        revalidatePath('/accounts')

        return { success: true }
    } catch (error: any) {
        console.error('Unexpected update error:', error)
        if (error?.code === '22012') {
            return {
                success: false,
                error: 'This account does not have enough balance to cover this expense. Please add funds or choose a different account.',
            }
        }
        return { success: false, error: 'An unexpected error occurred. Please try again.' }
    }
}

/**
 * Delete a transaction and reverse its balance effect.
 */
export async function deleteTransaction(transactionId: string) {
    const userId = await enforceAuth()

    // 1. Verify ownership
    const isOwner = await verifyTransactionOwnership(transactionId, userId)
    if (!isOwner) {
        return { success: false, error: 'Transaction not found or access denied.' }
    }

    try {
        // 2. Fetch details to reverse balance
        const [tx] = await sql`
      SELECT account_id, amount, type
      FROM transactions
      WHERE id = ${transactionId} AND user_id = ${userId}
    `

        if (!tx) {
            return { success: false, error: 'Transaction not found.' }
        }

        // 3. Atomically reverse balance effect and delete transaction row
        const revertDelta = tx.type === 'income' ? -parseFloat(tx.amount) : parseFloat(tx.amount)

        await sql.transaction([
            sqlRaw`
              UPDATE accounts
              SET balance = balance + ${revertDelta}, updated_at = NOW()
              WHERE id = ${tx.account_id} AND user_id = ${userId}
            `,
            sqlRaw`
              DELETE FROM transactions
              WHERE id = ${transactionId} AND user_id = ${userId}
            `
        ])

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/transactions')
        revalidatePath('/accounts')

        return { success: true }
    } catch (error: any) {
        console.error('Unexpected delete error:', error)
        return { success: false, error: 'An unexpected error occurred. Please try again.' }
    }
}