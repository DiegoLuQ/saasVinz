import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export interface Customer {
    id: number;
    rut: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    region?: string;
    city?: string;
    country?: string;
}

export const useCustomers = () => {
    return useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: () => apiRequest('/api/internal/customers/'),
    });
};

export const useSaveCustomer = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ customer, isEdit }: { customer: Partial<Customer>; isEdit: boolean }) => {
            const endpoint = isEdit ? `/api/internal/customers/${customer.id}` : '/api/internal/customers/';
            const method = isEdit ? 'PATCH' : 'POST';
            return apiRequest(endpoint, {
                method,
                body: JSON.stringify(customer),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`Cliente ${variables.isEdit ? 'actualizado' : 'creado'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al guardar cliente', 'error');
        },
    });
};

export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/customers/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Cliente eliminado', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar cliente', 'error');
        },
    });
};
