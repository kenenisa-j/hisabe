// app/(dashboard)/layout.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShellHeader } from "@/components/layout/ShellHeader";
import { MobileNavbar } from "@/components/layout/MobileNavbar";
import { UserSettingsProvider, useUserSettings } from "@/providers/user-settings-provider";

function DashboardContent({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { settings } = useUserSettings();

    const widthClass =
        settings.content_width === 'wide'
            ? 'max-w-none px-4 sm:px-6'
            : settings.content_width === 'full'
            ? 'max-w-full px-2 sm:px-4'
            : 'max-w-7xl mx-auto';

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Drawer */}
            <MobileNavbar
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-x-hidden">
                <ShellHeader onMobileMenuOpen={() => setMobileMenuOpen(true)} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <div className={widthClass}>{children}</div>
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UserSettingsProvider>
            <DashboardContent>{children}</DashboardContent>
        </UserSettingsProvider>
    );
}