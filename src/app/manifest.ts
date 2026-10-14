import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Hisabe ሂሳብ — Ethiopian Finance',
        short_name: 'Hisabe',
        description: 'Track your ETB & USD expenses, budgets, savings, and debts — built for Ethiopia.',
        start_url: '/dashboard',
        id: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#020617', // slate-950
        theme_color: '#10b981', // emerald-500
        orientation: 'portrait',
        icons: [
            {
                src: '/hisabe-logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/hisabe-logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/hisabe-logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}