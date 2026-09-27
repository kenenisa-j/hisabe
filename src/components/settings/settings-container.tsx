'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { exportFullJSONBackup } from '@/actions/backup-actions'
import { exportTransactionsCSV, exportAccountsCSV } from '@/actions/export-actions'
import { Download, Shield, Database, Globe, Check } from 'lucide-react'

export function SettingsContainer() {
    const [downloading, setDownloading] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const triggerDownload = (filename: string, content: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleExportJSON = async () => {
        try {
            setDownloading('json')
            const res = await exportFullJSONBackup()
            triggerDownload(res.filename, res.jsonContent, 'application/json')
            setSuccessMessage('Full JSON backup downloaded successfully!')
            setTimeout(() => setSuccessMessage(null), 4000)
        } catch (err) {
            console.error(err)
        } finally {
            setDownloading(null)
        }
    }

    const handleExportTransactions = async () => {
        try {
            setDownloading('tx-csv')
            const res = await exportTransactionsCSV()
            triggerDownload(res.filename, res.content, 'text/csv')
            setSuccessMessage('Transactions CSV downloaded!')
            setTimeout(() => setSuccessMessage(null), 4000)
        } catch (err) {
            console.error(err)
        } finally {
            setDownloading(null)
        }
    }

    const handleExportAccounts = async () => {
        try {
            setDownloading('acc-csv')
            const res = await exportAccountsCSV()
            triggerDownload(res.filename, res.content, 'text/csv')
            setSuccessMessage('Accounts CSV downloaded!')
            setTimeout(() => setSuccessMessage(null), 4000)
        } catch (err) {
            console.error(err)
        } finally {
            setDownloading(null)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Preferences</h1>
                <p className="text-sm text-slate-400">
                    Manage your personal preferences, data backups, and account settings.
                </p>
            </div>

            {successMessage && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
                    <Check className="h-4 w-4" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Financial Preferences */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Globe className="h-5 w-5 text-emerald-400" />
                        Currency & Region
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Default currency settings for your personal transactions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs text-slate-300">Base Currency</Label>
                            <div className="mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-md text-sm text-white font-medium">
                                ETB (Ethiopian Birr)
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-slate-300">App Mode</Label>
                            <div className="mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-md text-sm text-emerald-400 font-medium flex items-center justify-between">
                                <span>Personal Finance</span>
                                <span className="text-xs bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/20">Single User</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data & Backups */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-400" />
                        Data Export & Backups
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Export your financial data anytime for offline storage or analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg gap-3">
                        <div>
                            <p className="text-sm font-medium text-white">Full JSON Backup</p>
                            <p className="text-xs text-slate-400">Download all your accounts, transactions, budgets, assets & debts in a single JSON file.</p>
                        </div>
                        <Button
                            onClick={handleExportJSON}
                            disabled={downloading === 'json'}
                            className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {downloading === 'json' ? 'Exporting...' : 'Export JSON'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg">
                            <div>
                                <p className="text-sm font-semibold text-white">Transactions CSV</p>
                                <p className="text-xs text-slate-400">Export transaction history file</p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleExportTransactions}
                                disabled={downloading === 'tx-csv'}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-2 flex items-center gap-1.5 shadow-sm shrink-0"
                            >
                                <Download className="h-4 w-4" />
                                <span>{downloading === 'tx-csv' ? 'Exporting...' : 'Export CSV'}</span>
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg">
                            <div>
                                <p className="text-sm font-semibold text-white">Accounts CSV</p>
                                <p className="text-xs text-slate-400">Export account statement file</p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleExportAccounts}
                                disabled={downloading === 'acc-csv'}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-2 flex items-center gap-1.5 shadow-sm shrink-0"
                            >
                                <Download className="h-4 w-4" />
                                <span>{downloading === 'acc-csv' ? 'Exporting...' : 'Export CSV'}</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-400" />
                        Privacy & Security
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Hisabe is strictly designed for your private, single-user personal finance space.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Authenticated via secure Clerk user sessions</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>All database records scoped to your unique User ID</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Zero third-party data sharing or multi-tenant tracking</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
