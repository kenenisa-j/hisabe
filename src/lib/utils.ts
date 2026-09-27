import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'ETB') {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount)
    }

    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)

    return `${formattedNumber} ETB`
}

/**
 * Formats ISO date string into human-friendly relative date headers
 */
export function formatTransactionGroupHeader(dateStr: string): string {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d, yyyy')
}

/**
 * Format a date string into readable MMM d, yyyy
 */
export function formatDate(dateInput: string | Date): string {
    if (!dateInput) return ''
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput
    return format(date, 'MMM d, yyyy')
}