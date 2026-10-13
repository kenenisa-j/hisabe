'use server'

import { revalidatePath } from 'next/cache'
import { sql, sqlRaw } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { verifyAccountOwnership } from '@/lib/security-guards'
export type { Debt, CreateDebtInput, RecordRepaymentInput } from '@/types/debt'
import { Debt, CreateDebtInput, RecordRepaymentInput } from '@/types/debt'

/**
 * Fetch all debts for the logged-in user with calculated remaining balances and linked account info
 */
export async function getDebts(): Promise<Debt[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const rows = await sql`
    SELECT 
      d.id, d.user_id, d.account_id, d.person_name, d.type, d.amount, d.paid_amount, d.currency,
      d.due_date, d.status, d.notes, d.created_at, d.updated_at,
      a.name AS account_name, a.type AS account_type
    FROM debts d
    LEFT JOIN accounts a ON d.account_id = a.id
    WHERE d.user_id = ${userId}
    ORDER BY 
      CASE WHEN d.status = 'settled' THEN 2 ELSE 1 END,
      d.due_date ASC NULLS LAST
  `

    return rows.map((r) => {
        const total = parseFloat(r.amount)
        const paid = parseFloat(r.paid_amount)
        return {
            id: r.id,
            userId: r.user_id,
            accountId: r.account_id ?? null,
            accountName: r.account_name ?? null,
            accountType: r.account_type ?? null,
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
 * Add a new debt or loan entry.
 * If an accountId is provided:
 * - When borrowing (owed_by_me): deposits money into the account (+ balance) and logs an income transaction.
 * - When lending (owed_to_me): deducts money from the account (- balance) with an overdraft guard and logs an expense transaction.
 */
export async function createDebt(input: CreateDebtInput) {
    try {
        const userId = await getAuthenticatedUser()
        if (!userId) return { success: false, error: 'Unauthorized' }

        const { personName, type, amount, currency = 'ETB', dueDate, notes, accountId } = input

        if (!personName || !personName.trim()) {
            return { success: false, error: 'Person or entity name is required' }
        }

        if (amount <= 0) {
            return { success: false, error: 'Amount must be greater than zero' }
        }

        if (accountId) {
            const isOwner = await verifyAccountOwnership(accountId, userId)
            if (!isOwner) {
                return { success: false, error: 'Account not found or access denied.' }
            }

            const [account] = await sql`
                SELECT id, name, balance, allow_overdraft FROM accounts WHERE id = ${accountId} AND user_id = ${userId}
            `
            if (!account) {
                return { success: false, error: 'Account not found.' }
            }

            const isBorrowed = type === 'owed_by_me'
            const accountBalance = parseFloat(account.balance)

            // If lending money to someone (owed_to_me), verify user has enough balance
            if (!isBorrowed && !account.allow_overdraft && accountBalance < amount) {
                return {
                    success: false,
                    error: `You cannot lend ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency} because ${account.name} only has ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency} in your account. You cannot lend more than what you have.`,
                }
            }

            const txnType = isBorrowed ? 'income' : 'expense'
            const description = isBorrowed
                ? `Borrowed from ${personName}${notes ? ` (${notes})` : ''}`
                : `Loan extended to ${personName}${notes ? ` (${notes})` : ''}`

            const [category] = await sql`
                SELECT id FROM categories
                WHERE (user_id = ${userId} OR user_id IS NULL) AND type = ${txnType}
                ORDER BY created_at ASC LIMIT 1
            `
            const categoryId = category?.id || null

            // Overdraft guard for lending (money leaving our account)
            const accountUpdateQuery = !isBorrowed
                ? sqlRaw`
                   WITH guard AS (
                     SELECT 1 / (CASE WHEN allow_overdraft = false AND balance < ${amount} THEN 0 ELSE 1 END) as ok
                     FROM accounts
                     WHERE id = ${accountId} AND user_id = ${userId}
                   )
                   UPDATE accounts
                   SET balance = balance - ${amount}, updated_at = NOW()
                   FROM guard
                   WHERE accounts.id = ${accountId} AND accounts.user_id = ${userId}
                     AND guard.ok = 1`
                : sqlRaw`
                   UPDATE accounts
                   SET balance = balance + ${amount}, updated_at = NOW()
                   WHERE id = ${accountId} AND user_id = ${userId}`

            await sql.transaction([
                sqlRaw`
                  INSERT INTO debts (
                    user_id, account_id, person_name, type, amount, currency, due_date, notes
                  ) VALUES (
                    ${userId}, ${accountId}, ${personName}, ${type}, ${amount}, ${currency},
                    ${dueDate ? dueDate : null}::date, ${notes || null}
                  )
                `,
                sqlRaw`
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
                accountUpdateQuery,
            ])
        } else {
            await sql`
            INSERT INTO debts (
              user_id, account_id, person_name, type, amount, currency, due_date, notes
            ) VALUES (
              ${userId}, NULL, ${personName}, ${type}, ${amount}, ${currency},
              ${dueDate ? dueDate : null}::date, ${notes || null}
            )
          `
        }

        revalidatePath('/debts')
        revalidatePath('/accounts')
        revalidatePath('/transactions')
        revalidatePath('/dashboard')
        revalidatePath('/')
        return { success: true }
    } catch (err: unknown) {
        console.error('Error in createDebt:', err)
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to add debt entry',
        }
    }
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
        const isOwner = await verifyAccountOwnership(accountId, userId)
        if (!isOwner) {
            throw new Error('Account not found or access denied.')
        }


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

        // Build the account update statement. For owed_by_me (expense) debts the
        // deduction uses a CTE guard: if the account has insufficient funds, the CTE
        // deliberately computes 1/0 (division by zero), causing a real PostgreSQL
        // exception that aborts the ENTIRE batch before any row is committed.
        // For owed_to_me (income) there is no overdraft risk so no guard is needed.
        const accountUpdateQuery = isOwedByMe
            ? sqlRaw`
               WITH guard AS (
                 SELECT 1 / (CASE WHEN allow_overdraft = false AND balance < ${amount} THEN 0 ELSE 1 END) as ok
                 FROM accounts
                 WHERE id = ${accountId} AND user_id = ${userId}
               )
               UPDATE accounts
               SET balance = balance - ${amount}, updated_at = NOW()
               FROM guard
               WHERE accounts.id = ${accountId} AND accounts.user_id = ${userId}
                 AND guard.ok = 1`
            : sqlRaw`UPDATE accounts
               SET balance = balance + ${amount}, updated_at = NOW()
               WHERE id = ${accountId} AND user_id = ${userId}`

        await sql.transaction([
            sqlRaw`
              UPDATE debts
              SET
                paid_amount = ${newPaid},
                status = ${newStatus},
                updated_at = NOW()
              WHERE id = ${debtId} AND user_id = ${userId}
            `,
            sqlRaw`
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