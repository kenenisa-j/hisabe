'use client'

import { NetWorthSummary } from '@/actions/net-worth-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Landmark, TrendingUp, ShieldAlert, Scale } from 'lucide-react'

interface NetWorthCardsProps {
    summary: NetWorthSummary
}

export function NetWorthCards({ summary }: NetWorthCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Net Worth */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400">Total Net Worth</p>
                        <h3 className={`text-xl font-bold mt-1 ${summary.totalNetWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(summary.totalNetWorth, 'ETB')}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Assets minus liabilities</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Landmark className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Total Assets */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400">Total Assets</p>
                        <h3 className="text-xl font-bold text-blue-400 mt-1">
                            {formatCurrency(summary.totalAssets, 'ETB')}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Liquid: {formatCurrency(summary.liquidAssets, 'ETB')}
                        </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Total Liabilities */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400">Total Liabilities</p>
                        <h3 className="text-xl font-bold text-rose-400 mt-1">
                            {formatCurrency(summary.totalLiabilities, 'ETB')}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Active unpaid loans</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>

            {/* Solvency Ratio */}
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-400">Asset-to-Debt Ratio</p>
                        <h3 className="text-xl font-bold text-amber-400 mt-1">
                            {summary.assetToDebtRatio}x
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Coverage multiplier</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <Scale className="h-5 w-5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}