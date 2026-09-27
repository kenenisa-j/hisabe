import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { calculateNextDueDate } from '@/lib/recurring-utils'

// Force dynamic execution (never cache cron API responses)
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    // 1. Verify Bearer Authorization Header
    const authHeader = req.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json(
            { error: 'Unauthorized: Invalid or missing CRON_SECRET token' },
            { status: 401 }
        )
    }

    const todayStr = new Date().toISOString().split('T')[0]
    let processedCount = 0
    let failedCount = 0
    const logs: Array<{ id: string; status: string; error?: string }> = []

    try {
        // 2. Query all active recurring rules where next_due_date <= TODAY and auto_record = true
        const dueItems = await sql`
      SELECT 
        id, user_id, account_id, category_id, type, amount, currency, description, frequency, next_due_date
      FROM recurring_transactions
      WHERE is_active = true 
        AND auto_record = true 
        AND next_due_date <= ${todayStr}::date
    `

        if (dueItems.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No recurring transactions due for processing today.',
                processed: 0,
            })
        }

        // 3. Process each due item safely using atomic database transactions
        for (const item of dueItems) {
            try {
                const amount = parseFloat(item.amount)
                const currentDate = new Date(item.next_due_date)
                const dueDateStr = item.next_due_date.toISOString
                    ? item.next_due_date.toISOString().split('T')[0]
                    : String(item.next_due_date).split('T')[0]

                const nextDueDateStr = calculateNextDueDate(currentDate, item.frequency)
                    .toISOString()
                    .split('T')[0]

                const balanceDelta = item.type === 'income' ? amount : -amount

                await sql.transaction([
                    sql`
                        INSERT INTO transactions (
                          user_id, account_id, category_id, type, amount, base_amount_etb, description, transaction_date
                        ) VALUES (
                          ${item.user_id}, ${item.account_id}, ${item.category_id}, ${item.type}, 
                          ${amount}, ${amount}, ${item.description || 'Auto Recurring Entry'}, ${dueDateStr}::date
                        )
                    `,
                    sql`
                        UPDATE accounts
                        SET balance = balance + ${balanceDelta}, updated_at = NOW()
                        WHERE id = ${item.account_id} AND user_id = ${item.user_id}
                    `,
                    sql`
                        UPDATE recurring_transactions
                        SET next_due_date = ${nextDueDateStr}::date, updated_at = NOW()
                        WHERE id = ${item.id} AND user_id = ${item.user_id} AND next_due_date = ${dueDateStr}::date
                    `,
                    sql`
                        INSERT INTO recurring_execution_logs (
                          recurring_id, user_id, status, amount
                        ) VALUES (
                          ${item.id}, ${item.user_id}, 'success', ${amount}
                        )
                    `
                ])

                processedCount++
                logs.push({ id: item.id, status: 'success' })
            } catch (err: unknown) {
                failedCount++
                const errorMsg = (err as Error)?.message || 'Transaction execution failed'

                await sql`
                  INSERT INTO recurring_execution_logs (
                    recurring_id, user_id, status, amount, error_message
                  ) VALUES (
                    ${item.id}, ${item.user_id}, 'failed', ${parseFloat(item.amount)}, ${errorMsg}
                  )
                `

                logs.push({ id: item.id, status: 'failed', error: errorMsg })
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalDue: dueItems.length,
                processed: processedCount,
                failed: failedCount,
            },
            details: logs,
        })
    } catch (globalError: unknown) {
        const errorMsg = (globalError as Error)?.message || 'Cron execution engine failed'
        return NextResponse.json(
            { error: errorMsg },
            { status: 500 }
        )
    }
}