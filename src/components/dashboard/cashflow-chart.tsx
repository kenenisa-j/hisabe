'use client'

import { useState } from 'react'
import { MonthlyCashflowPoint } from '@/actions/cashflow-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from 'recharts'
import { BarChart3, AreaChart as AreaIcon } from 'lucide-react'

interface CashflowChartProps {
    initialData: MonthlyCashflowPoint[]
}

export function CashflowChart({ initialData }: CashflowChartProps) {
    const [chartType, setChartType] = useState<'area' | 'bar'>('area')

    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-white">
                    Income vs. Expense Trend
                </CardTitle>
                <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1 border border-slate-700">
                    <button
                        onClick={() => setChartType('area')}
                        className={`rounded px-2 py-1 text-xs font-medium transition-all ${chartType === 'area'
                                ? 'bg-slate-700 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <AreaIcon className="h-3.5 w-3.5 inline mr-1" />
                        Area
                    </button>
                    <button
                        onClick={() => setChartType('bar')}
                        className={`rounded px-2 py-1 text-xs font-medium transition-all ${chartType === 'bar'
                                ? 'bg-slate-700 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
                        Bar
                    </button>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'area' ? (
                            <AreaChart data={initialData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px' }} />
                                <Area
                                    type="monotone"
                                    dataKey="income"
                                    name="Income"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#incomeGrad)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expense"
                                    name="Expense"
                                    stroke="#f43f5e"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#expenseGrad)"
                                />
                            </AreaChart>
                        ) : (
                            <BarChart data={initialData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px' }} />
                                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

interface CustomTooltipProps {
    active?: boolean
    payload?: Array<{
        dataKey: string
        value: number
    }>
    label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (active && payload && payload.length) {
        const income = payload.find((p) => p.dataKey === 'income')?.value || 0
        const expense = payload.find((p) => p.dataKey === 'expense')?.value || 0
        const net = income - expense

        return (
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
                <p className="text-xs font-semibold text-slate-300">{label}</p>
                <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-4">
                        <span className="text-emerald-400 font-medium">Income:</span>
                        <span className="font-semibold text-white">{formatCurrency(income, 'ETB')}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-rose-400 font-medium">Expense:</span>
                        <span className="font-semibold text-white">{formatCurrency(expense, 'ETB')}</span>
                    </div>
                    <div className="mt-1 border-t border-slate-700 pt-1 flex justify-between gap-4">
                        <span className="text-slate-400 font-medium">Net:</span>
                        <span className={`font-semibold ${net >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                            {formatCurrency(net, 'ETB')}
                        </span>
                    </div>
                </div>
            </div>
        )
    }
    return null
}