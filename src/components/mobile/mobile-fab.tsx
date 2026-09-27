'use client'

import { useState } from 'react'
import { createQuickExpense } from '@/actions/quick-expense-action'
import { CustomKeypad } from './custom-keypad'
import { CategoryChips } from './category-chips'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { Plus, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Account {
    id: string
    name: string
}

interface Category {
    id: string
    name: string
}

interface MobileFABProps {
    accounts: Account[]
    categories: Category[]
}

export function MobileFAB({ accounts, categories }: MobileFABProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('0')
    const [description, setDescription] = useState('')
    const [accountId, setAccountId] = useState(accounts[0]?.id || '')
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        setError(null)
        const parsedAmount = parseFloat(amount)

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('Enter a valid amount')
            return
        }

        if (!accountId) {
            setError('Select an account')
            return
        }

        setLoading(true)
        try {
            const res = await createQuickExpense({
                amount: parsedAmount,
                description: description.trim() || 'Quick Expense',
                accountId,
                categoryId,
            })

            if (res.success) {
                setAmount('0')
                setDescription('')
                setOpen(false)
            } else if (res.errors) {
                const firstErr = Object.values(res.errors)[0]?.[0]
                setError(firstErr || 'Failed to add expense')
            }
        } catch {
            setError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {/* 48px Minimum Touch Target FAB */}
            <SheetTrigger>
                <Button
                    size="icon"
                    className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-950/60 z-50 flex items-center justify-center transition-transform active:scale-90 touch-manipulation"
                    aria-label="Quick Add Expense"
                >
                    <Plus className="h-7 w-7 stroke-[2.5]" />
                </Button>
            </SheetTrigger>

            <SheetContent
                className="border-slate-800 bg-slate-950 text-white rounded-t-2xl p-5 md:hidden max-h-[92vh] overflow-y-auto"
            >
                <SheetHeader className="pb-2 text-left">
                    <SheetTitle className="text-base font-semibold text-white flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-400 fill-emerald-400" />
                        3-Second Expense Entry
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-3 pt-1">
                    {error && (
                        <div className="text-xs font-medium text-rose-400 bg-rose-950/50 border border-rose-900/50 p-2.5 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Dynamic Amount Display */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                        <span className="text-xs text-slate-400 uppercase font-medium block mb-1">
                            Amount
                        </span>
                        <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                            ${amount}
                        </div>
                    </div>

                    {/* Note Input */}
                    <input
                        type="text"
                        placeholder="Note (e.g. Lunch, Coffee)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 touch-manipulation"
                    />

                    {/* Account Selector Chips */}
                    <div>
                        <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                            Account
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x touch-pan-x">
                            {accounts.map((acc) => {
                                const isSelected = accountId === acc.id
                                return (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => setAccountId(acc.id)}
                                        className={cn(
                                            'h-11 px-4 rounded-full border text-xs font-medium whitespace-nowrap transition-all snap-start shrink-0 active:scale-95 touch-manipulation',
                                            isSelected
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/50'
                                                : 'bg-slate-900 text-slate-400 border-slate-800'
                                        )}
                                    >
                                        {acc.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Category Chips Component */}
                    <CategoryChips
                        categories={categories}
                        selectedId={categoryId}
                        onSelect={setCategoryId}
                    />

                    {/* Custom Numeric Keypad */}
                    <CustomKeypad
                        value={amount}
                        onChange={setAmount}
                        onSubmit={handleSubmit}
                        loading={loading}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}