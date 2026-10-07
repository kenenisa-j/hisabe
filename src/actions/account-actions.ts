'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { Account, AccountType, Currency } from '@/types'

/**
 * Fetch all active (or all) accounts for the current user
 */
export async function getAccounts(includeArchived = false): Promise<Account[]> {
    const userId = await getAuthenticatedUser()

    const rows = includeArchived
        ? await sql`
        SELECT * FROM accounts 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `
        : await sql`
        SELECT * FROM accounts 
        WHERE user_id = ${userId} AND (is_archived = FALSE OR is_archived IS NULL)
        ORDER BY created_at DESC
      `

    return rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        type: row.type as AccountType,
        currency: row.currency as Currency,
        balance: parseFloat(row.balance),
        is_archived: row.is_archived ?? false,
        allow_overdraft: row.allow_overdraft ?? false,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }))
}

/**
 * Create a new financial account
 */
export async function createAccount(data: {
    name: string
    type: AccountType
    currency: Currency
    initialBalance: number
    allowOverdraft?: boolean
}) {
    const userId = await getAuthenticatedUser()

    if (!data.name || data.name.trim() === '') {
        return { success: false, error: 'Account name is required.' }
    }

    if (!data.allowOverdraft && data.initialBalance < 0) {
        return { success: false, error: 'Initial balance cannot be negative for a standard account.' }
    }

    try {
        await sql`
        INSERT INTO accounts (user_id, name, type, currency, balance, allow_overdraft)
        VALUES (
            ${userId},
            ${data.name.trim()},
            ${data.type},
            ${data.currency},
            ${data.initialBalance},
            ${data.allowOverdraft ?? false}
        )
      `

        revalidatePath('/accounts')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Failed to create account:', error)
        return { success: false, error: 'Failed to create account. Please try again.' }
    }
}

/**
 * Update an existing account
 */
export async function updateAccount(
    accountId: string,
    data: {
        name?: string
        type?: AccountType
        currency?: Currency
    }
) {
    const userId = await getAuthenticatedUser()

    await sql`
    UPDATE accounts
    SET 
      name = COALESCE(${data.name ?? null}, name),
      type = COALESCE(${data.type ?? null}, type),
      currency = COALESCE(${data.currency ?? null}, currency)
    WHERE id = ${accountId} AND user_id = ${userId}
  `

    revalidatePath('/accounts')
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Toggle account archive status
 */
export async function toggleArchiveAccount(accountId: string, isArchived: boolean) {
    const userId = await getAuthenticatedUser()

    await sql`
    UPDATE accounts
    SET is_archived = ${isArchived}
    WHERE id = ${accountId} AND user_id = ${userId}
  `

    revalidatePath('/accounts')
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Delete an account (also removes all associated transactions and transfers)
 */
export async function deleteAccount(accountId: string) {
    const userId = await getAuthenticatedUser()

    try {
        // Step 1: Delete transactions referencing this account.
        // Use two separate deletes to avoid issues if to_account_id column doesn't exist.
        try {
            await sql`
                DELETE FROM transactions
                WHERE account_id = ${accountId} AND user_id = ${userId}
            `
        } catch (err) {
            console.error('deleteAccount – transactions (account_id) delete failed:', err)
            throw err
        }

        try {
            await sql`
                DELETE FROM transactions
                WHERE to_account_id = ${accountId} AND user_id = ${userId}
            `
        } catch {
            // to_account_id column may not exist – ignore this step
        }

        // Step 2: Delete transfers referencing this account
        try {
            await sql`
                DELETE FROM transfers
                WHERE (from_account_id = ${accountId} OR to_account_id = ${accountId} OR fee_account_id = ${accountId})
                  AND user_id = ${userId}
            `
        } catch (err) {
            console.error('deleteAccount – transfers delete failed:', err)
            throw err
        }

        // Step 3: Delete recurring transactions if the table exists
        try {
            await sql`
                DELETE FROM recurring_transactions
                WHERE account_id = ${accountId} AND user_id = ${userId}
            `
        } catch {
            // Ignore – table may not exist
        }

        // Step 4: Clear default_account_id in user_settings if it references this account
        try {
            await sql`
                UPDATE user_settings
                SET default_account_id = NULL
                WHERE user_id = ${userId} AND default_account_id = ${accountId}
            `
        } catch {
            // Ignore – user_settings may not have this account set
        }

        // Step 5: Delete the account itself
        const result = await sql`
            DELETE FROM accounts
            WHERE id = ${accountId} AND user_id = ${userId}
            RETURNING id
        `

        if (result.length === 0) {
            return { success: false, error: 'Account not found or you do not have permission to delete it.' }
        }

        revalidatePath('/accounts')
        revalidatePath('/transactions')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('Failed to delete account:', msg)
        return { success: false, error: `Failed to delete account: ${msg}` }
    }
}

/**
 * Fetch a single account details along with its transaction history
 */
export async function getAccountWithTransactions(accountId: string) {
    const userId = await getAuthenticatedUser()

    const [accountRow] = await sql`
        SELECT * FROM accounts
        WHERE id = ${accountId} AND user_id = ${userId}
    `

    if (!accountRow) {
        throw new Error('Account not found')
    }

    const account: Account = {
        id: accountRow.id,
        user_id: accountRow.user_id,
        name: accountRow.name,
        type: accountRow.type as AccountType,
        currency: accountRow.currency as Currency,
        balance: parseFloat(accountRow.balance),
        is_archived: accountRow.is_archived ?? false,
        allow_overdraft: accountRow.allow_overdraft ?? false,
        created_at: accountRow.created_at,
        updated_at: accountRow.updated_at,
    }

    const transactionRows = await sql`
        SELECT 
            t.id, t.user_id, t.account_id, t.to_account_id, t.category_id, t.type, t.amount,
            t.currency, t.base_amount_etb, t.description, t.transaction_date,
            t.created_at, c.name AS category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE (t.account_id = ${accountId} OR t.to_account_id = ${accountId}) AND t.user_id = ${userId}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT 100
    `

    const transactions = transactionRows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        account_id: r.account_id,
        to_account_id: r.to_account_id || null,
        category_id: r.category_id,
        type: r.type,
        amount: parseFloat(r.amount),
        currency: r.currency,
        base_amount_etb: parseFloat(r.base_amount_etb || r.amount),
        description: r.description,
        transaction_date: r.transaction_date,
        created_at: r.created_at,
        category_name: r.category_name,
        category: r.category_name
            ? {
                  id: r.category_id,
                  name: r.category_name,
              }
            : null,
    }))

    return { account, transactions }
}