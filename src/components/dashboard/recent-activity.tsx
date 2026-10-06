'use client'

import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { useUserSettings } from '@/providers/user-settings-provider'

export interface RecentTransaction {
    id: string
    type: 'income' | 'expense' | 'transfer'
    title: string
    categoryName: string | null
    accountName: string
    amountEtb: number
    date: string
}

interface RecentActivityProps {
    transactions: RecentTransaction[]
}

export function RecentActivity({ transactions }: RecentActivityProps) {
    const { formatDateDisplay } = useUserSettings()
    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-white">Recent Activity</CardTitle>
                <Link
                    href="/transactions"
                    className="flex items-center text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                    View All
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
            </CardHeader>
            <CardContent className="pt-2">
                {transactions.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">
                        No recent activity recorded
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/60">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`rounded-lg p-2 ${tx.type === 'income'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : tx.type === 'expense'
                                                    ? 'bg-rose-500/10 text-rose-400'
                                                    : 'bg-blue-500/10 text-blue-400'
                                            }`}
                                    >
                                        {tx.type === 'income' ? (
                                            <ArrowDownRight className="h-4 w-4" />
                                        ) : tx.type === 'expense' ? (
                                            <ArrowUpRight className="h-4 w-4" />
                                        ) : (
                                            <ArrowLeftRight className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-white">{tx.title}</p>
                                        <p className="text-[11px] text-slate-400">
                                            {tx.categoryName || 'General'} • {tx.accountName}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p
                                        className={`text-xs font-semibold ${tx.type === 'income'
                                                ? 'text-emerald-400'
                                                : tx.type === 'expense'
                                                    ? 'text-white'
                                                    : 'text-blue-400'
                                            }`}
                                    >
                                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                                        {formatCurrency(tx.amountEtb, 'ETB')}
                                    </p>
                                    <p className="text-[10px] text-slate-500">{formatDateDisplay(tx.date).main}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}