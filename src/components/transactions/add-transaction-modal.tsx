'use client'

import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createTransaction } from '@/actions/transaction-actions'
import { createTransfer } from '@/actions/transfer-actions'
import { createCategory } from '@/actions/category-actions'

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Command, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Loader2 } from 'lucide-react'

const modalFormSchema = z
    .object({
        mode: z.enum(['expense', 'income', 'transfer']),
        amount: z.number({ message: 'Please enter a valid amount' }).positive('Amount must be greater than 0'),
        fromAccountId: z.string().min(1, 'Select source account'),
        toAccountId: z.string(),
        categoryId: z.string(),
        fee: z.number().min(0),
        date: z.string().min(1, 'Date is required'),
        description: z.string(),
    })
    .refine(
        (data) => {
            if (data.mode === 'transfer') {
                return !!data.toAccountId && data.fromAccountId !== data.toAccountId
            }
            return true
        },
        {
            message: 'Destination account must be different from source account',
            path: ['toAccountId'],
        }
    )

type ModalFormValues = z.infer<typeof modalFormSchema>

interface AddTransactionModalProps {
    accounts: { id: string; name: string; currency: string }[]
    categories: { id: string; name: string; type: 'income' | 'expense' }[]
    open?: boolean
    onOpenChange?: (open: boolean) => void
    initialMode?: 'expense' | 'income' | 'transfer'
    triggerButton?: React.ReactNode
}

const AMOUNT_PRESETS = [50, 100, 200, 500, 1000]

export function AddTransactionModal({
    accounts,
    categories: initialCategories,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    initialMode = 'expense',
    triggerButton,
}: AddTransactionModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = (val: boolean) => {
        if (controlledOnOpenChange) controlledOnOpenChange(val)
        if (!isControlled) setInternalOpen(val)
    }

    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [categoryList, setCategoryList] = useState(initialCategories)
    const [prevInitial, setPrevInitial] = useState(initialCategories)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [categoryLoading, setCategoryLoading] = useState(false)

    const todayStr = new Date().toISOString().substring(0, 10)
    const defaultAccount = accounts[0]?.id || ''
    const secondaryAccount = accounts[1]?.id || defaultAccount

    if (prevInitial !== initialCategories) {
        setPrevInitial(initialCategories)
        setCategoryList(initialCategories)
    }

    const form = useForm<ModalFormValues>({
        resolver: zodResolver(modalFormSchema),
        defaultValues: {
            mode: initialMode,
            amount: 0,
            fromAccountId: defaultAccount,
            toAccountId: secondaryAccount,
            categoryId: '',
            fee: 0,
            date: todayStr,
            description: '',
        },
    })

    // Reset mode when initialMode changes or modal opens
    useEffect(() => {
        if (open && initialMode) {
            form.setValue('mode', initialMode)
        }
    }, [open, initialMode, form])

    const mode = useWatch({ control: form.control, name: 'mode' }) || 'expense'
    const fromAccountId = useWatch({ control: form.control, name: 'fromAccountId' })
    const toAccountId = useWatch({ control: form.control, name: 'toAccountId' })
    const categoryId = useWatch({ control: form.control, name: 'categoryId' })

    const filteredCategories = categoryList.filter(
        (c, idx, self) =>
            (c.type === mode || !c.type) &&
            c.name.toLowerCase() !== 'transfer' &&
            self.findIndex((t) => t.name.toLowerCase() === c.name.toLowerCase()) === idx
    )

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(!open)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open])

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return
        setCategoryLoading(true)
        try {
            const catType: 'income' | 'expense' = mode === 'income' ? 'income' : 'expense'
            const res = await createCategory(newCategoryName.trim(), catType)
            if (res.success && res.id) {
                const newCat: { id: string; name: string; type: 'income' | 'expense'; icon?: string | null } = {
                    id: res.id,
                    name: res.name,
                    type: catType,
                    icon: res.icon ?? null,
                }
                setCategoryList((prev) => [newCat, ...prev])
                form.setValue('categoryId', res.id)
                setNewCategoryName('')
                setIsCreatingCategory(false)
            }
        } catch (e: unknown) {
            const err = e as Error
            setErrorMsg(err?.message || 'Failed to create category')
        } finally {
            setCategoryLoading(false)
        }
    }

    const onSubmit = async (values: ModalFormValues) => {
        setLoading(true)
        setErrorMsg('')

        let res: { success: boolean; error?: string }

        if (values.mode === 'transfer') {
            res = await createTransfer({
                fromAccountId: values.fromAccountId,
                toAccountId: values.toAccountId,
                amount: values.amount,
                fee: values.fee,
                transferDate: values.date,
                description: values.description,
            })
        } else {
            res = await createTransaction({
                type: values.mode,
                amount: values.amount,
                accountId: values.fromAccountId,
                categoryId: values.categoryId || undefined,
                date: values.date,
                description: values.description || undefined,
            })
        }

        if (res.success) {
            setOpen(false)
            form.reset({
                mode,
                amount: 0,
                fromAccountId: values.fromAccountId,
                toAccountId: values.toAccountId,
                categoryId: '',
                fee: 0,
                date: todayStr,
                description: '',
            })
        } else {
            setErrorMsg(res.error || 'Failed to complete transaction')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {triggerButton !== null && (
                <DialogTrigger
                    render={
                        triggerButton
                            ? (triggerButton as any)
                            : (
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium">
                                    <Plus className="h-4 w-4" />
                                    Add / Transfer
                                    <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-emerald-400/40 bg-emerald-700/30 px-1.5 text-[10px] text-emerald-200">
                                        <Command className="h-2.5 w-2.5" />K
                                    </kbd>
                                </Button>
                            )
                    }
                />
            )}

            <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-800 text-white p-6">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-lg font-semibold flex items-center justify-between">
                        <span>Quick Entry</span>
                        <span className="text-[11px] font-normal text-slate-500">
                            Press <kbd className="text-slate-400">⌘+Enter</kbd>
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                    {errorMsg && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {errorMsg}
                        </div>
                    )}

                    {/* Mode Switcher: Expense | Income | Transfer */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('mode', 'expense')
                                setIsCreatingCategory(false)
                            }}
                            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                                mode === 'expense'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Expense
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('mode', 'income')
                                setIsCreatingCategory(false)
                            }}
                            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                                mode === 'income'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Income
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                form.setValue('mode', 'transfer')
                                setIsCreatingCategory(false)
                            }}
                            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                                mode === 'transfer'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Transfer
                        </button>
                    </div>

                    {/* Amount Field */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-300">Amount</Label>
                            <div className="flex items-center gap-1">
                                {AMOUNT_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => form.setValue('amount', preset)}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                    >
                                        +{preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            autoFocus
                            {...form.register('amount', { valueAsNumber: true })}
                            className="bg-slate-950 border-slate-800 text-lg font-bold text-white placeholder:text-slate-600 focus-visible:ring-emerald-500"
                        />
                    </div>

                    {/* Dynamic Inputs Based on Mode */}
                    {mode === 'transfer' ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-300">From Account</Label>
                                    <Select
                                        value={fromAccountId}
                                        onValueChange={(val) => form.setValue('fromAccountId', val || '')}
                                    >
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                            <SelectValue placeholder="Select account">
                                                {accounts.find((a) => a.id === fromAccountId)?.name || 'Select account'}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {accounts.map((acc) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-300">To Account</Label>
                                    <Select
                                        value={toAccountId || ''}
                                        onValueChange={(val) => form.setValue('toAccountId', val || '')}
                                    >
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                            <SelectValue placeholder="Select destination">
                                                {accounts.find((a) => a.id === toAccountId)?.name || 'Select destination'}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            {accounts
                                                .filter((acc) => acc.id !== fromAccountId)
                                                .map((acc) => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-300">Transfer Fee (Optional)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...form.register('fee', { valueAsNumber: true })}
                                    className="bg-slate-950 border-slate-800 text-xs text-white"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-300">Account</Label>
                                <Select
                                    value={fromAccountId}
                                    onValueChange={(val) => form.setValue('fromAccountId', val || '')}
                                >
                                    <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                        <SelectValue placeholder="Select account">
                                            {accounts.find((a) => a.id === fromAccountId)?.name || 'Select account'}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {accounts.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-300">Category</Label>
                                    {!isCreatingCategory && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingCategory(true)}
                                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 transition-colors"
                                        >
                                            <Plus className="h-3 w-3" /> New
                                        </button>
                                    )}
                                </div>

                                {isCreatingCategory ? (
                                    <div className="space-y-1.5">
                                        <Input
                                            placeholder={`Type custom ${mode} category...`}
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleCreateCategory()
                                                }
                                            }}
                                            className="bg-slate-950 border-slate-800 text-xs text-white"
                                            autoFocus
                                        />
                                        <div className="flex gap-1.5">
                                            <Button
                                                type="button"
                                                onClick={handleCreateCategory}
                                                disabled={categoryLoading || !newCategoryName.trim()}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] h-7 px-2.5 flex-1"
                                            >
                                                {categoryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Category'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setIsCreatingCategory(false)}
                                                className="text-slate-400 text-[11px] h-7 px-2"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Select
                                        value={categoryId || ''}
                                        onValueChange={(val) => {
                                            if (val === '__CREATE_NEW__') {
                                                setIsCreatingCategory(true)
                                            } else {
                                                form.setValue('categoryId', val || '')
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
                                            <SelectValue placeholder="Select category">
                                                {categoryList.find((c) => c.id === categoryId)?.name || 'Select category'}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-52 overflow-y-auto">
                                            <SelectItem
                                                value="__CREATE_NEW__"
                                                className="font-semibold text-emerald-400 focus:text-emerald-300 border-b border-slate-800/80 mb-1"
                                            >
                                                ➕ Create Custom Category...
                                            </SelectItem>
                                            {filteredCategories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Description & Date */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs text-slate-300">Description</Label>
                            <Input
                                placeholder={mode === 'transfer' ? 'e.g. Telebirr to CBE' : 'e.g. Groceries'}
                                {...form.register('description')}
                                className="bg-slate-950 border-slate-800 text-xs text-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300">Date</Label>
                            <Input
                                type="date"
                                {...form.register('date')}
                                className="bg-slate-950 border-slate-800 text-xs text-white p-2 [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium mt-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : mode === 'transfer' ? (
                            'Confirm Transfer'
                        ) : (
                            `Save ${mode === 'income' ? 'Income' : 'Expense'}`
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}