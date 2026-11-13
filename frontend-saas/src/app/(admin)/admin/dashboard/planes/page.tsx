"use client";

import React, { useMemo, useState } from 'react';
import { FileDown, LayoutGrid, Plus, Table2 } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useAdminPlans, useAdminBootstrap } from '@/hooks/useAdminBootstrap';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import PlanCard, { type PlanData } from '@/components/admin/plans/PlanCard';
import CreatePlanModal from '@/components/admin/plans/CreatePlanModal';
import AnnualDiscountCard from '@/components/admin/plans/AnnualDiscountCard';
import LandingFeaturesCard from '@/components/admin/plans/LandingFeaturesCard';
import PlansMatrixView from '@/components/admin/plans/PlansMatrixView';
import type { PlanModuleDef } from '@/components/admin/plans/PlanModuleToggle';
import { downloadPlansPdf } from '@/components/admin/plans/buildPlansPdf';

const ALL_MODULES: PlanModuleDef[] = [
    { key: 'dashboard', name: 'Dashboard' },
    { key: 'clientes', name: 'Clientes' },
    { key: 'mascotas', name: 'Mascotas' },
    { key: 'servicios', name: 'Gestionar Servicios' },
    { key: 'ordenes', name: 'Asignar Servicios' },
    { key: 'inventario', name: 'Inventario' },
    { key: 'certificados', name: 'Documentos' },
    { key: 'pagos', name: 'Órdenes Cremación / Pagos' },
    { key: 'veterinarios', name: 'Veterinarios (Partners)' },
    { key: 'operaciones', name: 'Operaciones' },
    { key: 'configuracion', name: 'Configuración' }
];

const MAX_PLANS = 5;

export default function PlansPage() {
    const { showToast } = useToast();
    const bootstrapPlans = useAdminPlans();
    const { refetch: refetchBootstrap, isLoading } = useAdminBootstrap();

    // Tras cualquier cambio de planes, la landing (/) los muestra al instante: se
    // purga su caché (planes públicos y comparación de funciones).
    const afterChange = async () => {
        await refetchBootstrap();
        fetch('/api/revalidate-landing', { method: 'POST' }).catch(() => {});
    };

    const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('matrix');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [pdfBusy, setPdfBusy] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; plan: PlanData | null }>({
        open: false,
        plan: null
    });

    const plans: PlanData[] = useMemo(() => {
        // Mismo orden que la web y la facturación: «Orden» de cada plan (display_order).
        return [...(bootstrapPlans || [])].sort((a, b) =>
            ((a.display_order || 0) - (b.display_order || 0)) || ((a.price || 0) - (b.price || 0)));
    }, [bootstrapPlans]);

    const handleSavePlan = async (plan: PlanData) => {
        setSavingId(plan.id);
        try {
            await apiRequest(`/api/internal/creator/plans/${plan.id}`, {
                method: 'PUT',
                body: plan
            });
            showToast(`Plan ${plan.name} actualizado`, 'success');
            await afterChange();
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar plan', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const handleToggleActive = async (plan: PlanData) => {
        const next = plan.is_active === false;
        setSavingId(plan.id);
        try {
            await apiRequest(`/api/internal/creator/plans/${plan.id}`, {
                method: 'PUT',
                body: { ...plan, is_active: next }
            });
            showToast(next ? `Plan ${plan.name} activado` : `Plan ${plan.name} desactivado: ya no se ofrece`, 'success');
            await afterChange();
        } catch (err: any) {
            showToast(err.message || 'Error al cambiar el estado del plan', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const handleSaveFeatures = async (planId: number, features: Record<string, boolean>) => {
        const target = plans.find(p => p.id === planId);
        if (!target) {
            showToast('Plan no encontrado', 'error');
            return;
        }
        try {
            await apiRequest(`/api/internal/creator/plans/${planId}`, {
                method: 'PUT',
                body: { ...target, features }
            });
            showToast('Características actualizadas', 'success');
            await afterChange();
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar características', 'error');
        }
    };

    const handleDeleteConfirmed = async () => {
        const target = deleteModal.plan;
        if (!target) return;
        setSavingId(target.id);
        try {
            await apiRequest(`/api/internal/creator/plans/${target.id}`, { method: 'DELETE' });
            showToast(`Plan ${target.name} eliminado`, 'success');
            setDeleteModal({ open: false, plan: null });
            await afterChange();
        } catch (err: any) {
            showToast(err.message || 'Error al eliminar plan', 'error');
        } finally {
            setSavingId(null);
        }
    };

    const handleCreatePlan = async (name: string) => {
        if (plans.length >= MAX_PLANS) {
            showToast(`Has alcanzado el límite máximo de ${MAX_PLANS} planes`, 'error');
            return;
        }
        setCreating(true);
        try {
            await apiRequest('/api/internal/creator/plans', {
                method: 'POST',
                body: {
                    name,
                    price: 0,
                    max_pets: 999999,
                    max_customers: 999999,
                    max_orders: 10,
                    max_services: 10,
                    max_plans: 5,
                    max_products: 10,
                    max_users: 3,
                    max_partners: 5,
                    allowed_modules: ['dashboard', 'clientes', 'mascotas'],
                    is_active: true
                    // display_order: el backend lo pone al final.
                }
            });
            showToast(`Plan ${name} creado`, 'success');
            setCreateModalOpen(false);
            await afterChange();
        } catch (err: any) {
            showToast(err.message || 'Error al crear plan', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handlePdf = async () => {
        setPdfBusy(true);
        try {
            const disc = await apiRequest('/api/internal/creator/pricing/annual-discount').catch(() => null) as { pct?: number } | null;
            await downloadPlansPdf(plans, disc?.pct ?? null);
        } catch (err: any) {
            showToast(err?.message || 'No se pudo generar el PDF', 'error');
        } finally {
            setPdfBusy(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1850px] mx-auto space-y-6 sm:space-y-8 min-h-screen">
            <header className="flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-[#061121]/50 backdrop-blur-md z-30 py-4 mb-4">
                <div>
                    <h2 className="text-3xl font-black text-white">Configuración de Planes</h2>
                    <p className="text-white/40 text-sm">
                        Gestiona límites, módulos, % de cobertura y tiempos de vida por tier de suscripción
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Selector de vista: Tarjetas vs Matriz de Permisos */}
                    <div className="flex items-center bg-[#0a192f] p-1 rounded-2xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => setViewMode('matrix')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                viewMode === 'matrix'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            <Table2 size={16} />
                            <span>Matriz de Permisos</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                viewMode === 'cards'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            <LayoutGrid size={16} />
                            <span>Tarjetas y Límites</span>
                        </button>
                    </div>

                    <button
                        onClick={handlePdf}
                        disabled={pdfBusy || plans.length === 0}
                        className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white font-bold rounded-2xl transition-all"
                        title="Planes con precios, límites, módulos y características"
                    >
                        <FileDown size={18} />
                        <span>{pdfBusy ? 'Generando…' : 'Descargar PDF'}</span>
                    </button>
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        disabled={plans.length >= MAX_PLANS}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Crear Nuevo Plan</span>
                        <span className="ml-2 text-[10px] opacity-60">({plans.length}/{MAX_PLANS})</span>
                    </button>
                </div>
            </header>

            {viewMode === 'cards' && (
                <>
                    <AnnualDiscountCard plans={plans} onSaved={afterChange} onToast={showToast} />
                    <LandingFeaturesCard plans={plans} onSaved={afterChange} onToast={showToast} />
                </>
            )}

            {isLoading && plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p>Cargando planes del sistema...</p>
                </div>
            ) : viewMode === 'matrix' ? (
                <PlansMatrixView
                    plans={plans}
                    allModules={ALL_MODULES}
                    onSavePlan={handleSavePlan}
                />
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {plans.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            allModules={ALL_MODULES}
                            saving={savingId === plan.id}
                            onSave={handleSavePlan}
                            onSaveFeatures={handleSaveFeatures}
                            onDelete={() => setDeleteModal({ open: true, plan })}
                            onToggleActive={handleToggleActive}
                        />
                    ))}
                </div>
            )}

            <CreatePlanModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onConfirm={handleCreatePlan}
                creating={creating}
            />

            <DeleteConfirmationModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, plan: null })}
                onConfirm={handleDeleteConfirmed}
                title="Eliminar Plan de Suscripción"
                description={`¿Estás seguro de que deseas eliminar el plan "${deleteModal.plan?.name || ''}"? Esta acción no se puede deshacer y fallará si hay empresas asociadas.`}
                isDeleting={savingId !== null && savingId === deleteModal.plan?.id}
            />
        </div>
    );
}
