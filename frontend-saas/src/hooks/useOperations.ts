import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';

export type OpsTab = 'today' | 'in_progress' | 'not_started' | 'finished';

export interface OrderEvidence {
    id: number;
    step_id: number;
    photo_url: string | null;
    comments: string[];
    created_at: string;
}

export interface OpsOrder {
    id: number;
    oc_number: number | null;
    verification_code: string | null;
    pet_name: string;
    pet_breed: string | null;
    pet_species: string;
    customer_name: string;
    customer_address: string | null;
    customer_phone: string | null;
    tenant_slug: string | null;
    tracking_token: string | null;
    timeline_metadata: Record<string, { completed_at?: string; completed_at_formatted?: string }> | null;
    current_step_id: number | null;
    status: string;
    weight: number | null;
    evidence: OrderEvidence[];
    created_at: string;
    scheduled_at: string | null;
    step_started_at: string | null;
    current_step_has_evidence: boolean;
    partner_name: string | null;
    partner_address?: string | null;
    partner_phone?: string | null;
    customer_email?: string | null;
    pickup_address?: string | null;
    pickup_city?: string | null;
    pickup_region?: string | null;
    delivery_address?: string | null;
    delivery_city?: string | null;
    delivery_region?: string | null;
    cremation_type?: string | null;
    notes?: string | null;
    pet_image_url?: string | null;
}

export interface OpsBoardResponse {
    items: OpsOrder[];
    total: number;
    page: number;
    page_size: number;
    counts: Record<OpsTab, number>;
}

export const OPS_PAGE_SIZE = 12;
const BOARD_KEY = 'ops-board';

export const FINISHED = ['completed', 'delivered', 'completado', 'entregado'];

export const isFinished = (o: Pick<OpsOrder, 'status'>) => FINISHED.includes((o.status || '').toLowerCase());
/** La fase es la fuente de verdad: sin fase asignada = por iniciar (igual que el backend). */
export const isNotStarted = (o: Pick<OpsOrder, 'current_step_id'>) => !o.current_step_id;

export function useOpsBoard(tab: OpsTab, q: string, page: number) {
    return useQuery<OpsBoardResponse>({
        queryKey: [BOARD_KEY, tab, q, page],
        queryFn: () => {
            const params = new URLSearchParams({ tab, page: String(page), page_size: String(OPS_PAGE_SIZE) });
            if (q) params.set('q', q);
            return apiRequest(`/api/internal/operations/ops/board?${params.toString()}`);
        },
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    });
}

type ToastFn = (msg: string, type: 'success' | 'error' | 'info') => void;

/** Acciones sobre la orden abierta. Todas devuelven la orden actualizada del backend. */
export function useOpsOrderActions(showToast: ToastFn, onOrderUpdated: (order: OpsOrder) => void) {
    const queryClient = useQueryClient();
    const [busy, setBusy] = useState<string | null>(null);

    const run = async (key: string, request: () => Promise<OpsOrder>, successMsg: string) => {
        setBusy(key);
        try {
            const updated = await request();
            onOrderUpdated(updated);
            queryClient.invalidateQueries({ queryKey: [BOARD_KEY] });
            showToast(successMsg, 'success');
            return updated;
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'No se pudo completar la acción', 'error');
            return null;
        } finally {
            setBusy(null);
        }
    };

    const patch = (orderId: number, action: string) =>
        apiRequest(`/api/internal/operations/ops/orders/${orderId}/${action}`, { method: 'PATCH' });

    return {
        busy,
        advance: (orderId: number, starting: boolean) =>
            run('advance', () => patch(orderId, 'advance'), starting ? 'Proceso iniciado' : 'Fase completada'),
        revert: (orderId: number) => run('revert', () => patch(orderId, 'revert'), 'Fase anterior restaurada'),
        finalize: (orderId: number) => run('finalize', () => patch(orderId, 'finalize'), 'Orden concluida y marcada como entregada'),
        updateStepTime: (orderId: number, stepId: number, newDate: string) =>
            run(
                'time',
                () => apiRequest(`/api/internal/operations/ops/orders/${orderId}/steps/${stepId}/time?completed_at=${encodeURIComponent(newDate)}`, { method: 'PATCH' }),
                'Hora actualizada',
            ),
        uploadEvidence: (orderId: number, stepId: number, photo: File | null, comments: string[]) => {
            const formData = new FormData();
            if (photo) formData.append('photo', photo);
            formData.append('comments', JSON.stringify(comments.filter(c => c.trim() !== '')));
            return run(
                'evidence',
                () => apiRequest(`/api/internal/operations/ops/evidence?cremation_id=${orderId}&step_id=${stepId}`, { method: 'POST', body: formData }),
                'Evidencia guardada',
            );
        },
        deleteEvidence: (evidenceId: number) =>
            run('evidence', () => apiRequest(`/api/internal/operations/ops/evidence/${evidenceId}`, { method: 'DELETE' }), 'Evidencia eliminada'),
    };
}

export const searchOpsOrders = (q: string, pageSize = 6): Promise<OpsBoardResponse> =>
    apiRequest(`/api/internal/operations/ops/board?tab=all&page_size=${pageSize}&q=${encodeURIComponent(q)}`);
