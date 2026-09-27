// app/(dashboard)/layout.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShellHeader } from "@/components/layout/ShellHeader";
import { MobileNavbar } from "@/components/layout/MobileNavbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                    <div className="mx-auto max-w-7xl">{children}</div>
                </main>
            </div>
        </div>
    );
}