'use client';

/**
 * Configuración → «Reseñas en Google». La invitación a opinar en Google sale aparte del
 * aviso de fase final: 1 o 2 días después de entregar, a las 18:00 hora del crematorio
 * (cuando la familia ya tiene la urna, las cenizas y el certificado).
 * API GET/PUT /api/internal/operations/review-config; lógica backend/app/services/google_review.py.
 * Característica del plan `configuracion:resena_google` (la decide el SuperAdmin).
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, Mail, Save, Star, Truck } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface ReviewConfig {
    enabled: boolean;
    delay_days: number;
    available: boolean;
    has_link: boolean;
    send_hour: number;
    delays: number[];
}

const QUERY_KEY = ['review-config'];

export function GoogleReviewTab() {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<ReviewConfig>({
        queryKey: QUERY_KEY,
        queryFn: () => apiRequest('/api/internal/operations/review-config'),
    });
    const [enabled, setEnabled] = useState(false);
    const [delay, setDelay] = useState(1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!data) return;
        setEnabled(data.enabled);
        setDelay(data.delay_days);
    }, [data]);

    if (isLoading || !data) {
        return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Cargando…</div>;
    }
    if (!data.available) {
        return (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.06] p-5 text-sm">
                <p className="font-bold">Reseñas en Google no está incluido en tu plan.</p>
                <p className="text-muted-foreground mt-1">Revisa los planes en Configuración → Facturación.</p>
            </div>
        );
    }

    const dirty = enabled !== data.enabled || delay !== data.delay_days;
    const hour = `${String(data.send_hour).padStart(2, '0')}:00`;

    const save = async () => {
        setSaving(true);
        try {
            const r = await apiRequest('/api/internal/operations/review-config', { method: 'PUT', body: { enabled, delay_days: delay } });
            qc.setQueryData(QUERY_KEY, r);
            showToast(enabled ? 'Invitación a reseñas activada' : 'Invitación a reseñas desactivada', 'success');
        } catch (e) {
            showToast(e instanceof Error && e.message ? e.message : 'No se pudo guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-black">Reseñas en Google</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    Invita a la familia a opinar en tu ficha de Google cuando ya tiene en sus manos la urna, las cenizas y el certificado:
                    no el mismo día en que finalizas la orden, sino uno o dos días después.
                </p>
            </div>

            {!data.has_link && (
                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.06] p-5 flex items-start gap-3 text-sm">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                    <div>
                        <p className="font-bold">Falta tu enlace de reseñas de Google</p>
                        <p className="text-muted-foreground mt-1">
                            Agrégalo en <Link href="/dashboard/perfil" className="text-primary font-semibold hover:underline">Perfil → Redes y reseñas</Link>.
                            Sin él la invitación no se envía.
                        </p>
                    </div>
                </div>
            )}

            {/* Cómo funciona: los dos correos */}
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-5">
                    <p className="flex items-center gap-2 text-sm font-bold"><Truck size={16} className="text-sky-500" /> 1 · Al finalizar la orden</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                        Aviso de fase final: «llegamos a la fase final y estamos preparando la entrega de sus cenizas». Sin reseña.
                        Se activa en Flujo Operativo.
                    </p>
                </div>
                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
                    <p className="flex items-center gap-2 text-sm font-bold"><Star size={16} className="text-amber-500" /> 2 · Días después: reseña en Google</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                        Correo con el botón «Dejar mi opinión en Google». Sale a las {hour} (hora del crematorio). En la orden verás el badge «Google ✓».
                    </p>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-5 space-y-5">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <span>
                        <span className="block text-sm font-bold">Enviar la invitación a reseñas</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">Solo a órdenes entregadas desde que la activas, con correo del cliente.</span>
                    </span>
                    <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-5 h-5 accent-sky-500 shrink-0" />
                </label>

                <div className={enabled ? '' : 'opacity-50 pointer-events-none'}>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><CalendarClock size={13} /> Cuándo se envía</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.delays.map(d => {
                            const on = delay === d;
                            return (
                                <button key={d} type="button" onClick={() => setDelay(d)} aria-pressed={on}
                                    className={`text-left rounded-2xl border-2 p-4 transition-colors cursor-pointer ${on
                                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10'
                                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}>
                                    <p className="text-sm font-black">{d === 1 ? '1 día después' : `${d} días después`}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Ej.: entregada el lunes → sale el {d === 1 ? 'martes' : 'miércoles'} a las {hour}.
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-px" /> Se envía una sola vez por orden.</li>
                    <li className="flex items-start gap-1.5"><CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-px" /> Si la orden se cancela o se reabre antes, no se envía.</li>
                    <li className="flex items-start gap-1.5"><Mail size={13} className="text-sky-500 shrink-0 mt-px" /> Desde la orden puedes adelantarla con «Enviar ahora».</li>
                </ul>

                <div className="flex items-center justify-end gap-3">
                    {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Hay cambios sin guardar</span>}
                    <button type="button" onClick={save} disabled={saving || !dirty}
                        className="flex items-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
