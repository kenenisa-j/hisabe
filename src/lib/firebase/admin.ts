import 'server-only'
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'

/**
 * Normalizes Firebase private key string safely.
 * Handles escaped newlines, Windows carriage returns, and enclosing quotes.
 */
function normalizePrivateKey(rawKey: string): string {
    let key = rawKey.trim()
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1)
    }
    return key.replace(/\\n/g, '\n').replace(/\r/g, '')
}

/**
 * Lazily initialize Firebase Admin SDK safely on the server only.
 * Guards against duplicate initialization in Next.js dev mode (HMR)
 * and prevents server credential leaks in browser environments.
 */
export function getFirebaseAdminApp(): App {
    if (typeof window !== 'undefined') {
        throw new Error('Security Violation: Firebase Admin SDK must never be initialized or imported in client browser environments.')
    }

    if (getApps().length > 0) {
        return getApp()
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    // Option A: Service account JSON string
    if (serviceAccountJson && serviceAccountJson.trim().length > 0) {
        try {
            const parsedServiceAccount = JSON.parse(serviceAccountJson)
            if (parsedServiceAccount.private_key) {
                parsedServiceAccount.private_key = normalizePrivateKey(parsedServiceAccount.private_key)
            }
            return initializeApp({
                credential: cert(parsedServiceAccount),
                projectId: projectId || parsedServiceAccount.project_id,
            })
        } catch (err: unknown) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', err)
        }
    }

    // Option B: Individual environment variables
    if (clientEmail && privateKeyRaw && privateKeyRaw.trim().length > 0) {
        const privateKey = normalizePrivateKey(privateKeyRaw)
        return initializeApp({
            credential: cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey,
            }),
            projectId: projectId,
        })
    }

    // Option C: Application Default Credentials (GCP environment fallback)
    if (projectId) {
        return initializeApp({
            projectId: projectId,
        })
    }

    throw new Error('Firebase Admin initialization failed: No valid credentials or project ID configured.')
}

/**
 * Lazily retrieves the Firebase Admin Auth service instance.
 */
export function getFirebaseAuth(): Auth {
    return getAuth(getFirebaseAdminApp())
}

/**
 * Exported Auth proxy for backward compatibility and lazy evaluation.
 * Does not initialize or decode credentials until an auth method is invoked at request time.
 */
export const adminAuth: Auth = new Proxy({} as Auth, {
    get(_target, prop: keyof Auth) {
        const auth = getFirebaseAuth()
        const value = auth[prop]
        if (typeof value === 'function') {
            return value.bind(auth)
        }
        return value
    },
})
