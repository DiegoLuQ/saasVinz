import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/veterinary/api';

const EMPTY_ARRAY: any[] = [];

export interface BootstrapUserData {
    id: number;
    email: string;
    name: string;
    role: string;
    is_active: boolean;
    tenant_id: number;
    created_at: string;
}

export interface VetMetadata {
    unread_notifications: number;
    total_commission_pending: number;
    active_links_count: number;
}

export interface PartnerLink {
    id: number;
    tenant: {
        id: number;
        name: string;
        slug: string;
    };
    status: string;
    tipo_comision: string;
    monto_comision: number;
    porcentaje_comision: number;
    slug_publico: string;
    created_at: string;
}

export interface VetCommission {
    id: number;
    cremation_id: number;
    partner_id: number;
    amount: number;
    status: string;
    paid_at?: string;
    created_at: string;
    notes?: string;
    oc_number?: number;
    pet_name?: string;
    tenant_name?: string;
}

export interface VeterinaryInDB {
    id: number;
    name: string;
    slug: string;
    email: string;
    is_active: boolean;
    rut?: string;
    phone?: string;
    address?: string;
}

export interface VeterinaryBootstrapResponse {
    user: BootstrapUserData;
    veterinary: VeterinaryInDB;
    links: PartnerLink[];
    commissions: VetCommission[];
    notifications: any[];
    metadata: VetMetadata;
}

/**
 * Hook to fetch all initial data for the Veterinary Portal.
 */
export function useVeterinaryBootstrap() {
    return useQuery<VeterinaryBootstrapResponse>({
        queryKey: ['veterinary-bootstrap'],
        queryFn: async () => {
            return apiRequest('/api/veterinary/auth/bootstrap');
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnMount: false,
        enabled: typeof window !== 'undefined'
            && window.location.pathname.startsWith('/veterinary')
            && !window.location.pathname.includes('/login')
    });
}

// Helper hooks
export function useVetLinks() {
    const { data } = useVeterinaryBootstrap();
    return data?.links || EMPTY_ARRAY;
}

export function useVetCommissions() {
    const { data } = useVeterinaryBootstrap();
    return data?.commissions || EMPTY_ARRAY;
}

export function useVetStats() {
    const { data } = useVeterinaryBootstrap();
    return data?.metadata;
}

export function useVetProfile() {
    const { data } = useVeterinaryBootstrap();
    return data?.veterinary;
}
