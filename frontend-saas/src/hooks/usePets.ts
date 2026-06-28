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
    age: number;
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
        mutationFn: (id: number) => apiRequest(`/api/internal/pets/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pets'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Mascota eliminada', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar mascota', 'error');
        },
    });
};
