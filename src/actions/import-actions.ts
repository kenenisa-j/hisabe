'use server'

import { sql, sqlRaw } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { verifyAccountOwnership } from '@/lib/security-guards'
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

    if (!accountId) {
        throw new Error('Target account is required.')
    }

    const isOwner = await verifyAccountOwnership(accountId, userId)
    if (!isOwner) {
        throw new Error('Account not found or access denied.')
    }

    if (!rows || rows.length === 0) {
        throw new Error('No valid rows provided for import.')
    }

    // Get default uncategorized ID
    const uncategorized = await sql`
    SELECT id FROM categories WHERE name = 'Uncategorized' LIMIT 1
  `
    const defaultCategoryId = uncategorized[0]?.id || null

    // Build an atomic batch: all row inserts + their corresponding balance
    // updates are sent as a single transaction. If any statement fails the
    // entire import rolls back, leaving the account in a consistent state.
    const statements = rows.flatMap((row) => {
        const rawAmount = Math.abs(row.amount)
        const txType = row.type || (row.amount >= 0 ? 'INCOME' : 'EXPENSE')
        const balanceDelta = txType === 'INCOME' ? rawAmount : -rawAmount

        return [
            sqlRaw`
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
            `,
            sqlRaw`
                UPDATE accounts
                SET balance = balance + ${balanceDelta}
                WHERE id = ${accountId} AND user_id = ${userId}
            `,
        ]
    })

    await sql.transaction(statements)

    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    return { success: true, insertedCount: rows.length }
}