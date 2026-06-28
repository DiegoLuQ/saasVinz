"use client";

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenantDetail } from '@/hooks/useTenantDetail';
import TenantLayoutHeader from '@/components/admin/tenant-detail/TenantLayoutHeader';
import TenantTabsNav from '@/components/admin/tenant-detail/TenantTabsNav';
import TenantModulesModal from '@/components/admin/tenant-detail/TenantModulesModal';

export default function TenantDetailLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const tenantSlug = params.slug as string;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data, isLoading } = useTenantDetail(tenantSlug);

    const [showModulesModal, setShowModulesModal] = useState(false);
    const [savingModules, setSavingModules] = useState(false);
    const [moduleRole, setModuleRole] = useState('admin');
    const [overrides, setOverrides] = useState<any[]>([]);

    // Sync overrides from server data when modal opens or data changes
    React.useEffect(() => {
        if (data?.modules?.overrides) {
            setOverrides(data.modules.overrides);
        }
    }, [data?.modules?.overrides]);

    const toggleModuleOverride = useCallback((moduleKey: string, isActive: boolean) => {
        setOverrides(prev => {
            const existing = prev.find((o: any) => o.module_key === moduleKey && o.role === moduleRole);
            return existing
                ? prev.map((o: any) =>
                    o.module_key === moduleKey && o.role === moduleRole
                        ? { ...o, is_active: isActive }
                        : o
                )
                : [...prev, { role: moduleRole, module_key: moduleKey, is_active: isActive }];
        });
    }, [moduleRole]);

    const handleSaveModules = async () => {
        setSavingModules(true);
        try {
            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/modules`, {
                method: 'PUT',
                body: overrides
            });
            showToast('Configuración de módulos aplicada', 'success');
            setShowModulesModal(false);
            queryClient.invalidateQueries({ queryKey: ['tenant-detail', tenantSlug] });
        } catch (err: any) {
            showToast(err.message || 'Error al guardar módulos', 'error');
        } finally {
            setSavingModules(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const moduleData = {
        all_modules: data?.modules?.all_modules || [],
        plan_modules: data?.modules?.plan_modules || [],
        overrides
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20 px-4 md:px-8">
            <TenantLayoutHeader
                tenantName={data?.tenant?.name}
                tenantId={data?.tenant?.id}
                tenantSlug={data?.tenant?.slug}
                onOpenModules={() => setShowModulesModal(true)}
            />

            <TenantTabsNav slug={tenantSlug} usersCount={data?.users?.length} />

            <div className="pt-2">{children}</div>

            <TenantModulesModal
                isOpen={showModulesModal}
                tenantName={data?.tenant?.name}
                moduleData={moduleData}
                moduleRole={moduleRole}
                saving={savingModules}
                onClose={() => setShowModulesModal(false)}
                onChangeRole={setModuleRole}
                onToggleOverride={toggleModuleOverride}
                onSave={handleSaveModules}
            />
        </div>
    );
}
