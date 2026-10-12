import { neon } from '@neondatabase/serverless'

export interface DatabaseIsolationStatus {
    isIsolated: boolean
    databaseName: string
    canaryVerified: boolean
    error?: string
}

/**
 * Checks whether two connection URLs target the exact same database server and database name.
 */
export function isSameDatabaseTarget(urlA: string, urlB: string): boolean {
    if (urlA.trim() === urlB.trim()) {
        return true
    }

    try {
        const parsedA = new URL(urlA)
        const parsedB = new URL(urlB)

        const sameProtocol = parsedA.protocol === parsedB.protocol
        const hostA = parsedA.hostname.toLowerCase()
        const hostB = parsedB.hostname.toLowerCase()
        const portA = parsedA.port || '5432'
        const portB = parsedB.port || '5432'
        const sameHostAndPort = hostA === hostB && portA === portB
        const samePath =
            parsedA.pathname.replace(/\/+$/, '') === parsedB.pathname.replace(/\/+$/, '')

        return sameProtocol && sameHostAndPort && samePath
    } catch {
        return false
    }
}

/**
 * Enforces strict isolation checks before any test writes, migrations, or fixture setup.
 * Aborts immediately if the database is unverified, missing canary markers, or points to production.
 */
export async function assertDatabaseIsolation(): Promise<void> {
    const testUrl = process.env.TEST_DATABASE_URL
    const expectedDbName = process.env.EXPECTED_TEST_DB_NAME
    const originalProdUrl = process.env.ORIGINAL_DATABASE_URL

    if (!testUrl || testUrl.trim().length === 0) {
        throw new Error(
            'FATAL ISOLATION GUARD: TEST_DATABASE_URL is not set. ' +
            'Refusing to run integration tests to protect production data.'
        )
    }

    if (!expectedDbName || expectedDbName.trim().length === 0) {
        throw new Error(
            'FATAL ISOLATION GUARD: EXPECTED_TEST_DB_NAME is not configured. ' +
            'Specify the expected test database name (e.g. hisabe_test) to prevent accidental execution on another database.'
        )
    }

    // Guard against identical or same-target production and test URLs
    const prodUrlToCheck =
        originalProdUrl ||
        (process.env.DATABASE_URL && process.env.DATABASE_URL !== testUrl
            ? process.env.DATABASE_URL
            : undefined)

    if (prodUrlToCheck && isSameDatabaseTarget(testUrl, prodUrlToCheck)) {
        throw new Error(
            'FATAL ISOLATION GUARD: TEST_DATABASE_URL matches production DATABASE_URL! ' +
            'Aborting to prevent test writes on production database.'
        )
    }

    // Connect directly to TEST_DATABASE_URL to verify identity
    const sql = neon(testUrl)

    let actualDbName = ''
    try {
        const dbResult = (await sql`SELECT current_database() as name`) as { name: string }[]
        actualDbName = dbResult[0]?.name || ''
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(
            `FATAL ISOLATION GUARD: Failed to connect to TEST_DATABASE_URL: ${message}`
        )
    }

    if (actualDbName !== expectedDbName) {
        throw new Error(
            `FATAL ISOLATION GUARD: Database name mismatch! ` +
            `Expected '${expectedDbName}', but connected to '${actualDbName}'. Aborting test execution.`
        )
    }

    // Verify the test-only canary marker table
    try {
        const markerResult = (await sql`
            SELECT is_test_isolated
            FROM hisabe_test_canary_marker
            WHERE is_test_isolated = TRUE
            LIMIT 1
        `) as { is_test_isolated: boolean }[]

        if (!markerResult || markerResult.length === 0 || !markerResult[0].is_test_isolated) {
            throw new Error(
                'FATAL ISOLATION GUARD: Canary marker "hisabe_test_canary_marker" is missing or invalid. ' +
                'The database is not confirmed to be an isolated test database.'
            )
        }
    } catch (markerErr: unknown) {
        const message = markerErr instanceof Error ? markerErr.message : String(markerErr)
        throw new Error(
            `FATAL ISOLATION GUARD: Canary marker verification failed: ${message}. ` +
            `Ensure 'hisabe_test_canary_marker' exists with 'is_test_isolated = TRUE' in the test database.`
        )
    }
}
