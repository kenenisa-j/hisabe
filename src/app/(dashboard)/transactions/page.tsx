import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'
import { getCategories } from '@/actions/category-actions'
import { TransactionList } from '@/components/transactions/transaction-list'
import { AddTransactionModal } from '@/components/transactions/add-transaction-modal'

export const revalidate = 0

export default async function TransactionsPage() {
    const userId = await getAuthenticatedUser()

    const [transactionRows, accountRows, categories] = await Promise.all([
        sql`
      SELECT 
        t.id,
        t.user_id,
        t.account_id,
        t.category_id,
        t.type,
        t.amount,
        t.currency,
        t.base_amount_etb,
        t.description,
        t.transaction_date,
        t.created_at,
        a.name AS account_name,
        c.name AS category_name,
        c.icon AS category_icon
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT 200
    `,
        sql`
      SELECT id, name, currency FROM accounts WHERE user_id = ${userId} AND is_archived = false ORDER BY name ASC
    `,
        getCategories(),
    ])

    const transactions = transactionRows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        account_id: r.account_id,
        category_id: r.category_id,
        type: r.type,
        amount: parseFloat(r.amount),
        currency: r.currency,
        base_amount_etb: parseFloat(r.base_amount_etb),
        description: r.description,
        transaction_date: r.transaction_date,
        created_at: r.created_at,
        account_name: r.account_name,
        category_name: r.category_name,
        category_icon: r.category_icon,
    }))

    const accounts = accountRows.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Transactions</h1>
                    <p className="text-sm text-slate-400">
                        Search, filter, and log income, expenses, and account transfers.
                    </p>
                </div>

                {/* Speed Entry Modal */}
                <AddTransactionModal accounts={accounts} categories={categories} />
            </div>

            <TransactionList
                initialTransactions={transactions}
                accounts={accounts}
                categories={categories}
            />
        </div>
    )
}