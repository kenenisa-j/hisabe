import { neon } from '@neondatabase/serverless'

const databaseUrl =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/postgres'

// Neon HTTP driver base instance
const rawSql = neon(databaseUrl)

/**
 * Executes a Neon SQL query with automatic retry backoff
 * to handle Neon database cold starts and transient network fetch timeouts.
 */
async function executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3
): Promise<T> {
    let attempts = 0
    while (attempts < maxAttempts) {
        try {
            attempts++
            return await fn()
        } catch (error: any) {
            const isFetchError =
                error?.name === 'NeonDbError' ||
                error?.message?.includes('fetch failed') ||
                error?.message?.includes('Connect Timeout') ||
                error?.code === 'UND_ERR_CONNECT_TIMEOUT'

            if (isFetchError && attempts < maxAttempts) {
                // Exponential backoff delay for Neon compute wake-up (500ms, 1000ms...)
                await new Promise((resolve) =>
                    setTimeout(resolve, attempts * 500)
                )
                continue
            }
            throw error
        }
    }
    return fn()
}

/**
 * Resilient Neon SQL instance with automatic retry mechanism for serverless cold starts.
 */
function wrappedSql(strings: TemplateStringsArray, ...values: any[]) {
    return executeWithRetry(() => rawSql(strings, ...values))
}

export const sql = new Proxy(wrappedSql, {
    get(target, prop, receiver) {
        const val = Reflect.get(rawSql, prop, receiver)
        if (typeof val === 'function') {
            return (...args: any[]) =>
                executeWithRetry(() => val.apply(rawSql, args))
        }
        return val
    },
}) as typeof rawSql