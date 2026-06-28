import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export interface Cremation {
    id: number;
    pet_id: number;
    service_id?: number;
    plan_id?: number;
    scheduled_at: string;
    completed_at?: string;
    created_at?: string;
    status: string;
    notes: string;
    region?: string;
    city?: string;
    address?: string;
    images?: string[];
    additional_services?: number[];
    total_price?: number;
    weight?: number;
    verification_code?: string;
    pet?: {
        id: number;
        name: string;
        image_url?: string;
        customer?: {
            name: string;
        };
    };
}

export const useCremations = () => {
    return useQuery<Cremation[]>({
        queryKey: ['cremations-simple'],
        queryFn: () => apiRequest('/api/internal/cremations/'),
    });
};

export const useUpdateCremationStatus = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            apiRequest(`/api/internal/cremations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cremations-simple'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Estado actualizado correctamente', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al actualizar estado', 'error');
        },
    });
};

export const useDeleteCremation = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/cremations/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cremations-simple'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Servicio eliminado correctamente', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar servicio', 'error');
        },
    });
};
