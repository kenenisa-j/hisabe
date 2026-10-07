'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAccount } from '@/actions/account-actions'
import { AccountType, Currency } from '@/types'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Building2, AlertTriangle } from 'lucide-react'
import { BankBrandLogo } from '@/components/accounts/bank-brand-logo'
import { ALL_BANK_PRESETS } from '@/components/accounts/account-cards'

export function AddAccountModal() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [name, setName] = useState('')
    const [type, setType] = useState<AccountType>('bank')
    const [currency, setCurrency] = useState<Currency>('ETB')
    const [balance, setBalance] = useState('')
    const [allowOverdraft, setAllowOverdraft] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setError(null)

        startTransition(async () => {
            const res = await createAccount({
                name: name.trim(),
                type,
                currency,
                initialBalance: parseFloat(balance) || 0,
                allowOverdraft,
            })

            if (!res.success) {
                setError(res.error || 'Failed to create account.')
                return
            }

            setName('')
            setBalance('')
            setAllowOverdraft(false)
            setError(null)
            setOpen(false)
            router.refresh()
        })
    }

    const applyPreset = (preset: typeof ALL_BANK_PRESETS[0]) => {
        setName(preset.name)
        setType(preset.type as AccountType)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-emerald-600 text-white hover:bg-emerald-500 gap-2 font-medium" />}>
                <Plus className="h-4 w-4" /> Add Account
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[520px] p-6 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                        <Building2 className="h-5 w-5 text-emerald-400" /> Add Financial Account
                    </DialogTitle>
                </DialogHeader>

                {/* Bank Presets Selector */}
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

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                        <Label htmlFor="account-name" className="text-xs text-slate-300 font-medium">
                            Account Name (Select preset above or enter any name)
                        </Label>
                        <Input
                            id="account-name"
                            placeholder="e.g. Hibret Bank, Bank of Abyssinia, CBE, Telebirr..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-white text-xs placeholder:text-slate-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-300 font-medium">Account Category</Label>
                            <Select value={type} onValueChange={(val) => val && setType(val as AccountType)}>
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
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
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs text-white">
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
                        <Label htmlFor="account-balance" className="text-xs text-slate-300 font-medium">Initial Balance</Label>
                        <Input
                            id="account-balance"
                            type="number"
                            step="0.01"
                            min={allowOverdraft ? undefined : 0}
                            placeholder="0.00"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-xs text-white placeholder:text-slate-500"
                        />
                    </div>

                    {/* Overdraft Toggle */}
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50 cursor-pointer hover:border-slate-700 transition-colors">
                        <input
                            type="checkbox"
                            checked={allowOverdraft}
                            onChange={(e) => {
                                setAllowOverdraft(e.target.checked)
                                if (!e.target.checked && parseFloat(balance) < 0) setBalance('')
                            }}
                            className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                        />
                        <div>
                            <p className="text-xs font-medium text-slate-200">Allow Overdraft / Negative Balance</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Enable for credit cards, loans, or overdraft accounts where the balance can go below zero.
                            </p>
                        </div>
                    </label>

                    <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-medium py-2.5"
                    >
                        {isPending ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
