"use client";

import React, { createContext, useContext } from 'react';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { queryClient } from '@/lib/queryClient';

interface SubscriptionPlan {
    id: number;
    name: string;
    max_pets: number;
    max_services: number;
    max_plans: number;
    max_products: number;
    max_orders: number;
    max_customers: number;
    max_users: number;
    allowed_modules: string[];
}

interface TenantData {
    id: number;
    name: string;
    slug?: string;
    public_token?: string;
    subscription_plan?: SubscriptionPlan;
    short_name?: string;
    logo_url?: string;
    status: string;
    plan: string;
    timezone?: string;
    next_billing_date?: string;
    // Acceso de demostración (plan superior temporal)
    demo_active?: boolean;
    demo_plan_name?: string | null;
    demo_expires_at?: string | null;
    contracted_plan_name?: string | null;
}

interface TenantContextType {
    tenantData: TenantData | null;
    loading: boolean;
    refreshTenantData: () => Promise<void>;
    formatLimit: (limit: number | undefined) => string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
    // Use the consolidated bootstrap hook instead of individual API call
    const { data: bootstrap, isLoading, refetch } = useSessionBootstrap();

    const refreshTenantData = async () => {
        // Invalidate and refetch bootstrap data
        await queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        await refetch();
    };

    const formatLimit = (limit: number | undefined): string => {
        if (limit === undefined || limit === null) return '0';
        if (limit >= 999999) return '∞';
        return limit.toString();
    };

    return (
        <TenantContext.Provider value={{
            tenantData: bootstrap?.tenant || null,
            loading: isLoading,
            refreshTenantData,
            formatLimit
        }}>
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}
