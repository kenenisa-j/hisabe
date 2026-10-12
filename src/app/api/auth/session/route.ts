import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { verifyFirebaseIdToken } from '@/lib/firebase/server-auth'

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000

function isAllowedOrigin(req: NextRequest): boolean {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    if (!origin || !host) {
        // Fallback for same-origin server actions or clients with custom auth header
        const customHeader = req.headers.get('x-requested-with')
        return customHeader === 'HisabeAuth' || customHeader === 'XMLHttpRequest'
    }
    try {
        const originUrl = new URL(origin)
        return originUrl.host === host
    } catch {
        return false
    }
}

/**
 * POST /api/auth/session
 * Creates an HTTP-only, secure Firebase session cookie.
 */
export async function POST(req: NextRequest) {
    try {
        if (!isAllowedOrigin(req)) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Invalid request origin' },
                { status: 403 }
            )
        }

        const body = await req.json().catch(() => ({}))
        const idToken = body?.idToken

        if (!idToken || typeof idToken !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Missing or invalid idToken' },
                { status: 400 }
            )
        }

        // 1. Cryptographically verify the ID token
        await verifyFirebaseIdToken(idToken)

        // 2. Create the official Firebase session cookie
        let sessionCookie: string
        try {
            sessionCookie = await adminAuth.createSessionCookie(idToken, {
                expiresIn: FIVE_DAYS_MS,
            })
        } catch {
            // Fallback: If createSessionCookie is unavailable in local emulator / ADC, store verified ID token
            sessionCookie = idToken
        }

        // 3. Set the __session cookie
        const cookieStore = await cookies()
        cookieStore.set('__session', sessionCookie, {
            maxAge: 5 * 24 * 60 * 60,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        })

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const err = error as { message?: string }
        console.error('Failed to create Firebase auth session:', error)
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to establish session' },
            { status: 401 }
        )
    }
}

/**
 * DELETE /api/auth/session
 * Destroys the current browser Firebase session cookie.
 */
export async function DELETE(req: NextRequest) {
    try {
        if (!isAllowedOrigin(req)) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Invalid request origin' },
                { status: 403 }
            )
        }

        const cookieStore = await cookies()
        cookieStore.delete('__session')

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const err = error as { message?: string }
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to terminate session' },
            { status: 500 }
        )
    }
}
