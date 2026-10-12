import 'server-only'
import { adminAuth } from './admin'
import { sql } from '@/lib/db'
import type { DecodedIdToken } from 'firebase-admin/auth'

export interface ResolvedUserIdentity {
    firebaseUid: string
    canonicalUserId: string
    isMapped: boolean
    email?: string
    name?: string
    picture?: string
}

/**
 * Cryptographically verifies a Firebase ID Token using the Firebase Admin SDK.
 * Never trusts any UID or claims passed from client requests unverified.
 *
 * @param idToken Raw JWT token string from Authorization header or session cookie
 * @param checkRevoked Whether to check if the token has been revoked
 * @returns DecodedIdToken from Firebase Admin SDK
 */
export async function verifyFirebaseIdToken(
    idToken: string,
    checkRevoked = false
): Promise<DecodedIdToken> {
    if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
        throw new Error('Authentication failed: Missing or empty Firebase ID token')
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken.trim(), checkRevoked)
        if (!decodedToken || !decodedToken.uid) {
            throw new Error('Authentication failed: Invalid token payload (missing uid)')
        }
        return decodedToken
    } catch (error: unknown) {
        // Distinguish specific auth failure modes for diagnostics without leaking credentials
        const err = error as { code?: string; message?: string }
        const errorCode = err?.code || 'auth/unknown-error'
        const errorMessage = err?.message || 'Token verification failed'
        throw new Error(`Authentication verification failed [${errorCode}]: ${errorMessage}`)
    }
}

/**
 * Verifies either a Firebase Session Cookie or a Firebase ID Token.
 */
export async function verifyFirebaseSessionOrToken(
    cookieOrToken: string
): Promise<DecodedIdToken> {
    if (!cookieOrToken || typeof cookieOrToken !== 'string' || cookieOrToken.trim().length === 0) {
        throw new Error('Authentication failed: Missing session token')
    }

    const trimmed = cookieOrToken.trim()
    try {
        return await adminAuth.verifySessionCookie(trimmed, false)
    } catch {
        // Fallback to verifying as ID token
        return await adminAuth.verifyIdToken(trimmed, false)
    }
}

/**
 * Resolves an authenticated Firebase UID to its canonical user_id in Hisabe.
 *
 * Identity Rules:
 * 1. If an explicit mapping exists in auth_identity_mappings (e.g. existing Clerk-origin accounts),
 *    returns the canonical user_id (e.g. user_2xxx).
 * 2. If no mapping exists, the user is a direct Firebase user; canonical user_id is the firebaseUid.
 * 3. Any database or connection error FAILS CLOSED immediately (throws, does not fallback to empty/guest).
 *
 * @param firebaseUid Cryptographically verified Firebase UID
 */
export async function resolveCanonicalIdentity(
    firebaseUid: string
): Promise<{ canonicalUserId: string; isMapped: boolean }> {
    if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.trim().length === 0) {
        throw new Error('Identity resolution failed: Invalid Firebase UID')
    }

    try {
        const rows = (await sql`
            SELECT canonical_user_id
            FROM auth_identity_mappings
            WHERE firebase_uid = ${firebaseUid}
            LIMIT 1
        `) as { canonical_user_id: string }[]

        if (rows && rows.length > 0 && rows[0].canonical_user_id) {
            return {
                canonicalUserId: rows[0].canonical_user_id,
                isMapped: true,
            }
        }

        // Unmapped identity: Standard Firebase-native user
        return {
            canonicalUserId: firebaseUid,
            isMapped: false,
        }
    } catch (dbError: unknown) {
        // Fail closed on database errors to prevent authorization bypass
        const err = dbError as { message?: string }
        console.error('Fatal: Database error during canonical identity resolution:', dbError)
        throw new Error(`Identity resolution failed due to database error: ${err?.message || 'Query failed'}`)
    }
}

/**
 * Safely creates or ensures a profile row exists in Neon for foreign key constraints.
 *
 * Rules:
 * 1. Checks if a profile row already exists with id = canonicalUserId.
 * 2. If it already exists (e.g. existing Clerk users or returning Firebase users), DO NOT overwrite or modify existing records.
 * 3. If it does not exist (brand new Firebase user), safely inserts a initial profile row.
 * 4. Never links or re-assigns accounts based on email alone.
 * 5. Fails closed on database errors.
 */
export async function ensureProfileForIdentity(identity: {
    canonicalUserId: string
    email?: string
    fullName?: string
}): Promise<void> {
    const { canonicalUserId, email = '', fullName = 'User' } = identity

    if (!canonicalUserId) {
        throw new Error('Profile synchronization failed: Missing canonicalUserId')
    }

    try {
        const existing = (await sql`
            SELECT id FROM profiles WHERE id = ${canonicalUserId} LIMIT 1
        `) as { id: string }[]

        if (existing.length === 0) {
            await sql`
                INSERT INTO profiles (id, email, full_name, default_currency)
                VALUES (${canonicalUserId}, ${email}, ${fullName}, 'ETB')
                ON CONFLICT (id) DO NOTHING
            `
        }
    } catch (dbError: unknown) {
        const err = dbError as { message?: string }
        console.error('Profile synchronization error:', dbError)
        throw new Error(`Failed to ensure user profile: ${err?.message || 'Database error'}`)
    }
}

/**
 * Full authentication and identity resolution pipeline for server requests.
 * Extracts Bearer token, verifies signature, resolves canonical identity,
 * and ensures profile existence.
 */
export async function authenticateServerRequest(
    authHeaderOrToken: string | null
): Promise<ResolvedUserIdentity> {
    if (!authHeaderOrToken) {
        throw new Error('UNAUTHORIZED: Missing authorization credentials')
    }

    const token = authHeaderOrToken.startsWith('Bearer ')
        ? authHeaderOrToken.substring(7).trim()
        : authHeaderOrToken.trim()

    if (!token) {
        throw new Error('UNAUTHORIZED: Empty authorization token')
    }

    // 1. Cryptographic token verification
    const decodedToken = await verifyFirebaseIdToken(token)
    const firebaseUid = decodedToken.uid

    // 2. Identity resolution (fail-closed)
    const { canonicalUserId, isMapped } = await resolveCanonicalIdentity(firebaseUid)

    // 3. Ensure profile exists for the canonical user ID
    const email = decodedToken.email || ''
    const name = decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User')
    const picture = decodedToken.picture

    await ensureProfileForIdentity({
        canonicalUserId,
        email,
        fullName: name,
    })

    return {
        firebaseUid,
        canonicalUserId,
        isMapped,
        email,
        name,
        picture,
    }
}
