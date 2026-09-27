import { z } from 'zod'

export const accountFormSchema = z.object({
    name: z
        .string()
        .min(2, 'Account name must be at least 2 characters')
        .max(50, 'Account name cannot exceed 50 characters'),
    type: z.enum(['bank', 'telebirr', 'cash', 'savings', 'digital'], {
        message: 'Please select an account type',
    }),
    currency: z.enum(['ETB', 'USD'], {
        message: 'Please select a currency',
    }),
    initialBalance: z.coerce
        .number({ message: 'Please enter a valid amount' })
        .min(0, 'Balance cannot be negative'),
})

export type AccountFormValues = z.infer<typeof accountFormSchema>