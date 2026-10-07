'use client'

import { useState } from 'react'
import { DashboardMetrics } from '@/actions/dashboard-actions'
import { formatCurrency } from '@/lib/utils'
import { BankBrandLogo } from '@/components/accounts/bank-brand-logo'
import { AddTransactionModal } from '@/components/transactions/add-transaction-modal'
import {
    TrendingUp,
    TrendingDown,
    PiggyBank,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowRightLeft,
    ArrowDownRight,
    Eye,
    EyeOff,
} from 'lucide-react'

interface AccountItem {
    id: string
    name: string
    type?: string
    balance?: number
    currency: string
}

interface CategoryItem {
    id: string
    name: string
    type: 'income' | 'expense'
}

interface MetricCardsProps {
    metrics: DashboardMetrics
    accounts?: AccountItem[]
    categories?: CategoryItem[]
}

export function MetricCards({ metrics, accounts = [], categories = [] }: MetricCardsProps) {
    const {
        totalBalanceEtb,
        monthlyIncomeEtb,
        monthlyExpenseEtb,
        netSavingsEtb,
        incomeChangePercent,
        expenseChangePercent,
        todayIncomeEtb = 0,
        todayExpenseEtb = 0,
        todayNetSavingsEtb = 0,
        todayTransactionCount = 0,
    } = metrics

    const [showBalance, setShowBalance] = useState(true)
    const [selectedPill, setSelectedPill] = useState('Summary')
    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'income' | 'expense' | 'transfer'>('expense')

    const isSavingsPositive = netSavingsEtb >= 0
    const isTodaySavingsPositive = todayNetSavingsEtb >= 0
    const accountCount = accounts.length
    const uniqueInstitutions = Array.from(new Set(accounts.map((a) => a.name.trim().toLowerCase()))).length

    const accountPills = accounts.slice(0, 6).map((a) => {
        const shortName = a.name.split(' ')[0]
        return { id: a.id, label: shortName.toUpperCase() }
    })

    const handleQuickAction = (mode: 'income' | 'expense' | 'transfer') => {
        setModalMode(mode)
        setModalOpen(true)
    }

    const displayedAccounts = selectedPill === 'Summary' || selectedPill === 'Today'
        ? accounts
        : accounts.filter((a) => a.name.toUpperCase().includes(selectedPill.toUpperCase()) || a.id === selectedPill)

    const currentBalance = selectedPill === 'Summary' || selectedPill === 'Today'
        ? totalBalanceEtb
        : displayedAccounts.reduce((sum, a) => sum + (a.balance || 0), 0)

    return (
        <div className="space-y-6">
            {/* Quick Entry Modal */}
            <AddTransactionModal
                accounts={accounts}
                categories={categories}
                open={modalOpen}
                onOpenChange={setModalOpen}
                initialMode={modalMode}
                triggerButton={null}
            />

            {/* 1. HORIZONTAL PILLS FILTER BAR */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                <button
                    type="button"
                    onClick={() => setSelectedPill('Summary')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                        selectedPill === 'Summary'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                >
                    Summary
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedPill('Today')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                        selectedPill === 'Today'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                >
                    Today
                </button>
                {accountPills.map((pill) => (
                    <button
                        key={pill.id}
                        type="button"
                        onClick={() => setSelectedPill(pill.label)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                            selectedPill === pill.label
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                        }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>

            {/* 2. HERO CARD (TOTAL BALANCE OR TODAY'S CASH FLOW) */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                        {selectedPill === 'Summary'
                            ? 'TOTAL BALANCE'
                            : selectedPill === 'Today'
                            ? "TODAY'S NET FLOW"
                            : `${selectedPill} BALANCE`}
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowBalance(!showBalance)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        title={showBalance ? 'Hide balance' : 'Show balance'}
                    >
                        {showBalance ? (
                            <>
                                <Eye className="h-3.5 w-3.5" />
                                <span>Hide</span>
                            </>
                        ) : (
                            <>
                                <EyeOff className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Show</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                    <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                        {showBalance ? (
                            selectedPill === 'Today' ? (
                                <span className={todayNetSavingsEtb > 0 ? 'text-emerald-400' : todayNetSavingsEtb < 0 ? 'text-rose-400' : 'text-white'}>
                                    {(todayNetSavingsEtb > 0 ? '+' : '') + formatCurrency(todayNetSavingsEtb, 'ETB')}
                                </span>
                            ) : (
                                formatCurrency(currentBalance, 'ETB')
                            )
                        ) : (
                            '••••••••'
                        )}
                    </h2>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                    <div>
                        {selectedPill === 'Today' ? (
                            <span>
                                {todayTransactionCount} Transaction{todayTransactionCount === 1 ? '' : 's'} recorded today
                            </span>
                        ) : selectedPill === 'Summary' ? (
                            <>
                                {uniqueInstitutions > 0 && <span>{uniqueInstitutions} Institutions · </span>}
                                <span>{accountCount} Active Accounts</span>
                            </>
                        ) : (
                            <span>{displayedAccounts.length} Selected Account{displayedAccounts.length === 1 ? '' : 's'}</span>
                        )}
                    </div>

                    {selectedPill === 'Today' ? (
                        <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            Today&apos;s Activity
                        </div>
                    ) : (
                        incomeChangePercent !== 0 && (
                            <div
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${
                                    incomeChangePercent >= 0
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                }`}
                            >
                                {incomeChangePercent >= 0 ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3" />
                                )}
                                {incomeChangePercent > 0 ? '+' : ''}
                                {incomeChangePercent.toFixed(1)}% vs last month
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* 3. QUICK ACTION BUTTONS: INCOME | EXPENSE | TRANSFER ONLY */}
            <div className="grid grid-cols-3 gap-3">
                <button
                    type="button"
                    onClick={() => handleQuickAction('income')}
                    className="group flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 transition-all hover:bg-slate-850 hover:border-emerald-500/60 shadow-lg active:scale-98"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/25 transition-all">
                        <ArrowDownLeft className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <span className="mt-2.5 text-xs font-bold text-slate-200 group-hover:text-white">Income</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleQuickAction('expense')}
                    className="group flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-slate-900 p-4 transition-all hover:bg-slate-850 hover:border-rose-500/60 shadow-lg active:scale-98"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500/25 transition-all">
                        <ArrowUpRight className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <span className="mt-2.5 text-xs font-bold text-slate-200 group-hover:text-white">Expense</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleQuickAction('transfer')}
                    className="group flex flex-col items-center justify-center rounded-2xl border border-blue-500/30 bg-slate-900 p-4 transition-all hover:bg-slate-850 hover:border-blue-500/60 shadow-lg active:scale-98"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 group-hover:bg-blue-500/25 transition-all">
                        <ArrowRightLeft className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <span className="mt-2.5 text-xs font-bold text-slate-200 group-hover:text-white">Transfer</span>
                </button>
            </div>

            {/* 4. SUMMARY / TODAY RECAP STRIP (INCOME, EXPENSES, NET FLOW) */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">
                            {selectedPill === 'Today' ? "Today's Income" : 'Monthly Income'}
                        </span>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="mt-2 text-base font-extrabold text-emerald-400">
                        {showBalance
                            ? formatCurrency(selectedPill === 'Today' ? todayIncomeEtb : monthlyIncomeEtb, 'ETB')
                            : '••••••••'}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">
                            {selectedPill === 'Today' ? "Today's Expenses" : 'Monthly Expenses'}
                        </span>
                        <TrendingDown className="h-4 w-4 text-rose-400" />
                    </div>
                    <p className="mt-2 text-base font-extrabold text-rose-400">
                        {showBalance
                            ? formatCurrency(selectedPill === 'Today' ? todayExpenseEtb : monthlyExpenseEtb, 'ETB')
                            : '••••••••'}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-white">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">
                            {selectedPill === 'Today' ? "Today's Net Flow" : 'Net Cash Flow'}
                        </span>
                        <PiggyBank className="h-4 w-4 text-blue-400" />
                    </div>
                    <p
                        className={`mt-2 text-base font-extrabold ${
                            selectedPill === 'Today'
                                ? isTodaySavingsPositive
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                : isSavingsPositive
                                ? 'text-blue-400'
                                : 'text-rose-400'
                        }`}
                    >
                        {showBalance
                            ? selectedPill === 'Today'
                                ? (isTodaySavingsPositive ? '+' : '') + formatCurrency(todayNetSavingsEtb, 'ETB')
                                : (isSavingsPositive ? '+' : '') + formatCurrency(netSavingsEtb, 'ETB')
                            : '••••••••'}
                    </p>
                </div>
            </div>

            {/* 5. FINANCIAL ACCOUNTS CARDS GRID */}
            {displayedAccounts.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-white">My Financial Accounts</h3>
                        <span className="text-xs font-medium text-slate-400">{displayedAccounts.length} active</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {displayedAccounts.map((account) => {
                            const bal = account.balance ?? 0
                            return (
                                <div
                                    key={account.id}
                                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4 transition-all hover:border-slate-700 hover:bg-slate-850 hover:shadow-lg active:scale-98"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <BankBrandLogo
                                            name={account.name}
                                            type={account.type || 'bank'}
                                            size="md"
                                        />
                                        <span className="rounded-md bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-800">
                                            {account.type || 'Bank'}
                                        </span>
                                    </div>

                                    <div className="mt-4">
                                        <p className="line-clamp-1 text-xs font-bold text-slate-200 group-hover:text-white">
                                            {account.name}
                                        </p>
                                        <p className="mt-1 text-base font-black text-white tracking-tight">
                                            {showBalance ? formatCurrency(bal, account.currency || 'ETB') : '••••••'}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}