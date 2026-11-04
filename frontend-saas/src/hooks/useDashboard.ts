import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';

export interface TrendPoint {
    month: string;
    cremations: number;
    revenue: number;
}

export interface DashboardOrder {
    id: number;
    pet: string;
    pet_species?: string | null;
    pet_image: string | null;
    client: string;
    service_name: string;
    amount: number;
    status: string;
    step_name?: string | null;
    /** "HH:MM" si es de hoy, "dd/MM HH:MM" si no; "N/A" sin fecha */
    time: string;
    verification_code?: string | null;
    is_overdue?: boolean;
    scheduled_at_iso?: string | null;
}

export interface DashboardLimitItem {
    usage: number;
    max: number;
}

export interface DashboardPipelineCounts {
    por_iniciar: number;
    en_planta: number;
    atrasadas: number;
}

export interface DashboardLowStockProduct {
    id: number;
    name: string;
    code?: string | null;
    stock: number;
    category_name?: string | null;
    image_url?: string | null;
}

export interface DashboardSummary {
    stats: {
        total_customers: number;
        total_pets: number;
        total_orders: number;
        total_services: number;
        total_users: number;
        cremations_this_month: number;
        monthly_revenue: number;
        pending_revenue: number;
        /** Mes anterior hasta el mismo día/hora (mes a la fecha) */
        previous_month_revenue: number;
        /** Altas y entregas mes a la fecha vs. mes anterior a la misma fecha */
        new_pets_this_month?: number;
        new_pets_previous_month?: number;
        new_customers_this_month?: number;
        new_customers_previous_month?: number;
        cremations_previous_month?: number;
        partner_orders_this_month?: number;
        pending_commissions_amount?: number;
    };
    limits: Record<'pets' | 'customers' | 'orders' | 'services' | 'products' | 'plans' | 'partners' | 'users', DashboardLimitItem>;
    /** Órdenes abiertas que NO están programadas para hoy */
    recent_cremations: DashboardOrder[];
    /** Órdenes programadas para hoy (incluye las ya entregadas) */
    today_cremations: DashboardOrder[];
    /** Órdenes con fecha programada vencida y aún no entregadas */
    overdue_cremations?: DashboardOrder[];
    /** Conteo por estado operativo de órdenes activas */
    pipeline_counts?: DashboardPipelineCounts;
    /** Productos con stock crítico (<= 3) */
    low_stock_products?: DashboardLowStockProduct[];
    active_count: number;
}

// Query propia (no el bootstrap): refrescar el dashboard no debe recargar
// usuario, tenant, plantillas y catálogo de toda la sesión.
export const useDashboardSummary = () => {
    return useQuery<DashboardSummary>({
        queryKey: ['dashboard-summary'],
        queryFn: () => apiRequest('/api/internal/dashboard/summary'),
        refetchOnMount: 'always',
    });
};

export const useDashboardTrend = () => {
    return useQuery<TrendPoint[]>({
        queryKey: ['dashboard-trend'],
        queryFn: () => apiRequest('/api/internal/dashboard/trend'),
        staleTime: 5 * 60 * 1000,
    });
};
