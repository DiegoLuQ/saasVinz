import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

// ==========================================
// Types
// ==========================================

export interface DocumentItem {
    id: number;
    cremation_id: number;
    number: string;
    type: string;
    pet_name: string;
    service_type: string;
    issue_date: string;
    html_content?: string;
    is_generated: boolean;
    created_at: string;
}

export interface DocumentStats {
    certificados: number;
    recibos: number;
    autorizaciones: number;
    otros: number;
}

interface DocumentsResponse {
    documents: DocumentItem[];
    stats: DocumentStats;
}

// ==========================================
// Query: list + stats
// ==========================================

export const useDocuments = () => {
    return useQuery<DocumentsResponse>({
        queryKey: ['ops-documents'],
        queryFn: () => apiRequest('/api/internal/ops-records/'),
        staleTime: 30_000, // 30s — fresh for the typical browsing session
    });
};

// ==========================================
// On-demand: full HTML content (large payload — fetched lazily for printing)
// ==========================================

export const fetchDocumentContent = async (id: number): Promise<string> => {
    const res = await apiRequest(`/api/internal/ops-records/certificates/${id}/content`);
    return res.html_content as string;
};

// ==========================================
// Mutation: delete (handles both generated certs and uploaded files)
// ==========================================

export const useDeleteDocument = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ id, isGenerated }: { id: number; isGenerated: boolean }) => {
            const endpoint = isGenerated
                ? `/api/internal/ops-records/certificates/${id}`
                : `/api/internal/ops-records/files/${id}`;
            return apiRequest(endpoint, { method: 'DELETE' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ops-documents'] });
            showToast('Documento eliminado correctamente', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || 'Error al eliminar documento', 'error');
        },
    });
};
