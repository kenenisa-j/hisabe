import React from 'react'

interface BankBrandLogoProps {
    name: string
    type: string
    className?: string
    size?: 'sm' | 'md' | 'lg'
}

// Color palettes for dynamically generated brand badges (fallback for unrecognized names)
const DYNAMIC_GRADIENTS = [
    { bg: 'from-blue-600 to-indigo-900 border-blue-400/30 text-blue-200', text: 'text-white' },
    { bg: 'from-emerald-600 to-teal-900 border-emerald-400/30 text-emerald-200', text: 'text-white' },
    { bg: 'from-amber-600 to-yellow-900 border-amber-400/30 text-amber-200', text: 'text-amber-100' },
    { bg: 'from-purple-600 to-pink-900 border-purple-400/30 text-purple-200', text: 'text-white' },
    { bg: 'from-rose-600 to-red-900 border-rose-400/30 text-rose-200', text: 'text-white' },
    { bg: 'from-cyan-600 to-blue-900 border-cyan-400/30 text-cyan-200', text: 'text-white' },
    { bg: 'from-violet-600 to-purple-900 border-violet-400/30 text-violet-200', text: 'text-white' },
    { bg: 'from-slate-700 to-slate-900 border-slate-600/30 text-slate-200', text: 'text-white' },
]

function getHashIndex(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % DYNAMIC_GRADIENTS.length
}

function getInitials(name: string): string {
    const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, '')
    if (!cleaned) return 'NB'
    const parts = cleaned.split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return cleaned.substring(0, 2).toUpperCase()
}

export function BankBrandLogo({ name, type, className = '', size = 'md' }: BankBrandLogoProps) {
    const lower = (name + ' ' + type).toLowerCase().trim()

    const dimensions = {
        sm: { box: 'w-8 h-8 rounded-lg text-[10px]', img: 32 },
        md: { box: 'w-11 h-11 rounded-xl text-xs', img: 44 },
        lg: { box: 'w-14 h-14 rounded-2xl text-sm', img: 56 },
    }[size]

    const renderSVGLogo = (src: string, alt: string, bgClass = 'bg-white border border-slate-200') => (
        <div className={`flex items-center justify-center shadow-md overflow-hidden shrink-0 ${dimensions.box} ${bgClass} ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                width={dimensions.img}
                height={dimensions.img}
                className="object-contain w-full h-full"
                loading="lazy"
            />
        </div>
    )

    // 1. CBE Birr (Must check before CBE!)
    if (lower.includes('cbe birr') || lower.includes('cbebirr')) {
        return renderSVGLogo('/logos/cbe_birr_normal.svg', 'CBE Birr', 'bg-white border border-purple-300')
    }

    // 2. M-PESA Safaricom
    if (lower.includes('m-pesa') || lower.includes('mpesa') || lower.includes('safaricom')) {
        return renderSVGLogo('/logos/mpesa.png', 'M-PESA Safaricom', 'bg-white border border-emerald-300')
    }

    // 3. Telebirr
    if (lower.includes('telebirr') || lower.includes('tele birr')) {
        return renderSVGLogo('/logos/tele_birr.svg', 'Telebirr', 'bg-white border border-cyan-200')
    }

    // 4. Commercial Bank of Ethiopia (CBE)
    if (lower.includes('cbe') || lower.includes('commercial bank') || lower.includes('ንግድ ባንክ')) {
        return renderSVGLogo('/logos/commercial_bank_of_ethiopia.svg', 'Commercial Bank of Ethiopia', 'bg-white border border-slate-200')
    }

    // 5. Bank of Abyssinia (BOA)
    if (lower.includes('abyssinia') || lower.includes('boa') || lower.includes('አቢሲንያ')) {
        return renderSVGLogo('/logos/bank_of_abyssinia.svg', 'Bank of Abyssinia', 'bg-white border border-slate-200')
    }

    // 6. Awash Bank
    if (lower.includes('awash') || lower.includes('አዋሽ')) {
        return renderSVGLogo('/logos/awash_international_bank.svg', 'Awash Bank', 'bg-white border border-slate-200')
    }

    // 7. Dashen Bank
    if (lower.includes('dashen') || lower.includes('ዳሸን')) {
        return renderSVGLogo('/logos/dashen_bank.svg', 'Dashen Bank', 'bg-white border border-slate-200')
    }

    // 8. Hibret Bank (United Bank)
    if (lower.includes('hibret') || lower.includes('united bank') || lower.includes('ህብረት')) {
        return renderSVGLogo('/logos/hibret_bank.svg', 'Hibret Bank', 'bg-white border border-slate-200')
    }

    // 9. Cooperative Bank of Oromia (Coopbank)
    if (lower.includes('coop') || lower.includes('cooperative') || lower.includes('ኮኦፕ')) {
        return renderSVGLogo('/logos/cooperative_bank_of_oromia.svg', 'Cooperative Bank of Oromia', 'bg-white border border-slate-200')
    }

    // 10. Wegagen Bank
    if (lower.includes('wegagen') || lower.includes('ወጋገን')) {
        return renderSVGLogo('/logos/wegagen.png', 'Wegagen Bank', 'bg-white border border-slate-200')
    }

    // 11. Nib International Bank
    if (lower.includes('nib') || lower.includes('ኒብ')) {
        return renderSVGLogo('/logos/nib.png', 'Nib International Bank', 'bg-white border border-slate-200')
    }

    // 12. Zemen Bank
    if (lower.includes('zemen') || lower.includes('ዘመን')) {
        return renderSVGLogo('/logos/zemen_bank.svg', 'Zemen Bank', 'bg-white border border-slate-200')
    }

    // 13. Enat Bank
    if (lower.includes('enat') || lower.includes('እናት')) {
        return renderSVGLogo('/logos/enat.png', 'Enat Bank', 'bg-white border border-slate-200')
    }

    // 14. Oromia Bank
    if (lower.includes('oromia') || lower.includes('oromiyaa') || lower.includes('ኦሮሚያ')) {
        return renderSVGLogo('/logos/oromia.png', 'Oromia Bank', 'bg-white border border-slate-200')
    }

    // 15. Berhan Bank
    if (lower.includes('berhan') || lower.includes('ብርሃን')) {
        return renderSVGLogo('/logos/berhan.png', 'Berhan Bank', 'bg-white border border-slate-200')
    }

    // 16. Bunna Bank
    if (lower.includes('bunna') || lower.includes('ቡና')) {
        return renderSVGLogo('/logos/bunna.png', 'Bunna International Bank', 'bg-white border border-slate-200')
    }

    // 17. Hijra Bank
    if (lower.includes('hijra') || lower.includes('ሂጅራ')) {
        return renderSVGLogo('/logos/hijra.png', 'Hijra Bank', 'bg-white border border-emerald-300')
    }

    // 18. ZamZam Bank
    if (lower.includes('zamzam') || lower.includes('zam zam') || lower.includes('ዘምዘም')) {
        return renderSVGLogo('/logos/zamzam.png', 'ZamZam Bank', 'bg-white border border-teal-300')
    }

    // 19. Amhara Bank
    if (lower.includes('amhara') || lower.includes('አማራ')) {
        return renderSVGLogo('/logos/amhara_bank.svg', 'Amhara Bank', 'bg-white border border-slate-200')
    }

    // 20. Siinqee Bank
    if (lower.includes('siinqee') || lower.includes('sinqee') || lower.includes('siinqe') || lower.includes('sinqe') || lower.includes('ሲንቄ')) {
        return renderSVGLogo('/logos/siinqee.png', 'Siinqee Bank', 'bg-white border border-slate-200')
    }

    // 21. Tsedey Bank
    if (lower.includes('tsedey') || lower.includes('ፀደይ')) {
        return renderSVGLogo('/logos/tsedey.png', 'Tsedey Bank', 'bg-white border border-slate-200')
    }

    // 22. Gadaa Bank
    if (lower.includes('gadaa') || lower.includes('gada') || lower.includes('ገዳ')) {
        return renderSVGLogo('/logos/gadaa.png', 'Gadaa Bank', 'bg-white border border-slate-200')
    }

    // 23. Shabelle Bank
    if (lower.includes('shabelle') || lower.includes('ሸበሌ')) {
        return renderSVGLogo('/logos/shabelle.png', 'Shabelle Bank', 'bg-white border border-slate-200')
    }

    // 24. Rammis Bank
    if (lower.includes('rammis') || lower.includes('ራሚስ')) {
        return renderSVGLogo('/logos/rammis.png', 'Rammis Bank', 'bg-white border border-slate-200')
    }

    // 25. Ahadu Bank
    if (lower.includes('ahadu') || lower.includes('አሃዱ')) {
        return renderSVGLogo('/logos/ahadu.png', 'Ahadu Bank', 'bg-white border border-slate-200')
    }

    // 26. PayPal
    if (lower.includes('paypal')) {
        return renderSVGLogo('/logos/paypal.png', 'PayPal', 'bg-white border border-slate-200')
    }

    // 27. Chapa
    if (lower.includes('chapa')) {
        return renderSVGLogo('/logos/chapa.svg', 'Chapa', 'bg-white border border-slate-200')
    }

    // 28. Physical Cash / Wallet
    if (type === 'cash' || lower.includes('cash') || lower.includes('wallet') || lower.includes('ብር')) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold shadow-md shadow-emerald-500/20 shrink-0 ${dimensions.box} ${className}`}>
                <span className="text-xl">💵</span>
            </div>
        )
    }

    // 29. Savings Account
    if (type === 'savings' || lower.includes('savings')) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-pink-500 to-rose-700 text-white font-bold shadow-md shrink-0 ${dimensions.box} ${className}`}>
                <span className="text-xl">🐷</span>
            </div>
        )
    }

    // 30. Digital / Crypto
    if (type === 'digital' || lower.includes('crypto') || lower.includes('binance') || lower.includes('revolut')) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-cyan-600 via-blue-700 to-purple-800 text-white font-bold shadow-md shrink-0 ${dimensions.box} ${className}`}>
                <span className="text-xl">🌐</span>
            </div>
        )
    }

    // 🌟 DYNAMIC GENERATED BADGE FOR ANY OTHER UNRECOGNIZED CUSTOM NAME
    const hashIndex = getHashIndex(name)
    const palette = DYNAMIC_GRADIENTS[hashIndex]
    const initials = getInitials(name)

    return (
        <div className={`flex items-center justify-center bg-gradient-to-br ${palette.bg} font-black shadow-md shrink-0 border ${dimensions.box} ${className}`}>
            <span className={`font-black tracking-wider ${palette.text}`}>{initials}</span>
        </div>
    )
}
