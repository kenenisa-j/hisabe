'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createRecurringTransaction } from '@/actions/recurring-actions'
import { RecurringFrequency } from '@/types/recurring'

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Loader2 } from 'lucide-react'

const recurringSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.number({ message: 'Please enter a valid amount' }).positive('Amount must be greater than 0'),
    type: z.enum(['income', 'expense', 'transfer']),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    accountId: z.string().min(1, 'Select an account'),
    categoryId: z.string(),
    startDate: z.string().min(1, 'Start date is required'),
    autoRecord: z.boolean(),
})

type RecurringFormValues = z.infer<typeof recurringSchema>

interface CreateRecurringModalProps {
    accounts: { id: string; name: string }[]
    categories: { id: string; name: string; type: string }[]
}

export function CreateRecurringModal({ accounts, categories }: CreateRecurringModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const todayStr = new Date().toISOString().split('T')[0]

    const form = useForm<RecurringFormValues>({
        resolver: zodResolver(recurringSchema),
        defaultValues: {
            description: '',
            amount: 0,
            type: 'expense',
            frequency: 'monthly',
            accountId: accounts[0]?.id || '',
            categoryId: '',
            startDate: todayStr,
            autoRecord: true,
        },
    })

    const selectedType = useWatch({ control: form.control, name: 'type' })
    const selectedFrequency = useWatch({ control: form.control, name: 'frequency' })
    const selectedAccountId = useWatch({ control: form.control, name: 'accountId' })
    const selectedCategoryId = useWatch({ control: form.control, name: 'categoryId' })
    const autoRecord = useWatch({ control: form.control, name: 'autoRecord' })
    const filteredCategories = categories.filter((c) => c.type === selectedType)

    const onSubmit = async (values: RecurringFormValues) => {
        setLoading(true)
        setError('')

        try {
            await createRecurringTransaction({
                description: values.description,
                amount: values.amount,
                type: values.type,
                frequency: values.frequency as RecurringFrequency,
                accountId: values.accountId,
                categoryId: values.categoryId || null,
                startDate: values.startDate,
                autoRecord: values.autoRecord,
            })
            setOpen(false)
            form.reset()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to schedule recurring rule')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-xs font-medium" />}>
                <Plus className="h-4 w-4" /> Schedule Recurring Bill
            </DialogTrigger>

            <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-base font-semibold">New Recurring Transaction</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                    {error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Transaction Type</Label>
                            <Select
                                value={selectedType}
                                onValueChange={(val: string | null) => val && form.setValue('type', val as 'income' | 'expense' | 'transfer')}
                            >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Frequency</Label>
                            <Select
                                value={selectedFrequency}
                                onValueChange={(val: string | null) => val && form.setValue('frequency', val as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                            >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                    <SelectValue placeholder="Frequency" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Description (e.g. House Rent, Fiber Wi-Fi)</Label>
                        <Input
                            placeholder="e.g. House Rent"
                            {...form.register('description')}
                            className="bg-slate-950 border-slate-800 text-xs text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Amount (ETB)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...form.register('amount', { valueAsNumber: true })}
                                className="bg-slate-950 border-slate-800 text-xs text-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">First Due Date</Label>
                            <Input
                                type="date"
                                {...form.register('startDate')}
                                className="bg-slate-950 border-slate-800 text-xs text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Account</Label>
                            <Select
                                value={selectedAccountId}
                                onValueChange={(val) => form.setValue('accountId', val || '')}
                            >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                    <SelectValue placeholder="Account" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {accounts.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Category</Label>
                            <Select
                                value={selectedCategoryId || ''}
                                onValueChange={(val) => form.setValue('categoryId', val || '')}
                            >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {filteredCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-medium text-slate-200">Auto-Record Transaction</Label>
                            <p className="text-[11px] text-slate-400">
                                Automatically create entries when cron runs on due date
                            </p>
                        </div>
                        <Switch
                            checked={autoRecord}
                            onCheckedChange={(val) => form.setValue('autoRecord', val)}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs mt-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Recurring Schedule'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}