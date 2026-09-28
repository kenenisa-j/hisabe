'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { depositToGoal } from '@/actions/savings-goal-actions'
import { SavingsGoalProgress } from '@/types/savings-goal'
import { formatCurrency } from '@/lib/utils'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PiggyBank, Loader2, ArrowRight } from 'lucide-react'

const depositSchema = z.object({
    accountId: z.string().min(1, 'Select a funding account'),
    amount: z.number({ message: 'Deposit amount must be greater than 0' }).positive('Deposit amount must be greater than 0'),
})

type DepositFormValues = z.infer<typeof depositSchema>

interface DepositModalProps {
    goal: SavingsGoalProgress | null
    accounts: { id: string; name: string; balance: number }[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DepositModal({ goal, accounts, open, onOpenChange }: DepositModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const form = useForm<DepositFormValues>({
        resolver: zodResolver(depositSchema),
        defaultValues: {
            accountId: accounts[0]?.id || '',
            amount: 0,
        },
    })

    const selectedAccountId = useWatch({ control: form.control, name: 'accountId' })

    if (!goal) return null

    const onSubmit = async (values: DepositFormValues) => {
        setLoading(true)
        setError('')

        try {
            await depositToGoal({
                goalId: goal.id,
                accountId: values.accountId,
                amount: values.amount,
            })
            onOpenChange(false)
            form.reset()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to process deposit allocation')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-base font-semibold flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-emerald-400" />
                        Deposit Funds to Goal
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                    {error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-xs space-y-1">
                        <span className="text-slate-400">Target Goal:</span>
                        <p className="font-semibold text-white">{goal.name}</p>
                        <p className="text-slate-400">
                            Remaining Target:{' '}
                            <span className="text-emerald-400 font-medium">
                                {formatCurrency(goal.remainingAmount, 'ETB')}
                            </span>
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Funding Account</Label>
                        <Select
                            value={selectedAccountId}
                            onValueChange={(val) => form.setValue('accountId', val || '')}
                        >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                <SelectValue placeholder="Select Account">
                                    {accounts.find((a) => a.id === selectedAccountId)?.name || 'Select Account'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                {accounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name} ({formatCurrency(a.balance, 'ETB')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Allocation Amount (ETB)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...form.register('amount', { valueAsNumber: true })}
                            className="bg-slate-950 border-slate-800 text-sm font-semibold text-white focus-visible:ring-emerald-500"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium mt-2 gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                Confirm Transfer <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}