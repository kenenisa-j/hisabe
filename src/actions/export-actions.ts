'use server'

import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { convertToCSV } from '@/lib/csv-exporter'

/**
 * Export Transactions as CSV
 */
export async function exportTransactionsCSV(filter?: { startDate?: string; endDate?: string }) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const startDate = filter?.startDate || '1970-01-01'
    const endDate = filter?.endDate || '2099-12-31'

    const rows = await sql`
    SELECT
      t.id,
      t.transaction_date,
      t.type,
      t.amount,
      a.name AS account_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COALESCE(t.description, '') AS description,
      t.created_at
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${userId}
      AND t.transaction_date >= ${startDate}::date
      AND t.transaction_date <= ${endDate}::date
    ORDER BY t.transaction_date DESC
  `

    const headers = [
        { key: 'transaction_date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Amount (ETB)' },
        { key: 'account_name', label: 'Account' },
        { key: 'category_name', label: 'Category' },
        { key: 'description', label: 'Description' },
    ]

    const csvContent = convertToCSV(rows, headers)
    return {
        filename: `Hisabe_Transactions_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
    }
}

/**
 * Export Account Balances & Statements as CSV
 */
export async function exportAccountsCSV() {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const rows = await sql`
    SELECT
      id,
      name,
      type,
      balance,
      currency,
      created_at
    FROM accounts
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `

    const headers = [
        { key: 'name', label: 'Account Name' },
        { key: 'type', label: 'Account Type' },
        { key: 'balance', label: 'Current Balance' },
        { key: 'currency', label: 'Currency' },
    ]

    const csvContent = convertToCSV(rows, headers)
    return {
        filename: `Hisabe_Account_Balances_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
    }
}

/**
 * Export Budgets & Performance as CSV
 */
export async function exportBudgetsCSV() {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const rows = await sql`
    SELECT
      b.id,
      c.name AS category_name,
      b.amount_limit,
      b.period,
      b.created_at
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ${userId}
    ORDER BY b.created_at DESC
  `

    const headers = [
        { key: 'category_name', label: 'Category' },
        { key: 'amount_limit', label: 'Budget Limit (ETB)' },
        { key: 'period', label: 'Period' },
    ]

    const csvContent = convertToCSV(rows, headers)
    return {
        filename: `Hisabe_Budgets_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
    }
}