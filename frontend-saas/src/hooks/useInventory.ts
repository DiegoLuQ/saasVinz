import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export interface Product {
    id: number;
    code: string;
    name: string;
    category_id: number;
    provider_id: number;
    cost_price: number;
    sale_price: number;
    stock: number;
    description: string;
    image_url: string;
    images: string[];
    availability_status: string;
    is_active: boolean;
    discount_percentage?: number;
    category?: { name: string };
    provider?: { name: string };
}

export const useProducts = () => {
    return useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => apiRequest('/api/internal/products/'),
    });
};

export const useSaveProduct = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ product, isEdit }: { product: Partial<Product>; isEdit: boolean }) => {
            const endpoint = isEdit ? `/api/internal/products/${product.id}` : '/api/internal/products/';
            const method = isEdit ? 'PATCH' : 'POST';
            return apiRequest(endpoint, {
                method,
                body: JSON.stringify(product),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`Producto ${variables.isEdit ? 'actualizado' : 'creado'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al guardar producto', 'error');
        },
    });
};

export const useDeleteProduct = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/products/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Producto eliminado', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar producto', 'error');
        },
    });
};

export const useUpdateStock = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ id, stock, status }: { id: number; stock: number; status: string }) =>
            apiRequest(`/api/internal/products/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ stock, availability_status: status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            showToast('Stock y estado actualizados', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al actualizar stock', 'error');
        },
    });
};
