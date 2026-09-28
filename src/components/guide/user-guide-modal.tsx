'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    HelpCircle,
    Wallet,
    ArrowRightLeft,
    PieChart,
    PiggyBank,
    HandCoins,
    BarChart3,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Lightbulb,
} from 'lucide-react'

interface Step {
    id: number
    title: string
    subtitle: string
    icon: any
    iconColor: string
    bgColor: string
    description: string
    tips: string[]
}

const GUIDE_STEPS: Step[] = [
    {
        id: 1,
        title: 'Step 1: Set Up Your Accounts',
        subtitle: 'Add bank accounts, mobile money, or cash wallets',
        icon: Wallet,
        iconColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/20',
        description:
            'Start by going to the Accounts tab. Add your Ethiopian bank accounts (Dashen Bank, CBE, Awash, etc.), Telebirr, CBE Birr, or Cash with their starting balances.',
        tips: [
            'Separate your liquid cash from bank accounts for exact tracking.',
            'Initial balances automatically update your total Net Worth.',
        ],
    },
    {
        id: 2,
        title: 'Step 2: Log Income & Expenses',
        subtitle: 'Use Quick Entry with Ctrl+K / ⌘+K shortcut',
        icon: ArrowRightLeft,
        iconColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/20',
        description:
            'Click the green "+ Add / Transfer" button at the top of any page or press Ctrl+K to quickly record Expenses, Income, or Transfers between accounts.',
        tips: [
            'Pick quick amount presets (+50, +100, +500 ETB) to save time.',
            'You can create custom categories on the fly using the ➕ Create Custom Category option.',
        ],
    },
    {
        id: 3,
        title: 'Step 3: Create Category Budgets',
        subtitle: 'Set monthly spending limits and prevent overspending',
        icon: PieChart,
        iconColor: 'text-purple-400',
        bgColor: 'bg-purple-500/10 border-purple-500/20',
        description:
            'Go to the Budgets page to assign monthly spending caps for categories like Food & Dining, Utilities, Transport, or Shopping.',
        tips: [
            'Visual progress bars show red warnings when reaching 80%+ of your limit.',
            'Budgets auto-reset every month to keep your financial plan on track.',
        ],
    },
    {
        id: 4,
        title: 'Step 4: Build Savings Goals',
        subtitle: 'Allocate money toward long-term goals',
        icon: PiggyBank,
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/20',
        description:
            'Set up targets on the Savings & Goals page for items like Emergency Funds, Tech gear, or Travel. Use "Deposit Funds to Goal" to move money from active accounts.',
        tips: [
            'Transfers to goals automatically record money movements from your funding accounts.',
            'Track percentage progress toward your target completion date.',
        ],
    },
    {
        id: 5,
        title: 'Step 5: Track Debts & Loans',
        subtitle: 'Manage money you owe or money owed to you',
        icon: HandCoins,
        iconColor: 'text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/20',
        description:
            'Log loans and personal debts under Debts & Loans. When making or receiving payments, click "Payment / Settle" to update your account balances automatically.',
        tips: [
            'Supports both partial repayments and full balance settlements.',
            'Repayments automatically create linked expense or income entries in your transaction history.',
        ],
    },
    {
        id: 6,
        title: 'Step 6: Review Reports & Analytics',
        subtitle: 'Analyze monthly cash flow and Net Worth growth',
        icon: BarChart3,
        iconColor: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 border-cyan-500/20',
        description:
            'Visit Reports & Analytics to view detailed category breakdown tables, spending distribution charts, and historical Net Worth timeline snapshots.',
        tips: [
            'Filter reports by custom date ranges or quick presets (This Month, Last Month, 3 Months).',
            'Export your transactions to CSV anytime under Settings.',
        ],
    },
]

export function UserGuideModal() {
    const [open, setOpen] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    const currentStep = GUIDE_STEPS[currentStepIndex]
    const StepIcon = currentStep.icon

    const handleNext = () => {
        if (currentStepIndex < GUIDE_STEPS.length - 1) {
            setCurrentStepIndex((prev) => prev + 1)
        } else {
            setOpen(false)
        }
    }

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="How to Use Hisabe"
            />}>
                <HelpCircle className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">How to Use</span>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white p-6">
                <DialogHeader className="pb-3 border-b border-slate-800">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-emerald-400" />
                        How to Use Hisabe (Step-by-Step)
                    </DialogTitle>
                </DialogHeader>

                {/* Step Progress Indicators */}
                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-emerald-400">
                        Step {currentStepIndex + 1} of {GUIDE_STEPS.length}
                    </span>
                    <div className="flex items-center gap-1">
                        {GUIDE_STEPS.map((s, idx) => (
                            <button
                                key={s.id}
                                onClick={() => setCurrentStepIndex(idx)}
                                className={`h-2 rounded-full transition-all ${
                                    idx === currentStepIndex
                                        ? 'w-6 bg-emerald-500'
                                        : 'w-2 bg-slate-800 hover:bg-slate-700'
                                }`}
                                title={s.title}
                            />
                        ))}
                    </div>
                </div>

                {/* Current Step Card */}
                <div className="space-y-4 pt-2">
                    <div className={`p-4 rounded-xl border ${currentStep.bgColor} space-y-2`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                <StepIcon className={`h-6 w-6 ${currentStep.iconColor}`} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-white">{currentStep.title}</h3>
                                <p className="text-xs text-slate-400">{currentStep.subtitle}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed pt-1">
                            {currentStep.description}
                        </p>
                    </div>

                    {/* Pro Tips Box */}
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                            <Lightbulb className="h-3.5 w-3.5" />
                            <span>Pro Tips:</span>
                        </div>
                        <ul className="space-y-1 text-slate-400 list-disc list-inside text-[11px]">
                            {currentStep.tips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        disabled={currentStepIndex === 0}
                        className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handleNext}
                        className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1"
                    >
                        {currentStepIndex === GUIDE_STEPS.length - 1 ? (
                            <>
                                Got it! <CheckCircle2 className="h-3.5 w-3.5" />
                            </>
                        ) : (
                            <>
                                Next <ChevronRight className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
