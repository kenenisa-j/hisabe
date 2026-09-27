'use client'

import { useState, useMemo } from 'react'
import { Transaction, Currency } from '@/types'
import { formatCurrency, formatTransactionGroupHeader } from '@/lib/utils'
import { CategoryIcon } from '@/components/categories/category-icon'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, SlidersHorizontal, RotateCcw, ArrowUpDown, Calendar } from 'lucide-react'

export interface ExtendedTransaction extends Transaction {
    account_name?: string
    category_name?: string
    category_icon?: string
}

interface TransactionListProps {
    initialTransactions: ExtendedTransaction[]
    accounts: { id: string; name: string }[]
    categories: { id: string; name: string }[]
}

type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

function getTxDateStr(val: string | Date): string {
    if (!val) return ''
    if (typeof val === 'string') return val.substring(0, 10)
    if (val instanceof Date) return val.toISOString().substring(0, 10)
    return String(val).substring(0, 10)
}

export function TransactionList({
    initialTransactions,
    accounts,
    categories,
}: TransactionListProps) {
    // Filter States
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [accountFilter, setAccountFilter] = useState<string>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [sortBy, setSortBy] = useState<SortOrder>('date-desc')
    const [showFilters, setShowFilters] = useState(false)

    // Clear all filters
    const resetFilters = () => {
        setSearch('')
        setTypeFilter('all')
        setAccountFilter('all')
        setCategoryFilter('all')
        setStartDate('')
        setEndDate('')
        setSortBy('date-desc')
    }

    const hasActiveFilters =
        search !== '' ||
        typeFilter !== 'all' ||
        accountFilter !== 'all' ||
        categoryFilter !== 'all' ||
        startDate !== '' ||
        endDate !== '' ||
        sortBy !== 'date-desc'

    // Filter & Sort Pipeline
    const filteredAndSorted = useMemo(() => {
        return initialTransactions
            .filter((tx) => {
                // Search query filter (matches description, category, or account)
                const query = search.toLowerCase()
                const matchesSearch =
                    !query ||
                    (tx.description && tx.description.toLowerCase().includes(query)) ||
                    (tx.category_name && tx.category_name.toLowerCase().includes(query)) ||
                    (tx.account_name && tx.account_name.toLowerCase().includes(query))

                // Type filter
                const matchesType = typeFilter === 'all' || tx.type === typeFilter

                // Account filter
                const matchesAccount = accountFilter === 'all' || tx.account_id === accountFilter

                // Category filter
                const matchesCategory = categoryFilter === 'all' || tx.category_id === categoryFilter

                // Date range filter
                const txDate = getTxDateStr(tx.transaction_date)
                const matchesStart = !startDate || txDate >= startDate
                const matchesEnd = !endDate || txDate <= endDate

                return (
                    matchesSearch &&
                    matchesType &&
                    matchesAccount &&
                    matchesCategory &&
                    matchesStart &&
                    matchesEnd
                )
            })
            .sort((a, b) => {
                if (sortBy === 'date-desc') {
                    return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
                }
                if (sortBy === 'date-asc') {
                    return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
                }
                if (sortBy === 'amount-desc') {
                    return Number(b.amount) - Number(a.amount)
                }
                if (sortBy === 'amount-asc') {
                    return Number(a.amount) - Number(b.amount)
                }
                return 0
            })
    }, [initialTransactions, search, typeFilter, accountFilter, categoryFilter, startDate, endDate, sortBy])

    // Group by date YYYY-MM-DD
    const groupedTransactions = useMemo(() => {
        return filteredAndSorted.reduce<Record<string, ExtendedTransaction[]>>((groups, tx) => {
            const dateKey = getTxDateStr(tx.transaction_date)
            if (!groups[dateKey]) {
                groups[dateKey] = []
            }
            groups[dateKey].push(tx)
            return groups
        }, {})
    }, [filteredAndSorted])

    const dateKeys = Object.keys(groupedTransactions)

    return (
        <div className="space-y-6">
            {/* Search & Action Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search description, category, account..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle Filter Drawer */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`border-slate-800 text-slate-300 hover:bg-slate-800 ${showFilters ? 'bg-slate-800 text-white' : ''
                            }`}
                    >
                        <SlidersHorizontal className="h-4 w-4 mr-2 text-emerald-400" />
                        Filters
                        {hasActiveFilters && (
                            <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-none text-[10px] px-1.5 py-0">
                                Active
                            </Badge>
                        )}
                    </Button>

                    {/* Sort Selector */}
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOrder)}>
                        <SelectTrigger className="w-[170px] bg-slate-950 border-slate-800 text-slate-300">
                            <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-slate-500" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="date-desc">Newest First</SelectItem>
                            <SelectItem value="date-asc">Oldest First</SelectItem>
                            <SelectItem value="amount-desc">Highest Amount</SelectItem>
                            <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={resetFilters}
                            title="Reset Filters"
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Expanded Filter Controls Panel */}
            {showFilters && (
                <Card className="border-slate-800 bg-slate-950/80 text-white p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Type Filter */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400">Transaction Type</label>
                            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'all')}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                                    <SelectValue>
                                        {typeFilter === 'all' ? 'All Types' : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Account Filter */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400">Account</label>
                            <Select value={accountFilter} onValueChange={(val) => setAccountFilter(val || 'all')}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                                    <SelectValue>
                                        {accountFilter === 'all' ? 'All Accounts' : accounts.find((a) => a.id === accountFilter)?.name || 'Account'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="all">All Accounts</SelectItem>
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400">Category</label>
                            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'all')}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                                    <SelectValue>
                                        {categoryFilter === 'all' ? 'All Categories' : categories.find((c) => c.id === categoryFilter)?.name || 'Category'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range Inputs */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400">Date Range</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-slate-900 border-slate-800 text-xs text-white p-2 [color-scheme:dark]"
                                />
                                <span className="text-slate-600">-</span>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-slate-900 border-slate-800 text-xs text-white p-2 [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Results Overview */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                    Showing {filteredAndSorted.length} of {initialTransactions.length} transactions
                </span>
                {hasActiveFilters && (
                    <button onClick={resetFilters} className="text-emerald-400 hover:underline">
                        Clear all filters
                    </button>
                )}
            </div>

            {/* Transaction Feed */}
            {dateKeys.length === 0 ? (
                <Card className="border-slate-800 bg-slate-900 p-12 text-center">
                    <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-300 font-medium">No transactions found</p>
                    <p className="text-xs text-slate-500 mt-1">
                        Try adjusting your search keywords, category filters, or date range.
                    </p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {dateKeys.map((dateKey) => {
                        const dayTransactions = groupedTransactions[dateKey]
                        const dayTotalEtb = dayTransactions
                            .filter((t) => t.currency === 'ETB')
                            .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)

                        return (
                            <div key={dateKey} className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-sm font-semibold text-slate-400">
                                        {formatTransactionGroupHeader(dateKey)}
                                    </h3>
                                    {dayTotalEtb !== 0 && (
                                        <span className={`text-xs font-medium ${dayTotalEtb > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {dayTotalEtb > 0 ? '+' : ''}{formatCurrency(dayTotalEtb, 'ETB')}
                                        </span>
                                    )}
                                </div>

                                <Card className="border-slate-800 bg-slate-900 text-white">
                                    <CardContent className="p-0 divide-y divide-slate-800/60">
                                        {dayTransactions.map((tx) => {
                                            const isIncome = tx.type === 'income'
                                            const isExpense = tx.type === 'expense'

                                            return (
                                                <div
                                                    key={tx.id}
                                                    className="flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div
                                                            className={`rounded-xl p-2.5 ${isIncome
                                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                                    : isExpense
                                                                        ? 'bg-rose-500/10 text-rose-400'
                                                                        : 'bg-blue-500/10 text-blue-400'
                                                                }`}
                                                        >
                                                            <CategoryIcon iconName={tx.category_icon} className="h-5 w-5" />
                                                        </div>

                                                        <div>
                                                            <p className="text-sm font-medium text-white">
                                                                {tx.description || tx.category_name || 'Uncategorized'}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs text-slate-400">
                                                                    {tx.account_name || 'Account'}
                                                                </span>
                                                                {tx.category_name && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px] py-0 border-slate-800 text-slate-400 font-normal"
                                                                    >
                                                                        {tx.category_name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <p
                                                            className={`text-sm font-bold ${isIncome
                                                                    ? 'text-emerald-400'
                                                                    : isExpense
                                                                        ? 'text-white'
                                                                        : 'text-blue-400'
                                                                }`}
                                                        >
                                                            {isIncome ? '+' : isExpense ? '-' : ''}
                                                            {formatCurrency(Number(tx.amount), tx.currency as Currency)}
                                                        </p>
                                                        <span className="text-[11px] capitalize text-slate-500">
                                                            {tx.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </Card>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}