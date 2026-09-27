import { getBudgetsWithProgress } from '@/actions/budget-actions'
import { getCategories } from '@/actions/category-actions'
import { BudgetsContainer } from '@/components/budgets/budgets-container'

export const revalidate = 0

interface PageProps {
    searchParams: Promise<{ month?: string; year?: string }>
}

export default async function BudgetsPage({ searchParams }: PageProps) {
    const params = await searchParams

    const now = new Date()
    const currentMonth = params.month ? parseInt(params.month) : now.getMonth() + 1
    const currentYear = params.year ? parseInt(params.year) : now.getFullYear()

    const [budgets, categories] = await Promise.all([
        getBudgetsWithProgress(currentMonth, currentYear),
        getCategories('expense'),
    ])

    return (
        <BudgetsContainer
            budgets={budgets}
            categories={categories}
            currentMonth={currentMonth}
            currentYear={currentYear}
        />
    )
}