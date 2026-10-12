import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, AuthenticatedContext } from '@/lib/api-auth'
import { getAccounts, createAccount } from '@/services/account-service'

export const GET = withApiAuth(async (req: NextRequest, { userId }: AuthenticatedContext) => {
    try {
        const { searchParams } = new URL(req.url)
        const includeArchived = searchParams.get('includeArchived') === 'true'

        const accounts = await getAccounts(userId, includeArchived)
        return NextResponse.json({
            success: true,
            data: accounts,
        })
    } catch (error: unknown) {
        console.error('API GET /api/v1/accounts error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch accounts'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
})

export const POST = withApiAuth(async (req: NextRequest, { userId }: AuthenticatedContext) => {
    try {
        const body = await req.json()
        const newAccount = await createAccount(userId, body)
        return NextResponse.json(
            {
                success: true,
                data: newAccount,
            },
            { status: 201 }
        )
    } catch (error: unknown) {
        console.error('API POST /api/v1/accounts error:', error)
        const message = error instanceof Error ? error.message : 'Failed to create account'
        return NextResponse.json(
            { success: false, error: message },
            { status: 400 }
        )
    }
})
