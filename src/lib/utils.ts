import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { isToday, isYesterday, parseISO } from 'date-fns'
import { formatDateWithCalendar } from '@/lib/ethiopian-calendar'

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
export function formatTransactionGroupHeader(
    dateStr: string,
    calendarType: 'gregorian' | 'ethiopian' | 'both' = 'gregorian'
): string {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return formatDateWithCalendar(date, calendarType).main
}

/**
 * Format a date string into readable date (Gregorian, Ethiopian, or Both)
 */
export function formatDate(
    dateInput: string | Date,
    calendarType: 'gregorian' | 'ethiopian' | 'both' = 'gregorian'
): string {
    if (!dateInput) return ''
    return formatDateWithCalendar(dateInput, calendarType).main
}