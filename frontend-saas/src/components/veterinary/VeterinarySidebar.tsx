"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    User,
    Bell,
    LogOut,
    Menu,
    X,
    Stethoscope,
    Settings,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists, otherwise I'll remove it or use simple template literals

export default function VeterinarySidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);



    const handleLogout = () => {
        localStorage.removeItem('vet_token');
        document.cookie = 'vet_token=; path=/; max-age=0;';
        router.push('/login');
    };

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Mi Perfil', href: '/profile', icon: User },
        { label: 'Notificaciones', href: '/dashboard/notifications', icon: Bell },
        // { label: 'Configuración', href: '/settings', icon: Settings },
    ];

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile Header trigger */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-[#020617]">
                        <Stethoscope size={18} />
                    </div>
                    <span className="font-bold text-white text-sm">Portal<span className="text-emerald-500">Veterinario</span></span>
                </div>
                <button onClick={toggleSidebar} className="text-white/70 hover:text-white">
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Overlay for mobile */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                className={`fixed top-0 left-0 h-full w-72 bg-[var(--card-color)] border-r border-[var(--card-border-color)] z-50 transform md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Logo Area */}
                <div className="p-8 pb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-[var(--primary-color)] rounded-xl flex items-center justify-center text-[var(--primary-foreground)] shadow-[0_0_15px_rgba(var(--primary-color),0.3)]">
                            <Stethoscope size={22} />
                        </div>
                        <div>
                            <h2 className="font-black text-[var(--foreground-color)] text-lg tracking-tight uppercase italic leading-none">Portal</h2>
                            <h2 className="font-black text-[var(--primary-color)] text-lg tracking-tight uppercase italic leading-none">Veterinario</h2>
                        </div>
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.2em] font-medium ml-1 mt-2">Panel de Socio</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200
                                    ${isActive
                                        ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]'
                                        : 'text-[var(--muted-foreground)] hover:bg-[var(--muted-color)] hover:text-[var(--foreground-color)]'
                                    }
                                `}
                            >
                                <item.icon size={20} className={isActive ? 'text-[var(--primary-color)]' : 'group-hover:text-[var(--foreground-color)] transition-colors'} />
                                <span className={`text-sm font-bold tracking-wide ${isActive ? 'text-[var(--primary-color)]' : ''}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav"
                                        className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--primary-color)]"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / User / Logout */}
                <div className="p-4 border-t border-[var(--card-border-color)] bg-[var(--muted-color)]/20">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[var(--muted-color)] text-red-500/80 font-bold text-xs uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                    >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>

                    <p className="text-center text-[9px] text-[var(--muted-foreground)] mt-4 font-mono opacity-50">
                        v2.4.0 • Vincer
                    </p>
                </div>
            </motion.aside>
        </>
    );
}
