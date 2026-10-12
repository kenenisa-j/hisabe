import { sql } from '@/lib/db'
import { getAccounts } from '@/services/account-service'
import { getTransactions } from '@/services/transaction-service'

export interface DashboardMetrics {
    totalBalanceEtb: number
    monthlyIncomeEtb: number
    monthlyExpenseEtb: number
    netSavingsEtb: number
    incomeChangePercent: number
    expenseChangePercent: number
    todayIncomeEtb: number
    todayExpenseEtb: number
    todayNetSavingsEtb: number
    todayTransactionCount: number
}

/**
 * Compute key financial KPIs for dashboard
 */
export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    // 1. Calculate Total Liquid Net Worth across active accounts
    const balanceRows = await sql`
        SELECT COALESCE(SUM(balance), 0) AS total_balance
        FROM accounts
        WHERE user_id = ${userId} AND (is_archived = FALSE OR is_archived IS NULL)
    `
    const totalBalanceEtb = parseFloat(balanceRows[0].total_balance)

    // 2. Compute date boundaries
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()
    const currentMonthStartStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const previousMonthStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`

    // 3. Aggregate cashflow totals
    const cashflowRows = await sql`
        SELECT
          -- Current Month
          COALESCE(SUM(CASE WHEN type = 'income' AND transaction_date >= ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS current_income,
          COALESCE(SUM(CASE WHEN type = 'expense' AND transaction_date >= ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS current_expense,

          -- Previous Month
          COALESCE(SUM(CASE WHEN type = 'income' AND transaction_date >= ${previousMonthStartStr}::date AND transaction_date < ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS prev_income,
          COALESCE(SUM(CASE WHEN type = 'expense' AND transaction_date >= ${previousMonthStartStr}::date AND transaction_date < ${currentMonthStartStr}::date THEN base_amount_etb ELSE 0 END), 0) AS prev_expense,

          -- Today
          COALESCE(SUM(CASE WHEN type = 'income' AND transaction_date = ${todayStr}::date THEN base_amount_etb ELSE 0 END), 0) AS today_income,
          COALESCE(SUM(CASE WHEN type = 'expense' AND transaction_date = ${todayStr}::date THEN base_amount_etb ELSE 0 END), 0) AS today_expense,
          COUNT(CASE WHEN transaction_date = ${todayStr}::date THEN 1 END) AS today_tx_count
        FROM transactions
        WHERE user_id = ${userId}
          AND type IN ('income', 'expense')
    `

    const currentIncome = parseFloat(cashflowRows[0].current_income)
    const currentExpense = parseFloat(cashflowRows[0].current_expense)
    const prevIncome = parseFloat(cashflowRows[0].prev_income)
    const prevExpense = parseFloat(cashflowRows[0].prev_expense)

    const todayIncome = parseFloat(cashflowRows[0].today_income)
    const todayExpense = parseFloat(cashflowRows[0].today_expense)
    const todayTxCount = parseInt(cashflowRows[0].today_tx_count, 10) || 0

    const netSavings = currentIncome - currentExpense
    const todayNetSavings = todayIncome - todayExpense

    const incomeChangePercent = prevIncome > 0
        ? Math.round(((currentIncome - prevIncome) / prevIncome) * 1000) / 10
        : 0

    const expenseChangePercent = prevExpense > 0
        ? Math.round(((currentExpense - prevExpense) / prevExpense) * 1000) / 10
        : 0

    return {
        totalBalanceEtb,
        monthlyIncomeEtb: currentIncome,
        monthlyExpenseEtb: currentExpense,
        netSavingsEtb: netSavings,
        incomeChangePercent,
        expenseChangePercent,
        todayIncomeEtb: todayIncome,
        todayExpenseEtb: todayExpense,
        todayNetSavingsEtb: todayNetSavings,
        todayTransactionCount: todayTxCount,
    }
}

/**
 * Fetch dynamic notifications based on real user status
 */
export async function getDashboardNotifications(userId: string) {
    const notifications: Array<{
        id: string
        title: string
        description: string
        category: string
        type: string
        timestamp: string
    }> = []

    const accounts = await getAccounts(userId, false)
    for (const account of accounts) {
        if (account.balance < 500) {
            notifications.push({
                id: `account-low-${account.id}`,
                title: `Low Account Balance: ${account.name}`,
                description: `Current balance is ${account.balance.toLocaleString()} ${account.currency}. Consider funding this account.`,
                category: 'account',
                type: 'warning',
                timestamp: new Date().toISOString(),
            })
        }
    }

    if (notifications.length === 0) {
        notifications.push({
            id: 'system-all-clear',
            title: 'Financial Status Healthy',
            description: 'All account balances are within normal operational limits.',
            category: 'system',
            type: 'success',
            timestamp: new Date().toISOString(),
        })
    }

    return notifications
}

/**
 * Retrieve comprehensive dashboard overview payload for client APIs
 */
export async function getDashboardOverview(userId: string) {
    const metrics = await getDashboardMetrics(userId)
    const accounts = await getAccounts(userId, false)
    const recentTransactions = await getTransactions(userId, { limit: 10 })
    const notifications = await getDashboardNotifications(userId)

    return {
        metrics,
        accounts,
        recentTransactions,
        notifications,
    }
}
