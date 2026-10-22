"use client";

import React, { createContext, useContext } from 'react';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { queryClient } from '@/lib/queryClient';

interface Actions {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
}

interface Permission {
    module_key: string;
    is_active: boolean;
    actions: Actions;
}

interface PermissionContextType {
    permissions: Permission[];
    loading: boolean;
    refreshPermissions: () => Promise<void>;
    hasPermission: (moduleKey: string, action: keyof Actions) => boolean;
    canView: (moduleKey: string) => boolean;
    canCreate: (moduleKey: string) => boolean;
    canEdit: (moduleKey: string) => boolean;
    canDelete: (moduleKey: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// Acciones que además dependen de una característica del plan (admin → Planes →
// "Configurar Características"). Espejo de PLAN_ACTION_FEATURES en
// backend/app/api/internal/admin/rbac/router.py. Sin el flag configurado se permite.
const PLAN_ACTION_FEATURES: Record<string, Partial<Record<keyof Actions, string>>> = {
    clientes: { create: 'clientes:crear', edit: 'clientes:editar', delete: 'clientes:eliminar' },
    mascotas: { create: 'mascotas:crear', edit: 'mascotas:editar', delete: 'mascotas:eliminar' },
    servicios: { create: 'servicios:crear', edit: 'servicios:editar' },
    ordenes: { create: 'ordenes:crear', edit: 'ordenes:editar', delete: 'ordenes:eliminar' },
};

export function PermissionProvider({ children }: { children: React.ReactNode }) {
    // Use the consolidated bootstrap hook instead of individual API call
    const { data: bootstrap, isLoading, refetch } = useSessionBootstrap();

    const refreshPermissions = async () => {
        // Invalidate and refetch bootstrap data
        await queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        await refetch();
    };

    const permissions = bootstrap?.rbac.modules || [];
    const planFeatures = (bootstrap?.tenant?.subscription_plan?.features || {}) as Record<string, unknown>;

    const hasPermission = (moduleKey: string, action: keyof Actions) => {
        const perm = permissions.find(p => p.module_key === moduleKey);
        if (!perm) return false;
        if (!perm.is_active) return false;
        const feature = PLAN_ACTION_FEATURES[moduleKey]?.[action];
        if (feature && planFeatures[feature] === false) return false;
        return perm.actions[action] === true;
    };

    const canView = (moduleKey: string) => hasPermission(moduleKey, 'view');
    const canCreate = (moduleKey: string) => hasPermission(moduleKey, 'create');
    const canEdit = (moduleKey: string) => hasPermission(moduleKey, 'edit');
    const canDelete = (moduleKey: string) => hasPermission(moduleKey, 'delete');

    return (
        <PermissionContext.Provider value={{
            permissions,
            loading: isLoading,
            refreshPermissions,
            hasPermission,
            canView,
            canCreate,
            canEdit,
            canDelete
        }}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionProvider');
    }
    return context;
}
