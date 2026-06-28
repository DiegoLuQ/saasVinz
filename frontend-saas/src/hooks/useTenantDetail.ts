import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/admin/api';
import type { TenantUser, ModuleData } from '@/components/admin/tenant-detail/types';

export interface TenantDetailBootstrap {
    tenant: any;
    plans: any[];
    users: TenantUser[];
    modules: ModuleData;
}

export function useTenantDetail(slug: string | undefined) {
    return useQuery<TenantDetailBootstrap>({
        queryKey: ['tenant-detail', slug],
        queryFn: () => apiRequest(`/api/internal/creator/tenants/${slug}/dashboard_bootstrap`),
        enabled: !!slug,
        staleTime: 60 * 1000, // 1 min
        retry: 1,
    });
}
