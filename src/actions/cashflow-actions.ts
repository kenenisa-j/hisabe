'use server'

import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'

export interface MonthlyCashflowPoint {
    month: string // e.g., 'Oct 25', 'Nov 25'
    income: number
    expense: number
    net: number
}

export async function getMonthlyCashflowTrend(monthsCount: number = 6): Promise<MonthlyCashflowPoint[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) {
        throw new Error('Unauthorized')
    }

    // Aggregate monthly income and expense over the requested range (excluding transfers)
    const rows = await sql`
    WITH month_series AS (
      SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE) - (${monthsCount - 1} || ' month')::INTERVAL,
        DATE_TRUNC('month', CURRENT_DATE),
        '1 month'::INTERVAL
      ) AS month_date
    )
    SELECT
      TO_CHAR(ms.month_date, 'Mon YY') AS month_label,
      ms.month_date,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.base_amount_etb ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.base_amount_etb ELSE 0 END), 0) AS total_expense
    FROM month_series ms
    LEFT JOIN transactions t 
      ON DATE_TRUNC('month', t.transaction_date) = ms.month_date
      AND t.user_id = ${userId}
      AND t.type IN ('income', 'expense')
    GROUP BY ms.month_date
    ORDER BY ms.month_date ASC
  `

    return rows.map((r) => {
        const income = parseFloat(r.total_income)
        const expense = parseFloat(r.total_expense)
        return {
            month: r.month_label,
            income,
            expense,
            net: income - expense,
        }
    })
}