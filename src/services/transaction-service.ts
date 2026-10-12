import { sql, sqlRaw } from '@/lib/db'
import { TransactionType } from '@/types'

export interface CreateTransactionServiceInput {
    accountId: string
    categoryId?: string | null
    amount: number
    type: 'income' | 'expense' | 'transfer'
    description?: string | null
    transactionDate: string // YYYY-MM-DD
}

export interface GetTransactionsFilter {
    limit?: number
    offset?: number
    type?: string
    accountId?: string
    categoryId?: string
    startDate?: string
    endDate?: string
}

/**
 * Security Guard: Verifies that an Account belongs strictly to the current user
 */
export async function verifyAccountOwnership(accountId: string, userId: string): Promise<boolean> {
    if (!accountId) return false
    const [row] = await sql`
        SELECT id FROM accounts
        WHERE id = ${accountId} AND user_id = ${userId}
        LIMIT 1
    `
    return Boolean(row)
}

/**
 * Security Guard: Verifies category access for current user
 */
export async function verifyCategoryAccess(categoryId: string, userId: string): Promise<boolean> {
    if (!categoryId) return true
    const [row] = await sql`
        SELECT id FROM categories
        WHERE id = ${categoryId} AND (user_id = ${userId} OR user_id IS NULL)
        LIMIT 1
    `
    return Boolean(row)
}

/**
 * Fetch paginated & filtered transactions for user
 */
export async function getTransactions(userId: string, filter: GetTransactionsFilter = {}) {
    const limit = Math.min(filter.limit || 50, 200)
    const offset = filter.offset || 0

    let baseQuery = sql`
        SELECT
          t.id,
          t.user_id,
          t.account_id,
          t.category_id,
          t.type,
          t.amount,
          t.currency,
          t.base_amount_etb,
          t.description,
          t.transaction_date,
          t.created_at,
          a.name AS account_name,
          c.name AS category_name,
          c.icon AS category_icon
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId}
    `

    if (filter.type) {
        baseQuery = sql`${baseQuery} AND t.type = ${filter.type}`
    }
    if (filter.accountId) {
        baseQuery = sql`${baseQuery} AND t.account_id = ${filter.accountId}`
    }
    if (filter.categoryId) {
        baseQuery = sql`${baseQuery} AND t.category_id = ${filter.categoryId}`
    }
    if (filter.startDate) {
        baseQuery = sql`${baseQuery} AND t.transaction_date >= ${filter.startDate}::date`
    }
    if (filter.endDate) {
        baseQuery = sql`${baseQuery} AND t.transaction_date <= ${filter.endDate}::date`
    }

    const rows = await sql`
        ${baseQuery}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `

    return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        account_id: r.account_id,
        category_id: r.category_id,
        type: r.type as TransactionType,
        amount: parseFloat(r.amount),
        currency: r.currency || 'ETB',
        base_amount_etb: parseFloat(r.base_amount_etb || r.amount),
        description: r.description,
        transaction_date: r.transaction_date,
        created_at: r.created_at,
        account_name: r.account_name,
        category_name: r.category_name,
        category_icon: r.category_icon,
    }))
}

/**
 * Create transaction and mutate account balance atomically
 */
export async function createTransaction(userId: string, input: CreateTransactionServiceInput) {
    const { accountId, categoryId, amount, type, description, transactionDate } = input

    if (!accountId) {
        throw new Error('Account ID is required.')
    }
    if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than zero.')
    }
    if (!['income', 'expense', 'transfer'].includes(type.toLowerCase())) {
        throw new Error('Invalid transaction type.')
    }
    if (!transactionDate) {
        throw new Error('Transaction date is required (YYYY-MM-DD).')
    }

    // 1. Account Ownership Check
    const isOwner = await verifyAccountOwnership(accountId, userId)
    if (!isOwner) {
        throw new Error('FORBIDDEN: Target account does not belong to user.')
    }

    // 2. Category Check
    if (categoryId) {
        const isCategoryValid = await verifyCategoryAccess(categoryId, userId)
        if (!isCategoryValid) {
            throw new Error('FORBIDDEN: Invalid category selection.')
        }
    }

    const normalizedType = type.toLowerCase()

    // 3. Balance Check for expenses
    if (normalizedType === 'expense') {
        const [acc] = await sql`
            SELECT balance, allow_overdraft FROM accounts WHERE id = ${accountId} AND user_id = ${userId}
        `
        if (acc && !acc.allow_overdraft && parseFloat(acc.balance) < amount) {
            throw new Error(
                `Insufficient funds. Account balance cannot be negative (Available: ${parseFloat(acc.balance).toFixed(2)}).`
            )
        }
    }

    const balanceDelta = normalizedType === 'income' ? amount : -amount

    // 4. Atomic Execution
    await sql.transaction([
        sqlRaw`
          INSERT INTO transactions (
            user_id,
            account_id,
            category_id,
            amount,
            base_amount_etb,
            type,
            description,
            transaction_date,
            created_at
          ) VALUES (
            ${userId},
            ${accountId},
            ${categoryId || null},
            ${amount},
            ${amount},
            ${normalizedType},
            ${description?.trim() || null},
            ${transactionDate}::date,
            NOW()
          )
        `,
        sqlRaw`
          UPDATE accounts
          SET balance = balance + ${balanceDelta}, updated_at = NOW()
          WHERE id = ${accountId} AND user_id = ${userId}
        `
    ])

    return { success: true }
}
