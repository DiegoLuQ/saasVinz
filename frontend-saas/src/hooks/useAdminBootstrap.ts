import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/admin/api';
import { Veterinary } from '@/lib/admin/api';

const EMPTY_ARRAY: any[] = [];

// Types matching backend CreatorBootstrap schemas
export interface GrowthDataPoint {
    month: string;
    revenue: number;
    tenants: number;
}

export interface AdminBootstrapStats {
    total_tenants: number;
    active_tenants: number;
    total_revenue: number;
    total_mrr: number;
    due_today_count: number;
    cancelling_tenants_count: number;
    growth_data: GrowthDataPoint[];
}

export interface AdminBootstrapTenant {
    id: number;
    name: string;
    slug: string;
    rut?: string;
    email?: string;
    phone?: string;
    status: string;
    plan: string;
    revenue: number;
    billing_end_date?: string | null;
    created_at: string;
    resources?: {
        customers: number;
        pets: number;
        products: number;
        orders: {
            total: number;
            pending: number;
            in_process: number;
            completed: number;
            cancelled: number;
        };
        services: {
            active: number;
            inactive: number;
        };
        plan_details?: {
            max_pets: number | null;
            max_orders: number | null;
        };
    };
}

export interface DueSoonTenant {
    id: number;
    name: string;
    slug: string;
    plan: string;
    status: string;
    billing_end_date: string;
}

export interface AdminSaasConfig {
    id?: number;
    name?: string;
    slug?: string;
    logo?: string;
    [key: string]: any;
}

export interface AdminBootstrapResponse {
    user: {
        id: number;
        email: string;
        name: string;
        role: string;
    };
    stats: AdminBootstrapStats;
    tenants: AdminBootstrapTenant[];
    due_soon_tenants?: DueSoonTenant[];
    notifications: any[];
    veterinaries: Veterinary[];
    billing_transactions: any[];
    subscription_plans: any[];
    announcements: any[];
    saas_config?: AdminSaasConfig | null;
    metadata: {
        unread_notifications: number;
        pending_submissions: number;
    };
}

/**
 * Custom hook for SaaS Creator (Admin) bootstrap data.
 * Consolidates multiple initial Admin API calls into one.
 */
export function useAdminBootstrap() {
    return useQuery<AdminBootstrapResponse>({
        queryKey: ['admin-bootstrap'],
        queryFn: async () => {
            return apiRequest('/api/internal/creator/dashboard/bootstrap');
        },
        staleTime: 30 * 1000,
        retry: 1,
        refetchOnMount: true,
        enabled: typeof window !== 'undefined'
            && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/dashboard'))
            && !window.location.pathname.includes('/login')
            && !window.location.pathname.includes('/iniciar-sesion')
    });
}

// Helper hooks for specific data parts
export function useAdminStats() {
    const { data } = useAdminBootstrap();
    return data?.stats;
}

export function useAdminVets() {
    const { data } = useAdminBootstrap();
    return data?.veterinaries || EMPTY_ARRAY;
}

export function useAdminTenants() {
    const { data } = useAdminBootstrap();
    return data?.tenants || EMPTY_ARRAY;
}

export function useAdminDueSoon(): DueSoonTenant[] {
    const { data } = useAdminBootstrap();
    return data?.due_soon_tenants || EMPTY_ARRAY;
}

export function useAdminNotifications() {
    const { data } = useAdminBootstrap();
    return data?.notifications || EMPTY_ARRAY;
}

export function useAdminMetadata() {
    const { data } = useAdminBootstrap();
    return data?.metadata;
}

export function useAdminPlans() {
    const { data } = useAdminBootstrap();
    return data?.subscription_plans || EMPTY_ARRAY;
}

export function useAdminAnnouncements() {
    const { data } = useAdminBootstrap();
    return data?.announcements || EMPTY_ARRAY;
}

export function useAdminTransactions() {
    const { data } = useAdminBootstrap();
    return data?.billing_transactions || EMPTY_ARRAY;
}

export function useAdminSaasConfig() {
    const { data } = useAdminBootstrap();
    return data?.saas_config;
}
