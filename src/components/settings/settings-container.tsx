'use client'

import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUserSettings } from '@/providers/user-settings-provider'
import { getAccounts } from '@/actions/account-actions'
import { getCategories, createCategory, updateCategory, deleteCategory, CategoryItem } from '@/actions/category-actions'
import { exportFullJSONBackup } from '@/actions/backup-actions'
import { exportTransactionsCSV, exportAccountsCSV } from '@/actions/export-actions'
import { deleteUserAccountData } from '@/actions/settings-actions'
import { Account } from '@/types'
import {
    User,
    Shield,
    Palette,
    Globe,
    Database,
    Bell,
    Tag,
    Sliders,
    FileText,
    Banknote,
    Check,
    Download,
    Trash2,
    Plus,
    Edit2,
    Lock,
    Key,
    Smartphone,
    AlertTriangle,
    RefreshCw,
    Moon,
    Sun,
    Monitor,
    Calendar,
    ChevronRight,
    HelpCircle,
    Info,
    Eye,
    EyeOff
} from 'lucide-react'

type SectionId =
    | 'profile'
    | 'appearance'
    | 'privacy'
    | 'financial'
    | 'localization'
    | 'tax'
    | 'notifications'
    | 'categories'
    | 'display'
    | 'data'

export function SettingsContainer() {
    const { user, isLoaded } = useUser()
    const { openUserProfile, signOut } = useClerk()
    const { settings, updateSettings, maskAmount, formatDateDisplay } = useUserSettings()

    const [activeSection, setActiveSection] = useState<SectionId>('profile')
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<CategoryItem[]>([])
    const [downloading, setDownloading] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Passkey detection
    const [passkeySupported, setPasskeySupported] = useState<boolean>(false)
    const [sessionsList, setSessionsList] = useState<any[]>([])

    // Category Modal state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
    const [catName, setCatName] = useState('')
    const [catType, setCatType] = useState<'income' | 'expense'>('expense')
    const [catColor, setCatColor] = useState('#3b82f6')
    const [catIcon, setCatIcon] = useState('wallet')
    const [savingCat, setSavingCat] = useState(false)

    // Delete Account confirmation modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

    useEffect(() => {
        // Check Passkey WebAuthn browser support
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            setPasskeySupported(true)
        }

        // Fetch user real accounts
        getAccounts()
            .then(setAccounts)
            .catch(console.error)

        // Fetch categories
        getCategories()
            .then(setCategories)
            .catch(console.error)

        // Fetch Clerk active sessions
        if (user) {
            user.getSessions()
                .then((sess) => setSessionsList(sess || []))
                .catch(() => setSessionsList([]))
        }
    }, [user])

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg)
        setTimeout(() => setSuccessMessage(null), 4000)
    }

    // Export handlers
    const triggerDownload = (filename: string, content: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleExportJSON = async () => {
        try {
            setDownloading('json')
            const res = await exportFullJSONBackup()
            triggerDownload(res.filename, res.jsonContent, 'application/json')
            showSuccess('Full JSON backup exported successfully!')
        } catch (err) {
            console.error(err)
        } finally {
            setDownloading(null)
        }
    }

    const handleExportTransactions = async () => {
        try {
            setDownloading('tx-csv')
            const res = await exportTransactionsCSV()
            triggerDownload(res.filename, res.content, 'text/csv')
            showSuccess('Transactions CSV exported!')
        } catch (err) {
            console.error(err)
        } finally {
            setDownloading(null)
        }
    }

    const handleExportAccounts = async () => {
        try {
            setDownloading('acc-csv')
            const res = await exportAccountsCSV()
            triggerDownload(res.filename, res.content, 'text/csv')
            showSuccess('Accounts CSV exported!')
        } catch (err) {
            console.error(err)
        } finally {
            setDownloading(null)
        }
    }

    // Category CRUD
    const handleOpenAddCategory = (type: 'income' | 'expense' = 'expense') => {
        setEditingCategory(null)
        setCatName('')
        setCatType(type)
        setCatColor('#3b82f6')
        setCatIcon('wallet')
        setIsCategoryModalOpen(true)
    }

    const handleOpenEditCategory = (cat: CategoryItem) => {
        setEditingCategory(cat)
        setCatName(cat.name)
        setCatType(cat.type)
        setCatColor(cat.color || '#3b82f6')
        setCatIcon(cat.icon || 'wallet')
        setIsCategoryModalOpen(true)
    }

    const handleSaveCategory = async () => {
        if (!catName.trim()) return
        setSavingCat(true)
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, {
                    name: catName.trim(),
                    type: catType,
                    color: catColor,
                    icon: catIcon,
                })
                showSuccess(`Category "${catName}" updated!`)
            } else {
                await createCategory(catName.trim(), catType, catIcon, catColor)
                showSuccess(`Category "${catName}" created!`)
            }
            const updatedList = await getCategories()
            setCategories(updatedList)
            setIsCategoryModalOpen(false)
        } catch (err: any) {
            console.error(err)
        } finally {
            setSavingCat(false)
        }
    }

    const handleDeleteCategoryItem = async (catId: string, name: string) => {
        if (!confirm(`Are you sure you want to delete category "${name}"?`)) return
        try {
            await deleteCategory(catId)
            setCategories((prev) => prev.filter((c) => c.id !== catId))
            showSuccess(`Category "${name}" deleted.`)
        } catch (err) {
            console.error(err)
        }
    }

    // Account Deletion
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE ACCOUNT') return
        setIsDeletingAccount(true)
        try {
            const res = await deleteUserAccountData()
            if (res.success) {
                showSuccess('Your account data has been wiped.')
                setTimeout(() => {
                    signOut()
                }, 1500)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsDeletingAccount(false)
        }
    }

    const sectionsNav: { id: SectionId; label: string; icon: any; color: string }[] = [
        { id: 'profile', label: 'Profile & Account', icon: User, color: 'text-blue-400' },
        { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-purple-400' },
        { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: 'text-emerald-400' },
        { id: 'financial', label: 'Financial Settings', icon: Banknote, color: 'text-amber-400' },
        { id: 'localization', label: 'Calendar & Localization', icon: Globe, color: 'text-cyan-400' },
        { id: 'tax', label: 'Tax & Financial Tracking', icon: FileText, color: 'text-rose-400' },
        { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-orange-400' },
        { id: 'categories', label: 'Categories Management', icon: Tag, color: 'text-emerald-400' },
        { id: 'display', label: 'Display & Responsive Preferences', icon: Sliders, color: 'text-indigo-400' },
        { id: 'data', label: 'Data & Privacy', icon: Database, color: 'text-slate-400' },
    ]

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Hisabe Settings & Preferences</h1>
                <p className="text-sm text-slate-400">
                    Manage your personal account, security, local Ethiopian preferences, and visual display.
                </p>
            </div>

            {/* Success alert banner */}
            {successMessage && (
                <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm transition-all shadow-sm">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Navigation Tabs Bar / Sidebar Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Section Selector */}
                <div className="lg:col-span-1 space-y-1 bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl self-start sticky top-20">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Settings Categories
                    </div>
                    {sectionsNav.map((sec) => {
                        const Icon = sec.icon
                        const isActive = activeSection === sec.id
                        return (
                            <button
                                key={sec.id}
                                onClick={() => setActiveSection(sec.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                                    isActive
                                        ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60'
                                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <Icon className={`h-4 w-4 shrink-0 ${sec.color}`} />
                                    <span className="truncate">{sec.label}</span>
                                </div>
                                <ChevronRight className={`h-3.5 w-3.5 opacity-50 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                            </button>
                        )
                    })}
                </div>

                {/* Right Active Section Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* 1. PROFILE & ACCOUNT */}
                    {activeSection === 'profile' && (
                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white flex items-center gap-2">
                                        <User className="h-5 w-5 text-blue-400" />
                                        Profile Details
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Authenticated via Clerk user identity.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-lg">
                                        {user?.imageUrl ? (
                                            <img
                                                src={user.imageUrl}
                                                alt="Avatar"
                                                className="h-16 w-16 rounded-full border-2 border-slate-700 object-cover"
                                            />
                                        ) : (
                                            <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-white">
                                                {user?.firstName?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-white truncate">
                                                {user?.fullName || 'Hisabe User'}
                                            </h3>
                                            <p className="text-xs text-slate-400 truncate">
                                                {user?.primaryEmailAddress?.emailAddress}
                                            </p>
                                            <Badge className="mt-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                                Clerk Authenticated
                                            </Badge>
                                        </div>
                                        <Button
                                            onClick={() => openUserProfile()}
                                            className="bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700"
                                        >
                                            Manage Profile
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <Label className="text-xs text-slate-300">Full Name</Label>
                                            <Input
                                                value={user?.fullName || ''}
                                                readOnly
                                                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-300">Primary Email</Label>
                                            <Input
                                                value={user?.primaryEmailAddress?.emailAddress || ''}
                                                readOnly
                                                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-300">Phone Number</Label>
                                            <Input
                                                value={user?.primaryPhoneNumber?.phoneNumber || 'Not provided'}
                                                readOnly
                                                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-300">Country</Label>
                                            <Input
                                                value="Ethiopia (ET)"
                                                readOnly
                                                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-300">Time Zone</Label>
                                            <Input
                                                value={settings.timezone}
                                                readOnly
                                                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-300">Account Created</Label>
                                            <Input
                                                value={
                                                    user?.createdAt
                                                        ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                              year: 'numeric',
                                                              month: 'long',
                                                              day: 'numeric',
                                                          })
                                                        : 'Recent'
                                                }
                                                readOnly
                                                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white flex items-center gap-2">
                                        <Lock className="h-5 w-5 text-indigo-400" />
                                        Account Security & Actions
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Control authentication credentials and security options.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                        <div>
                                            <p className="font-medium text-white text-xs">Email Verification</p>
                                            <p className="text-[11px] text-slate-400">Verified via Clerk authentication provider</p>
                                        </div>
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                                            Verified
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            onClick={() => openUserProfile()}
                                            variant="outline"
                                            className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-white text-xs"
                                        >
                                            <Key className="h-3.5 w-3.5 mr-2 text-amber-400" />
                                            Change Password
                                        </Button>
                                        <Button
                                            onClick={() => openUserProfile()}
                                            variant="outline"
                                            className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-white text-xs"
                                        >
                                            <User className="h-3.5 w-3.5 mr-2 text-blue-400" />
                                            Change Email
                                        </Button>
                                        <Button
                                            onClick={() => setActiveSection('privacy')}
                                            variant="outline"
                                            className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs"
                                        >
                                            <Shield className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                                            View Privacy & Security Controls
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* 2. APPEARANCE */}
                    {activeSection === 'appearance' && (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Palette className="h-5 w-5 text-purple-400" />
                                    Appearance Preferences
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Customize your viewing mode, font size, and motion. Default keeps current Hisabe theme.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Theme Selection */}
                                <div>
                                    <Label className="text-xs text-slate-300 font-semibold mb-3 block">Theme</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            {
                                                id: 'hisabe-classic',
                                                label: 'Hisabe Classic Dark',
                                                badge: null,
                                                desc: 'Signature dark slate + emerald — the original Hisabe look',
                                                bg: 'bg-[#020617]',
                                                accent: 'bg-[#10b981]',
                                                text: 'text-[#10b981]',
                                                preview: ['#020617', '#0f172a', '#10b981', '#1e293b'],
                                            },
                                            {
                                                id: 'dark',
                                                label: 'Pure Dark',
                                                badge: null,
                                                desc: 'Neutral dark without green accent — minimal style',
                                                bg: 'bg-[#1a1a1a]',
                                                accent: 'bg-white',
                                                text: 'text-white',
                                                preview: ['#1a1a1a', '#2a2a2a', '#e5e5e5', '#555'],
                                            },
                                            {
                                                id: 'light',
                                                label: 'Light Classic (Default)',
                                                badge: 'Default',
                                                desc: 'Clean white with emerald highlights — professional',
                                                bg: 'bg-white',
                                                accent: 'bg-[#10b981]',
                                                text: 'text-[#10b981]',
                                                preview: ['#ffffff', '#f8fafc', '#10b981', '#e2e8f0'],
                                            },
                                            {
                                                id: 'light-emerald',
                                                label: 'Emerald Light',
                                                badge: 'New Light',
                                                desc: 'Soft mint slate background with forest green accents — Ethiopian nature',
                                                bg: 'bg-[#f0fdf4]',
                                                accent: 'bg-[#059669]',
                                                text: 'text-[#059669]',
                                                preview: ['#f0fdf4', '#ffffff', '#059669', '#bbf7d0'],
                                            },
                                            {
                                                id: 'light-blue',
                                                label: 'Ocean Light',
                                                badge: 'New Light',
                                                desc: 'Fresh sky-blue background with royal indigo accents — cool & modern',
                                                bg: 'bg-[#f0f9ff]',
                                                accent: 'bg-[#0284c7]',
                                                text: 'text-[#0284c7]',
                                                preview: ['#f0f9ff', '#ffffff', '#0284c7', '#bae6fd'],
                                            },
                                            {
                                                id: 'light-amber',
                                                label: 'Warm Light',
                                                badge: 'New Light',
                                                desc: 'Ivory cream background with solar amber-gold accents — cozy & rich',
                                                bg: 'bg-[#fffbeb]',
                                                accent: 'bg-[#d97706]',
                                                text: 'text-[#d97706]',
                                                preview: ['#fffbeb', '#ffffff', '#d97706', '#fde68a'],
                                            },
                                            {
                                                id: 'light-purple',
                                                label: 'Lavender Light',
                                                badge: 'New Light',
                                                desc: 'Soft lavender background with royal violet accents — elegant & smooth',
                                                bg: 'bg-[#faf5ff]',
                                                accent: 'bg-[#9333ea]',
                                                text: 'text-[#9333ea]',
                                                preview: ['#faf5ff', '#ffffff', '#9333ea', '#e9d5ff'],
                                            },
                                            {
                                                id: 'emerald',
                                                label: 'Emerald Forest',
                                                badge: null,
                                                desc: 'Vivid deep green — Ethiopian nature inspired',
                                                bg: 'bg-[#022c22]',
                                                accent: 'bg-[#34d399]',
                                                text: 'text-[#34d399]',
                                                preview: ['#022c22', '#064e3b', '#34d399', '#065f46'],
                                            },
                                            {
                                                id: 'violet',
                                                label: 'Midnight Violet',
                                                badge: null,
                                                desc: 'Royal purple dark — premium and sophisticated',
                                                bg: 'bg-[#0d0a1f]',
                                                accent: 'bg-[#a78bfa]',
                                                text: 'text-[#a78bfa]',
                                                preview: ['#0d0a1f', '#1a1140', '#a78bfa', '#2e1f6e'],
                                            },
                                            {
                                                id: 'system',
                                                label: 'System Default',
                                                badge: null,
                                                desc: 'Follows your OS light/dark preference automatically',
                                                bg: 'bg-gradient-to-br from-slate-900 to-white',
                                                accent: 'bg-slate-400',
                                                text: 'text-slate-400',
                                                preview: ['#020617', '#ffffff', '#94a3b8', '#1e293b'],
                                            },
                                        ].map((thm) => {
                                            const isSel = settings.theme === thm.id
                                            return (
                                                <button
                                                    key={thm.id}
                                                    onClick={() => updateSettings({ theme: thm.id as any })}
                                                    className={`p-3 rounded-xl border text-left transition-all ${
                                                        isSel
                                                            ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                                                            : 'bg-slate-950 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                                                    }`}
                                                >
                                                    {/* Color Swatch Strip */}
                                                    <div className="flex gap-1 mb-2.5">
                                                        {thm.preview.map((c, i) => (
                                                            <div
                                                                key={i}
                                                                className="h-5 flex-1 rounded"
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <p className={`text-xs font-bold ${isSel ? thm.text : 'text-white'}`}>
                                                            {thm.label}
                                                        </p>
                                                        {thm.badge && (
                                                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                                                                {thm.badge}
                                                            </span>
                                                        )}
                                                        {isSel && (
                                                            <span className="ml-auto text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                                                                Active
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">{thm.desc}</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Font Size */}
                                <div>
                                    <Label className="text-xs text-slate-300 font-semibold mb-2 block">Font Size</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'small', label: 'Small' },
                                            { id: 'medium', label: 'Medium (Default)' },
                                            { id: 'large', label: 'Large' },
                                        ].map((fs) => (
                                            <button
                                                key={fs.id}
                                                onClick={() => updateSettings({ font_size: fs.id as any })}
                                                className={`py-2.5 px-3 rounded-lg border text-center text-xs font-medium transition-all ${
                                                    settings.font_size === fs.id
                                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                {fs.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Reduced Motion */}
                                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                    <div>
                                        <p className="text-xs font-medium text-white">Reduced Motion</p>
                                        <p className="text-[11px] text-slate-400">Minimize animations and UI transition effects</p>
                                    </div>
                                    <Switch
                                        checked={settings.reduced_motion}
                                        onCheckedChange={(val) => updateSettings({ reduced_motion: val })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 3. PRIVACY & SECURITY */}
                    {activeSection === 'privacy' && (
                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-emerald-400" />
                                        Privacy Controls
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Mask balances and hide sensitive numbers on screen.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                        <div>
                                            <p className="text-xs font-medium text-white flex items-center gap-1.5">
                                                {settings.hide_balances ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-400" />}
                                                Hide Balances
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                Mask financial amounts across all screens (Example: {maskAmount(32450, 'ETB')})
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.hide_balances}
                                            onCheckedChange={(val) => updateSettings({ hide_balances: val })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                        <div>
                                            <p className="text-xs font-medium text-white">Privacy Mode</p>
                                            <p className="text-[11px] text-slate-400">
                                                Temporarily obfuscate sensitive account numbers and personal financial stats
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.privacy_mode}
                                            onCheckedChange={(val) => updateSettings({ privacy_mode: val })}
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 font-semibold mb-2 block">Session Auto Lock</Label>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                            {[
                                                { id: 'never', label: 'Never' },
                                                { id: '5m', label: '5 Mins' },
                                                { id: '15m', label: '15 Mins' },
                                                { id: '30m', label: '30 Mins' },
                                                { id: '1h', label: '1 Hour' },
                                            ].map((lck) => (
                                                <button
                                                    key={lck.id}
                                                    onClick={() => updateSettings({ auto_lock: lck.id as any })}
                                                    className={`py-2 px-2.5 rounded-lg border text-center text-xs font-medium transition-all ${
                                                        settings.auto_lock === lck.id
                                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {lck.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white flex items-center gap-2">
                                        <Smartphone className="h-5 w-5 text-blue-400" />
                                        Passkeys & Active Sessions
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Manage web passkey authentication and view active device sessions.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                        <div>
                                            <p className="text-xs font-medium text-white flex items-center gap-1.5">
                                                <Key className="h-3.5 w-3.5 text-blue-400" />
                                                Web Passkeys / Device Auth
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {passkeySupported
                                                    ? 'Browser WebAuthn supported. Allow quick passkey authentication.'
                                                    : 'WebAuthn passkeys not supported by current web browser.'}
                                            </p>
                                        </div>
                                        <Switch
                                            disabled={!passkeySupported}
                                            checked={settings.passkey_enabled && passkeySupported}
                                            onCheckedChange={(val) => updateSettings({ passkey_enabled: val })}
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 font-semibold mb-2 block">Active Sessions</Label>
                                        <div className="space-y-2">
                                            {sessionsList.length > 0 ? (
                                                sessionsList.map((s, idx) => (
                                                    <div
                                                        key={s.id || idx}
                                                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-white">
                                                                {s.latestActivity?.deviceType || 'Web Browser'} — {s.latestActivity?.browserName || 'Active Session'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                IP: {s.latestActivity?.ipAddress || 'Current IP'} • Last active: {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : 'Now'}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                                            Active
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                                                    Current Web Browser Session (Active)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* 4. FINANCIAL SETTINGS */}
                    {activeSection === 'financial' && (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Banknote className="h-5 w-5 text-amber-400" />
                                    Financial Preferences
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Configure currency defaults, preferred default account, number formatting, and budget start day.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Base Currency</Label>
                                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-white font-medium flex items-center justify-between">
                                            <span>Ethiopian Birr (ETB / Br)</span>
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Default</Badge>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Preferred / Default Account</Label>
                                        <select
                                            value={settings.default_account_id || ''}
                                            onChange={(e) => updateSettings({ default_account_id: e.target.value || null })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-emerald-500"
                                        >
                                            <option value="">-- Select Default Account --</option>
                                            {accounts.map((acc) => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} ({acc.type.toUpperCase()} - {acc.currency})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Number Format</Label>
                                        <select
                                            value={settings.number_format}
                                            onChange={(e) => updateSettings({ number_format: e.target.value as any })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-emerald-500"
                                        >
                                            <option value="standard">Standard: 1,234.56 ETB</option>
                                            <option value="european">European: 1.234,56 ETB</option>
                                            <option value="space">Space Separator: 1 234,56 ETB</option>
                                        </select>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Financial Month Start Day</Label>
                                        <select
                                            value={settings.financial_month_start}
                                            onChange={(e) => updateSettings({ financial_month_start: parseInt(e.target.value, 10) })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-emerald-500"
                                        >
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                                <option key={day} value={day}>
                                                    Day {day} of month
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 5. CALENDAR & LOCALIZATION */}
                    {activeSection === 'localization' && (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-cyan-400" />
                                    Calendar & Ethiopian Localization
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Control display dates, Amharic-ready structure, and Ethiopian time zone defaults.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Calendar type choice */}
                                <div>
                                    <Label className="text-xs text-slate-300 font-semibold mb-2 block">Calendar System Display</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { id: 'gregorian', label: 'Gregorian', example: 'October 6, 2026' },
                                            { id: 'ethiopian', label: 'Ethiopian', example: 'መስከረም 26, 2019' },
                                            { id: 'both', label: 'Both (Dual Display)', example: 'October 6, 2026\nመስከረም 26, 2019' },
                                        ].map((cal) => (
                                            <button
                                                key={cal.id}
                                                onClick={() => updateSettings({ calendar_type: cal.id as any })}
                                                className={`p-3.5 rounded-lg border text-left transition-all ${
                                                    settings.calendar_type === cal.id
                                                        ? 'bg-slate-800 border-cyan-500 ring-1 ring-cyan-500/50'
                                                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <p className="text-xs font-semibold text-white">{cal.label}</p>
                                                <p className="text-[11px] text-cyan-400 mt-1 whitespace-pre-line font-mono">{cal.example}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Live Preview */}
                                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                                    <p className="text-slate-400 text-[11px]">Live Date Preview:</p>
                                    <p className="text-white font-medium mt-1">
                                        {formatDateDisplay(new Date()).main}
                                    </p>
                                    {formatDateDisplay(new Date()).sub && (
                                        <p className="text-cyan-400 font-medium text-[11px] mt-0.5">
                                            {formatDateDisplay(new Date()).sub}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Language</Label>
                                        <select
                                            value={settings.language}
                                            onChange={(e) => updateSettings({ language: e.target.value as any })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-cyan-500"
                                        >
                                            <option value="en">English (Official)</option>
                                            <option value="am" disabled>
                                                አማርኛ (Amharic — Structure Prepared)
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Time Zone</Label>
                                        <Input
                                            value="Africa/Addis_Ababa (UTC+3)"
                                            readOnly
                                            className="bg-slate-950 border-slate-800 text-white text-xs"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 6. TAX & FINANCIAL TRACKING */}
                    {activeSection === 'tax' && (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-rose-400" />
                                    Tax & Financial Tracking
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Track estimated taxable income and tax obligations for personal reference.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs flex items-start gap-2">
                                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>
                                        Disclaimer: This is for personal financial tax tracking and estimation only. Hisabe is not an official tax filing platform.
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Tax Income Profile</Label>
                                        <select
                                            value={settings.tax_income_type}
                                            onChange={(e) => updateSettings({ tax_income_type: e.target.value })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-rose-500"
                                        >
                                            <option value="employee">Salaried Employee</option>
                                            <option value="business">Business / Sole Proprietor</option>
                                            <option value="freelance">Freelance / Consultant</option>
                                            <option value="mixed">Mixed Income Streams</option>
                                        </select>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Tax Period</Label>
                                        <select
                                            value={settings.tax_period}
                                            onChange={(e) => updateSettings({ tax_period: e.target.value })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-rose-500"
                                        >
                                            <option value="2018 E.C. / 2025-2026">Fiscal Year 2018 E.C. (2025/2026)</option>
                                            <option value="2017 E.C. / 2024-2025">Fiscal Year 2017 E.C. (2024/2025)</option>
                                            <option value="monthly">Monthly Cycle</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                        <Label className="text-[11px] text-slate-400">Estimated Taxable Income</Label>
                                        <Input
                                            type="number"
                                            value={settings.tax_estimated_income}
                                            onChange={(e) => updateSettings({ tax_estimated_income: parseFloat(e.target.value) || 0 })}
                                            className="mt-1 bg-slate-900 border-slate-800 text-white text-xs"
                                        />
                                    </div>

                                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                        <Label className="text-[11px] text-slate-400">Estimated Tax</Label>
                                        <Input
                                            type="number"
                                            value={settings.tax_estimated_tax}
                                            onChange={(e) => updateSettings({ tax_estimated_tax: parseFloat(e.target.value) || 0 })}
                                            className="mt-1 bg-slate-900 border-slate-800 text-white text-xs"
                                        />
                                    </div>

                                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                        <Label className="text-[11px] text-slate-400">Tax Already Paid</Label>
                                        <Input
                                            type="number"
                                            value={settings.tax_paid}
                                            onChange={(e) => updateSettings({ tax_paid: parseFloat(e.target.value) || 0 })}
                                            className="mt-1 bg-slate-900 border-slate-800 text-white text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                    <div>
                                        <p className="text-xs font-medium text-white">Tax Deadline Reminders</p>
                                        <p className="text-[11px] text-slate-400">Notify before quarterly/annual tax deadlines</p>
                                    </div>
                                    <Switch
                                        checked={settings.tax_reminders_enabled}
                                        onCheckedChange={(val) => updateSettings({ tax_reminders_enabled: val })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 7. NOTIFICATIONS */}
                    {activeSection === 'notifications' && (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-orange-400" />
                                    Notification Controls
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Toggle notification alerts for transactions, budgets, goals, debts, and security events.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transactions</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Large Expense Alert</span>
                                            <Switch
                                                checked={settings.notification_large_expense}
                                                onCheckedChange={(val) => updateSettings({ notification_large_expense: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Income Received</span>
                                            <Switch
                                                checked={settings.notification_income_received}
                                                onCheckedChange={(val) => updateSettings({ notification_income_received: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Transfer Completed</span>
                                            <Switch
                                                checked={settings.notification_transfer_completed}
                                                onCheckedChange={(val) => updateSettings({ notification_transfer_completed: val })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Budgets & Goals</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Budget Warning (80%)</span>
                                            <Switch
                                                checked={settings.notification_budget_warning}
                                                onCheckedChange={(val) => updateSettings({ notification_budget_warning: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Budget Exceeded</span>
                                            <Switch
                                                checked={settings.notification_budget_exceeded}
                                                onCheckedChange={(val) => updateSettings({ notification_budget_exceeded: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Goal Milestone</span>
                                            <Switch
                                                checked={settings.notification_goal_milestone}
                                                onCheckedChange={(val) => updateSettings({ notification_goal_milestone: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Goal Contribution Reminder</span>
                                            <Switch
                                                checked={settings.notification_goal_reminder}
                                                onCheckedChange={(val) => updateSettings({ notification_goal_reminder: val })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Debts & Recurring</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Upcoming Recurring Payment</span>
                                            <Switch
                                                checked={settings.notification_recurring_upcoming}
                                                onCheckedChange={(val) => updateSettings({ notification_recurring_upcoming: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Debt Repayment Reminder</span>
                                            <Switch
                                                checked={settings.notification_debt_reminder}
                                                onCheckedChange={(val) => updateSettings({ notification_debt_reminder: val })}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                            <span className="text-xs text-white">Overdue Debt Alert</span>
                                            <Switch
                                                checked={settings.notification_debt_overdue}
                                                onCheckedChange={(val) => updateSettings({ notification_debt_overdue: val })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 8. CATEGORIES MANAGEMENT */}
                    {activeSection === 'categories' && (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg text-white flex items-center gap-2">
                                        <Tag className="h-5 w-5 text-emerald-400" />
                                        Categories & Personalization
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Manage your custom income and expense categories.
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => handleOpenAddCategory('expense')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Add Category
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expense Categories</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {categories
                                            .filter((c) => c.type === 'expense')
                                            .map((cat) => (
                                                <div
                                                    key={cat.id}
                                                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className="h-3.5 w-3.5 rounded-full"
                                                            style={{ backgroundColor: cat.color || '#3b82f6' }}
                                                        />
                                                        <span className="text-white font-medium">{cat.name}</span>
                                                        {cat.is_system && (
                                                            <Badge className="bg-slate-800 text-slate-400 text-[10px]">Default</Badge>
                                                        )}
                                                    </div>
                                                    {!cat.is_system && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleOpenEditCategory(cat)}
                                                                className="p-1 text-slate-400 hover:text-white"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategoryItem(cat.id, cat.name)}
                                                                className="p-1 text-rose-400 hover:text-rose-300"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-slate-800">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Income Categories</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {categories
                                            .filter((c) => c.type === 'income')
                                            .map((cat) => (
                                                <div
                                                    key={cat.id}
                                                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className="h-3.5 w-3.5 rounded-full"
                                                            style={{ backgroundColor: cat.color || '#10b981' }}
                                                        />
                                                        <span className="text-white font-medium">{cat.name}</span>
                                                        {cat.is_system && (
                                                            <Badge className="bg-slate-800 text-slate-400 text-[10px]">Default</Badge>
                                                        )}
                                                    </div>
                                                    {!cat.is_system && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleOpenEditCategory(cat)}
                                                                className="p-1 text-slate-400 hover:text-white"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategoryItem(cat.id, cat.name)}
                                                                className="p-1 text-rose-400 hover:text-rose-300"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 9. DISPLAY PREFERENCES */}
                    {activeSection === 'display' && (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <Sliders className="h-5 w-5 text-indigo-400" />
                                    Display & Responsive Preferences
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Adjust layout content width, density, and UI spacing. Default keeps original layout.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div>
                                    <Label className="text-xs text-slate-300 font-semibold mb-2 block">Content Width</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'standard', label: 'Standard (Default)' },
                                            { id: 'wide', label: 'Wide' },
                                            { id: 'full', label: 'Full Width' },
                                        ].map((w) => (
                                            <button
                                                key={w.id}
                                                onClick={() => updateSettings({ content_width: w.id as any })}
                                                className={`py-2.5 px-3 rounded-lg border text-center text-xs font-medium transition-all ${
                                                    settings.content_width === w.id
                                                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                {w.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-slate-300 font-semibold mb-2 block">Display Density</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'compact', label: 'Compact' },
                                            { id: 'comfortable', label: 'Comfortable (Default)' },
                                            { id: 'spacious', label: 'Spacious' },
                                        ].map((d) => (
                                            <button
                                                key={d.id}
                                                onClick={() => updateSettings({ display_density: d.id as any })}
                                                className={`py-2.5 px-3 rounded-lg border text-center text-xs font-medium transition-all ${
                                                    settings.display_density === d.id
                                                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                }`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Tables Density</Label>
                                        <select
                                            value={settings.tables_density}
                                            onChange={(e) => updateSettings({ tables_density: e.target.value as any })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-indigo-500"
                                        >
                                            <option value="comfortable">Comfortable (Default)</option>
                                            <option value="compact">Compact</option>
                                        </select>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-slate-300 mb-1.5 block">Cards Density</Label>
                                        <select
                                            value={settings.cards_density}
                                            onChange={(e) => updateSettings({ cards_density: e.target.value as any })}
                                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none focus:border-indigo-500"
                                        >
                                            <option value="comfortable">Comfortable (Default)</option>
                                            <option value="compact">Compact</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 10. DATA & PRIVACY */}
                    {activeSection === 'data' && (
                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white flex items-center gap-2">
                                        <Database className="h-5 w-5 text-blue-400" />
                                        Data Export & Backups
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Export your personal financial data anytime in JSON or CSV format.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-lg gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-white">Full JSON Backup</p>
                                            <p className="text-xs text-slate-400">
                                                Download accounts, transactions, budgets, goals, debts & categories in JSON format.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleExportJSON}
                                            disabled={downloading === 'json'}
                                            className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 text-xs"
                                        >
                                            <Download className="h-3.5 w-3.5 mr-2" />
                                            {downloading === 'json' ? 'Exporting...' : 'Export JSON'}
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                            <div>
                                                <p className="text-xs font-semibold text-white">Transactions CSV</p>
                                                <p className="text-[11px] text-slate-400">Export transaction history</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={handleExportTransactions}
                                                disabled={downloading === 'tx-csv'}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shrink-0"
                                            >
                                                <Download className="h-3.5 w-3.5 mr-1" />
                                                CSV
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                                            <div>
                                                <p className="text-xs font-semibold text-white">Accounts CSV</p>
                                                <p className="text-[11px] text-slate-400">Export account statements</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={handleExportAccounts}
                                                disabled={downloading === 'acc-csv'}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shrink-0"
                                            >
                                                <Download className="h-3.5 w-3.5 mr-1" />
                                                CSV
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900 border-rose-900/50">
                                <CardHeader>
                                    <CardTitle className="text-lg text-rose-400 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        Delete Account Data
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Permanently delete all your personal financial data from Hisabe database.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 bg-rose-950/20 border border-rose-900/30 rounded-lg">
                                        <div>
                                            <p className="text-xs font-semibold text-white">Delete All Personal Data</p>
                                            <p className="text-[11px] text-slate-400">
                                                This action is irreversible and wipes all transaction history, accounts, and budgets.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            className="bg-rose-600 hover:bg-rose-500 text-white text-xs shrink-0"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                            Delete Account
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Add/Edit Modal */}
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg">
                            {editingCategory ? 'Edit Category' : 'Add Custom Category'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Create or modify your personalized financial transaction category.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label className="text-xs text-slate-300">Category Name</Label>
                            <Input
                                value={catName}
                                onChange={(e) => setCatName(e.target.value)}
                                placeholder="e.g. Subscriptions, Coffee, Freelance"
                                className="mt-1 bg-slate-950 border-slate-800 text-white text-xs"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-slate-300">Category Type</Label>
                            <select
                                value={catType}
                                onChange={(e) => setCatType(e.target.value as any)}
                                className="w-full mt-1 p-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white outline-none"
                            >
                                <option value="expense">Expense Category</option>
                                <option value="income">Income Category</option>
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs text-slate-300">Category Color</Label>
                            <div className="flex items-center gap-2 mt-1.5">
                                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setCatColor(c)}
                                        className={`h-7 w-7 rounded-full transition-all ${
                                            catColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                                        }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCategoryModalOpen(false)}
                            className="bg-slate-950 border-slate-800 text-slate-300 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveCategory}
                            disabled={savingCat || !catName.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                        >
                            {savingCat ? 'Saving...' : 'Save Category'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Account Delete Confirmation Dialog */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="bg-slate-900 border-rose-900/50 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg text-rose-400 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Account Data Deletion
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            This action will wipe all your financial records from Neon DB. Type <strong className="text-white">DELETE ACCOUNT</strong> to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE ACCOUNT"
                            className="bg-slate-950 border-rose-900/50 text-white text-xs"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="bg-slate-950 border-slate-800 text-slate-300 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount || deleteConfirmText !== 'DELETE ACCOUNT'}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
                        >
                            {isDeletingAccount ? 'Wiping Data...' : 'Confirm Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
