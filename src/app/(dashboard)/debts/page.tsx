import { getDebts } from '@/actions/debt-actions'
import { getAccounts } from '@/actions/account-actions'
import { DebtsContainer } from '@/components/debts/debts-container'

export const metadata = {
    title: 'Debts & Loans - Hisabe',
}

export default async function DebtsPage() {
    const [debts, accounts] = await Promise.all([getDebts(), getAccounts()])

    return (
        <DebtsContainer
            debts={debts}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        />
    )
}