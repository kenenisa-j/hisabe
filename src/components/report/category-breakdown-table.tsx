'use client'

import { CategoryDetailBreakdown } from '@/actions/report-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { CalendarDays, Receipt } from 'lucide-react'

interface CategoryBreakdownTableProps {
    categories: CategoryDetailBreakdown[]
    totalDays: number
    totalExpense: number
}

export function CategoryBreakdownTable({
    categories,
    totalDays,
    totalExpense,
}: CategoryBreakdownTableProps) {
    const overallDailyAverage = totalDays > 0 ? totalExpense / totalDays : 0

    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
                <div>
                    <CardTitle className="text-base font-semibold text-white">
                        Category Breakdown & Daily Spend Analysis
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">
                        Analyzing expenses across <span className="text-slate-200 font-medium">{totalDays} days</span> timeframe
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs">
                    <CalendarDays className="h-4 w-4 text-amber-400" />
                    <span className="text-slate-400">Overall Daily Burn:</span>
                    <span className="font-bold text-amber-400">{formatCurrency(overallDailyAverage, 'ETB')}/day</span>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {categories.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                        No expenses recorded for the selected date range.
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="border-b border-slate-800 bg-slate-950/50">
                            <TableRow className="hover:bg-transparent border-slate-800">
                                <TableHead className="text-slate-400 text-xs">Category</TableHead>
                                <TableHead className="text-right text-slate-400 text-xs">Total Amount</TableHead>
                                <TableHead className="w-[140px] text-slate-400 text-xs">% Share</TableHead>
                                <TableHead className="text-center text-slate-400 text-xs">Txns</TableHead>
                                <TableHead className="text-right text-slate-400 text-xs">Avg / Txn</TableHead>
                                <TableHead className="text-right text-slate-400 text-xs">Avg Daily Spend</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((cat) => (
                                <TableRow key={cat.categoryId} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                                    {/* Category Indicator & Name */}
                                    <TableCell className="font-medium text-xs">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <span className="text-slate-200 font-medium">{cat.categoryName}</span>
                                        </div>
                                    </TableCell>

                                    {/* Total Amount */}
                                    <TableCell className="text-right text-xs font-semibold text-rose-400">
                                        {formatCurrency(cat.totalAmount, 'ETB')}
                                    </TableCell>

                                    {/* Percentage Progress Bar */}
                                    <TableCell className="text-xs">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[11px] text-slate-400">
                                                <span>{cat.percentage}%</span>
                                            </div>
                                            <Progress
                                                value={cat.percentage}
                                                className="h-1.5 bg-slate-800"
                                                style={
                                                    {
                                                        '--progress-background': cat.color,
                                                    } as React.CSSProperties
                                                }
                                            />
                                        </div>
                                    </TableCell>

                                    {/* Transaction Count */}
                                    <TableCell className="text-center text-xs text-slate-300">
                                        <div className="inline-flex items-center gap-1 rounded bg-slate-950 px-2 py-0.5 border border-slate-800">
                                            <Receipt className="h-3 w-3 text-slate-400" />
                                            {cat.transactionCount}
                                        </div>
                                    </TableCell>

                                    {/* Avg per Transaction */}
                                    <TableCell className="text-right text-xs text-slate-300">
                                        {formatCurrency(cat.avgTransactionAmount, 'ETB')}
                                    </TableCell>

                                    {/* Avg Daily Spend */}
                                    <TableCell className="text-right text-xs font-semibold text-amber-300">
                                        {formatCurrency(cat.dailyAverageAmount, 'ETB')}
                                        <span className="text-[10px] text-slate-500 font-normal"> / day</span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}