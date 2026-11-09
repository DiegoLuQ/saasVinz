'use client';

/**
 * Admin → Memoriales:
 * - «Nuevo memorial» (el SuperAdmin lo crea con el mismo formulario que la familia, opcionalmente activo al instante)
 * - «Enlaces para familias» (invitaciones de un solo uso a memorial.<dominio>/crear?i=…, sin reCAPTCHA)
 * - «Planes y precios de memoriales» (estudio dedicado y modal para gestionar tarifas, cobro y límites multimedia)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    Check, Copy, Link2, Loader2, Trash2, X, Sparkles, ShieldCheck,
    Image as ImageIcon, MessageSquareHeart, Type, Music, Clock, Film,
    Mic, QrCode, GitCommitHorizontal, RotateCcw, DollarSign, Crown,
    Building2, Eye, EyeOff, Minus, Plus, AlertCircle, Tags, ArrowLeft, Percent
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { SCENARIO_LABELS, SCENARIO_ORDER, scenariosOf } from '@/lib/memorialPlans';
import MemorialCreateForm, { type MemorialCreateResult, type MemorialSignupOptions } from '@/components/memorial/create/MemorialCreateForm';

function Shell({
    title,
    subtitle,
    onClose,
    maxWidth = 'max-w-2xl',
    dark = false,
    children,
}: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    maxWidth?: string;
    dark?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:items-center"
            onClick={onClose}
        >
            <div
                className={`w-full ${maxWidth} rounded-3xl p-5 shadow-2xl sm:p-7 border transition-all ${
                    dark
                        ? 'bg-[#070b14] border-white/10 text-white'
                        : 'bg-white border-slate-200 text-slate-900'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2 className={`text-lg sm:text-xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
                        {subtitle && (
                            <p className={`text-xs sm:text-sm mt-1 ${dark ? 'text-white/50' : 'text-slate-500'}`}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className={`rounded-full p-2 transition-colors ${
                            dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function NewMemorialModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [options, setOptions] = useState<MemorialSignupOptions | null>(null);
    const [activate, setActivate] = useState(true);
    const [done, setDone] = useState<MemorialCreateResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiRequest('/api/internal/creator/memorials/signup-options').then(setOptions).catch((e) => setError(e.message));
    }, []);

    const submit = async (fd: FormData) => {
        fd.append('activate', activate ? 'true' : 'false');
        const res: MemorialCreateResult = await apiRequest('/api/internal/creator/memorials/new', { method: 'POST', body: fd });
        setDone(res);
        onCreated();
    };

    return (
        <Shell title="Nuevo memorial Vinzer" onClose={onClose}>
            {done ? (
                <div className="text-center text-slate-700">
                    <Check size={40} className="mx-auto text-emerald-500" />
                    <p className="mt-3 text-sm">Memorial creado {done.status === 'active' ? 'y activo: se envió el correo con el enlace y el PIN.' : 'pendiente de pago: se envió el PIN a la familia.'}</p>
                    <p className="mt-3 font-mono text-3xl font-black tracking-[0.3em] text-slate-900">{done.pin}</p>
                    <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white">Listo</button>
                </div>
            ) : error ? (
                <p className="text-sm text-rose-600">{error}</p>
            ) : !options ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : (
                <MemorialCreateForm
                    options={options}
                    onSubmit={submit}
                    extra={
                        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-500" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
                            <span>
                                <b>Activar ahora</b> (pago ya recibido). Se fija la vigencia del plan y la familia recibe el correo con el enlace y el PIN.
                                Sin marcar queda pendiente; lo activas después cambiando su estado a ACTIVE.
                            </span>
                        </label>
                    }
                />
            )}
        </Shell>
    );
}

interface Invite {
    id: number;
    url: string;
    plan: string | null;
    note: string | null;
    expires_at: string;
    used_at: string | null;
    status: 'activo' | 'usado' | 'vencido';
}

const STATUS_CLS: Record<Invite['status'], string> = {
    activo: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    usado: 'bg-white/10 text-white/50 border border-white/10',
    vencido: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
};

export function MemorialInvitesModal({ onClose }: { onClose: () => void }) {
    const [invites, setInvites] = useState<Invite[] | null>(null);
    const [plan, setPlan] = useState('');
    const [note, setNote] = useState('');
    const [days, setDays] = useState(7);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        apiRequest('/api/internal/creator/memorials/invites').then(setInvites).catch((e) => setError(e.message));
    }, []);
    useEffect(load, [load]);

    const copy = (inv: Invite) => {
        navigator.clipboard?.writeText(inv.url);
        setCopied(inv.id);
        setTimeout(() => setCopied(null), 1500);
    };

    const create = async () => {
        setBusy(true);
        setError(null);
        try {
            const inv: Invite = await apiRequest('/api/internal/creator/memorials/invites', {
                method: 'POST', body: { plan: plan || null, note: note.trim() || null, expires_in_days: days },
            });
            setNote('');
            copy(inv);
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear el enlace.');
        } finally {
            setBusy(false);
        }
    };

    const revoke = async (inv: Invite) => {
        await apiRequest(`/api/internal/creator/memorials/invites/${inv.id}`, { method: 'DELETE' }).catch((e) => setError(e.message));
        load();
    };

    const field = 'rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-[#19B5FE]/60';

    return (
        <Shell
            title="Enlaces de invitación para familias"
            subtitle="Genera un enlace de un solo uso para que la familia cree su memorial (fotos, diseño, música y plan). Queda pendiente hasta que lo actives."
            onClose={onClose}
            dark
        >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_140px_110px_auto]">
                <input className={field} maxLength={200} placeholder="Nota (p. ej. Familia Soto)" value={note} onChange={(e) => setNote(e.target.value)} />
                <select className={field} value={plan} onChange={(e) => setPlan(e.target.value)}>
                    <option value="" className="bg-slate-900">La familia elige</option>
                    <option value="mensual" className="bg-slate-900">Mensual</option>
                    <option value="anual" className="bg-slate-900">Anual</option>
                    <option value="eterno" className="bg-slate-900">Eterno</option>
                </select>
                <select className={field} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                    {[3, 7, 15, 30].map((d) => <option key={d} value={d} className="bg-slate-900">{d} días</option>)}
                </select>
                <button type="button" onClick={create} disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#19B5FE] to-[#E0B84D] px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60 hover:brightness-110 transition-all">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Crear y copiar
                </button>
            </div>
            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

            <div className="mt-6 max-h-[45vh] space-y-2.5 overflow-y-auto pr-1">
                {!invites ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/40" /></div>
                ) : invites.length === 0 ? (
                    <p className="py-6 text-center text-sm text-white/40">Aún no hay enlaces generados.</p>
                ) : invites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.05] transition-colors">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">{inv.note || 'Sin nota'}</p>
                            <p className="text-xs text-white/45">
                                {inv.plan ? `Plan ${inv.plan}` : 'Plan a elección'} · vence {new Date(inv.expires_at).toLocaleDateString('es-CL')}
                            </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${STATUS_CLS[inv.status]}`}>{inv.status}</span>
                        {inv.status === 'activo' && (
                            <button type="button" onClick={() => copy(inv)} aria-label="Copiar enlace" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
                                {copied === inv.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                            </button>
                        )}
                        {!inv.used_at && (
                            <button type="button" onClick={() => revoke(inv)} aria-label="Eliminar enlace" className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/15">
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </Shell>
    );
}

// ───────────────────────── Planes y precios de memoriales ─────────────────────────

export interface CatalogPlan {
    id: number;
    key: string;
    name: string;
    kind: string;
    price: number;
    original_price?: number;
    final_price?: number;
    discount_percent?: number;
    discount_label?: string | null;
    currency: string;
    billing: string;
    description: string | null;
    highlight: boolean;
    sort_order: number;
    is_active: boolean;
    memorials: number;
    /** `scenarios` = diseños incluidos (lista); el resto son límites o interruptores. */
    features: Record<string, number | boolean | string[]>;
}

const SCENARIO_ICONS: Record<string, string> = { normal: '🕯️', altar: '🏛️', cielo: '☁️', constelacion: '🌌' };

const ACTIVE_LIMIT_FIELDS: {
    key: string;
    label: string;
    unit: string;
    hint?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    step?: number;
}[] = [
    { key: 'max_images', label: 'Fotos en galería', unit: 'fotos', icon: ImageIcon },
    { key: 'max_videos', label: 'Videos (30 s)', unit: 'videos', icon: Film },
    { key: 'max_voice', label: 'Audios de voz (30 s)', unit: 'audios', icon: Mic },
    { key: 'max_melodies', label: 'Melodías a elegir', unit: 'melodías', icon: Music },
    { key: 'max_timeline', label: 'Hitos en línea de tiempo', unit: 'momentos', icon: Clock },
    { key: 'max_dedications', label: 'Mensajes publicados', unit: 'mensajes', hint: 'Velas, flores y besos simbólicos son ilimitados', icon: MessageSquareHeart },
    { key: 'max_dedication_chars', label: 'Largo por mensaje', unit: 'caracteres', icon: Type, step: 50 },
];

const EXPIRED_LIMIT_FIELDS: {
    key: string;
    label: string;
    unit: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
    { key: 'expired_images', label: 'Fotos visibles al vencer', unit: 'fotos', icon: ImageIcon },
    { key: 'expired_dedications', label: 'Mensajes visibles al vencer', unit: 'mensajes', icon: MessageSquareHeart },
];

const TOGGLE_FIELDS: {
    key: string;
    label: string;
    desc: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
    {
        key: 'qr',
        label: 'Código QR descargable',
        desc: 'Permite descargar el QR listo para placa o ánfora',
        icon: QrCode,
    },
    {
        key: 'timeline',
        label: 'Línea de tiempo interactiva',
        desc: 'Biografía cronológica con momentos especiales',
        icon: GitCommitHorizontal,
    },
];

function computeFinalPrice(price: number, discountPercent: number | undefined, _currency?: string): number {
    const base = Number(price || 0);
    const disc = Math.min(Math.max(0, Number(discountPercent || 0)), 95);
    if (disc <= 0 || base <= 0) return Math.round(base);
    const raw = base * (100 - disc) / 100;
    return Math.round(raw);
}

function formatMoney(amount: number, currency: string): string {
    const num = Number(amount || 0);
    return currency === 'CLP'
        ? `$${Math.round(num).toLocaleString('es-CL')} CLP`
        : `$${num.toLocaleString('en-US', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} USD`;
}

function formatPricePreview(price: number, currency: string, billing: string, discountPercent?: number): string {
    const finalAmount = computeFinalPrice(price, discountPercent, currency);
    const cycle = billing === 'one_time' ? 'Pago único' : 'Anual';
    return `${formatMoney(finalAmount, currency)} · ${cycle}`;
}

function PlanEditorCard({ plan, onSaved }: { plan: CatalogPlan; onSaved: (p: CatalogPlan) => void }) {
    const [draft, setDraft] = useState<CatalogPlan>(plan);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        setDraft(plan);
    }, [plan]);

    const partner = plan.kind === 'partner';
    const dirty = JSON.stringify(draft) !== JSON.stringify(plan);
    const priceChanged =
        draft.price !== plan.price ||
        draft.billing !== plan.billing ||
        draft.currency !== plan.currency ||
        (draft.discount_percent || 0) !== (plan.discount_percent || 0);

    const setF = (k: string, v: number | boolean | string[]) =>
        setDraft((prev) => ({ ...prev, features: { ...prev.features, [k]: v } }));

    // Diseños incluidos: al menos uno (el backend deja Santuario Sereno si queda vacío).
    const scenarios = scenariosOf({ scenarios: draft.features.scenarios as string[] | undefined });
    const toggleScenario = (id: string) => {
        const next = scenarios.includes(id) ? scenarios.filter((s) => s !== id) : [...scenarios, id];
        if (!next.length) return;
        setF('scenarios', SCENARIO_ORDER.filter((s) => next.includes(s)));
    };

    const reset = () => {
        setDraft(plan);
        setMsg(null);
    };

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await apiRequest(`/api/internal/creator/memorials/plan-catalog/${plan.id}`, {
                method: 'PUT',
                body: {
                    name: draft.name,
                    description: draft.description || '',
                    features: draft.features,
                    ...(partner
                        ? {}
                        : {
                              price: Number(draft.price),
                              currency: draft.currency,
                              billing: draft.billing,
                              highlight: draft.highlight,
                              is_active: draft.is_active,
                              discount_percent: Number(draft.discount_percent || 0),
                              discount_label: draft.discount_label || '',
                          }),
                },
            });
            onSaved({ ...draft, ...res, memorials: plan.memorials });
            setMsg({ ok: true, text: 'Cambios guardados' });
            setTimeout(() => setMsg(null), 3000);
        } catch (e) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo guardar.' });
        } finally {
            setSaving(false);
        }
    };

    const borderCls = draft.highlight && !partner
        ? 'border-[#E0B84D]/50 shadow-[0_20px_50px_-20px_rgba(224,184,77,0.22)]'
        : partner
            ? 'border-emerald-500/25 shadow-[0_20px_50px_-20px_rgba(16,185,129,0.12)]'
            : 'border-white/10';

    return (
        <div className={`relative rounded-3xl border bg-[#0b101b]/95 p-5 sm:p-6 flex flex-col justify-between gap-5 transition-all overflow-hidden ${borderCls} ${!partner && !draft.is_active ? 'opacity-65' : ''}`}>
            {/* Barra superior de acento */}
            <div
                className={`absolute top-0 inset-x-0 h-1 ${
                    partner
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400'
                        : draft.highlight
                            ? 'bg-gradient-to-r from-[#E0B84D] via-amber-300 to-[#19B5FE]'
                            : 'bg-gradient-to-r from-[#19B5FE]/60 to-white/10'
                }`}
            />

            <div className="space-y-5">
                {/* 1. Cabecera del Plan */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${
                                partner
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                                    : 'bg-[#19B5FE]/10 text-[#38BDF8] border-[#19B5FE]/25'
                            }`}
                        >
                            {partner ? <Building2 size={12} /> : <Crown size={12} />}
                            {partner ? 'Crematorios Aliados' : 'Venta Directa Vinzer'}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70">
                            {plan.memorials} memorial{plan.memorials === 1 ? '' : 'es'}
                        </span>
                    </div>

                    {!partner && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDraft({ ...draft, highlight: !draft.highlight })}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold border transition-all ${
                                    draft.highlight
                                        ? 'bg-[#E0B84D]/15 border-[#E0B84D]/50 text-[#E0B84D]'
                                        : 'bg-white/5 border-white/10 text-white/45 hover:text-white'
                                }`}
                                title="Destacar como plan recomendado en la landing"
                            >
                                <Sparkles size={12} />
                                {draft.highlight ? 'Recomendado' : 'Destacar'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setDraft({ ...draft, is_active: !draft.is_active })}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold border transition-all ${
                                    draft.is_active
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                                }`}
                                title="Mostrar u ocultar este plan en la página pública"
                            >
                                {draft.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                                {draft.is_active ? 'Visible' : 'Oculto'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Nombre del plan + Resumen de tarifa */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                            Nombre del Plan
                        </label>
                        <input
                            className="w-full bg-transparent text-lg sm:text-xl font-black text-white outline-none border-b border-transparent focus:border-[#19B5FE] pb-0.5 transition-colors"
                            value={draft.name}
                            maxLength={60}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        />
                    </div>
                    <div className="sm:text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-white/40">
                            Tarifa Pública
                        </span>
                        {!partner && (draft.discount_percent || 0) > 0 ? (
                            <div className="flex flex-col sm:items-end gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                                        -{draft.discount_percent}% OFF
                                        {draft.discount_label ? ` · ${draft.discount_label}` : ''}
                                    </span>
                                    <span className="text-xs font-semibold text-white/35 line-through">
                                        {formatMoney(draft.price, draft.currency)}
                                    </span>
                                </div>
                                <span className="text-sm font-black bg-gradient-to-r from-emerald-300 via-[#19B5FE] to-[#E0B84D] bg-clip-text text-transparent">
                                    {formatPricePreview(draft.price, draft.currency, draft.billing, draft.discount_percent)}
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm font-black bg-gradient-to-r from-[#19B5FE] to-[#E0B84D] bg-clip-text text-transparent">
                                {partner
                                    ? 'Incluido por Crematorio'
                                    : formatPricePreview(draft.price, draft.currency, draft.billing)}
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. Configuración Comercial (Precio / Moneda / Ciclo / Descuento / Descripción) */}
                <div className="space-y-3">
                    {!partner && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45 mb-1.5">
                                        <DollarSign size={12} className="text-[#19B5FE]" /> Precio Base
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full bg-transparent text-base font-black text-white outline-none"
                                        value={draft.price}
                                        onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-white/45 mb-1.5">
                                        Moneda
                                    </label>
                                    <select
                                        className="w-full bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
                                        value={draft.currency}
                                        onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                                    >
                                        <option value="USD" className="bg-slate-900">USD (Dólares)</option>
                                        <option value="CLP" className="bg-slate-900">CLP (Pesos chilenos)</option>
                                    </select>
                                </div>

                                <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-white/45 mb-1.5">
                                        Modalidad de Cobro
                                    </label>
                                    <select
                                        className="w-full bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
                                        value={draft.billing}
                                        onChange={(e) => setDraft({ ...draft, billing: e.target.value })}
                                    >
                                        <option value="yearly" className="bg-slate-900">Suscripción Anual</option>
                                        <option value="one_time" className="bg-slate-900">Pago Único</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 p-3">
                                    <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Percent size={12} className="text-emerald-400" /> Descuento (%)
                                        </span>
                                        {(draft.discount_percent || 0) > 0 && (
                                            <span className="text-emerald-300 font-black">
                                                Queda en {formatMoney(computeFinalPrice(draft.price, draft.discount_percent, draft.currency), draft.currency)}
                                            </span>
                                        )}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            max={95}
                                            step="1"
                                            className="w-20 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-sm font-black text-emerald-300 outline-none focus:border-emerald-400"
                                            value={draft.discount_percent ?? 0}
                                            onChange={(e) =>
                                                setDraft({
                                                    ...draft,
                                                    discount_percent: Math.min(95, Math.max(0, Number(e.target.value) || 0)),
                                                })
                                            }
                                        />
                                        <div className="flex flex-wrap gap-1">
                                            {[0, 10, 20, 30, 50].map((pct) => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => setDraft({ ...draft, discount_percent: pct })}
                                                    className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-colors ${
                                                        (draft.discount_percent || 0) === pct
                                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                            : 'bg-white/5 text-white/55 border-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {pct === 0 ? '0%' : `-${pct}%`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-white/45 mb-1.5">
                                        Etiqueta de oferta (opcional)
                                    </label>
                                    <input
                                        className="w-full bg-transparent text-xs sm:text-sm text-white/90 placeholder:text-white/25 outline-none"
                                        placeholder="Ej: Oferta de lanzamiento"
                                        maxLength={40}
                                        value={draft.discount_label || ''}
                                        onChange={(e) => setDraft({ ...draft, discount_label: e.target.value })}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="rounded-2xl bg-black/30 border border-white/10 p-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/45 mb-1">
                            Descripción comercial (se muestra en la tarjeta del plan)
                        </label>
                        <input
                            className="w-full bg-transparent text-xs sm:text-sm text-white/90 placeholder:text-white/25 outline-none"
                            placeholder="Ej: Homenaje completo con música, galería extendida y código QR..."
                            maxLength={300}
                            value={draft.description || ''}
                            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        />
                    </div>
                </div>

                {/* 3. Capacidad Multimedia y Límites Activos */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white/60">
                            Capacidad Multimedia y Contenido
                        </span>
                        <span className="text-[10px] text-white/35">
                            Velas, flores y besos son ilimitados
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {ACTIVE_LIMIT_FIELDS.map((f) => {
                            const Icon = f.icon;
                            const val = Number(draft.features[f.key] ?? 0);
                            const step = f.step || 1;
                            return (
                                <div
                                    key={f.key}
                                    title={f.hint}
                                    className="flex items-center justify-between gap-2 rounded-2xl bg-white/[0.03] border border-white/8 px-3 py-2.5 hover:border-white/15 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-[#19B5FE]/10 text-[#38BDF8] flex items-center justify-center shrink-0">
                                            <Icon size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{f.label}</p>
                                            <p className="text-[10px] text-white/40">{f.unit}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setF(f.key, Math.max(0, val - step))}
                                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 flex items-center justify-center transition-colors"
                                            aria-label={`Disminuir ${f.label}`}
                                        >
                                            <Minus size={11} />
                                        </button>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-14 text-center bg-black/40 border border-white/10 rounded-lg py-1 text-xs font-black text-white outline-none focus:border-[#19B5FE]"
                                            value={val}
                                            onChange={(e) => setF(f.key, Math.max(0, Number(e.target.value) || 0))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setF(f.key, val + step)}
                                            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 flex items-center justify-center transition-colors"
                                            aria-label={`Aumentar ${f.label}`}
                                        >
                                            <Plus size={11} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Diseños (escenarios) incluidos */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Diseños incluidos</p>
                        <span className="text-[10px] text-white/40">{scenarios.length} de {SCENARIO_ORDER.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {SCENARIO_ORDER.map((id) => {
                            const on = scenarios.includes(id);
                            const last = on && scenarios.length === 1;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => toggleScenario(id)}
                                    disabled={last}
                                    title={last ? 'Debe quedar al menos un diseño' : undefined}
                                    aria-pressed={on}
                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                                        on
                                            ? 'bg-emerald-500/10 border-emerald-500/35 text-white'
                                            : 'bg-white/[0.02] border-white/10 text-white/45 hover:text-white'
                                    } ${last ? 'cursor-not-allowed' : ''}`}
                                >
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-emerald-500 border-emerald-500' : 'border-white/25'}`}>
                                        {on && <span className="text-[10px] leading-none text-white">✓</span>}
                                    </span>
                                    <span className="text-sm">{SCENARIO_ICONS[id]}</span>
                                    <span className="truncate">{SCENARIO_LABELS[id]}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-white/40">Los memoriales que ya usan un diseño lo conservan aunque lo quites del plan.</p>
                </div>

                {/* 4. Funciones Especiales (Toggles) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TOGGLE_FIELDS.map((f) => {
                        const Icon = f.icon;
                        const active = Boolean(draft.features[f.key]);
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setF(f.key, !active)}
                                className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all ${
                                    active
                                        ? 'bg-emerald-500/10 border-emerald-500/35 text-white'
                                        : 'bg-white/[0.02] border-white/10 text-white/50 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                        active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'
                                    }`}>
                                        <Icon size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{f.label}</p>
                                        <p className="text-[10px] text-white/40 truncate">{f.desc}</p>
                                    </div>
                                </div>
                                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${active ? 'bg-emerald-500' : 'bg-white/15'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* 5. Reglas de Conservación al Vencer */}
                <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-300/90 text-[11px] font-bold">
                        <Clock size={13} className="shrink-0" />
                        <span>Conservación mínima si vence el periodo del memorial</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {EXPIRED_LIMIT_FIELDS.map((f) => {
                            const Icon = f.icon;
                            const val = Number(draft.features[f.key] ?? 0);
                            return (
                                <div key={f.key} className="flex items-center justify-between gap-2 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/75">
                                        <Icon size={13} className="text-amber-400" />
                                        {f.label}
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-14 text-center bg-black/50 border border-white/10 rounded-lg py-1 text-xs font-black text-amber-300 outline-none focus:border-amber-400"
                                        value={val}
                                        onChange={(e) => setF(f.key, Math.max(0, Number(e.target.value) || 0))}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer de guardado */}
            <div className="pt-4 border-t border-white/10 space-y-2.5">
                {priceChanged && !partner && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[11px] text-amber-200">
                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                        <span>
                            El nuevo precio se aplicará solo a contratos futuros; las familias actuales conservan su tarifa congelada.
                        </span>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        {msg ? (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {msg.ok && <Check size={14} />}
                                {msg.text}
                            </span>
                        ) : dirty ? (
                            <span className="text-xs font-semibold text-amber-300/90">
                                ● Hay cambios sin guardar
                            </span>
                        ) : (
                            <span className="text-xs text-white/35">
                                Sin cambios pendientes
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {dirty && (
                            <button
                                type="button"
                                onClick={reset}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <RotateCcw size={13} /> Descartar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={save}
                            disabled={!dirty || saving}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                                dirty
                                    ? 'bg-gradient-to-r from-[#19B5FE] to-[#E0B84D] text-slate-950 shadow-lg shadow-[#19B5FE]/20 hover:brightness-110'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Guardar plan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Estudio completo de Planes y Precios de Memoriales.
 * Se puede renderizar como vista dedicada en /admin/dashboard/memorials o dentro de un modal.
 */
export function MemorialPlansStudio({ onBack }: { onBack?: () => void }) {
    const [plans, setPlans] = useState<CatalogPlan[] | null>(null);
    const [filter, setFilter] = useState<'all' | 'vinzer' | 'partner'>('all');
    const [error, setError] = useState<string | null>(null);
    const [globalPct, setGlobalPct] = useState<number>(20);
    const [globalLabel, setGlobalLabel] = useState<string>('');
    const [applyingGlobal, setApplyingGlobal] = useState<boolean>(false);
    const [globalMsg, setGlobalMsg] = useState<string | null>(null);

    useEffect(() => {
        apiRequest('/api/internal/creator/memorials/plan-catalog')
            .then((rows: CatalogPlan[]) => {
                setPlans(rows);
                const firstVinzer = rows.find((r) => r.kind !== 'partner' && (r.discount_percent || 0) > 0);
                if (firstVinzer) {
                    setGlobalPct(Number(firstVinzer.discount_percent || 0));
                    setGlobalLabel(firstVinzer.discount_label || '');
                }
            })
            .catch((e) => setError(e.message));
    }, []);

    const vinzerPlans = (plans || []).filter((p) => p.kind !== 'partner');
    const totalMemorials = (plans || []).reduce((acc, p) => acc + (p.memorials || 0), 0);
    const vinzerPlansCount = vinzerPlans.length;
    const activeVinzerCount = vinzerPlans.filter((p) => p.is_active).length;
    const anyDiscountActive = vinzerPlans.some((p) => (p.discount_percent || 0) > 0);

    const applyGlobalDiscount = async (pct: number, label: string) => {
        setApplyingGlobal(true);
        setGlobalMsg(null);
        setError(null);
        try {
            const updated: CatalogPlan[] = await apiRequest('/api/internal/creator/memorials/plan-catalog/global-discount', {
                method: 'POST',
                body: {
                    discount_percent: Math.min(95, Math.max(0, Number(pct) || 0)),
                    discount_label: pct > 0 ? label.trim() : '',
                },
            });
            setPlans(updated);
            setGlobalPct(pct);
            if (pct === 0) setGlobalLabel('');
            setGlobalMsg(
                pct > 0
                    ? `Descuento del ${pct}% aplicado a todos los planes Vinzer`
                    : 'Se quitaron los descuentos de todos los planes'
            );
            setTimeout(() => setGlobalMsg(null), 4000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo aplicar el descuento global.');
        } finally {
            setApplyingGlobal(false);
        }
    };

    const filteredPlans = (plans || []).filter((p) => {
        if (filter === 'vinzer') return p.kind !== 'partner';
        if (filter === 'partner') return p.kind === 'partner';
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Banner informativo y KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#19B5FE]/15 text-[#38BDF8] flex items-center justify-center shrink-0">
                        <Tags size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Planes de Venta Directa</p>
                        <p className="text-2xl font-black text-white">
                            {activeVinzerCount} <span className="text-sm font-semibold text-white/40">/ {vinzerPlansCount} visibles</span>
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E0B84D]/15 text-[#E0B84D] flex items-center justify-center shrink-0">
                        <Crown size={22} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Memoriales en Catálogo</p>
                        <p className="text-2xl font-black text-white">
                            {totalMemorials} <span className="text-sm font-semibold text-white/40">activos o históricos</span>
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 flex items-start gap-3.5">
                    <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-white/70 leading-relaxed">
                        <strong className="text-white block mb-0.5">Precio congelado por contrato</strong>
                        Lo que paga cada familia queda congelado en su memorial; ajustar límites multimedia sí beneficia a todos de inmediato.
                    </div>
                </div>
            </div>

            {/* Panel de Descuento Global para Todos los Planes */}
            <div className="rounded-3xl border border-[#19B5FE]/25 bg-gradient-to-r from-[#19B5FE]/[0.07] via-[#0b101b] to-[#E0B84D]/[0.07] p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#19B5FE]/20 to-[#E0B84D]/20 border border-[#19B5FE]/30 text-[#38BDF8] flex items-center justify-center shrink-0">
                            <Percent size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-black text-white">
                                    Descuento Global para Todos los Planes
                                </h3>
                                {anyDiscountActive && (
                                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                                        Promoción activa
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-white/50">
                                Aplica un porcentaje de descuento simultáneo a todos los planes de venta directa Vinzer (se muestra el precio original tachado y el nuevo valor en la web pública).
                            </p>
                        </div>
                    </div>

                    {anyDiscountActive && (
                        <button
                            type="button"
                            disabled={applyingGlobal}
                            onClick={() => applyGlobalDiscount(0, '')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                        >
                            <RotateCcw size={13} /> Quitar todos los descuentos
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                    {/* Presets rápidos */}
                    <div className="lg:col-span-5 space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/45">
                            Porcentaje rápido o personalizado
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[10, 15, 20, 25, 30, 40, 50].map((pct) => (
                                <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setGlobalPct(pct)}
                                    className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                                        globalPct === pct
                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                                            : 'bg-black/40 text-white/70 border-white/10 hover:border-white/25 hover:text-white'
                                    }`}
                                >
                                    -{pct}%
                                </button>
                            ))}
                            <div className="flex items-center gap-1 rounded-xl bg-black/50 border border-white/15 px-2.5 py-1.5">
                                <input
                                    type="number"
                                    min={0}
                                    max={95}
                                    value={globalPct}
                                    onChange={(e) => setGlobalPct(Math.min(95, Math.max(0, Number(e.target.value) || 0)))}
                                    className="w-12 bg-transparent text-xs font-black text-emerald-300 outline-none text-center"
                                />
                                <span className="text-xs font-bold text-white/40">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Etiqueta promocional */}
                    <div className="lg:col-span-4 space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/45">
                            Etiqueta promocional (opcional)
                        </label>
                        <input
                            className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#19B5FE]"
                            placeholder="Ej: Oferta Lanzamiento · Especial Aniversario"
                            maxLength={40}
                            value={globalLabel}
                            onChange={(e) => setGlobalLabel(e.target.value)}
                        />
                    </div>

                    {/* Botón aplicar a todos */}
                    <div className="lg:col-span-3 flex justify-end">
                        <button
                            type="button"
                            disabled={applyingGlobal || !plans}
                            onClick={() => applyGlobalDiscount(globalPct, globalLabel)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-[#19B5FE] to-[#E0B84D] px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-[#19B5FE]/20 hover:brightness-110 transition-all disabled:opacity-50"
                        >
                            {applyingGlobal ? <Loader2 size={14} className="animate-spin" /> : <Percent size={14} />}
                            Aplicar -{globalPct}% a todos los planes
                        </button>
                    </div>
                </div>

                {/* Simulación en vivo de cómo quedan todos los planes */}
                {vinzerPlans.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-bold text-white/45 mr-1">Vista previa con -{globalPct}%:</span>
                        {vinzerPlans.map((vp) => {
                            const finalPreview = computeFinalPrice(vp.price, globalPct, vp.currency);
                            return (
                                <div
                                    key={vp.id}
                                    className="inline-flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 text-xs"
                                >
                                    <span className="font-bold text-white">{vp.name}:</span>
                                    {globalPct > 0 && (
                                        <span className="text-white/35 line-through">{formatMoney(vp.price, vp.currency)}</span>
                                    )}
                                    <span className="font-black text-emerald-300">{formatMoney(finalPreview, vp.currency)}</span>
                                </div>
                            );
                        })}
                        {globalMsg && (
                            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                <Check size={14} /> {globalMsg}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Barra de filtros y regreso */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
                    {([
                        ['all', 'Todos los planes'],
                        ['vinzer', 'Venta Directa Vinzer'],
                        ['partner', 'Crematorios (Partner)'],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                filter === key
                                    ? 'bg-gradient-to-r from-[#19B5FE] to-[#E0B84D] text-slate-950 shadow-md'
                                    : 'text-white/55 hover:text-white'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <ArrowLeft size={14} /> Volver al listado de memoriales
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                    {error}
                </div>
            )}

            {!plans && !error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/50">
                    <Loader2 className="animate-spin text-[#19B5FE]" size={28} />
                    <span className="text-sm font-medium">Cargando catálogo de planes y precios…</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredPlans.map((p) => (
                        <PlanEditorCard
                            key={p.id}
                            plan={p}
                            onSaved={(np) => setPlans((all) => all?.map((x) => (x.id === np.id ? np : x)) ?? null)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function MemorialPlansModal({ onClose }: { onClose: () => void }) {
    return (
        <Shell
            title="Planes y precios de memoriales"
            subtitle="Configura precios, modalidad de cobro y capacidad multimedia de cada plan."
            onClose={onClose}
            maxWidth="max-w-6xl"
            dark
        >
            <div className="max-h-[78vh] overflow-y-auto pr-1">
                <MemorialPlansStudio />
            </div>
        </Shell>
    );
}
