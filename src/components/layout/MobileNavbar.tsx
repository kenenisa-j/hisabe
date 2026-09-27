// components/layout/MobileNavbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig } from "@/config/nav";
import { X } from "lucide-react";
import { HisabeWordmark } from "@/components/layout/HisabeLogo";

interface MobileNavbarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileNavbar({ isOpen, onClose }: MobileNavbarProps) {
    const pathname = usePathname();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer content */}
            <div className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-card p-6 shadow-lg transition-transform">
                <div className="flex items-center justify-between border-b pb-4">
                    <Link href="/dashboard" onClick={onClose}>
                        <HisabeWordmark />
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="mt-6 space-y-1">
                    {navigationConfig.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5" />
                                    <span>{item.title}</span>
                                </div>
                                {item.badge && (
                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}