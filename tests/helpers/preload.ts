import Module from 'node:module'
import path from 'node:path'

// 1. In-process resolver hook for 'server-only' (operates ONLY within test runner)
const stubPath = path.resolve(__dirname, 'server-only-stub.js')
const origResolve = (Module as unknown as { _resolveFilename: (request: unknown, ...args: unknown[]) => string })._resolveFilename
;(Module as unknown as { _resolveFilename: (request: unknown, ...args: unknown[]) => string })._resolveFilename = function (
    request: unknown,
    ...args: unknown[]
) {
    if (typeof request === 'string' && request === 'server-only') {
        return stubPath
    }
    return origResolve.call(this, request, ...args)
}

import fs from 'node:fs'

// Load .env.test if present and TEST_DATABASE_URL is not already set in process.env
if (!process.env.TEST_DATABASE_URL) {
    const envTestPath = path.resolve(process.cwd(), '.env.test')
    if (fs.existsSync(envTestPath) && typeof process.loadEnvFile === 'function') {
        try {
            process.loadEnvFile(envTestPath)
        } catch {
            // Ignored
        }
    }
}

// 2. Preserve original production DATABASE_URL before redirecting
if (process.env.DATABASE_URL !== undefined && process.env.ORIGINAL_DATABASE_URL === undefined) {
    process.env.ORIGINAL_DATABASE_URL = process.env.DATABASE_URL
}

// Redirect DATABASE_URL to TEST_DATABASE_URL BEFORE any production module evaluates
if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
} else {
    // If TEST_DATABASE_URL is absent, unset DATABASE_URL to prevent accidental production connection
    delete process.env.DATABASE_URL
}

// 3. Test Authentication Context
interface ActiveAuthContext {
    userId: string
    email: string
    name: string
}

let activeAuth: ActiveAuthContext | null = null

export function setTestActiveUser(user: { userId: string; email?: string; name?: string } | null) {
    if (!user) {
        activeAuth = null
        return
    }
    activeAuth = {
        userId: user.userId,
        email: user.email || `${user.userId}@test.local`,
        name: user.name || 'Test User',
    }
}

export function getTestActiveUser(): ActiveAuthContext | null {
    return activeAuth
}

// 4. In-process Module._load interception for Next.js headers/cache and Firebase server auth
const origLoad = (Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown })._load
;(Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown })._load = function (
    request: string,
    parent: unknown,
    isMain: boolean
) {
    if (request === 'next/headers') {
        return {
            cookies: async () => ({
                get: (name: string) => {
                    if (activeAuth && name === '__session') {
                        return { value: `test-session-${activeAuth.userId}` }
                    }
                    return undefined
                },
            }),
        }
    }

    if (request === 'next/cache') {
        return {
            revalidatePath: () => {},
            revalidateTag: () => {},
        }
    }

    if (request === '@/lib/firebase/server-auth' || request.endsWith('server-auth')) {
        return {
            verifyFirebaseSessionOrToken: async (token: string) => {
                const match = token.match(/^test-session-(.+)$/)
                if (!match) throw new Error('Unauthorized: Invalid token')
                const uid = match[1]
                return {
                    uid,
                    email: `${uid}@test.local`,
                    name: `Test User ${uid}`,
                }
            },
            resolveCanonicalIdentity: async (firebaseUid: string) => {
                return {
                    canonicalUserId: firebaseUid,
                    isMapped: false,
                }
            },
            ensureProfileForIdentity: async () => {},
        }
    }

    return origLoad.call(this, request, parent, isMain)
}
