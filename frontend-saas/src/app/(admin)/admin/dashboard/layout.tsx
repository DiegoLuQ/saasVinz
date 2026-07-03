"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Shield } from 'lucide-react';
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
    const [isMobileOpen, setIsMobileOpen] = useState(false);

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
                isMobileOpen={isMobileOpen}
                onMobileClose={() => setIsMobileOpen(false)}
            />
            {/* En <lg el sidebar es un drawer: el contenido ocupa todo el ancho */}
            <div
                className={`flex-1 transition-[margin] duration-500 ease-in-out ml-0 ${isCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[288px]'} overflow-x-hidden`}
            >
                {/* Barra superior móvil con hamburguesa para abrir el drawer */}
                <div className="lg:hidden sticky top-0 z-10 h-14 flex items-center gap-3 px-4 bg-[#061121]/90 backdrop-blur border-b border-white/10">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white active:scale-95 transition-all"
                        aria-label="Abrir menú"
                    >
                        <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
                        <Shield size={14} className="text-primary" /> Creator Portal
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
