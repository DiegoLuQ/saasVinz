"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import { getToken, clearToken } from '@/lib/auth/token';
import { useAdminSSE } from '@/hooks/useAdminSSE';

function SSEMount() {
    useAdminSSE();
    return null;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (!getToken()) {
            router.push('/iniciar-sesion-creador');
        } else {
            setAuthorized(true);
        }

        // Load preference from localStorage
        const savedState = localStorage.getItem('sidebar_collapsed');
        if (savedState === 'true') setIsCollapsed(true);
    }, [router]);

    const handleToggleCollapse = (value: boolean) => {
        setIsCollapsed(value);
        localStorage.setItem('sidebar_collapsed', value.toString());
    };

    const handleLogout = () => {
        clearToken();
        router.push('/iniciar-sesion-creador');
    };

    if (!authorized) {
        return (
            <div className="min-h-screen bg-[#0a192f] text-white flex items-center justify-center flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-primary rounded-full animate-bounce" />
                    <div className="w-4 h-4 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-4 h-4 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <div className="text-white/40 font-medium">Verificando sesión...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#061121] flex text-white/90">
            <SSEMount />
            <Sidebar
                onLogout={handleLogout}
                isCollapsed={isCollapsed}
                setIsCollapsed={handleToggleCollapse}
            />
            <div
                className={`flex-1 transition-[margin] duration-500 ease-in-out ${isCollapsed ? 'ml-[80px]' : 'ml-[288px]'} overflow-x-hidden`}
            >
                {children}
            </div>
        </div>
    );
}
