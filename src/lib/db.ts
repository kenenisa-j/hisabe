import dns from 'node:dns'

// Set DNS lookup order to IPv4 first to avoid IPv6/search-domain DNS timeouts on local networks
try {
    dns.setDefaultResultOrder('ipv4first')
} catch {
    // Ignore if not supported in runtime
}

import { neon } from '@neondatabase/serverless'

const databaseUrl =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/postgres'

const cleanedDbUrl = databaseUrl.replace(/\.neon\.tech\./, '.neon.tech')

// Neon HTTP driver base instance
const rawSql = neon(cleanedDbUrl)

/**
 * Raw Neon SQL instance — use this ONLY inside sql.transaction([...]) arrays.
 * Neon's transaction() requires raw query objects, not the wrapped proxy Promises.
 */
export const sqlRaw = rawSql

/**
 * Executes a Neon SQL query with automatic retry backoff
 * to handle Neon database cold starts and transient network fetch timeouts.
 */
async function executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 5
): Promise<T> {
    let attempts = 0
    let lastError: any = null
    while (attempts < maxAttempts) {
        try {
            attempts++
            return await fn()
        } catch (error: any) {
            lastError = error
            const isFetchError =
                error?.name === 'NeonDbError' ||
                error?.message?.includes('fetch failed') ||
                error?.message?.includes('Connect Timeout') ||
                error?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                error?.cause?.name === 'ConnectTimeoutError' ||
                error?.cause?.message?.includes('fetch failed') ||
                error?.cause?.code === 'ECONNREFUSED'

            if (isFetchError && attempts < maxAttempts) {
                // Exponential backoff delay for Neon compute wake-up / network reconnect (500ms, 1000ms, 1500ms...)
                await new Promise((resolve) =>
                    setTimeout(resolve, attempts * 500)
                )
                continue
            }
            throw error
        }
    }
    throw lastError
}

/**
 * Resilient Neon SQL instance with automatic retry mechanism for serverless cold starts.
 */
function wrappedSql(strings: TemplateStringsArray, ...values: any[]) {
    return executeWithRetry(() => rawSql(strings, ...values))
}

export const sql = new Proxy(wrappedSql, {
    get(target, prop, receiver) {
        if (prop === 'transaction') {
            return (arg: any, opts?: any) => {
                // Do NOT wrap in executeWithRetry: the SQL query array is eagerly
                // evaluated before being passed in, so retrying would re-pass an
                // already-consumed array and throw "expects an array of queries".
                return rawSql.transaction(arg, opts)
            }
        }
        const val = Reflect.get(rawSql, prop, receiver)
        if (typeof val === 'function') {
            return (...args: any[]) =>
                executeWithRetry(() => val.apply(rawSql, args))
        }
        return val
    },
}) as typeof rawSql