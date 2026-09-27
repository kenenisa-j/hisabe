// config/nav.ts
import {
    LayoutDashboard,
    Wallet,
    Receipt,
    PieChart,
    Target,
    CreditCard,
    BarChart3,
    Settings
} from "lucide-react";

export interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
}

export const navigationConfig: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Accounts", href: "/accounts", icon: Wallet },
    { title: "Transactions", href: "/transactions", icon: Receipt },
    { title: "Budgets", href: "/budgets", icon: PieChart },
    { title: "Goals", href: "/goals", icon: Target },
    { title: "Debts & Loans", href: "/debts", icon: CreditCard },
    { title: "Reports", href: "/reports", icon: BarChart3 },
    { title: "Settings", href: "/settings", icon: Settings },
];