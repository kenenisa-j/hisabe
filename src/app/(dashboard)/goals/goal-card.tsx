'use client'

import { SavingsGoalProgress, deleteSavingsGoal } from '@/actions/savings-goal-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Clock, PlusCircle, Trash2, Sparkles } from 'lucide-react'

interface GoalCardProps {
    goal: SavingsGoalProgress
    onDeposit: (goal: SavingsGoalProgress) => void
}

export function GoalCard({ goal, onDeposit }: GoalCardProps) {
    const {
        id,
        name,
        targetAmount,
        currentAmount,
        remainingAmount,
        percentageCompleted,
        isCompleted,
        daysRemaining,
        targetDate,
    } = goal

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete goal "${name}"?`)) {
            await deleteSavingsGoal(id)
        }
    }

    // Milestone Badge Logic
    const getMilestoneBadge = () => {
        if (isCompleted) {
            return (
                <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    <Trophy className="h-3 w-3 text-emerald-400" /> Goal Reached!
                </span>
            )
        }
        if (percentageCompleted >= 75) {
            return (
                <span className="flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                    <Sparkles className="h-3 w-3 text-purple-400" /> Final Stretch (75%+)
                </span>
            )
        }
        if (percentageCompleted >= 50) {
            return (
                <span className="flex items-center gap-1 rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                    Halfway There!
                </span>
            )
        }
        return (
            <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                In Progress
            </span>
        )
    }

    return (
        <Card className="border-slate-800 bg-slate-900 text-white transition-all hover:border-slate-700">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="font-semibold text-base text-white">{name}</h3>
                        <div className="mt-1.5 flex items-center gap-2">{getMilestoneBadge()}</div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDelete}
                        className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {/* Dynamic Balance Overview */}
                <div className="mt-4 flex items-baseline justify-between">
                    <div>
                        <span className="text-xs text-slate-400">Saved: </span>
                        <span className="text-lg font-bold text-emerald-400">
                            {formatCurrency(currentAmount, 'ETB')}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400">Target: </span>
                        <span className="text-xs font-semibold text-slate-300">
                            {formatCurrency(targetAmount, 'ETB')}
                        </span>
                    </div>
                </div>

                {/* Progress Bar Track */}
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                    <div
                        className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-400' : 'bg-blue-500'
                            }`}
                        style={{ width: `${percentageCompleted}%` }}
                    />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">{percentageCompleted}% Complete</span>
                    <span>
                        {isCompleted
                            ? 'Target Accomplished'
                            : `${formatCurrency(remainingAmount, 'ETB')} remaining`}
                    </span>
                </div>

                {/* Days Countdown & Action Button */}
                <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>
                            {isCompleted
                                ? 'Completed'
                                : daysRemaining > 0
                                    ? `${daysRemaining} days left (${formatDate(targetDate)})`
                                    : `Target date passed (${formatDate(targetDate)})`}
                        </span>
                    </div>

                    {!isCompleted && (
                        <Button
                            size="sm"
                            onClick={() => onDeposit(goal)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 gap-1 font-medium"
                        >
                            <PlusCircle className="h-3.5 w-3.5" /> Deposit
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}