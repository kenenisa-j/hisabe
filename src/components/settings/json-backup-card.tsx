'use client'

import { useState } from 'react'
import { exportFullJSONBackup } from '@/actions/backup-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, Download, Loader2, ShieldCheck } from 'lucide-react'

export function JSONBackupCard() {
    const [loading, setLoading] = useState(false)

    const handleJSONExport = async () => {
        setLoading(true)
        try {
            const res = await exportFullJSONBackup()
            const blob = new Blob([res.jsonContent], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', res.filename)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (err) {
            console.error('JSON Backup failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-400" />
                    Complete System Backup
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                    Download a complete portable JSON dump of all your financial entities, budgets, assets, and debt ledgers.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-3 rounded-md border border-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Your data backup is formatted for easy migration or cold storage recovery.</span>
                </div>

                <Button
                    onClick={handleJSONExport}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-2 font-medium"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    Export Complete JSON Backup
                </Button>
            </CardContent>
        </Card>
    )
}