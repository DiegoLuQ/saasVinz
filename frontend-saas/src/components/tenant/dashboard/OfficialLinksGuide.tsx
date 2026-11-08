'use client';

/**
 * Miniguía al entrar al panel: si faltan enlaces oficiales (formulario, catálogo de
 * planes o de productos), explica qué falta y lleva a Configuración → Enlaces oficiales.
 * Solo administradores; «Más tarde» la oculta durante la sesión del navegador.
 */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Gift, Settings, X, XCircle } from 'lucide-react';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { getOfficialLinks, OFFICIAL_LABELS, type OfficialLinkKey } from '@/lib/tenant/officialLinks';

const DISMISS_KEY = 'vz_official_links_guide_dismissed';
const KEYS: OfficialLinkKey[] = ['form', 'plans', 'products'];

export default function OfficialLinksGuide() {
    const router = useRouter();
    const { data: bootstrap } = useSessionBootstrap();
    const role = bootstrap?.user?.role;
    const isAdmin = role === 'admin' || role === 'creator';
    const { data } = useQuery({ queryKey: ['official-links'], queryFn: getOfficialLinks, enabled: isAdmin, staleTime: 60_000 });
    // Solo cliente (el panel no se prerenderiza con datos: hasta cargar la consulta no se muestra nada)
    const [dismissed, setDismissed] = useState(() => {
        try { return typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
    });

    if (!isAdmin || !data || data.complete || dismissed) return null;

    const close = () => {
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* sin almacenamiento */ }
        setDismissed(true);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="official-guide-title">
            <div className="bg-card text-foreground w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 relative">
                <button onClick={close} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
                    <X size={20} />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
                    <Gift className="text-sky-400" size={22} />
                </div>
                <p id="official-guide-title" className="text-lg font-black">Activa tu tiendita de recuerdos</p>
                <p className="text-sm text-muted-foreground mt-1.5">
                    Cuando una familia termina el formulario, puede ver tus recuerdos y relicarios en la pantalla final,
                    en el correo de confirmación y en el seguimiento. Para eso necesitas elegir tus enlaces oficiales:
                </p>
                <ul className="mt-4 space-y-2">
                    {KEYS.map(k => {
                        const ok = !data.missing.includes(k);
                        return (
                            <li key={k} className="flex items-center gap-2 text-sm">
                                {ok ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-amber-400 shrink-0" />}
                                <span className={ok ? 'text-muted-foreground line-through' : 'font-semibold'}>{OFFICIAL_LABELS[k]}</span>
                            </li>
                        );
                    })}
                </ul>
                <p className="text-[11px] text-muted-foreground mt-3">Mientras falte alguno, las familias no verán la tiendita.</p>
                <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button onClick={close} className="px-5 py-2.5 rounded-2xl text-sm font-bold text-muted-foreground hover:bg-white/5">Más tarde</button>
                    <button
                        onClick={() => { close(); router.push('/dashboard/configuracion?tab=enlaces'); }}
                        className="bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                        <Settings size={16} /> Ir a la configuración
                    </button>
                </div>
            </div>
        </div>
    );
}
