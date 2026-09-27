export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
    id: string
    userId: string
    accountId: string
    accountName?: string
    categoryId: string | null
    categoryName?: string | null
    type: 'income' | 'expense' | 'transfer'
    amount: number
    currency: string
    description: string | null
    frequency: RecurringFrequency
    nextDueDate: string
    autoRecord: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface CreateRecurringInput {
    accountId: string
    categoryId?: string | null
    type: 'income' | 'expense' | 'transfer'
    amount: number
    currency?: string
    description?: string
    frequency: RecurringFrequency
    startDate: string
    autoRecord?: boolean
}