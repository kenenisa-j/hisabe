/**
 * Firebase Authentication custom claims structure for Hisabe
 */
export interface FirebaseCustomClaims {
    /**
     * Legacy Clerk User ID (e.g., 'user_2N...') mapped to the Firebase account.
     * When present, Hisabe server uses this ID as the database user_id in Neon PostgreSQL.
     */
    legacyUserId?: string
    [key: string]: unknown
}

/**
 * Decoded token payload enriched with resolved Hisabe identity
 */
export interface HisabeAuthUser {
    /**
     * Firebase UID (assigned by Firebase Auth)
     */
    uid: string

    /**
     * User email address
     */
    email: string | null

    /**
     * Email verification status
     */
    emailVerified: boolean

    /**
     * Legacy user ID mapped from Clerk (if existing account)
     */
    legacyUserId?: string

    /**
     * The effective user ID for all Neon DB queries (`legacyUserId || uid`).
     * Guaranteed to match historical `profiles.id` and `user_id` records in Neon PostgreSQL.
     */
    resolvedUserId: string
}

/**
 * Client-side user state object
 */
export interface FirebaseClientUser {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    emailVerified: boolean
    legacyUserId?: string
}
