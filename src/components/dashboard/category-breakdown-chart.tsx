'use client'

import { CategoryBreakdownPoint } from '@/actions/category-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

interface CategoryBreakdownChartProps {
    data: CategoryBreakdownPoint[]
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
    const totalExpense = data.reduce((sum, item) => sum + item.amountEtb, 0)

    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-white">
                    Expenses by Category
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
                {data.length === 0 ? (
                    <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
                        No expenses recorded this month
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                        {/* Donut Chart */}
                        <div className="relative h-[220px] w-full sm:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip content={<CategoryTooltip />} />
                                    <Pie
                                        data={data}
                                        dataKey="amountEtb"
                                        nameKey="categoryName"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={3}
                                    >
                                        {data.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] uppercase font-medium text-slate-400">Total</span>
                                <span className="text-sm font-bold text-white">
                                    {formatCurrency(totalExpense, 'ETB')}
                                </span>
                            </div>
                        </div>

                        {/* Custom Legend / List */}
                        <div className="w-full space-y-2 sm:w-1/2">
                            {data.slice(0, 5).map((item) => (
                                <div key={item.categoryName} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 truncate">
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="truncate text-slate-300">{item.categoryName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 font-medium">
                                        <span className="text-slate-400">{item.percentage}%</span>
                                        <span className="text-white">{formatCurrency(item.amountEtb, 'ETB')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

interface CategoryTooltipProps {
    active?: boolean
    payload?: Array<{
        payload: CategoryBreakdownPoint
    }>
}

function CategoryTooltip({ active, payload }: CategoryTooltipProps) {
    if (active && payload && payload.length) {
        const data: CategoryBreakdownPoint = payload[0].payload
        return (
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 shadow-xl text-xs">
                <p className="font-semibold text-white">{data.categoryName}</p>
                <p className="mt-1 text-slate-300">
                    {formatCurrency(data.amountEtb, 'ETB')}{' '}
                    <span className="text-slate-400">({data.percentage}%)</span>
                </p>
            </div>
        )
    }
    return null
}