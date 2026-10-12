import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth, AuthenticatedContext } from '@/lib/api-auth'
import { getTransactions, createTransaction } from '@/services/transaction-service'

export const GET = withApiAuth(async (req: NextRequest, { userId }: AuthenticatedContext) => {
    try {
        const { searchParams } = new URL(req.url)
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined
        const type = searchParams.get('type') || undefined
        const accountId = searchParams.get('accountId') || undefined
        const categoryId = searchParams.get('categoryId') || undefined
        const startDate = searchParams.get('startDate') || undefined
        const endDate = searchParams.get('endDate') || undefined

        const transactions = await getTransactions(userId, {
            limit,
            offset,
            type,
            accountId,
            categoryId,
            startDate,
            endDate,
        })

        return NextResponse.json({
            success: true,
            data: transactions,
        })
    } catch (error: unknown) {
        console.error('API GET /api/v1/transactions error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch transactions'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
})

export const POST = withApiAuth(async (req: NextRequest, { userId }: AuthenticatedContext) => {
    try {
        const body = await req.json()
        const result = await createTransaction(userId, {
            accountId: body.accountId,
            categoryId: body.categoryId,
            amount: parseFloat(body.amount),
            type: body.type,
            description: body.description,
            transactionDate: body.transactionDate || body.date,
        })

        return NextResponse.json(
            {
                success: true,
                message: 'Transaction created successfully',
                data: result,
            },
            { status: 201 }
        )
    } catch (error: unknown) {
        console.error('API POST /api/v1/transactions error:', error)
        const message = error instanceof Error ? error.message : 'Failed to create transaction'
        return NextResponse.json(
            { success: false, error: message },
            { status: 400 }
        )
    }
})
