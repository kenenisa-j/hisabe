'use client'

import { useState } from 'react'
import { SavingsGoalProgress } from '@/actions/savings-goal-actions'
import { GoalCard } from './goal-card'
import { DepositModal } from './deposit-modal'
import { CreateGoalModal } from './create-goal-modal'
import { Trophy } from 'lucide-react'

interface GoalsContainerProps {
    goals: SavingsGoalProgress[]
    accounts: { id: string; name: string; balance: number }[]
}

export function GoalsContainer({ goals, accounts }: GoalsContainerProps) {
    const [selectedGoal, setSelectedGoal] = useState<SavingsGoalProgress | null>(null)
    const [depositOpen, setDepositOpen] = useState(false)

    const handleOpenDeposit = (goal: SavingsGoalProgress) => {
        setSelectedGoal(goal)
        setDepositOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Savings Goals</h1>
                    <p className="text-sm text-slate-400">
                        Track and allocate funds towards long-term objectives.
                    </p>
                </div>
                <CreateGoalModal />
            </div>

            {goals.length === 0 ? (
                <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center">
                    <Trophy className="h-10 w-10 text-slate-600 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No Active Savings Goals</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm">
                        Set up a target savings goal to begin allocating funds automatically.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {goals.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} onDeposit={handleOpenDeposit} />
                    ))}
                </div>
            )}

            <DepositModal
                goal={selectedGoal}
                accounts={accounts}
                open={depositOpen}
                onOpenChange={setDepositOpen}
            />
        </div>
    )
}