import { auth, currentUser } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'

/**
 * Validates the current authenticated Clerk user and guarantees
 * an existing profile row in Neon for foreign key constraints.
 * Throws an error if the request is unauthenticated.
 */
export async function getAuthenticatedUser() {
    const { userId } = await auth()

    if (!userId) {
        throw new Error('Unauthorized: You must be logged in to access this data.')
    }

    // Ensure user profile exists in Neon database
    const existingUser = await sql`
    SELECT id FROM profiles WHERE id = ${userId}
  `

    if (existingUser.length === 0) {
        const user = await currentUser()
        const email = user?.emailAddresses[0]?.emailAddress || ''
        const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()

        await sql`
      INSERT INTO profiles (id, email, full_name, default_currency)
      VALUES (${userId}, ${email}, ${fullName}, 'ETB')
      ON CONFLICT (id) DO NOTHING
    `
    }

    return userId
}