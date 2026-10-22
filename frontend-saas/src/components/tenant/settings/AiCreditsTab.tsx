'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Landmark, MessageCircle, Copy, Check, Loader2, Send, X } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface BankInfo {
    holder_name: string;
    rut: string;
    bank: string;
    account_type: string;
    account_number: string;
    email: string;
}

interface Purchase {
    id: number;
    quantity: number;
    total_usd: number;
    total_clp: number | null;
    method: 'transfer' | 'other';
    reference: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    review_note: string | null;
    created_at: string;
}

interface Store {
    credits: {
        available: number;
        monthly_remaining: number;
        monthly_granted: number;
        extra_remaining: number;
        attempts_per_credit: number;
    };
    payment: {
        bank: BankInfo | null;
        other_instructions: string | null;
    };
    /** Precio del crédito extra según el plan; `base_*` se muestra tachado si es mayor. */
    prices: {
        plan: string | null;
        unit_usd: number;
        base_usd: number;
        unit_clp: number | null;
        base_clp: number | null;
        usd_clp_rate: number | null;
    };
    packs: number[];
    max_purchase: number;
    purchases: Purchase[];
}

const BASE = '/api/internal/ai-credits';

const STATUS: Record<Purchase['status'], { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-300' },
    approved: { label: 'Aprobada', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
    rejected: { label: 'Rechazada', cls: 'bg-red-500/15 text-red-600 dark:text-red-300' },
    cancelled: { label: 'Cancelada', cls: 'bg-slate-500/15 text-slate-500' },
};

const BANK_LABELS: [keyof BankInfo, string][] = [
    ['holder_name', 'Titular'],
    ['rut', 'RUT'],
    ['bank', 'Banco'],
    ['account_type', 'Tipo de cuenta'],
    ['account_number', 'N° de cuenta'],
    ['email', 'Correo'],
];

const inputCls = 'w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 dark:bg-black/20 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-primary/50 transition-all';
const clp = (n: number) => `$${n.toLocaleString('es-CL')} CLP`;
const usd = (n: number) => `USD ${n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AiCreditsTab() {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const { data, isLoading, error } = useQuery<Store>({ queryKey: ['tenant', 'ai-credits', 'store'], queryFn: () => apiRequest(`${BASE}/store`) });

    const [quantity, setQuantity] = useState('5');
    const [method, setMethod] = useState<'transfer' | 'other' | null>(null);
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [copied, setCopied] = useState<string | null>(null);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ['tenant', 'ai-credits'] });
        qc.invalidateQueries({ queryKey: ['tenant', 'image-templates', 'ai-usage'] });
    };

    const buy = useMutation({
        mutationFn: () => apiRequest(`${BASE}/purchases`, {
            method: 'POST',
            body: { quantity: Number(quantity), method, reference: reference.trim() || null, note: note.trim() || null },
        }),
        onSuccess: () => {
            showToast('Solicitud enviada. Te avisaremos cuando se acrediten tus créditos.', 'success');
            setReference('');
            setNote('');
            refresh();
        },
        onError: (e: Error) => showToast(e.message || 'No se pudo enviar la solicitud', 'error'),
    });

    const cancel = useMutation({
        mutationFn: (id: number) => apiRequest(`${BASE}/purchases/${id}/cancel`, { method: 'POST' }),
        onSuccess: () => { showToast('Solicitud cancelada', 'success'); refresh(); },
        onError: (e: Error) => showToast(e.message || 'No se pudo cancelar', 'error'),
    });

    if (isLoading) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;
    if (error || !data) return <p className="text-sm text-red-500">{(error as Error)?.message || 'No se pudo cargar la compra de créditos'}</p>;

    const { credits, payment, prices } = data;
    const discounted = prices.base_usd > prices.unit_usd;
    const discountPct = discounted ? Math.round((1 - prices.unit_usd / prices.base_usd) * 100) : 0;
    /** Total de N créditos: CLP (con USD de referencia) o solo USD si no hay tipo de cambio. */
    const priceOf = (n: number, base = false) => {
        const u = base ? prices.base_usd : prices.unit_usd;
        const c = base ? prices.base_clp : prices.unit_clp;
        return { main: c ? clp(c * n) : usd(u * n), sub: c ? usd(u * n) : null };
    };
    const methods = [
        ...(payment.bank ? [{ key: 'transfer' as const, label: 'Transferencia bancaria', icon: Landmark }] : []),
        ...(payment.other_instructions ? [{ key: 'other' as const, label: 'Otro medio de pago', icon: MessageCircle }] : []),
    ];
    const selectedMethod = method ?? methods[0]?.key ?? null;
    const qty = Number(quantity);
    const validQty = Number.isInteger(qty) && qty >= 1 && qty <= data.max_purchase;

    const copy = async (key: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
            setTimeout(() => setCopied(null), 1500);
        } catch {
            showToast('No se pudo copiar', 'error');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/5 pb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Coins size={20} className="text-primary" /> Compra de créditos IA</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    1 crédito = 1 diseño para redes con IA ({credits.attempts_per_credit} intentos). Los créditos comprados no vencen.
                </p>
            </div>

            {/* Saldo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                    { label: 'Disponibles', value: String(credits.available), hint: 'Para usar ahora' },
                    { label: 'Del plan', value: `${credits.monthly_remaining} / ${credits.monthly_granted}`, hint: 'Se renuevan cada mes' },
                    { label: 'Extra', value: String(credits.extra_remaining), hint: 'Comprados o regalados · no vencen' },
                ] as const).map(c => (
                    <div key={c.label} className="glass-card p-4 rounded-2xl border-white/5 flex flex-col">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{c.label}</p>
                        <p className="text-2xl font-black mt-1 leading-tight">{c.value}</p>
                        <p className="text-[11px] text-muted-foreground mt-auto pt-1">{c.hint}</p>
                    </div>
                ))}
                <div className="glass-card p-4 rounded-2xl border-white/5 flex flex-col">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">Precio por crédito</p>
                    <p className="text-2xl font-black mt-1 leading-tight text-primary">{priceOf(1).main}</p>
                    <p className="text-[11px] text-muted-foreground mt-auto pt-1">
                        {priceOf(1).sub}
                        {discounted && <> · <s>{priceOf(1, true).main}</s> <b className="text-emerald-600 dark:text-emerald-400">-{discountPct}%</b></>}
                    </p>
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-4">
                Precio para tu plan{prices.plan ? ` ${prices.plan}` : ''}.
                {prices.usd_clp_rate ? ` Tipo de cambio: 1 USD = ${clp(prices.usd_clp_rate)}.` : ''}
                {' '}Los precios pueden variar con el tiempo.
            </p>

            {/* Compra */}
            <div className="glass-card p-6 rounded-3xl border-white/5 space-y-5">
                <h4 className="font-bold">Comprar créditos</h4>
                {methods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">La compra de créditos aún no está disponible. Contacta al equipo de Vinzer.</p>
                ) : (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">¿Cuántos créditos?</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {data.packs.map(n => {
                                    const active = quantity === String(n);
                                    const p = priceOf(n);
                                    return (
                                        <button key={n} type="button" onClick={() => setQuantity(String(n))}
                                            className={`text-left p-4 rounded-2xl border transition-colors ${active ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-slate-300 dark:border-white/10 hover:border-primary/50'}`}>
                                            <p className="text-sm font-black">{n} {n === 1 ? 'crédito' : 'créditos'}</p>
                                            {discounted && <p className="text-xs text-muted-foreground line-through mt-1">{priceOf(n, true).main}</p>}
                                            <p className={`text-lg font-black ${discounted ? 'text-primary' : 'mt-1'}`}>{p.main}</p>
                                            {p.sub && <p className="text-[11px] text-muted-foreground">{p.sub}</p>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className="text-xs text-muted-foreground">Otra cantidad:</span>
                                <input value={quantity} inputMode="numeric" onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                                    className={`${inputCls} w-28`} aria-label="Cantidad de créditos" />
                            </div>
                            {validQty && (
                                <p className="text-sm mt-2">
                                    Total: <b>{priceOf(qty).main}</b>
                                    {priceOf(qty).sub && <span className="text-muted-foreground"> · {priceOf(qty).sub}</span>}
                                    {discounted && <span className="text-emerald-600 dark:text-emerald-400"> · ahorras {prices.base_clp && prices.unit_clp
                                        ? clp((prices.base_clp - prices.unit_clp) * qty)
                                        : usd((prices.base_usd - prices.unit_usd) * qty)}</span>}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Medio de pago</label>
                            <div className="flex flex-wrap gap-2">
                                {methods.map(m => (
                                    <button key={m.key} type="button" onClick={() => setMethod(m.key)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${selectedMethod === m.key ? 'bg-primary/10 border-primary text-primary' : 'border-slate-300 dark:border-white/10'}`}>
                                        <m.icon size={15} /> {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedMethod === 'transfer' && payment.bank && (
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-200 dark:divide-white/5">
                                {BANK_LABELS.filter(([k]) => payment.bank![k]).map(([k, label]) => (
                                    <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                        <span className="text-xs text-muted-foreground">{label}</span>
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            {payment.bank![k]}
                                            <button type="button" onClick={() => copy(k, payment.bank![k])} title="Copiar"
                                                className="p-1 rounded-md text-muted-foreground hover:text-primary">
                                                {copied === k ? <Check size={13} /> : <Copy size={13} />}
                                            </button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedMethod === 'other' && payment.other_instructions && (
                            <p className="whitespace-pre-wrap text-sm rounded-2xl border border-slate-200 dark:border-white/10 p-4">{payment.other_instructions}</p>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1.5">N° de operación / comprobante (opcional)</label>
                                <input value={reference} maxLength={120} onChange={(e) => setReference(e.target.value)} placeholder="Ej: 123456789" className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1.5">Nota (opcional)</label>
                                <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ej: transferí desde la cuenta de la empresa" className={inputCls} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <p className="text-[11px] text-muted-foreground max-w-md">
                                Realiza el pago y envía la solicitud. Los créditos se suman a tu saldo cuando el equipo de Vinzer confirma el pago.
                            </p>
                            <button onClick={() => buy.mutate()} disabled={!validQty || !selectedMethod || buy.isPending}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40">
                                {buy.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar solicitud
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Solicitudes */}
            <div className="glass-card p-6 rounded-3xl border-white/5 space-y-4">
                <h4 className="font-bold">Mis solicitudes</h4>
                {data.purchases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no has comprado créditos.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <th className="py-2 pr-4">Fecha</th>
                                    <th className="py-2 pr-4">Créditos</th>
                                    <th className="py-2 pr-4">Total</th>
                                    <th className="py-2 pr-4">Medio</th>
                                    <th className="py-2 pr-4">Estado</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.purchases.map(p => (
                                    <tr key={p.id} className="border-t border-slate-200 dark:border-white/5 align-top">
                                        <td className="py-2.5 pr-4 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('es-CL')}</td>
                                        <td className="py-2.5 pr-4 font-bold">{p.quantity}</td>
                                        <td className="py-2.5 pr-4">{p.total_clp ? clp(p.total_clp) : usd(p.total_usd)}</td>
                                        <td className="py-2.5 pr-4">{p.method === 'transfer' ? 'Transferencia' : 'Otro medio'}{p.reference ? ` · ${p.reference}` : ''}</td>
                                        <td className="py-2.5 pr-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                                            {p.status === 'rejected' && p.review_note && <p className="text-[11px] text-muted-foreground mt-1">{p.review_note}</p>}
                                        </td>
                                        <td className="py-2.5 text-right">
                                            {p.status === 'pending' && (
                                                <button onClick={() => cancel.mutate(p.id)} disabled={cancel.isPending}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-red-500">
                                                    <X size={12} /> Cancelar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
