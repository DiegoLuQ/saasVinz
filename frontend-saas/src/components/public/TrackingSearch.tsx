"use client";

import React, { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { apiRequest, ApiError } from '@/lib/api';

interface ResolveResponse {
    tenant_slug: string;
    pet_name: string;
    code: string;
}

interface TrackingSearchProps {
    /** Paleta: 'light' (stone/amber) o 'dark' (Vincer #19B5FE). */
    theme?: 'light' | 'dark';
    /** 'stacked' (campo arriba, botón abajo) o 'inline' (lado a lado en sm+). */
    layout?: 'stacked' | 'inline';
    label?: string;
    placeholder?: string;
    buttonLabel?: string;
    autoFocus?: boolean;
    className?: string;
}

/**
 * Campo único de búsqueda de seguimiento por código. Resuelve el código vía
 * /api/public/tracking/resolve y redirige a la página de detalle. Reutilizable
 * en la web dedicada (track.) y en la landing (lvh.me/).
 */
export default function TrackingSearch({
    theme = 'light',
    layout = 'stacked',
    label,
    placeholder = 'Ej: SMROE2STJ4',
    buttonLabel = 'Ver seguimiento',
    autoFocus = false,
    className = '',
}: TrackingSearchProps) {
    const router = useRouter();
    const fieldId = useId();
    const errorId = `${fieldId}-error`;
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = code.trim().toUpperCase().replace(/\s+/g, '');
        if (!clean) {
            setError('Ingresa el código de seguimiento.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await apiRequest<ResolveResponse>(
                `/api/public/tracking/resolve/${encodeURIComponent(clean)}`
            );
            router.push(
                `/${res.tenant_slug}/track/${encodeURIComponent(res.pet_name)}/${res.code}`
            );
        } catch (err) {
            const message = err instanceof ApiError && err.status === 404
                ? 'No encontramos un seguimiento con ese código. Revísalo e inténtalo de nuevo.'
                : 'Ocurrió un error al buscar. Inténtalo nuevamente en unos segundos.';
            setError(message);
            setLoading(false);
        }
    };

    const isDark = theme === 'dark';

    const inputCls = isDark
        ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#19B5FE]/60 focus:ring-[#19B5FE]/20'
        : 'bg-stone-50/80 border-stone-200 text-stone-800 placeholder:text-stone-300 focus:border-amber-400 focus:ring-amber-200/40';

    const iconCls = isDark ? 'text-slate-500' : 'text-stone-300';

    const buttonCls = isDark
        ? 'bg-[#19B5FE] text-[#020210] hover:brightness-110 shadow-lg shadow-[#19B5FE]/20'
        : 'bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:brightness-105 shadow-lg shadow-rose-300/40';

    const errorCls = isDark ? 'text-rose-400' : 'text-rose-600';
    const labelCls = isDark ? 'text-slate-400' : 'text-stone-400';

    const isInline = layout === 'inline';

    return (
        <form onSubmit={handleSubmit} className={className}>
            {label && (
                <label htmlFor={fieldId} className={`block text-[11px] font-semibold uppercase tracking-widest ml-1 mb-2 ${labelCls}`}>
                    {label}
                </label>
            )}
            <div className={isInline ? 'flex flex-col sm:flex-row gap-3' : 'space-y-3'}>
                <div className="relative flex-1">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${iconCls}`} size={18} />
                    <input
                        id={fieldId}
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="characters"
                        autoFocus={autoFocus}
                        value={code}
                        onChange={(e) => { setCode(e.target.value.toUpperCase()); if (error) setError(''); }}
                        placeholder={placeholder}
                        className={`w-full h-14 pl-11 pr-4 rounded-2xl border text-center text-lg font-mono font-bold tracking-[0.25em] placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-4 transition-all ${inputCls}`}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className={`h-14 px-6 rounded-2xl font-bold tracking-wide active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${isInline ? 'sm:w-auto w-full whitespace-nowrap' : 'w-full'} ${buttonCls}`}
                >
                    {loading ? (
                        <><Loader2 size={20} className="animate-spin" /> Buscando…</>
                    ) : (
                        <>{buttonLabel} <ArrowRight size={18} /></>
                    )}
                </button>
            </div>

            {error && (
                <motion.div
                    id={errorId}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2 text-sm mt-3 px-1 ${errorCls}`}
                    role="alert"
                >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </motion.div>
            )}
        </form>
    );
}
