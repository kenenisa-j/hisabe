'use server'

import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'

export interface FinancialReportSummary {
    totalIncome: number
    totalExpenses: number
    netSavings: number
    savingsRate: number
    transactionCount: number
    // Month-over-Month (MoM) Comparison Fields
    prevTotalIncome: number
    prevTotalExpenses: number
    incomeGrowthMoM: number // percentage
    expenseGrowthMoM: number // percentage
    netSavingsGrowthMoM: number // percentage
}

export interface CategoryBreakdown {
    categoryName: string
    color: string
    totalAmount: number
    percentage: number
}

export interface CategoryDetailBreakdown {
    categoryId: string
    categoryName: string
    color: string
    totalAmount: number
    percentage: number
    transactionCount: number
    avgTransactionAmount: number
    dailyAverageAmount: number
}

export interface DailyTrendPoint {
    date: string
    income: number
    expenses: number
    net: number
}

export interface ReportFilter {
    startDate: string
    endDate: string
}

/**
 * Helper to calculate percentage difference safely
 */
function calculateGrowth(current: number, previous: number): number {
    if (previous === 0) {
        return current > 0 ? 100 : 0
    }
    const growth = ((current - previous) / Math.abs(previous)) * 100
    return Math.round(growth * 10) / 10
}

/**
 * Fetch top-level financial KPI summary with MoM growth rates for a given date range
 */
export async function getReportSummary(filter: ReportFilter): Promise<FinancialReportSummary> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { startDate, endDate } = filter

    // Calculate prior period of exact matching length
    const start = new Date(startDate)
    const end = new Date(endDate)
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - durationDays + 1)

    const prevStartStr = prevStart.toISOString().split('T')[0]
    const prevEndStr = prevEnd.toISOString().split('T')[0]

    // Query Current Period Metrics (exclude transfers)
    const [currentSummary] = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COUNT(id) AS transaction_count
    FROM transactions
    WHERE user_id = ${userId}
      AND type IN ('income', 'expense')
      AND transaction_date >= ${startDate}::date
      AND transaction_date <= ${endDate}::date
  `

    // Query Previous Period Metrics for MoM Calculation
    const [prevSummary] = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
    FROM transactions
    WHERE user_id = ${userId}
      AND type IN ('income', 'expense')
      AND transaction_date >= ${prevStartStr}::date
      AND transaction_date <= ${prevEndStr}::date
  `

    const totalIncome = parseFloat(currentSummary.total_income)
    const totalExpenses = parseFloat(currentSummary.total_expenses)
    const netSavings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

    const prevTotalIncome = parseFloat(prevSummary.total_income)
    const prevTotalExpenses = parseFloat(prevSummary.total_expenses)
    const prevNetSavings = prevTotalIncome - prevTotalExpenses

    // Calculate MoM growth rates
    const incomeGrowthMoM = calculateGrowth(totalIncome, prevTotalIncome)
    const expenseGrowthMoM = calculateGrowth(totalExpenses, prevTotalExpenses)
    const netSavingsGrowthMoM = calculateGrowth(netSavings, prevNetSavings)

    return {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: Math.max(0, Math.round(savingsRate * 10) / 10),
        transactionCount: parseInt(currentSummary.transaction_count, 10),
        prevTotalIncome,
        prevTotalExpenses,
        incomeGrowthMoM,
        expenseGrowthMoM,
        netSavingsGrowthMoM,
    }
}

/**
 * Fetch detailed category expense breakdown with daily average and transaction metrics
 */
const REPORT_CATEGORY_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#64748b', // slate
]

export async function getDetailedCategoryBreakdown(
    filter: ReportFilter
): Promise<{ categories: CategoryDetailBreakdown[]; totalDays: number; totalExpense: number }> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { startDate, endDate } = filter

    // Calculate total number of days in the selected date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    )

    const rows = await sql`
    SELECT
      COALESCE(c.id::text, 'uncategorized') AS category_id,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(t.amount) AS total_amount,
      COUNT(t.id) AS transaction_count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${userId}
      AND t.type = 'expense'
      AND t.transaction_date >= ${startDate}::date
      AND t.transaction_date <= ${endDate}::date
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC
  `

    const totalExpense = rows.reduce((sum, r) => sum + parseFloat(r.total_amount), 0)

    const categories: CategoryDetailBreakdown[] = rows.map((r, idx) => {
        const totalAmount = parseFloat(r.total_amount)
        const transactionCount = parseInt(r.transaction_count, 10)
        const avgTransactionAmount = transactionCount > 0 ? totalAmount / transactionCount : 0
        const dailyAverageAmount = totalAmount / totalDays

        return {
            categoryId: r.category_id,
            categoryName: r.category_name,
            color: REPORT_CATEGORY_COLORS[idx % REPORT_CATEGORY_COLORS.length],
            totalAmount,
            percentage: totalExpense > 0 ? Math.round((totalAmount / totalExpense) * 1000) / 10 : 0,
            transactionCount,
            avgTransactionAmount,
            dailyAverageAmount,
        }
    })

    return { categories, totalDays, totalExpense }
}

/**
 * Stub — getCategoryBreakdown kept for backward compatibility
 */
export async function getCategoryBreakdown(filter: ReportFilter): Promise<CategoryBreakdown[]> {
    const { categories } = await getDetailedCategoryBreakdown(filter)
    return categories.map((c) => ({
        categoryName: c.categoryName,
        color: c.color,
        totalAmount: c.totalAmount,
        percentage: c.percentage,
    }))
}

/**
 * Stub — getDailyTrend kept for backward compatibility
 */
export async function getDailyTrend(filter: ReportFilter): Promise<DailyTrendPoint[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { startDate, endDate } = filter

    const rows = await sql`
    SELECT
      transaction_date::text AS date,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
    FROM transactions
    WHERE user_id = ${userId}
      AND type IN ('income', 'expense')
      AND transaction_date >= ${startDate}::date
      AND transaction_date <= ${endDate}::date
    GROUP BY transaction_date
    ORDER BY transaction_date ASC
  `

    return rows.map((r) => {
        const income = parseFloat(r.income)
        const expenses = parseFloat(r.expenses)
        return {
            date: r.date,
            income,
            expenses,
            net: income - expenses,
        }
    })
}