import { NextResponse, type NextRequest } from 'next/server'
import { apiRatelimit, strictRatelimit } from '@/lib/ratelimit'

// Public paths that do NOT require authentication
const PUBLIC_PATHS = [
    '/',
    '/sign-in',
    '/sign-up',
    '/api/auth/session',
    '/api/webhooks',
    '/api/v1',
]

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
    )
}

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const hasFirebaseSession = Boolean(req.cookies.get('__session')?.value)

    // Protect non-public routes — redirects to /sign-in for page requests
    if (!isPublicPath(pathname) && !hasFirebaseSession) {
        const signInUrl = new URL('/sign-in', req.url)
        return NextResponse.redirect(signInUrl)
    }

    // Rate-limit API routes
    if (pathname.startsWith('/api/') || pathname.startsWith('/trpc')) {
        const ip =
            req.headers.get('x-forwarded-for') ??
            req.headers.get('x-real-ip') ??
            '127.0.0.1'
        const identifier = ip

        const isStrictRoute =
            pathname.includes('/api/export') || pathname.includes('/api/import')
        const limiter = isStrictRoute ? strictRatelimit : apiRatelimit

        if (
            process.env.UPSTASH_REDIS_REST_URL &&
            process.env.UPSTASH_REDIS_REST_TOKEN
        ) {
            const { success, limit, reset, remaining } = await limiter.limit(identifier)

            if (!success) {
                return new NextResponse(
                    JSON.stringify({
                        error: 'Too Many Requests',
                        message: 'Rate limit exceeded. Please wait before retrying.',
                    }),
                    {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': remaining.toString(),
                            'X-RateLimit-Reset': reset.toString(),
                        },
                    }
                )
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
}
