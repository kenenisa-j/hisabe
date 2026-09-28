// components/layout/ShellHeader.tsx
"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { NotificationPopover } from "@/components/notifications/notification-popover";
import { UserGuideModal } from "@/components/guide/user-guide-modal";

interface ShellHeaderProps {
    onMobileMenuOpen: () => void;
}

const routeTitles: Record<string, string> = {
    "/dashboard": "My Financial Overview",
    "/accounts": "My Accounts",
    "/transactions": "My Transactions",
    "/budgets": "My Budgets",
    "/goals": "Savings & Goals",
    "/debts": "Debts & Loans",
    "/reports": "Reports & Analytics",
    "/settings": "Settings",
};

export function ShellHeader({ onMobileMenuOpen }: ShellHeaderProps) {
    const pathname = usePathname();
    const currentTitle = routeTitles[pathname] || "Hisabe Personal";

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur transition-all sm:px-6">
            {/* Left section: Mobile menu button & Title */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onMobileMenuOpen}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
                    aria-label="Open sidebar"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {currentTitle}
                </h1>
            </div>

            {/* Middle section: Global Search */}
            <div className="hidden max-w-md flex-1 md:block md:px-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search transactions, accounts, budgets..."
                        className="w-full rounded-md border border-input bg-muted/40 py-1.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* Right section: Action controls */}
            <div className="flex items-center gap-2.5">
                <UserGuideModal />
                <NotificationPopover />

                {/* User Profile Avatar via Clerk */}
                <div className="flex items-center border-l pl-3">
                    <UserButton
                        appearance={{
                            elements: {
                                avatarBox: "h-9 w-9",
                            }
                        }}
                    />
                </div>
            </div>
        </header>
    );
}