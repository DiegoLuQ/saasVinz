"use client";

import React, { useEffect, useState } from 'react';
import {
    CreditCard,
    Zap,
    BarChart3,
    History,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    Package
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { PlanComparison, Plan } from '@/components/tenant/billing/PlanComparison';
import { PlanChangeModal } from '@/components/tenant/billing/PlanChangeModal';
import { PaymentReportModal } from '@/components/tenant/billing/PaymentReportModal';
import { ExternalLink } from 'lucide-react';

export default function BillingPage() {
    const { data: bootstrapData, isLoading: loadingBootstrap } = useSessionBootstrap();
    const [stats, setStats] = useState<any>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        plan: Plan | null;
        cycle: 'monthly' | 'annual';
    }>({
        isOpen: false,
        plan: null,
        cycle: 'monthly'
    });

    const [reportModalOpen, setReportModalOpen] = useState(false);

    const tenant = bootstrapData?.tenant;
    const subscription = (bootstrapData as any)?.subscription;

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        try {
            setLoading(true);
            const [statsData, historyData, plansData] = await Promise.all([
                apiRequest('/api/internal/dashboard'),
                apiRequest('/api/internal/billing/history'),
                apiRequest('/api/internal/billing/plans')
            ]);
            setStats(statsData.stats);
            setTransactions(historyData);
            setPlans(plansData);
        } catch (error) {
            console.error('Error fetching billing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgradePlan = (planId: number, interval: 'monthly' | 'annual') => {
        const selectedPlan = plans.find(p => p.id === planId);
        if (selectedPlan) {
            setConfirmModal({
                isOpen: true,
                plan: selectedPlan,
                cycle: interval
            });
        }
    };

    const confirmUpgrade = async (couponCode?: string) => {
        if (!confirmModal.plan) return;

        try {
            await apiRequest('/api/internal/billing/change-plan-request', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: confirmModal.plan.id,
                    billing_cycle: confirmModal.cycle,
                    coupon_code: couponCode
                })
            });

            setConfirmModal({ ...confirmModal, isOpen: false });
            alert('Solicitud enviada con éxito. Un administrador revisará tu cambio pronto.');
            fetchBillingData();
        } catch (error: any) {
            alert('Error al solicitar cambio: ' + error.message);
        }
    };

    if (loadingBootstrap || (loading && !stats)) {
        return <div className="p-8 text-white/50 animate-pulse text-center">Cargando información de facturación...</div>;
    }

    // Calcular porcentajes de límites
    const limits = (bootstrapData as any)?.limits || {};
    const getPercentage = (current: number, max: number | null) => {
        if (max === null || max === 0) return 0;
        return Math.min(Math.round((current / max) * 100), 100);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 pb-20">
            <header>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <CreditCard className="text-primary" size={32} />
                    Facturación & Suscripción
                </h1>
                <p className="text-white/40">Gestiona tu plan, revisa tus límites y descarga tus comprobantes.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Plan Card */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#1a1f2e] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-primary/20 transition-all duration-700" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/20">
                                        Plan Actual
                                    </span>
                                    <h2 className="text-5xl font-black mt-4 uppercase tracking-tighter">
                                        {subscription?.plan_name || 'NORMAL'}
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white/90">
                                        ${subscription?.monthly_price?.toLocaleString() || '0'}
                                        <span className="text-sm text-white/30 font-medium ml-1">/mes</span>
                                    </div>
                                    <p className="text-xs text-white/40 font-medium mt-1">Facturación {subscription?.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/30 font-bold uppercase">Siguiente Pago</p>
                                        <p className="font-bold">{subscription?.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : 'Pendiente'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-green-400">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/30 font-bold uppercase">Estado</p>
                                        <p className="font-bold text-green-400 uppercase tracking-wide">
                                            {subscription?.status || 'Activo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resources Usage */}
                    <div className="bg-[#1a1f2e] border border-white/5 rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <BarChart3 className="text-primary" size={20} />
                                Límites de Recursos
                            </h3>
                            <button className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                                Ver detalles de plan <ArrowUpRight size={14} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Pets Limit */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-white/60">Mascotas Registradas</span>
                                    <span>{stats?.pets_total || 0} / {limits.max_pets || '∞'}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                        style={{ width: `${getPercentage(stats?.pets_total || 0, limits.max_pets)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Orders Limit */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-white/60">Pedidos este mes</span>
                                    <span>{stats?.orders_this_month || 0} / {limits.max_orders || '∞'}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${getPercentage(stats?.orders_this_month || 0, limits.max_orders)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Customers Limit */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-white/60">Base de Clientes</span>
                                    <span>{stats?.customers_total || 0} / {limits.max_customers || '∞'}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${getPercentage(stats?.customers_total || 0, limits.max_customers)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Users Limit */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-white/60">Usuarios Staff</span>
                                    <span>{stats?.users_count || 1} / {limits.max_users || '∞'}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${getPercentage(stats?.users_count || 1, limits.max_users)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Details / Actions */}
                <div className="space-y-8">
                    <div className="bg-[#1a1f2e] border border-white/5 rounded-[2.5rem] p-6">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-white/40">
                            <Zap size={16} className="text-primary" /> Acciones Rápidas
                        </h4>
                        <div className="space-y-3">
                            <button
                                onClick={() => document.getElementById('plans-comparison')?.scrollIntoView({ behavior: 'smooth' })}
                                className="w-full flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-all group"
                            >
                                <span className="font-bold text-sm">Cambiar mi Plan</span>
                                <ChevronRight className="text-primary group-hover:translate-x-1 transition-transform" size={18} />
                            </button>
                            <button
                                onClick={() => setReportModalOpen(true)}
                                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
                            >
                                <span className="font-bold text-sm">Reportar un Pago</span>
                                <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-transform" size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-[2.5rem] p-6">
                        <div className="flex gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-white">Método Manual</h4>
                                <p className="text-xs text-white/40 mt-1 leading-relaxed">
                                    Tu cuenta está en modalidad de pago por transferencia. Para activar planes Pro contacta a soporte.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History Table */}
            <div className="bg-[#1a1f2e] border border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center gap-3">
                    <History className="text-primary" size={24} />
                    <h3 className="text-xl font-bold">Historial de Transacciones</h3>
                </div>
                {transactions.length > 0 ? (
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] uppercase font-black text-white/30 tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Fecha</th>
                                <th className="px-8 py-5">Descripción</th>
                                <th className="px-8 py-5">Monto</th>
                                <th className="px-8 py-5">Método</th>
                                <th className="px-8 py-5 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6 text-sm font-medium text-white/60">
                                        {new Date(tx.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-sm">{tx.notes || 'Suscripción Mensual'}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="text-[10px] text-white/20 font-mono">TXN-{tx.id}</div>
                                            {tx.receipt_url && (
                                                <a
                                                    href={tx.receipt_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <ExternalLink size={10} />
                                                    Ver Comprobante
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-black text-white/90">
                                        ${tx.amount.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2 py-1 rounded">
                                            {tx.payment_method}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${tx.payment_status === 'completed'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : tx.payment_status === 'pending'
                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {tx.payment_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-20 text-center space-y-4">
                        <History className="mx-auto text-white/5" size={64} />
                        <div className="text-white/20 font-bold uppercase tracking-widest text-xs">No hay transacciones registradas</div>
                    </div>
                )}
            </div>

            {/* Plans Comparison Section */}
            <div id="plans-comparison" className="pt-20">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-black mb-4">Mejora tu Potencial</h2>
                    <p className="text-white/40">Elige el plan que mejor se adapte al volumen de tu funeraria.</p>
                </div>
                <PlanComparison
                    plans={plans}
                    currentPlanId={subscription?.plan_id || 0}
                    onSelectPlan={handleUpgradePlan}
                />
            </div>

            {/* Plan Change Modal with Coupon Support */}
            <PlanChangeModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmUpgrade}
                plan={confirmModal.plan}
                cycle={confirmModal.cycle}
            />

            <PaymentReportModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                onSuccess={fetchBillingData}
            />
        </div>
    );
}
