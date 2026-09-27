'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
    id: string
    name: string
}

interface CategoryChipsProps {
    categories: Category[]
    selectedId: string | null
    onSelect: (id: string | null) => void
}

export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
    return (
        <div className="w-full">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                Category
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x touch-pan-x">
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={cn(
                        'h-11 px-4 rounded-full border text-xs font-medium whitespace-nowrap transition-all snap-start flex items-center gap-1.5 shrink-0 active:scale-95 touch-manipulation',
                        selectedId === null
                            ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    )}
                >
                    {selectedId === null && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    Uncategorized
                </button>

                {categories.map((cat) => {
                    const isSelected = selectedId === cat.id
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => onSelect(cat.id)}
                            className={cn(
                                'h-11 px-4 rounded-full border text-xs font-medium whitespace-nowrap transition-all snap-start flex items-center gap-1.5 shrink-0 active:scale-95 touch-manipulation',
                                isSelected
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-sm'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            )}
                        >
                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                            {cat.name}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}