"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Heart,
    Lock,
    ArrowRight,
    Loader2,
    ShieldCheck,
    Eye,
    EyeOff,
    HelpCircle
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { VinzerLogo } from '@/components/vinzer/VinzerLogo';
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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error en la petición');
    }
    return res.json();
};

export default function MemorialLoginPage() {
    const params = useParams();
    const router = useRouter();
    const uuid = params.uuid as string;

    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
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

    const submitLoginWithPin = useCallback(async (pinToUse: string) => {
        const trimmed = pinToUse.trim();
        if (!trimmed || trimmed.length < 4) return;
        setLoading(true);
        setError(null);

        try {
            await publicApiRequest(`/api/internal/memorials/${uuid}/login`, {
                method: 'POST',
                body: JSON.stringify({ pin: trimmed })
            });

            // On success, store PIN/AccessKey for this memorial
            localStorage.setItem(`memorial_pin_${uuid}`, trimmed);

            // Redirect to management panel
            router.push(`/memorials/m/${uuid}/gestion`);
        } catch (err: any) {
            setError(err.message || t.login_error_invalid);
        } finally {
            setLoading(false);
        }
    }, [uuid, router, t.login_error_invalid]);

    // Check if PIN was passed via query parameter (e.g. from crematory dashboard)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const pinParam = params.get('pin');
            if (pinParam && pinParam.trim()) {
                const cleaned = pinParam.trim();
                setPin(cleaned);
                submitLoginWithPin(cleaned);
            }
        }
    }, [submitLoginWithPin]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        submitLoginWithPin(pin);
    };

    return (
        <div className="min-h-screen bg-[#020210] flex flex-col">
            {/* Header mínimo Vinzer */}
            <header className="flex justify-center pt-8 pb-2">
                <VinzerLogo size="sm" />
            </header>

            <main className="flex-grow flex items-center justify-center p-6 bg-gradient-to-b from-[#020210] to-[#0a1a2f] relative overflow-hidden">
                {/* Resplandor celeste de fondo */}
                <div className="fixed inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-[#19B5FE]/25" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-[#19B5FE]/10 rounded-[2rem] flex items-center justify-center text-[#19B5FE] mx-auto mb-5 shadow-2xl shadow-[#19B5FE]/20 border border-[#19B5FE]/20">
                            <Lock size={38} />
                        </div>
                        <h1 className="text-3xl font-serif text-white mb-2">{t.login_title}</h1>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                            {t.login_subtitle}
                        </p>
                    </div>

                    <div className="glass-card p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        {t.login_pin_label} (6 dígitos)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(!showPin)}
                                        className="text-xs text-slate-400 hover:text-[#19B5FE] flex items-center gap-1 transition-colors"
                                    >
                                        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                        <span className="text-[11px] font-medium">{showPin ? "Ocultar" : "Ver PIN"}</span>
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        type={showPin ? "text" : "password"}
                                        value={pin}
                                        onChange={e => setPin(e.target.value.trim())}
                                        placeholder="······"
                                        maxLength={6}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-4 text-center text-3xl font-mono tracking-[0.6em] text-white focus:border-[#19B5FE] outline-none transition-all placeholder:text-white/10 shadow-inner"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 text-center">
                                    PIN numérico de 6 dígitos asignado por el crematorio.
                                </p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-xl bg-red-400/10 border border-red-400/20 text-center space-y-1"
                                >
                                    <p className="text-red-400 text-sm font-semibold">
                                        {error}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Puedes consultar o copiar el PIN desde el panel de mascotas del crematorio o en el WhatsApp recibido.
                                    </p>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || pin.trim().length < 4}
                                className="w-full bg-[#19B5FE] text-[#020210] py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#0e9ce0] active:scale-95 transition-all shadow-xl shadow-[#19B5FE]/20 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                                {loading ? t.login_btn_verifying : t.login_btn_submit}
                            </button>
                        </form>
                    </div>

                    <div className="mt-8 text-center">
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
