// components/layout/HisabeLogo.tsx

interface HisabeLogoProps {
    size?: number
    className?: string
}

/**
 * Ethiopian-themed Hisabe logo mark.
 * Uses Ethiopian flag tricolors (green, gold, red) with a financial growth chart motif,
 * a golden star, and a stylized ሂ glyph built from rectangles (not SVG text).
 */
export function HisabeLogoMark({ size = 36, className }: HisabeLogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className={className}
            aria-label="Hisabe ሂሳብ logo"
        >
            <defs>
                <linearGradient id="hbBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0F172A" />
                    <stop offset="100%" stopColor="#1E3A2F" />
                </linearGradient>
                <linearGradient id="hbGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="100%" stopColor="#CA8A04" />
                </linearGradient>
                <filter id="hbGlow">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Background rounded square */}
            <rect width="100" height="100" rx="22" fill="url(#hbBg)" />
            <rect width="100" height="100" rx="22" fill="none" stroke="url(#hbGold)" strokeWidth="2.5" />

            {/* Ethiopian tricolor bars — growth chart */}
            <rect x="8"  y="65" width="16" height="28" rx="4" fill="#10B981" />
            <rect x="28" y="50" width="16" height="43" rx="4" fill="#F59E0B" />
            <rect x="48" y="58" width="16" height="35" rx="4" fill="#EF4444" />

            {/* Upward trend line in gold */}
            <path
                d="M 8 62 Q 38 38 90 10"
                fill="none"
                stroke="url(#hbGold)"
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#hbGlow)"
            />
            {/* Arrow head */}
            <path
                d="M 76 7 L 92 10 L 89 26"
                fill="none"
                stroke="url(#hbGold)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Stylized ሂ glyph built from solid rectangles (avoids SVG font issues) */}
            {/* Left vertical pillar */}
            <rect x="67" y="40" width="8" height="52" rx="4" fill="url(#hbGold)" />
            {/* Right vertical pillar */}
            <rect x="85" y="40" width="8" height="52" rx="4" fill="url(#hbGold)" />
            {/* Top crossbar */}
            <rect x="67" y="40" width="26" height="8" rx="4" fill="url(#hbGold)" />
            {/* Middle crossbar */}
            <rect x="67" y="58" width="26" height="8" rx="4" fill="url(#hbGold)" />

            {/* Ethiopian star at top-center */}
            <polygon
                points="50,6 53,15 62,15 55,21 58,30 50,24 42,30 45,21 38,15 47,15"
                fill="url(#hbGold)"
                filter="url(#hbGlow)"
            />
        </svg>
    )
}

/**
 * Full branded lockup: logo mark + text wordmark.
 * HTML text renders Ge'ez (ሂሳብ) correctly using the browser's Unicode font.
 */
export function HisabeWordmark() {
    return (
        <span className="flex items-center gap-2.5 select-none">
            <HisabeLogoMark size={36} />
            <span className="flex flex-col leading-none">
                <span className="text-[15px] font-bold tracking-tight text-foreground">
                    Hisabe{' '}
                    <span className="text-amber-400 font-semibold">ሂሳብ</span>
                </span>
                <span className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase mt-0.5">
                    Ethiopian Finance
                </span>
            </span>
        </span>
    )
}
