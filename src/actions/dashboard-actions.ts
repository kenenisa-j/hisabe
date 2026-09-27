'use server'

import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'

export interface DashboardMetrics {
    totalBalanceEtb: number
    monthlyIncomeEtb: number
    monthlyExpenseEtb: number
    netSavingsEtb: number
    incomeChangePercent: number
    expenseChangePercent: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const userId = await getAuthenticatedUser()
    if (!userId) {
        throw new Error('Unauthorized')
    }

    // 1. Calculate Total Liquid Net Worth across active accounts
    const balanceRows = await sql`
    SELECT COALESCE(SUM(balance), 0) AS total_balance
    FROM accounts
    WHERE user_id = ${userId} AND is_archived = false
  `
    const totalBalanceEtb = parseFloat(balanceRows[0].total_balance)

    // 2. Compute current month and previous month date boundaries using local date formatting
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentMonthStartStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const previousMonthStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`

    // 3. Aggregate current and prior month cashflow (EXCLUDING transfers)
    const cashflowRows = await sql`
    SELECT
      -- Current Month
      COALESCE(SUM(CASE WHEN type = 'income' AND transaction_date >= ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS current_income,
      COALESCE(SUM(CASE WHEN type = 'expense' AND transaction_date >= ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS current_expense,
      
      -- Previous Month
      COALESCE(SUM(CASE WHEN type = 'income' AND transaction_date >= ${previousMonthStartStr}::date AND transaction_date < ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS prev_income,
      COALESCE(SUM(CASE WHEN type = 'expense' AND transaction_date >= ${previousMonthStartStr}::date AND transaction_date < ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS prev_expense
    FROM transactions
    WHERE user_id = ${userId}
      AND type IN ('income', 'expense')
  `

    const currentIncome = parseFloat(cashflowRows[0].current_income)
    const currentExpense = parseFloat(cashflowRows[0].current_expense)
    const prevIncome = parseFloat(cashflowRows[0].prev_income)
    const prevExpense = parseFloat(cashflowRows[0].prev_expense)

    const netSavings = currentIncome - currentExpense

    // Percentage difference calculations
    const incomeChangePercent = prevIncome > 0
        ? ((currentIncome - prevIncome) / prevIncome) * 100
        : 0

    const expenseChangePercent = prevExpense > 0
        ? ((currentExpense - prevExpense) / prevExpense) * 100
        : 0

    return {
        totalBalanceEtb,
        monthlyIncomeEtb: currentIncome,
        monthlyExpenseEtb: currentExpense,
        netSavingsEtb: netSavings,
        incomeChangePercent,
        expenseChangePercent,
    }
}