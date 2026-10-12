import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, AuthenticatedContext } from '@/lib/api-auth'
import { getDashboardOverview } from '@/services/dashboard-service'

export const GET = withApiAuth(async (req: NextRequest, { userId }: AuthenticatedContext) => {
    try {
        const overview = await getDashboardOverview(userId)
        return NextResponse.json({
            success: true,
            data: overview,
        })
    } catch (error: unknown) {
        console.error('API GET /api/v1/dashboard error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
})
