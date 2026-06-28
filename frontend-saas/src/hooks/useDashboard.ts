import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export interface TrendPoint {
    month: string;
    cremations: number;
    revenue: number;
}

export const useDashboardSummary = () => {
    return useQuery({
        queryKey: ['session-bootstrap'],
        queryFn: () => apiRequest('/api/internal/auth/bootstrap'),
        select: (data) => data.dashboard
    });
};

export const useDashboardTrend = () => {
    return useQuery<TrendPoint[]>({
        queryKey: ['dashboard-trend'],
        queryFn: () => apiRequest('/api/internal/dashboard/trend'),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCompleteCremation = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: number) =>
            apiRequest(`/api/internal/cremations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'entregado' }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Orden marcada como entregada', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al completar proceso', 'error');
        },
    });
};
