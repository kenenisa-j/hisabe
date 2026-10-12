'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import { HisabeLogoMark } from '@/components/layout/HisabeLogo'
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'

export default function SignInPage() {
    const { signInWithEmail, signInWithGoogle, isConfigured } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !password) {
            setError('Please enter both email and password.')
            return
        }

        setError(null)
        setLoading(true)

        try {
            await signInWithEmail(email, password)
        } catch (err: unknown) {
            const fbErr = err as { code?: string; message?: string }
            switch (fbErr?.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Invalid email or password.')
                    break
                case 'auth/invalid-email':
                    setError('Please enter a valid email address.')
                    break
                case 'auth/too-many-requests':
                    setError('Too many unsuccessful attempts. Please try again later.')
                    break
                default:
                    setError(fbErr?.message || 'Failed to sign in. Please check your credentials.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setError(null)
        setGoogleLoading(true)
        try {
            await signInWithGoogle()
        } catch (err: unknown) {
            const fbErr = err as { code?: string; message?: string }
            if (fbErr?.code !== 'auth/popup-closed-by-user') {
                setError(fbErr?.message || 'Failed to sign in with Google.')
            }
        } finally {
            setGoogleLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 selection:bg-amber-500/30">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8 flex flex-col items-center text-center">
                    <HisabeLogoMark size={72} className="mb-4 shadow-lg shadow-amber-500/10" />
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        Hisabe <span className="text-amber-400">ሂሳብ</span>
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Sign in to manage your accounts, expenses, and budgets.
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
                    {!isConfigured && (
                        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                            <div>
                                <p className="font-semibold">Firebase Config Missing</p>
                                <p className="mt-0.5 text-amber-200/80">
                                    Set your client Firebase credentials in <code className="rounded bg-slate-950 px-1 py-0.5">.env.local</code>.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Google Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading || googleLoading || !isConfigured}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {googleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                        ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                        )}
                        Continue with Google
                    </button>

                    <div className="relative my-6 text-center text-xs">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-800" />
                        </div>
                        <span className="relative bg-slate-900 px-3 text-slate-500 uppercase tracking-wider">
                            or with email
                        </span>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-medium text-slate-300">
                                    Password
                                </label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || googleLoading || !isConfigured}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <span>Sign in to Hisabe</span>
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer link */}
                    <div className="mt-6 text-center text-xs text-slate-400">
                        Don&apos;t have an account?{' '}
                        <Link
                            href="/sign-up"
                            className="font-medium text-amber-400 transition-colors hover:text-amber-300 hover:underline"
                        >
                            Create one now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
