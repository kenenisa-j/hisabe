import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, AuthenticatedContext } from '@/lib/api-auth'
import { getCategories } from '@/services/category-service'

export const GET = withApiAuth(async (req: NextRequest, { userId }: AuthenticatedContext) => {
    try {
        const { searchParams } = new URL(req.url)
        const type = (searchParams.get('type') as 'income' | 'expense') || undefined

        const categories = await getCategories(userId, type)
        return NextResponse.json({
            success: true,
            data: categories,
        })
    } catch (error: unknown) {
        console.error('API GET /api/v1/categories error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch categories'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
})
