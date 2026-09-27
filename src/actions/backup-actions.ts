'use server'

import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'

export async function exportFullJSONBackup() {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const accounts = await sql`SELECT * FROM accounts WHERE user_id = ${userId}`
    const categories = await sql`SELECT * FROM categories WHERE user_id = ${userId} OR user_id IS NULL`
    const transactions = await sql`SELECT * FROM transactions WHERE user_id = ${userId}`
    const budgets = await sql`SELECT * FROM budgets WHERE user_id = ${userId}`
    const assets = await sql`SELECT * FROM assets WHERE user_id = ${userId}`
    const debts = await sql`SELECT * FROM debt_ledgers WHERE user_id = ${userId}`
    const recurring = await sql`SELECT * FROM recurring_transactions WHERE user_id = ${userId}`

    const backupData = {
        metadata: {
            app: 'Hisabe Finance',
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            userId,
        },
        accounts,
        categories,
        transactions,
        budgets,
        assets,
        debts,
        recurring,
    }

    return {
        filename: `Hisabe_Full_Backup_${new Date().toISOString().split('T')[0]}.json`,
        jsonContent: JSON.stringify(backupData, null, 2),
    }
}