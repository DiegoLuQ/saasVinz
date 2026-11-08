"use client";

/**
 * Confirmación ANTES de avanzar de etapa (Panel de Trabajo y orden lateral de
 * recepción-pedidos): la orden no avanza hasta confirmar aquí. Muestra la mascota,
 * el dueño y la etapa siguiente; permite avisar a la familia por correo y/o WhatsApp
 * con un mensaje editable. Nada se envía solo. Sin correo → solo WhatsApp.
 * Backend: GET/POST .../family-notices (services/family_notices.py).
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Dog, Loader2, Mail, MessageCircle, Phone, User, X } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';

interface NoticeInfo {
    enabled: boolean;
    email?: string | null;
    phone?: string | null;
    owner_name?: string | null;
    pet_name?: string | null;
    pet_photo?: string | null;
    step_name?: string | null;
    next_step_id?: number | null;
    next_step_name?: string | null;
    next_message?: string | null;
}

const MAX_MESSAGE = 1000;

export default function AdvanceNoticeModal({ orderId, onAdvance, onClose }: {
    orderId: number;
    /** Avanza la orden (guarda). Devuelve true si se pudo. */
    onAdvance: () => Promise<boolean>;
    onClose: () => void;
}) {
    const qc = useQueryClient();
    const key = ['family-notices', orderId];
    const { data, isLoading } = useQuery<NoticeInfo>({
        queryKey: key,
        queryFn: () => apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices`),
        staleTime: 0,
    });
    // null = aún sin tocar (se usan los valores por defecto de la orden)
    const [wantEmail, setWantEmail] = useState<boolean | null>(null);
    const [wantWa, setWantWa] = useState<boolean | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const enabled = !!data?.enabled;
    const hasEmail = enabled && !!data?.email;
    const hasPhone = enabled && !!data?.phone;
    const email = hasEmail && (wantEmail ?? true);
    // WhatsApp viene apagado; solo se propone cuando no hay correo
    const wa = hasPhone && (wantWa ?? !hasEmail);
    const text = message ?? data?.next_message ?? '';
    const notifying = email || wa;

    const confirm = async () => {
        if (!data) return;
        // La pestaña de WhatsApp se abre ya (en el clic): después del await el navegador la bloquea.
        const win = wa ? window.open('', '_blank') : null;
        setBusy(true); setError(null);
        const ok = await onAdvance();
        if (!ok) { win?.close(); setBusy(false); return; }
        const problems: string[] = [];
        if (email) {
            try {
                // El correo usa su texto por defecto; el mensaje editable es solo para WhatsApp
                await apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices/email`, { method: 'POST', body: { step_id: data.next_step_id } });
            } catch (e: unknown) { problems.push((e as { message?: string } | null)?.message || 'No se pudo enviar el correo'); }
        }
        if (wa) {
            try {
                const r = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/family-notices/whatsapp`, {
                    method: 'POST', body: { step_id: data.next_step_id, message: text.trim() || null },
                });
                if (win) win.location.href = r.url; else window.location.href = r.url;
            } catch (e: unknown) {
                win?.close();
                problems.push((e as { message?: string } | null)?.message || 'No se pudo armar el WhatsApp');
            }
        }
        qc.invalidateQueries({ queryKey: key });
        setBusy(false);
        if (problems.length) { setError(`La etapa avanzó, pero: ${problems.join(' · ')}`); return; }
        onClose();
    };

    const photo = data?.pet_photo ? getImageUrl(data.pet_photo) : null;
    const check = 'w-5 h-5 accent-sky-600 shrink-0';
    const done = !!error; // ya avanzó; solo queda cerrar

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={busy ? undefined : onClose}>
            <div
                role="dialog" aria-modal="true" aria-labelledby="advance-notice-title"
                onClick={e => e.stopPropagation()}
                className="bg-card text-foreground w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-foreground/10 shadow-2xl p-6 relative"
            >
                <button onClick={onClose} disabled={busy} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground disabled:opacity-40" aria-label="Cerrar">
                    <X size={20} />
                </button>

                {isLoading || !data ? (
                    <div className="py-10 text-center text-muted-foreground"><Loader2 className="inline animate-spin" size={22} /></div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 pr-6">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-foreground/5 border border-foreground/10 flex items-center justify-center shrink-0">
                                {photo
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={photo} alt={data.pet_name || 'Mascota'} className="w-full h-full object-cover" />
                                    : <Dog size={30} className="text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Avanzar de etapa</p>
                                <p id="advance-notice-title" className="text-xl font-black truncate">{data.pet_name || 'Mascota'}</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-3 text-sm">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">Cambiar estado a</p>
                            <p className="mt-0.5 font-bold flex items-center gap-1.5 flex-wrap">
                                {data.step_name && <><span className="text-muted-foreground font-semibold">{data.step_name}</span><ArrowRight size={14} className="text-muted-foreground" /></>}
                                <span>{data.next_step_name || 'Siguiente etapa'}</span>
                            </p>
                        </div>

                        {enabled && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-bold flex items-center gap-1.5">
                                    <User size={14} className="text-muted-foreground" /> Notificar a la familia{data.owner_name ? ` (${data.owner_name})` : ''}:
                                </p>
                                <label className={`flex items-center gap-3 rounded-xl border border-foreground/10 px-3 py-2.5 text-sm ${hasPhone ? 'cursor-pointer' : 'opacity-50'}`}>
                                    <input type="checkbox" className={check} checked={wa} disabled={!hasPhone || busy || done} onChange={e => setWantWa(e.target.checked)} />
                                    <MessageCircle size={15} className="text-emerald-600 shrink-0" />
                                    <span className="truncate">Enviar WhatsApp {data.phone ? `(${data.phone})` : '— sin celular registrado'}</span>
                                </label>
                                <label className={`flex items-center gap-3 rounded-xl border border-foreground/10 px-3 py-2.5 text-sm ${hasEmail ? 'cursor-pointer' : 'opacity-50'}`}>
                                    <input type="checkbox" className={check} checked={email} disabled={!hasEmail || busy || done} onChange={e => setWantEmail(e.target.checked)} />
                                    <Mail size={15} className="text-sky-600 shrink-0" />
                                    <span className="truncate">Enviar correo {data.email ? `(${data.email})` : '— sin correo registrado'}</span>
                                </label>
                                {email && (
                                    <p className="text-[11px] text-muted-foreground">
                                        El correo lleva la foto de la mascota, la etapa, la hora, tu logo, el enlace de seguimiento y tu catálogo de productos (si tienes).
                                    </p>
                                )}
                                {!hasEmail && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        {hasPhone
                                            ? 'No hay forma de enviar correo: el cliente no tiene correo registrado. El aviso se hará por WhatsApp con su número.'
                                            : 'El cliente no tiene correo ni WhatsApp registrado: no hay forma de avisarle desde aquí.'}
                                    </p>
                                )}
                                {wa && (
                                    <div className="pt-1">
                                        <p className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1.5"><Phone size={12} /> Mensaje de WhatsApp</p>
                                        <textarea
                                            value={text}
                                            onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                                            disabled={busy || done}
                                            rows={4}
                                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-50"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Se agrega el enlace de seguimiento al final.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

                        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
                            <button type="button" onClick={onClose} disabled={busy}
                                className="sm:flex-1 py-3 rounded-2xl text-sm font-bold text-muted-foreground hover:bg-foreground/5 disabled:opacity-40">
                                {done ? 'Cerrar' : 'Cancelar'}
                            </button>
                            {!done && (
                                <button type="button" onClick={confirm} disabled={busy}
                                    className="sm:flex-[1.4] py-3 rounded-2xl text-sm font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
                                    {busy && <Loader2 size={16} className="animate-spin" />}
                                    {notifying ? 'Confirmar y notificar' : 'Confirmar sin avisar'}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
