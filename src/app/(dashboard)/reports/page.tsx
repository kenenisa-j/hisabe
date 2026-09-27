import {
    getReportSummary,
    getDetailedCategoryBreakdown,
} from '@/actions/report-actions'
import {
    captureNetWorthSnapshot,
    getNetWorthHistory,
} from '@/actions/net-worth-actions'
import { ReportDateFilter } from '@/components/report/report-filter'
import { ReportSummaryCards } from '@/components/report/report-summary-cards'
import { CategoryBreakdownTable } from '@/components/report/category-breakdown-table'
import { NetWorthChart } from '@/components/report/net-worth-chart'

export const metadata = {
    title: 'Reports & Analytics - Hisabe',
}

interface PageProps {
    searchParams: Promise<{
        startDate?: string
        endDate?: string
    }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
    const resolvedParams = await searchParams

    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const filter = {
        startDate: resolvedParams.startDate || defaultStart,
        endDate: resolvedParams.endDate || defaultEnd,
    }

    // Trigger daily net worth snapshot creation
    await captureNetWorthSnapshot()

    const summary = await getReportSummary(filter)
    const { categories, totalDays, totalExpense } = await getDetailedCategoryBreakdown(filter)
    const netWorthHistory = await getNetWorthHistory(180) // 180 days history

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Financial Reports</h1>
                <p className="text-sm text-slate-400">
                    In-depth analysis of spending patterns, category distributions, and Net Worth progress.
                </p>
            </div>

            {/* Date Filter Bar */}
            <ReportDateFilter
                initialStartDate={filter.startDate}
                initialEndDate={filter.endDate}
            />

            {/* KPI Cards */}
            <ReportSummaryCards summary={summary} />

            {/* Historical Net Worth Recharts Timeline */}
            <NetWorthChart data={netWorthHistory} />

            {/* Detailed Category Breakdown Table */}
            <CategoryBreakdownTable
                categories={categories}
                totalDays={totalDays}
                totalExpense={totalExpense}
            />
        </div>
    )
}