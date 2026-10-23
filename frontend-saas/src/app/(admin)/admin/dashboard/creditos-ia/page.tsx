"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Coins, BarChart3, Wallet, History, Settings2, Gift, Loader2, X, CheckCircle2, AlertCircle, Save, ChevronLeft, ChevronRight,
    Inbox, Check, RefreshCw, Server, AlertTriangle, Bell,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import GrantCreditsModal from '@/components/admin/aiCredits/GrantCreditsModal';

const BASE = '/api/internal/creator/ai-credits';

type Tab = 'resumen' | 'solicitudes' | 'saldos' | 'historial' | 'config';

interface ReportRow {
    tenant_id: number;
    tenant_name: string | null;
    credits_consumed: number;
    attempts: number;
    texts: number;
    images: number;
    images_saved: number;
    failed: number;
    cost_usd: number;
    credits_value_usd: number;
    margin_usd: number;
}

interface Report {
    period: string;
    credit_price_usd: number;
    totals: Omit<ReportRow, 'tenant_id' | 'tenant_name'>;
    items: ReportRow[];
    by_model: {
        kind: string; model: string; count: number; cost_usd: number;
        avg_seconds: number | null; median_seconds: number | null; max_seconds: number | null;
    }[];
    /** Ejecuciones de "Generar todo" del periodo. */
    document_runs?: {
        count: number; with_errors: number; avg_seconds: number | null; max_seconds: number | null;
        credits_used: number; ai_cost_usd: number;
        steps: { key: string; count: number; avg_seconds: number }[];
    };
}

const RUN_STEP_LABELS: Record<string, string> = {
    cliente: 'Cliente', mascota: 'Mascota', orden: 'Orden', certificate: 'Certificado', digital: 'Imagen digital', social: 'Imagen redes',
};

interface BalanceRow {
    tenant_id: number;
    tenant_name: string;
    plan: string | null;
    plan_monthly_credits: number;
    monthly_remaining: number;
    extra_remaining: number;
    available: number;
    designs_this_month: number;
}

interface LedgerRow {
    id: number;
    tenant_id: number;
    tenant_name: string | null;
    bucket: 'monthly' | 'extra';
    delta: number;
    reason: string;
    note: string | null;
    created_by: string | null;
    created_at: string;
}

interface Settings {
    credit_price_usd: number;
    attempts_per_credit: number;
    session_days: number;
    usd_clp_rate: number | null;
}

interface PlanRow { id: number; name: string; is_active: boolean; ai_monthly_credits: number; ai_extra_credit_price_usd: number | null }

interface PurchaseRow {
    id: number;
    tenant_id: number;
    tenant_name: string | null;
    requested_by: string | null;
    quantity: number;
    total_usd: number;
    total_clp: number | null;
    method: 'transfer' | 'other';
    reference: string | null;
    note: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    review_note: string | null;
    created_at: string;
}

const PURCHASE_STATUS: Record<PurchaseRow['status'], { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-300' },
    approved: { label: 'Aprobada', cls: 'bg-emerald-500/15 text-emerald-300' },
    rejected: { label: 'Rechazada', cls: 'bg-red-500/15 text-red-300' },
    cancelled: { label: 'Cancelada', cls: 'bg-white/10 text-white/50' },
};

const REASONS: Record<string, string> = {
    monthly_grant: 'Créditos del plan',
    monthly_expire: 'Vencen créditos del mes',
    gift: 'Regalo',
    purchase: 'Compra',
    consume: 'Uso (diseño)',
    refund: 'Devolución',
    adjust: 'Ajuste',
};

const usd = (n: number, digits = 2) => `USD ${n.toLocaleString('es-CL', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 4) })}`;
const currentPeriod = () => new Date().toISOString().slice(0, 7);

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl';
const inputCls = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/60';
const thCls = 'text-left text-[11px] font-bold uppercase tracking-wider text-white/40 px-4 py-3';
const tdCls = 'px-4 py-3 text-sm text-white/80';

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' }) {
    return (
        <div className={`${cardCls} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
            <p className={`text-2xl font-black mt-1 ${tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-white'}`}>{value}</p>
            {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
        </div>
    );
}

export default function CreditosIaPage() {
    const [tab, setTab] = useState<Tab>('resumen');
    const { data: pendingData } = useQuery<{ pending: number }>({
        queryKey: ['admin', 'ai-credits', 'purchases', 'pending-count'],
        queryFn: () => apiRequest(`${BASE}/purchases?status=pending&page_size=1`),
    });
    const pending = pendingData?.pending ?? 0;
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const flash = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-bold backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-red-500/15 border-red-500/30 text-red-300'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.text}
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Coins className="text-primary" size={28} /> Créditos IA
                </h1>
                <p className="text-white/50 mt-2 text-sm max-w-3xl">
                    1 crédito = 1 diseño con IA (plantilla + mascota) con varios intentos. Los planes entregan créditos cada mes
                    (no se acumulan); los regalos y compras van al saldo extra, que no vence.
                </p>
            </div>

            <div className="flex flex-wrap gap-1 mb-6 bg-white/5 p-1 rounded-xl w-fit">
                {([['resumen', 'Resumen', BarChart3], ['solicitudes', 'Solicitudes', Inbox], ['saldos', 'Saldos', Wallet], ['historial', 'Historial', History], ['config', 'Configuración', Settings2]] as const).map(([key, label, Icon]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === key ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}>
                        <Icon size={15} /> {label}
                        {key === 'solicitudes' && pending > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-black text-[11px] font-black flex items-center justify-center">{pending}</span>
                        )}
                    </button>
                ))}
            </div>

            {tab === 'resumen' && <ReportTab />}
            {tab === 'solicitudes' && <PurchasesTab flash={flash} />}
            {tab === 'saldos' && <BalancesTab flash={flash} />}
            {tab === 'historial' && <LedgerTab />}
            {tab === 'config' && <ConfigTab flash={flash} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Saldo real en las plataformas IA (consultado en vivo)
// ---------------------------------------------------------------------------

interface ProviderBalance {
    provider: string;
    key_hint: string | null;
    connections: string[];
    models: string[];
    supported: boolean;
    account?: { total_usd: number; used_usd: number; remaining_usd: number };
    key_limit?: { limit_usd: number; used_usd: number; remaining_usd: number };
    avg_image_cost_usd: number | null;
    recorded_cost_usd: number;
    error?: string;
}

const PROVIDER_LABEL: Record<string, string> = { openrouter: 'OpenRouter', gemini: 'Google Gemini', anthropic: 'Claude', openai: 'ChatGPT', deepseek: 'DeepSeek' };

function ProviderBalances() {
    const { data, isLoading, isFetching, refetch, error } = useQuery<{ items: ProviderBalance[]; checked_at: string; alert_usd: number | null }>({
        queryKey: ['admin', 'ai-credits', 'provider-balances'],
        queryFn: () => apiRequest(`${BASE}/provider-balances`),
        staleTime: 60_000,
    });

    return (
        <div className={`${cardCls} p-5 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-white font-bold flex items-center gap-2"><Server size={16} className="text-primary" /> Saldo en plataformas IA</h3>
                    <p className="text-[11px] text-white/40">
                        Consultado en vivo con la clave guardada en Plataformas IA
                        {data ? ` · ${new Date(data.checked_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}` : ''}.
                    </p>
                </div>
                <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold disabled:opacity-50">
                    <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            {isLoading ? (
                <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-primary" size={22} /></div>
            ) : error || !data ? (
                <p className="text-red-300 text-sm">{(error as Error)?.message || 'No se pudo consultar el saldo'}</p>
            ) : data.items.length === 0 ? (
                <p className="text-white/40 text-sm">No hay plataformas IA activas.</p>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {data.items.map((b) => {
                        const acc = b.account;
                        // Lo que de verdad se puede gastar: el menor entre la cuenta y el tope de la clave.
                        const usable = acc ? Math.min(acc.remaining_usd, b.key_limit?.remaining_usd ?? Infinity) : null;
                        const pctUsed = acc && acc.total_usd > 0 ? Math.min(100, (acc.used_usd / acc.total_usd) * 100) : 0;
                        const images = usable != null && b.avg_image_cost_usd ? Math.floor(usable / b.avg_image_cost_usd) : null;
                        const low = usable != null && usable < (data.alert_usd || 1);
                        return (
                            <div key={`${b.provider}${b.key_hint}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white">{PROVIDER_LABEL[b.provider] || b.provider}</p>
                                        <p className="text-[11px] text-white/40 truncate" title={b.models.join(', ')}>
                                            {b.connections.length} {b.connections.length === 1 ? 'conexión' : 'conexiones'} · clave {b.key_hint || '—'} · {b.models.join(', ')}
                                        </p>
                                    </div>
                                    {usable != null && (
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${low ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                                            {low ? 'Saldo bajo' : 'OK'}
                                        </span>
                                    )}
                                </div>

                                {!b.supported ? (
                                    <p className="text-xs text-white/50">Esta plataforma no informa su saldo por API: revísalo en su panel.</p>
                                ) : b.error ? (
                                    <p className="text-xs text-red-300">{b.error}</p>
                                ) : acc && (
                                    <>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div><p className="text-[10px] uppercase font-bold text-white/40">Cargado</p><p className="text-lg font-black text-white">{usd(acc.total_usd)}</p></div>
                                            <div><p className="text-[10px] uppercase font-bold text-white/40">Gastado</p><p className="text-lg font-black text-amber-300">{usd(acc.used_usd)}</p></div>
                                            <div><p className="text-[10px] uppercase font-bold text-white/40">Disponible</p><p className={`text-lg font-black ${low ? 'text-red-400' : 'text-emerald-400'}`}>{usd(acc.remaining_usd)}</p></div>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${pctUsed}%` }} /></div>

                                        {b.key_limit && b.key_limit.remaining_usd < acc.remaining_usd && (
                                            <p className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5">
                                                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                                <span>
                                                    Esta clave tiene un tope propio de {usd(b.key_limit.limit_usd)} y le quedan {usd(b.key_limit.remaining_usd)}.
                                                    Al llegar al tope deja de funcionar aunque la cuenta tenga saldo: súbelo o quítalo en openrouter.ai, sección Keys.
                                                </span>
                                            </p>
                                        )}
                                        {images != null && (
                                            <p className="text-xs text-white/60">
                                                Alcanza para <b className="text-white">≈ {images.toLocaleString('es-CL')} imágenes</b> más
                                                (costo promedio {usd(b.avg_image_cost_usd!, 4)} c/u, últimos 30 días).
                                            </p>
                                        )}
                                        <p className="text-[11px] text-white/40">
                                            Registrado en Vinzer: {usd(b.recorded_cost_usd, 4)}. La diferencia con lo gastado son pruebas del admin o uso de la clave fuera de Vinzer.
                                        </p>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {data && <BalanceAlertField current={data.alert_usd} />}
        </div>
    );
}

/** Umbral del aviso automático de saldo bajo (correo + notificación, revisado cada 6 h). */
function BalanceAlertField({ current }: { current: number | null }) {
    const qc = useQueryClient();
    const [value, setValue] = useState(current != null ? String(current) : '');
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const save = useMutation({
        mutationFn: () => {
            const n = value.trim() === '' ? null : Number(value.replace(',', '.'));
            if (n != null && (!Number.isFinite(n) || n < 0)) throw new Error('Ingresa un monto válido');
            return apiRequest(`${BASE}/balance-alert`, { method: 'PUT', body: { alert_usd: n } });
        },
        onSuccess: (res: { alert_usd: number | null; alerts_sent: unknown[] }) => {
            qc.invalidateQueries({ queryKey: ['admin', 'ai-credits', 'provider-balances'] });
            setMsg({
                ok: true,
                text: !res.alert_usd ? 'Aviso desactivado.'
                    : res.alerts_sent.length ? 'Guardado. El saldo ya está bajo ese monto: te enviamos el aviso.'
                    : 'Guardado. Te avisaremos cuando baje de ese monto.',
            });
        },
        onError: (e: Error) => setMsg({ ok: false, text: e.message }),
    });

    return (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
            <Bell size={15} className="text-amber-300 shrink-0" />
            <label htmlFor="balance-alert" className="text-xs text-white/70">
                Avisarme por correo cuando queden menos de
            </label>
            <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white/50">USD</span>
                <input id="balance-alert" type="text" inputMode="decimal" value={value} placeholder="Sin aviso"
                    onChange={(e) => { setValue(e.target.value); setMsg(null); }}
                    className={`${inputCls} w-24`} />
            </div>
            <button onClick={() => save.mutate()} disabled={save.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-50">
                {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
            </button>
            <p className={`basis-full text-[11px] ${msg ? (msg.ok ? 'text-emerald-300' : 'text-red-300') : 'text-white/40'}`}>
                {msg?.text || 'Se revisa cada 6 horas. Llega al «Correo para recibir mensajes» (Datos del SaaS) y como notificación del admin; también avisa si la clave deja de responder. Vacío = sin aviso.'}
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Resumen: gasto real vs. valor de los créditos
// ---------------------------------------------------------------------------

function ReportTab() {
    const [period, setPeriod] = useState(currentPeriod());
    const { data, isLoading, error } = useQuery<Report>({
        queryKey: ['admin', 'ai-credits', 'report', period],
        queryFn: () => apiRequest(`${BASE}/report?period=${period}`),
    });

    return (
        <div className="space-y-6">
            <ProviderBalances />

            <div className="flex items-center gap-3">
                <label className="text-sm text-white/60">Mes</label>
                <input type="month" value={period} max={currentPeriod()} onChange={(e) => e.target.value && setPeriod(e.target.value)} className={inputCls} />
            </div>

            {isLoading ? (
                <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : error || !data ? (
                <p className="text-red-300 text-sm">{(error as Error)?.message || 'No se pudo cargar el reporte'}</p>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Kpi label="Créditos usados" value={String(data.totals.credits_consumed)} hint={`${data.totals.attempts} intentos`} />
                        <Kpi label="Valor de los créditos" value={usd(data.totals.credits_value_usd)} hint={`a ${usd(data.credit_price_usd)} por crédito`} />
                        <Kpi label="Costo real IA" value={usd(data.totals.cost_usd, 4)} hint={`${data.totals.texts} textos · ${data.totals.images} imágenes`} />
                        <Kpi label="Margen" value={usd(data.totals.margin_usd, 2)} tone={data.totals.margin_usd >= 0 ? 'good' : 'bad'}
                            hint={`${data.totals.images_saved} imágenes guardadas · ${data.totals.failed} fallidas`} />
                    </div>
                    <p className="text-[11px] text-white/40">
                        El valor usa el precio actual del crédito. El costo real es el registrado en cada generación (el que informa la
                        plataforma o el «costo por uso» configurado en Plataformas IA). Las generaciones de prueba del admin no cuentan.
                    </p>

                    <div className={`${cardCls} overflow-x-auto`}>
                        <table className="w-full">
                            <thead className="border-b border-white/10">
                                <tr>
                                    <th className={thCls}>Crematorio</th>
                                    <th className={thCls}>Créditos</th>
                                    <th className={thCls}>Intentos</th>
                                    <th className={thCls}>Textos</th>
                                    <th className={thCls}>Imágenes (guardadas)</th>
                                    <th className={thCls}>Costo real</th>
                                    <th className={thCls}>Valor</th>
                                    <th className={thCls}>Margen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.length === 0 && (
                                    <tr><td colSpan={8} className="text-center text-white/40 text-sm py-10">Sin uso de IA en este mes.</td></tr>
                                )}
                                {data.items.map(r => (
                                    <tr key={r.tenant_id} className="border-b border-white/5">
                                        <td className={`${tdCls} font-semibold text-white`}>{r.tenant_name || `#${r.tenant_id}`}</td>
                                        <td className={tdCls}>{r.credits_consumed}</td>
                                        <td className={tdCls}>{r.attempts}</td>
                                        <td className={tdCls}>{r.texts}</td>
                                        <td className={tdCls}>{r.images} ({r.images_saved})</td>
                                        <td className={tdCls}>{usd(r.cost_usd, 4)}</td>
                                        <td className={tdCls}>{usd(r.credits_value_usd)}</td>
                                        <td className={`${tdCls} font-bold ${r.margin_usd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{usd(r.margin_usd)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {data.by_model.length > 0 && (
                        <div className={`${cardCls} overflow-x-auto`}>
                            <p className="px-4 pt-4 text-sm font-bold text-white">Costo y tiempo por modelo</p>
                            <p className="px-4 text-[11px] text-white/40">Tiempo que tarda la plataforma en responder cada generación (las anteriores a la medición no tienen dato).</p>
                            <table className="w-full">
                                <thead className="border-b border-white/10">
                                    <tr>
                                        <th className={thCls}>Tipo</th><th className={thCls}>Modelo</th><th className={thCls}>Generaciones</th>
                                        <th className={thCls}>Costo</th><th className={thCls}>Promedio</th><th className={thCls}>Mediana</th><th className={thCls}>Máximo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.by_model.map(m => (
                                        <tr key={`${m.kind}-${m.model}`} className="border-b border-white/5">
                                            <td className={tdCls}>{m.kind === 'image' ? 'Ilustración' : 'Texto'}</td>
                                            <td className={`${tdCls} font-mono text-xs`}>{m.model}</td>
                                            <td className={tdCls}>{m.count}</td>
                                            <td className={tdCls}>{usd(m.cost_usd, 4)}</td>
                                            <td className={tdCls}>{m.avg_seconds != null ? `${m.avg_seconds} s` : '—'}</td>
                                            <td className={tdCls}>{m.median_seconds != null ? `${m.median_seconds} s` : '—'}</td>
                                            <td className={tdCls}>{m.max_seconds != null ? `${m.max_seconds} s` : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {data.document_runs && data.document_runs.count > 0 && (
                        <div className={`${cardCls} p-4 space-y-3`}>
                            <div>
                                <p className="text-sm font-bold text-white">«Generar todo» desde registros</p>
                                <p className="text-[11px] text-white/40">Registro + certificado + tarjeta + imagen para redes en un clic: tiempo total, por paso y consumo IA.</p>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Kpi label="Ejecuciones" value={String(data.document_runs.count)} hint={`${data.document_runs.with_errors} con algún error`} />
                                <Kpi label="Tiempo promedio" value={data.document_runs.avg_seconds != null ? `${data.document_runs.avg_seconds} s` : '—'}
                                    hint={data.document_runs.max_seconds != null ? `máximo ${data.document_runs.max_seconds} s` : undefined} />
                                <Kpi label="Créditos usados" value={String(data.document_runs.credits_used)} />
                                <Kpi label="Costo real IA" value={usd(data.document_runs.ai_cost_usd, 4)}
                                    hint={`${usd(data.document_runs.ai_cost_usd / data.document_runs.count, 4)} por ejecución`} />
                            </div>
                            {data.document_runs.steps.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {data.document_runs.steps.map(s => (
                                        <span key={s.key} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                                            {RUN_STEP_LABELS[s.key] || s.key}: <b className="text-white">{s.avg_seconds} s</b> <span className="text-white/40">({s.count})</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Saldos y regalos
// ---------------------------------------------------------------------------

function BalancesTab({ flash }: { flash: (t: string, type?: 'success' | 'error') => void }) {
    const qc = useQueryClient();
    const [granting, setGranting] = useState<BalanceRow | null>(null);
    const { data, isLoading } = useQuery<{ period: string; items: BalanceRow[] }>({
        queryKey: ['admin', 'ai-credits', 'balances'],
        queryFn: () => apiRequest(`${BASE}/balances`),
    });

    return (
        <div className="space-y-4">
            <div className={`${cardCls} overflow-x-auto`}>
                <table className="w-full">
                    <thead className="border-b border-white/10">
                        <tr>
                            <th className={thCls}>Crematorio</th>
                            <th className={thCls}>Plan</th>
                            <th className={thCls}>Del mes</th>
                            <th className={thCls}>Extra</th>
                            <th className={thCls}>Disponibles</th>
                            <th className={thCls}>Diseños este mes</th>
                            <th className={thCls}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="animate-spin text-primary inline" /></td></tr>}
                        {data?.items.map(r => (
                            <tr key={r.tenant_id} className="border-b border-white/5">
                                <td className={`${tdCls} font-semibold text-white`}>{r.tenant_name}</td>
                                <td className={tdCls}>{r.plan || '—'}</td>
                                <td className={tdCls}>{r.monthly_remaining} / {r.plan_monthly_credits}</td>
                                <td className={tdCls}>{r.extra_remaining}</td>
                                <td className={`${tdCls} font-black text-white`}>{r.available}</td>
                                <td className={tdCls}>{r.designs_this_month}</td>
                                <td className={`${tdCls} text-right`}>
                                    <button onClick={() => setGranting(r)}
                                        className="inline-flex items-center gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary px-3 py-1.5 rounded-lg text-xs font-bold">
                                        <Gift size={13} /> Regalar / ajustar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[11px] text-white/40">
                «Del mes» muestra lo que queda del plan en {data?.period}. Si el crematorio aún no usa IA este mes, se muestra lo que recibirá.
            </p>

            {granting && (
                <GrantCreditsModal row={granting} onClose={() => setGranting(null)}
                    onDone={(msg) => {
                        setGranting(null);
                        flash(msg);
                        qc.invalidateQueries({ queryKey: ['admin', 'ai-credits'] });
                    }}
                    onError={(msg) => flash(msg, 'error')} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

function LedgerTab() {
    const [tenantId, setTenantId] = useState('');
    const [reason, setReason] = useState('');
    const [page, setPage] = useState(1);
    const { data: balances } = useQuery<{ items: BalanceRow[] }>({
        queryKey: ['admin', 'ai-credits', 'balances'],
        queryFn: () => apiRequest(`${BASE}/balances`),
    });
    const params = new URLSearchParams({ page: String(page), page_size: '50' });
    if (tenantId) params.set('tenant_id', tenantId);
    if (reason) params.set('reason', reason);
    const { data, isLoading } = useQuery<{ total: number; items: LedgerRow[] }>({
        queryKey: ['admin', 'ai-credits', 'ledger', tenantId, reason, page],
        queryFn: () => apiRequest(`${BASE}/ledger?${params.toString()}`),
    });
    const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <select value={tenantId} onChange={(e) => { setTenantId(e.target.value); setPage(1); }} className={inputCls}>
                    <option value="" className="bg-slate-900">Todos los crematorios</option>
                    {balances?.items.map(b => <option key={b.tenant_id} value={b.tenant_id} className="bg-slate-900">{b.tenant_name}</option>)}
                </select>
                <select value={reason} onChange={(e) => { setReason(e.target.value); setPage(1); }} className={inputCls}>
                    <option value="" className="bg-slate-900">Todos los movimientos</option>
                    {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k} className="bg-slate-900">{v}</option>)}
                </select>
            </div>
            <div className={`${cardCls} overflow-x-auto`}>
                <table className="w-full">
                    <thead className="border-b border-white/10">
                        <tr>
                            <th className={thCls}>Fecha</th>
                            <th className={thCls}>Crematorio</th>
                            <th className={thCls}>Movimiento</th>
                            <th className={thCls}>Saldo</th>
                            <th className={thCls}>Cantidad</th>
                            <th className={thCls}>Nota</th>
                            <th className={thCls}>Por</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="animate-spin text-primary inline" /></td></tr>}
                        {data?.items.length === 0 && <tr><td colSpan={7} className="text-center text-white/40 text-sm py-10">Sin movimientos.</td></tr>}
                        {data?.items.map(r => (
                            <tr key={r.id} className="border-b border-white/5">
                                <td className={`${tdCls} whitespace-nowrap text-xs`}>{new Date(r.created_at).toLocaleString('es-CL')}</td>
                                <td className={tdCls}>{r.tenant_name || `#${r.tenant_id}`}</td>
                                <td className={tdCls}>{REASONS[r.reason] || r.reason}</td>
                                <td className={`${tdCls} text-xs`}>{r.bucket === 'monthly' ? 'Mensual' : 'Extra'}</td>
                                <td className={`${tdCls} font-black ${r.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
                                <td className={`${tdCls} text-xs text-white/60`}>{r.note || '—'}</td>
                                <td className={`${tdCls} text-xs text-white/60`}>{r.created_by || 'Sistema'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {pages > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm text-white/60">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    Página {page} de {pages}
                    <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Configuración: precio, intentos, vigencia y créditos por plan
// ---------------------------------------------------------------------------

function ConfigTab({ flash }: { flash: (t: string, type?: 'success' | 'error') => void }) {
    const qc = useQueryClient();
    const { data: settings } = useQuery<Settings>({ queryKey: ['admin', 'ai-credits', 'settings'], queryFn: () => apiRequest(`${BASE}/settings`) });
    const { data: plans } = useQuery<PlanRow[]>({ queryKey: ['admin', 'ai-credits', 'plans'], queryFn: () => apiRequest(`${BASE}/plans`) });

    return (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
            {settings && <SettingsForm key={JSON.stringify(settings)} initial={settings} flash={flash}
                onSaved={() => qc.invalidateQueries({ queryKey: ['admin', 'ai-credits'] })} />}
            <div className={`${cardCls} p-6 space-y-4`}>
                <div>
                    <h3 className="text-white font-bold">Créditos por plan</h3>
                    <p className="text-white/40 text-xs mt-1">
                        <b>Mensuales</b>: se aplican al iniciar el próximo mes de cada crematorio y no se acumulan.
                        {' '}<b>Precio extra</b>: lo que paga ese plan por cada crédito comprado (vacío = valor de referencia).
                        El más alto se muestra tachado a los planes con descuento.
                    </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    <span className="flex-1">Plan</span>
                    <span className="w-20 text-right">Mensuales</span>
                    <span className="w-24 text-right">Extra (USD)</span>
                    <span className="w-[34px]" />
                </div>
                {plans?.map(p => <PlanCreditsRow key={`${p.id}-${p.ai_monthly_credits}-${p.ai_extra_credit_price_usd}`} plan={p} rate={settings?.usd_clp_rate ?? null} flash={flash}
                    onSaved={() => qc.invalidateQueries({ queryKey: ['admin', 'ai-credits'] })} />)}
            </div>
        </div>
    );
}

function SettingsForm({ initial, flash, onSaved }: { initial: Settings; flash: (t: string, type?: 'success' | 'error') => void; onSaved: () => void }) {
    const [price, setPrice] = useState(String(initial.credit_price_usd));
    const [attempts, setAttempts] = useState(String(initial.attempts_per_credit));
    const [days, setDays] = useState(String(initial.session_days));
    const [rate, setRate] = useState(initial.usd_clp_rate ? String(initial.usd_clp_rate) : '');
    const mutation = useMutation({
        mutationFn: () => apiRequest(`${BASE}/settings`, {
            method: 'PUT',
            body: {
                credit_price_usd: Number(price.replace(',', '.')), attempts_per_credit: Number(attempts), session_days: Number(days),
                usd_clp_rate: Number(rate.replace(/\D/g, '')),
            },
        }),
        onSuccess: () => { flash('Configuración guardada'); onSaved(); },
        onError: (e: Error) => flash(e.message || 'No se pudo guardar', 'error'),
    });
    const field = (label: string, value: string, set: (v: string) => void, hint: string) => (
        <div>
            <label className="block text-xs font-bold text-white/50 mb-1.5">{label}</label>
            <input value={value} inputMode="decimal" onChange={(e) => set(e.target.value)} className={`${inputCls} w-full`} />
            <p className="text-[11px] text-white/40 mt-1">{hint}</p>
        </div>
    );
    return (
        <div className={`${cardCls} p-6 space-y-4`}>
            <h3 className="text-white font-bold">Reglas del crédito</h3>
            {field('Valor de referencia del crédito (USD)', price, setPrice, 'Valoriza los créditos usados en el reporte y es el precio de los planes sin precio extra propio.')}
            {field('Tipo de cambio (CLP por 1 USD)', rate, setRate, 'Fijo. Los crematorios ven y pagan en CLP (redondeado hacia arriba a la decena) junto al USD. Las solicitudes ya enviadas conservan su monto.')}
            {field('Intentos por crédito', attempts, setAttempts, 'Cuántas veces se puede generar en un mismo diseño.')}
            {field('Vigencia del diseño (días)', days, setDays, 'Pasado este plazo, el crédito abierto vence aunque queden intentos.')}
            <div className="flex justify-end">
                <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !(Number(rate.replace(/\D/g, '')) > 0)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40">
                    {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
                </button>
            </div>
        </div>
    );
}

function PlanCreditsRow({ plan, rate, flash, onSaved }: {
    plan: PlanRow; rate: number | null; flash: (t: string, type?: 'success' | 'error') => void; onSaved: () => void;
}) {
    const initialPrice = plan.ai_extra_credit_price_usd != null ? String(plan.ai_extra_credit_price_usd) : '';
    const [value, setValue] = useState(String(plan.ai_monthly_credits));
    const [price, setPrice] = useState(initialPrice);
    const priceNum = price.trim() ? Number(price.replace(',', '.')) : null;
    const validPrice = priceNum === null || (Number.isFinite(priceNum) && priceNum >= 0);
    const mutation = useMutation({
        mutationFn: () => apiRequest(`${BASE}/plans/${plan.id}`, {
            method: 'PUT', body: { ai_monthly_credits: Number(value), ai_extra_credit_price_usd: priceNum },
        }),
        onSuccess: () => { flash(`Plan ${plan.name} guardado`); onSaved(); },
        onError: (e: Error) => flash(e.message || 'No se pudo guardar', 'error'),
    });
    const dirty = value !== String(plan.ai_monthly_credits) || price !== initialPrice;
    return (
        <div className="flex items-center gap-3">
            <span className={`flex-1 text-sm font-semibold ${plan.is_active ? 'text-white' : 'text-white/40'}`}>
                {plan.name}{!plan.is_active && ' (inactivo)'}
                {rate && priceNum != null && validPrice && (
                    <span className="block text-[11px] font-normal text-white/40">≈ ${(Math.ceil((priceNum * rate) / 10) * 10).toLocaleString('es-CL')} CLP por crédito</span>
                )}
            </span>
            <input value={value} inputMode="numeric" onChange={(e) => setValue(e.target.value)} className={`${inputCls} w-20 text-right`} aria-label="Créditos mensuales" />
            <input value={price} inputMode="decimal" placeholder="ref." onChange={(e) => setPrice(e.target.value)} className={`${inputCls} w-24 text-right`} aria-label="Precio del crédito extra (USD)" />
            <button onClick={() => mutation.mutate()} disabled={!dirty || mutation.isPending || !/^\d+$/.test(value) || !validPrice}
                className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-30" title="Guardar">
                {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Solicitudes de compra (transferencia u otro medio)
// ---------------------------------------------------------------------------

function PurchasesTab({ flash }: { flash: (t: string, type?: 'success' | 'error') => void }) {
    const qc = useQueryClient();
    const [status, setStatus] = useState('pending');
    const [page, setPage] = useState(1);
    const [rejecting, setRejecting] = useState<PurchaseRow | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const params = new URLSearchParams({ page: String(page), page_size: '50' });
    if (status) params.set('status', status);
    const { data, isLoading } = useQuery<{ total: number; items: PurchaseRow[] }>({
        queryKey: ['admin', 'ai-credits', 'purchases', status, page],
        queryFn: () => apiRequest(`${BASE}/purchases?${params.toString()}`),
    });
    const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1;

    const review = useMutation({
        mutationFn: ({ id, approve, note }: { id: number; approve: boolean; note?: string }) =>
            apiRequest(`${BASE}/purchases/${id}/${approve ? 'approve' : 'reject'}`, { method: 'POST', body: { note: note || null } }),
        onSuccess: (_r, v) => {
            flash(v.approve ? 'Compra aprobada: créditos sumados al saldo extra' : 'Compra rechazada');
            setRejecting(null);
            setRejectNote('');
            qc.invalidateQueries({ queryKey: ['admin', 'ai-credits'] });
        },
        onError: (e: Error) => flash(e.message || 'No se pudo procesar', 'error'),
    });

    const money = (r: PurchaseRow) => r.total_clp ? `$${r.total_clp.toLocaleString('es-CL')} · ${usd(r.total_usd)}` : usd(r.total_usd);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
                    <option value="pending" className="bg-slate-900">Pendientes</option>
                    <option value="approved" className="bg-slate-900">Aprobadas</option>
                    <option value="rejected" className="bg-slate-900">Rechazadas</option>
                    <option value="cancelled" className="bg-slate-900">Canceladas</option>
                    <option value="" className="bg-slate-900">Todas</option>
                </select>
                <p className="text-[11px] text-white/40">Verifica el pago en el banco antes de aprobar. Al aprobar, los créditos se suman al saldo extra del crematorio y se le notifica.</p>
            </div>
            <div className={`${cardCls} overflow-x-auto`}>
                <table className="w-full">
                    <thead className="border-b border-white/10">
                        <tr>
                            <th className={thCls}>Fecha</th>
                            <th className={thCls}>Crematorio</th>
                            <th className={thCls}>Créditos</th>
                            <th className={thCls}>Total</th>
                            <th className={thCls}>Medio / referencia</th>
                            <th className={thCls}>Nota</th>
                            <th className={thCls}>Estado</th>
                            <th className={thCls}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="animate-spin text-primary inline" /></td></tr>}
                        {data?.items.length === 0 && <tr><td colSpan={8} className="text-center text-white/40 text-sm py-10">Sin solicitudes.</td></tr>}
                        {data?.items.map(r => (
                            <tr key={r.id} className="border-b border-white/5 align-top">
                                <td className={`${tdCls} whitespace-nowrap text-xs`}>{new Date(r.created_at).toLocaleString('es-CL')}</td>
                                <td className={tdCls}>
                                    <p className="font-semibold text-white">{r.tenant_name || `#${r.tenant_id}`}</p>
                                    {r.requested_by && <p className="text-[11px] text-white/40">{r.requested_by}</p>}
                                </td>
                                <td className={`${tdCls} font-black text-white`}>{r.quantity}</td>
                                <td className={tdCls}>{money(r)}</td>
                                <td className={`${tdCls} text-xs`}>
                                    {r.method === 'transfer' ? 'Transferencia' : 'Otro medio'}
                                    {r.reference && <p className="font-mono text-white/60">{r.reference}</p>}
                                </td>
                                <td className={`${tdCls} text-xs text-white/60 max-w-[220px]`}>{r.note || '—'}</td>
                                <td className={tdCls}>
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${PURCHASE_STATUS[r.status].cls}`}>{PURCHASE_STATUS[r.status].label}</span>
                                    {r.review_note && <p className="text-[11px] text-white/40 mt-1">{r.review_note}</p>}
                                </td>
                                <td className={`${tdCls} text-right whitespace-nowrap`}>
                                    {r.status === 'pending' && (
                                        <div className="inline-flex gap-1.5">
                                            <button onClick={() => review.mutate({ id: r.id, approve: true })} disabled={review.isPending}
                                                className="inline-flex items-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40">
                                                <Check size={13} /> Aprobar
                                            </button>
                                            <button onClick={() => { setRejecting(r); setRejectNote(''); }} disabled={review.isPending}
                                                className="inline-flex items-center gap-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40">
                                                <X size={13} /> Rechazar
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {pages > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm text-white/60">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    Página {page} de {pages}
                    <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
            )}

            {rejecting && (
                <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRejecting(null)}>
                    <div className="bg-[#0a192f] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white font-bold text-lg">Rechazar compra de {rejecting.quantity} créditos</h3>
                        <p className="text-white/50 text-sm">{rejecting.tenant_name} verá este motivo en su notificación.</p>
                        <textarea value={rejectNote} rows={3} maxLength={500} onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Ej: no encontramos la transferencia; envía el comprobante a pagos@vinzer.cl" className={`${inputCls} w-full`} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setRejecting(null)} className="px-4 py-2 text-white/60 hover:text-white text-sm font-bold">Cancelar</button>
                            <button onClick={() => review.mutate({ id: rejecting.id, approve: false, note: rejectNote.trim() })}
                                disabled={!rejectNote.trim() || review.isPending}
                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40">
                                {review.isPending ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
