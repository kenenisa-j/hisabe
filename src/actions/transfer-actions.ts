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

        const dateStr = transferDate
            ? new Date(transferDate).toISOString()
            : new Date().toISOString()

        // Lock accounts in a deterministic order (lexicographic by ID) to reduce
        // deadlock risk when two concurrent transfers touch the same account pair.
        // The deduct statement uses a CTE guard: if the source has insufficient funds,
        // the guard computes 1/0 (division by zero), aborting the ENTIRE transaction
        // batch before ANY balance change commits.
        // Note: do NOT use FOR UPDATE inside a CTE referenced by DML — it is not
        // valid in PostgreSQL and causes CASE WHEN to not short-circuit properly.
        // SERIALIZABLE isolation handles the concurrency race window instead.
        const fromFirst = fromAccountId < toAccountId

        const deductFromStmt = sqlRaw`
            WITH guard AS (
              SELECT 1 / (CASE WHEN allow_overdraft = false AND balance < ${totalDeduction} THEN 0 ELSE 1 END) as ok
              FROM accounts
              WHERE id = ${fromAccountId} AND user_id = ${userId}
            )
            UPDATE accounts
            SET balance = balance - ${totalDeduction}, updated_at = NOW()
            FROM guard
            WHERE accounts.id = ${fromAccountId} AND accounts.user_id = ${userId}
              AND guard.ok = 1
            RETURNING accounts.id
        `
        const addToStmt = sqlRaw`
            UPDATE accounts
            SET balance = balance + ${amount}, updated_at = NOW()
            WHERE id = ${toAccountId} AND user_id = ${userId}
        `
        const insertStmt = sqlRaw`
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
        `

        // Execute in deterministic lock order to prevent deadlocks.
        // The division-by-zero CTE guard in deductFromStmt will throw a PostgreSQL
        // exception if balance is insufficient, rolling back the entire batch.
        fromFirst
            ? await sql.transaction([deductFromStmt, addToStmt, insertStmt], { isolationLevel: 'Serializable' })
            : await sql.transaction([addToStmt, deductFromStmt, insertStmt], { isolationLevel: 'Serializable' })

        revalidatePath('/')
        revalidatePath('/dashboard')
        revalidatePath('/transactions')
        revalidatePath('/accounts')

        return { success: true }
    } catch (error: any) {
        console.error('Transfer error:', error)
        if (error?.code === '22012') {
            return {
                success: false,
                error: 'The source account does not have enough balance to complete this transfer. Please add funds or choose a different account.',
            }
        }
        return { success: false, error: 'Failed to complete the transfer. Please try again.' }
    }
}
