import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

/**
 * Check whether client environment variables are configured.
 */
export function isFirebaseClientConfigured(): boolean {
    return Boolean(
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey !== 'your_firebase_api_key_here' &&
        firebaseConfig.projectId &&
        firebaseConfig.projectId !== 'your_firebase_project_id_here'
    )
}

/**
 * Initialize Firebase Client SDK safely with HMR protection
 */
export function getFirebaseClientApp(): FirebaseApp {
    if (!isFirebaseClientConfigured()) {
        throw new Error(
            'Firebase Client SDK configuration missing or incomplete. Please set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and other Firebase web credentials in .env.local and restart your dev server.'
        )
    }
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig)
    }
    return getApp()
}

/**
 * Get Firebase Auth client instance safely
 */
export function getFirebaseAuth(): Auth {
    return getAuth(getFirebaseClientApp())
}

// Proxy exports for backward compatibility that lazily resolve the instance
export const firebaseApp = new Proxy({} as FirebaseApp, {
    get(_target, prop) {
        const app = getFirebaseClientApp()
        const value = Reflect.get(app, prop)
        return typeof value === 'function' ? value.bind(app) : value
    }
})

export const firebaseAuth = new Proxy({} as Auth, {
    get(_target, prop) {
        const auth = getFirebaseAuth()
        const value = Reflect.get(auth, prop)
        return typeof value === 'function' ? value.bind(auth) : value
    }
})
