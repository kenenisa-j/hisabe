import { z } from 'zod'

/**
 * Transaction Creation / Mutation Schema
 */
export const TransactionSchema = z.object({
    accountId: z.string().uuid({ message: 'Invalid Account ID format' }),
    categoryId: z.string().uuid({ message: 'Invalid Category ID format' }).optional().nullable(),
    amount: z
        .number()
        .positive({ message: 'Amount must be a positive number' })
        .max(1000000000, { message: 'Amount exceeds maximum allowable limit' }),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER'], {
        message: 'Invalid transaction type',
    }),
    description: z.string().trim().max(255, { message: 'Description cannot exceed 255 characters' }).optional(),
    transactionDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be formatted as YYYY-MM-DD' }),
})

export type TransactionSchemaInput = z.infer<typeof TransactionSchema>

/**
 * Account Schema
 */
export const AccountSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
    type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH']),
    balance: z.number().max(1000000000, 'Balance out of allowed bounds'),
    currency: z.string().length(3, 'Currency must be a valid 3-letter ISO code').default('USD'),
})

/**
 * Budget Schema
 */
export const BudgetSchema = z.object({
    categoryId: z.string().uuid({ message: 'Invalid Category ID' }),
    amountLimit: z.number().positive('Budget limit must be greater than zero'),
    period: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
})

/**
 * CSV Import Row Schema Validation
 */
export const CSVImportRowSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid row date format' }),
    amount: z.number().refine((val) => val !== 0, { message: 'Row amount cannot be zero' }),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    description: z.string().max(255).optional(),
})