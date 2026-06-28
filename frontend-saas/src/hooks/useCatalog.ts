import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export interface Product {
    id: number;
    name: string;
    code: string;
    sale_price: number;
    cost_price: number;
    stock: number;
    is_active: boolean;
}

export interface Service {
    id: number;
    name: string;
    description: string;
    price: number;
    cost: number;
    is_active: boolean;
}

export interface Plan {
    id: number;
    name: string;
    description: string;
    price: number;
    cost: number;
    image_url?: string | null;
    is_active: boolean;
    services?: Service[];
    service_ids?: number[];
    products?: Product[];
    product_ids?: number[];
}

export const useCatalogServices = () => {
    return useQuery<Service[]>({
        queryKey: ['catalog-services'],
        queryFn: () => apiRequest('/api/internal/services/'),
    });
};

export const useCatalogPlans = () => {
    return useQuery<Plan[]>({
        queryKey: ['catalog-plans'],
        queryFn: () => apiRequest('/api/internal/plans/'),
    });
};

export const useCatalogProducts = () => {
    return useQuery<Product[]>({
        queryKey: ['catalog-products'],
        queryFn: () => apiRequest('/api/internal/products/'),
    });
};

export const useSaveService = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ service, isEdit }: { service: Partial<Service>; isEdit: boolean }) => {
            const endpoint = isEdit ? `/api/internal/services/${service.id}` : '/api/internal/services/';
            const method = isEdit ? 'PATCH' : 'POST';
            return apiRequest(endpoint, {
                method,
                body: JSON.stringify(service),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
            queryClient.invalidateQueries({ queryKey: ['catalog-plans'] }); // Plans might contain services
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`Servicio ${variables.isEdit ? 'actualizado' : 'creado'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al guardar servicio', 'error');
        },
    });
};

export const useDeleteService = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/services/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
            queryClient.invalidateQueries({ queryKey: ['catalog-plans'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Servicio eliminado', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar servicio', 'error');
        },
    });
};

export const useSavePlan = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ plan, isEdit }: { plan: Partial<Plan>; isEdit: boolean }) => {
            const endpoint = isEdit ? `/api/internal/plans/${plan.id}` : '/api/internal/plans/';
            const method = isEdit ? 'PATCH' : 'POST';
            return apiRequest(endpoint, {
                method,
                body: JSON.stringify(plan),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['catalog-plans'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`Plan ${variables.isEdit ? 'actualizado' : 'creado'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al guardar plan', 'error');
        },
    });
};

export const useDeletePlan = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (id: number) => apiRequest(`/api/internal/plans/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['catalog-plans'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Plan eliminado', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar plan', 'error');
        },
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
            queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast(`Producto ${variables.isEdit ? 'actualizado' : 'creado'} con éxito`, 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al guardar producto', 'error');
        },
    });
};
