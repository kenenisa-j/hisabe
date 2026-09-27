'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
export type { BudgetProgress, UpsertBudgetInput } from '@/types/budget'
import { BudgetProgress, UpsertBudgetInput } from '@/types/budget'

/**
 * Upsert a budget (Create if missing, update if already exists for this category/month/year)
 */
export async function upsertBudget(input: UpsertBudgetInput) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { categoryId, amount, month, year } = input

    if (amount <= 0) throw new Error('Budget amount must be greater than zero')
    if (month < 1 || month > 12) throw new Error('Invalid month')

    await sql`
    INSERT INTO budgets (user_id, category_id, amount, month, year, updated_at)
    VALUES (${userId}, ${categoryId}, ${amount}, ${month}, ${year}, NOW())
    ON CONFLICT (user_id, category_id, month, year)
    DO UPDATE SET 
      amount = EXCLUDED.amount,
      updated_at = NOW()
  `

    revalidatePath('/budgets')
    return { success: true }
}

/**
 * Fetch budgets for a given month/year joined with current month's transaction totals
 */
export async function getBudgetsWithProgress(
    month: number,
    year: number
): Promise<BudgetProgress[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    // Calculate start and end YYYY-MM-DD date strings for the target month
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

    const rows = await sql`
    SELECT 
      b.id,
      b.user_id,
      b.category_id,
      c.name AS category_name,
      b.amount,
      b.month,
      b.year,
      b.created_at,
      b.updated_at,
      COALESCE(SUM(t.base_amount_etb), 0) AS spent_amount
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = b.category_id
      AND t.user_id = b.user_id
      AND t.type = 'expense'
      AND t.transaction_date >= ${startDateStr}::date
      AND t.transaction_date < ${endDateStr}::date
    WHERE b.user_id = ${userId}
      AND b.month = ${month}
      AND b.year = ${year}
    GROUP BY b.id, c.name
    ORDER BY c.name ASC
  `

    return rows.map((r) => {
        const amount = parseFloat(r.amount)
        const spentAmount = parseFloat(r.spent_amount)
        const remainingAmount = amount - spentAmount
        const percentageUsed = Math.min(Math.round((spentAmount / amount) * 100), 999)

        return {
            id: r.id,
            userId: r.user_id,
            categoryId: r.category_id,
            categoryName: r.category_name,
            amount,
            month: r.month,
            year: r.year,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            spentAmount,
            remainingAmount,
            percentageUsed,
            isOverBudget: spentAmount > amount,
        }
    })
}

/**
 * Delete a budget limit
 */
export async function deleteBudget(budgetId: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await sql`
    DELETE FROM budgets 
    WHERE id = ${budgetId} AND user_id = ${userId}
  `

    revalidatePath('/budgets')
    return { success: true }
}