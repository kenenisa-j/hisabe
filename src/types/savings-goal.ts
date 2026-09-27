export interface SavingsGoal {
    id: string
    userId: string
    name: string
    targetAmount: number
    currentAmount: number
    targetDate: string
    createdAt: string
    updatedAt: string
}

export interface SavingsGoalProgress extends SavingsGoal {
    remainingAmount: number
    percentageCompleted: number
    isCompleted: boolean
    daysRemaining: number
}

export interface CreateSavingsGoalInput {
    name: string
    targetAmount: number
    targetDate: string
}

export interface UpdateGoalContributionInput {
    goalId: string
    amount: number
    type: 'deposit' | 'withdraw'
}