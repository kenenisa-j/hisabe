// components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig } from "@/config/nav";
import { HisabeWordmark } from "@/components/layout/HisabeLogo";

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden h-screen sticky top-0 w-64 flex-col border-r bg-card md:flex shrink-0">
            {/* Brand Logo Header */}
            <div className="flex h-16 items-center border-b px-6 shrink-0">
                <Link href="/dashboard">
                    <HisabeWordmark />
                </Link>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navigationConfig.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4" />
                                <span>{item.title}</span>
                            </div>
                            {item.badge && (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isActive
                                            ? "bg-primary-foreground/20 text-primary-foreground"
                                            : "bg-secondary text-secondary-foreground"
                                        }`}
                                >
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Status Area */}
            <div className="border-t p-4 text-xs text-muted-foreground shrink-0 mt-auto">
                <p className="font-semibold text-foreground">Hisabe <span className="text-amber-400">ሂሳብ</span></p>
                <p>Your Ethiopian Finance OS</p>
            </div>
        </aside>
    );
}