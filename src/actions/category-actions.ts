'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth-user'

export interface CategoryItem {
    id: string
    name: string
    type: 'income' | 'expense'
    icon?: string | null
    color?: string | null
    is_system?: boolean
}

export interface CategoryBreakdownPoint {
    categoryName: string
    amountEtb: number
    percentage: number
    color: string
}

const DEFAULT_EXPENSE_CATEGORIES = [
    'Food & Dining',
    'Groceries',
    'Shopping & Personal',
    'Housing & Rent',
    'Transport & Fuel',
    'Utilities & Bills',
    'Healthcare & Medical',
    'Entertainment & Leisure',
    'Education & Learning',
    'Subscriptions & Services',
    'Travel & Vacation',
    'Electronics & Tech',
    'Business & Work',
    'Gifts & Donations',
    'Other Expense',
]

const DEFAULT_INCOME_CATEGORIES = [
    'Salary & Wages',
    'Business & Freelance',
    'Investments & Dividends',
    'Gifts & Allowances',
    'Refunds & Cashbacks',
    'Other Income',
]

const CATEGORY_COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // purple-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#64748b', // slate-500
]

/**
 * Pick a smart icon for a category based on its name
 */
function pickCategoryIcon(name: string): string {
    const n = name.toLowerCase()
    if (n.includes('food') || n.includes('dining') || n.includes('restaurant') || n.includes('meal') || n.includes('lunch') || n.includes('dinner') || n.includes('breakfast')) return 'utensils'
    if (n.includes('grocery') || n.includes('groceries') || n.includes('supermarket') || n.includes('market')) return 'shopping-bag'
    if (n.includes('transport') || n.includes('fuel') || n.includes('car') || n.includes('taxi') || n.includes('ride') || n.includes('vehicle')) return 'car'
    if (n.includes('house') || n.includes('rent') || n.includes('home') || n.includes('housing') || n.includes('apartment')) return 'home'
    if (n.includes('util') || n.includes('bill') || n.includes('electric') || n.includes('water') || n.includes('internet') || n.includes('phone')) return 'zap'
    if (n.includes('health') || n.includes('medical') || n.includes('doctor') || n.includes('hospital') || n.includes('pharmacy') || n.includes('medicine')) return 'activity'
    if (n.includes('entertainment') || n.includes('leisure') || n.includes('cinema') || n.includes('movie') || n.includes('film') || n.includes('game')) return 'film'
    if (n.includes('shopping') || n.includes('personal') || n.includes('clothing') || n.includes('fashion') || n.includes('beauty')) return 'shopping-bag'
    if (n.includes('education') || n.includes('learning') || n.includes('school') || n.includes('tuition') || n.includes('book') || n.includes('course')) return 'briefcase'
    if (n.includes('travel') || n.includes('vacation') || n.includes('trip') || n.includes('hotel') || n.includes('flight')) return 'briefcase'
    if (n.includes('subscription') || n.includes('service') || n.includes('streaming') || n.includes('software')) return 'zap'
    if (n.includes('salary') || n.includes('wage') || n.includes('income') || n.includes('payroll')) return 'briefcase'
    if (n.includes('business') || n.includes('work') || n.includes('freelance') || n.includes('client')) return 'briefcase'
    if (n.includes('invest') || n.includes('dividend') || n.includes('stock') || n.includes('crypto')) return 'trending-up'
    if (n.includes('gift') || n.includes('donation') || n.includes('allowance') || n.includes('charity')) return 'wallet'
    if (n.includes('refund') || n.includes('cashback') || n.includes('rebate')) return 'wallet'
    if (n.includes('transfer')) return 'arrow-right-left'
    // Default fallback based on type
    return 'wallet'
}

/**
 * Seed missing default categories for user
 */
async function ensureDefaultCategoriesExist(userId: string) {
    try {
        const existing = await sql`
            SELECT name, type FROM categories
            WHERE user_id = ${userId} OR user_id IS NULL
        `
        const existingSet = new Set(existing.map((r) => `${r.type}:${r.name.trim().toLowerCase()}`))

        for (const name of DEFAULT_EXPENSE_CATEGORIES) {
            const key = `expense:${name.toLowerCase()}`
            if (!existingSet.has(key)) {
                const icon = pickCategoryIcon(name)
                await sql`
                    INSERT INTO categories (user_id, name, type, icon, is_system)
                    VALUES (${userId}, ${name}, 'expense', ${icon}, TRUE)
                    ON CONFLICT DO NOTHING
                `
            }
        }

        for (const name of DEFAULT_INCOME_CATEGORIES) {
            const key = `income:${name.toLowerCase()}`
            if (!existingSet.has(key)) {
                const icon = pickCategoryIcon(name)
                await sql`
                    INSERT INTO categories (user_id, name, type, icon, is_system)
                    VALUES (${userId}, ${name}, 'income', ${icon}, TRUE)
                    ON CONFLICT DO NOTHING
                `
            }
        }
    } catch (e) {
        console.error('Failed to seed default categories:', e)
    }
}

/**
 * Fetch all categories for user + system, deduplicated by name, excluding 'Transfer'
 */
export async function getCategories(type?: 'income' | 'expense'): Promise<CategoryItem[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    // Ensure standard default categories exist
    await ensureDefaultCategoriesExist(userId)

    let rows: Record<string, unknown>[]

    if (type) {
        rows = await sql`
            SELECT id, name, type, icon, color, is_system
            FROM categories
            WHERE (user_id = ${userId} OR user_id IS NULL)
              AND type = ${type}
              AND LOWER(name) <> 'transfer'
            ORDER BY name ASC, created_at DESC
        `
    } else {
        rows = await sql`
            SELECT id, name, type, icon, color, is_system
            FROM categories
            WHERE (user_id = ${userId} OR user_id IS NULL)
              AND LOWER(name) <> 'transfer'
            ORDER BY name ASC, created_at DESC
        `
    }

    // Deduplicate by name (case-insensitive)
    const seenNames = new Set<string>()
    const uniqueCategories: CategoryItem[] = []

    for (const r of rows) {
        const item = r as { id: string; name: string; type: string; icon: string | null; color?: string | null; is_system?: boolean }
        const normalized = item.name.trim().toLowerCase()
        if (!seenNames.has(normalized)) {
            seenNames.add(normalized)
            uniqueCategories.push({
                id: item.id,
                name: item.name,
                type: item.type as 'income' | 'expense',
                icon: item.icon,
                color: item.color || '#3b82f6',
                is_system: item.is_system ?? false,
            })
        }
    }

    return uniqueCategories
}

/**
 * Create a new custom expense or income category
 */
export async function createCategory(name: string, type: 'income' | 'expense' = 'expense', icon?: string, color?: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    const trimmed = name.trim()
    if (!trimmed) throw new Error('Category name cannot be empty')
    if (trimmed.toLowerCase() === 'transfer') throw new Error('Transfer cannot be added as a category')

    // Check if category already exists for user or system
    const existing = await sql`
        SELECT id, name FROM categories
        WHERE (user_id = ${userId} OR user_id IS NULL)
          AND LOWER(name) = ${trimmed.toLowerCase()}
          AND type = ${type}
        LIMIT 1
    `

    if (existing.length > 0) {
        return { success: true, id: existing[0].id, name: existing[0].name }
    }

    const categoryIcon = icon || pickCategoryIcon(trimmed)
    const categoryColor = color || '#3b82f6'

    const [inserted] = await sql`
        INSERT INTO categories (user_id, name, type, icon, color, is_system)
        VALUES (${userId}, ${trimmed}, ${type}, ${categoryIcon}, ${categoryColor}, FALSE)
        RETURNING id, name, icon, color
    `

    revalidatePath('/budgets')
    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true, id: inserted.id, name: inserted.name, icon: inserted.icon, color: inserted.color }
}

/**
 * Update an existing category
 */
export async function updateCategory(
    id: string,
    data: { name?: string; type?: 'income' | 'expense'; icon?: string; color?: string }
) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await sql`
        UPDATE categories
        SET 
            name = COALESCE(${data.name ?? null}, name),
            type = COALESCE(${data.type ?? null}, type),
            icon = COALESCE(${data.icon ?? null}, icon),
            color = COALESCE(${data.color ?? null}, color)
        WHERE id = ${id} AND (user_id = ${userId} OR user_id IS NULL)
    `

    revalidatePath('/budgets')
    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string) {
    const userId = await getAuthenticatedUser()
    if (!userId) throw new Error('Unauthorized')

    await sql`
        DELETE FROM categories
        WHERE id = ${id} AND user_id = ${userId} AND is_system = FALSE
    `

    revalidatePath('/budgets')
    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true }
}

export async function getCategoryExpenseBreakdown(): Promise<CategoryBreakdownPoint[]> {
    const userId = await getAuthenticatedUser()
    if (!userId) {
        throw new Error('Unauthorized')
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentMonthStartStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

    const rows = await sql`
    SELECT
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(t.base_amount_etb) AS total_amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${userId}
      AND t.type = 'expense'
      AND t.transaction_date >= ${currentMonthStartStr}::date
    GROUP BY c.name
    ORDER BY total_amount DESC
  `

    const grandTotal = rows.reduce((acc, r) => acc + parseFloat(r.total_amount), 0)
    if (grandTotal === 0) return []

    return rows.map((r, index) => {
        const amountEtb = parseFloat(r.total_amount)
        return {
            categoryName: r.category_name,
            amountEtb,
            percentage: Math.round((amountEtb / grandTotal) * 100),
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }
    })
}