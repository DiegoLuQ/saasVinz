"use client";

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useAdminPlans, useAdminBootstrap } from '@/hooks/useAdminBootstrap';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import PlanCard, { type PlanData } from '@/components/admin/plans/PlanCard';
import CreatePlanModal from '@/components/admin/plans/CreatePlanModal';
import type { PlanModuleDef } from '@/components/admin/plans/PlanModuleToggle';

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

    const [savingId, setSavingId] = useState<number | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; plan: PlanData | null }>({
        open: false,
        plan: null
    });

    const plans: PlanData[] = useMemo(() => {
        return [...(bootstrapPlans || [])].sort((a, b) => {
            const priceDiff = (a.price || 0) - (b.price || 0);
            if (priceDiff !== 0) return priceDiff;
            // Empate por precio: respetar display_order como secundario
            return (a.display_order || 0) - (b.display_order || 0);
        });
    }, [bootstrapPlans]);

    const handleSavePlan = async (plan: PlanData) => {
        setSavingId(plan.id);
        try {
            await apiRequest(`/api/internal/creator/plans/${plan.id}`, {
                method: 'PUT',
                body: plan
            });
            showToast(`Plan ${plan.name} actualizado`, 'success');
            await refetchBootstrap();
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar plan', 'error');
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
            await refetchBootstrap();
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
            await refetchBootstrap();
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
                    max_pets: 10,
                    max_customers: 10,
                    max_orders: 10,
                    max_services: 10,
                    max_plans: 5,
                    max_products: 10,
                    max_users: 3,
                    max_partners: 5,
                    allowed_modules: ['dashboard', 'clientes', 'mascotas'],
                    is_active: true,
                    display_order: plans.length
                }
            });
            showToast(`Plan ${name} creado`, 'success');
            setCreateModalOpen(false);
            await refetchBootstrap();
        } catch (err: any) {
            showToast(err.message || 'Error al crear plan', 'error');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <header className="flex items-center justify-between sticky top-0 bg-[#061121]/50 backdrop-blur-md z-10 py-4 mb-4">
                <div>
                    <h2 className="text-3xl font-black text-white">Configuración de Planes</h2>
                    <p className="text-white/40 text-sm">Gestiona límites y módulos para cada tier de suscripción</p>
                </div>
                <button
                    onClick={() => setCreateModalOpen(true)}
                    disabled={plans.length >= MAX_PLANS}
                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    <span>Crear Nuevo Plan</span>
                    <span className="ml-2 text-[10px] opacity-60">({plans.length}/{MAX_PLANS})</span>
                </button>
            </header>

            {isLoading && plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p>Cargando planes del sistema...</p>
                </div>
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
