'use client'

import { useState, useEffect, useTransition } from 'react'
import { Debt, recordDebtRepayment, settleDebtInFull } from '@/actions/debt-actions'
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
import { HandCoins, CheckCircle2, Loader2, Building2, AlertCircle } from 'lucide-react'

interface RepaymentModalProps {
    debt: Debt
    accounts: DebtsAccountOption[]
}

export function RepaymentModal({ debt, accounts }: RepaymentModalProps) {
    const defaultAccId = (debt.accountId && accounts.some((a) => a.id === debt.accountId))
        ? debt.accountId
        : (accounts[0]?.id || '')

    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState(debt.remainingAmount.toString())
    const [accountId, setAccountId] = useState(defaultAccId)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [, startDialogTransition] = useTransition()

    useEffect(() => {
        if (open) {
            startDialogTransition(() => {
                setAmount(debt.remainingAmount.toString())
                setAccountId(
                    (debt.accountId && accounts.some((a) => a.id === debt.accountId))
                        ? debt.accountId
                        : (accounts[0]?.id || '')
                )
                setError('')
            })
        }
    }, [open, debt.remainingAmount, debt.accountId, accounts])

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
                accountId: accountId && accountId !== 'none' ? accountId : undefined,
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
            await settleDebtInFull(debt.id, accountId && accountId !== 'none' ? accountId : undefined)
            setOpen(false)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to settle debt')
        } finally {
            setLoading(false)
        }
    }

    const selectedAcc = accounts.find((acc) => acc.id === accountId)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 gap-1.5" />}>
                <HandCoins className="h-3.5 w-3.5 text-blue-400" /> Payment / Settle
            </DialogTrigger>

            <DialogContent className="sm:max-w-[440px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
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

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-400">
                            <span>Total Original Debt:</span>
                            <span className="text-slate-200 font-medium">{formatCurrency(debt.amount, debt.currency)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>Remaining Balance:</span>
                            <span className="text-amber-400 font-semibold">{formatCurrency(debt.remainingAmount, debt.currency)}</span>
                        </div>
                        {debt.accountName && (
                            <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/80">
                                <span>Original Linked Account:</span>
                                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                    <BankBrandLogo
                                        name={debt.accountName}
                                        type={debt.accountType || 'bank'}
                                        size="sm"
                                        className="w-4 h-4 rounded"
                                    />
                                    {debt.accountName}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-blue-400" />
                            Target Payment Account
                        </Label>
                        <Select value={accountId || 'none'} onValueChange={(val) => setAccountId(val || '')}>
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white min-h-[40px]">
                                <SelectValue placeholder="Select Account">
                                    {selectedAcc ? (
                                        <div className="flex items-center justify-between w-full pr-2">
                                            <div className="flex items-center gap-2">
                                                <BankBrandLogo
                                                    name={selectedAcc.name}
                                                    type={selectedAcc.type || 'bank'}
                                                    size="sm"
                                                    className="w-5 h-5 rounded"
                                                />
                                                <span className="font-medium text-white">{selectedAcc.name}</span>
                                            </div>
                                            {selectedAcc.balance !== undefined && (
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    Bal: {formatCurrency(selectedAcc.balance, selectedAcc.currency || 'ETB')}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">None (Do not change bank balance)</span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-56">
                                <SelectItem value="none" className="text-slate-400 text-xs py-2">
                                    None (Do not alter bank account balance)
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
                        <p className="text-[10px] text-slate-400">
                            {accountId && accountId !== 'none'
                                ? debt.type === 'owed_by_me'
                                    ? 'Amount will be deducted from this account and logged as an expense.'
                                    : 'Amount will be added to this account and logged as income.'
                                : 'Repayment will be logged without modifying any bank account balances.'}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Partial Repayment Amount (ETB)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-xs text-white"
                        />
                        {parseFloat(amount) <= 0 && (
                            <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                Repayment amount must be greater than 0 ETB (cannot be zero or negative).
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                            type="submit"
                            disabled={loading || parseFloat(amount) <= 0}
                            className={`font-medium text-xs transition-all ${
                                parseFloat(amount) <= 0
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
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