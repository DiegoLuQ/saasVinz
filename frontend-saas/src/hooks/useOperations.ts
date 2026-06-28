import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';

export function useOperations(options: {
    showCompleted: boolean;
    startDate: string;
    endDate: string;
    specificStatus: string;
    sortOrder: 'asc' | 'desc';
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    setConfirmModal: (modal: any) => void;
    setSelectedOrder: (order: any) => void;
    selectedOrder: any;
}) {
    const queryClient = useQueryClient();
    const { showCompleted, startDate, endDate, specificStatus, sortOrder, showToast, setConfirmModal, setSelectedOrder, selectedOrder } = options;

    // Evidence State
    const [evidenceStepId, setEvidenceStepId] = useState<number | null>(null);
    const [evidenceComments, setEvidenceComments] = useState<string[]>(['', '', '']);
    const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Server time
    const [serverTime, setServerTime] = useState('');

    const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<any[]>({
        queryKey: ['daily-orders', showCompleted, startDate, endDate, specificStatus, sortOrder],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('scope', showCompleted ? 'completed' : 'active');
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (specificStatus !== 'all') params.append('status', specificStatus);
            if (sortOrder) params.append('sort_order', sortOrder);
            return apiRequest(`/api/internal/operations/ops/daily-orders?${params.toString()}`);
        },
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000, // Poll every 60s for new orders
    });

    const fetchServerTime = async () => {
        try {
            const data = await apiRequest('/api/internal/operations/ops/current-time');
            if (data.current_time) {
                setServerTime(data.current_time);
            }
        } catch (err) {
            console.error('Error fetching server time:', err);
        }
    };

    const handleAdvanceStep = async (orderId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirmar avance',
            message: '¿Confirmar avance de etapa? asegúrate de haber subido la evidencia necesaria.',
            onConfirm: async () => {
                try {
                    const updatedOrder = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/advance`, {
                        method: 'PATCH'
                    });
                    showToast('Orden avanzada exitosamente', 'success');
                    setSelectedOrder(updatedOrder);
                    queryClient.invalidateQueries({ queryKey: ['daily-orders'] });
                    setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    showToast(err.message || 'Error al avanzar orden', 'error');
                }
            }
        });
    };

    const handleFinalizeOrder = async (orderId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Finalizar Orden',
            message: '¿Finalizar orden? Esto notificará al cliente.',
            onConfirm: async () => {
                try {
                    const updatedOrder = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/finalize`, {
                        method: 'PATCH'
                    });
                    showToast('Orden finalizada exitosamente', 'success');
                    setSelectedOrder(updatedOrder);
                    queryClient.invalidateQueries({ queryKey: ['daily-orders'] });
                    setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    showToast(err.message || 'Error al finalizar orden', 'error');
                }
            }
        });
    };

    const handleRevertStep = async (orderId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Retroceder etapa',
            message: '¿Estás seguro de que deseas retroceder a la etapa anterior?',
            onConfirm: async () => {
                try {
                    const updatedOrder = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/revert`, {
                        method: 'PATCH'
                    });
                    showToast('Orden retrocedida exitosamente', 'success');
                    setSelectedOrder(updatedOrder);
                    queryClient.invalidateQueries({ queryKey: ['daily-orders'] });
                    setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    showToast(err.message || 'Error al retroceder orden', 'error');
                }
            }
        });
    };

    const handleUpdateStepTime = async (orderId: number, stepId: number, newDate: string) => {
        try {
            const updatedOrder = await apiRequest(`/api/internal/operations/ops/orders/${orderId}/steps/${stepId}/time?completed_at=${encodeURIComponent(newDate)}`, {
                method: 'PATCH'
            });
            showToast('Fecha actualizada', 'success');
            setSelectedOrder(updatedOrder);
            queryClient.invalidateQueries({ queryKey: ['daily-orders'] });
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar fecha', 'error');
        }
    };

    const handleStartOrder = async (orderId: number) => {
        try {
            await apiRequest(`/api/internal/operations/plant/cremations/${orderId}/start?furnace_id=default&temperature=800`, {
                method: 'POST'
            });
            showToast('Proceso iniciado correctamente', 'success');
            queryClient.invalidateQueries({ queryKey: ['daily-orders'] });
        } catch (err: any) {
            showToast(err.message || 'Error al iniciar el proceso', 'error');
        }
    };

    const handleOpenEvidence = (stepId: number) => {
        if (evidenceStepId === stepId) {
            setEvidenceStepId(null);
            setEvidenceComments(['', '', '']);
            setEvidencePhoto(null);
            return;
        }

        const existing = selectedOrder?.evidence?.find((e: any) => e.step_id === stepId);
        if (existing) {
            const comments = [...existing.comments];
            while (comments.length < 3) comments.push('');
            setEvidenceComments(comments.slice(0, 3));
        } else {
            setEvidenceComments(['', '', '']);
        }

        setEvidencePhoto(null);
        setEvidenceStepId(stepId);
    };

    const handleUploadEvidence = async () => {
        if (!selectedOrder || !evidenceStepId) return;

        const hasComments = evidenceComments.some(c => c.trim() !== '');
        if (!evidencePhoto && !hasComments) {
            showToast('Debes agregar una foto o al menos un comentario', 'error');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        if (evidencePhoto) formData.append('photo', evidencePhoto);

        const validComments = evidenceComments.filter(c => c.trim() !== '');
        formData.append('comments', JSON.stringify(validComments));

        try {
            const updatedOrder = await apiRequest(`/api/internal/operations/ops/evidence?cremation_id=${selectedOrder.id}&step_id=${evidenceStepId}`, {
                method: 'POST',
                body: formData,
            });

            showToast('Evidencia guardada correctamente', 'success');
            setEvidencePhoto(null);
            setEvidenceComments(['', '', '']);
            setEvidenceStepId(null);
            setSelectedOrder(updatedOrder);
            queryClient.invalidateQueries({ queryKey: ['daily-orders'] });
        } catch (err: any) {
            showToast(err.message || 'Error al guardar evidencia', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEvidence = async (evidenceId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Evidencia',
            message: '¿Estás seguro de que deseas eliminar esta evidencia? Se borrará la foto y los comentarios permanentemente.',
            onConfirm: async () => {
                try {
                    const updatedOrder = await apiRequest(`/api/internal/operations/ops/evidence/${evidenceId}`, {
                        method: 'DELETE'
                    });
                    showToast('Evidencia eliminada', 'success');
                    setSelectedOrder(updatedOrder);
                    queryClient.invalidateQueries({ queryKey: ['daily-orders'] });
                } catch (err: any) {
                    showToast(err.message || 'Error al eliminar evidencia', 'error');
                } finally {
                    setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    return {
        orders,
        ordersLoading,
        refetchOrders,
        serverTime,
        fetchServerTime,
        evidenceStepId,
        evidenceComments,
        evidencePhoto,
        setEvidencePhoto,
        setEvidenceComments,
        isSubmitting,
        handleAdvanceStep,
        handleFinalizeOrder,
        handleRevertStep,
        handleUpdateStepTime,
        handleStartOrder,
        handleOpenEvidence,
        handleUploadEvidence,
        handleDeleteEvidence
    };
}
