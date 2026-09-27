'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
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

    const amount = parseFloat(item.amount)
    const currentDate = new Date(item.next_due_date)

    // 1. Post entry into transactions table
    await sql`
    INSERT INTO transactions (
      user_id, account_id, category_id, type, amount, base_amount_etb, description, transaction_date
    ) VALUES (
      ${userId}, ${item.account_id}, ${item.category_id}, ${item.type}, ${amount}, ${amount},
      ${item.description || 'Recurring Entry'}, ${currentDate.toISOString().split('T')[0]}::date
    )
  `

    // 2. Adjust account balance
    if (item.type === 'income') {
        await sql`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${item.account_id}`
    } else if (item.type === 'expense') {
        await sql`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${item.account_id}`
    }

    // 3. Advance next_due_date
    const nextDueDate = calculateNextDueDate(currentDate, item.frequency).toISOString().split('T')[0]

    await sql`
    UPDATE recurring_transactions
    SET next_due_date = ${nextDueDate}::date, updated_at = NOW()
    WHERE id = ${id}
  `

    revalidatePath('/recurring')
    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    return { success: true }
}