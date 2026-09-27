'use client'

import { BudgetProgress, deleteBudget } from '@/actions/budget-actions'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react'

interface BudgetCardProps {
    budget: BudgetProgress
    onEdit: (budget: BudgetProgress) => void
}

export function BudgetCard({ budget, onEdit }: BudgetCardProps) {
    const { id, categoryName, amount, spentAmount, remainingAmount, percentageUsed } = budget

    // Step 3 Threshold States
    const isCritical = percentageUsed >= 100 // 100%+ Red Trigger
    const isWarning = percentageUsed >= 80 && percentageUsed < 100 // 80%-99% Amber Trigger

    const getProgressColor = () => {
        if (isCritical) return 'bg-rose-500'
        if (isWarning) return 'bg-amber-500'
        return 'bg-emerald-500'
    }

    const getCardBorder = () => {
        if (isCritical) return 'border-rose-500/40 bg-rose-950/10'
        if (isWarning) return 'border-amber-500/40 bg-amber-950/10'
        return 'border-slate-800 bg-slate-900'
    }

    const handleDelete = async () => {
        if (confirm(`Remove budget limit for ${categoryName}?`)) {
            await deleteBudget(id)
        }
    }

    return (
        <Card className={`transition-all ${getCardBorder()} text-white`}>
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-white">{categoryName}</h3>
                        {/* Dynamic Status Badges */}
                        {isCritical ? (
                            <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30 animate-pulse">
                                <AlertTriangle className="h-3 w-3 text-rose-400" /> 100%+ Exceeded
                            </span>
                        ) : isWarning ? (
                            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">
                                <AlertCircle className="h-3 w-3 text-amber-400" /> 80%+ Caution
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> On Track
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(budget)}
                            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDelete}
                            className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Amount Summary */}
                <div className="mt-4 flex items-baseline justify-between text-xs">
                    <div>
                        <span className="text-slate-400">Spent: </span>
                        <span className={`font-bold ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-white'}`}>
                            {formatCurrency(spentAmount, 'ETB')}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-400">Target: </span>
                        <span className="font-semibold text-slate-300">{formatCurrency(amount, 'ETB')}</span>
                    </div>
                </div>

                {/* Dynamic Progress Bar */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                    <div
                        className={`h-full transition-all duration-500 ${getProgressColor()}`}
                        style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                    />
                </div>

                {/* Progress Footer */}
                <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className={isCritical ? 'text-rose-400 font-medium' : isWarning ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                        {percentageUsed}% used
                    </span>
                    <span className="text-slate-400">
                        {isCritical
                            ? `${formatCurrency(Math.abs(remainingAmount), 'ETB')} over`
                            : `${formatCurrency(remainingAmount, 'ETB')} left`}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}