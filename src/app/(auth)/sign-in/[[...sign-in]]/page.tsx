import { SignIn } from '@clerk/nextjs'
import { HisabeLogoMark } from '@/components/layout/HisabeLogo'

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex flex-col items-center text-center">
                    <HisabeLogoMark size={72} className="mb-4" />
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        Hisabe <span className="text-amber-400">ሂሳብ</span>
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Sign in to manage your accounts, expenses, and budgets.
                    </p>
                </div>
                <SignIn
                    appearance={{
                        elements: {
                            card: 'bg-slate-900 border border-slate-800 shadow-xl',
                            headerTitle: 'text-white',
                            headerSubtitle: 'text-slate-400',
                            socialButtonsBlockButton:
                                'bg-slate-800 border-slate-700 text-white hover:bg-slate-700',
                            formButtonPrimary:
                                'bg-emerald-600 hover:bg-emerald-500 text-white font-medium',
                            formFieldLabel: 'text-slate-300',
                            formFieldInput:
                                'bg-slate-950 border-slate-800 text-white focus:border-emerald-500',
                            footerActionLink: 'text-emerald-400 hover:text-emerald-300',
                        },
                    }}
                />
            </div>
        </div>
    )
}
