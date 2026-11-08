"use client";

/**
 * Carrito del catálogo público de productos. Con `orderRef` (enlace desde el correo /
 * seguimiento) la solicitud queda ligada a la orden de la mascota; sin él es una
 * compra externa y pide nombre + WhatsApp. El precio que se guarda es el del catálogo.
 * Backend: POST /api/public/catalog/{slug}/{token}/requests (services/product_requests.py).
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, MessageCircle, Minus, Package, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export interface CartProduct {
    id: number;
    name: string;
    price: number;
    image: string | null;
    made_to_order: boolean;
    max: number;
}

export interface CartLine extends CartProduct { qty: number }

/** Nombre: solo letras (con tildes/ñ), espacios, apóstrofo, guion y punto; ≤ 100 (el backend valida igual). */
const NAME_MAX = 100;
const NOTE_MAX = 500;
const cleanName = (v: string) => v.replace(/[^\p{L}\s'.-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, NAME_MAX);
/** WhatsApp: 8 números después de +56 9. */
const cleanPhone = (v: string) => v.replace(/\D/g, '').slice(0, 8);
const cleanNote = (v: string) => v.replace(/[<>]/g, '').slice(0, NOTE_MAX);

const clp = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;
const inputCls = 'w-full bg-white border border-slate-300 dark:bg-[#0a0d14] dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/60';

export default function ProductCart({ slug, token, lines, orderRef, tenantName, onQty, onRemove, onClear, onClose }: {
    slug: string;
    token: string;
    lines: CartLine[];
    orderRef: { ref: string; pet_name?: string | null } | null;
    tenantName: string;
    onQty: (id: number, qty: number) => void;
    onRemove: (id: number) => void;
    onClear: () => void;
    onClose: () => void;
}) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ code: string; whatsapp_url?: string; kind: string } | null>(null);

    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const hasMadeToOrder = lines.some(l => l.made_to_order);
    const external = !orderRef;
    const nameOk = /\p{L}/u.test(name) && name.trim().length >= 2;
    const phoneOk = phone.length === 8;
    // Compra externa: nombre y WhatsApp obligatorios. Con orden: opcionales, pero si se escriben deben ser válidos.
    const canSend = external ? nameOk && phoneOk : (!name.trim() || nameOk) && (!phone || phoneOk);

    const send = async () => {
        setError(null);
        if (!canSend) { setError('Completa tu nombre y los 8 números de tu WhatsApp'); return; }
        setSending(true);
        try {
            const res = await apiRequest(`/api/public/catalog/${encodeURIComponent(slug)}/${encodeURIComponent(token)}/requests`, {
                method: 'POST',
                body: JSON.stringify({
                    ref: orderRef?.ref || null,
                    items: lines.map(l => ({ product_id: l.id, qty: l.qty })),
                    contact_name: name.trim() || null,
                    contact_phone: phone ? `+569${phone}` : null,
                    note: note.trim() || null,
                }),
            });
            setDone(res as { code: string; whatsapp_url?: string; kind: string });
            onClear();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'No pudimos enviar tu solicitud');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm" onClick={sending ? undefined : onClose}>
            <motion.aside
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md h-full bg-white text-slate-900 dark:bg-[#111622] dark:text-white flex flex-col shadow-2xl"
                role="dialog" aria-modal="true" aria-label="Tu solicitud"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                    <p className="font-black flex items-center gap-2"><ShoppingBag size={18} className="text-amber-500" /> Tu solicitud</p>
                    <button onClick={onClose} disabled={sending} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Cerrar"><X size={18} /></button>
                </div>

                {done ? (
                    <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
                        <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                        <p className="text-lg font-black">¡Solicitud enviada!</p>
                        <p className="text-sm text-slate-600 dark:text-neutral-300">
                            {done.kind === 'order'
                                ? `Recibimos tu solicitud${orderRef?.pet_name ? ` para ${orderRef.pet_name}` : ''}. ${tenantName} la revisará y te contactará por WhatsApp.`
                                : `Recibimos tu solicitud. Para agilizarla, envíala también por WhatsApp a ${tenantName}.`}
                        </p>
                        <p className="text-xs font-mono text-slate-500 dark:text-neutral-400">Código: {done.code}</p>
                        {done.whatsapp_url && (
                            <a href={done.whatsapp_url} target="_blank" rel="noopener noreferrer"
                                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${external
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'}`}>
                                <MessageCircle size={18} /> Enviar por WhatsApp
                            </a>
                        )}
                        <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Seguir viendo el catálogo</button>
                    </div>
                ) : lines.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-neutral-400 gap-2">
                        <Package size={36} />
                        <p className="text-sm font-semibold">Aún no agregas productos</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {orderRef && (
                                <p className="text-xs font-semibold rounded-2xl px-4 py-3 bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/20">
                                    Se agregará al servicio de <b>{orderRef.pet_name || 'tu mascota'}</b>.
                                </p>
                            )}
                            <ul className="space-y-3">
                                {lines.map(l => (
                                    <li key={l.id} className="flex gap-3 items-center">
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 shrink-0 flex items-center justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{l.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-neutral-400">{clp(l.price)}{l.made_to_order ? ' · A pedido' : ''}</p>
                                            <div className="mt-1 inline-flex items-center rounded-xl border border-slate-200 dark:border-white/10">
                                                <button onClick={() => onQty(l.id, l.qty - 1)} disabled={l.qty <= 1} className="p-1.5 disabled:opacity-30" aria-label="Quitar uno"><Minus size={14} /></button>
                                                <span className="w-7 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                                                <button onClick={() => onQty(l.id, l.qty + 1)} disabled={l.qty >= l.max} className="p-1.5 disabled:opacity-30" aria-label="Agregar uno"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-amber-600 dark:text-amber-400">{clp(l.price * l.qty)}</p>
                                            <button onClick={() => onRemove(l.id)} className="mt-1 p-1.5 text-slate-400 hover:text-rose-500" aria-label={`Quitar ${l.name}`}><Trash2 size={14} /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {hasMadeToOrder && (
                                <p className="text-xs font-semibold rounded-2xl px-4 py-3 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20">
                                    Algunos productos se fabrican a pedido: {tenantName} te confirmará el plazo de entrega.
                                </p>
                            )}

                            {external && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 dark:text-neutral-400">Tus datos para contactarte</p>
                                    <input value={name} onChange={e => setName(cleanName(e.target.value))} maxLength={NAME_MAX}
                                        autoComplete="name" placeholder="Nombre y apellido" aria-label="Nombre y apellido" className={inputCls} />
                                    <div className="flex items-stretch rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0a0d14] focus-within:border-amber-500/60 overflow-hidden">
                                        <span className="px-4 flex items-center text-sm font-bold text-slate-600 dark:text-neutral-300 bg-slate-100 dark:bg-white/5 border-r border-slate-300 dark:border-white/10 select-none">+56 9</span>
                                        <input value={phone} onChange={e => setPhone(cleanPhone(e.target.value))} maxLength={8}
                                            inputMode="numeric" pattern="[0-9]{8}" autoComplete="tel-national" placeholder="12345678" aria-label="WhatsApp, 8 números"
                                            className="flex-1 min-w-0 bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none tabular-nums tracking-wider" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <textarea value={note} onChange={e => setNote(cleanNote(e.target.value))} maxLength={NOTE_MAX} rows={2}
                                    placeholder="Nota (opcional): grabado, color, consulta…" className={inputCls} />
                                <p className="text-[11px] text-right text-slate-500 dark:text-neutral-400 px-1">{note.length}/{NOTE_MAX}</p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm font-bold text-slate-600 dark:text-neutral-300">Total</span>
                                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{clp(total)}</span>
                            </div>
                            {error && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
                            <button onClick={send} disabled={sending || !canSend}
                                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                                {sending && <Loader2 size={16} className="animate-spin" />} Enviar solicitud
                            </button>
                        </div>
                    </>
                )}
            </motion.aside>
        </div>
    );
}
