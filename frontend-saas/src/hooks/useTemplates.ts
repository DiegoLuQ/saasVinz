import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

// ==========================================
// Types
// ==========================================
export interface Template {
    id: number;
    name: string;
    category: string;
    paper_format: string;
    theme: string;
    title: string | null;
    subtitle: string | null;
    declaration_text: string | null;
    signature_text: string | null;
    memorial_message: string | null;
    memorial_title: string | null;
    header_logo_url: string | null;
    header_logo_x: string;
    header_logo_y: string;
    background_logo_url: string | null;
    background_logo_x: string;
    background_logo_y: string;
    background_logo_opacity: number;
    background_logo_rotation: number;
    header_logo_shape: string;
    background_logo_shape: string;
    farewell_text: string | null;
    sections_config: Record<string, { show: boolean, label?: string }>;
    sections_order: string[] | null;
    is_default: boolean;
    created_at: string;
}

export interface FarewellTemplate {
    id: number;
    name: string;
    description: string;
    config: any;
    is_default: boolean;
    created_at: string;
}

export type UnifiedDoc = 
    | (Template & { type: 'document', isGlobal: boolean }) 
    | (FarewellTemplate & { type: 'farewell', isGlobal: boolean });

interface TemplatesData {
    localTemplates: Template[];
    globalTemplates: Template[];
    farewellTemplates: FarewellTemplate[];
    tenantData: any;
}

// ==========================================
// Query: Fetch all templates
// ==========================================
export const useTemplates = () => {
    return useQuery<TemplatesData>({
        queryKey: ['templates-overview'],
        queryFn: async () => {
            const [localData, farewellData, globalData, tenantData] = await Promise.all([
                apiRequest('/api/internal/ops-records/templates'),
                apiRequest('/api/internal/farewell-templates'),
                apiRequest('/api/internal/ops-records/templates/global'),
                apiRequest('/api/internal/tenants/me')
            ]);
            return {
                localTemplates: localData || [],
                globalTemplates: globalData || [],
                farewellTemplates: farewellData || [],
                tenantData: tenantData || null
            };
        },
        staleTime: 60_000, // 1 minute fresh
    });
};

// ==========================================
// Mutations
// ==========================================
export const useSetDefaultTemplate = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async (templateId: number) => {
            return apiRequest('/api/internal/tenants/me', {
                method: 'PATCH',
                body: JSON.stringify({ default_certificate_template_id: templateId })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates-overview'] });
            showToast('Plantilla establecida como predeterminada', 'success');
        },
        onError: (err: any) => {
            showToast('Error al establecer predeterminada: ' + err.message, 'error');
        }
    });
};

export const useDeleteTemplate = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: async ({ id, type }: { id: number; type: 'document' | 'farewell' }) => {
            if (type === 'document') {
                return apiRequest(`/api/internal/ops-records/templates/${id}`, { method: 'DELETE' });
            } else {
                return apiRequest(`/api/internal/farewell-templates/${id}`, { method: 'DELETE' });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates-overview'] });
            showToast('Elemento eliminado correctamente', 'success');
        },
        onError: (err: any) => {
            showToast('Error al eliminar: ' + err.message, 'error');
        }
    });
};
