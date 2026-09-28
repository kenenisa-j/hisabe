'use client'

import { useState } from 'react'
import { bulkImportTransactions, ParsedImportRow } from '@/actions/import-actions'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Upload, FileCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface AccountOption {
    id: string
    name: string
}

export function ImportCSVModal({ accounts }: { accounts: AccountOption[] }) {
    const [open, setOpen] = useState(false)
    const [csvHeaders, setCsvHeaders] = useState<string[]>([])
    const [rawRows, setRawRows] = useState<string[][]>([])
    const [selectedAccount, setSelectedAccount] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [successCount, setSuccessCount] = useState<number | null>(null)

    // Mapping state
    const [mapping, setMapping] = useState<{
        date: string
        amount: string
        description: string
        type: string
    }>({
        date: '',
        amount: '',
        description: '',
        type: '',
    })

    const parseCSVLine = (text: string) => {
        const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '')
        if (lines.length === 0) return

        const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim())
        const rows = lines.slice(1).map((line) =>
            line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim())
        )

        setCsvHeaders(headers)
        setRawRows(rows)

        // Auto-map best guesses
        setMapping({
            date: headers.find((h) => /date|time/i.test(h)) || headers[0] || '',
            amount: headers.find((h) => /amount|value|sum/i.test(h)) || headers[1] || '',
            description: headers.find((h) => /desc|note|memo|narration/i.test(h)) || '',
            type: headers.find((h) => /type|kind|direction/i.test(h)) || '',
        })
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0]
        if (!uploadedFile) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            const content = evt.target?.result as string
            parseCSVLine(content)
        }
        reader.readAsText(uploadedFile)
    }

    const handleImportExecute = async () => {
        if (!selectedAccount || !mapping.date || !mapping.amount) return

        setLoading(true)
        try {
            const dateIdx = csvHeaders.indexOf(mapping.date)
            const amountIdx = csvHeaders.indexOf(mapping.amount)
            const descIdx = csvHeaders.indexOf(mapping.description)
            const typeIdx = csvHeaders.indexOf(mapping.type)

            const parsedRows: ParsedImportRow[] = rawRows
                .map((r) => {
                    const rawDate = r[dateIdx]
                    const rawAmount = parseFloat(r[amountIdx])
                    const rawType = typeIdx !== -1 ? r[typeIdx]?.toUpperCase() : ''

                    if (!rawDate || isNaN(rawAmount)) return null

                    let txType: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'EXPENSE'
                    if (rawType.includes('INC') || rawType.includes('CR') || rawAmount > 0) {
                        txType = 'INCOME'
                    }

                    return {
                        date: new Date(rawDate).toISOString().split('T')[0],
                        amount: Math.abs(rawAmount),
                        type: txType,
                        description: descIdx !== -1 ? r[descIdx] : 'Imported Record',
                    }
                })
                .filter(Boolean) as ParsedImportRow[]

            const res = await bulkImportTransactions(selectedAccount, parsedRows)
            setSuccessCount(res.insertedCount)
        } catch (err) {
            console.error('CSV Import execution failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" className="border-slate-800 bg-slate-900 text-xs gap-1.5" />}>
                <Upload className="h-3.5 w-3.5 text-blue-400" /> Import CSV
            </DialogTrigger>

            <DialogContent className="border-slate-800 bg-slate-950 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-emerald-400" /> Legacy CSV Field Mapper
                    </DialogTitle>
                </DialogHeader>

                {successCount !== null ? (
                    <div className="py-6 text-center space-y-3">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                        <h3 className="font-semibold text-sm">Import Completed Successfully</h3>
                        <p className="text-xs text-slate-400">
                            Successfully imported <span className="text-emerald-400 font-bold">{successCount}</span> transactions.
                        </p>
                        <Button
                            size="sm"
                            onClick={() => {
                                setSuccessCount(null)
                                setOpen(false)
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-xs"
                        >
                            Done
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2 text-xs">
                        {/* Step 1: Select Account */}
                        <div>
                            <label className="text-slate-400 mb-1 block">Target Destination Account</label>
                            <Select value={selectedAccount} onValueChange={(val) => setSelectedAccount(val || '')}>
                                <SelectTrigger className="border-slate-800 bg-slate-900 text-xs">
                                    <SelectValue placeholder="Select Account">
                                        {accounts.find((acc) => acc.id === selectedAccount)?.name || 'Select Account'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                            {acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Step 2: Upload File */}
                        <div>
                            <label className="text-slate-400 mb-1 block">Upload Statement / CSV File</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                            />
                        </div>

                        {/* Step 3: Column Mapping */}
                        {csvHeaders.length > 0 && (
                            <div className="border border-slate-800 bg-slate-900/50 p-3 rounded-md space-y-3">
                                <p className="font-medium text-slate-300 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> Map CSV Columns
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-slate-400 text-[10px]">Date Field</label>
                                        <Select value={mapping.date} onValueChange={(v) => v && setMapping({ ...mapping, date: v })}>
                                            <SelectTrigger className="border-slate-800 bg-slate-950 text-xs h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                {csvHeaders.map((h) => (
                                                    <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-slate-400 text-[10px]">Amount Field</label>
                                        <Select value={mapping.amount} onValueChange={(v) => v && setMapping({ ...mapping, amount: v })}>
                                            <SelectTrigger className="border-slate-800 bg-slate-950 text-xs h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                {csvHeaders.map((h) => (
                                                    <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-slate-400 text-[10px]">Description / Note Field</label>
                                        <Select value={mapping.description} onValueChange={(v) => v && setMapping({ ...mapping, description: v })}>
                                            <SelectTrigger className="border-slate-800 bg-slate-950 text-xs h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                {csvHeaders.map((h) => (
                                                    <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleImportExecute}
                            disabled={loading || !selectedAccount || rawRows.length === 0}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                `Import ${rawRows.length} Rows`
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}