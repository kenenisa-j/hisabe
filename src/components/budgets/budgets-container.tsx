'use client'

import { useState } from 'react'
import { BudgetProgress } from '@/actions/budget-actions'
import { BudgetCard } from './budget-card'
import { BudgetModal } from './budget-modal'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Target, PiggyBank, AlertTriangle, Plus } from 'lucide-react'

interface BudgetsContainerProps {
    budgets: BudgetProgress[]
    categories: { id: string; name: string }[]
    currentMonth: number
    currentYear: number
}

export function BudgetsContainer({
    budgets,
    categories,
    currentMonth,
    currentYear,
}: BudgetsContainerProps) {
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedBudget, setSelectedBudget] = useState<BudgetProgress | null>(null)

    const handleCreateNew = () => {
        setSelectedBudget(null)
        setModalOpen(true)
    }

    const handleEdit = (budget: BudgetProgress) => {
        setSelectedBudget(budget)
        setModalOpen(true)
    }

    // Aggregates
    const totalBudgeted = budgets.reduce((acc, b) => acc + b.amount, 0)
    const totalSpent = budgets.reduce((acc, b) => acc + b.spentAmount, 0)
    const totalOverBudgetCount = budgets.filter((b) => b.isOverBudget).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Monthly Budgets</h1>
                    <p className="text-sm text-slate-400">
                        Set and track expense category limits for target discipline.
                    </p>
                </div>

                <Button onClick={handleCreateNew} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium">
                    <Plus className="h-4 w-4" /> Set Budget Limit
                </Button>
            </div>

            {/* Summary Banner */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <Target className="h-4 w-4 text-emerald-400" />
                        Total Budget Limit
                    </div>
                    <p className="mt-2 text-xl font-bold text-white">
                        {formatCurrency(totalBudgeted, 'ETB')}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <PiggyBank className="h-4 w-4 text-blue-400" />
                        Total Budgeted Spent
                    </div>
                    <p className="mt-2 text-xl font-bold text-white">
                        {formatCurrency(totalSpent, 'ETB')}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                        Exceeded Categories
                    </div>
                    <p className="mt-2 text-xl font-bold text-rose-400">{totalOverBudgetCount}</p>
                </div>
            </div>

            {/* Grid of Budget Cards */}
            {budgets.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 text-center p-6">
                    <Target className="h-10 w-10 text-slate-600 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No Budget Targets Set</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm">
                        You haven&apos;t configured target limits for this month yet. Click above to assign category limits.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {budgets.map((budget) => (
                        <BudgetCard key={budget.id} budget={budget} onEdit={handleEdit} />
                    ))}
                </div>
            )}

            <BudgetModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                categories={categories}
                currentMonth={currentMonth}
                currentYear={currentYear}
                selectedBudget={selectedBudget}
            />
        </div>
    )
}
