'use client'

import { Delete, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CustomKeypadProps {
    value: string
    onChange: (val: string) => void
    onSubmit: () => void
    loading?: boolean
}

export function CustomKeypad({ value, onChange, onSubmit, loading }: CustomKeypadProps) {
    const handleKeyPress = (num: string) => {
        // Prevent duplicate decimals
        if (num === '.' && value.includes('.')) return

        // Limit decimal precision to 2 digits
        if (value.includes('.')) {
            const [, decimal] = value.split('.')
            if (decimal && decimal.length >= 2) return
        }

        // Prevent leading zero stack
        if (value === '0' && num !== '.') {
            onChange(num)
            return
        }

        onChange(value + num)
    }

    const handleDelete = () => {
        if (value.length <= 1) {
            onChange('0')
        } else {
            onChange(value.slice(0, -1))
        }
    }

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']

    return (
        <div className="grid grid-cols-3 gap-2 pt-2">
            {keys.map((key) => (
                <Button
                    key={key}
                    type="button"
                    variant="outline"
                    onClick={() => handleKeyPress(key)}
                    className="h-14 border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-white text-xl font-medium rounded-xl active:scale-95 transition-transform select-none touch-manipulation"
                >
                    {key}
                </Button>
            ))}

            {/* Delete / Backspace Key */}
            <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="h-14 border-slate-800 bg-slate-900/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xl font-medium rounded-xl active:scale-95 transition-transform select-none touch-manipulation flex items-center justify-center"
                aria-label="Backspace"
            >
                <Delete className="h-6 w-6" />
            </Button>

            {/* Submit Action Key spanning the bottom right */}
            <Button
                type="button"
                onClick={onSubmit}
                disabled={loading || !value || parseFloat(value) <= 0}
                className="col-span-3 h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 mt-1 touch-manipulation"
            >
                <Check className="h-5 w-5 stroke-[3]" /> Save Expense
            </Button>
        </div>
    )
}