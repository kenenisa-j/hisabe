'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { upsertBudget, BudgetProgress } from '@/actions/budget-actions'
import { createCategory } from '@/actions/category-actions'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, Loader2, Plus } from 'lucide-react'

const budgetSchema = z.object({
    categoryId: z.string().min(1, 'Select a category'),
    amount: z.number({ message: 'Budget target must be greater than 0' }).positive('Budget target must be greater than 0'),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

interface BudgetModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    categories: { id: string; name: string }[]
    currentMonth: number
    currentYear: number
    selectedBudget?: BudgetProgress | null
}

export function BudgetModal({
    open,
    onOpenChange,
    categories: initialCategories,
    currentMonth,
    currentYear,
    selectedBudget,
}: BudgetModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [categoryList, setCategoryList] = useState(initialCategories)
    const [prevInitial, setPrevInitial] = useState(initialCategories)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [addingCategoryLoading, setAddingCategoryLoading] = useState(false)

    const isEditMode = !!selectedBudget

    if (prevInitial !== initialCategories) {
        setPrevInitial(initialCategories)
        setCategoryList(initialCategories)
    }

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            categoryId: '',
            amount: 0,
        },
    })

    useEffect(() => {
        if (selectedBudget) {
            form.reset({
                categoryId: selectedBudget.categoryId,
                amount: selectedBudget.amount,
            })
        } else {
            form.reset({
                categoryId: categoryList[0]?.id || '',
                amount: 0,
            })
        }
    }, [selectedBudget, categoryList, form])

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return
        setAddingCategoryLoading(true)
        try {
            const res = await createCategory(newCategoryName.trim(), 'expense')
            if (res.success && res.id) {
                const newCat = { id: res.id, name: res.name }
                setCategoryList((prev) => [newCat, ...prev])
                form.setValue('categoryId', res.id)
                setNewCategoryName('')
                setIsCreatingCategory(false)
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to create new category')
        } finally {
            setAddingCategoryLoading(false)
        }
    }

    const selectedCategoryId = useWatch({ control: form.control, name: 'categoryId' })

    const onSubmit = async (values: BudgetFormValues) => {
        setLoading(true)
        setError('')

        try {
            await upsertBudget({
                categoryId: values.categoryId,
                amount: values.amount,
                month: currentMonth,
                year: currentYear,
            })
            onOpenChange(false)
            form.reset()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save budget target limit')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader className="pb-2 border-b border-slate-800">
                    <DialogTitle className="text-base font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-400" />
                        {isEditMode ? 'Edit Category Budget Limit' : 'Set Monthly Budget Limit'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
                    {error && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-300">Expense Category</Label>
                            {!isEditMode && !isCreatingCategory && (
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingCategory(true)}
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="h-3 w-3" /> Add New Category
                                </button>
                            )}
                        </div>

                        {isCreatingCategory ? (
                            <div className="flex gap-2 pt-1">
                                <Input
                                    placeholder="Enter new category name (e.g. Gym, Coffee...)"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-xs text-white"
                                    autoFocus
                                />
                                <Button
                                    type="button"
                                    onClick={handleAddCategory}
                                    disabled={addingCategoryLoading || !newCategoryName.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3"
                                >
                                    {addingCategoryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsCreatingCategory(false)}
                                    className="text-slate-400 text-xs px-2"
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Select
                                disabled={isEditMode}
                                value={selectedCategoryId}
                                onValueChange={(val) => form.setValue('categoryId', val || '')}
                            >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white disabled:opacity-70">
                                    <SelectValue placeholder="Select Category">
                                        {categoryList.find((c) => c.id === selectedCategoryId)?.name || selectedBudget?.categoryName || 'Select Category'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {categoryList.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300">Target Amount (ETB)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...form.register('amount', { valueAsNumber: true })}
                            className="bg-slate-950 border-slate-800 text-sm font-semibold text-white focus-visible:ring-emerald-500"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium mt-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditMode ? 'Update Limit' : 'Create Budget Target'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}