import { getDashboardMetrics } from '@/actions/dashboard-actions'
import { getMonthlyCashflowTrend } from '@/actions/cashflow-actions'
import { getCategoryExpenseBreakdown } from '@/actions/category-actions'
import { MetricCards } from '@/components/dashboard/metric-cards'
import { CashflowChart } from '@/components/dashboard/cashflow-chart'
import { CategoryBreakdownChart } from '@/components/dashboard/category-breakdown-chart'
import { RecentActivity, RecentTransaction } from '@/components/dashboard/recent-activity'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { AddTransactionModal } from '@/components/transactions/add-transaction-modal'

export const revalidate = 0

export default async function DashboardPage() {
    const userId = await getAuthenticatedUser()

    const [metrics, cashflowTrend, categoryBreakdown, recentTxRows, accountRows, categoryRows] =
        await Promise.all([
            getDashboardMetrics(),
            getMonthlyCashflowTrend(6),
            getCategoryExpenseBreakdown(),
            sql`
        SELECT 
          t.id, t.type, t.description AS title, t.base_amount_etb AS amount,
          t.transaction_date AS date, c.name AS category_name, a.name AS account_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = ${userId}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT 5
      `,
            sql`SELECT id, name, currency FROM accounts WHERE user_id = ${userId} AND is_archived = false ORDER BY name ASC`,
            sql`SELECT id, name, type FROM categories WHERE user_id = ${userId} OR user_id IS NULL ORDER BY name ASC`,
        ])

    const recentTransactions: RecentTransaction[] = recentTxRows.map((tx) => ({
        id: tx.id,
        type: tx.type,
        title: tx.title || 'Untitled Transaction',
        categoryName: tx.category_name,
        accountName: tx.account_name,
        amountEtb: parseFloat(tx.amount),
        date: tx.date,
    }))

    const accounts = accountRows.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))
    const categories = categoryRows.map((c) => ({ id: c.id, name: c.name, type: c.type as 'income' | 'expense' }))

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
                    <p className="text-sm text-slate-400">
                        Real-time balance, cash flow, and financial health.
                    </p>
                </div>
                <AddTransactionModal accounts={accounts} categories={categories} />
            </div>

            {/* 1. Summary Metric Cards */}
            <MetricCards metrics={metrics} />

            {/* 2. Main Cashflow Trend Chart */}
            <CashflowChart initialData={cashflowTrend} />

            {/* 3. Lower Grid: Category Breakdown + Recent Activity */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <CategoryBreakdownChart data={categoryBreakdown} />
                <RecentActivity transactions={recentTransactions} />
            </div>
        </div>
    )
}