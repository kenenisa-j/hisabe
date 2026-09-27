import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'

export async function getMonthlyOverview(monthDateStr: string) {
    const userId = await getAuthenticatedUser()

    // STRICT RULE: Filter OUT type = 'transfer' from cashflow totals
    const stats = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN base_amount_etb ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN base_amount_etb ELSE 0 END), 0) AS total_expense,
      COALESCE(SUM(CASE WHEN type = 'transfer' THEN base_amount_etb ELSE 0 END), 0) AS volume_transferred
    FROM transactions
    WHERE user_id = ${userId}
      AND type IN ('income', 'expense') -- Explicitly excludes 'transfer'
      AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', ${monthDateStr}::DATE)
  `

    const totalIncome = parseFloat(stats[0].total_income)
    const totalExpense = parseFloat(stats[0].total_expense)
    const netSavings = totalIncome - totalExpense

    return {
        totalIncome,
        totalExpense,
        netSavings,
    }
}