"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/api';

/**
 * Enlace de derivación de una veterinaria aliada: /registro/{slug_publico}.
 *
 * Resuelve el vínculo y lleva a la familia al formulario principal del
 * crematorio con ?partner= (mismo diseño, 5 pasos, borrador guardado y fotos
 * persistidas). Antes esta ruta tenía una copia propia y desactualizada del
 * formulario cuyo botón "Siguiente" nunca avanzaba (validaba campos que el
 * componente ya no mostraba).
 */
export default function PartnerRegistroPage() {
    const params = useParams();
    const router = useRouter();
    const partnerSlug = params.slug as string;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!partnerSlug) return;
        let cancelled = false;
        // Limpieza del borrador del formulario antiguo (formato incompatible).
        try { localStorage.removeItem(`vinzer_reg_cache_${partnerSlug}`); } catch { /* noop */ }

        apiRequest<{ slug_publico: string; tenant?: { slug: string } }>(
            `/api/public/partners/link/${encodeURIComponent(partnerSlug)}`
        )
            .then((data) => {
                if (cancelled) return;
                if (!data?.tenant?.slug) throw new Error('Información de empresa incompleta');
                router.replace(`/${data.tenant.slug}/form?partner=${encodeURIComponent(data.slug_publico)}`);
            })
            .catch(() => {
                if (!cancelled) setError('Este enlace no es válido o el convenio de la veterinaria no está activo.');
            });
        return () => { cancelled = true; };
    }, [partnerSlug, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
            {error ? (
                <>
                    <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-black uppercase italic tracking-tight mb-2">Enlace no disponible</h1>
                    <p className="text-sm text-slate-500 max-w-md">{error}</p>
                </>
            ) : (
                <>
                    <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando formulario...</p>
                </>
            )}
        </div>
    );
}
