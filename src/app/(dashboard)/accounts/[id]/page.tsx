import { notFound } from 'next/navigation'
import { getAccountWithTransactions } from '@/actions/account-actions'
import { AccountActivityFeed } from '@/components/accounts/account-activity-feed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

import { AccountDetailHeader } from '@/components/accounts/account-detail-header'

export const revalidate = 0

interface AccountDetailPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
    const { id } = await params

    let data
    try {
        data = await getAccountWithTransactions(id)
    } catch {
        notFound()
    }

    const { account, transactions } = data

    // Compute basic incoming / outgoing metrics
    const totalInflow = transactions
        .filter((t) => t.type === 'income' || (t.type === 'transfer' && t.to_account_id === account.id))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const totalOutflow = transactions
        .filter((t) => t.type === 'expense' || (t.type === 'transfer' && t.account_id === account.id))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    return (
        <div className="space-y-6">
            {/* Navigation & Header */}
            <AccountDetailHeader account={account} />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border-slate-800 bg-slate-900 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400">Current Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-emerald-400">
                            {formatCurrency(account.balance, account.currency)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400">Total Inflow</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">
                            {formatCurrency(totalInflow, account.currency)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400">Total Outflow</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-rose-400" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">
                            {formatCurrency(totalOutflow, account.currency)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Account Activity Table Feed */}
            <AccountActivityFeed account={account} transactions={transactions} />
        </div>
    )
}