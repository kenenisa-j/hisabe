'use server'

import { getAuthenticatedUser } from '@/lib/auth-user'
import { getBudgetsWithProgress } from '@/actions/budget-actions'
import { getDebts } from '@/actions/debt-actions'
import { getAccounts } from '@/actions/account-actions'

export interface AppNotification {
    id: string
    title: string
    description: string
    category: 'alert' | 'budget' | 'debt' | 'account' | 'system'
    type: 'danger' | 'warning' | 'info' | 'success'
    timestamp: string
    link: string
}

/**
 * Fetch dynamic notifications based on real financial status
 */
export async function getNotifications(): Promise<AppNotification[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) return []

    const notifications: AppNotification[] = []
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    try {
        // 1. Budget Alerts
        const budgets = await getBudgetsWithProgress(currentMonth, currentYear)
        for (const b of budgets) {
            if (b.percentageUsed >= 100) {
                notifications.push({
                    id: `budget-over-${b.id}`,
                    title: `Budget Limit Exceeded: ${b.categoryName}`,
                    description: `You have spent ${b.spentAmount.toLocaleString()} ETB of your ${b.amount.toLocaleString()} ETB limit (${b.percentageUsed}%).`,
                    category: 'budget',
                    type: 'danger',
                    timestamp: new Date(b.updatedAt || now).toISOString(),
                    link: '/budgets',
                })
            } else if (b.percentageUsed >= 80) {
                notifications.push({
                    id: `budget-warn-${b.id}`,
                    title: `Budget Warning: ${b.categoryName}`,
                    description: `You have reached ${b.percentageUsed}% of your ${b.categoryName} budget (${b.spentAmount.toLocaleString()} / ${b.amount.toLocaleString()} ETB).`,
                    category: 'budget',
                    type: 'warning',
                    timestamp: new Date(b.updatedAt || now).toISOString(),
                    link: '/budgets',
                })
            }
        }
    } catch (e) {
        console.error('Error calculating budget notifications:', e)
    }

    try {
        // 2. Debts & Loans Alerts
        const debts = await getDebts()
        const todayStr = now.toISOString().split('T')[0]

        for (const debt of debts) {
            if (debt.status === 'settled') continue

            if (debt.dueDate) {
                const dueDateObj = new Date(debt.dueDate)
                const dueStr = dueDateObj.toISOString().split('T')[0]
                const diffTime = dueDateObj.getTime() - now.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (dueStr <= todayStr) {
                    notifications.push({
                        id: `debt-overdue-${debt.id}`,
                        title: `Overdue ${debt.type === 'owed_by_me' ? 'Debt' : 'Loan Collection'}: ${debt.personName}`,
                        description: `${debt.type === 'owed_by_me' ? 'Repayment to' : 'Collection from'} ${debt.personName} (${debt.remainingAmount.toLocaleString()} ${debt.currency}) was due on ${dueDateObj.toLocaleDateString()}.`,
                        category: 'debt',
                        type: 'danger',
                        timestamp: debt.updatedAt ? new Date(debt.updatedAt).toISOString() : now.toISOString(),
                        link: '/debts',
                    })
                } else if (diffDays <= 7) {
                    notifications.push({
                        id: `debt-due-soon-${debt.id}`,
                        title: `Upcoming Due Date: ${debt.personName}`,
                        description: `${debt.remainingAmount.toLocaleString()} ${debt.currency} due in ${diffDays} day${diffDays > 1 ? 's' : ''} (${dueDateObj.toLocaleDateString()}).`,
                        category: 'debt',
                        type: 'warning',
                        timestamp: debt.updatedAt ? new Date(debt.updatedAt).toISOString() : now.toISOString(),
                        link: '/debts',
                    })
                }
            }
        }
    } catch (e) {
        console.error('Error calculating debt notifications:', e)
    }

    try {
        // 3. Low Account Balance Alerts
        const accounts = await getAccounts()
        for (const account of accounts) {
            if (!account.is_archived && account.balance < 500) {
                notifications.push({
                    id: `account-low-${account.id}`,
                    title: `Low Account Balance: ${account.name}`,
                    description: `Current balance is ${account.balance.toLocaleString()} ${account.currency}. Consider transferring funds.`,
                    category: 'account',
                    type: 'warning',
                    timestamp: account.updated_at ? new Date(account.updated_at).toISOString() : now.toISOString(),
                    link: '/accounts',
                })
            }
        }
    } catch (e) {
        console.error('Error calculating account notifications:', e)
    }

    // 4. Default system status notification if clean
    if (notifications.length === 0) {
        notifications.push({
            id: 'system-all-clear',
            title: 'Financial Health Excellent',
            description: 'All budgets are within limits, no overdue debts, and accounts are healthy!',
            category: 'system',
            type: 'success',
            timestamp: now.toISOString(),
            link: '/dashboard',
        })
    }

    return notifications
}
