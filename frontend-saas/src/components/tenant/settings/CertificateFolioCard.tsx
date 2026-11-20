"use client";

/**
 * «Folio de certificados» (Configuración → Certificados): próximo número correlativo
 * del crematorio para el campo «Folio» de los diseños. Uno por crematorio, nunca se
 * reinicia; al emitir se usa y sube de a uno (volver a emitir una orden mantiene el suyo).
 * API GET/PUT /api/internal/ops-records/folio (backend services/cert_folio.py).
 */
import React, { useEffect, useState } from 'react';
import { Hash, Loader2, Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface FolioInfo { next: number; last: string | null; last_at: string | null }

export function CertificateFolioCard() {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<FolioInfo>({
        queryKey: ['certificate-folio'],
        queryFn: () => apiRequest('/api/internal/ops-records/folio'),
    });
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (data) setValue(String(data.next));
    }, [data]);

    const n = parseInt(value, 10);
    const valid = Number.isFinite(n) && n >= 1 && n <= 99_999_999;
    const dirty = !!data && valid && n !== data.next;

    const save = async () => {
        if (!valid) return;
        setSaving(true);
        try {
            await apiRequest('/api/internal/ops-records/folio', { method: 'PUT', body: { next: n } });
            await qc.invalidateQueries({ queryKey: ['certificate-folio'] });
            showToast(`El próximo certificado llevará el folio ${n}`, 'success');
        } catch (err: unknown) {
            showToast(err instanceof Error && err.message ? err.message : 'No se pudo guardar el folio', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Hash size={20} /></div>
                <div>
                    <h4 className="text-base font-bold">Folio de certificados</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        Si tu diseño de certificado tiene el campo «Folio», cada certificado nuevo toma este número y el siguiente sube de a uno. No se reinicia. Volver a emitir el certificado de una orden mantiene su folio.
                    </p>
                </div>
            </div>
            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> Cargando…</div>
            ) : (
                <div className="flex flex-wrap items-end gap-3">
                    <label className="space-y-1.5">
                        <span className="block text-xs font-bold text-muted-foreground">Próximo folio</span>
                        <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            className="w-40 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2.5 text-lg font-black tabular-nums outline-none focus:border-primary" />
                    </label>
                    <button type="button" onClick={save} disabled={!dirty || saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar folio
                    </button>
                    {data?.last && (
                        <p className="text-xs text-muted-foreground pb-2">
                            Último emitido: <span className="font-mono font-bold text-foreground">{data.last}</span>
                            {data.last_at ? ` · ${new Date(data.last_at).toLocaleDateString('es-CL')}` : ''}
                        </p>
                    )}
                </div>
            )}
            {!valid && value !== '' && <p className="text-xs text-red-500">Debe ser un número desde 1.</p>}
        </div>
    );
}
