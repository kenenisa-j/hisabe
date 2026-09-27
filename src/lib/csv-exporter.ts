/**
 * Converts array of records into a downloadable CSV string
 */
export function convertToCSV<T extends Record<string, unknown>>(
    data: T[],
    headers: { key: keyof T; label: string }[]
): string {
    if (!data || data.length === 0) {
        return headers.map((h) => `"${h.label}"`).join(',') + '\n'
    }

    // Header Row
    const headerRow = headers.map((h) => `"${h.label}"`).join(',')

    // Content Rows
    const bodyRows = data.map((row) =>
        headers
            .map((h) => {
                const val = row[h.key]
                if (val === null || val === undefined) return '""'
                // Escape quotes
                const strVal = String(val).replace(/"/g, '""')
                return `"${strVal}"`
            })
            .join(',')
    )

    return [headerRow, ...bodyRows].join('\n')
}