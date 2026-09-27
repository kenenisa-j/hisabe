'use client'

import { FinancialReportSummary } from '@/actions/report-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, PiggyBank, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface ReportSummaryCardsProps {
    summary: FinancialReportSummary
}

export function ReportSummaryCards({ summary }: ReportSummaryCardsProps) {
    const isExpenseUp = summary.expenseGrowthMoM > 0
    const isIncomeUp = summary.incomeGrowthMoM >= 0
    const isSavingsUp = summary.netSavingsGrowthMoM >= 0

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Income */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400">Total Income</p>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-emerald-400">
                            {formatCurrency(summary.totalIncome, 'ETB')}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                            <span className={`inline-flex items-center font-semibold ${isIncomeUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isIncomeUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                {Math.abs(summary.incomeGrowthMoM)}%
                            </span>
                            <span className="text-slate-500">vs prior period</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Total Expenses & MoM Growth */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400">Total Expenses</p>
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                            <TrendingDown className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-rose-400">
                            {formatCurrency(summary.totalExpenses, 'ETB')}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                            {/* Higher expense is displayed in rose, lower expense in emerald */}
                            <span className={`inline-flex items-center font-semibold ${isExpenseUp ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isExpenseUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                {Math.abs(summary.expenseGrowthMoM)}% MoM
                            </span>
                            <span className="text-slate-500">
                                {isExpenseUp ? 'higher spending' : 'lower spending'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Net Cash Savings */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400">Net Cash Flow</p>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <PiggyBank className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className={`text-xl font-bold ${summary.netSavings >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                            {formatCurrency(summary.netSavings, 'ETB')}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                            <span className={`inline-flex items-center font-semibold ${isSavingsUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isSavingsUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                {Math.abs(summary.netSavingsGrowthMoM)}%
                            </span>
                            <span className="text-slate-500">net change</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Savings Rate % */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-400">Savings Rate</p>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <Receipt className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-amber-400">
                            {summary.savingsRate}%
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Target: <span className="text-slate-300 font-medium">≥ 20.0%</span> of income saved
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}