'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { ensureTablesExist } from '@/lib/db/init-db'
import { getAuthenticatedUser } from '@/lib/auth-user'
export type { SavingsGoalProgress, CreateSavingsGoalInput, UpdateGoalContributionInput } from '@/types/savings-goal'
import {
    SavingsGoalProgress,
    CreateSavingsGoalInput,
    UpdateGoalContributionInput,
} from '@/types/savings-goal'

/**
 * Fetch all savings goals with calculated progress metrics
 */
export async function getSavingsGoals(): Promise<SavingsGoalProgress[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await ensureTablesExist()

    const rows = await sql`
    SELECT
      id,
      user_id,
      name,
      target_amount,
      current_amount,
      target_date,
      created_at,
      updated_at
    FROM savings_goals
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `

    const today = new Date()

    return rows.map((r) => {
        const targetAmount = parseFloat(r.target_amount)
        const currentAmount = parseFloat(r.current_amount)
        const remainingAmount = Math.max(0, targetAmount - currentAmount)
        const percentageCompleted =
            targetAmount > 0
                ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100)
                : 0

        const targetDateObj = new Date(r.target_date)
        const diffTime = targetDateObj.getTime() - today.getTime()
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

        return {
            id: r.id,
            userId: r.user_id,
            name: r.name,
            targetAmount,
            currentAmount,
            targetDate: r.target_date,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            remainingAmount,
            percentageCompleted,
            isCompleted: currentAmount >= targetAmount,
            daysRemaining,
        }
    })
}

/**
 * Create a new savings goal
 */
export async function createSavingsGoal(input: CreateSavingsGoalInput) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { name, targetAmount, targetDate } = input

    if (!name.trim()) throw new Error('Goal name is required')
    if (targetAmount <= 0) throw new Error('Target amount must be greater than zero')

    await sql`
    INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date)
    VALUES (${userId}, ${name.trim()}, ${targetAmount}, 0.00, ${targetDate}::date)
  `

    revalidatePath('/goals')
    return { success: true }
}

/**
 * Deposit or withdraw funds from a goal balance (without touching account balance)
 */
export async function updateGoalContribution(input: UpdateGoalContributionInput) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { goalId, amount, type } = input
    if (amount <= 0) throw new Error('Amount must be greater than zero')

    const [existing] = await sql`
    SELECT current_amount, target_amount FROM savings_goals 
    WHERE id = ${goalId} AND user_id = ${userId}
  `

    if (!existing) throw new Error('Savings goal not found')

    const currentVal = parseFloat(existing.current_amount)
    const newVal = type === 'deposit' ? currentVal + amount : currentVal - amount

    if (newVal < 0) throw new Error('Withdrawal amount exceeds goal balance')

    await sql`
    UPDATE savings_goals
    SET current_amount = ${newVal}, updated_at = NOW()
    WHERE id = ${goalId} AND user_id = ${userId}
  `

    revalidatePath('/goals')
    return { success: true }
}

/**
 * Delete a savings goal
 */
export async function deleteSavingsGoal(goalId: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await sql`
    DELETE FROM savings_goals
    WHERE id = ${goalId} AND user_id = ${userId}
  `

    revalidatePath('/goals')
    return { success: true }
}

export interface DepositToGoalInput {
    goalId: string
    accountId: string
    amount: number
}

/**
 * Deposit money from a financial account into a savings goal and record the
 * deduction as an expense transaction. This keeps accounts/transactions in sync.
 *
 * NOTE: The goal deposit is recorded as an EXPENSE of type "Savings Allocation"
 * so it appears in transaction history without double-counting as a separate expense.
 */
export async function depositToGoal(input: DepositToGoalInput) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const { goalId, accountId, amount } = input
    if (amount <= 0) throw new Error('Deposit amount must be greater than zero')

    // Check account balance
    const [account] = await sql`
    SELECT id, balance, name FROM accounts WHERE id = ${accountId} AND user_id = ${userId}
  `
    if (!account) throw new Error('Account not found')
    if (parseFloat(account.balance) < amount) throw new Error('Insufficient account funds')

    // Fetch goal
    const [goal] = await sql`
    SELECT id, name, current_amount FROM savings_goals WHERE id = ${goalId} AND user_id = ${userId}
  `
    if (!goal) throw new Error('Savings goal not found')

    // Atomically 1) update goal balance, 2) decrease account balance, 3) log transaction
    await sql.transaction([
        sql`
          UPDATE savings_goals 
          SET current_amount = current_amount + ${amount}, updated_at = NOW() 
          WHERE id = ${goalId} AND user_id = ${userId}
        `,
        sql`
          UPDATE accounts 
          SET balance = balance - ${amount}, updated_at = NOW() 
          WHERE id = ${accountId} AND user_id = ${userId}
        `,
        sql`
          INSERT INTO transactions (
            user_id, account_id, type, amount, base_amount_etb, description, transaction_date, created_at
          ) VALUES (
            ${userId}, ${accountId}, 'expense', ${amount}, ${amount},
            ${`Savings Allocation: ${goal.name}`}, CURRENT_DATE, NOW()
          )
        `
    ])

    revalidatePath('/goals')
    revalidatePath('/dashboard')
    revalidatePath('/accounts')
    revalidatePath('/transactions')
    return { success: true }
}