'use server'

import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { revalidatePath } from 'next/cache'

export interface ParsedImportRow {
    date: string
    amount: number
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
    description?: string
    accountName?: string
    categoryName?: string
}

export async function bulkImportTransactions(
    accountId: string,
    rows: ParsedImportRow[]
): Promise<{ success: boolean; insertedCount: number }> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    if (!rows || rows.length === 0) {
        throw new Error('No valid rows provided for import.')
    }

    // Get default uncategorized ID
    const uncategorized = await sql`
    SELECT id FROM categories WHERE name = 'Uncategorized' LIMIT 1
  `
    const defaultCategoryId = uncategorized[0]?.id || null

    let insertedCount = 0

    for (const row of rows) {
        const rawAmount = Math.abs(row.amount)
        const txType = row.type || (row.amount >= 0 ? 'INCOME' : 'EXPENSE')

        await sql`
      INSERT INTO transactions (
        user_id,
        account_id,
        category_id,
        amount,
        type,
        description,
        transaction_date,
        created_at
      ) VALUES (
        ${userId},
        ${accountId},
        ${defaultCategoryId},
        ${rawAmount},
        ${txType},
        ${row.description || 'Imported via CSV'},
        ${row.date}::date,
        NOW()
      )
    `

        // Update account balance
        const balanceDelta = txType === 'INCOME' ? rawAmount : -rawAmount
        await sql`
      UPDATE accounts 
      SET balance = balance + ${balanceDelta} 
      WHERE id = ${accountId} AND user_id = ${userId}
    `

        insertedCount++
    }

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    return { success: true, insertedCount }
}