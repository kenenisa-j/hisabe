'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { enforceAuth } from '@/lib/security-guards'
import { enforceRateLimit } from '@/lib/ratelimit'
import { z } from 'zod'

const QuickExpenseSchema = z.object({
    amount: z.number().positive({ message: 'Amount must be greater than zero' }),
    description: z.string().trim().min(1, { message: 'Description is required' }),
    accountId: z.string().uuid({ message: 'Select a valid account' }),
    categoryId: z.string().uuid().optional().nullable(),
})

export async function createQuickExpense(rawInput: {
    amount: number
    description: string
    accountId: string
    categoryId?: string | null
}) {
    const userId = await enforceAuth()
    await enforceRateLimit(userId, 'strict')

    const parsed = QuickExpenseSchema.safeParse(rawInput)
    if (!parsed.success) {
        return {
            success: false,
            errors: parsed.error.flatten().fieldErrors,
        }
    }

    const { amount, description, accountId, categoryId } = parsed.data
    const today = new Date().toISOString().split('T')[0]

    // Verify account ownership
    const [account] = await sql`
    SELECT id FROM accounts WHERE id = ${accountId} AND user_id = ${userId}
  `
    if (!account) {
        throw new Error('FORBIDDEN: Account not found or unauthorized')
    }

    // Insert transaction
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
      ${categoryId || null},
      ${amount},
      'EXPENSE',
      ${description},
      ${today}::date,
      NOW()
    )
  `

    // Deduct balance
    await sql`
    UPDATE accounts
    SET balance = balance - ${amount}
    WHERE id = ${accountId} AND user_id = ${userId}
  `

    revalidatePath('/dashboard')
    revalidatePath('/transactions')

    return { success: true }
}