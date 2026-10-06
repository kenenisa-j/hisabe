/**
 * Pure TypeScript Ethiopian Calendar Conversion Utility
 */

const ETHIOPIAN_MONTH_NAMES_AM = [
    'መስከረም',
    'ጥቅምት',
    'ህዳር',
    'ታህሳስ',
    'ጥር',
    'የካቲት',
    'መጋቢት',
    'ሚያዝያ',
    'ግንቦት',
    'ሰኔ',
    'ሐምሌ',
    'ነሐሴ',
    'ጳጉሜ',
]

const ETHIOPIAN_MONTH_NAMES_EN = [
    'Meskerem',
    'Tikimt',
    'Hidar',
    'Tahsas',
    'Tir',
    'Yakatit',
    'Megabit',
    'Miyazya',
    'Ginbot',
    'Sene',
    'Hamle',
    'Nehase',
    'Pagume',
]

export function gregorianToJDN(year: number, month: number, day: number): number {
    const a = Math.floor((14 - month) / 12)
    const y = year + 4800 - a
    const m = month + 12 * a - 3
    return (
        day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045
    )
}

export function jdnToEthiopian(jdn: number): { year: number; month: number; day: number } {
    const r = (jdn - 1723856) % 1461
    const n = (r % 365) + 365 * Math.floor(r / 1460)
    const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460)
    const month = Math.floor(n / 30) + 1
    const day = (n % 30) + 1
    return { year, month, day }
}

export function getEthiopianDate(dateInput: Date | string): {
    year: number
    month: number
    day: number
    monthNameAmharic: string
    monthNameEnglish: string
    formattedAmharic: string
    formattedEnglish: string
} {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    const gy = d.getFullYear()
    const gm = d.getMonth() + 1
    const gd = d.getDate()

    const jdn = gregorianToJDN(gy, gm, gd)
    const eth = jdnToEthiopian(jdn)

    const monthNameAmharic = ETHIOPIAN_MONTH_NAMES_AM[eth.month - 1] || 'መስከረም'
    const monthNameEnglish = ETHIOPIAN_MONTH_NAMES_EN[eth.month - 1] || 'Meskerem'

    return {
        year: eth.year,
        month: eth.month,
        day: eth.day,
        monthNameAmharic,
        monthNameEnglish,
        formattedAmharic: `${monthNameAmharic} ${eth.day}, ${eth.year}`,
        formattedEnglish: `${monthNameEnglish} ${eth.day}, ${eth.year}`,
    }
}

export function formatDateWithCalendar(
    dateInput: Date | string,
    calendarType: 'gregorian' | 'ethiopian' | 'both' = 'gregorian'
): { main: string; sub?: string } {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return { main: '' }

    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
    const gregorianStr = d.toLocaleDateString('en-US', options)
    const eth = getEthiopianDate(d)
    const ethAmharicStr = `${eth.monthNameAmharic} ${eth.day}፣ ${eth.year} ዓ.ም.`
    const ethEngStr = `${eth.monthNameEnglish} ${eth.day}, ${eth.year} E.C.`

    if (calendarType === 'ethiopian') {
        return { main: ethAmharicStr, sub: ethEngStr }
    } else if (calendarType === 'both') {
        return {
            main: gregorianStr,
            sub: ethAmharicStr,
        }
    }
    return { main: gregorianStr }
}
