"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Receipt, Plus, Search, Download, Calendar, Filter,
    RefreshCw, Loader2, Building2, CreditCard, Copy,
    CheckCircle2, AlertCircle, X, ArrowRight,
    TrendingUp, Zap, ChevronRight, FileText,
    MoreVertical, CheckCheck, Ban, Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { authHeader } from '@/lib/auth/token';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useAdminTenants } from '@/hooks/useAdminBootstrap';
import Pagination from '@/components/admin/Pagination';
import StatusBadge from '@/components/admin/StatusBadge';

// ──────────────── types ────────────────
interface Tx {
    id: number;
    tenant_id: number;
    tenant_name?: string;
    tenant_slug?: string;
    target_plan_name?: string;
    amount: number;
    payment_method: string;
    payment_status: string;
    payment_date?: string;
    payment_reference?: string;
    current_billing_end_date?: string;
    effective_billing_cycle?: string;
    notes?: string;
    created_at: string;
}
interface TxList { transactions: Tx[]; total: number; page: number; page_size: number; total_pages: number; }
interface Summary { completed: Stats; pending: Stats; failed: Stats; refunded: Stats; }
interface Stats { count: number; total_amount: number; avg_amount: number; }
interface PlanInfo { id: number; name: string; price: number; max_pets?: number; }
interface TenantOption { id: number; slug: string; name: string; plan?: string; }

const PAGE_SIZE = 20;
const BILLING_CYCLES = [
    { value: 'monthly', label: 'Mensual (1 mes)', months: 1 },
    { value: 'bimonthly', label: 'Bimestral (2 meses)', months: 2 },
    { value: 'semiannual', label: 'Semestral (6 meses)', months: 6 },
    { value: 'annual', label: 'Anual (12 meses)', months: 12 },
];
const PAYMENT_METHODS = [
    { value: 'transfer', label: 'Transferencia bancaria', icon: '🏦' },
    { value: 'cash', label: 'Efectivo', icon: '💵' },
    { value: 'mercadopago', label: 'MercadoPago', icon: '💳' },
    { value: 'polar', label: 'Polar (digital)', icon: '⚡' },
];

const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const formatYMD = (d: Date) => d.toISOString().split('T')[0];
const addMonths = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return formatYMD(d); };

function ymd(d: Date) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const methodLabel = (m: string) => ({ transfer: 'Transferencia', cash: 'Efectivo', check: 'Cheque', polar: 'Polar', stripe: 'Stripe', paypal: 'PayPal', mercadopago: 'MercadoPago' }[m] || m);
const methodIcon = (m: string) => ({ transfer: <TrendingUp size={14} className="text-emerald-400" />, cash: <span className="text-sm">💵</span>, polar: <Zap size={14} className="text-indigo-400" />, stripe: <Zap size={14} className="text-indigo-400" /> }[m] || <CreditCard size={14} className="text-white/40" />);

// ──────────────── drawer wizard ────────────────
function RegisterPaymentDrawer({
    open, onClose, onSuccess,
    tenants, plans
}: {
    open: boolean; onClose: () => void; onSuccess: () => void;
    tenants: TenantOption[]; plans: PlanInfo[];
}) {
    const { showToast } = useToast();
    const [dstep, setDstep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Form state
    const [tenantSearch, setTenantSearch] = useState('');
    const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [endDate, setEndDate] = useState(addMonths(1));
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('transfer');
    const [amount, setAmount] = useState(0);
    const [reference, setReference] = useState('');
    const [paymentDate, setPaymentDate] = useState(formatYMD(new Date()));
    const [notes, setNotes] = useState('');

    const filteredTenants = tenants.filter(t =>
        !tenantSearch || t.name.toLowerCase().includes(tenantSearch.toLowerCase()) || t.slug.toLowerCase().includes(tenantSearch.toLowerCase())
    ).slice(0, 8);

    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    const calcAmount = selectedPlan
        ? Math.round(selectedPlan.price * (BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1) * (1 - discount / 100))
        : 0;

    useEffect(() => { if (!open) { setDstep(1); setSelectedTenant(null); setSelectedPlanId(null); setTenantSearch(''); setDiscount(0); setReference(''); setNotes(''); } }, [open]);
    useEffect(() => { setAmount(calcAmount); }, [calcAmount]);
    useEffect(() => {
        const months = BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1;
        setEndDate(addMonths(months));
    }, [billingCycle]);

    const handleSubmit = async () => {
        if (!selectedTenant || !selectedPlanId) return;
        setSaving(true);
        try {
            const tx = await apiRequest(`/api/internal/creator/tenants/${selectedTenant.slug}/billing/transactions`, {
                method: 'POST',
                body: { amount, payment_method: paymentMethod, payment_date: paymentDate, payment_reference: reference || null, notes: notes || null, target_plan_id: selectedPlanId, target_billing_cycle: billingCycle }
            });
            await apiRequest(`/api/internal/creator/tenants/${selectedTenant.slug}/billing/transactions/${tx.id}`, {
                method: 'PUT',
                body: { payment_status: 'completed', end_date: endDate || null }
            });
            showToast(`Pago registrado para ${selectedTenant.name}. Recibo generado.`, 'success');
            onSuccess();
            onClose();
        } catch {
            showToast('Error al registrar el pago', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const DRAWER_STEPS = [
        { id: 1, label: 'Crematorio', desc: 'Selecciona el crematorio al que registrarás el pago.' },
        { id: 2, label: 'Plan y Ciclo', desc: 'Elige el nuevo plan y período de facturación.' },
        { id: 3, label: 'Pago', desc: 'Ingresa los datos del pago recibido.' },
        { id: 4, label: 'Confirmar', desc: 'Revisa el resumen antes de guardar.' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative ml-auto w-full max-w-lg bg-[#07111f] border-l border-white/8 flex flex-col h-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Receipt size={16} className="text-blue-400" />
                        </div>
                        <div>
                            <div className="font-black text-white text-sm">Registrar Pago Manual</div>
                            <div className="text-[10px] text-white/30">Paso {dstep} de {DRAWER_STEPS.length} — {DRAWER_STEPS[dstep - 1].label}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white p-1 transition-colors"><X size={18} /></button>
                </div>

                {/* Step progress */}
                <div className="px-6 pt-4 flex items-center gap-1">
                    {DRAWER_STEPS.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-colors ${dstep === s.id ? 'bg-blue-500/15 text-blue-300' : dstep > s.id ? 'text-emerald-400' : 'text-white/25'}`}>
                                {dstep > s.id ? <CheckCircle2 size={10} /> : s.id} {s.label}
                            </div>
                            {i < DRAWER_STEPS.length - 1 && <div className={`flex-1 h-px ${dstep > s.id ? 'bg-emerald-500/30' : 'bg-white/8'}`} />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Description */}
                <div className="px-6 pt-3 pb-1">
                    <p className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">{DRAWER_STEPS[dstep - 1].desc}</p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Step 1: Select Tenant */}
                    {dstep === 1 && (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={tenantSearch}
                                    onChange={e => setTenantSearch(e.target.value)}
                                    placeholder="Buscar crematorio..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                {filteredTenants.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTenant(t)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedTenant?.id === t.id ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Building2 size={14} className="text-white/40" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white text-sm truncate">{t.name}</div>
                                            <div className="text-[10px] text-white/40 font-mono">/{t.slug} · {t.plan || 'FREE'}</div>
                                        </div>
                                        {selectedTenant?.id === t.id && <CheckCircle2 size={14} className="text-blue-400 shrink-0" />}
                                    </button>
                                ))}
                                {filteredTenants.length === 0 && (
                                    <div className="text-center py-8 text-white/30 text-sm">No se encontraron tenants</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Plan + Cycle */}
                    {dstep === 2 && (
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Plan de suscripción</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {plans.map(plan => {
                                        const isSelected = plan.id === selectedPlanId;
                                        return (
                                            <button
                                                key={plan.id}
                                                onClick={() => setSelectedPlanId(plan.id)}
                                                className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}
                                            >
                                                <div className={`font-black text-sm ${isSelected ? 'text-white' : 'text-white/60'}`}>{plan.name}</div>
                                                <div className={`font-bold text-xs font-mono ${isSelected ? 'text-blue-300' : 'text-white/40'}`}>{fmtCLP(plan.price)}/mes</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Ciclo de facturación</label>
                                <div className="space-y-1.5">
                                    {BILLING_CYCLES.map(c => {
                                        const months = c.months;
                                        const base = (selectedPlan?.price || 0) * months;
                                        const final = Math.round(base * (1 - discount / 100));
                                        return (
                                            <button
                                                key={c.value}
                                                onClick={() => setBillingCycle(c.value)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${billingCycle === c.value ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}
                                            >
                                                <div className={`text-sm font-bold ${billingCycle === c.value ? 'text-white' : 'text-white/60'}`}>{c.label}</div>
                                                {selectedPlan && <div className={`text-sm font-bold font-mono ${billingCycle === c.value ? 'text-blue-300' : 'text-white/40'}`}>{fmtCLP(final)}</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Descuento (%)</label>
                                <input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50" />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Payment */}
                    {dstep === 3 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Método de pago</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PAYMENT_METHODS.map(m => (
                                        <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${paymentMethod === m.value ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}>
                                            <span>{m.icon}</span>
                                            <span className={`text-xs font-bold ${paymentMethod === m.value ? 'text-white' : 'text-white/60'}`}>{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Monto (CLP)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">$</span>
                                    <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500/50" />
                                </div>
                                <p className="text-[10px] text-white/30 mt-1">Calculado: {fmtCLP(calcAmount)}</p>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Fecha de pago</label>
                                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">N° Referencia / Transferencia</label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="TRF-0001 o número de comprobante"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/20" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Notas internas</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones opcionales..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-white/20 resize-none" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Fecha de vencimiento</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50" />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Confirm */}
                    {dstep === 4 && (
                        <div className="space-y-3">
                            <div className="p-4 bg-white/[0.03] border border-white/8 rounded-2xl space-y-3">
                                <Row label="Crematorio" value={selectedTenant?.name || '—'} />
                                <Row label="Plan" value={selectedPlan?.name || '—'} />
                                <Row label="Ciclo" value={BILLING_CYCLES.find(c => c.value === billingCycle)?.label || '—'} />
                                <Row label="Vence el" value={endDate || '—'} mono />
                                <Row label="Monto" value={fmtCLP(amount)} highlight mono />
                                <Row label="Método" value={methodLabel(paymentMethod)} />
                                {reference && <Row label="Referencia" value={reference} mono />}
                                <Row label="Fecha pago" value={paymentDate} mono />
                            </div>
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-2">
                                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-emerald-300/80">Al confirmar se actualizará la suscripción y se generará el recibo automáticamente.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/8 flex justify-between gap-3">
                    <button onClick={() => dstep > 1 ? setDstep(d => d - 1) : onClose()}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-bold transition-colors">
                        {dstep === 1 ? 'Cancelar' : 'Anterior'}
                    </button>
                    {dstep < 4 ? (
                        <button
                            onClick={() => {
                                if (dstep === 1 && !selectedTenant) return;
                                if (dstep === 2 && !selectedPlanId) return;
                                setDstep(d => d + 1);
                            }}
                            disabled={(dstep === 1 && !selectedTenant) || (dstep === 2 && !selectedPlanId)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                        >
                            Siguiente <ArrowRight size={13} />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            {saving ? 'Guardando...' : 'Confirmar Pago'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/40">{label}</span>
            <span className={`text-xs font-bold ${highlight ? 'text-emerald-400 text-base' : 'text-white'} ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

// ──────────────── summary card ────────────────
function SummaryCard({ label, value, count, color }: { label: string; value: number; count: number; color: string }) {
    return (
        <div className={`p-4 rounded-2xl border bg-white/[0.02] ${color}`}>
            <div className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">{label}</div>
            <div className="text-xl font-black text-white font-mono">{fmtCLP(value)}</div>
            <div className="text-xs text-white/40 mt-0.5">{count} transacción(es)</div>
        </div>
    );
}

// ──────────────── main page ────────────────
export default function TransaccionesPage() {
    const { showToast } = useToast();
    const rawTenants = useAdminTenants();
    const tenants: TenantOption[] = (rawTenants || []).map((t: any) => ({ id: t.id, slug: t.slug, name: t.name, plan: t.plan }));

    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [summary, setSummary] = useState<Summary | null>(null);
    const [plans, setPlans] = useState<PlanInfo[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Row action menu + confirm modal
    const [menuState, setMenuState] = useState<{ id: number; top: number; right: number } | null>(null);
    const [confirm, setConfirm] = useState<{ action: 'approve' | 'fail' | 'delete'; tx: Tx } | null>(null);
    const [acting, setActing] = useState(false);

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>, tx: Tx) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuState({ id: tx.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };

    const reqId = useRef(0);

    useEffect(() => {
        const h = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 400);
        return () => clearTimeout(h);
    }, [search]);

    useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo]);

    useEffect(() => {
        apiRequest('/api/internal/creator/plans/').then(setPlans).catch(() => {});
    }, []);

    const buildParams = useCallback(() => {
        const p = new URLSearchParams();
        if (statusFilter !== 'all') p.append('status', statusFilter);
        if (debouncedSearch) p.append('search', debouncedSearch);
        if (dateFrom) p.append('date_from', `${dateFrom}T00:00:00`);
        if (dateTo) p.append('date_to', `${dateTo}T23:59:59`);
        return p;
    }, [statusFilter, debouncedSearch, dateFrom, dateTo]);

    const fetchTx = useCallback(async () => {
        const p = buildParams();
        p.append('page', String(page));
        p.append('page_size', String(PAGE_SIZE));
        const id = ++reqId.current;
        setLoading(true);
        try {
            const data: TxList = await apiRequest(`/api/internal/creator/billing/transactions?${p}`);
            if (id !== reqId.current) return;
            setTransactions(data.transactions || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 0);
        } catch { if (id === reqId.current) showToast('Error al cargar transacciones', 'error'); }
        finally { if (id === reqId.current) setLoading(false); }
    }, [page, buildParams, showToast]);

    const fetchSummary = useCallback(async () => {
        const p = new URLSearchParams();
        if (debouncedSearch) p.append('search', debouncedSearch);
        if (dateFrom) p.append('date_from', `${dateFrom}T00:00:00`);
        if (dateTo) p.append('date_to', `${dateTo}T23:59:59`);
        try { setSummary(await apiRequest(`/api/internal/creator/billing/transactions/summary?${p}`)); } catch {}
    }, [debouncedSearch, dateFrom, dateTo]);

    useEffect(() => { fetchTx(); }, [fetchTx]);
    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const handleAction = async () => {
        if (!confirm) return;
        const { action, tx } = confirm;
        setActing(true);
        try {
            if (action === 'approve') {
                await apiRequest(`/api/internal/creator/tenants/${tx.tenant_slug}/billing/transactions/${tx.id}`, {
                    method: 'PUT',
                    body: { payment_status: 'completed' }
                });
                showToast('Transacción aprobada. Suscripción y recibo actualizados.', 'success');
            } else if (action === 'fail') {
                await apiRequest(`/api/internal/creator/tenants/${tx.tenant_slug}/billing/transactions/${tx.id}`, {
                    method: 'PUT',
                    body: { payment_status: 'failed' }
                });
                showToast('Transacción marcada como anulada.', 'success');
            } else if (action === 'delete') {
                await apiRequest(`/api/internal/creator/tenants/${tx.tenant_slug}/billing/transactions/${tx.id}`, {
                    method: 'DELETE'
                });
                showToast('Transacción eliminada.', 'success');
            }
            setConfirm(null);
            fetchTx();
            fetchSummary();
        } catch (err: any) {
            showToast(err?.detail || 'Error al procesar la acción', 'error');
        } finally {
            setActing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const p = buildParams();
            const res = await fetch(`/api/internal/creator/billing/transactions/export?${p}`, { headers: authHeader() });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `recibos_${ymd(new Date())}.csv`;
            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            showToast('Reporte exportado', 'success');
        } catch { showToast('Error al exportar', 'error'); }
        finally { setExporting(false); }
    };

    const copyRef = (ref: string) => { navigator.clipboard.writeText(ref); showToast('Referencia copiada', 'success'); };

    const applyPreset = (p: string) => {
        const now = new Date();
        if (p === 'today') { const t = ymd(now); setDateFrom(t); setDateTo(t); }
        else if (p === 'last7') { const s = new Date(now); s.setDate(s.getDate() - 6); setDateFrom(ymd(s)); setDateTo(ymd(now)); }
        else if (p === 'month') { setDateFrom(ymd(new Date(now.getFullYear(), now.getMonth(), 1))); setDateTo(ymd(now)); }
        else if (p === 'last30') { const s = new Date(now); s.setDate(s.getDate() - 29); setDateFrom(ymd(s)); setDateTo(ymd(now)); }
    };

    return (
        <>
            <RegisterPaymentDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSuccess={() => { fetchTx(); fetchSummary(); }}
                tenants={tenants}
                plans={plans}
            />

            <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Receipt size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-blue-400/60">SaaS · Finanzas</div>
                            <h1 className="text-2xl font-black text-white leading-tight">Transacciones y Recibos</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { fetchTx(); fetchSummary(); }} disabled={loading}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl border border-white/10 disabled:opacity-40 transition-colors" title="Refrescar">
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={handleExport} disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 text-xs font-bold transition-colors">
                            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                            Exportar CSV
                        </button>
                        <button onClick={() => setDrawerOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/20">
                            <Plus size={15} />
                            Registrar Pago
                        </button>
                    </div>
                </header>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <SummaryCard label="Completados" value={summary.completed?.total_amount || 0} count={summary.completed?.count || 0} color="border-emerald-500/20" />
                        <SummaryCard label="Pendientes" value={summary.pending?.total_amount || 0} count={summary.pending?.count || 0} color="border-amber-500/20" />
                        <SummaryCard label="Fallidos" value={summary.failed?.total_amount || 0} count={summary.failed?.count || 0} color="border-rose-500/20" />
                        <SummaryCard label="Reembolsados" value={summary.refunded?.total_amount || 0} count={summary.refunded?.count || 0} color="border-blue-500/20" />
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col lg:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por crematorio, slug o referencia..."
                                className="w-full bg-black/30 border border-white/5 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="bg-black/30 border border-white/5 rounded-xl py-2.5 px-3 text-sm text-white/80 focus:outline-none focus:border-blue-500/40 lg:w-44">
                            <option value="all">Todos los estados</option>
                            <option value="completed">Completados</option>
                            <option value="pending">Pendientes</option>
                            <option value="failed">Fallidos</option>
                            <option value="refunded">Reembolsados</option>
                        </select>
                        <div className="flex items-center bg-black/30 border border-white/5 rounded-xl overflow-hidden">
                            <Calendar size={13} className="text-white/30 ml-3" />
                            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)}
                                className="bg-transparent py-2.5 px-2 text-xs text-white/70 focus:outline-none" />
                            <span className="text-white/20 text-xs">→</span>
                            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}
                                className="bg-transparent py-2.5 px-2 text-xs text-white/70 focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Filter size={11} className="text-white/30" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mr-1">Rápido:</span>
                        {[['today', 'Hoy'], ['last7', '7 días'], ['month', 'Este mes'], ['last30', '30 días']].map(([p, label]) => (
                            <button key={p} onClick={() => applyPreset(p)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white/50 uppercase tracking-widest hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20 transition-colors">
                                {label}
                            </button>
                        ))}
                        {(dateFrom || dateTo) && (
                            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                className="ml-auto px-2.5 py-1 rounded-lg bg-rose-500/5 border border-rose-500/10 text-[10px] font-bold text-rose-400/70 uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
                                Limpiar fechas
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/[0.02] border-b border-white/5">
                                <tr>
                                    {['Crematorio', 'Plan', 'Monto', 'Método / Ref', 'Vigente hasta', 'Estado', ''].map((h, i) => (
                                        <th key={i} className="px-5 py-3 text-[10px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={7} className="px-5 py-16 text-center">
                                        <Loader2 className="animate-spin mx-auto text-blue-400/60 mb-3" size={24} />
                                        <p className="text-white/30 font-bold uppercase tracking-widest text-[10px]">Cargando...</p>
                                    </td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={7} className="px-5 py-16 text-center">
                                        <FileText size={36} className="mx-auto text-white/10 mb-3" />
                                        <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Sin transacciones</p>
                                        <p className="text-xs text-white/20 mt-1">Usa el botón "Registrar Pago" para añadir la primera.</p>
                                    </td></tr>
                                ) : transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                    <Building2 size={13} className="text-white/40" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-white truncate text-sm leading-tight">{tx.tenant_name}</div>
                                                    <div className="text-[10px] text-white/40 font-mono mt-0.5">/{tx.tenant_slug} · {format(new Date(tx.created_at), 'd MMM yyyy · HH:mm', { locale: es })}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-white/80">
                                                <Zap size={10} className="text-blue-400/70" />
                                                {tx.target_plan_name || <span className="italic text-white/40">Renovación</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <span className="font-black text-white font-mono text-sm">{fmtCLP(tx.amount)}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5 text-xs text-white/60">{methodIcon(tx.payment_method)}<span>{methodLabel(tx.payment_method)}</span></div>
                                            {tx.payment_reference && (
                                                <button onClick={() => copyRef(tx.payment_reference!)}
                                                    className="mt-1 flex items-center gap-1 text-[10px] text-white/40 hover:text-white font-mono transition-colors group/ref">
                                                    <span className="truncate max-w-[100px]">{tx.payment_reference}</span>
                                                    <Copy size={9} className="opacity-0 group-hover/ref:opacity-100 transition-opacity" />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            {tx.current_billing_end_date ? (
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Calendar size={11} className="text-white/30" />
                                                    <span className="text-white/80 font-medium">{format(new Date(tx.current_billing_end_date), 'd MMM yyyy', { locale: es })}</span>
                                                </div>
                                            ) : <span className="text-[10px] text-white/30 italic">—</span>}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <StatusBadge kind="transaction" status={tx.payment_status} />
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={(e) => menuState?.id === tx.id ? setMenuState(null) : openMenu(e, tx)}
                                                className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                <MoreVertical size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} loading={loading} onPageChange={setPage} activeClass="bg-blue-500 text-white" />
                </div>
            </div>
            {/* Floating action menu — fixed so it doesn't affect table layout */}
            {menuState && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuState(null)} />
                    <div
                        className="fixed z-40 w-48 bg-[#0d1f35] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                        style={{ top: menuState.top, right: menuState.right }}
                    >
                        {(() => {
                            const tx = transactions.find(t => t.id === menuState.id);
                            if (!tx) return null;
                            return (
                                <>
                                    {tx.payment_status === 'pending' && (
                                        <button
                                            onClick={() => { setMenuState(null); setConfirm({ action: 'approve', tx }); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                        >
                                            <CheckCheck size={14} /> Aprobar pago
                                        </button>
                                    )}
                                    {tx.payment_status === 'pending' && (
                                        <button
                                            onClick={() => { setMenuState(null); setConfirm({ action: 'fail', tx }); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                                        >
                                            <Ban size={14} /> Anular
                                        </button>
                                    )}
                                    {tx.payment_status !== 'completed' && (
                                        <>
                                            <div className="border-t border-white/5 mx-3" />
                                            <button
                                                onClick={() => { setMenuState(null); setConfirm({ action: 'delete', tx }); }}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                            >
                                                <Trash2 size={14} /> Eliminar
                                            </button>
                                        </>
                                    )}
                                    {tx.payment_status === 'completed' && (
                                        <div className="px-4 py-3 text-[11px] text-white/30 italic">
                                            Las transacciones completadas no pueden modificarse.
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </>
            )}

            {/* Confirmation modal */}
            {confirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0d1f35] border rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4"
                        style={{ borderColor: confirm.action === 'approve' ? 'rgb(16 185 129 / 0.3)' : confirm.action === 'fail' ? 'rgb(245 158 11 / 0.3)' : 'rgb(239 68 68 / 0.3)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                confirm.action === 'approve' ? 'bg-emerald-500/10' :
                                confirm.action === 'fail' ? 'bg-amber-500/10' : 'bg-rose-500/10'
                            }`}>
                                {confirm.action === 'approve' && <CheckCheck size={18} className="text-emerald-400" />}
                                {confirm.action === 'fail' && <Ban size={18} className="text-amber-400" />}
                                {confirm.action === 'delete' && <Trash2 size={18} className="text-rose-400" />}
                            </div>
                            <div>
                                <div className="font-bold text-white text-sm">
                                    {confirm.action === 'approve' && 'Aprobar transacción'}
                                    {confirm.action === 'fail' && 'Anular transacción'}
                                    {confirm.action === 'delete' && 'Eliminar transacción'}
                                </div>
                                <div className="text-xs text-white/40">
                                    {confirm.tx.tenant_name} · {fmtCLP(confirm.tx.amount)}
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-white/60 mb-6">
                            {confirm.action === 'approve' && 'Se marcará como completada, se actualizará la suscripción del crematorio y se generará el recibo automáticamente.'}
                            {confirm.action === 'fail' && 'Se marcará como fallida. El historial quedará registrado pero la suscripción no se modificará.'}
                            {confirm.action === 'delete' && 'Se eliminará permanentemente. Esta acción no se puede deshacer.'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirm(null)} disabled={acting}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-bold transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={handleAction} disabled={acting}
                                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                                    confirm.action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400' :
                                    confirm.action === 'fail' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-rose-500 hover:bg-rose-400'
                                }`}>
                                {acting ? <Loader2 size={13} className="animate-spin" /> :
                                    confirm.action === 'approve' ? <CheckCheck size={13} /> :
                                    confirm.action === 'fail' ? <Ban size={13} /> : <Trash2 size={13} />}
                                {acting ? 'Procesando...' :
                                    confirm.action === 'approve' ? 'Aprobar' :
                                    confirm.action === 'fail' ? 'Anular' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
