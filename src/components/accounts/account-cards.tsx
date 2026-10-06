'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Account, AccountType, Currency } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { createAccount, toggleArchiveAccount, deleteAccount } from '@/actions/account-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Archive, Trash2, Eye, EyeOff, Building2, AlertTriangle } from 'lucide-react'
import { BankBrandLogo } from './bank-brand-logo'

interface AccountCardsProps {
    initialAccounts: Account[]
}

export const ALL_BANK_PRESETS = [
    { name: 'Commercial Bank of Ethiopia', short: 'CBE', type: 'bank' },
    { name: 'Telebirr', short: 'Telebirr', type: 'telebirr' },
    { name: 'CBE Birr', short: 'CBE Birr', type: 'telebirr' },
    { name: 'M-PESA', short: 'M-PESA', type: 'telebirr' },
    { name: 'Bank of Abyssinia', short: 'Abyssinia', type: 'bank' },
    { name: 'Awash Bank', short: 'Awash', type: 'bank' },
    { name: 'Dashen Bank', short: 'Dashen', type: 'bank' },
    { name: 'Hibret Bank', short: 'Hibret', type: 'bank' },
    { name: 'Cooperative Bank of Oromia', short: 'Coopbank', type: 'bank' },
    { name: 'Wegagen Bank', short: 'Wegagen', type: 'bank' },
    { name: 'Nib International Bank', short: 'Nib', type: 'bank' },
    { name: 'Zemen Bank', short: 'Zemen', type: 'bank' },
    { name: 'Enat Bank', short: 'Enat', type: 'bank' },
    { name: 'Oromia Bank', short: 'Oromia', type: 'bank' },
    { name: 'Berhan Bank', short: 'Berhan', type: 'bank' },
    { name: 'Bunna International Bank', short: 'Bunna', type: 'bank' },
    { name: 'Hijra Bank', short: 'Hijra', type: 'bank' },
    { name: 'ZamZam Bank', short: 'ZamZam', type: 'bank' },
    { name: 'Amhara Bank', short: 'Amhara', type: 'bank' },
    { name: 'Siinqee Bank', short: 'Siinqee', type: 'bank' },
    { name: 'Tsedey Bank', short: 'Tsedey', type: 'bank' },
    { name: 'Gadaa Bank', short: 'Gadaa', type: 'bank' },
    { name: 'Shabelle Bank', short: 'Shabelle', type: 'bank' },
    { name: 'Rammis Bank', short: 'Rammis', type: 'bank' },
    { name: 'Ahadu Bank', short: 'Ahadu', type: 'bank' },
    { name: 'PayPal', short: 'PayPal', type: 'digital' },
    { name: 'Chapa', short: 'Chapa', type: 'digital' },
    { name: 'Physical Cash', short: 'Cash / Wallet', type: 'cash' },
    { name: 'Savings Account', short: 'Savings', type: 'savings' },
]

function getAccountBadgeAndIcon(name: string, type: AccountType) {
    const lower = name.toLowerCase()

    if (lower.includes('cbe birr') || lower.includes('cbebirr')) {
        return {
            color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            badgeText: 'CBE Birr',
        }
    }

    if (type === 'telebirr' || lower.includes('telebirr')) {
        return {
            color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            badgeText: 'Telebirr Mobile',
        }
    }

    if (lower.includes('m-pesa') || lower.includes('mpesa') || lower.includes('safaricom')) {
        return {
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            badgeText: 'M-PESA',
        }
    }

    if (type === 'cash' || lower.includes('cash') || lower.includes('wallet')) {
        return {
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            badgeText: 'Physical Cash',
        }
    }

    if (lower.includes('cbe') || lower.includes('commercial bank')) {
        return {
            color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            badgeText: 'Commercial Bank of Ethiopia',
        }
    }

    if (lower.includes('abyssinia') || lower.includes('boa')) {
        return {
            color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            badgeText: 'Bank of Abyssinia',
        }
    }

    if (lower.includes('awash')) {
        return {
            color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            badgeText: 'Awash Bank',
        }
    }

    if (lower.includes('dashen')) {
        return {
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            badgeText: 'Dashen Bank',
        }
    }

    if (lower.includes('hibret') || lower.includes('united bank')) {
        return {
            color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            badgeText: 'Hibret Bank',
        }
    }

    if (lower.includes('coop') || lower.includes('cooperative')) {
        return {
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            badgeText: 'Cooperative Bank',
        }
    }

    if (lower.includes('wegagen')) {
        return {
            color: 'bg-red-500/10 text-red-400 border-red-500/20',
            badgeText: 'Wegagen Bank',
        }
    }

    if (lower.includes('nib')) {
        return {
            color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            badgeText: 'Nib International',
        }
    }

    if (lower.includes('zemen')) {
        return {
            color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
            badgeText: 'Zemen Bank',
        }
    }

    if (lower.includes('hijra')) {
        return {
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            badgeText: 'Hijra Bank',
        }
    }

    if (lower.includes('zamzam')) {
        return {
            color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
            badgeText: 'ZamZam Bank',
        }
    }

    if (lower.includes('siinqee') || lower.includes('sinqee')) {
        return {
            color: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
            badgeText: 'Siinqee Bank',
        }
    }

    if (type === 'savings' || lower.includes('savings')) {
        return {
            color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            badgeText: 'Savings Account',
        }
    }

    if (type === 'digital' || lower.includes('paypal') || lower.includes('chapa')) {
        return {
            color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            badgeText: lower.includes('paypal') ? 'PayPal' : lower.includes('chapa') ? 'Chapa' : 'Digital',
        }
    }

    return {
        color: 'bg-slate-800 text-slate-300 border-slate-700',
        badgeText: type.charAt(0).toUpperCase() + type.slice(1),
    }
}

export function AccountCards({ initialAccounts }: AccountCardsProps) {
    const [showArchived, setShowArchived] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [type, setType] = useState<AccountType>('bank')
    const [currency, setCurrency] = useState<Currency>('ETB')
    const [balance, setBalance] = useState('')

    const displayedAccounts = initialAccounts.filter(
        (acc) => showArchived || !acc.is_archived
    )

    const handleCreateAccount = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        startTransition(async () => {
            await createAccount({
                name: name.trim(),
                type,
                currency,
                initialBalance: parseFloat(balance) || 0,
            })
            setName('')
            setBalance('')
            setIsDialogOpen(false)
        })
    }

    const applyPreset = (preset: typeof ALL_BANK_PRESETS[0]) => {
        setName(preset.name)
        setType(preset.type as AccountType)
    }

    const handleArchiveToggle = (id: string, currentStatus: boolean) => {
        startTransition(async () => {
            await toggleArchiveAccount(id, !currentStatus)
        })
    }

    const handleDeleteClick = (id: string, name: string) => {
        setDeleteTarget({ id, name })
        setIsDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return
        startTransition(async () => {
            await deleteAccount(deleteTarget.id)
            setIsDeleteDialogOpen(false)
            setDeleteTarget(null)
        })
    }

    return (
        <div className="space-y-6">
            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[400px] p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white text-base font-semibold">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            Delete Account
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <p className="text-sm text-slate-300">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-white">&quot;{deleteTarget?.name}&quot;</span>?
                        </p>
                        <p className="text-xs text-slate-500">
                            This will permanently delete the account and all its associated transactions. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold"
                                onClick={handleDeleteConfirm}
                                disabled={isPending}
                            >
                                {isPending ? 'Deleting...' : 'Delete Account'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Action Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className={
                        showArchived
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 font-semibold transition-all"
                            : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white font-medium transition-all"
                    }
                >
                    {showArchived ? <EyeOff className="mr-2 h-4 w-4 text-amber-400" /> : <Eye className="mr-2 h-4 w-4 text-slate-300" />}
                    {showArchived ? 'Hide Archived Accounts' : 'Show Archived Accounts'}
                </Button>

                {/* Add Account Modal */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger render={<Button className="bg-emerald-600 text-white hover:bg-emerald-500 font-medium" />}>
                        <Plus className="mr-2 h-4 w-4" /> Add Account
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[540px] p-6 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                                <Building2 className="h-5 w-5 text-emerald-400" /> Add Financial Account
                            </DialogTitle>
                        </DialogHeader>

                        {/* Quick Presets */}
                        <div className="space-y-2 pt-2">
                            <Label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Select Bank / Service Preset</Label>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                                {ALL_BANK_PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${
                                            name === preset.name
                                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold shadow-xs'
                                                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-200 border-slate-700/80'
                                        }`}
                                    >
                                        <BankBrandLogo name={preset.name} type={preset.type} size="sm" />
                                        <span>{preset.short}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
                            {/* Live Preview Header */}
                            {name.trim() && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                                    <BankBrandLogo name={name} type={type} size="md" />
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Brand Logo Preview</p>
                                        <p className="text-sm font-bold text-white">{name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs text-slate-300 font-medium">
                                    Account Name (Select preset above or type any bank name)
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Hibret Bank, Bank of Abyssinia, CBE, Telebirr, CBE Birr..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-300 font-medium">Account Category</Label>
                                    <Select value={type} onValueChange={(val) => val && setType(val as AccountType)}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                            <SelectValue>
                                                {type === 'bank' ? '🏦 Bank Account' :
                                                 type === 'telebirr' ? '📱 Mobile Money' :
                                                 type === 'cash' ? '💵 Physical Cash' :
                                                 type === 'savings' ? '🐷 Savings' : '🌐 Digital / Crypto'}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="bank">🏦 Bank Account (CBE, Hibret, BOA...)</SelectItem>
                                            <SelectItem value="telebirr">📱 Mobile Money (Telebirr, CBE Birr...)</SelectItem>
                                            <SelectItem value="cash">💵 Physical Cash / Wallet</SelectItem>
                                            <SelectItem value="savings">🐷 Savings Account</SelectItem>
                                            <SelectItem value="digital">🌐 Digital / Crypto (PayPal...)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-300 font-medium">Currency</Label>
                                    <Select value={currency} onValueChange={(val) => val && setCurrency(val as Currency)}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                                            <SelectValue>
                                                {currency === 'ETB' ? 'ETB (Birr)' : 'USD ($)'}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="ETB">ETB (Birr)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="balance" className="text-xs text-slate-300 font-medium">Current Balance</Label>
                                <Input
                                    id="balance"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isPending}
                                className="w-full bg-emerald-600 text-white hover:bg-emerald-500 font-medium py-2.5"
                            >
                                {isPending ? 'Creating Account...' : 'Create Account'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Account Cards Grid */}
            {displayedAccounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
                    No accounts found. Click &quot;Add Account&quot; to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedAccounts.map((account) => {
                        const display = getAccountBadgeAndIcon(account.name, account.type)

                        return (
                            <Card
                                key={account.id}
                                className={`border-slate-800 bg-slate-900 text-white transition-all shadow-md ${account.is_archived ? 'opacity-50' : 'hover:border-slate-700 hover:shadow-lg'}`}
                            >
                                <CardContent className="p-4">
                                    {/* Top Row: Logo + Name + Menu */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <BankBrandLogo name={account.name} type={account.type} size="md" />
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/accounts/${account.id}`}
                                                    className="font-semibold text-white hover:text-emerald-400 text-sm leading-tight line-clamp-1 block"
                                                >
                                                    {account.name}
                                                </Link>
                                                <Badge
                                                    variant="outline"
                                                    className={`mt-1 text-[10px] font-medium border px-1.5 py-0 ${display.color}`}
                                                >
                                                    {display.badgeText}
                                                </Badge>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                render={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white shrink-0" />
                                                }
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white">
                                                <DropdownMenuItem
                                                    onClick={() => handleArchiveToggle(account.id, !!account.is_archived)}
                                                    className="cursor-pointer hover:bg-slate-800"
                                                >
                                                    <Archive className="mr-2 h-4 w-4" />
                                                    {account.is_archived ? 'Unarchive' : 'Archive'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteClick(account.id, account.name)}
                                                    className="cursor-pointer text-red-400 hover:bg-slate-800 focus:text-red-400"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Balance Row */}
                                    <div className="pt-1 border-t border-slate-800/60">
                                        <p className="text-2xl font-bold tracking-tight text-white mt-2">
                                            {formatCurrency(account.balance, account.currency)}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">Current Balance</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}