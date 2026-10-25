"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, MessageCircle, Check } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { formatChileDate, formatChileTime } from '@/lib/dates';

interface Notice { id: number; kind: 'step' | 'finish'; channel: 'email' | 'whatsapp'; sent_to?: string | null; step_name?: string | null; created_at: string }
interface NoticesData { enabled: boolean; email?: string | null; phone?: string | null; notices: Notice[] }

/**
 * «Avisar a la familia» de una orden: WhatsApp (abre el chat con el mensaje y el
 * link de seguimiento, sin API de Meta) y correo (reenvío manual), más el
 * historial de avisos. Los correos automáticos salen al entrar a las fases con
 * «Avisar a la familia» (Configuración → Flujo). Ver services/family_notices.py.
 */
export default function FamilyNoticesBox({ orderId, stepId, finished, compact = false }: {
    orderId: number; stepId?: number | null; finished: boolean; compact?: boolean;
}) {
    const qc = useQueryClient();
    const key = ['family-notices', orderId];
    const { data } = useQuery<NoticesData>({ queryKey: key, queryFn: () => apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices`) });
    const [busy, setBusy] = useState<'whatsapp' | 'email' | null>(null);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    if (!data?.enabled) return null;
    const body = finished || !stepId ? {} : { step_id: stepId };

    const whatsapp = async () => {
        // La pestaña se abre antes del await: si no, el navegador la bloquea como ventana emergente.
        const win = window.open('', '_blank');
        setBusy('whatsapp'); setMsg(null);
        try {
            const r = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices/whatsapp`, { method: 'POST', body });
            if (win) win.location.href = r.url; else window.location.href = r.url;
            qc.invalidateQueries({ queryKey: key });
        } catch (e: unknown) {
            win?.close();
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo armar el mensaje' });
        } finally { setBusy(null); }
    };

    const email = async () => {
        setBusy('email'); setMsg(null);
        try {
            const r = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices/email`, { method: 'POST', body });
            setMsg({ ok: true, text: `Correo enviado a ${r.to}` });
            qc.invalidateQueries({ queryKey: key });
        } catch (e: unknown) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo enviar el correo' });
        } finally { setBusy(null); }
    };

    const btn = 'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40';

    return (
        <div className={`rounded-2xl border border-sky-500/20 bg-sky-500/5 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">Avisar a la familia</p>
            <div className="flex gap-2">
                <button type="button" onClick={whatsapp} disabled={!data.phone || !!busy}
                    title={data.phone ? `WhatsApp a ${data.phone}` : 'El cliente no tiene celular registrado'}
                    className={`${btn} bg-[#25D366] hover:bg-[#1fb857] text-[#063b1c]`}>
                    {busy === 'whatsapp' ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} WhatsApp
                </button>
                <button type="button" onClick={email} disabled={!data.email || !!busy}
                    title={data.email ? `Correo a ${data.email}` : 'El cliente no tiene correo registrado'}
                    className={`${btn} bg-sky-600 hover:bg-sky-700 text-white`}>
                    {busy === 'email' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Correo
                </button>
            </div>
            {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{msg.text}</p>}
            {data.notices.length > 0 && (
                <ul className="space-y-1">
                    {data.notices.slice(0, compact ? 3 : 6).map((n) => (
                        <li key={n.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Check size={12} className="text-emerald-500 shrink-0" />
                            <span className="truncate">
                                {n.channel === 'email' ? 'Correo' : 'WhatsApp'} · {n.kind === 'finish' ? 'Agradecimiento y encuesta' : (n.step_name || 'Avance')} · {formatChileDate(n.created_at)} {formatChileTime(n.created_at)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {!data.email && !data.phone && <p className="text-[11px] text-muted-foreground">El cliente no tiene correo ni celular registrados.</p>}
        </div>
    );
}
