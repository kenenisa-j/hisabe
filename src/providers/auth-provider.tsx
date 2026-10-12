'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useTransition } from 'react'
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as fbSignOut,
    updateProfile,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseClientConfigured } from '@/lib/firebase/client'
import { useRouter } from 'next/navigation'

interface AuthContextType {
    user: User | null
    loading: boolean
    isConfigured: boolean
    signInWithEmail: (email: string, pass: string) => Promise<void>
    signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
    syncSession: (currentUser?: User | null) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isConfigured] = useState(() => isFirebaseClientConfigured())
    const [loading, setLoading] = useState(() => isFirebaseClientConfigured())
    const router = useRouter()
    const [, startTransition] = useTransition()

    const syncSession = useCallback(async (currentUser?: User | null): Promise<boolean> => {
        try {
            const targetUser = currentUser !== undefined ? currentUser : user
            if (targetUser) {
                const idToken = await targetUser.getIdToken(true)
                const res = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'HisabeAuth',
                    },
                    body: JSON.stringify({ idToken }),
                })
                return res.ok
            } else {
                await fetch('/api/auth/session', {
                    method: 'DELETE',
                    headers: {
                        'X-Requested-With': 'HisabeAuth',
                    },
                })
                return true
            }
        } catch (err) {
            console.error('Failed to sync Firebase session with server:', err)
            return false
        }
    }, [user])

    useEffect(() => {
        if (!isConfigured) return

        try {
            const auth = getFirebaseAuth()
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                setUser(currentUser)
                await syncSession(currentUser)
                setLoading(false)
            })
            return () => unsubscribe()
        } catch (err) {
            console.error('Firebase Auth initialization error:', err)
            setTimeout(() => setLoading(false), 0)
        }
    }, [isConfigured, syncSession])

    const signInWithEmail = async (email: string, pass: string) => {
        const auth = getFirebaseAuth()
        const cred = await signInWithEmailAndPassword(auth, email.trim(), pass)
        await syncSession(cred.user)
        startTransition(() => {
            router.refresh()
            router.push('/dashboard')
        })
    }

    const signUpWithEmail = async (email: string, pass: string, name?: string) => {
        const auth = getFirebaseAuth()
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass)
        if (name && name.trim()) {
            await updateProfile(cred.user, { displayName: name.trim() })
        }
        await syncSession(cred.user)
        startTransition(() => {
            router.refresh()
            router.push('/dashboard')
        })
    }

    const signInWithGoogle = async () => {
        const auth = getFirebaseAuth()
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        const cred = await signInWithPopup(auth, provider)
        await syncSession(cred.user)
        startTransition(() => {
            router.refresh()
            router.push('/dashboard')
        })
    }

    const signOut = async () => {
        try {
            const auth = getFirebaseAuth()
            await fbSignOut(auth)
        } catch (err) {
            console.error('Firebase sign-out error:', err)
        }
        await syncSession(null)
        startTransition(() => {
            router.refresh()
            router.push('/sign-in')
        })
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isConfigured,
                signInWithEmail,
                signUpWithEmail,
                signInWithGoogle,
                signOut,
                syncSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
