'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createDebt } from '@/actions/debt-actions'
import { DebtType } from '@/types/debt'

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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2 } from 'lucide-react'

const debtSchema = z.object({
    personName: z.string().min(1, 'Person or entity name is required'),
    type: z.enum(['owed_by_me', 'owed_to_me']),
    amount: z.number({ message: 'Amount must be greater than 0' }).positive('Amount must be greater than 0'),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
})

type DebtFormValues = z.infer<typeof debtSchema>

export function CreateDebtModal() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const form = useForm<DebtFormValues>({
        resolver: zodResolver(debtSchema),
        defaultValues: {
            personName: '',
            type: 'owed_by_me',
            amount: 0,
            dueDate: '',
            notes: '',
        },
    })

    const onSubmit = async (values: DebtFormValues) => {
        setLoading(true)
        setError('')

        try {
            await createDebt({
                personName: values.personName,
                type: values.type as DebtType,
                amount: values.amount,
                dueDate: values.dueDate || null,
                notes: values.notes || null,
            })
            setOpen(false)
            form.reset()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to add debt entry')
        } finally {
            setLoading(false)
        }
    }

    const selectedType = useWatch({ control: form.control, name: 'type' })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-xs font-medium" />}>
                <Plus className="h-4 w-4" /> Add Debt / Loan
            </DialogTrigger>

            <DialogContent className="sm:max-w-[440px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-base font-semibold">New Debt or Loan Entry</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                    {error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Type</Label>
                        <Select
                            value={selectedType}
                            onValueChange={(val) => val && form.setValue('type', val as 'owed_by_me' | 'owed_to_me')}
                        >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                <SelectValue placeholder="Select type">
                                    {selectedType === 'owed_by_me' ? 'I Owe Someone (I Borrowed)' : 'Someone Owes Me (I Lent)'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="owed_by_me">I Owe Someone (I Borrowed)</SelectItem>
                                <SelectItem value="owed_to_me">Someone Owes Me (I Lent)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Person / Entity Name</Label>
                        <Input
                            placeholder="e.g. Abebe Bikila or Commercial Bank"
                            {...form.register('personName')}
                            className="bg-slate-950 border-slate-800 text-xs text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Total Amount (ETB)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...form.register('amount', { valueAsNumber: true })}
                                className="bg-slate-950 border-slate-800 text-xs text-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Due Date (Optional)</Label>
                            <Input
                                type="date"
                                {...form.register('dueDate')}
                                className="bg-slate-950 border-slate-800 text-xs text-white p-2 [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Notes / Purpose (Optional)</Label>
                        <Textarea
                            placeholder="e.g. Rent share for September"
                            rows={2}
                            {...form.register('notes')}
                            className="bg-slate-950 border-slate-800 text-xs text-white resize-none"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs mt-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Debt Record'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}