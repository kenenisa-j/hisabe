'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, Filter } from 'lucide-react'

interface ReportFilterProps {
    initialStartDate: string
    initialEndDate: string
}

export function ReportDateFilter({ initialStartDate, initialEndDate }: ReportFilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [startDate, setStartDate] = useState(initialStartDate)
    const [endDate, setEndDate] = useState(initialEndDate)

    const applyPreset = (preset: 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear') => {
        const now = new Date()
        let start = new Date()
        let end = new Date()

        if (preset === 'thisMonth') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        } else if (preset === 'lastMonth') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            end = new Date(now.getFullYear(), now.getMonth(), 0)
        } else if (preset === 'last3Months') {
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        } else if (preset === 'thisYear') {
            start = new Date(now.getFullYear(), 0, 1)
            end = new Date(now.getFullYear(), 11, 31)
        }

        const startStr = start.toISOString().split('T')[0]
        const endStr = end.toISOString().split('T')[0]

        setStartDate(startStr)
        setEndDate(endStr)
        updateQueryParams(startStr, endStr)
    }

    const handleCustomApply = (e: React.FormEvent) => {
        e.preventDefault()
        updateQueryParams(startDate, endDate)
    }

    const updateQueryParams = (start: string, end: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('startDate', start)
        params.set('endDate', end)
        router.push(`/reports?${params.toString()}`)
    }

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-slate-400">Range:</span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset('thisMonth')}
                    className="h-7 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    This Month
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset('lastMonth')}
                    className="h-7 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    Last Month
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset('last3Months')}
                    className="h-7 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    3 Months
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset('thisYear')}
                    className="h-7 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    This Year
                </Button>
            </div>

            {/* Custom Picker */}
            <form onSubmit={handleCustomApply} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 w-32 border-slate-800 bg-slate-950 text-xs text-white"
                    />
                    <span>to</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 w-32 border-slate-800 bg-slate-950 text-xs text-white"
                    />
                </div>
                <Button type="submit" size="sm" className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1">
                    <Filter className="h-3 w-3" /> Apply
                </Button>
            </form>
        </div>
    )
}