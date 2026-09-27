import { getSavingsGoals } from '@/actions/savings-goal-actions'
import { getAccounts } from '@/actions/account-actions'
import { GoalsContainer } from './goals-container'

export const revalidate = 0

export default async function GoalsPage() {
    const [goals, accountsData] = await Promise.all([
        getSavingsGoals(),
        getAccounts(),
    ])

    const accounts = accountsData.map((a) => ({
        id: a.id,
        name: a.name,
        balance: typeof a.balance === 'number' ? a.balance : parseFloat(a.balance as unknown as string),
    }))

    return <GoalsContainer goals={goals} accounts={accounts} />
}
