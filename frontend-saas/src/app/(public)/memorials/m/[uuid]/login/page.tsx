"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Heart,
    Lock,
    ArrowRight,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/public/PublicHeader';
import { HuellasFooter } from '@/components/public/HuellasFooter';
import { getTranslations, type Locale } from '@/lib/translations';

const publicApiRequest = async (path: string, options: any = {}) => {
    const isServer = typeof window === 'undefined';
    const API_URL = !isServer
        ? ''
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error en la petición');
    }
    return res.json();
};

export default function MemorialLoginPage() {
    const params = useParams();
    const router = useRouter();
    const uuid = params.uuid as string;

    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locale, setLocale] = useState<Locale>('es');

    useEffect(() => {
        const saved = localStorage.getItem('preferred_locale') as Locale | null;
        if (saved === 'es' || saved === 'en') setLocale(saved);

        const handleStorage = () => {
            const current = localStorage.getItem('preferred_locale') as Locale | null;
            if (current && current !== locale) setLocale(current);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [locale]);

    const t = getTranslations(locale);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await publicApiRequest(`/api/internal/memorials/${uuid}/login`, {
                method: 'POST',
                body: JSON.stringify({ pin })
            });

            // On success, store PIN/AccessKey for this memorial
            localStorage.setItem(`memorial_pin_${uuid}`, pin);

            // Redirect to management panel
            router.push(`/memorials/m/${uuid}/gestion`);
        } catch (err: any) {
            setError(err.message || t.login_error_invalid);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col pt-20">
            <PublicHeader isDark={true} />

            <main className="flex-grow flex items-center justify-center p-6 bg-gradient-to-b from-[#020617] to-[#0f172a] relative overflow-hidden">
                {/* Background pattern */}
                <div className="fixed inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-blue-500/20" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-[#c5a059]/10 rounded-[2rem] flex items-center justify-center text-[#c5a059] mx-auto mb-6 shadow-2xl shadow-[#c5a059]/20 border border-[#c5a059]/20">
                            <Lock size={40} />
                        </div>
                        <h1 className="text-3xl font-serif text-white mb-2">{t.login_title}</h1>
                        <p className="text-slate-400 text-sm">{t.login_subtitle}</p>
                    </div>

                    <div className="glass-card p-10 rounded-[2.5rem] border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl">
                        <form onSubmit={handleLogin} className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center block">{t.login_pin_label}</label>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    placeholder="····"
                                    maxLength={6}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-4 text-center text-4xl font-mono tracking-[1em] text-white focus:border-[#c5a059] outline-none transition-all placeholder:text-white/5"
                                    required
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-400 text-sm font-medium text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || pin.length < 4}
                                className="w-full bg-[#c5a059] text-white py-5 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#b08d4a] active:scale-95 transition-all shadow-xl shadow-[#c5a059]/10 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                                {loading ? t.login_btn_verifying : t.login_btn_submit}
                            </button>
                        </form>
                    </div>

                    <div className="mt-12 text-center">
                        <button
                            onClick={() => router.back()}
                            className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            {t.login_btn_back}
                        </button>
                    </div>
                </motion.div>
            </main>

            <HuellasFooter locale={locale} t={t} />
        </div>
    );
}
