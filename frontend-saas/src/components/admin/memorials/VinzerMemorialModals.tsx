'use client';

/**
 * Admin → Memoriales: «Nuevo memorial» (el SuperAdmin lo crea con el mismo formulario
 * que la familia, opcionalmente activo al instante) y «Enlaces para familias»
 * (invitaciones de un solo uso a memorial.<dominio>/crear?i=…, sin reCAPTCHA).
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, Trash2, X } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import MemorialCreateForm, { type MemorialCreateResult, type MemorialSignupOptions } from '@/components/memorial/create/MemorialCreateForm';

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7" onClick={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
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
    activo: 'bg-emerald-100 text-emerald-700',
    usado: 'bg-slate-100 text-slate-600',
    vencido: 'bg-rose-100 text-rose-700',
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

    const field = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500';

    return (
        <Shell title="Enlaces para familias" onClose={onClose}>
            <p className="mb-4 text-sm text-slate-600">
                Genera un enlace de un solo uso para que la familia cree su memorial (fotos, diseño, música y plan). Queda pendiente hasta que lo actives.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_110px_auto]">
                <input className={field} maxLength={200} placeholder="Nota (p. ej. Familia Soto)" value={note} onChange={(e) => setNote(e.target.value)} />
                <select className={field} value={plan} onChange={(e) => setPlan(e.target.value)}>
                    <option value="">La familia elige</option>
                    <option value="mensual">Mensual</option>
                    <option value="anual">Anual</option>
                    <option value="eterno">Eterno</option>
                </select>
                <select className={field} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                    {[3, 7, 15, 30].map((d) => <option key={d} value={d}>{d} días</option>)}
                </select>
                <button type="button" onClick={create} disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Crear y copiar
                </button>
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <div className="mt-6 max-h-[45vh] space-y-2 overflow-y-auto">
                {!invites ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : invites.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-400">Aún no hay enlaces.</p>
                ) : invites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{inv.note || 'Sin nota'}</p>
                            <p className="text-xs text-slate-500">
                                {inv.plan ? `Plan ${inv.plan}` : 'Plan a elección'} · vence {new Date(inv.expires_at).toLocaleDateString('es-CL')}
                            </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_CLS[inv.status]}`}>{inv.status}</span>
                        {inv.status === 'activo' && (
                            <button type="button" onClick={() => copy(inv)} aria-label="Copiar enlace" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                                {copied === inv.id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                            </button>
                        )}
                        {!inv.used_at && (
                            <button type="button" onClick={() => revoke(inv)} aria-label="Eliminar enlace" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50">
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </Shell>
    );
}

// ───────────────────────── Planes y precios ─────────────────────────

interface CatalogPlan {
    id: number;
    key: string;
    name: string;
    kind: string;
    price: number;
    currency: string;
    billing: string;
    description: string | null;
    highlight: boolean;
    sort_order: number;
    is_active: boolean;
    memorials: number;
    features: Record<string, number | boolean>;
}

const LIMIT_FIELDS: { key: string; label: string; hint?: string }[] = [
    { key: 'max_images', label: 'Fotos de la galería' },
    { key: 'max_dedications', label: 'Mensajes publicados', hint: 'Velas, flores y besos son ilimitados' },
    { key: 'max_dedication_chars', label: 'Caracteres por mensaje' },
    { key: 'max_melodies', label: 'Melodías a elegir' },
    { key: 'max_timeline', label: 'Momentos de la línea de tiempo' },
    { key: 'max_videos', label: 'Videos de 30 s' },
    { key: 'max_voice', label: 'Audios de su voz (30 s)' },
    { key: 'expired_images', label: 'Fotos visibles si vence' },
    { key: 'expired_dedications', label: 'Mensajes visibles si vence' },
];
const TOGGLE_FIELDS = [
    { key: 'qr', label: 'Código QR descargable' },
    { key: 'timeline', label: 'Línea de tiempo' },
];

function PlanEditor({ plan, onSaved }: { plan: CatalogPlan; onSaved: (p: CatalogPlan) => void }) {
    const [draft, setDraft] = useState<CatalogPlan>(plan);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const partner = plan.kind === 'partner';
    const dirty = JSON.stringify(draft) !== JSON.stringify(plan);
    const priceChanged = draft.price !== plan.price || draft.billing !== plan.billing;
    const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500';
    const setF = (k: string, v: number | boolean) => setDraft({ ...draft, features: { ...draft.features, [k]: v } });

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await apiRequest(`/api/internal/creator/memorials/plan-catalog/${plan.id}`, {
                method: 'PUT',
                body: {
                    name: draft.name, description: draft.description || '', features: draft.features,
                    ...(partner ? {} : { price: Number(draft.price), currency: draft.currency, billing: draft.billing, highlight: draft.highlight, is_active: draft.is_active }),
                },
            });
            onSaved({ ...draft, ...res, memorials: plan.memorials });
            setMsg({ ok: true, text: 'Guardado' });
        } catch (e) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo guardar.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`rounded-2xl border p-4 ${draft.highlight ? 'border-amber-300' : 'border-slate-200'}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <input className={`${field} max-w-[180px] font-bold`} value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${partner ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
                    {partner ? 'Crematorios' : 'Venta Vinzer'}
                </span>
                <span className="text-xs text-slate-500">{plan.memorials} memorial{plan.memorials === 1 ? '' : 'es'}</span>
                {!partner && (
                    <label className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <input type="checkbox" className="accent-amber-500" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
                        Visible
                    </label>
                )}
            </div>

            {!partner && (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="text-[11px] font-bold uppercase text-slate-500">Precio
                        <input type="number" min={0} step="0.01" className={field} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
                    </label>
                    <label className="text-[11px] font-bold uppercase text-slate-500">Moneda
                        <select className={field} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                            <option value="USD">USD</option>
                            <option value="CLP">CLP</option>
                        </select>
                    </label>
                    <label className="text-[11px] font-bold uppercase text-slate-500">Cobro
                        <select className={field} value={draft.billing} onChange={(e) => setDraft({ ...draft, billing: e.target.value })}>
                            <option value="yearly">Anual</option>
                            <option value="one_time">Pago único</option>
                        </select>
                    </label>
                    <label className="flex items-end gap-1.5 pb-2 text-xs font-semibold text-slate-600">
                        <input type="checkbox" className="accent-amber-500" checked={draft.highlight} onChange={(e) => setDraft({ ...draft, highlight: e.target.checked })} />
                        Recomendado
                    </label>
                </div>
            )}

            <input className={`${field} mb-3`} placeholder="Frase corta (landing)" maxLength={300} value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LIMIT_FIELDS.map((f) => (
                    <label key={f.key} className="text-[11px] font-bold uppercase text-slate-500" title={f.hint}>
                        {f.label}
                        <input type="number" min={0} className={field} value={Number(draft.features[f.key] ?? 0)}
                            onChange={(e) => setF(f.key, Math.max(0, Number(e.target.value) || 0))} />
                    </label>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
                {TOGGLE_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <input type="checkbox" className="accent-amber-500" checked={Boolean(draft.features[f.key])} onChange={(e) => setF(f.key, e.target.checked)} />
                        {f.label}
                    </label>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                {priceChanged && !partner && (
                    <p className="text-xs text-amber-700">El precio nuevo aplica solo a contratos nuevos; los clientes actuales mantienen su precio.</p>
                )}
                {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
                <button type="button" onClick={save} disabled={!dirty || saving}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                    {saving && <Loader2 size={14} className="animate-spin" />} Guardar
                </button>
            </div>
        </div>
    );
}

export function MemorialPlansModal({ onClose }: { onClose: () => void }) {
    const [plans, setPlans] = useState<CatalogPlan[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiRequest('/api/internal/creator/memorials/plan-catalog').then(setPlans).catch((e) => setError(e.message));
    }, []);

    return (
        <Shell title="Planes y precios de memoriales" onClose={onClose}>
            <p className="mb-4 text-sm text-slate-600">
                Precio, cobro y límites de cada plan. Lo que paga cada familia queda congelado en su memorial; los límites sí se aplican a todos.
                «Partner» es el plan de los memoriales creados por crematorios.
            </p>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {!plans && !error ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : (
                <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                    {plans?.map((p) => (
                        <PlanEditor key={p.id} plan={p} onSaved={(np) => setPlans((all) => all?.map((x) => (x.id === np.id ? np : x)) ?? null)} />
                    ))}
                </div>
            )}
        </Shell>
    );
}
