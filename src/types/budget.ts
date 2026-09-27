export interface Budget {
    id: string
    userId: string
    categoryId: string
    categoryName: string
    amount: number
    month: number
    year: number
    createdAt: string
    updatedAt: string
}

export interface BudgetProgress extends Budget {
    spentAmount: number
    remainingAmount: number
    percentageUsed: number
    isOverBudget: boolean
}

export interface UpsertBudgetInput {
    categoryId: string
    amount: number
    month: number
    year: number
}