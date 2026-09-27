'use client'

import { useState } from 'react'
import {
    exportTransactionsCSV,
    exportAccountsCSV,
    exportBudgetsCSV,
} from '@/actions/export-actions'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'

export function ExportDataDropdown() {
    const [loading, setLoading] = useState(false)

    const downloadFile = (filename: string, content: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleExport = async (type: 'transactions' | 'accounts' | 'budgets') => {
        setLoading(true)
        try {
            let res: { filename: string; content: string }

            if (type === 'transactions') {
                res = await exportTransactionsCSV()
            } else if (type === 'accounts') {
                res = await exportAccountsCSV()
            } else {
                res = await exportBudgetsCSV()
            }

            downloadFile(res.filename, res.content)
        } catch (err) {
            console.error('Export failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs gap-1.5"
                    />
                }
            >
                {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                ) : (
                    <Download className="h-3.5 w-3.5 text-blue-400" />
                )}
                Export Data
            </DropdownMenuTrigger>

            <DropdownMenuContent className="bg-slate-900 border-slate-800 text-white text-xs">
                <DropdownMenuItem
                    onClick={() => handleExport('transactions')}
                    className="hover:bg-slate-800 cursor-pointer gap-2"
                >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Transactions (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleExport('accounts')}
                    className="hover:bg-slate-800 cursor-pointer gap-2"
                >
                    <FileSpreadsheet className="h-4 w-4 text-blue-400" /> Account Balances (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleExport('budgets')}
                    className="hover:bg-slate-800 cursor-pointer gap-2"
                >
                    <FileSpreadsheet className="h-4 w-4 text-amber-400" /> Budgets (CSV)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}