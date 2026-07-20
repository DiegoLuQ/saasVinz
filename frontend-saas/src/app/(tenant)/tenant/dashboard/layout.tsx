"use client";

import React from 'react';
import Sidebar from '@/components/tenant/Sidebar';
import Navbar from '@/components/tenant/Navbar';
import StatusGuard from '@/components/tenant/StatusGuard';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { SubscriptionWarningModal } from '@/components/tenant/SubscriptionWarningModal';
import { SubscriptionAlertBanner } from '@/components/tenant/SubscriptionAlertBanner';
import { DemoBanner } from '@/components/tenant/DemoBanner';
import { hasSession } from '@/lib/auth/token';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <div
                className={`transition-[margin] duration-300 min-h-screen flex flex-col ${collapsed ? 'lg:ml-[80px]' : 'lg:ml-[260px]'
                    }`}
            >
                <Navbar />
                <SubscriptionAlertBanner />
                <DemoBanner />
                <main className="flex-1 p-4 sm:p-6 lg:p-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {children}
                    </motion.div>
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
    const router = useRouter();
    const [authorized, setAuthorized] = React.useState(false);

    React.useEffect(() => {
        if (!hasSession()) {
            router.push('/login');
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <SidebarProvider>
            <StatusGuard>
                <DashboardContent>
                    {children}
                </DashboardContent>
            </StatusGuard>
            <SubscriptionWarningModal />
        </SidebarProvider>
    );
}
