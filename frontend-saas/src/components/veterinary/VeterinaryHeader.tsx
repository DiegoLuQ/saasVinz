"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Menu, User, Palette, Check } from 'lucide-react';
import { useVetTheme, VeterinaryTheme } from '@/app/(veterinary)/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '@/components/shared/NotificationBell';

export default function VeterinaryHeader() {
    const pathname = usePathname();
    const { activeTheme, setTheme } = useVetTheme();
    const [isThemeOpen, setIsThemeOpen] = useState(false);

    // Map routes to titles
    const getPageTitle = () => {
        if (pathname.includes('/dashboard')) return 'Dashboard';
        if (pathname.includes('/profile')) return 'Mi Perfil';
        if (pathname.includes('/notifications')) return 'Notificaciones';
        return 'Portal Veterinario';
    };

    const themes: { id: VeterinaryTheme; label: string; color: string }[] = [
        { id: 'esmeralda', label: 'Esmeralda', color: '#10b981' },
        { id: 'oceano', label: 'Océano', color: '#0ea5e9' },
        { id: 'atardecer', label: 'Atardecer', color: '#f97316' },
        { id: 'oro', label: 'Oro', color: '#eab308' },
        { id: 'monocromo', label: 'Monocromo', color: '#ffffff' },
    ];

    return (
        <header className="sticky top-0 z-20 bg-[var(--background-color)]/80 backdrop-blur-xl border-b border-[var(--card-border-color)] px-6 py-4 flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-[var(--foreground-color)] tracking-tight uppercase italic hidden md:block">
                    {getPageTitle()}
                </h2>
                {/* Mobile Title */}
                <span className="md:hidden font-bold text-[var(--primary-color)] text-sm uppercase tracking-wider">
                    {getPageTitle()}
                </span>
            </div>

            <div className="flex items-center gap-3">

                {/* Theme Switcher */}
                <div className="relative">
                    <button
                        onClick={() => setIsThemeOpen(!isThemeOpen)}
                        className="p-2.5 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted-color)] transition-colors relative group"
                        title="Cambiar Tema"
                    >
                        <Palette size={20} />
                        <span className="absolute top-2.5 right-2 w-2 h-2 rounded-full bg-[var(--primary-color)] block" />
                    </button>

                    <AnimatePresence>
                        {isThemeOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setIsThemeOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-[var(--card-color)] border border-[var(--card-border-color)] rounded-2xl shadow-xl z-40 overflow-hidden py-2"
                                >
                                    <p className="px-4 py-2 text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-widest">
                                        Selecciona un Tema
                                    </p>
                                    {themes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => {
                                                setTheme(theme.id);
                                                setIsThemeOpen(false);
                                            }}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--muted-color)] transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                                                    style={{ backgroundColor: theme.color }}
                                                />
                                                <span className={`text-sm font-medium ${activeTheme === theme.id ? 'text-[var(--foreground-color)]' : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground-color)]'}`}>
                                                    {theme.label}
                                                </span>
                                            </div>
                                            {activeTheme === theme.id && <Check size={14} className="text-[var(--primary-color)]" />}
                                        </button>
                                    ))}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Not notifications */}
                <NotificationBell apiBaseUrl="/api/veterinary/notifications" />

                <div className="w-9 h-9 rounded-full bg-[var(--muted-color)] flex items-center justify-center text-[var(--primary-color)] border border-[var(--card-border-color)] shadow-sm">
                    <User size={16} />
                </div>
            </div>
        </header>
    );
}
