"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Shield, Clock, CreditCard, CheckCircle2, ArrowRight, ArrowLeft,
    ChevronRight, Calendar, Percent, AlertCircle, Loader2,
    Building2, Zap, FileText, Lock, RotateCcw, Info
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

const BILLING_CYCLES = [
    { value: 'monthly', label: 'Mensual', months: 1, desc: '1 mes de servicio' },
    { value: 'bimonthly', label: 'Bimestral', months: 2, desc: '2 meses de servicio' },
    { value: 'semiannual', label: 'Semestral', months: 6, desc: '6 meses de servicio' },
    { value: 'annual', label: 'Anual', months: 12, desc: '12 meses de servicio' },
];

const PAYMENT_METHODS = [
    { value: 'transfer', label: 'Transferencia bancaria', icon: '🏦' },
    { value: 'cash', label: 'Efectivo', icon: '💵' },
    { value: 'mercadopago', label: 'MercadoPago', icon: '💳' },
    { value: 'polar', label: 'Polar (digital)', icon: '⚡' },
];

const PLAN_COLORS: Record<string, { ring: string; badge: string; text: string; glow: string }> = {
    FREE: { ring: 'border-yellow-500/50 ring-yellow-500/20', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/10' },
    Track: { ring: 'border-sky-500/50 ring-sky-500/20', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20', text: 'text-sky-400', glow: 'shadow-sky-500/10' },
    NORMAL: { ring: 'border-blue-500/50 ring-blue-500/20', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/10' },
    PRO: { ring: 'border-orange-500/50 ring-orange-500/20', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', text: 'text-orange-400', glow: 'shadow-orange-500/10' },
    ULTRA: { ring: 'border-emerald-500/50 ring-emerald-500/20', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
};
const planColor = (name?: string) => PLAN_COLORS[name || ''] || PLAN_COLORS.FREE;

const formatYMD = (d: Date) => d.toISOString().split('T')[0];
const addMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return formatYMD(d);
};
const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

interface PlanInfo { id: number; name: string; price: number; max_pets?: number; }

const STEPS = [
    {
        id: 1,
        label: 'Plan',
        icon: Shield,
        title: 'Seleccionar Plan de Suscripción',
        description: 'Elige el plan que aplicará a este crematorio. Los cambios de plan tienen efecto inmediato al confirmar.',
    },
    {
        id: 2,
        label: 'Ciclo',
        icon: Clock,
        title: 'Ciclo de Facturación y Vigencia',
        description: 'Define la periodicidad del cobro, el descuento aplicado y la fecha de vencimiento del servicio.',
    },
    {
        id: 3,
        label: 'Pago',
        icon: CreditCard,
        title: 'Registrar Pago Físico',
        description: 'Ingresa los datos del pago recibido (transferencia, efectivo, etc.). Al confirmar, se generará el recibo automáticamente y se actualizará la suscripción. Puedes omitir este paso si solo deseas actualizar la configuración.',
    },
    {
        id: 4,
        label: 'Confirmar',
        icon: CheckCircle2,
        title: 'Resumen y Confirmación',
        description: 'Revisa todos los datos antes de guardar. Esta acción actualizará la suscripción del crematorio en el sistema.',
    },
];

export default function TenantFacturacionPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const tenantSlug = params.slug as string;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [plans, setPlans] = useState<PlanInfo[]>([]);

    // Step 1
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

    // Step 2
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [endDate, setEndDate] = useState('');
    const [isDateManual, setIsDateManual] = useState(false);
    const [discount, setDiscount] = useState(0);

    // Step 3
    const [registerPayment, setRegisterPayment] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState('transfer');
    const [amount, setAmount] = useState(0);
    const [reference, setReference] = useState('');
    const [paymentDate, setPaymentDate] = useState(formatYMD(new Date()));
    const [notes, setNotes] = useState('');

    // Acceso de demostración (plan superior temporal, sin tocar facturación)
    const [demoPlanId, setDemoPlanId] = useState<number | null>(null);
    const [demoMonths, setDemoMonths] = useState<1 | 2>(1);
    const [demoSaving, setDemoSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tenantData, plansData] = await Promise.all([
                    apiRequest(`/api/internal/creator/tenants/${tenantSlug}`),
                    apiRequest('/api/internal/creator/plans/')
                ]);
                setTenant(tenantData);
                setPlans(plansData);

                const currentPlanId = tenantData.subscription_plan_id;
                setSelectedPlanId(currentPlanId || null);
                setBillingCycle(tenantData.billing_cycle || 'monthly');
                setDiscount(tenantData.billing_discount || 0);

                if (tenantData.billing_end_date) {
                    const savedDate = formatYMD(new Date(tenantData.billing_end_date));
                    const cycle = tenantData.billing_cycle || 'monthly';
                    const months = BILLING_CYCLES.find(c => c.value === cycle)?.months ?? 1;
                    const computedDate = addMonths(months);
                    // Solo marcar manual si la fecha guardada difiere del cálculo automático actual
                    const isManual = savedDate !== computedDate;
                    setEndDate(savedDate);
                    setIsDateManual(isManual);
                }

                const currentPlan = plansData.find((p: PlanInfo) => p.id === currentPlanId);
                if (currentPlan) {
                    const months = BILLING_CYCLES.find(c => c.value === (tenantData.billing_cycle || 'monthly'))?.months ?? 1;
                    const base = currentPlan.price * months;
                    setAmount(Math.round(base * (1 - (tenantData.billing_discount || 0) / 100)));
                }
            } catch {
                showToast('Error al cargar datos', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tenantSlug, showToast]);

    const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);

    const calculatedAmount = useMemo(() => {
        if (!selectedPlan) return 0;
        const months = BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1;
        const base = selectedPlan.price * months;
        return Math.round(base * (1 - discount / 100));
    }, [selectedPlan, billingCycle, discount]);

    const autoEndDate = useMemo(() => {
        const months = BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1;
        return addMonths(months);
    }, [billingCycle]);

    useEffect(() => {
        if (!isDateManual) setEndDate(autoEndDate);
    }, [autoEndDate, isDateManual]);

    useEffect(() => {
        setAmount(calculatedAmount);
    }, [calculatedAmount]);

    const handleCycleChange = useCallback((val: string) => {
        setBillingCycle(val);
        if (!isDateManual) {
            const months = BILLING_CYCLES.find(c => c.value === val)?.months ?? 1;
            setEndDate(addMonths(months));
        }
    }, [isDateManual]);

    const handleConfirm = async () => {
        setSaving(true);
        try {
            if (registerPayment && selectedPlanId) {
                // Create transaction (pending) then mark completed → triggers auto-subscription update
                const tx = await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/billing/transactions`, {
                    method: 'POST',
                    body: {
                        amount,
                        payment_method: paymentMethod,
                        payment_date: paymentDate,
                        payment_reference: reference || null,
                        notes: notes || null,
                        target_plan_id: selectedPlanId,
                        target_billing_cycle: billingCycle,
                    }
                });
                await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/billing/transactions/${tx.id}`, {
                    method: 'PUT',
                    body: {
                        payment_status: 'completed',
                        end_date: endDate || null,
                    }
                });
                showToast('Pago registrado y suscripción actualizada correctamente', 'success');
            } else {
                await apiRequest(`/api/internal/creator/tenants/${tenantSlug}`, {
                    method: 'PUT',
                    body: {
                        subscription_plan_id: selectedPlanId ? parseInt(selectedPlanId.toString()) : null,
                        billing_cycle: billingCycle,
                        billing_end_date: endDate || null,
                        billing_discount: discount,
                    }
                });
                showToast('Configuración de facturación actualizada', 'success');
            }
            router.push(`/dashboard/tenants/${tenantSlug}`);
        } catch {
            showToast('Error al guardar. Intenta de nuevo.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const refetchTenant = async () => {
        try {
            const t = await apiRequest(`/api/internal/creator/tenants/${tenantSlug}`);
            setTenant(t);
        } catch { /* noop */ }
    };

    const handleGrantDemo = async () => {
        if (!demoPlanId) { showToast('Selecciona un plan para la demostración', 'error'); return; }
        setDemoSaving(true);
        try {
            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/demo`, {
                method: 'POST',
                body: { plan_id: demoPlanId, months: demoMonths },
            });
            await refetchTenant();
            showToast('Acceso de demostración concedido', 'success');
        } catch {
            showToast('No se pudo conceder la demostración', 'error');
        } finally {
            setDemoSaving(false);
        }
    };

    const handleRevokeDemo = async () => {
        setDemoSaving(true);
        try {
            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/demo`, { method: 'DELETE' });
            await refetchTenant();
            showToast('Acceso de demostración revocado', 'success');
        } catch {
            showToast('No se pudo revocar la demostración', 'error');
        } finally {
            setDemoSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3 text-white/40">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-medium">Cargando datos de facturación...</span>
            </div>
        );
    }

    const currentStep = STEPS[step - 1];
    const StepIcon = currentStep.icon;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-white/40">
                <button onClick={() => router.push('/dashboard/tenants')} className="hover:text-white transition-colors">Tenants</button>
                <ChevronRight size={12} />
                <button onClick={() => router.push(`/dashboard/tenants/${tenantSlug}`)} className="hover:text-white transition-colors font-medium text-white/60">{tenant?.name || tenantSlug}</button>
                <ChevronRight size={12} />
                <span className="text-white/80 font-bold">Facturación</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Building2 size={22} className="text-blue-400" />
                </div>
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400/60 mb-0.5">Facturación & Suscripción</div>
                    <h1 className="text-2xl font-black text-white leading-tight">{tenant?.name}</h1>
                </div>
                {tenant?.plan && (
                    <div className={`ml-auto px-3 py-1.5 rounded-full text-xs font-black uppercase border ${planColor(tenant.plan).badge}`}>
                        Plan actual: {tenant.plan}
                    </div>
                )}
            </div>

            {/* Step Tracker */}
            <div className="flex items-center gap-0">
                {STEPS.map((s, idx) => {
                    const SIcon = s.icon;
                    const isActive = s.id === step;
                    const isDone = s.id < step;
                    return (
                        <React.Fragment key={s.id}>
                            <button
                                onClick={() => s.id < step && setStep(s.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isActive ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                    isDone ? 'text-emerald-400 cursor-pointer hover:bg-white/5' :
                                    'text-white/30 cursor-default'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black transition-all ${
                                    isActive ? 'bg-blue-500 border-blue-400 text-white' :
                                    isDone ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                                    'bg-white/5 border-white/10 text-white/30'
                                }`}>
                                    {isDone ? <CheckCircle2 size={12} /> : s.id}
                                </div>
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                            {idx < STEPS.length - 1 && (
                                <div className={`flex-1 h-px mx-1 transition-colors ${s.id < step ? 'bg-emerald-500/30' : 'bg-white/8'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Step Card */}
            <div className="bg-[#0a1929] border border-white/8 rounded-3xl overflow-hidden">
                {/* Step Header */}
                <div className="p-6 border-b border-white/8 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <StepIcon size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-black text-white/30 mb-1">Paso {step} de {STEPS.length}</div>
                        <h2 className="text-lg font-black text-white mb-1">{currentStep.title}</h2>
                        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2 max-w-2xl">
                            <Info size={12} className="text-blue-400/70 mt-0.5 shrink-0" />
                            <p className="text-xs text-white/50 leading-relaxed">{currentStep.description}</p>
                        </div>
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-6">
                    {/* ── STEP 1: PLAN ── */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {plans.map(plan => {
                                const isSelected = plan.id === selectedPlanId;
                                const pc = planColor(plan.name);
                                return (
                                    <button
                                        key={plan.id}
                                        onClick={() => setSelectedPlanId(plan.id)}
                                        className={`text-left p-5 rounded-2xl border-2 transition-all relative group ${
                                            isSelected ? `${pc.ring} bg-white/5 ring-2 shadow-xl ${pc.glow}` : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                                        }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-3 right-3">
                                                <CheckCircle2 size={16} className={pc.text} />
                                            </div>
                                        )}
                                        <div className={`text-xl font-black mb-1 ${isSelected ? pc.text : 'text-white/70'}`}>{plan.name}</div>
                                        <div className={`text-2xl font-black font-mono mb-2 ${isSelected ? 'text-white' : 'text-white/50'}`}>
                                            {fmtCLP(plan.price)}
                                            <span className="text-xs font-normal text-white/30 ml-1">/mes</span>
                                        </div>
                                        {plan.max_pets && (
                                            <div className="text-[11px] text-white/40 font-medium">Hasta {plan.max_pets} mascotas/mes</div>
                                        )}
                                        {plan.name === tenant?.plan && (
                                            <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/30">Plan actual</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ── STEP 2: CICLO ── */}
                    {step === 2 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-3 block tracking-widest">Período de facturación</label>
                                <div className="space-y-2">
                                    {BILLING_CYCLES.map(c => {
                                        const isSelected = billingCycle === c.value;
                                        const months = c.months;
                                        const base = (selectedPlan?.price || 0) * months;
                                        const final = Math.round(base * (1 - discount / 100));
                                        return (
                                            <button
                                                key={c.value}
                                                onClick={() => handleCycleChange(c.value)}
                                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                                                    isSelected ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20' : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-400 bg-blue-500' : 'border-white/20'}`}>
                                                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-white/60'}`}>{c.label}</div>
                                                        <div className="text-[10px] text-white/30">{c.desc}</div>
                                                    </div>
                                                </div>
                                                {selectedPlan && (
                                                    <div className="text-right">
                                                        <div className={`text-sm font-bold font-mono ${isSelected ? 'text-blue-300' : 'text-white/40'}`}>{fmtCLP(final)}</div>
                                                        {months > 1 && <div className="text-[10px] text-white/30">{fmtCLP(final / months)}/mes</div>}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-white/30 mb-3 block tracking-widest">Fecha de vencimiento</label>

                                    {/* Mode toggle */}
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => { setIsDateManual(false); setEndDate(autoEndDate); }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                !isDateManual
                                                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20'
                                                    : 'border-white/8 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60'
                                            }`}
                                        >
                                            <RotateCcw size={12} /> Automático
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsDateManual(true)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                isDateManual
                                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
                                                    : 'border-white/8 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60'
                                            }`}
                                        >
                                            <Lock size={12} /> Manual
                                        </button>
                                    </div>

                                    {/* Automático: solo lectura */}
                                    {!isDateManual ? (
                                        <div>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/60" />
                                                <div className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl pl-11 pr-4 py-3 text-blue-300 font-mono font-bold text-sm select-none">
                                                    {endDate || autoEndDate}
                                                </div>
                                            </div>
                                            <p className="mt-1.5 text-[10px] text-blue-400/60">
                                                Hoy + {BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1} mes(es) · {BILLING_CYCLES.find(c => c.value === billingCycle)?.label}
                                            </p>
                                        </div>
                                    ) : (
                                        /* Manual: editable */
                                        <div>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400/60" />
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={e => setEndDate(e.target.value)}
                                                    className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl pl-11 pr-4 py-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                                                />
                                            </div>
                                            <p className="mt-1.5 text-[10px] text-amber-400/60">
                                                Fecha libre · el automático sería {autoEndDate}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest flex items-center gap-1.5">
                                        <Percent size={10} /> Descuento (%)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={discount}
                                            onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                            className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                        <span className="text-white/30 text-sm">%</span>
                                        {discount > 0 && selectedPlan && (
                                            <span className="text-emerald-400 text-xs font-bold">
                                                − {fmtCLP(selectedPlan.price * (BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1) * discount / 100)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {selectedPlan && (
                                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-2">
                                        <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-3">Resumen de cobro</div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/50">Plan {selectedPlan.name}</span>
                                            <span className="text-white font-mono">{fmtCLP(selectedPlan.price)}/mes</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/50">× {BILLING_CYCLES.find(c => c.value === billingCycle)?.months} mes(es)</span>
                                            <span className="text-white font-mono">{fmtCLP(selectedPlan.price * (BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1))}</span>
                                        </div>
                                        {discount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-emerald-400/70">Descuento ({discount}%)</span>
                                                <span className="text-emerald-400 font-mono">− {fmtCLP(selectedPlan.price * (BILLING_CYCLES.find(c => c.value === billingCycle)?.months ?? 1) * discount / 100)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-white/8 pt-2 flex justify-between">
                                            <span className="font-black text-white">Total</span>
                                            <span className="font-black text-white text-lg font-mono">{fmtCLP(calculatedAmount)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: PAGO ── */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Toggle register payment */}
                            <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/8 rounded-2xl">
                                <div>
                                    <div className="font-bold text-white text-sm">Registrar pago físico</div>
                                    <div className="text-xs text-white/40 mt-0.5">Activa si el crematorio ya realizó el pago (transferencia, efectivo, etc.)</div>
                                </div>
                                <button
                                    onClick={() => setRegisterPayment(v => !v)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${registerPayment ? 'bg-blue-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${registerPayment ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {!registerPayment && (
                                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                                    <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-amber-300/80">Solo se actualizará la configuración del plan y ciclo. No se creará ningún recibo ni transacción.</p>
                                </div>
                            )}

                            {registerPayment && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] uppercase font-black text-white/30 mb-3 block tracking-widest">Método de pago</label>
                                        <div className="space-y-2">
                                            {PAYMENT_METHODS.map(m => (
                                                <button
                                                    key={m.value}
                                                    onClick={() => setPaymentMethod(m.value)}
                                                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                                                        paymentMethod === m.value ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/8 bg-white/[0.02] hover:border-white/20'
                                                    }`}
                                                >
                                                    <span className="text-lg">{m.icon}</span>
                                                    <span className={`text-sm font-bold ${paymentMethod === m.value ? 'text-white' : 'text-white/60'}`}>{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Monto cobrado (CLP)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={e => setAmount(Number(e.target.value))}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                                />
                                            </div>
                                            <p className="mt-1 text-[10px] text-white/30">Calculado: {fmtCLP(calculatedAmount)} · Ajusta si hay diferencias</p>
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Fecha de pago</label>
                                            <div className="relative">
                                                <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input
                                                    type="date"
                                                    value={paymentDate}
                                                    onChange={e => setPaymentDate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Referencia / N° transferencia</label>
                                            <input
                                                type="text"
                                                value={reference}
                                                onChange={e => setReference(e.target.value)}
                                                placeholder="Ej: TRF-2025-0123"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 transition-colors placeholder-white/20"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-widest">Notas internas (opcional)</label>
                                            <textarea
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                rows={3}
                                                placeholder="Observaciones del pago..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none placeholder-white/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 4: CONFIRMAR ── */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Plan */}
                                <div className="p-5 bg-white/[0.03] border border-white/8 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield size={14} className="text-blue-400" />
                                        <span className="text-[10px] uppercase font-black text-white/40 tracking-widest">Plan</span>
                                    </div>
                                    <div className={`text-2xl font-black ${selectedPlan ? planColor(selectedPlan.name).text : 'text-white/30'}`}>
                                        {selectedPlan?.name || '—'}
                                    </div>
                                    <div className="text-white/40 text-sm mt-1 font-mono">{selectedPlan ? fmtCLP(selectedPlan.price) + '/mes' : ''}</div>
                                </div>

                                {/* Ciclo */}
                                <div className="p-5 bg-white/[0.03] border border-white/8 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={14} className="text-blue-400" />
                                        <span className="text-[10px] uppercase font-black text-white/40 tracking-widest">Ciclo y Vigencia</span>
                                    </div>
                                    <div className="text-white font-bold text-sm">{BILLING_CYCLES.find(c => c.value === billingCycle)?.label}</div>
                                    <div className="text-white/40 text-xs font-mono mt-1">Vence: {endDate || '—'}</div>
                                    {discount > 0 && <div className="text-emerald-400 text-xs mt-1">Descuento {discount}% aplicado</div>}
                                </div>

                                {/* Pago */}
                                <div className={`p-5 border rounded-2xl ${registerPayment ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/[0.02] border-white/8'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <CreditCard size={14} className={registerPayment ? 'text-blue-400' : 'text-white/30'} />
                                        <span className="text-[10px] uppercase font-black text-white/40 tracking-widest">Pago</span>
                                        {registerPayment && <span className="ml-auto text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">Se registrará</span>}
                                    </div>
                                    {registerPayment ? (
                                        <>
                                            <div className="text-white font-black text-xl font-mono">{fmtCLP(amount)}</div>
                                            <div className="text-white/40 text-xs mt-1">{PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}</div>
                                            {reference && <div className="text-white/40 text-xs font-mono mt-0.5">Ref: {reference}</div>}
                                            <div className="text-white/40 text-xs mt-0.5">Fecha: {paymentDate}</div>
                                        </>
                                    ) : (
                                        <div className="text-white/30 text-xs italic">Sin registro de pago — solo actualización de configuración</div>
                                    )}
                                </div>

                                {/* Efecto */}
                                <div className="p-5 bg-white/[0.03] border border-white/8 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Zap size={14} className="text-amber-400" />
                                        <span className="text-[10px] uppercase font-black text-white/40 tracking-widest">Efecto</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs text-white/60">
                                        <div className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-400" /> Plan actualizado a {selectedPlan?.name}</div>
                                        <div className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-400" /> Ciclo: {BILLING_CYCLES.find(c => c.value === billingCycle)?.label}</div>
                                        {registerPayment && <>
                                            <div className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-400" /> Transacción registrada</div>
                                            <div className="flex items-center gap-2"><CheckCircle2 size={11} className="text-emerald-400" /> Recibo generado automáticamente</div>
                                        </>}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                                <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-300/80">Esta acción actualizará la suscripción del crematorio. {registerPayment ? 'El recibo se generará automáticamente y podrás descargarlo desde la sección de Transacciones.' : ''}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3">
                    <button
                        onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-bold transition-colors"
                    >
                        <ArrowLeft size={14} />
                        {step === 1 ? 'Volver' : 'Anterior'}
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={() => {
                                if (step === 1 && !selectedPlanId) { showToast('Selecciona un plan para continuar', 'error'); return; }
                                setStep(s => s + 1);
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Siguiente
                            <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleConfirm}
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            {saving ? 'Guardando...' : registerPayment ? 'Confirmar y Registrar Pago' : 'Guardar Configuración'}
                        </button>
                    )}
                </div>
            </div>

            {/* Acceso de Demostración */}
            <div className="bg-[#0a1929] border border-purple-500/20 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/8 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap size={18} className="text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white mb-1">Acceso de Demostración</h2>
                        <p className="text-xs text-white/50 leading-relaxed max-w-2xl">
                            Da acceso temporal a un plan superior (módulos y límites) <strong className="text-white/70">sin cambiar el plan pactado ni la facturación</strong> (no afecta MRR ni ingresos). Se revierte solo al vencer.
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    {tenant?.demo_expires_at ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-purple-400 shrink-0" />
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        Demostración activa: <span className="text-purple-300">{tenant.demo_plan_name || 'Plan superior'}</span>
                                    </div>
                                    <div className="text-xs text-white/50 mt-0.5">
                                        Vigente hasta {new Date(tenant.demo_expires_at).toLocaleDateString('es-CL')}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleRevokeDemo}
                                disabled={demoSaving}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {demoSaving ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                Revocar acceso
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-3 block tracking-widest">Plan a demostrar</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {plans.map(plan => {
                                        const isSelected = plan.id === demoPlanId;
                                        const pc = planColor(plan.name);
                                        const isContracted = plan.id === tenant?.subscription_plan_id;
                                        return (
                                            <button
                                                key={plan.id}
                                                onClick={() => setDemoPlanId(plan.id)}
                                                className={`text-left p-3 rounded-xl border-2 transition-all ${
                                                    isSelected ? `${pc.ring} bg-white/5 ring-2` : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                                                }`}
                                            >
                                                <div className={`text-sm font-black ${isSelected ? pc.text : 'text-white/70'}`}>{plan.name}</div>
                                                <div className="text-[10px] text-white/30 font-mono mt-0.5">{fmtCLP(plan.price)}/mes</div>
                                                {isContracted && <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">Plan actual</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-black text-white/30 mb-3 block tracking-widest">Duración</label>
                                <div className="flex gap-2">
                                    {([1, 2] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setDemoMonths(m)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                                demoMonths === m
                                                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/20'
                                                    : 'border-white/8 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/60'
                                            }`}
                                        >
                                            <Clock size={14} /> {m} {m === 1 ? 'mes' : 'meses'}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-[10px] text-white/30">Máximo 2 meses. Vence automáticamente sin intervención.</p>
                            </div>

                            <button
                                onClick={handleGrantDemo}
                                disabled={demoSaving || !demoPlanId}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white text-sm font-bold transition-colors shadow-lg shadow-purple-500/20"
                            >
                                {demoSaving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                Conceder acceso de demostración
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Recibos rápido */}
            <div className="flex items-center justify-end">
                <button
                    onClick={() => router.push('/dashboard/transacciones')}
                    className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                    <FileText size={12} />
                    Ver historial de transacciones y recibos
                </button>
            </div>
        </div>
    );
}
