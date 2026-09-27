import { z } from 'zod'

export const transactionFormSchema = z.object({
    amount: z.coerce
        .number({ message: 'Please enter a valid amount' })
        .gt(0, 'Amount must be greater than 0'),
    type: z.enum(['income', 'expense'], {
        message: 'Transaction type is required',
    }),
    accountId: z.string().min(1, 'Please select an account'),
    categoryId: z.string().optional().nullable(),
    date: z.string().min(1, 'Date is required'),
    description: z.string().max(255, 'Description cannot exceed 255 characters').optional(),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>