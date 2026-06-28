import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/tenant/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePolar } from '@/hooks/usePolar';

import { CurrentPlanCard } from '@/components/tenant/billing/CurrentPlanCard';
import { PlanComparison } from '@/components/tenant/billing/PlanComparison';
import { BillingHistory } from '@/components/tenant/billing/BillingHistory';
import { PaymentReportModal } from '@/components/tenant/billing/PaymentReportModal';
import { PlanChangeModal } from '@/components/tenant/billing/PlanChangeModal';

interface BillingTabProps {
    bootstrapTenant: any;
    bootstrapData: any;
    bootstrapUser: any;
}

export function BillingTab({ bootstrapTenant, bootstrapData, bootstrapUser }: BillingTabProps) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { openPortal, createCheckout, loading: polarLoading } = usePolar();

    const [availablePlans, setAvailablePlans] = useState([]);
    const [billingHistory, setBillingHistory] = useState([]);
    const [loadingBilling, setLoadingBilling] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, plan: null, cycle: 'monthly' as any });

    const fetchBillingData = async () => {
        if (availablePlans.length > 0 && billingHistory.length > 0) return;
        setLoadingBilling(true);
        try {
            const [plansData, historyData] = await Promise.all([
                apiRequest('/api/internal/billing/plans'),
                apiRequest('/api/internal/billing/history')
            ]);
            setAvailablePlans(plansData);
            setBillingHistory(historyData);
        } catch (error) {
            console.error("Error fetching billing data", error);
        } finally {
            setLoadingBilling(false);
        }
    };

    const handleUpgradePlan = (planId: number, interval: 'monthly' | 'annual') => {
        const selectedPlan = availablePlans.find((p: any) => p.id === planId);
        setConfirmModal({
            isOpen: true,
            plan: selectedPlan || null,
            cycle: interval
        });
        confirmUpgrade(selectedPlan, interval);
    };

    const confirmUpgrade = async (plan: any, cycle: string, couponCode?: string) => {
        if (!plan) return;

        try {
            if (plan.polar_product_id) {
                const successUrl = `${window.location.origin}/tenant/dashboard/configuracion?tab=facturacion&success=true`;

                await createCheckout({
                    product_id: plan.polar_product_id,
                    success_url: successUrl,
                    target_resource: 'tenant',
                    target_id: (bootstrapTenant?.id || 0).toString(),
                    action: 'plan_upgrade',
                    customer_email: bootstrapTenant?.email || bootstrapUser?.email || ''
                });
                return;
            }

            await apiRequest('/api/internal/billing/change-plan-request', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: plan.id,
                    billing_cycle: cycle,
                    coupon_code: couponCode
                })
            });

            showToast('Solicitud enviada exitosamente. Te notificaremos cuando sea aprobada.', 'success');
            setConfirmModal({ isOpen: false, plan: null, cycle: 'monthly' as any });
            fetchBillingData();
        } catch (error: any) {
            console.error("Error requesting plan change", error);
            showToast(error.message || 'Error al solicitar cambio de plan', 'error');
        }
    };

    useEffect(() => {
        fetchBillingData();
    }, []);

    useEffect(() => {
        const success = searchParams.get('success');
        if (success === 'true') {
            showToast('¡Plan activado exitosamente! Bienvenido al siguiente nivel.', 'success');
            const url = new URL(window.location.href);
            url.searchParams.delete('success');
            url.searchParams.delete('customer_session_token');
            window.history.replaceState({}, '', url.toString());
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        }
    }, [searchParams, queryClient, showToast]);

    if (!bootstrapTenant || !bootstrapTenant.subscription_plan) {
        return <div className="p-8 text-center text-muted-foreground">Cargando información del plan...</div>;
    }

    const currentPlan = bootstrapTenant.subscription_plan;
    const limits = bootstrapData?.dashboard?.limits || {
        pets: { usage: 0, max: 0 },
        customers: { usage: 0, max: 0 },
        users: { usage: 0, max: 0 },
        orders: { usage: 0, max: 0 }
    };
    const nextBilling = (bootstrapTenant as any).next_billing_date;
    const billingCycle = (bootstrapTenant as any).billing_cycle || 'monthly';

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <CurrentPlanCard
                        planName={currentPlan.name}
                        status={bootstrapTenant.status || 'active'}
                        price={currentPlan.monthly_price}
                        billingCycle={billingCycle}
                        nextBillingDate={nextBilling}
                        limits={limits as any}
                        onUpgradeClick={() => document.getElementById('plan-comparison')?.scrollIntoView({ behavior: 'smooth' })}
                    />
                </div>

                {/* Quick Actions Panel */}
                <div className="space-y-8">
                    <div className="bg-[#1a1f2e] border border-white/5 rounded-[2.5rem] p-6">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-white/40">
                            <Zap size={16} className="text-primary" /> Acciones Rápidas
                        </h4>
                        <div className="space-y-3">
                            <button
                                onClick={() => document.getElementById('plan-comparison')?.scrollIntoView({ behavior: 'smooth' })}
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

                            {bootstrapTenant?.polar_customer_id && (
                                <button
                                    onClick={() => openPortal(bootstrapTenant.polar_customer_id!)}
                                    disabled={polarLoading}
                                    className="w-full flex items-center justify-between p-4 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-500">
                                            <CreditCard size={16} />
                                        </div>
                                        <span className="font-bold text-sm text-sky-400">Gestionar Suscripción</span>
                                    </div>
                                    <ChevronRight className="text-sky-500 group-hover:translate-x-1 transition-transform" size={18} />
                                </button>
                            )}
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

            <div id="plan-comparison" className="pt-8 border-t border-white/10">
                <div className="mb-6">
                    <h3 className="text-2xl font-bold">Planes Disponibles</h3>
                    <p className="text-muted-foreground">Mejora tu plan para acceder a más recursos.</p>
                </div>

                {loadingBilling ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : (
                    <div className="bg-black/20 rounded-xl p-6 border border-white/5">
                        <PlanComparison
                            plans={availablePlans}
                            currentPlanId={currentPlan.id}
                            onSelectPlan={handleUpgradePlan}
                        />
                    </div>
                )}
            </div>

            <div className="pt-8 border-t border-white/10">
                <div className="mb-6">
                    <h3 className="text-2xl font-bold">Historial de Pagos</h3>
                    <p className="text-muted-foreground">Tus últimas facturas y transacciones.</p>
                </div>

                {loadingBilling ? (
                    <div className="h-20 flex items-center justify-center text-muted-foreground">Cargando...</div>
                ) : (
                    <BillingHistory transactions={billingHistory} />
                )}
            </div>

            <PaymentReportModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                onSuccess={fetchBillingData}
                amountToPay={currentPlan.monthly_price}
            />

            <PlanChangeModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false, plan: null, cycle: 'monthly' })}
                onConfirm={(couponCode) => confirmUpgrade(confirmModal.plan, confirmModal.cycle, couponCode)}
                plan={confirmModal.plan}
                cycle={confirmModal.cycle as any}
            />

            {/* Success Overlay */}
            <AnimatePresence>
                {searchParams.get('success') === 'true' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#1a1f2e] border border-primary/20 p-10 rounded-[3rem] max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

                            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
                                <Check size={40} strokeWidth={3} />
                            </div>

                            <h2 className="text-3xl font-bold mb-4">¡Felicidades!</h2>
                            <p className="text-white/60 mb-8 leading-relaxed">
                                Tu suscripción ha sido actualizada correctamente. Ahora tienes acceso a todas las herramientas premium de tu nuevo plan.
                            </p>

                            <button
                                onClick={() => {
                                    const url = new URL(window.location.href);
                                    url.searchParams.delete('success');
                                    url.searchParams.delete('customer_session_token');
                                    window.history.replaceState({}, '', url.toString());
                                    router.refresh();
                                }}
                                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                            >
                                Ir a mi Dashboard
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
