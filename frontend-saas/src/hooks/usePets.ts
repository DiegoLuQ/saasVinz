import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export interface Pet {
    id: number;
    name: string;
    species: string;
    breed: string;
    size?: string;
    birth_date: string;
    death_date?: string;
    birth_date_precision?: 'day' | 'month' | 'year';
    death_date_precision?: 'day' | 'month' | 'year';
    age: number;
    age_unit?: 'days' | 'weeks' | 'months' | 'years';
    status: string;
    customer_id: number;
    image_url?: string;
    images?: string[];
    created_at?: string;
}

export const usePets = () => {
    return useQuery<Pet[]>({
        queryKey: ['pets'],
        queryFn: () => apiRequest('/api/internal/pets/'),
    });
};

export const useSavePet = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ pet, isEdit }: { pet: Partial<Pet>; isEdit: boolean }) => {
            const endpoint = isEdit ? `/api/internal/pets/${pet.id}` : '/api/internal/pets/';
            const method = isEdit ? 'PATCH' : 'POST';
            return apiRequest(endpoint, {
                method,
                body: JSON.stringify(pet),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pets'] });
            // Also invalidate dashboard summary as it might have pet counts/recent activity
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`Mascota ${variables.isEdit ? 'actualizada' : 'registrada'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al guardar mascota', 'error');
        },
    });
};

export const useDeletePet = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (arg: number | { id: number; keepPhotos?: boolean }) => {
            const { id, keepPhotos } = typeof arg === 'number' ? { id: arg, keepPhotos: false } : arg;
            return apiRequest(`/api/internal/pets/${id}${keepPhotos ? '?keep_photos=true' : ''}`, { method: 'DELETE' });
        },
        onSuccess: (res: { orders?: number; images_deleted?: number } | undefined) => {
            // Se borran también sus órdenes: refrescar listados que las muestran
            ['pets', 'session-bootstrap', 'cremations', 'cremations-simple', 'dashboard-summary', 'customers']
                .forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
            const extra = res?.orders ? ` junto con ${res.orders} orden(es)` : '';
            showToast(`Mascota eliminada${extra}`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar mascota', 'error');
        },
    });
};

/**
 * Marca una foto como principal (queda primera e `image_url`): la usan
 * certificado, plantillas, IA, memorial y seguimiento. No borra fotos.
 */
export const useSetMainImage = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    return useMutation({
        mutationFn: ({ petId, url }: { petId: number; url: string }) =>
            apiRequest(`/api/internal/pets/${petId}/main-image`, { method: 'PUT', body: JSON.stringify({ url }) }) as Promise<Pet>,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pets'] });
            queryClient.invalidateQueries({ queryKey: ['expediente'] });
            showToast('Foto principal actualizada', 'success');
        },
        onError: (err: Error) => showToast(err.message || 'No se pudo cambiar la foto principal', 'error'),
    });
};
