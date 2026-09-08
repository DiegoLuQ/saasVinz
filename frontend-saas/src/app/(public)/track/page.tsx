"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PawPrint, ShieldCheck, Loader2 } from 'lucide-react';
import TrackingSearch from '@/components/public/TrackingSearch';
import { apiRequest } from '@/lib/api';

function TrackHomeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const codeParam = searchParams.get('code');
    const [resolving, setResolving] = useState(!!codeParam);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!codeParam) return;
        const clean = codeParam.trim().toUpperCase();

        const autoResolve = async () => {
            try {
                const apiBase = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
                const response = await fetch(`${apiBase}/api/public/tracking/resolve/${encodeURIComponent(clean)}`);
                if (!response.ok) {
                    throw new Error('NotFound');
                }
                const res = await response.json();
                if (res?.tenant_slug && res?.code) {
                    window.location.href = `/${res.tenant_slug}/track/${encodeURIComponent(res.pet_name || 'mascota')}/${res.code}`;
                } else {
                    throw new Error('InvalidResponse');
                }
            } catch (err) {
                console.error('Error resolviendo código vía URL:', err);
                setErrorMsg('No encontramos un seguimiento con ese código. Por favor verifica e intentalo de nuevo.');
                setResolving(false);
            }
        };

        autoResolve();
    }, [codeParam, router]);

    if (resolving) {
        return (
            <main className="relative min-h-[100dvh] flex flex-col items-center justify-center p-5 bg-gradient-to-b from-stone-50 via-white to-amber-50/50 text-stone-800 text-center">
                <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
                <h2 className="text-lg font-bold">Buscando seguimiento {codeParam}...</h2>
                <p className="text-xs text-stone-500 mt-1">Cargando la información en tiempo real</p>
            </main>
        );
    }

    return (
        <main className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-10 overflow-hidden bg-gradient-to-b from-stone-50 via-white to-amber-50/50 text-stone-800">
            {/* Resplandores de fondo suaves */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-20 w-[22rem] h-[22rem] rounded-full bg-amber-200/30 blur-[120px]" />
                <div className="absolute -bottom-24 -right-16 w-[24rem] h-[24rem] rounded-full bg-rose-200/25 blur-[130px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative w-full max-w-md"
            >
                {/* Marca / encabezado */}
                <div className="flex flex-col items-center text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-amber-400 to-rose-400 text-white shadow-lg shadow-amber-300/40"
                    >
                        <PawPrint size={30} strokeWidth={2.2} />
                    </motion.div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-800">
                        Seguimiento de tu mascota
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-stone-500 leading-relaxed max-w-xs">
                        Ingresa el código que te entregó el crematorio para ver el estado del servicio en tiempo real.
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold text-center">
                        {errorMsg}
                    </div>
                )}

                {/* Tarjeta con el campo */}
                <TrackingSearch
                    theme="light"
                    autoFocus
                    label="Código de seguimiento"
                    className="bg-white/80 backdrop-blur-xl border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-xl shadow-stone-300/30"
                />

                {/* Nota de confianza */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-stone-400">
                    <ShieldCheck size={14} className="text-stone-400" />
                    <span>Seguimiento privado y seguro · Sin necesidad de registrarte</span>
                </div>
            </motion.div>
        </main>
    );
}

export default function TrackHomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        }>
            <TrackHomeContent />
        </Suspense>
    );
}
