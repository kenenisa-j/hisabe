'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Account } from '@/types'
import { toggleArchiveAccount, deleteAccount } from '@/actions/account-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { BankBrandLogo } from './bank-brand-logo'
import { ArrowLeft, Archive, Trash2, AlertTriangle } from 'lucide-react'

interface AccountDetailHeaderProps {
    account: Account
}

export function AccountDetailHeader({ account }: AccountDetailHeaderProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isArchived, setIsArchived] = useState(account.is_archived ?? false)

    const handleArchiveToggle = () => {
        startTransition(async () => {
            const nextStatus = !isArchived
            await toggleArchiveAccount(account.id, nextStatus)
            setIsArchived(nextStatus)
        })
    }

    const handleDeleteConfirm = () => {
        startTransition(async () => {
            const res = await deleteAccount(account.id)
            if (res.success) {
                router.push('/accounts')
            }
        })
    }

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Back Link & Account Info */}
            <div className="flex items-center gap-4">
                <Link
                    href="/accounts"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="flex items-center gap-3">
                    <BankBrandLogo name={account.name} type={account.type} size="lg" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-white">{account.name}</h1>
                            <Badge variant="outline" className="border-slate-800 text-slate-400 capitalize">
                                {account.type}
                            </Badge>
                            {isArchived && (
                                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Archived
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">Currency: {account.currency}</p>
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchiveToggle}
                    disabled={isPending}
                    className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                    <Archive className="mr-2 h-4 w-4 text-slate-400" />
                    {isArchived ? 'Unarchive' : 'Archive'}
                </Button>

                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isPending}
                    className="bg-red-600/90 text-white hover:bg-red-600"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                </Button>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[400px] p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white text-base font-semibold">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            Delete Account
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <p className="text-sm text-slate-300">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-white">&quot;{account.name}&quot;</span>?
                        </p>
                        <p className="text-xs text-slate-500">
                            This will permanently delete this account and all its associated transactions and transfers. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold"
                                onClick={handleDeleteConfirm}
                                disabled={isPending}
                            >
                                {isPending ? 'Deleting...' : 'Delete Account'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
