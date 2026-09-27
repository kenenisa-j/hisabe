'use client'

import { RecurringTransaction } from '@/actions/recurring-actions'
import { RecurringCard } from '@/components/recurring/recurring-card'
import { CreateRecurringModal } from '@/components/recurring/create-recurring-modal'
import { RefreshCw } from 'lucide-react'

interface RecurringContainerProps {
    recurringItems: RecurringTransaction[]
    accounts: { id: string; name: string }[]
    categories: { id: string; name: string; type: string }[]
}

export function RecurringContainer({
    recurringItems,
    accounts,
    categories,
}: RecurringContainerProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Recurring Bills & Subscriptions</h1>
                    <p className="text-sm text-slate-400">
                        Manage scheduled rent, internet, salaries, and recurring payments.
                    </p>
                </div>
                <CreateRecurringModal accounts={accounts} categories={categories} />
            </div>

            {recurringItems.length === 0 ? (
                <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center">
                    <RefreshCw className="h-10 w-10 text-slate-600 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No Recurring Bills Scheduled</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm">
                        Schedule recurring subscriptions or rent payments to track upcoming due dates automatically.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {recurringItems.map((item) => (
                        <RecurringCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    )
}