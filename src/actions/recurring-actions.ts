'use server'

import { revalidatePath } from 'next/cache'
import { sql, sqlRaw } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { verifyAccountOwnership, verifyCategoryAccess } from '@/lib/security-guards'
export type { RecurringTransaction, CreateRecurringInput } from '@/types/recurring'
import {
    RecurringTransaction,
    CreateRecurringInput,
} from '@/types/recurring'
import { calculateNextDueDate } from '@/lib/recurring-utils'

/**
 * Fetch all recurring transaction schedules for current user
 */
export async function getRecurringTransactions(): Promise<RecurringTransaction[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const rows = await sql`
    SELECT
      r.id,
      r.user_id,
      r.account_id,
      a.name AS account_name,
      r.category_id,
      c.name AS category_name,
      r.type,
      r.amount,
      r.currency,
      r.description,
      r.frequency,
      r.next_due_date,
      r.auto_record,
      r.is_active,
      r.created_at,
      r.updated_at
    FROM recurring_transactions r
    JOIN accounts a ON r.account_id = a.id
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = ${userId}
    ORDER BY r.next_due_date ASC
  `

    return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        accountId: r.account_id,
        accountName: r.account_name,
        categoryId: r.category_id,
        categoryName: r.category_name,
        type: r.type,
        amount: parseFloat(r.amount),
        currency: r.currency,
        description: r.description,
        frequency: r.frequency,
        nextDueDate: r.next_due_date,
        autoRecord: r.auto_record,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }))
}

/**
 * Schedule a new recurring transaction pattern
 */
export async function createRecurringTransaction(input: CreateRecurringInput) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const {
        accountId,
        categoryId,
        type,
        amount,
        currency = 'ETB',
        description,
        frequency,
        startDate,
        autoRecord = true,
    } = input

    if (amount <= 0) throw new Error('Amount must be greater than zero')

    const isOwner = await verifyAccountOwnership(accountId, userId)
    if (!isOwner) {
        throw new Error('Account not found or access denied.')
    }

    if (categoryId) {
        const isCategoryValid = await verifyCategoryAccess(categoryId, userId)
        if (!isCategoryValid) {
            throw new Error('Category not found or access denied.')
        }
    }

    await sql`
    INSERT INTO recurring_transactions (
      user_id, account_id, category_id, type, amount, currency,
      description, frequency, next_due_date, auto_record
    ) VALUES (
      ${userId}, ${accountId}, ${categoryId || null}, ${type}, ${amount}, ${currency},
      ${description || null}, ${frequency}, ${startDate}::date, ${autoRecord}
    )
  `

    revalidatePath('/recurring')
    return { success: true }
}

/**
 * Toggle active state of a recurring schedule
 */
export async function toggleRecurringActive(id: string, isActive: boolean) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await sql`
    UPDATE recurring_transactions
    SET is_active = ${isActive}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `

    revalidatePath('/recurring')
    return { success: true }
}

/**
 * Manually trigger execution of a due recurring transaction
 */
export async function executeRecurringTransaction(id: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const [item] = await sql`
    SELECT * FROM recurring_transactions WHERE id = ${id} AND user_id = ${userId} AND is_active = true
  `

    if (!item) throw new Error('Recurring rule not found or inactive')

    const isOwner = await verifyAccountOwnership(item.account_id, userId)
    if (!isOwner) {
        throw new Error('Account not found or access denied.')
    }

    const amount = parseFloat(item.amount)
    const currentDate = new Date(item.next_due_date)


    const balanceDelta = item.type === 'income' ? amount : -amount
    const nextDueDate = calculateNextDueDate(currentDate, item.frequency).toISOString().split('T')[0]

    // Execute atomically: insert transaction, update account balance, and advance
    // the recurring schedule. The account UPDATE uses a CTE guard: if the account
    // has insufficient funds, the CTE deliberately computes 1/0 (division by zero),
    // causing a real PostgreSQL exception that aborts the ENTIRE batch before any
    // row is committed.
    await sql.transaction([
        sqlRaw`
          INSERT INTO transactions (
            user_id, account_id, category_id, type, amount, base_amount_etb, description, transaction_date, created_at
          ) VALUES (
            ${userId}, ${item.account_id}, ${item.category_id}, ${item.type}, ${amount}, ${amount},
            ${item.description || 'Recurring Entry'}, ${currentDate.toISOString().split('T')[0]}::date, NOW()
          )
        `,
        sqlRaw`
          WITH guard AS (
            SELECT 1 / (CASE WHEN allow_overdraft = false AND balance + ${balanceDelta} < 0 THEN 0 ELSE 1 END) as ok
            FROM accounts
            WHERE id = ${item.account_id} AND user_id = ${userId}
          )
          UPDATE accounts
          SET balance = balance + ${balanceDelta}, updated_at = NOW()
          FROM guard
          WHERE accounts.id = ${item.account_id} AND accounts.user_id = ${userId}
            AND guard.ok = 1
        `,
        sqlRaw`
          UPDATE recurring_transactions
          SET next_due_date = ${nextDueDate}::date, updated_at = NOW()
          WHERE id = ${id} AND user_id = ${userId}
        `
    ], { isolationLevel: 'Serializable' })

    revalidatePath('/recurring')
    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    return { success: true }
}