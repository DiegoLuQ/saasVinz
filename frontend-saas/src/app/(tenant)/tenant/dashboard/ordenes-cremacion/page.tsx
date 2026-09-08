"use client";

import React, { useEffect, useState } from 'react';
import {
    CreditCard,
    Search,
    Filter,
    Eye,
    CheckCircle2,
    Check,
    XSquare,
    Loader2,
    TrendingUp,
    Clock,
    ArrowRight,
    Edit3,
    Award,
    Palette,
    Layout,
    Printer,
    FileText,
    Save,
    ChevronDown,
    Calendar,
    User,
    ArrowUpDown,
    FilterX,
    RotateCcw,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Modal from '@/components/tenant/Modal';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { useFeatures } from '@/hooks/useFeatures';
import CancellationModal from '@/components/tenant/CancellationModal';
import { useFarewellTemplates, useDocumentTemplates, useDashboardSummary } from '@/hooks/useSessionBootstrap';
import { useQuery } from '@tanstack/react-query';

interface Cremation {
    id: number;
    oc_number?: number;
    pet_id: number;
    service_id?: number;
    plan_id?: number;
    scheduled_at: string;
    completed_at?: string;
    status: string;
    notes: string;
    total_price: number;
    cremation_type: string;
}

interface Pet {
    id: number;
    name: string;
    customer_id: number;
    image_url: string;
}

interface Customer {
    id: number;
    name: string;
}

interface StatusStyle {
    label: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
    glow: string;
}

const statusMap: Record<string, StatusStyle> = {
    'pendiente': {
        label: 'Pendiente',
        bg: 'bg-amber-500/10 hover:bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)]'
    },
    'pending': {
        label: 'Pendiente',
        bg: 'bg-amber-500/10 hover:bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)]'
    },
    'received': {
        label: 'Pendiente',
        bg: 'bg-amber-500/10 hover:bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)]'
    },
    'en_proceso': {
        label: 'En Proceso',
        bg: 'bg-sky-500/15 hover:bg-sky-500/20',
        border: 'border-sky-500/40',
        text: 'text-sky-300',
        dot: 'bg-sky-400 animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(14,165,233,0.18)]'
    },
    'processing': {
        label: 'En Proceso',
        bg: 'bg-sky-500/15 hover:bg-sky-500/20',
        border: 'border-sky-500/40',
        text: 'text-sky-300',
        dot: 'bg-sky-400 animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(14,165,233,0.18)]'
    },
    'entregado': {
        label: 'Entregado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'delivered': {
        label: 'Entregado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'finished': {
        label: 'Entregado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'completado': {
        label: 'Completado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'completed': {
        label: 'Completado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'cancelado': {
        label: 'Cancelado',
        bg: 'bg-rose-500/10 hover:bg-rose-500/15',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
        glow: 'shadow-[0_0_12px_rgba(244,63,94,0.12)]'
    },
    'canceled': {
        label: 'Cancelado',
        bg: 'bg-rose-500/10 hover:bg-rose-500/15',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
        glow: 'shadow-[0_0_12px_rgba(244,63,94,0.12)]'
    }
};

const GRADIENT_PALETTES = [
    ['#FFE259', '#FFA751', '#FF3366', '#FFE259'],
    ['#11998E', '#38EF7D', '#00F2FE', '#11998E'],
    ['#00C6FF', '#0072FF', '#7F00FF', '#00C6FF'],
    ['#EC008C', '#FC6767', '#7F00FF', '#EC008C'],
    ['#FF416C', '#FF4B2B', '#FFE259', '#FF416C']
];

// Emojis de respaldo cuando la plantilla no tiene logo/imagen de previsualización.
const FAREWELL_EMOJIS = ['🕊️', '🌸', '🌿', '💐', '🌟', '🐾'];

const getFormatLabel = (format?: string) => {
    if (!format) return 'Proporción N/A';
    if (format === '1:1') return 'Cuadrado (1:1)';
    if (format === '9:16') return 'Vertical (9:16)';
    if (format === '16:9') return 'Horizontal (16:9)';
    return `Formato (${format})`;
};

export default function OrdersPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { tenantData, formatLimit } = useTenant();
    const { hasFeature } = useFeatures();

    // Características por plan (configurables desde admin -> Planes -> "Configurar Características")
    const canGenerateCert = hasFeature('certificados:generar_pdf');
    const canUseDesign = hasFeature('certificados:diseno');

    // Consolidated data from Bootstrap
    const bootstrapFarewellTemplates = useFarewellTemplates();
    const bootstrapCertTemplates = useDocumentTemplates();
    const dashboardSummary = useDashboardSummary();

    const [loading, setLoading] = useState(true);

    // States for Modals
    const [isDesignFolderModalOpen, setIsDesignFolderModalOpen] = useState(false);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [certHtml, setCertHtml] = useState('');
    const [selectedCremationId, setSelectedCremationId] = useState<number | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | string>("");
    const [isConfirmPrintOpen, setIsConfirmPrintOpen] = useState(false);
    const [generatingCertId, setGeneratingCertId] = useState<number | null>(null);
    const [generatingReceiptId, setGeneratingReceiptId] = useState<number | null>(null);
    const [isReceiptPreview, setIsReceiptPreview] = useState(false);
    const [previewCremationId, setPreviewCremationId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [specificStatus, setSpecificStatus] = useState('all');
    const [showInProcess, setShowInProcess] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Cancellation State
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [idToCancel, setIdToCancel] = useState<number | null>(null);

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const { data: cremations = [], isLoading: isLoadingCremations, refetch: refetchCremations } = useQuery<any[]>({
        queryKey: ['cremations', startDate, endDate, specificStatus, sortOrder],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (specificStatus !== 'all') params.append('status', specificStatus);
            if (sortOrder) params.append('sort_order', sortOrder);
            return apiRequest(`/api/internal/cremations/?${params.toString()}`);
        },
        // El listado debe reflejar siempre las órdenes más recientes: el cliente
        // global trae refetchOnMount:false, así que al volver a esta página se
        // servía la caché y las órdenes recién creadas no aparecían.
        staleTime: 0,
        refetchOnMount: 'always',
    });

    useEffect(() => {
        setLoading(isLoadingCremations);
    }, [isLoadingCremations]);

    // Seleccionar plantilla por defecto desde bootstrap
    useEffect(() => {
        if (bootstrapCertTemplates.length > 0) {
            const defTemplate = bootstrapCertTemplates.find((t: any) => t.is_default);
            if (defTemplate) setSelectedTemplateId(defTemplate.id);
        }
    }, [bootstrapCertTemplates]);

    const fetchData = async () => {
        refetchCremations();
    };

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSpecificStatus('all');
        setShowInProcess(false);
        setSortOrder('desc');
        setSearchTerm('');
    };

    const handleStatusChange = async (cremationId: number, newStatus: string) => {
        if (newStatus === 'cancelado') {
            setIdToCancel(cremationId);
            setCancelModalOpen(true);
            return;
        }

        try {
            await apiRequest(`/api/internal/cremations/${cremationId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            showToast('Estado actualizado', 'success');
            fetchData();
        } catch (err: any) {
            showToast('Error al actualizar estado: ' + err.message, 'error');
        }
    };

    const confirmCancellation = async () => {
        if (!idToCancel) return;
        try {
            setLoading(true);
            await apiRequest(`/api/internal/cremations/${idToCancel}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'cancelado' }),
            });
            showToast('Orden cancelada correctamente', 'info');
            fetchData();
        } catch (err: any) {
            showToast('Error al cancelar pedido: ' + err.message, 'error');
        } finally {
            setLoading(false);
            setIdToCancel(null);
        }
    };

    const handleDeleteCremation = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await apiRequest(`/api/internal/cremations/${itemToDelete}`, {
                method: 'DELETE',
            });
            showToast('Orden eliminada correctamente', 'success');
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
            fetchData();
        } catch (err: any) {
            showToast('Error al eliminar pedido: ' + err.message, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleGenerateCertificate = async (cremationId: number, templateId?: number) => {
        setGeneratingCertId(cremationId);
        try {
            const response = await apiRequest('/api/internal/ops-records/generate', {
                method: 'POST',
                body: JSON.stringify({
                    cremation_id: cremationId,
                    certificate_type: 'Cremación',
                    template_id: templateId || (selectedTemplateId !== "" ? Number(selectedTemplateId) : undefined)
                }),
            });
            setCertHtml(response.html_content);
            setIsReceiptPreview(false);
            setPreviewCremationId(cremationId);
            setIsCertModalOpen(true);
        } catch (err: any) {
            showToast('Error al generar certificado: ' + err.message, 'error');
        } finally {
            setGeneratingCertId(null);
        }
    };

    const handleGenerateReceipt = async (cremationId: number, persist = false) => {
        if (persist) setLoading(true);
        setGeneratingReceiptId(cremationId);
        try {
            const response = await apiRequest('/api/internal/ops-records/receipt', {
                method: 'POST',
                body: JSON.stringify({
                    cremation_id: cremationId,
                    persist: persist
                }),
            });
            setCertHtml(response.html_content);
            setIsReceiptPreview(true);
            setPreviewCremationId(cremationId);
            setIsCertModalOpen(true);
            if (persist) {
                showToast(`Recibo ${response.number} guardado con éxito`, 'success');
            }
        } catch (err: any) {
            showToast('Error al procesar recibo: ' + err.message, 'error');
        } finally {
            setGeneratingReceiptId(null);
            setLoading(false);
        }
    };

    const handlePrintCert = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(certHtml);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, specificStatus, sortOrder]);

    // Cálculos para cards de resumen (Ingresos desde bootstrap = misma fuente que dashboard)
    const completedStatuses = ['completado', 'completed', 'entregado', 'delivered'];
    const cancelledStatuses = ['cancelado', 'canceled'];

    const getPrice = (c: any) => {
        const price = typeof c.total_price === 'string'
            ? Number(c.total_price.replace(/[^0-9,.-]+/g, "").replace(",", "."))
            : (c.total_price || 0);
        return isNaN(price) ? 0 : price;
    };

    const totalCompletado = dashboardSummary?.stats.monthly_revenue || 0;

    const pedidosPendientes = (cremations as any[])
        .filter((c: any) => {
            const s = c.status?.toLowerCase();
            return !completedStatuses.includes(s) && !cancelledStatuses.includes(s);
        })
        .reduce((acc: number, c: any) => acc + getPrice(c), 0);

    const pedidosEnProceso = (cremations as any[]).filter((c: any) => c.status?.toLowerCase() === 'en_proceso' || c.status?.toLowerCase() === 'processing').length;

    const totalCompletadosCount = (cremations as any[]).filter((c: any) => {
        const s = c.status?.toLowerCase();
        return s === 'completado' || s === 'completed' || s === 'entregado' || s === 'delivered';
    }).length;

    // Helper to filter cremations (Search Term & "En proceso" toggle)
    const filteredCremations = (cremations as any[]).filter(c => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || (
            c.id.toString().includes(searchLower) ||
            c.pet_name?.toLowerCase().includes(searchLower) ||
            c.customer_name?.toLowerCase().includes(searchLower) ||
            c.oc_number?.toString().includes(searchLower)
        );

        if (!matchesSearch) return false;

        // Si el usuario seleccionó un estado específico en el dropdown (ej: 'en_proceso' o 'pendiente'), respetarlo siempre
        if (specificStatus !== 'all') return true;

        // Cuando está en "all": si showInProcess está desmarcado, ocultamos las que están en proceso
        const statusLower = (c.status || '').toLowerCase();
        const isInProcess = statusLower === 'en_proceso' || statusLower === 'processing';

        if (isInProcess && !showInProcess) {
            return false;
        }

        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredCremations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCremations = filteredCremations.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate, specificStatus, showInProcess]);

    // Note: Date, Type, Status and Sort are handled in the backend now.

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Historial y Cobros</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base md:text-lg">Registro financiero de órdenes, cobros y facturación comercial.</p>
                </div>
                <div className="text-xs font-semibold text-muted-foreground px-4 py-2 bg-white/5 rounded-full border border-white/5 h-fit">
                    Órdenes Completadas: {(cremations as any[]).filter(c => { const s = c.status?.toLowerCase(); return s === 'completado' || s === 'completed' || s === 'entregado' || s === 'delivered'; }).length} / {formatLimit(tenantData?.subscription_plan?.max_orders)}
                </div>
            </div>

            {/* Summary Cards — desde los datos de la tabla */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-xs font-bold text-emerald-400">Completados</span>
                    </div>
                    <p className="mt-4 text-muted-foreground text-sm font-medium">Ingresos</p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums break-all">${totalCompletado.toLocaleString()}</h3>
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
                </div>

                <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-2xl bg-yellow-500/10 text-yellow-500">
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-bold text-yellow-500">Por Cobrar</span>
                    </div>
                    <p className="mt-4 text-muted-foreground text-sm font-medium">Pendientes</p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums break-all">${pedidosPendientes.toLocaleString()}</h3>
                </div>

                <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-2xl bg-white/5" style={{ color: 'lab(54.1736% 13.3368 -74.6839)', backgroundColor: 'lab(54.1736% 13.3368 -74.6839 / 0.1)' }}>
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: 'lab(54.1736% 13.3368 -74.6839)' }}>Acción Requerida</span>
                    </div>
                    <p className="mt-4 text-muted-foreground text-sm font-medium">Órdenes en Proceso</p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums">{pedidosEnProceso}</h3>
                </div>

                <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 size={24} />
                        </div>
                        <span className="text-xs font-bold text-emerald-400">Histórico</span>
                    </div>
                    <p className="mt-4 text-muted-foreground text-sm font-medium">Total Completados</p>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums">{totalCompletadosCount}</h3>
                </div>
            </div>

            {/* Main Content */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden">
                <div className="p-6 lg:p-8 border-b border-white/5 bg-white/5 space-y-6">
                    {/* Simplified Filters Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-4 items-end">
                        {/* Search Bar */}
                        <div className="xl:col-span-4 space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Búsqueda rápida</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    placeholder="Mascota, cliente o ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-background/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-primary/50 transition-all font-medium h-[50px]"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2 xl:col-span-3">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Rango de Fechas</label>
                            <div className="flex items-center gap-2 h-[50px] bg-background border border-white/10 rounded-2xl px-3 group overflow-hidden">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-transparent border-none text-xs text-foreground outline-none w-full cursor-pointer min-w-0"
                                />
                                <span className="text-muted-foreground/30">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent border-none text-xs text-foreground outline-none w-full cursor-pointer min-w-0"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Estado</label>
                            <SearchableSelect
                                options={[
                                    { value: "all", label: "Todos los estados" },
                                    { value: "pendiente", label: "Pendiente" },
                                    { value: "en_proceso", label: "En proceso" },
                                    { value: "entregado", label: "Entregado" },
                                    { value: "cancelado", label: "Cancelado" }
                                ]}
                                value={specificStatus}
                                onChange={setSpecificStatus}
                                placeholder="Estado..."
                                renderOption={(opt, isSelected) => {
                                    const st = statusMap[String(opt.value).toLowerCase()] || {
                                        dot: 'bg-gray-400',
                                        text: 'text-gray-700'
                                    };
                                    return (
                                        <div
                                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                                isSelected
                                                    ? 'bg-primary text-white shadow-md'
                                                    : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {opt.value !== 'all' ? (
                                                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : st.dot}`} />
                                                ) : (
                                                    <span className={`w-2.5 h-2.5 rounded-full border border-gray-400 ${isSelected ? 'border-white' : ''}`} />
                                                )}
                                                <span>{opt.label}</span>
                                            </div>
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                    );
                                }}
                            />
                        </div>

                        {/* Actions, Sort & "Ver en proceso" Checkbox */}
                        <div className="flex items-center gap-2 h-[50px] xl:col-span-3">
                            <button
                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                className="flex items-center justify-center gap-2 px-3.5 bg-white/5 border border-white/10 text-foreground rounded-2xl hover:bg-white/10 transition-all h-[50px] shrink-0"
                                title={sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
                            >
                                <ArrowUpDown size={18} />
                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{sortOrder}</span>
                            </button>

                            <label
                                className={`flex items-center justify-between sm:justify-start gap-2.5 px-4 h-[50px] rounded-2xl border cursor-pointer select-none transition-all flex-1 min-w-0 ${
                                    showInProcess
                                        ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                                }`}
                                title="Mostrar también cremaciones activas en proceso"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={showInProcess}
                                        onChange={(e) => setShowInProcess(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 text-primary focus:ring-0 focus:ring-offset-0 bg-background/50 accent-primary cursor-pointer shrink-0"
                                    />
                                    <span className="text-xs font-bold truncate">Ver en proceso</span>
                                </div>
                                {pedidosEnProceso > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold shrink-0 ${
                                        showInProcess ? 'bg-primary text-white' : 'bg-white/10 text-muted-foreground'
                                    }`}>
                                        {pedidosEnProceso}
                                    </span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-primary mb-4" size={40} />
                        <p className="text-muted-foreground font-medium">Obteniendo servicios...</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Swipe indicator gradient — only visible on touch / narrow screens */}
                        <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-card/80 to-transparent lg:hidden z-10" />
                        <div className="lg:hidden absolute top-1.5 right-2 z-20 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 bg-card/70 px-2 py-1 rounded-md border border-white/5 pointer-events-none">
                            Deslizar →
                        </div>
                        <div className="overflow-x-auto min-h-[650px]">
                            <table className="w-full text-left min-w-[760px]">
                            <thead>
                                <tr className="bg-white/2 border-b border-white/5">
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Orden</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mascota</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
                                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedCremations.length > 0 ? paginatedCremations.map((cremation: any) => {
                                    const statusKey = cremation.status?.trim().toLowerCase();
                                    const status = statusMap[statusKey] || { label: cremation.status, color: 'text-gray-400 bg-gray-400/10' };

                                    return (
                                        <tr key={cremation.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6">
                                                <div>
                                                    <p className="font-bold text-sm">#OC-{cremation.oc_number || cremation.id}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium mt-1">
                                                        {cremation.scheduled_at 
                                                            ? new Date(cremation.scheduled_at).toLocaleString() 
                                                            : cremation.created_at 
                                                                ? new Date(cremation.created_at).toLocaleString() 
                                                                : 'Sin fecha'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden mr-3 border border-white/10 shadow-inner group-hover:border-primary/30 transition-colors">
                                                        {cremation.pet_image_url ? (
                                                            <img
                                                                src={getImageUrl(cremation.pet_image_url)}
                                                                alt={cremation.pet_name}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + cremation.pet_name + '&background=random';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Layout size={20} className="text-muted-foreground/30" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold block">{cremation.pet_name || 'Cargando...'}</span>
                                                        <span className="text-[10px] text-muted-foreground">{cremation.cremation_type || 'Servicio'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center text-sm font-medium">
                                                    {cremation.customer_name || `Cliente #${cremation.pet_id || '...'}`}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="font-bold text-sm">${(cremation.total_price || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="w-40">
                                                    <SearchableSelect
                                                        options={[
                                                            { value: "pendiente", label: "Pendiente" },
                                                            { value: "en_proceso", label: "En proceso" },
                                                            { value: "entregado", label: "Entregado" },
                                                            { value: "cancelado", label: "Cancelado" }
                                                        ]}
                                                        value={cremation.status}
                                                        onChange={(val) => handleStatusChange(cremation.id, val)}
                                                        placeholder="Estado..."
                                                        renderTrigger={(selectedOpt, isOpen) => {
                                                            const st = statusMap[cremation.status?.trim().toLowerCase()] || {
                                                                label: selectedOpt?.label || cremation.status || 'Estado...',
                                                                bg: 'bg-white/5 hover:bg-white/10',
                                                                border: 'border-white/10',
                                                                text: 'text-foreground',
                                                                dot: 'bg-muted-foreground',
                                                                glow: ''
                                                            };
                                                            return (
                                                                <div
                                                                    className={`group/badge flex items-center justify-between px-3 py-1.5 rounded-full border transition-all duration-200 backdrop-blur-md ${st.bg} ${st.border} ${st.glow} hover:scale-[1.02] active:scale-[0.98] ${
                                                                        isOpen ? 'ring-2 ring-primary/40' : ''
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                                                                        <span className={`text-xs font-black tracking-tight truncate ${st.text}`}>
                                                                            {st.label}
                                                                        </span>
                                                                    </div>
                                                                    <ChevronDown
                                                                        size={14}
                                                                        className={`shrink-0 ml-1.5 transition-transform duration-200 ${st.text} opacity-60 group-hover/badge:opacity-100 ${
                                                                            isOpen ? 'rotate-180' : ''
                                                                        }`}
                                                                    />
                                                                </div>
                                                            );
                                                        }}
                                                        renderOption={(opt, isSelected) => {
                                                            const st = statusMap[String(opt.value).toLowerCase()] || {
                                                                dot: 'bg-gray-400',
                                                                text: 'text-gray-700'
                                                            };
                                                            return (
                                                                <div
                                                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                                                        isSelected
                                                                            ? 'bg-primary text-white shadow-md'
                                                                            : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2.5">
                                                                        <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : st.dot}`} />
                                                                        <span>{opt.label}</span>
                                                                    </div>
                                                                    {isSelected && <Check size={14} className="text-white" />}
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Acciones principales */}
                                                    <button
                                                        onClick={() => router.push(`/dashboard/recepcion-pedidos?cremation_id=${cremation.id}`)}
                                                        title="Modificar"
                                                        className="p-2.5 rounded-xl transition-all duration-200 shadow-md border bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border-blue-500/20 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 active:scale-95"
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    <button
                                                        title="Generar Recibo"
                                                        disabled={generatingReceiptId === cremation.id}
                                                        onClick={() => handleGenerateReceipt(cremation.id)}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 shadow-md border ${generatingReceiptId === cremation.id
                                                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                                            : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white border-purple-500/20 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 active:scale-95'
                                                            }`}
                                                    >
                                                        {generatingReceiptId === cremation.id ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCremationId(cremation.id);
                                                            handleGenerateCertificate(cremation.id);
                                                        }}
                                                        disabled={generatingCertId === cremation.id || !canGenerateCert}
                                                        title={canGenerateCert ? "Certificado" : "No incluido en tu plan"}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 shadow-md border ${canGenerateCert
                                                            ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white border-amber-500/20 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95"
                                                            : "bg-white/5 text-muted-foreground/30 border-white/5 opacity-40 cursor-not-allowed"
                                                            } disabled:opacity-50`}
                                                    >
                                                        {generatingCertId === cremation.id ? <Loader2 className="animate-spin" size={18} /> : <Award size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (canUseDesign) {
                                                                setSelectedCremationId(cremation.id);
                                                                setIsDesignFolderModalOpen(true);
                                                            }
                                                        }}
                                                        disabled={!canUseDesign}
                                                        title={canUseDesign ? "Diseño" : "No incluido en tu plan"}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 shadow-md border ${canUseDesign
                                                            ? "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-primary/20 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-95"
                                                            : "bg-white/5 text-muted-foreground/30 border-white/5 opacity-40 cursor-not-allowed shadow-none"
                                                            }`}
                                                    >
                                                        <Palette size={18} />
                                                    </button>
                                                    {(['processing', 'en_proceso', 'pendiente', 'pending', 'received'].includes(statusKey)) && (
                                                        <button
                                                            onClick={() => {
                                                                setItemToDelete(cremation.id);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            title="Eliminar Orden"
                                                            className="p-2.5 rounded-xl transition-all duration-200 shadow-md border bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border-red-500/20 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/10 active:scale-95"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }).reverse() : (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <Layout size={48} className="mx-auto mb-4 text-muted-foreground/20" />
                                            <p className="text-muted-foreground font-medium">No se han registrado servicios en este periodo.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && filteredCremations.length > 0 && (
                    <div className="p-6 border-t border-white/5 bg-white/5">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            {/* Items per page selector */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mostrar:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-all font-medium cursor-pointer"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-xs text-muted-foreground">
                                    Mostrando {startIndex + 1}-{Math.min(endIndex, filteredCremations.length)} de {filteredCremations.length}
                                </span>
                            </div>

                            {/* Page navigation */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 rounded-xl bg-background/50 border border-white/10 text-sm font-medium hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Primera
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 rounded-xl bg-background/50 border border-white/10 text-sm font-medium hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>

                                {/* Page numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentPage === pageNum
                                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                    : 'bg-background/50 border border-white/10 hover:bg-white/5'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-xl bg-background/50 border border-white/10 text-sm font-medium hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Siguiente
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 rounded-xl bg-background/50 border border-white/10 text-sm font-medium hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Última
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Selección de Plantilla de Despedida */}
            <Modal
                isOpen={isDesignFolderModalOpen}
                onClose={() => setIsDesignFolderModalOpen(false)}
                title="Elegir Plantilla de Despedida"
                maxWidth="max-w-4xl"
            >
                <div>
                    <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes spin-slow {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        .animate-spin-slow {
                            animation: spin-slow 10s linear infinite;
                        }
                    ` }} />
                    <p className="text-muted-foreground mb-8 text-center text-sm">Selecciona el diseño que deseas usar para crear el mensaje de despedida de la mascota.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-items-center pb-6">
                        {bootstrapFarewellTemplates.map((template, index) => {
                            const colors = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
                            return (
                                <div
                                    key={template.id}
                                    className="group flex flex-col items-center cursor-pointer max-w-[220px]"
                                    onClick={() => {
                                        router.push(`/dashboard/documentos/disenos?cremation_id=${selectedCremationId}&id=${template.id}`);
                                    }}
                                >
                                    {/* Contenedor del Círculo con borde animado */}
                                    <div className="relative w-40 h-40 md:w-44 md:h-44 rounded-full overflow-hidden p-[3px] flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-primary/20">
                                        {/* Capa de Gradiente que rota en el fondo */}
                                        <div
                                            className="absolute inset-[-20%] animate-spin-slow"
                                            style={{
                                                background: `conic-gradient(from 0deg, ${colors.join(', ')})`,
                                            }}
                                        />
                                        {/* Capa interior que tapa el centro para simular el borde */}
                                        <div className="relative w-full h-full rounded-full bg-[#0b1329] overflow-hidden flex items-center justify-center">
                                            {template.preview_url ? (
                                                <img
                                                    src={getImageUrl(template.preview_url)}
                                                    alt={template.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full flex items-center justify-center p-4 text-center"
                                                    style={{ background: `linear-gradient(135deg, ${colors[0]}22, ${colors[1]}22)` }}
                                                >
                                                    <span className="text-6xl md:text-7xl drop-shadow-lg transition-transform duration-500 group-hover:scale-110" role="img" aria-label="Plantilla sin imagen">
                                                        {FAREWELL_EMOJIS[index % FAREWELL_EMOJIS.length]}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Overlay al pasar el mouse (hover) */}
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-3 text-center">
                                                <span className="bg-primary text-primary-foreground p-2 rounded-full text-xs font-bold shadow-lg flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                    <ArrowRight size={16} />
                                                </span>
                                                <span className="text-[10px] text-white font-bold mt-1.5 uppercase tracking-wider">Usar Diseño</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalles debajo del Círculo */}
                                    <div className="mt-4 text-center flex flex-col items-center">
                                        <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors duration-300 line-clamp-1">
                                            {template.name}
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 max-w-[180px] min-h-[32px] leading-relaxed">
                                            {template.description || 'Plantilla de despedida personalizada.'}
                                        </p>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary mt-2 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                                            {getFormatLabel((template as any).config?.format)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* Modal de Previsualización de Certificado / Recibo */}
            <Modal
                isOpen={isCertModalOpen}
                onClose={() => setIsCertModalOpen(false)}
                title={isReceiptPreview ? "Vista Previa del Recibo" : "Vista Previa del Certificado"}
                maxWidth={isReceiptPreview ? "max-w-3xl" : "max-w-5xl"}
            >
                <div className="flex flex-col h-[75vh] gap-4">
                    {/* Barra de Acciones Fija (Siempre Visible) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white/5 rounded-3xl gap-4 border border-white/5 shrink-0">
                        {!isReceiptPreview ? (
                            // Acciones de Certificado: Plantilla y Botón Imprimir
                            <>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Plantilla:</span>
                                    <div className="w-64">
                                        <SearchableSelect
                                            options={bootstrapCertTemplates.map(t => ({
                                                value: t.id,
                                                label: `${t.name} ${t.is_default ? '(Default)' : ''}`
                                            }))}
                                            value={selectedTemplateId}
                                            onChange={(val) => {
                                                setSelectedTemplateId(val);
                                                if (selectedCremationId && val !== "") {
                                                    handleGenerateCertificate(selectedCremationId, Number(val));
                                                }
                                            }}
                                            placeholder="Seleccionar plantilla..."
                                            icon={<Award size={18} />}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsConfirmPrintOpen(true)}
                                    className="bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm w-full sm:w-auto"
                                >
                                    <Printer className="mr-2" size={18} />
                                    Imprimir Certificado
                                </button>
                            </>
                        ) : (
                            // Acciones de Recibo: Botones de Imprimir y Guardar/Internacionalizar Boleta
                            <>
                                <div className="flex items-center gap-2">
                                    <FileText size={18} className="text-primary animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                        Comprobante de Servicio
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={() => setIsConfirmPrintOpen(true)}
                                        className="bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm w-full sm:w-auto"
                                    >
                                        <Printer className="mr-2" size={18} />
                                        Imprimir Recibo
                                    </button>
                                    <button
                                        onClick={() => previewCremationId && handleGenerateReceipt(previewCremationId, true)}
                                        disabled={loading}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:opacity-90 active:scale-95 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                                        Guardar e Internacionalizar Boleta
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Contenedor Iframe (Ocupa todo el espacio restante de forma compacta) */}
                    <div className="flex-1 min-h-0 bg-white rounded-3xl p-1 shadow-2xl border border-black/10 overflow-y-auto custom-scrollbar">
                        <iframe
                            srcDoc={certHtml}
                            className="w-full h-[850px] border-none rounded-2xl"
                            title="Preview"
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmación para Guardar e Imprimir */}
            <Modal
                isOpen={isConfirmPrintOpen}
                onClose={() => setIsConfirmPrintOpen(false)}
                title="Confirmar Emisión de Certificado"
                maxWidth="max-w-md"
            >
                <div className="p-4 text-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-primary" size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">¿Estás seguro?</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                        Al imprimir este documento, se guardará una copia definitiva en el historial con todos los datos y logos configurados actualmente.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsConfirmPrintOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-semibold text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                handlePrintCert();
                                setIsConfirmPrintOpen(false);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-primary/20"
                        >
                            Confirmar y Guardar
                        </button>
                    </div>
                </div>
            </Modal>

            <CancellationModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={confirmCancellation}
                orderId={idToCancel || ''}
            />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
                title="Eliminar Registro de Orden"
                maxWidth="max-w-md"
            >
                <div className="p-4 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">¿Confirmar eliminación permanente?</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                        Esta acción no se puede deshacer y borrará permanentemente este pedido de la base de datos.
                    </p>
                    <div className="flex gap-3">
                        <button
                            disabled={isDeleting}
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-semibold text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isDeleting}
                            onClick={handleDeleteCremation}
                            className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all text-sm flex justify-center"
                        >
                            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

