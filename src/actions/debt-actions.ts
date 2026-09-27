'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
export type { Debt, CreateDebtInput, RecordRepaymentInput } from '@/types/debt'
import { Debt, CreateDebtInput, RecordRepaymentInput } from '@/types/debt'

/**
 * Fetch all debts for the logged-in user with calculated remaining balances
 */
export async function getDebts(): Promise<Debt[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const rows = await sql`
    SELECT 
      id, user_id, person_name, type, amount, paid_amount, currency,
      due_date, status, notes, created_at, updated_at
    FROM debts
    WHERE user_id = ${userId}
    ORDER BY 
      CASE WHEN status = 'settled' THEN 2 ELSE 1 END,
      due_date ASC NULLS LAST
  `

    return rows.map((r) => {
        const total = parseFloat(r.amount)
        const paid = parseFloat(r.paid_amount)
        return {
            id: r.id,
            userId: r.user_id,
            personName: r.person_name,
            type: r.type,
            amount: total,
            paidAmount: paid,
            remainingAmount: total - paid,
            currency: r.currency,
            dueDate: r.due_date,
            status: r.status,
            notes: r.notes,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }
    })
}

/**
 * Add a new debt or loan entry
 */
export async function createDebt(input: CreateDebtInput) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { personName, type, amount, currency = 'ETB', dueDate, notes } = input

    if (amount <= 0) throw new Error('Amount must be greater than zero')

    await sql`
    INSERT INTO debts (
      user_id, person_name, type, amount, currency, due_date, notes
    ) VALUES (
      ${userId}, ${personName}, ${type}, ${amount}, ${currency},
      ${dueDate ? dueDate : null}::date, ${notes || null}
    )
  `

    revalidatePath('/debts')
    return { success: true }
}

/**
 * Record a full or partial repayment toward a debt and synchronize with accounts/transactions.
 * Executes atomically using sql.begin().
 */
export async function recordDebtRepayment({ debtId, amount, accountId }: RecordRepaymentInput) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    if (amount <= 0) throw new Error('Repayment amount must be greater than zero')

    // 1. Fetch debt details
    const [debt] = await sql`
    SELECT * FROM debts WHERE id = ${debtId} AND user_id = ${userId}
  `

    if (!debt) throw new Error('Debt record not found')

    const total = parseFloat(debt.amount)
    const currentPaid = parseFloat(debt.paid_amount)
    const remaining = total - currentPaid

    if (amount > remaining) {
        throw new Error(`Repayment amount (${amount}) exceeds remaining balance (${remaining})`)
    }

    const newPaid = currentPaid + amount
    const newStatus = newPaid >= total ? 'settled' : 'partial'
    const isOwedByMe = debt.type === 'owed_by_me'

        // B. If an account is selected, convert repayment to an actual transaction atomically
        if (accountId) {
            const txnType = isOwedByMe ? 'expense' : 'income'
            const description = isOwedByMe
                ? `Debt Repayment to ${debt.person_name}`
                : `Loan Collection from ${debt.person_name}`

            const [category] = await sql`
        SELECT id FROM categories 
        WHERE (user_id = ${userId} OR user_id IS NULL) AND type = ${txnType}
        ORDER BY created_at ASC LIMIT 1
      `
            const categoryId = category?.id || null

            const accountUpdateQuery = isOwedByMe
                ? sql`UPDATE accounts SET balance = balance - ${amount}, updated_at = NOW() WHERE id = ${accountId} AND user_id = ${userId}`
                : sql`UPDATE accounts SET balance = balance + ${amount}, updated_at = NOW() WHERE id = ${accountId} AND user_id = ${userId}`

            await sql.transaction([
                sql`
                  UPDATE debts
                  SET 
                    paid_amount = ${newPaid},
                    status = ${newStatus},
                    updated_at = NOW()
                  WHERE id = ${debtId} AND user_id = ${userId}
                `,
                sql`
                  INSERT INTO transactions (
                    user_id,
                    account_id,
                    category_id,
                    type,
                    amount,
                    base_amount_etb,
                    description,
                    transaction_date,
                    created_at
                  ) VALUES (
                    ${userId},
                    ${accountId},
                    ${categoryId},
                    ${txnType},
                    ${amount},
                    ${amount},
                    ${description},
                    CURRENT_DATE,
                    NOW()
                  )
                `,
                accountUpdateQuery
            ])
        } else {
            await sql`
              UPDATE debts
              SET 
                paid_amount = ${newPaid},
                status = ${newStatus},
                updated_at = NOW()
              WHERE id = ${debtId} AND user_id = ${userId}
            `
        }

    revalidatePath('/debts')
    revalidatePath('/accounts')
    revalidatePath('/transactions')
    revalidatePath('/')

    return { success: true }
}

/**
 * Delete a debt entry
 */
export async function deleteDebt(id: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await sql`
    DELETE FROM debts WHERE id = ${id} AND user_id = ${userId}
  `

    revalidatePath('/debts')
    return { success: true }
}

/**
 * Direct Settle / Pay Full Balance action
 */
export async function settleDebtInFull(debtId: string, accountId?: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const [debt] = await sql`
    SELECT * FROM debts WHERE id = ${debtId} AND user_id = ${userId}
  `

    if (!debt) throw new Error('Debt record not found')

    const total = parseFloat(debt.amount)
    const currentPaid = parseFloat(debt.paid_amount)
    const remaining = total - currentPaid

    if (remaining <= 0) {
        throw new Error('Debt is already fully settled')
    }

    return await recordDebtRepayment({
        debtId,
        amount: remaining,
        accountId,
    })
}