import { getAccounts } from '@/actions/account-actions'
import { AccountCards } from '@/components/accounts/account-cards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Wallet, DollarSign } from 'lucide-react'

export const revalidate = 0 // Disable caching for instant updates

export default async function AccountsPage() {
    const accounts = await getAccounts(true)

    // Calculate totals by currency
    const totalEtb = accounts
        .filter((a) => !a.is_archived && a.currency === 'ETB')
        .reduce((sum, a) => sum + Number(a.balance), 0)

    const totalUsd = accounts
        .filter((a) => !a.is_archived && a.currency === 'USD')
        .reduce((sum, a) => sum + Number(a.balance), 0)

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Accounts</h1>
                <p className="text-sm text-slate-400">
                    Manage your bank accounts, mobile money, and physical cash.
                </p>
            </div>

            {/* Aggregate Balance Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="border-slate-800 bg-slate-900 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            Total ETB Balance
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-emerald-400">
                            {formatCurrency(totalEtb, 'ETB')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            Total USD Balance
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-blue-400">
                            {formatCurrency(totalUsd, 'USD')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Accounts List & Actions */}
            <AccountCards initialAccounts={accounts} />
        </div>
    )
}