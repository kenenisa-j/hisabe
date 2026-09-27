'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { ensureTablesExist } from '@/lib/db/init-db'
import { enforceAuth, verifyAccountOwnership } from '@/lib/security-guards'

export interface CreateTransferInput {
    fromAccountId: string
    toAccountId: string
    amount: number
    fee?: number
    transferDate?: string
    description?: string
}

export async function createTransfer(input: CreateTransferInput) {
    const userId = await enforceAuth()

    await ensureTablesExist()

    const { fromAccountId, toAccountId, amount, fee = 0, transferDate, description } = input

    if (amount <= 0) {
        return { success: false, error: 'Transfer amount must be greater than zero.' }
    }

    if (fromAccountId === toAccountId) {
        return { success: false, error: 'From and To accounts must be different.' }
    }

    const isFromOwner = await verifyAccountOwnership(fromAccountId, userId)
    const isToOwner = await verifyAccountOwnership(toAccountId, userId)

    if (!isFromOwner || !isToOwner) {
        return { success: false, error: 'Account not found or access denied.' }
    }

    try {
        const dateStr = transferDate
            ? new Date(transferDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]

        // Atomically record transfer and adjust balances for both source and destination accounts
        const totalDeduction = amount + (fee || 0)

        await sql.transaction([
            sql`
                INSERT INTO transfers (
                    user_id,
                    from_account_id,
                    to_account_id,
                    amount,
                    fee,
                    description,
                    transfer_date,
                    created_at
                ) VALUES (
                    ${userId},
                    ${fromAccountId},
                    ${toAccountId},
                    ${amount},
                    ${fee},
                    ${description?.trim() || null},
                    ${dateStr}::date,
                    NOW()
                )
            `,
            sql`
                UPDATE accounts
                SET balance = balance - ${totalDeduction}, updated_at = NOW()
                WHERE id = ${fromAccountId} AND user_id = ${userId}
            `,
            sql`
                UPDATE accounts
                SET balance = balance + ${amount}, updated_at = NOW()
                WHERE id = ${toAccountId} AND user_id = ${userId}
            `
        ])

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/transactions')
        revalidatePath('/accounts')

        return { success: true }
    } catch (error) {
        console.error('Transfer error:', error)
        return { success: false, error: 'Failed to complete transfer.' }
    }
}
