'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createDebt } from '@/actions/debt-actions'
import { DebtType } from '@/types/debt'
import { formatCurrency } from '@/lib/utils'
import { BankBrandLogo } from '@/components/accounts/bank-brand-logo'
import { DebtsAccountOption } from '@/components/debts/debts-container'

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
import { Plus, Loader2, ArrowDownLeft, ArrowUpRight, AlertCircle, Building2 } from 'lucide-react'

const debtSchema = z.object({
    personName: z.string().min(1, 'Person or entity name is required'),
    type: z.enum(['owed_by_me', 'owed_to_me']),
    amount: z.number({ message: 'Amount must be greater than 0' }).positive('Amount must be greater than 0'),
    accountId: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
})

type DebtFormValues = z.infer<typeof debtSchema>

interface CreateDebtModalProps {
    accounts?: DebtsAccountOption[]
}

export function CreateDebtModal({ accounts = [] }: CreateDebtModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const form = useForm<DebtFormValues>({
        resolver: zodResolver(debtSchema),
        defaultValues: {
            personName: '',
            type: 'owed_by_me',
            amount: 0,
            accountId: accounts[0]?.id || '',
            dueDate: '',
            notes: '',
        },
    })

    const selectedType = useWatch({ control: form.control, name: 'type' })
    const selectedAccountId = useWatch({ control: form.control, name: 'accountId' })
    const currentAmount = useWatch({ control: form.control, name: 'amount' }) || 0

    const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId)
    const isOverdraftRisk =
        selectedType === 'owed_to_me' &&
        selectedAccount &&
        selectedAccount.balance !== undefined &&
        currentAmount > selectedAccount.balance

    const onSubmit = async (values: DebtFormValues) => {
        if (values.amount <= 0) {
            setError('Amount must be greater than 0 ETB. Negative numbers and zero are not allowed.')
            return
        }

        if (isOverdraftRisk) {
            setError(
                `You cannot lend ${formatCurrency(values.amount, 'ETB')} because ${selectedAccount?.name} only has ${formatCurrency(selectedAccount?.balance || 0, 'ETB')} in your account. You cannot lend more than what you have.`
            )
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await createDebt({
                personName: values.personName.trim(),
                type: values.type as DebtType,
                amount: values.amount,
                accountId: values.accountId && values.accountId !== 'none' ? values.accountId : null,
                dueDate: values.dueDate || null,
                notes: values.notes || null,
            })
            if (!res.success) {
                setError(res.error || 'Failed to add debt entry')
                return
            }
            setOpen(false)
            form.reset({
                personName: '',
                type: 'owed_by_me',
                amount: 0,
                accountId: accounts[0]?.id || '',
                dueDate: '',
                notes: '',
            })
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to add debt entry')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-xs font-medium" />}>
                <Plus className="h-4 w-4" /> Add Debt / Loan
            </DialogTrigger>

            <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-base font-semibold">New Debt or Loan Entry</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                    {error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* Type selection */}
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

                    {/* Bank / Payment Account Selection */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                                Bank / Payment Account
                            </Label>
                            <span className="text-[10px] text-slate-400">
                                {selectedType === 'owed_by_me' ? 'Account to receive money' : 'Account to disburse money'}
                            </span>
                        </div>
                        <Select
                            value={selectedAccountId || 'none'}
                            onValueChange={(val) => form.setValue('accountId', val || '')}
                        >
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white min-h-[40px]">
                                <SelectValue placeholder="Select Bank / Account">
                                    {selectedAccount ? (
                                        <div className="flex items-center justify-between w-full pr-2">
                                            <div className="flex items-center gap-2">
                                                <BankBrandLogo
                                                    name={selectedAccount.name}
                                                    type={selectedAccount.type || 'bank'}
                                                    size="sm"
                                                    className="w-5 h-5 rounded"
                                                />
                                                <span className="font-medium text-white">{selectedAccount.name}</span>
                                            </div>
                                            {selectedAccount.balance !== undefined && (
                                                <span className="text-[11px] text-slate-400">
                                                    Bal: {formatCurrency(selectedAccount.balance, selectedAccount.currency || 'ETB')}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">None (Track without updating bank balance)</span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-56">
                                <SelectItem value="none" className="text-slate-400 text-xs py-2">
                                    None (Track only — do not change bank balance)
                                </SelectItem>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id} className="text-xs py-2">
                                        <div className="flex items-center justify-between w-full gap-4">
                                            <div className="flex items-center gap-2">
                                                <BankBrandLogo
                                                    name={acc.name}
                                                    type={acc.type || 'bank'}
                                                    size="sm"
                                                    className="w-5 h-5 rounded"
                                                />
                                                <div>
                                                    <span className="font-medium text-white">{acc.name}</span>
                                                    <span className="text-[10px] text-slate-500 capitalize ml-1.5">
                                                        ({acc.type || 'bank'})
                                                    </span>
                                                </div>
                                            </div>
                                            {acc.balance !== undefined && (
                                                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                                    {formatCurrency(acc.balance, acc.currency || 'ETB')}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Interactive Dynamic Effect Indicator */}
                        {selectedAccount && selectedAccountId !== 'none' && currentAmount > 0 && (
                            <div
                                className={`p-2.5 rounded-lg border text-[11px] space-y-1 transition-all ${
                                    selectedType === 'owed_by_me'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 font-medium">
                                    {selectedType === 'owed_by_me' ? (
                                        <>
                                            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                                            <span>
                                                Deposit into <strong>{selectedAccount.name}</strong>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />
                                            <span>
                                                Deduct from <strong>{selectedAccount.name}</strong>
                                            </span>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    {selectedType === 'owed_by_me'
                                        ? `Your ${selectedAccount.name} balance will INCREASE by ${formatCurrency(currentAmount, 'ETB')} and be logged as income.`
                                        : `Your ${selectedAccount.name} balance will DECREASE by ${formatCurrency(currentAmount, 'ETB')} and be logged as an expense.`}
                                </p>
                            </div>
                        )}

                        {isOverdraftRisk && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-rose-200">
                                        Cannot Lend More Than Available Balance
                                    </p>
                                    <p className="text-[11px] text-rose-300/90 leading-relaxed">
                                        You are trying to lend {formatCurrency(currentAmount, 'ETB')}, but {selectedAccount?.name} only has {formatCurrency(selectedAccount?.balance || 0, 'ETB')} in your account. You cannot lend more than what you have.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Person / Entity Name */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Person / Entity Name</Label>
                        <Input
                            placeholder="e.g. Abebe Bikila or Commercial Bank"
                            {...form.register('personName')}
                            className="bg-slate-950 border-slate-800 text-xs text-white"
                        />
                    </div>

                    {/* Amount & Due Date */}
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
                            {currentAmount <= 0 && (
                                <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    Amount must be greater than 0 ETB (cannot be zero or negative).
                                </p>
                            )}
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

                    {/* Notes */}
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
                        disabled={loading || isOverdraftRisk || currentAmount <= 0}
                        className={`w-full font-medium text-xs mt-2 transition-all ${
                            isOverdraftRisk || currentAmount <= 0
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : currentAmount <= 0 ? (
                            'Enter Amount Greater Than 0'
                        ) : isOverdraftRisk ? (
                            'Insufficient Account Balance'
                        ) : (
                            'Save Debt Record'
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}