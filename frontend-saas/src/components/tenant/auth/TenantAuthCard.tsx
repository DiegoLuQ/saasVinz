"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { usePlatformInfo } from '@/lib/platformInfo';

// Mismo estilo que el formulario del login del panel (app.<dominio>/login).
export const authInputCls = 'w-full bg-white border border-slate-300 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium';
export const authButtonCls = 'w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50';

/** Tarjeta centrada para las páginas sin sesión del panel (recuperar contraseña). */
export default function TenantAuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    const platform = usePlatformInfo();
    return (
        <main className="relative min-h-screen flex items-center justify-center p-6 sm:p-10 overflow-hidden bg-background">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="flex items-center gap-2.5 mb-6">
                        <img src="/logo-vinzer.webp" alt="" className="h-9 w-auto object-contain" />
                        <span className="text-xl font-black tracking-tight text-foreground">{platform.name}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{title}</h1>
                    <p className="text-muted-foreground mt-1.5 text-sm font-medium">{subtitle}</p>
                </div>
                {children}
            </motion.div>
        </main>
    );
}
