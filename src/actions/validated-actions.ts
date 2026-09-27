'use server'

import { enforceAuth, verifyAccountOwnership, verifyCategoryAccess } from '@/lib/security-guards'
import { enforceRateLimit } from '@/lib/ratelimit'
import { TransactionSchema, TransactionSchemaInput } from '@/lib/validations/schemas'
import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createValidatedTransaction(rawInput: TransactionSchemaInput) {
    // 1. Enforce Authentication
    const userId = await enforceAuth()

    // 2. Enforce Rate Limiting per user ID (10 per minute max for financial mutations)
    await enforceRateLimit(userId, 'strict')

    // 3. Strict Schema Validation
    const parseResult = TransactionSchema.safeParse(rawInput)
    if (!parseResult.success) {
        return {
            success: false,
            errors: parseResult.error.flatten().fieldErrors,
            message: 'Validation failed. Please check your inputs.',
        }
    }

    const input = parseResult.data

    // 4. Ownership Guards
    const isOwner = await verifyAccountOwnership(input.accountId, userId)
    if (!isOwner) {
        throw new Error('FORBIDDEN: Target account does not belong to user.')
    }

    if (input.categoryId) {
        const isCategoryValid = await verifyCategoryAccess(input.categoryId, userId)
        if (!isCategoryValid) {
            throw new Error('FORBIDDEN: Invalid category selection.')
        }
    }

    // 5. Database Mutation
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
      ${input.accountId},
      ${input.categoryId || null},
      ${input.amount},
      ${input.type},
      ${input.description || null},
      ${input.transactionDate}::date,
      NOW()
    )
  `

    const balanceDelta = input.type === 'INCOME' ? input.amount : -input.amount
    await sql`
    UPDATE accounts
    SET balance = balance + ${balanceDelta}
    WHERE id = ${input.accountId} AND user_id = ${userId}
  `

    revalidatePath('/transactions')
    revalidatePath('/dashboard')

    return { success: true }
}