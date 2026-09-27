export type DebtType = 'owed_by_me' | 'owed_to_me'
export type DebtStatus = 'pending' | 'partial' | 'settled'

export interface Debt {
    id: string
    userId: string
    personName: string
    type: DebtType
    amount: number
    paidAmount: number
    remainingAmount: number
    currency: string
    dueDate: string | null
    status: DebtStatus
    notes: string | null
    createdAt: string
    updatedAt: string
}

export interface CreateDebtInput {
    personName: string
    type: DebtType
    amount: number
    currency?: string
    dueDate?: string | null
    notes?: string | null
}

export interface RecordRepaymentInput {
    debtId: string
    amount: number
    accountId?: string // Optional account ID if adding to / deducting from account balance
}