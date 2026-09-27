import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client using environment variables
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

/**
 * Standard API Rate Limiter: 60 requests per 1 minute
 */
export const apiRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
})

/**
 * Sensitive Actions Rate Limiter (Imports, Auth, Bulk Operations): 10 requests per 1 minute
 */
export const strictRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:strict',
})

/**
 * Server Action Rate Limiter Guard
 * Checks rate limits for a given identifier (e.g., userId or IP)
 */
export async function enforceRateLimit(
    identifier: string,
    type: 'standard' | 'strict' = 'standard'
) {
    // Graceful fallback in development or if Redis credentials are missing
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return { success: true, limit: 0, remaining: 0, reset: 0 }
    }

    const limiter = type === 'strict' ? strictRatelimit : apiRatelimit
    const result = await limiter.limit(identifier)

    if (!result.success) {
        throw new Error('TOO_MANY_REQUESTS: Rate limit exceeded. Please try again later.')
    }

    return result
}