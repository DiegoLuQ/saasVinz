import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/admin/api';

export interface SystemAuditLogEntry {
    id: number;
    tenant_id: number | null;
    tenant_name: string | null;
    tenant_slug: string | null;
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

export interface SystemAuditLogsResponse {
    total: number;
    skip: number;
    limit: number;
    logs: SystemAuditLogEntry[];
}

export interface SystemAuditLogsFilters {
    skip?: number;
    limit?: number;
    action?: string;
    status?: string;
    tenant_id?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
}

export function useSystemAuditLogs(filters: SystemAuditLogsFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });

    return useQuery<SystemAuditLogsResponse>({
        queryKey: ['system-audit-logs', filters],
        queryFn: () => apiRequest(`/api/internal/creator/system/audit-logs?${params.toString()}`),
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}
