'use client'

import { useState } from 'react'
import { Debt, recordDebtRepayment, settleDebtInFull } from '@/actions/debt-actions'
import { formatCurrency } from '@/lib/utils'

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
import { HandCoins, CheckCircle2, Loader2 } from 'lucide-react'

interface RepaymentModalProps {
    debt: Debt
    accounts: { id: string; name: string }[]
}

export function RepaymentModal({ debt, accounts }: RepaymentModalProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState(debt.remainingAmount.toString())
    const [accountId, setAccountId] = useState(accounts[0]?.id || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRepay = async (e: React.FormEvent) => {
        e.preventDefault()
        const payVal = parseFloat(amount)

        if (isNaN(payVal) || payVal <= 0) {
            setError('Please enter a valid repayment amount')
            return
        }

        if (payVal > debt.remainingAmount) {
            setError(`Amount cannot exceed remaining debt of ${formatCurrency(debt.remainingAmount, debt.currency)}`)
            return
        }

        setLoading(true)
        setError('')

        try {
            await recordDebtRepayment({
                debtId: debt.id,
                amount: payVal,
                accountId: accountId || undefined,
            })
            setOpen(false)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to record repayment')
        } finally {
            setLoading(false)
        }
    }

    const handleSettleFull = async () => {
        setLoading(true)
        setError('')

        try {
            await settleDebtInFull(debt.id, accountId || undefined)
            setOpen(false)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to settle debt')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 gap-1.5" />}>
                <HandCoins className="h-3.5 w-3.5 text-blue-400" /> Payment / Settle
            </DialogTrigger>

            <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-base font-semibold">
                        Process Payment — {debt.personName}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleRepay} className="space-y-4 pt-3">
                    {error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400">
                            <span>Total Original Debt:</span>
                            <span className="text-slate-200 font-medium">{formatCurrency(debt.amount, debt.currency)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>Remaining Balance:</span>
                            <span className="text-amber-400 font-semibold">{formatCurrency(debt.remainingAmount, debt.currency)}</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Target Payment Account</Label>
                        <Select value={accountId} onValueChange={(val) => setAccountId(val || '')}>
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                <SelectValue placeholder="Select Account" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-400">
                            {debt.type === 'owed_by_me'
                                ? 'Amount will be deducted from this account and logged as an expense.'
                                : 'Amount will be added to this account and logged as income.'}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Partial Repayment Amount (ETB)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-xs text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Partial'}
                        </Button>

                        <Button
                            type="button"
                            disabled={loading}
                            onClick={handleSettleFull}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Settle Remaining
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}