'use client'

import { Debt } from '@/actions/debt-actions'
import { DebtCard } from '@/components/debts/debt-card'
import { CreateDebtModal } from '@/components/debts/create-debt-modal'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { HandCoins, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface DebtsContainerProps {
    debts: Debt[]
    accounts: { id: string; name: string }[]
}

export function DebtsContainer({ debts, accounts }: DebtsContainerProps) {
    const totalIOwe = debts
        .filter((d) => d.type === 'owed_by_me' && d.status !== 'settled')
        .reduce((sum, d) => sum + d.remainingAmount, 0)

    const totalOwedToMe = debts
        .filter((d) => d.type === 'owed_to_me' && d.status !== 'settled')
        .reduce((sum, d) => sum + d.remainingAmount, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Debts & Loans</h1>
                    <p className="text-sm text-slate-400">
                        Track money borrowed, loans extended, and partial repayments.
                    </p>
                </div>
                <CreateDebtModal />
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="border-slate-800 bg-slate-900 text-white">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Total I Owe (Liabilities)</p>
                            <h3 className="text-xl font-bold text-rose-400 mt-1">
                                {formatCurrency(totalIOwe, 'ETB')}
                            </h3>
                        </div>
                        <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900 text-white">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Total Owed to Me (Assets)</p>
                            <h3 className="text-xl font-bold text-emerald-400 mt-1">
                                {formatCurrency(totalOwedToMe, 'ETB')}
                            </h3>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <ArrowDownLeft className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Debts Grid */}
            {debts.length === 0 ? (
                <div className="flex h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center">
                    <HandCoins className="h-10 w-10 text-slate-600 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No Active Debts or Loans</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm">
                        Keep track of personal borrowings and loans to friends or relatives cleanly in one place.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {debts.map((debt) => (
                        <DebtCard key={debt.id} debt={debt} accounts={accounts} />
                    ))}
                </div>
            )}
        </div>
    )
}