import { DashboardMetrics } from '@/actions/dashboard-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react'

interface MetricCardsProps {
    metrics: DashboardMetrics
}

export function MetricCards({ metrics }: MetricCardsProps) {
    const {
        totalBalanceEtb,
        monthlyIncomeEtb,
        monthlyExpenseEtb,
        netSavingsEtb,
        incomeChangePercent,
        expenseChangePercent,
    } = metrics

    const isSavingsPositive = netSavingsEtb >= 0

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Total Net Worth / Balance */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Total Net Worth</span>
                        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-bold tracking-tight text-white">
                            {formatCurrency(totalBalanceEtb, 'ETB')}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Liquid assets across all accounts
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Monthly Income */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Monthly Income</span>
                        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-bold tracking-tight text-emerald-400">
                            {formatCurrency(monthlyIncomeEtb, 'ETB')}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                            {incomeChangePercent !== 0 && (
                                <span
                                    className={`flex items-center font-medium ${incomeChangePercent > 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                >
                                    {incomeChangePercent > 0 ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3" />
                                    )}
                                    {Math.abs(incomeChangePercent).toFixed(1)}%
                                </span>
                            )}
                            <span className="text-slate-500">vs last month</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Monthly Expenses */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Monthly Expenses</span>
                        <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
                            <TrendingDown className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-bold tracking-tight text-white">
                            {formatCurrency(monthlyExpenseEtb, 'ETB')}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                            {expenseChangePercent !== 0 && (
                                <span
                                    className={`flex items-center font-medium ${expenseChangePercent <= 0 ? 'text-emerald-400' : 'text-rose-400'
                                        }`}
                                >
                                    {expenseChangePercent > 0 ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3" />
                                    )}
                                    {Math.abs(expenseChangePercent).toFixed(1)}%
                                </span>
                            )}
                            <span className="text-slate-500">vs last month</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Net Savings */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">Net Cash Flow</span>
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                            <PiggyBank className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3
                            className={`text-2xl font-bold tracking-tight ${isSavingsPositive ? 'text-blue-400' : 'text-rose-400'
                                }`}
                        >
                            {isSavingsPositive ? '+' : ''}
                            {formatCurrency(netSavingsEtb, 'ETB')}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                            {isSavingsPositive ? 'Positive cash flow this month' : 'Operating at a deficit'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}