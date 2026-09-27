'use client'

import { useState } from 'react'
import { Account, Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search } from 'lucide-react'

export interface ExtendedAccountTransaction extends Transaction {
    category_name?: string
    to_account_id?: string
}

interface AccountActivityFeedProps {
    account: Account
    transactions: ExtendedAccountTransaction[]
}

export function AccountActivityFeed({ account, transactions }: AccountActivityFeedProps) {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')

    const filteredTransactions = transactions.filter((tx) => {
        const matchesSearch =
            (tx.description && tx.description.toLowerCase().includes(search.toLowerCase())) ||
            (tx.category_name && tx.category_name.toLowerCase().includes(search.toLowerCase()))

        const isIncomingTransfer = tx.type === 'transfer' && tx.to_account_id === account.id
        const isOutgoingTransfer = tx.type === 'transfer' && tx.account_id === account.id

        let matchesType = true
        if (typeFilter === 'income') matchesType = tx.type === 'income' || isIncomingTransfer
        if (typeFilter === 'expense') matchesType = tx.type === 'expense' || isOutgoingTransfer
        if (typeFilter === 'transfer') matchesType = tx.type === 'transfer'

        return matchesSearch && matchesType
    })

    return (
        <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
                <CardTitle className="text-lg font-semibold">Activity Feed</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search description or category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(val) => setTypeFilter((val || 'all') as 'all' | 'income' | 'expense' | 'transfer')}>
                        <SelectTrigger className="w-full sm:w-36 bg-slate-950 border-slate-800 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="income">Inflow</SelectItem>
                            <SelectItem value="expense">Outflow</SelectItem>
                            <SelectItem value="transfer">Transfers</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {filteredTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        No transactions found for this account.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {filteredTransactions.map((tx) => {
                            const isIncoming =
                                tx.type === 'income' || (tx.type === 'transfer' && tx.to_account_id === account.id)

                            return (
                                <div key={tx.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`rounded-full p-2.5 ${tx.type === 'transfer'
                                                    ? 'bg-blue-500/10 text-blue-400'
                                                    : isIncoming
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-rose-500/10 text-rose-400'
                                                }`}
                                        >
                                            {tx.type === 'transfer' ? (
                                                <ArrowRightLeft className="h-4 w-4" />
                                            ) : isIncoming ? (
                                                <ArrowDownLeft className="h-4 w-4" />
                                            ) : (
                                                <ArrowUpRight className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {tx.description || tx.category_name || 'Uncategorized'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-slate-400">{formatDate(tx.transaction_date)}</span>
                                                {tx.category_name && (
                                                    <Badge variant="outline" className="text-[10px] border-slate-800 text-slate-400">
                                                        {tx.category_name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p
                                            className={`text-sm font-semibold ${tx.type === 'transfer'
                                                    ? 'text-blue-400'
                                                    : isIncoming
                                                        ? 'text-emerald-400'
                                                        : 'text-rose-400'
                                                }`}
                                        >
                                            {isIncoming ? '+' : '-'}{formatCurrency(tx.amount, account.currency)}
                                        </p>
                                        <span className="text-[11px] capitalize text-slate-500">{tx.type}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}