import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAccountWithTransactions } from '@/actions/account-actions'
import { AccountActivityFeed } from '@/components/accounts/account-activity-feed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Wallet, Landmark, Smartphone, PiggyBank, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export const revalidate = 0

interface AccountDetailPageProps {
    params: Promise<{
        id: string
    }>
}

const accountIcons = {
    cash: Wallet,
    bank: Landmark,
    telebirr: Smartphone,
    savings: PiggyBank,
    digital: Wallet,
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
    const Icon = accountIcons[account.type as keyof typeof accountIcons] || Wallet

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
            <div className="flex items-center gap-4">
                <Link
                    href="/accounts"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-800 p-2.5 text-emerald-400">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-white">{account.name}</h1>
                            <Badge variant="outline" className="border-slate-800 text-slate-400 capitalize">
                                {account.type}
                            </Badge>
                            {account.is_archived && (
                                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Archived
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">Currency: {account.currency}</p>
                    </div>
                </div>
            </div>

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