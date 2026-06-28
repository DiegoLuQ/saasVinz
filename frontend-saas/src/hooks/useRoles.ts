import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export const useRoleConfig = (role: string) => {
    return useQuery<any[]>({
        queryKey: ['role-config', role],
        queryFn: () => apiRequest(`/api/internal/rbac/tenant-config/${role}`),
    });
};

export const useToggleModule = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ role, moduleKey, isActive }: { role: string; moduleKey: string; isActive: boolean }) =>
            apiRequest('/api/internal/rbac/toggle-module', {
                method: 'PUT',
                body: JSON.stringify({
                    role,
                    module_key: moduleKey,
                    is_active: isActive
                })
            }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['role-config', variables.role] });
            // Invalidate bootstrap to update sidebar/permissions globally
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`Módulo ${variables.isActive ? 'activado' : 'desactivado'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al actualizar el módulo', 'error');
        },
    });
};

export const useUserPermissions = (userId: number | null) => {
    return useQuery<any[]>({
        queryKey: ['user-permissions', userId],
        queryFn: () => apiRequest(`/api/internal/auth/users/${userId}/permissions`),
        enabled: !!userId,
    });
};

export const useSaveUserPermissions = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ userId, permissions }: { userId: number; permissions: any[] }) =>
            apiRequest(`/api/internal/auth/users/${userId}/permissions`, {
                method: 'PUT',
                body: JSON.stringify(permissions)
            }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
            showToast('Permisos guardados correctamente', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al guardar permisos', 'error');
        },
    });
};
