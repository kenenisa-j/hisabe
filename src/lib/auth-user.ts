import { cookies } from 'next/headers'
import {
    verifyFirebaseSessionOrToken,
    resolveCanonicalIdentity,
    ensureProfileForIdentity,
} from '@/lib/firebase/server-auth'

/**
 * Validates the current authenticated user via Firebase
 * and guarantees canonical identity resolution and profile existence.
 *
 * Throws an error if the request is unauthenticated.
 */
export async function getAuthenticatedUser(): Promise<string> {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('__session')?.value

    if (sessionCookie && sessionCookie.trim().length > 0) {
        try {
            let firebaseUid: string | null = null
            let email = ''
            let fullName = 'User'

            const decoded = await verifyFirebaseSessionOrToken(sessionCookie)
            if (decoded?.uid) {
                firebaseUid = decoded.uid
                email = decoded.email || ''
                fullName = decoded.name || (email ? email.split('@')[0] : 'User')
            }

            if (firebaseUid) {
                // Resolve canonical user ID (via auth_identity_mappings)
                const { canonicalUserId } = await resolveCanonicalIdentity(firebaseUid)

                // Ensure profile row exists safely
                await ensureProfileForIdentity({
                    canonicalUserId,
                    email,
                    fullName,
                })

                return canonicalUserId
            }
        } catch (firebaseErr: unknown) {
            console.error('Firebase session verification failed:', firebaseErr)
        }
    }

    throw new Error('Unauthorized: You must be logged in to access this data.')
}