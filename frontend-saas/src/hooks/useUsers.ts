import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export const useTenantUsers = (enabled: boolean = true) => {
    return useQuery<any[]>({
        queryKey: ['tenant-users'],
        queryFn: () => apiRequest('/api/internal/auth/users'),
        enabled,
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: any }) =>
            apiRequest(`/api/internal/auth/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
            showToast('Usuario actualizado con éxito', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al actualizar usuario', 'error');
        },
    });
};

export const useToggleUserStatus = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
            apiRequest(`/api/internal/auth/users/${userId}/toggle`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: isActive }),
            }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
            showToast(`Usuario ${variables.isActive ? 'activado' : 'desactivado'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al cambiar estado del usuario', 'error');
        },
    });
};
