import { NextRequest, NextResponse } from 'next/server'
import { authenticateServerRequest } from '@/lib/firebase/server-auth'

export type AuthenticatedContext = {
    userId: string
    firebaseUid?: string
    isMapped?: boolean
    params?: Record<string, string | string[]>
}

export type AuthenticatedHandler = (
    req: NextRequest,
    context: AuthenticatedContext
) => Promise<NextResponse>

/**
 * Higher-Order Function / Middleware wrapper for REST API endpoints.
 * Authenticates requests using Firebase ID tokens (Authorization: Bearer <firebase_id_token>).
 */
export function withApiAuth(handler: AuthenticatedHandler) {
    return async (
        req: NextRequest,
        segmentData: { params: Promise<Record<string, string | string[]>> }
    ) => {
        try {
            const authHeader = req.headers.get('authorization')
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Unauthorized: Missing or malformed Authorization header (Expected: Bearer <token>)',
                    },
                    { status: 401 }
                )
            }

            const token = authHeader.substring(7).trim()
            if (!token) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized: Empty token provided' },
                    { status: 401 }
                )
            }

            let userId: string | null = null
            let firebaseUid: string | undefined = undefined
            let isMapped: boolean | undefined = undefined

            try {
                const authResult = await authenticateServerRequest(authHeader)
                userId = authResult.canonicalUserId
                firebaseUid = authResult.firebaseUid
                isMapped = authResult.isMapped
            } catch (firebaseErr: unknown) {
                const fErr = firebaseErr as { message?: string }
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Unauthorized: Invalid or expired Firebase token',
                        details: fErr?.message || 'Verification failed',
                    },
                    { status: 401 }
                )
            }

            if (!userId) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized: Token could not be resolved to a valid user' },
                    { status: 401 }
                )
            }

            const params = segmentData?.params ? await segmentData.params : {}
            return await handler(req, { userId, firebaseUid, isMapped, params })
        } catch (error: unknown) {
            console.error('Unhandled API auth error:', error)
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Token verification failed' },
                { status: 401 }
            )
        }
    }
}
