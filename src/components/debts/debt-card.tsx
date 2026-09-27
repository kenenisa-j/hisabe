'use client'

import { Debt, deleteDebt } from '@/actions/debt-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RepaymentModal } from '@/components/debts/repayment-modal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowUpRight, ArrowDownLeft, Trash2, Calendar } from 'lucide-react'

interface DebtCardProps {
    debt: Debt
    accounts: { id: string; name: string }[]
}

export function DebtCard({ debt, accounts }: DebtCardProps) {
    const isOwedByMe = debt.type === 'owed_by_me'
    const progressPercent = Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100))

    const handleDelete = async () => {
        if (confirm(`Delete debt record for ${debt.personName}?`)) {
            await deleteDebt(debt.id)
        }
    }

    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`p-2 rounded-lg ${isOwedByMe ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                                }`}
                        >
                            {isOwedByMe ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-slate-100">{debt.personName}</h4>
                            <p className="text-[11px] text-slate-400">
                                {isOwedByMe ? 'I owe (Borrowed)' : 'Owes me (Lent)'}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span
                            className={`text-base font-bold ${isOwedByMe ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                        >
                            {formatCurrency(debt.remainingAmount, debt.currency)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                            Total: {formatCurrency(debt.amount, debt.currency)}
                        </p>
                    </div>
                </div>

                {/* Repayment Progress Bar */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                        <span>Repaid: {formatCurrency(debt.paidAmount, debt.currency)}</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5 bg-slate-950" />
                </div>

                {debt.notes && (
                    <p className="text-xs text-slate-400 italic bg-slate-950/50 p-2 rounded border border-slate-800/50">
                        &quot;{debt.notes}&quot;
                    </p>
                )}

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {debt.dueDate ? (
                            <>
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span>Due: {formatDate(debt.dueDate)}</span>
                            </>
                        ) : (
                            <span className="text-slate-400">No due date</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {debt.status !== 'settled' && <RepaymentModal debt={debt} accounts={accounts} />}
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleDelete}
                            className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}