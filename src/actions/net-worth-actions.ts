'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { ensureTablesExist } from '@/lib/db/init-db'
import { getAuthenticatedUser } from '@/lib/auth-user'

export interface AssetRecord {
    id: string
    name: string
    type: 'real_estate' | 'vehicle' | 'investment' | 'crypto' | 'savings' | 'other'
    value: number
    currency: string
    notes?: string
    createdAt: string
}

export interface NetWorthSummary {
    totalNetWorth: number
    totalAssets: number
    totalLiabilities: number
    liquidAssets: number
    manualAssets: number
    assetToDebtRatio: number
    assetsBreakdown: {
        liquidAccounts: number
        manualAssets: number
    }
    liabilitiesBreakdown: {
        owedByMeDebts: number
    }
}

export interface NetWorthSnapshotRecord {
    id: string
    totalNetWorth: number
    totalAssets: number
    liquidAssets: number
    manualAssets: number
    totalLiabilities: number
    snapshotDate: string
}

/**
 * Core Engine: Calculates total assets, total liabilities, and net worth
 */
export async function getNetWorthSummary(): Promise<NetWorthSummary> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await ensureTablesExist()

    // 1. Calculate Liquid Assets from Financial Accounts
    const [accountsRes] = await sql`
    SELECT COALESCE(SUM(balance), 0) AS total_liquid
    FROM accounts
    WHERE user_id = ${userId}
  `
    const liquidAssets = parseFloat(accountsRes.total_liquid)

    // 2. Calculate Manual/Illiquid Assets (Real Estate, Crypto, Investments, Vehicles)
    const [manualAssetsRes] = await sql`
    SELECT COALESCE(SUM(value), 0) AS total_manual
    FROM assets
    WHERE user_id = ${userId}
  `
    const manualAssets = parseFloat(manualAssetsRes.total_manual)

    // 3. Calculate Liabilities (Unsettled Debts Owed By Me)
    const [liabilitiesRes] = await sql`
    SELECT COALESCE(SUM(amount - paid_amount), 0) AS total_liabilities
    FROM debts
    WHERE user_id = ${userId}
      AND type = 'owed_by_me'
      AND status != 'settled'
  `
    const totalLiabilities = parseFloat(liabilitiesRes.total_liabilities)

    // 4. Compute Aggregate Metrics
    const totalAssets = liquidAssets + manualAssets
    const totalNetWorth = totalAssets - totalLiabilities
    const assetToDebtRatio =
        totalLiabilities > 0
            ? Math.round((totalAssets / totalLiabilities) * 10) / 10
            : totalAssets > 0
                ? 100
                : 0

    return {
        totalNetWorth,
        totalAssets,
        totalLiabilities,
        liquidAssets,
        manualAssets,
        assetToDebtRatio,
        assetsBreakdown: {
            liquidAccounts: liquidAssets,
            manualAssets,
        },
        liabilitiesBreakdown: {
            owedByMeDebts: totalLiabilities,
        },
    }
}

/**
 * Fetch all manual asset items for the user
 */
export async function getManualAssets(): Promise<AssetRecord[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await ensureTablesExist()

    const rows = await sql`
    SELECT id, name, type, value, currency, notes, created_at
    FROM assets
    WHERE user_id = ${userId}
    ORDER BY value DESC
  `

    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        value: parseFloat(r.value),
        currency: r.currency,
        notes: r.notes || undefined,
        createdAt: r.created_at,
    }))
}

/**
 * Add a new manual asset entry
 */
export async function createManualAsset(input: {
    name: string
    type: string
    value: number
    notes?: string
}) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await ensureTablesExist()

    if (input.value <= 0) throw new Error('Asset value must be greater than zero')

    await sql`
    INSERT INTO assets (
      user_id,
      name,
      type,
      value,
      notes,
      created_at,
      updated_at
    ) VALUES (
      ${userId},
      ${input.name},
      ${input.type},
      ${input.value},
      ${input.notes || null},
      NOW(),
      NOW()
    )
  `

    revalidatePath('/net-worth')
    revalidatePath('/')
    return { success: true }
}

/**
 * Delete a manual asset entry
 */
export async function deleteManualAsset(assetId: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await sql`
    DELETE FROM assets
    WHERE id = ${assetId} AND user_id = ${userId}
  `

    revalidatePath('/net-worth')
    revalidatePath('/')
    return { success: true }
}

/**
 * Creates or updates today's Net Worth snapshot for historical tracking
 */
export async function captureNetWorthSnapshot(): Promise<{ success: boolean }> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const summary = await getNetWorthSummary()
    const todayStr = new Date().toISOString().split('T')[0]

    // Upsert snapshot for current day
    await sql`
    INSERT INTO net_worth_snapshots (
      user_id,
      total_net_worth,
      total_assets,
      liquid_assets,
      manual_assets,
      total_liabilities,
      snapshot_date,
      created_at
    ) VALUES (
      ${userId},
      ${summary.totalNetWorth},
      ${summary.totalAssets},
      ${summary.liquidAssets},
      ${summary.manualAssets},
      ${summary.totalLiabilities},
      ${todayStr}::date,
      NOW()
    )
    ON CONFLICT (user_id, snapshot_date)
    DO UPDATE SET
      total_net_worth = EXCLUDED.total_net_worth,
      total_assets = EXCLUDED.total_assets,
      liquid_assets = EXCLUDED.liquid_assets,
      manual_assets = EXCLUDED.manual_assets,
      total_liabilities = EXCLUDED.total_liabilities
  `

    return { success: true }
}

/**
 * Retrieves historical snapshot records for chart visualizations
 */
export async function getNetWorthHistory(
    days: number = 180
): Promise<NetWorthSnapshotRecord[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const rows = await sql`
    SELECT
      id,
      total_net_worth,
      total_assets,
      liquid_assets,
      manual_assets,
      total_liabilities,
      snapshot_date
    FROM net_worth_snapshots
    WHERE user_id = ${userId}
      AND snapshot_date >= NOW() - (${days} || ' days')::interval
    ORDER BY snapshot_date ASC
  `

    return rows.map((r) => ({
        id: r.id,
        totalNetWorth: parseFloat(r.total_net_worth),
        totalAssets: parseFloat(r.total_assets),
        liquidAssets: parseFloat(r.liquid_assets),
        manualAssets: parseFloat(r.manual_assets),
        totalLiabilities: parseFloat(r.total_liabilities),
        snapshotDate: new Date(r.snapshot_date).toISOString().split('T')[0],
    }))
}