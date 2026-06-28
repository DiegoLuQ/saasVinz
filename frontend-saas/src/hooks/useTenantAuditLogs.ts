import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/admin/api';

export interface AuditLogEntry {
    id: number;
    tenant_id: number;
    user_id: number | null;
    user_name: string | null;
    action: string;
    resource_type: string | null;
    resource_id: number | null;
    resource_name: string | null;
    status: string;
    status_code: number | null;
    ip_address: string | null;
    error_message: string | null;
    created_at: string | null;
}

export interface AuditLogsResponse {
    total: number;
    skip: number;
    limit: number;
    logs: AuditLogEntry[];
}

export interface AuditLogsFilters {
    skip?: number;
    limit?: number;
    action?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
}

export function useTenantAuditLogs(slug: string | undefined, filters: AuditLogsFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });

    return useQuery<AuditLogsResponse>({
        queryKey: ['tenant-audit-logs', slug, filters],
        queryFn: () => apiRequest(`/api/internal/creator/tenants/${slug}/audit-logs?${params.toString()}`),
        enabled: !!slug,
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}
