import { getDashboardMetrics, DashboardMetrics } from '@/actions/dashboard-actions'
import { getMonthlyCashflowTrend } from '@/actions/cashflow-actions'
import { getCategoryExpenseBreakdown } from '@/actions/category-actions'
import { MetricCards } from '@/components/dashboard/metric-cards'
import { CashflowChart } from '@/components/dashboard/cashflow-chart'
import { CategoryBreakdownChart } from '@/components/dashboard/category-breakdown-chart'
import { RecentActivity, RecentTransaction } from '@/components/dashboard/recent-activity'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { AddTransactionModal } from '@/components/transactions/add-transaction-modal'
import { AlertCircle, RefreshCw } from 'lucide-react'

export const revalidate = 0

export default async function DashboardPage() {
    const userId = await getAuthenticatedUser()

    let metrics: DashboardMetrics = {
        totalBalanceEtb: 0,
        monthlyIncomeEtb: 0,
        monthlyExpenseEtb: 0,
        netSavingsEtb: 0,
        incomeChangePercent: 0,
        expenseChangePercent: 0,
    }

    let cashflowTrend: any[] = []
    let categoryBreakdown: any[] = []
    let recentTransactions: RecentTransaction[] = []
    let accounts: { id: string; name: string; type?: string; balance?: number; currency: string }[] = []
    let categories: { id: string; name: string; type: 'income' | 'expense' }[] = []
    let isDbError = false

    try {
        const [
            fetchedMetrics,
            fetchedCashflow,
            fetchedCategoryBreakdown,
            recentTxRows,
            accountRows,
            categoryRows,
        ] = await Promise.all([
            getDashboardMetrics(),
            getMonthlyCashflowTrend(6),
            getCategoryExpenseBreakdown(),
            sql`
                SELECT 
                  t.id, 
                  t.type, 
                  t.description AS title, 
                  t.base_amount_etb AS amount,
                  t.transaction_date::text AS date, 
                  c.name AS category_name, 
                  a.name AS account_name,
                  t.created_at
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                JOIN accounts a ON t.account_id = a.id
                WHERE t.user_id = ${userId}

                UNION ALL

                SELECT
                  tr.id,
                  'transfer' AS type,
                  tr.description AS title,
                  tr.amount AS amount,
                  tr.transfer_date::text AS date,
                  'Transfer' AS category_name,
                  fa.name || ' → ' || ta.name AS account_name,
                  tr.created_at
                FROM transfers tr
                LEFT JOIN accounts fa ON tr.from_account_id = fa.id
                LEFT JOIN accounts ta ON tr.to_account_id = ta.id
                WHERE tr.user_id = ${userId}

                ORDER BY date DESC, created_at DESC
                LIMIT 5
            `,
            sql`SELECT id, name, type, balance, currency FROM accounts WHERE user_id = ${userId} AND is_archived = false ORDER BY balance DESC`,
            sql`SELECT id, name, type FROM categories WHERE user_id = ${userId} OR user_id IS NULL ORDER BY name ASC`,
        ])

        metrics = fetchedMetrics
        cashflowTrend = fetchedCashflow
        categoryBreakdown = fetchedCategoryBreakdown

        recentTransactions = recentTxRows.map((tx: any) => ({
            id: tx.id,
            type: tx.type,
            title: tx.type === 'transfer'
                ? (tx.title || tx.account_name)
                : (tx.title || tx.category_name || 'Untitled Transaction'),
            categoryName: tx.type === 'transfer' ? 'Transfer' : (tx.category_name || 'General'),
            accountName: tx.account_name,
            amountEtb: parseFloat(tx.amount),
            date: tx.date,
        }))

        accounts = accountRows.map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            balance: parseFloat(a.balance || 0),
            currency: a.currency,
        }))
        categories = categoryRows.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type as 'income' | 'expense',
        }))
    } catch (err: any) {
        console.error('Dashboard data fetch warning:', err?.message || err)
        isDbError = true
    }

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

            {/* Network / Connection Error Banner */}
            {isDbError && (
                <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200 shadow-md">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                        <div>
                            <p className="font-medium text-sm">Database connection interrupted</p>
                            <p className="text-xs text-amber-300/80">
                                Temporary network timeout connecting to cloud database. Please check your internet connection.
                            </p>
                        </div>
                    </div>
                    <form action="/dashboard">
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                        </button>
                    </form>
                </div>
            )}

            {/* 1. Summary Metric Cards & Accounts Grid */}
            <MetricCards metrics={metrics} accounts={accounts} categories={categories} />

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