import { sql } from '@/lib/db'

export interface CategoryItem {
    id: string
    name: string
    type: 'income' | 'expense'
    icon?: string | null
    color?: string | null
    is_system?: boolean
}

/**
 * Fetch all categories available to user (custom categories + default system categories)
 */
export async function getCategories(userId: string, type?: 'income' | 'expense'): Promise<CategoryItem[]> {
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
