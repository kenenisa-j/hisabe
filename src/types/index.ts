export type Currency = 'ETB' | 'USD'
export type AccountType = 'cash' | 'bank' | 'telebirr' | 'savings' | 'digital'
export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Profile {
    id: string // Clerk User ID
    email: string
    full_name?: string | null
    default_currency: Currency
    created_at: string
    updated_at: string
}

export interface Account {
    id: string
    user_id: string
    name: string
    type: AccountType
    currency: Currency
    balance: number
    is_archived?: boolean
    created_at: string
    updated_at: string
}

export interface Category {
    id: string
    user_id?: string | null
    name: string
    type: 'income' | 'expense'
    icon?: string | null
    is_system: boolean
    created_at: string
}

export interface Transaction {
    id: string
    user_id: string
    account_id: string
    category_id?: string | null
    type: TransactionType
    amount: number
    currency: Currency
    base_amount_etb?: number
    description?: string | null
    transaction_date: string
    created_at: string
}

export interface Transfer {
    id: string
    user_id: string
    from_account_id: string
    to_account_id: string
    amount: number
    currency: Currency
    exchange_rate?: number
    transferred_amount?: number
    fee?: number
    fee_account_id?: string | null
    description?: string | null
    transfer_date: string
    created_at: string
    // Optional joined models
    from_account_name?: string
    to_account_name?: string
}

export * from './settings'