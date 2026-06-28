import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';

// Types matching backend Bootstrap schemas
export interface BootstrapUserData {
    id: number;
    email: string;
    name: string;
    role: string;
    is_active: boolean;
    tenant_id: number;
    created_at: string;
}

export interface BootstrapTenantData {
    id: number;
    name: string;
    short_name?: string;
    slug?: string;
    logo_url?: string;
    pending_reason?: string;
    status: string;
    plan: string;
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    subscription_plan?: any;
    social_media?: any;
    next_billing_date?: string;
    billing_cycle?: string;
    polar_customer_id?: string;
    polar_subscription_id?: string;
    subscription_status?: string;
    polar_cancel_at_period_end?: boolean;
    email?: string;
    phone?: string;
    address?: string;
}

export interface BootstrapModulePermission {
    module_key: string;
    is_active: boolean;
    actions: {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
    };
}

export interface BootstrapRBACData {
    modules: BootstrapModulePermission[];
    role: string;
}

export interface BootstrapMetadata {
    unread_notifications: number;
    pending_submissions: number;
}

export interface BootstrapThemeData {
    id: number;
    theme_mode: string;
    auto_light_start: string;
    auto_light_end: string;
    custom_theme_colors?: Record<string, any>;
}

export interface BootstrapAnnouncementData {
    id: number;
    title: string;
    content: string;
    type: string;
    display_type: string;
    show_once: boolean;
    must_read: boolean;
    priority: number;
}

export interface BootstrapNotificationData {
    id: number;
    title: string;
    message?: string;
    type: string;
    data?: any;
    is_read: boolean;
    created_at: string;
}

export interface BootstrapSubmissionData {
    id: number;
    owner_name: string;
    pet_name: string;
    pet_type: string;
    region?: string;
    city?: string;
    status: string;
    created_at: string;
}

export interface BootstrapDashboardStats {
    total_customers: number;
    total_pets: number;
    total_orders: number;
    total_services: number;
    total_users: number;
    cremations_this_month: number;
    monthly_revenue: number;
    pending_revenue: number;
    previous_month_revenue: number;
}

export interface BootstrapDashboardSummary {
    stats: BootstrapDashboardStats;
    limits: {
        pets: { usage: number; max: number };
        customers: { usage: number; max: number };
        orders: { usage: number; max: number };
        services: { usage: number; max: number };
        products: { usage: number; max: number };
        plans: { usage: number; max: number };
    };
    recent_cremations: any[]; // Matches the DashboardRecentActivity schema
}

export interface BootstrapResponse {
    user: BootstrapUserData;
    tenant: BootstrapTenantData;
    rbac: BootstrapRBACData;
    theme?: BootstrapThemeData;
    announcements: BootstrapAnnouncementData[];
    dashboard?: BootstrapDashboardSummary;
    notifications: BootstrapNotificationData[];
    submissions: BootstrapSubmissionData[];
    farewell_templates: BootstrapAnnouncementData[]; // We can reuse or create specific type if needed
    document_templates: any[];
    services: any[];
    plans: any[];
    product_categories: any[];
    product_providers: any[];
    operation_steps: any[];
    metadata: BootstrapMetadata;
}

/**
 * Custom hook for session bootstrap data.
 * Consolidates user, tenant, RBAC, and metadata into a single request.
 * 
 * Benefits:
 * - Single request instead of 4+ separate calls
 * - Automatic caching with 5-minute stale time
 * - Shared state across all components
 * - Automatic refetch on authentication changes
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSessionBootstrap();
 * 
 * if (isLoading) return <Loading />;
 * if (error) return <Error />;
 * 
 * const { user, tenant, rbac } = data;
 * ```
 */
export function useSessionBootstrap() {
    return useQuery<BootstrapResponse>({
        queryKey: ['session-bootstrap'],
        queryFn: async () => {
            const data = await apiRequest('/api/internal/auth/bootstrap');
            console.log('[Bootstrap] Data loaded:', {
                user: data.user.email,
                tenant: data.tenant.name,
                modules: data.rbac.modules.length
            });
            return data;
        },
        // 30s keeps the bootstrap fresh enough to react to admin plan / feature
        // changes without hammering the backend on every navigation.
        staleTime: 30 * 1000,
        retry: 1,
        // Revalidate on remount so navigating between tenant pages picks up
        // new feature flags / plan limits as soon as staleTime expires.
        refetchOnMount: true,
        enabled: typeof window !== 'undefined'
            && !window.location.pathname.startsWith('/iniciar-sesion')
            && !window.location.pathname.includes('/login')
            && !window.location.pathname.includes('/public/')
    });
}

const EMPTY_ARRAY: any[] = [];

/**
 * Helper hook to check if user has permission for a specific module action
 */
export function useHasPermission(moduleKey: string, action: 'view' | 'create' | 'edit' | 'delete') {
    const { data } = useSessionBootstrap();

    if (!data) return false;

    const module = data.rbac.modules.find(m => m.module_key === moduleKey);
    return module?.is_active && module.actions[action];
}

/**
 * Helper hook to get current user
 */
export function useCurrentUser() {
    const { data } = useSessionBootstrap();
    return data?.user;
}

/**
 * Helper hook to get current tenant
 */
export function useCurrentTenant() {
    const { data } = useSessionBootstrap();
    return data?.tenant;
}

/**
 * Helper hook to get theme configuration
 */
export function useThemeConfig() {
    const { data } = useSessionBootstrap();
    return data?.theme;
}

/**
 * Helper hook to get active announcements
 */
export function useAnnouncements() {
    const { data } = useSessionBootstrap();
    return data?.announcements || EMPTY_ARRAY;
}

/**
 * Helper hook to get dashboard summary
 */
export function useDashboardSummary() {
    const { data } = useSessionBootstrap();
    return data?.dashboard;
}

/**
 * Helper hook to get initial notifications
 */
export function useInitialNotifications() {
    const { data } = useSessionBootstrap();
    return data?.notifications || EMPTY_ARRAY;
}

/**
 * Helper hook to get initial submissions
 */
export function useInitialSubmissions() {
    const { data } = useSessionBootstrap();
    return data?.submissions || EMPTY_ARRAY;
}

/**
 * Helper hook to get farewell templates
 */
export function useFarewellTemplates() {
    const { data } = useSessionBootstrap();
    return data?.farewell_templates || EMPTY_ARRAY;
}

/**
 * Helper hook to get document templates
 */
export function useDocumentTemplates() {
    const { data } = useSessionBootstrap();
    return data?.document_templates || EMPTY_ARRAY;
}

/**
 * Helper hook to get services
 */
export function useServices() {
    const { data } = useSessionBootstrap();
    return data?.services || EMPTY_ARRAY;
}

/**
 * Helper hook to get plans
 */
export function usePlans() {
    const { data } = useSessionBootstrap();
    return data?.plans || EMPTY_ARRAY;
}

/**
 * Helper hook to get product categories
 */
export function useProductCategories() {
    const { data } = useSessionBootstrap();
    return data?.product_categories || EMPTY_ARRAY;
}

/**
 * Helper hook to get product providers
 */
export function useProductProviders() {
    const { data } = useSessionBootstrap();
    return data?.product_providers || EMPTY_ARRAY;
}

/**
 * Helper hook to get operation steps
 */
export function useOperationSteps() {
    const { data } = useSessionBootstrap();
    return data?.operation_steps || EMPTY_ARRAY;
}
