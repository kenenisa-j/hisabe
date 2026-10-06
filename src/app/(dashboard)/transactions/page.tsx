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
        c.icon AS category_icon,
        NULL::uuid AS to_account_id,
        NULL::text AS to_account_name,
        0::numeric AS fee
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}

      UNION ALL

      SELECT
        tr.id,
        tr.user_id,
        tr.from_account_id AS account_id,
        NULL::uuid AS category_id,
        'transfer'::text AS type,
        tr.amount,
        tr.currency,
        tr.amount AS base_amount_etb,
        tr.description,
        tr.transfer_date::date AS transaction_date,
        tr.created_at,
        fa.name AS account_name,
        NULL::text AS category_name,
        NULL::text AS category_icon,
        tr.to_account_id,
        ta.name AS to_account_name,
        COALESCE(tr.fee, 0) AS fee
      FROM transfers tr
      LEFT JOIN accounts fa ON tr.from_account_id = fa.id
      LEFT JOIN accounts ta ON tr.to_account_id = ta.id
      WHERE tr.user_id = ${userId}

      ORDER BY transaction_date DESC, created_at DESC
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
        description: r.type === 'transfer'
            ? (r.description || `${r.account_name} → ${r.to_account_name}`)
            : r.description,
        transaction_date: r.transaction_date,
        created_at: r.created_at,
        account_name: r.type === 'transfer'
            ? `${r.account_name} → ${r.to_account_name}`
            : r.account_name,
        category_name: r.category_name,
        category_icon: r.category_icon,
        fee: r.fee ? parseFloat(r.fee) : 0,
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