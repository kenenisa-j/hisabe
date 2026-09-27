import { RecurringFrequency } from '@/types/recurring'

export function calculateNextDueDate(currentDueDate: Date, frequency: RecurringFrequency): Date {
    const next = new Date(currentDueDate)

    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1)
            break
        case 'weekly':
            next.setDate(next.getDate() + 7)
            break
        case 'monthly':
            next.setMonth(next.getMonth() + 1)
            break
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1)
            break
    }

    return next
}