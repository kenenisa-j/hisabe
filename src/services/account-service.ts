import { sql } from '@/lib/db'
import { Account, AccountType, Currency } from '@/types'

export interface CreateAccountInput {
    name: string
    type: AccountType
    currency?: Currency
    initialBalance: number
    allowOverdraft?: boolean
}

export interface UpdateAccountInput {
    name?: string
    type?: AccountType
    currency?: Currency
}

/**
 * Fetch all active (or all) accounts strictly belonging to the given user
 */
export async function getAccounts(userId: string, includeArchived = false): Promise<Account[]> {
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
 * Fetch a single account details strictly owned by the user
 */
export async function getAccountById(userId: string, accountId: string): Promise<Account | null> {
    const [row] = await sql`
        SELECT * FROM accounts
        WHERE id = ${accountId} AND user_id = ${userId}
    `

    if (!row) return null

    return {
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
    }
}

/**
 * Create a new financial account for the user
 */
export async function createAccount(userId: string, input: CreateAccountInput) {
    const name = input.name?.trim()
    if (!name) {
        throw new Error('Account name is required.')
    }

    const allowOverdraft = input.allowOverdraft ?? false
    if (!allowOverdraft && input.initialBalance < 0) {
        throw new Error('Initial balance cannot be negative for a standard account.')
    }

    const currency = input.currency || 'ETB'
    const type = input.type || 'bank'

    const [created] = await sql`
        INSERT INTO accounts (user_id, name, type, currency, balance, allow_overdraft)
        VALUES (
            ${userId},
            ${name},
            ${type},
            ${currency},
            ${input.initialBalance},
            ${allowOverdraft}
        )
        RETURNING *
    `

    return {
        id: created.id,
        user_id: created.user_id,
        name: created.name,
        type: created.type as AccountType,
        currency: created.currency as Currency,
        balance: parseFloat(created.balance),
        is_archived: created.is_archived ?? false,
        allow_overdraft: created.allow_overdraft ?? false,
        created_at: created.created_at,
        updated_at: created.updated_at,
    }
}

/**
 * Update an existing account owned by user
 */
export async function updateAccount(userId: string, accountId: string, data: UpdateAccountInput) {
    const [updated] = await sql`
        UPDATE accounts
        SET
          name = COALESCE(${data.name ?? null}, name),
          type = COALESCE(${data.type ?? null}, type),
          currency = COALESCE(${data.currency ?? null}, currency),
          updated_at = NOW()
        WHERE id = ${accountId} AND user_id = ${userId}
        RETURNING *
    `

    if (!updated) {
        throw new Error('Account not found or access denied.')
    }

    return {
        id: updated.id,
        user_id: updated.user_id,
        name: updated.name,
        type: updated.type as AccountType,
        currency: updated.currency as Currency,
        balance: parseFloat(updated.balance),
        is_archived: updated.is_archived ?? false,
        allow_overdraft: updated.allow_overdraft ?? false,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
    }
}

/**
 * Delete an account owned by user and clear associated records
 */
export async function deleteAccount(userId: string, accountId: string) {
    await sql`DELETE FROM transactions WHERE account_id = ${accountId} AND user_id = ${userId}`
    try {
        await sql`DELETE FROM transfers WHERE (from_account_id = ${accountId} OR to_account_id = ${accountId} OR fee_account_id = ${accountId}) AND user_id = ${userId}`
    } catch {}
    try {
        await sql`DELETE FROM recurring_transactions WHERE account_id = ${accountId} AND user_id = ${userId}`
    } catch {}
    try {
        await sql`UPDATE user_settings SET default_account_id = NULL WHERE user_id = ${userId} AND default_account_id = ${accountId}`
    } catch {}

    const result = await sql`
        DELETE FROM accounts
        WHERE id = ${accountId} AND user_id = ${userId}
        RETURNING id
    `

    if (result.length === 0) {
        throw new Error('Account not found or access denied.')
    }

    return { success: true }
}
