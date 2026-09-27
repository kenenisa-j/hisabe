import {
    Wallet,
    Briefcase,
    Utensils,
    Car,
    Home,
    Zap,
    ShoppingBag,
    Activity,
    ArrowRightLeft,
    Film,
    TrendingUp,
    CircleDollarSign,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    wallet: Wallet,
    briefcase: Briefcase,
    utensils: Utensils,
    car: Car,
    home: Home,
    zap: Zap,
    'shopping-bag': ShoppingBag,
    activity: Activity,
    'arrow-right-left': ArrowRightLeft,
    film: Film,
    'trending-up': TrendingUp,
}

interface CategoryIconProps {
    iconName?: string | null
    className?: string
}

export function CategoryIcon({ iconName, className = 'h-4 w-4' }: CategoryIconProps) {
    const IconComponent = (iconName && iconMap[iconName]) || CircleDollarSign
    return <IconComponent className={className} />
}