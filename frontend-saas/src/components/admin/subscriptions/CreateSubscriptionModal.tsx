"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Package, Calendar, Percent, Loader2 } from 'lucide-react';
import Modal from '@/components/admin/Modal';
import { apiRequest } from '@/lib/admin/api';
import { useAdminTenants, useAdminPlans } from '@/hooks/useAdminBootstrap';

type Cycle = 'monthly' | 'bimonthly' | 'semiannual' | 'annual';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CYCLE_OPTIONS: { value: Cycle; label: string; months: number }[] = [
    { value: 'monthly', label: 'Mensual', months: 1 },
    { value: 'bimonthly', label: 'Bimestral', months: 2 },
    { value: 'semiannual', label: 'Semestral', months: 6 },
    { value: 'annual', label: 'Anual', months: 12 },
];

export default function CreateSubscriptionModal({ isOpen, onClose, onCreated, showToast }: Props) {
    const tenants = useAdminTenants();
    const plans = useAdminPlans();

    const [tenantId, setTenantId] = useState<number | ''>('');
    const [planId, setPlanId] = useState<number | ''>('');
    const [cycle, setCycle] = useState<Cycle>('monthly');
    const [discount, setDiscount] = useState<number>(0);
    const [startDate, setStartDate] = useState<string>('');
    const [endMode, setEndMode] = useState<'auto' | 'manual'>('auto');
    const [endDate, setEndDate] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTenantId('');
            setPlanId('');
            setCycle('monthly');
            setDiscount(0);
            setStartDate('');
            setEndMode('auto');
            setEndDate('');
            setSubmitting(false);
        }
    }, [isOpen]);

    // Calcula la fecha de vencimiento automática para mostrar al usuario
    const autoEndDate = useMemo(() => {
        const base = startDate ? new Date(startDate) : new Date();
        const months = CYCLE_OPTIONS.find(c => c.value === cycle)?.months ?? 1;
        const d = new Date(base);
        d.setMonth(d.getMonth() + months);
        return d;
    }, [startDate, cycle]);

    const formatDate = (d: Date) =>
        d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

    const selectedPlan = useMemo(
        () => plans.find((p: any) => p.id === planId),
        [plans, planId]
    );

    const monthlyPrice = selectedPlan?.price ?? 0;
    const cycleMonths = CYCLE_OPTIONS.find(c => c.value === cycle)?.months ?? 1;
    const gross = monthlyPrice * cycleMonths;
    const finalPrice = Math.round(gross * (1 - discount / 100));

    const manualEndValid = useMemo(() => {
        if (endMode !== 'manual') return true;
        if (!endDate) return false;
        const start = startDate ? new Date(startDate) : new Date();
        return new Date(endDate) > start;
    }, [endMode, endDate, startDate]);

    const isValid = tenantId !== '' && planId !== '' && discount >= 0 && discount <= 100 && manualEndValid;

    const handleSubmit = async () => {
        if (!isValid || submitting) return;
        setSubmitting(true);
        try {
            const body: any = {
                tenant_id: tenantId,
                subscription_plan_id: planId,
                billing_cycle: cycle,
                discount_percent: discount,
                status: 'active',
            };
            if (startDate) {
                body.start_date = new Date(startDate).toISOString();
            }
            if (endMode === 'manual' && endDate) {
                body.end_date = new Date(endDate).toISOString();
            }
            await apiRequest(`/api/internal/creator/tenants/${tenantId}/subscription`, {
                method: 'POST',
                body,
            });
            showToast('Suscripción creada correctamente', 'success');
            onCreated();
            onClose();
        } catch (err: any) {
            const msg = typeof err?.message === 'string'
                ? err.message
                : (err?.data?.detail || 'No se pudo crear la suscripción');
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Crear Suscripción" maxWidth="max-w-2xl">
            <div className="space-y-6">
                {/* Tenant */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                        <Building2 size={12} /> Tenant
                    </label>
                    <select
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
                    >
                        <option value="">— Selecciona un tenant —</option>
                        {tenants.map((t: any) => (
                            <option key={t.id} value={t.id}>
                                {t.name} (@{t.slug})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Plan */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                        <Package size={12} /> Plan
                    </label>
                    <select
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
                    >
                        <option value="">— Selecciona un plan —</option>
                        {plans.map((p: any) => (
                            <option key={p.id} value={p.id}>
                                {p.name} — ${(p.price ?? 0).toLocaleString('es-CL')} / mes
                            </option>
                        ))}
                    </select>
                </div>

                {/* Cycle */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                        <Calendar size={12} /> Ciclo de Facturación
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {CYCLE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCycle(opt.value)}
                                className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all ${
                                    cycle === opt.value
                                        ? 'bg-primary/15 border-primary/40 text-primary'
                                        : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Discount + Start Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                            <Percent size={12} /> Descuento (%)
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={discount}
                            onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                            <Calendar size={12} /> Fecha de Inicio (opcional)
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Fecha de Vencimiento: Automática o Manual */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-2">
                        <Calendar size={12} /> Fecha de Vencimiento
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => setEndMode('auto')}
                            className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all ${
                                endMode === 'auto'
                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                    : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]'
                            }`}
                        >
                            Automática (según ciclo)
                        </button>
                        <button
                            type="button"
                            onClick={() => setEndMode('manual')}
                            className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all ${
                                endMode === 'manual'
                                    ? 'bg-primary/15 border-primary/40 text-primary'
                                    : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]'
                            }`}
                        >
                            Manual
                        </button>
                    </div>
                    {endMode === 'auto' ? (
                        <div className="px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-white/60">
                            Se calculará como <span className="text-white font-bold">{formatDate(autoEndDate)}</span> a partir del ciclo seleccionado.
                        </div>
                    ) : (
                        <>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || undefined}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
                            />
                            {endDate && !manualEndValid && (
                                <p className="mt-2 text-xs text-rose-400 font-medium">
                                    La fecha de vencimiento debe ser posterior a la fecha de inicio.
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Pricing Summary */}
                {selectedPlan && (
                    <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/40">Precio mensual</span>
                            <span className="text-white font-bold">${monthlyPrice.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/40">Bruto del ciclo ({cycleMonths} {cycleMonths === 1 ? 'mes' : 'meses'})</span>
                            <span className="text-white font-bold">${gross.toLocaleString('es-CL')}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-white/40">Descuento ({discount}%)</span>
                                <span className="text-rose-400 font-bold">- ${Math.round(gross - finalPrice).toLocaleString('es-CL')}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-white/5">
                            <span className="text-white/60 font-bold uppercase tracking-wider text-xs">Total a pagar</span>
                            <span className="text-primary text-xl font-black">${finalPrice.toLocaleString('es-CL')}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-sm transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isValid || submitting}
                        className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                    >
                        {submitting && <Loader2 size={16} className="animate-spin" />}
                        Crear Suscripción
                    </button>
                </div>
            </div>
        </Modal>
    );
}
