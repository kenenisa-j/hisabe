import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'

/**
 * Asserts user authentication and returns valid userId or throws HTTP 401 equivalent.
 */
export async function enforceAuth(): Promise<string> {
    const userId = await getAuthenticatedUser()
    if (!userId) {
        throw new Error('UNAUTHORIZED: Authentication token missing or expired.')
    }
    return userId
}

/**
 * Security Guard: Verifies that an Account belongs strictly to the current authenticated user.
 */
export async function verifyAccountOwnership(accountId: string, userId: string): Promise<boolean> {
    if (!accountId) return false

    const [row] = await sql`
    SELECT id FROM accounts
    WHERE id = ${accountId} AND user_id = ${userId}
    LIMIT 1
  `
    return Boolean(row)
}

/**
 * Security Guard: Verifies that a Transaction belongs strictly to the current authenticated user.
 */
export async function verifyTransactionOwnership(
    transactionId: string,
    userId: string
): Promise<boolean> {
    if (!transactionId) return false

    const [row] = await sql`
    SELECT id FROM transactions
    WHERE id = ${transactionId} AND user_id = ${userId}
    LIMIT 1
  `
    return Boolean(row)
}

/**
 * Security Guard: Verifies that a Category belongs strictly to the current user or is a global default.
 */
export async function verifyCategoryAccess(categoryId: string, userId: string): Promise<boolean> {
    if (!categoryId) return true // Uncategorized is permissible

    const [row] = await sql`
    SELECT id FROM categories
    WHERE id = ${categoryId} AND (user_id = ${userId} OR user_id IS NULL)
    LIMIT 1
  `
    return Boolean(row)
}