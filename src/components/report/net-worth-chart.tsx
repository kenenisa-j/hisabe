'use client'

import { NetWorthSnapshotRecord } from '@/actions/net-worth-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts'
import { TrendingUp, Calendar } from 'lucide-react'

interface NetWorthChartProps {
    data: NetWorthSnapshotRecord[]
}

export function NetWorthChart({ data }: NetWorthChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="border-slate-800 bg-slate-900 text-white">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Net Worth Growth Trajectory</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-xs text-slate-500">
                    No historical snapshots recorded yet. Net worth snapshots accumulate automatically over time.
                </CardContent>
            </Card>
        )
    }

    const latestNetWorth = data[data.length - 1]?.totalNetWorth || 0
    const firstNetWorth = data[0]?.totalNetWorth || 0
    const netWorthDiff = latestNetWorth - firstNetWorth

    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        Net Worth Growth Trajectory
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">
                        Historical progression of total assets vs liabilities
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Total Trend:</span>
                    <span className={`font-bold ${netWorthDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {netWorthDiff >= 0 ? '+' : ''}{formatCurrency(netWorthDiff, 'ETB')}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="assetsGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                            <XAxis
                                dataKey="snapshotDate"
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => {
                                    const d = new Date(val)
                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                }}
                            />

                            <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                            />

                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const item = payload[0].payload as NetWorthSnapshotRecord
                                        return (
                                            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 shadow-xl text-xs space-y-1.5">
                                                <p className="font-semibold text-slate-300 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    {item.snapshotDate}
                                                </p>
                                                <div className="border-t border-slate-800 pt-1.5 space-y-1">
                                                    <div className="flex justify-between gap-4 text-emerald-400 font-bold">
                                                        <span>Net Worth:</span>
                                                        <span>{formatCurrency(item.totalNetWorth, 'ETB')}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4 text-blue-400">
                                                        <span>Total Assets:</span>
                                                        <span>{formatCurrency(item.totalAssets, 'ETB')}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4 text-rose-400">
                                                        <span>Liabilities:</span>
                                                        <span>{formatCurrency(item.totalLiabilities, 'ETB')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="totalAssets"
                                stroke="#3b82f6"
                                strokeWidth={1.5}
                                fillOpacity={1}
                                fill="url(#assetsGrad)"
                                name="Total Assets"
                            />

                            <Area
                                type="monotone"
                                dataKey="totalNetWorth"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#netWorthGrad)"
                                name="Net Worth"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}