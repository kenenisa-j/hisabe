'use client'

import { useState } from 'react'
import {
    RecurringTransaction,
    executeRecurringTransaction,
    toggleRecurringActive,
} from '@/actions/recurring-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Calendar, Play, Check, AlertCircle, Clock, Loader2 } from 'lucide-react'

interface RecurringCardProps {
    item: RecurringTransaction
}

export function RecurringCard({ item }: RecurringCardProps) {
    const [loading, setLoading] = useState(false)
    const [executed, setExecuted] = useState(false)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDate = new Date(item.nextDueDate)
    dueDate.setHours(0, 0, 0, 0)

    const isDueToday = dueDate.getTime() === today.getTime()
    const isOverdue = dueDate.getTime() < today.getTime()

    const handleExecute = async () => {
        setLoading(true)
        try {
            await executeRecurringTransaction(item.id)
            setExecuted(true)
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to execute recurring entry')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleActive = async (checked: boolean) => {
        await toggleRecurringActive(item.id, checked)
    }

    const getStatusBadge = () => {
        if (!item.isActive) {
            return <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">Paused</span>
        }
        if (isOverdue) {
            return (
                <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                    <AlertCircle className="h-3 w-3" /> Overdue
                </span>
            )
        }
        if (isDueToday) {
            return (
                <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">
                    <Clock className="h-3 w-3" /> Due Today
                </span>
            )
        }
        return (
            <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                <Calendar className="h-3 w-3 text-slate-400" /> Upcoming
            </span>
        )
    }

    return (
        <Card className="border-slate-800 bg-slate-900 text-white transition-all hover:border-slate-700">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{item.description || 'Recurring Item'}</span>
                            {getStatusBadge()}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="capitalize font-medium text-slate-300">{item.frequency}</span>
                            <span>•</span>
                            <span>{item.accountName}</span>
                            {item.categoryName && (
                                <>
                                    <span>•</span>
                                    <span className="text-slate-400">{item.categoryName}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        <span
                            className={`text-base font-bold ${item.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                                }`}
                        >
                            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount, item.currency)}
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Next Due:</span>
                        <span className="font-medium text-slate-200">{formatDate(item.nextDueDate)}</span>
                        {item.autoRecord && (
                            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400 border border-blue-500/20">
                                Auto
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span>Active</span>
                            <Switch
                                checked={item.isActive}
                                onCheckedChange={handleToggleActive}
                                className="scale-75"
                            />
                        </div>

                        {item.isActive && (
                            <Button
                                size="sm"
                                onClick={handleExecute}
                                disabled={loading || executed}
                                className={`text-xs h-7 gap-1 font-medium ${isOverdue || isDueToday
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : executed ? (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-400" /> Recorded
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-3 w-3" /> Execute Now
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}