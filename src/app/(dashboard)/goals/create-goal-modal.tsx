'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createSavingsGoal } from '@/actions/savings-goal-actions'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trophy, Loader2 } from 'lucide-react'

const goalSchema = z.object({
    name: z.string().min(1, 'Goal name is required'),
    targetAmount: z.number({ message: 'Target amount must be greater than 0' }).positive('Target amount must be greater than 0'),
    targetDate: z.string().min(1, 'Target date is required'),
})

type GoalFormValues = z.infer<typeof goalSchema>

export function CreateGoalModal() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const form = useForm<GoalFormValues>({
        resolver: zodResolver(goalSchema),
        defaultValues: {
            name: '',
            targetAmount: 0,
            targetDate: '',
        },
    })

    const onSubmit = async (values: GoalFormValues) => {
        setLoading(true)
        setError('')

        try {
            await createSavingsGoal({
                name: values.name,
                targetAmount: values.targetAmount,
                targetDate: values.targetDate,
            })
            setOpen(false)
            form.reset()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create savings goal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs font-medium" />}>
                <Plus className="h-4 w-4" /> New Savings Goal
            </DialogTrigger>

            <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-base font-semibold flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-emerald-400" />
                        Create New Savings Goal
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                    {error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Goal Name</Label>
                        <Input
                            placeholder="e.g. Emergency Fund, New Laptop, Vacation"
                            {...form.register('name')}
                            className="bg-slate-950 border-slate-800 text-xs text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Target Amount (ETB)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...form.register('targetAmount', { valueAsNumber: true })}
                                className="bg-slate-950 border-slate-800 text-xs text-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Target Date</Label>
                            <Input
                                type="date"
                                {...form.register('targetDate')}
                                className="bg-slate-950 border-slate-800 text-xs text-white p-2 [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs mt-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Goal'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
