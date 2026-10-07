'use server'

import { revalidatePath } from 'next/cache'
import { sql, sqlRaw } from '@/lib/db'
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
        const totalDeduction = amount + (fee || 0)

        // Check source account balance (skip for overdraft-enabled accounts)
        const [fromAccount] = await sql`
            SELECT balance, allow_overdraft FROM accounts WHERE id = ${fromAccountId} AND user_id = ${userId}
        `
        if (fromAccount && !fromAccount.allow_overdraft && parseFloat(fromAccount.balance) < totalDeduction) {
            return {
                success: false,
                error: `Insufficient funds in source account. Account balance cannot be negative (Available: ${parseFloat(fromAccount.balance).toFixed(2)}).`,
            }
        }

        const dateStr = transferDate
            ? new Date(transferDate).toISOString()
            : new Date().toISOString()

        await sql.transaction([
            sqlRaw`
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
                    ${dateStr}::timestamptz,
                    NOW()
                )
            `,
            sqlRaw`
                UPDATE accounts
                SET balance = balance - ${totalDeduction}, updated_at = NOW()
                WHERE id = ${fromAccountId} AND user_id = ${userId}
            `,
            sqlRaw`
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
