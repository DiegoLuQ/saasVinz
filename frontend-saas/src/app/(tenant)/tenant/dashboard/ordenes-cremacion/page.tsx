"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
    Search,
    Filter,
    Eye,
    CheckCircle2,
    Check,
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
    ArrowUpDown,
    RotateCcw,
    Trash2,
    AlertCircle,
    SlidersHorizontal,
    Download,
    Building2,
    Copy,
    DollarSign,
    Sparkles,
    Dog,
    Activity,
    Flame
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useRouter } from 'next/navigation';
import Modal from '@/components/tenant/Modal';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { useFeatures } from '@/hooks/useFeatures';
import CancellationModal from '@/components/tenant/CancellationModal';
import DeleteOrderModal from '@/components/tenant/orders/DeleteOrderModal';
import OrderSlideOver from '@/components/tenant/operations/OrderSlideOver';
import { useFarewellTemplates, useDocumentTemplates } from '@/hooks/useSessionBootstrap';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useQuery } from '@tanstack/react-query';
import { formatChileDateTime } from '@/lib/dates';
import { copyToClipboard } from '@/lib/clipboard';

// ==========================================
// Status Styles & Normalization
// ==========================================
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
        bg: 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)]'
    },
    'pending': {
        label: 'Pendiente',
        bg: 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)]'
    },
    'received': {
        label: 'Pendiente',
        bg: 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.12)]'
    },
    'en_proceso': {
        label: 'En Proceso',
        bg: 'bg-sky-500/15 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300',
        border: 'border-sky-500/40',
        text: 'text-sky-700 dark:text-sky-300',
        dot: 'bg-sky-400 animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(14,165,233,0.18)]'
    },
    'processing': {
        label: 'En Proceso',
        bg: 'bg-sky-500/15 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300',
        border: 'border-sky-500/40',
        text: 'text-sky-700 dark:text-sky-300',
        dot: 'bg-sky-400 animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(14,165,233,0.18)]'
    },
    'entregado': {
        label: 'Entregado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'delivered': {
        label: 'Entregado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'completado': {
        label: 'Entregado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'completed': {
        label: 'Entregado',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.18)]'
    },
    'cancelado': {
        label: 'Cancelado',
        bg: 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/30',
        text: 'text-rose-700 dark:text-rose-400',
        dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
        glow: 'shadow-[0_0_12px_rgba(244,63,94,0.12)]'
    },
    'canceled': {
        label: 'Cancelado',
        bg: 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/30',
        text: 'text-rose-700 dark:text-rose-400',
        dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
        glow: 'shadow-[0_0_12px_rgba(244,63,94,0.12)]'
    }
};

const normalizeStatus = (raw?: string | null): string => {
    const s = (raw || '').toLowerCase().trim();
    if (['entregado', 'delivered', 'completado', 'completed', 'finished'].includes(s)) return 'entregado';
    if (['en_proceso', 'processing', 'ready'].includes(s)) return 'en_proceso';
    if (['cancelado', 'canceled', 'cancelled'].includes(s)) return 'cancelado';
    return 'pendiente';
};

const GRADIENT_PALETTES = [
    ['#FFE259', '#FFA751', '#FF3366', '#FFE259'],
    ['#11998E', '#38EF7D', '#00F2FE', '#11998E'],
    ['#00C6FF', '#0072FF', '#7F00FF', '#00C6FF'],
    ['#EC008C', '#FC6767', '#7F00FF', '#EC008C'],
    ['#FF416C', '#FF4B2B', '#FFE259', '#FF416C']
];

const FAREWELL_EMOJIS = ['🕊️', '🌸', '🌿', '💐', '🌟', '🐾'];

const getFormatLabel = (format?: string) => {
    if (!format) return 'Proporción N/A';
    if (format === '1:1') return 'Cuadrado (1:1)';
    if (format === '9:16') return 'Vertical (9:16)';
    if (format === '16:9') return 'Horizontal (16:9)';
    return `Formato (${format})`;
};

const formatCLP = (value: number | null | undefined) => `$${Math.round(value || 0).toLocaleString('es-CL')}`;

const orderDate = (c: { scheduled_at?: string | null; created_at?: string | null }) =>
    formatChileDateTime(c.scheduled_at || c.created_at) || 'Sin fecha';

const getPrice = (c: any): number => {
    const price = typeof c.total_price === 'string'
        ? Number(c.total_price.replace(/[^0-9,.-]+/g, "").replace(",", "."))
        : (c.total_price || 0);
    return isNaN(price) ? 0 : price;
};

const getPartnerName = (c: any): string | null => {
    return c.partner_name || c.partner?.name || c.partner_link?.veterinary?.name || c.partner_link?.name || null;
};

const getCommissionAmount = (c: any): number => {
    if (c.commission && typeof c.commission.amount === 'number') return c.commission.amount;
    if (c.financial && typeof c.financial.commission === 'number') return c.financial.commission;
    return 0;
};

export default function OrdersPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { tenantData, formatLimit } = useTenant();
    const { hasFeature } = useFeatures();

    const canGenerateCert = hasFeature('certificados:generar_pdf');
    const canUseDesign = hasFeature('certificados:diseno');

    // Consolidated data from Bootstrap
    const bootstrapFarewellTemplates = useFarewellTemplates();
    const bootstrapCertTemplates = useDocumentTemplates();

    // Plan limits & monthly usage
    const { data: dashboardData } = useDashboardSummary();
    const monthlyOrdersUsage = dashboardData?.limits?.orders?.usage;
    const monthlyOrdersMax = tenantData?.subscription_plan?.max_orders ?? dashboardData?.limits?.orders?.max;

    const [loading, setLoading] = useState(true);

    // States for Modals & SlideOver
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
    const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

    // SlideOver State
    const [slideOverCremation, setSlideOverCremation] = useState<any | null>(null);
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'en_proceso' | 'entregado' | 'pendiente' | 'cancelado'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showFilters, setShowFilters] = useState(false);

    // Period selectors
    const YEARS_AVAILABLE = [2024, 2025, 2026, 2027, 2028, 2029];
    const MONTHS_LIST = [
        { value: 0, label: 'Enero' },
        { value: 1, label: 'Febrero' },
        { value: 2, label: 'Marzo' },
        { value: 3, label: 'Abril' },
        { value: 4, label: 'Mayo' },
        { value: 5, label: 'Junio' },
        { value: 6, label: 'Julio' },
        { value: 7, label: 'Agosto' },
        { value: 8, label: 'Septiembre' },
        { value: 9, label: 'Octubre' },
        { value: 10, label: 'Noviembre' },
        { value: 11, label: 'Diciembre' },
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const [periodMode, setPeriodMode] = useState<'this_month' | 'last_month' | 'year' | 'select_year' | 'all' | 'custom'>('all');
    const [selectedYear, setSelectedYear] = useState<number>(
        currentYear >= 2024 && currentYear <= 2029 ? currentYear : 2026
    );
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

    const applyPeriod = (
        mode: 'this_month' | 'last_month' | 'year' | 'select_year' | 'all',
        yearVal?: number,
        monthVal?: number
    ) => {
        const nowDate = new Date();
        const yr = yearVal ?? (mode === 'select_year' ? selectedYear : nowDate.getFullYear());

        if (mode === 'this_month') {
            const mo = nowDate.getMonth();
            const lastDay = new Date(yr, mo + 1, 0).getDate();
            const startStr = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
            const endStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            setStartDate(startStr);
            setEndDate(endStr);
            setSelectedMonth(mo);
            setSelectedYear(yr);
            setPeriodMode('this_month');
        } else if (mode === 'last_month') {
            const prevMoDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1);
            const prevYr = prevMoDate.getFullYear();
            const prevMo = prevMoDate.getMonth();
            const lastDay = new Date(prevYr, prevMo + 1, 0).getDate();
            const startStr = `${prevYr}-${String(prevMo + 1).padStart(2, '0')}-01`;
            const endStr = `${prevYr}-${String(prevMo + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            setStartDate(startStr);
            setEndDate(endStr);
            setSelectedMonth(prevMo);
            setSelectedYear(prevYr);
            setPeriodMode('last_month');
        } else if (mode === 'year') {
            const nowYear = nowDate.getFullYear();
            setStartDate(`${nowYear}-01-01`);
            setEndDate(`${nowYear}-12-31`);
            setPeriodMode('year');
        } else if (mode === 'select_year') {
            setStartDate(`${yr}-01-01`);
            setEndDate(`${yr}-12-31`);
            setPeriodMode('select_year');
            setSelectedYear(yr);
        } else if (mode === 'all') {
            setStartDate('');
            setEndDate('');
            setPeriodMode('all');
        }
    };

    // Cancellation State
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [idToCancel, setIdToCancel] = useState<number | null>(null);

    // Deletion State with standard DeleteOrderModal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch cremations with React Query
    const { data: cremations = [], isLoading: isLoadingCremations, refetch: refetchCremations } = useQuery<any[]>({
        queryKey: ['cremations', startDate, endDate, sortOrder],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (sortOrder) params.append('sort_order', sortOrder);
            return apiRequest(`/api/internal/cremations/?${params.toString()}`);
        },
        staleTime: 0,
        refetchOnMount: 'always',
    });

    useEffect(() => {
        setLoading(isLoadingCremations);
    }, [isLoadingCremations]);

    // Preselect default certificate template
    useEffect(() => {
        if (bootstrapCertTemplates.length > 0) {
            const preferredId = tenantData?.default_certificate_template_id;
            const defTemplate =
                (preferredId && bootstrapCertTemplates.find((t: any) => t.id === preferredId)) ||
                bootstrapCertTemplates.find((t: any) => t.is_default);
            if (defTemplate) setSelectedTemplateId(defTemplate.id);
        }
    }, [bootstrapCertTemplates, tenantData?.default_certificate_template_id]);

    const fetchData = async () => {
        refetchCremations();
    };

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setPeriodMode('all');
        setActiveStatusTab('all');
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

    const handleGenerateCertificate = async (cremationId: number, templateId?: number) => {
        setGeneratingCertId(cremationId);
        try {
            const response = await apiRequest('/api/internal/ops-records/generate', {
                method: 'POST',
                body: JSON.stringify({
                    cremation_id: cremationId,
                    certificate_type: 'Cremación',
                    template_id: templateId || (selectedTemplateId !== "" ? Number(selectedTemplateId) : undefined),
                    persist: true,
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

    const handleCopyCode = async (id: number, code: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const success = await copyToClipboard(code);
        if (success) {
            setCopiedCodeId(id);
            showToast('Código de verificación copiado', 'success');
            setTimeout(() => setCopiedCodeId(null), 2000);
        }
    };

    // ==========================================
    // Real Financial KPIs & Dynamic Status Counts
    // ==========================================
    const stats = useMemo(() => {
        let closedTotal = 0;
        let closedCount = 0;
        let pendingTotal = 0;
        let pendingCount = 0;
        let pendingOnlyTotal = 0;
        let inProcessTotal = 0;
        let inProcessCount = 0;
        let partnerOrdersCount = 0;
        let totalCommissions = 0;
        let validOrdersCount = 0;
        let validTotalRevenue = 0;

        (cremations as any[]).forEach((c) => {
            const norm = normalizeStatus(c.status);
            const price = getPrice(c);
            const comm = getCommissionAmount(c);
            const hasPartner = !!getPartnerName(c);

            if (hasPartner) {
                partnerOrdersCount++;
                totalCommissions += comm;
            }

            if (norm === 'entregado') {
                closedTotal += price;
                closedCount++;
                validTotalRevenue += price;
                validOrdersCount++;
            } else if (norm === 'en_proceso') {
                inProcessTotal += price;
                inProcessCount++;
                pendingTotal += price;
                pendingCount++;
                validTotalRevenue += price;
                validOrdersCount++;
            } else if (norm === 'pendiente') {
                pendingOnlyTotal += price;
                pendingTotal += price;
                pendingCount++;
                validTotalRevenue += price;
                validOrdersCount++;
            }
        });

        const averageTicket = validOrdersCount > 0 ? Math.round(validTotalRevenue / validOrdersCount) : 0;

        return {
            closedTotal,
            closedCount,
            pendingTotal,
            pendingCount,
            pendingOnlyTotal,
            inProcessTotal,
            inProcessCount,
            averageTicket,
            partnerOrdersCount,
            totalCommissions,
            totalOrders: cremations.length,
        };
    }, [cremations]);

    // Dynamic Counts for Status Tabs
    const statusCounts = useMemo(() => {
        const counts = {
            all: cremations.length,
            en_proceso: 0,
            entregado: 0,
            pendiente: 0,
            cancelado: 0,
        };
        (cremations as any[]).forEach(c => {
            const norm = normalizeStatus(c.status);
            if (norm in counts) {
                (counts as any)[norm]++;
            }
        });
        return counts;
    }, [cremations]);

    // ==========================================
    // Filtering Pipeline
    // ==========================================
    const filteredCremations = useMemo(() => {
        return (cremations as any[]).filter(c => {
            const searchLower = searchTerm.trim().toLowerCase();
            const matchesSearch = !searchLower || (
                c.id?.toString().includes(searchLower) ||
                c.oc_number?.toString().includes(searchLower) ||
                c.verification_code?.toLowerCase().includes(searchLower) ||
                c.pet_name?.toLowerCase().includes(searchLower) ||
                c.pet?.name?.toLowerCase().includes(searchLower) ||
                c.customer_name?.toLowerCase().includes(searchLower) ||
                c.pet?.customer?.name?.toLowerCase().includes(searchLower) ||
                getPartnerName(c)?.toLowerCase().includes(searchLower)
            );

            if (!matchesSearch) return false;

            const norm = normalizeStatus(c.status);
            if (activeStatusTab !== 'all' && norm !== activeStatusTab) {
                return false;
            }

            return true;
        });
    }, [cremations, searchTerm, activeStatusTab]);

    // Sort order
    const sortedCremations = useMemo(() => {
        return [...filteredCremations].sort((a, b) => {
            const dateA = new Date(a.scheduled_at || a.created_at || 0).getTime();
            const dateB = new Date(b.scheduled_at || b.created_at || 0).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [filteredCremations, sortOrder]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedCremations.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCremations = sortedCremations.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate, activeStatusTab, itemsPerPage]);

    // ==========================================
    // Export to CSV Function
    // ==========================================
    const handleExportCSV = () => {
        if ((tenantData?.subscription_plan as any)?.can_export === false) {
            showToast('La exportación a CSV no está incluida en tu plan', 'error');
            return;
        }

        if (filteredCremations.length === 0) {
            showToast('No hay datos para exportar con los filtros actuales', 'info');
            return;
        }

        const headers = [
            'N° Orden',
            'Código Verificación',
            'Fecha',
            'Mascota',
            'Especie / Raza',
            'Tutor (Cliente)',
            'Convenio Veterinario',
            'Servicio / Plan',
            'Estado',
            'Total CLP',
            'Comisión Vet CLP'
        ];

        const rows = filteredCremations.map((c: any) => {
            const ocNum = c.oc_number ? `#OC-${c.oc_number}` : `#${c.id}`;
            const verif = c.verification_code || '';
            const fecha = orderDate(c);
            const petName = c.pet_name || c.pet?.name || 'Sin nombre';
            const speciesBreed = [c.pet?.species, c.pet?.breed].filter(Boolean).join(' - ') || 'Mascota';
            const customer = c.customer_name || c.pet?.customer?.name || 'Sin cliente';
            const partner = getPartnerName(c) || 'Directo (Sin convenio)';
            const planName = c.planes?.[0]?.plan?.name || c.planes?.[0]?.nombre || c.planes?.[0]?.name;
            const serviceName = c.servicios?.[0]?.service?.name || c.servicios?.[0]?.nombre || c.servicios?.[0]?.name;
            const planOrService = planName || serviceName || c.cremation_type || 'Cremación';
            const st = statusMap[normalizeStatus(c.status)]?.label || c.status;
            const total = getPrice(c);
            const comm = getCommissionAmount(c);

            return [
                `"${ocNum}"`,
                `"${verif}"`,
                `"${fecha}"`,
                `"${petName.replace(/"/g, '""')}"`,
                `"${speciesBreed.replace(/"/g, '""')}"`,
                `"${customer.replace(/"/g, '""')}"`,
                `"${partner.replace(/"/g, '""')}"`,
                `"${planOrService.replace(/"/g, '""')}"`,
                `"${st}"`,
                total,
                comm
            ].join(';');
        });

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const nowStr = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `ordenes_cremacion_${nowStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Reporte CSV descargado con éxito', 'success');
    };

    // Render Pet Avatar Thumbnail
    const renderPetThumb = (cremation: any, extraClass = '') => {
        const petImage = cremation.pet_image_url || cremation.pet?.image_url;
        const petName = cremation.pet_name || cremation.pet?.name || 'Angelito';

        return (
            <div className={`w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/5 overflow-hidden ${extraClass} border border-slate-200 dark:border-white/10 shadow-sm group-hover:border-primary/40 transition-colors shrink-0`}>
                {petImage ? (
                    <img
                        src={getImageUrl(petImage)}
                        alt={petName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(petName) + '&background=random';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-muted-foreground/40">
                        <Dog size={20} />
                    </div>
                )}
            </div>
        );
    };

    // Render Status Select Dropdown
    const renderStatusSelect = (cremation: any) => (
        <SearchableSelect
            options={[
                { value: "pendiente", label: "Pendiente" },
                { value: "en_proceso", label: "En proceso" },
                { value: "entregado", label: "Entregado" },
                { value: "cancelado", label: "Cancelado" }
            ]}
            value={normalizeStatus(cremation.status)}
            onChange={(val) => handleStatusChange(cremation.id, val)}
            placeholder="Estado..."
            renderTrigger={(selectedOpt, isOpen) => {
                const norm = normalizeStatus(cremation.status);
                const st = statusMap[norm] || {
                    label: selectedOpt?.label || cremation.status || 'Estado...',
                    bg: 'bg-slate-100 dark:bg-white/5',
                    border: 'border-slate-200 dark:border-white/10',
                    text: 'text-foreground',
                    dot: 'bg-muted-foreground',
                    glow: ''
                };
                return (
                    <div
                        className={`group/badge flex items-center justify-between px-3 py-1.5 rounded-full border transition-all duration-200 backdrop-blur-md cursor-pointer ${st.bg} ${st.border} ${st.glow} hover:scale-[1.02] active:scale-[0.98] ${
                            isOpen ? 'ring-2 ring-primary/40' : ''
                        }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                            <span className={`text-xs font-bold tracking-tight truncate ${st.text}`}>
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
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-primary-foreground' : st.dot}`} />
                            <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-primary-foreground" />}
                    </div>
                );
            }}
        />
    );

    // Render Row Action Buttons
    const renderActions = (cremation: any, align = 'justify-end') => {
        const norm = normalizeStatus(cremation.status);
        const canDeleteOrder = norm === 'pendiente' || norm === 'en_proceso';

        return (
            <div className={`flex items-center gap-1.5 ${align}`}>
                {/* 1. Ver Expediente */}
                <button
                    onClick={() => {
                        setSlideOverCremation(cremation);
                        setIsSlideOverOpen(true);
                    }}
                    title="Ver Expediente de la Orden"
                    className="p-2 rounded-xl transition-all border bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:border-primary/40 active:scale-95"
                >
                    <Eye size={16} />
                </button>

                {/* 2. Recibo de Pago */}
                <button
                    title="Generar Recibo de Pago"
                    disabled={generatingReceiptId === cremation.id}
                    onClick={() => handleGenerateReceipt(cremation.id)}
                    className="p-2 rounded-xl transition-all border bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white border-purple-500/20 active:scale-95 disabled:opacity-50"
                >
                    {generatingReceiptId === cremation.id ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                </button>

                {/* 3. Certificado Oficial */}
                <button
                    onClick={() => {
                        setSelectedCremationId(cremation.id);
                        handleGenerateCertificate(cremation.id);
                    }}
                    disabled={generatingCertId === cremation.id || !canGenerateCert}
                    title={canGenerateCert ? "Certificado Oficial" : "No incluido en tu plan"}
                    className={`p-2 rounded-xl transition-all border ${canGenerateCert
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white border-amber-500/20 active:scale-95"
                        : "bg-slate-100 dark:bg-white/5 text-muted-foreground/30 border-transparent opacity-40 cursor-not-allowed"
                    }`}
                >
                    {generatingCertId === cremation.id ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                </button>

                {/* 4. Editar Registro */}
                <button
                    onClick={() => router.push(`/dashboard/recepcion-pedidos/registro?id=${cremation.id}`)}
                    title="Editar Registro de Orden"
                    className="p-2 rounded-xl transition-all border bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white border-blue-500/20 active:scale-95"
                >
                    <Edit3 size={16} />
                </button>

                {/* 5. Plantilla de Diseño */}
                <button
                    onClick={() => {
                        if (canUseDesign) {
                            setSelectedCremationId(cremation.id);
                            setIsDesignFolderModalOpen(true);
                        }
                    }}
                    disabled={!canUseDesign}
                    title={canUseDesign ? "Tarjeta de Despedida" : "No incluido en tu plan"}
                    className={`p-2 rounded-xl transition-all border ${canUseDesign
                        ? "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-primary/20 active:scale-95"
                        : "bg-slate-100 dark:bg-white/5 text-muted-foreground/30 border-transparent opacity-40 cursor-not-allowed"
                    }`}
                >
                    <Palette size={16} />
                </button>

                {/* 6. Eliminar Orden */}
                {canDeleteOrder && (
                    <button
                        onClick={() => {
                            setItemToDelete(cremation.id);
                            setIsDeleteModalOpen(true);
                        }}
                        title="Eliminar Orden"
                        className="p-2 rounded-xl transition-all border bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white border-red-500/20 active:scale-95"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Historial y Cobros
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                        Control financiero, facturación comercial y expediente de servicios de cremación.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm transition-all"
                    >
                        <Download size={15} className="text-primary" />
                        <span>Exportar CSV</span>
                    </button>
                    <div className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm font-medium">
                        <span className="text-muted-foreground">Cupo mensual:</span>
                        <span className="font-bold text-foreground">
                            {monthlyOrdersUsage !== undefined ? monthlyOrdersUsage : stats.closedCount}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-semibold text-muted-foreground">
                            {formatLimit(monthlyOrdersMax)}
                        </span>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            al mes
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Period Buttons Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-2 px-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Calendar size={15} className="text-primary" />
                    <span>Período:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Este Mes */}
                    <button
                        type="button"
                        onClick={() => applyPeriod('this_month')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            periodMode === 'this_month'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:bg-slate-200 dark:hover:bg-white/10 hover:text-foreground'
                        }`}
                    >
                        Este Mes
                    </button>

                    {/* Mes Anterior */}
                    <button
                        type="button"
                        onClick={() => applyPeriod('last_month')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            periodMode === 'last_month'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:bg-slate-200 dark:hover:bg-white/10 hover:text-foreground'
                        }`}
                    >
                        Mes Anterior
                    </button>

                    {/* Todo el Año */}
                    <button
                        type="button"
                        onClick={() => applyPeriod('year')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            periodMode === 'year'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:bg-slate-200 dark:hover:bg-white/10 hover:text-foreground'
                        }`}
                    >
                        Todo {currentYear}
                    </button>

                    {/* Selector de Año */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all border ${
                        periodMode === 'select_year'
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-muted-foreground'
                    }`}>
                        <span className="font-bold">Año:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => {
                                const yr = parseInt(e.target.value, 10);
                                setSelectedYear(yr);
                                applyPeriod('select_year', yr);
                            }}
                            className={`bg-transparent text-xs font-bold border-none outline-none cursor-pointer pr-1 py-0.5 ${
                                periodMode === 'select_year' ? 'text-primary-foreground font-extrabold' : 'text-foreground'
                            }`}
                        >
                            {YEARS_AVAILABLE.map((yr) => (
                                <option key={yr} value={yr} className="bg-slate-900 text-white">
                                    {yr}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Histórico Completo */}
                    <button
                        type="button"
                        onClick={() => applyPeriod('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            periodMode === 'all'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:bg-slate-200 dark:hover:bg-white/10 hover:text-foreground'
                        }`}
                    >
                        Histórico
                    </button>
                </div>

                {/* Resumen Financiero Leve en una sola línea */}
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <DollarSign size={12} className="text-blue-500 shrink-0" />
                        Ticket Promedio: <b className="text-slate-900 dark:text-white tabular-nums">{formatCLP(stats.averageTicket)}</b>
                    </span>
                    {stats.partnerOrdersCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            <Building2 size={12} className="text-purple-500 shrink-0" />
                            Convenios: <b className="text-slate-900 dark:text-white tabular-nums">{stats.partnerOrdersCount} ({formatCLP(stats.totalCommissions)})</b>
                        </span>
                    )}
                </div>
            </div>

            {/* 4 Cards Operativas Leves (Pendientes, En Proceso, Entregadas, Canceladas) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* 1. Pendientes */}
                <button
                    type="button"
                    onClick={() => setActiveStatusTab(activeStatusTab === 'pendiente' ? 'all' : 'pendiente')}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 group cursor-pointer shadow-xs ${
                        activeStatusTab === 'pendiente'
                            ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/[0.02]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            activeStatusTab === 'pendiente'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20'
                        }`}>
                            <Clock size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Pendientes</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {stats.pendingOnlyTotal > 0 ? formatCLP(stats.pendingOnlyTotal) : 'Por iniciar'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-xl sm:text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">
                            {statusCounts.pendiente}
                        </span>
                    </div>
                </button>

                {/* 2. En Proceso */}
                <button
                    type="button"
                    onClick={() => setActiveStatusTab(activeStatusTab === 'en_proceso' ? 'all' : 'en_proceso')}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 group cursor-pointer shadow-xs ${
                        activeStatusTab === 'en_proceso'
                            ? 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-sky-500/40 hover:bg-sky-500/[0.02]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 relative transition-colors ${
                            activeStatusTab === 'en_proceso'
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500/20'
                        }`}>
                            <Activity size={18} />
                            {statusCounts.en_proceso > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping opacity-75" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">En Proceso</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                En sala / horno
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-xl sm:text-2xl font-black tabular-nums text-sky-600 dark:text-sky-400">
                            {statusCounts.en_proceso}
                        </span>
                    </div>
                </button>

                {/* 3. Entregadas */}
                <button
                    type="button"
                    onClick={() => setActiveStatusTab(activeStatusTab === 'entregado' ? 'all' : 'entregado')}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 group cursor-pointer shadow-xs ${
                        activeStatusTab === 'entregado'
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            activeStatusTab === 'entregado'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20'
                        }`}>
                            <CheckCircle2 size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Entregadas</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                {formatCLP(stats.closedTotal)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-xl sm:text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                            {statusCounts.entregado}
                        </span>
                    </div>
                </button>

                {/* 4. Canceladas */}
                <button
                    type="button"
                    onClick={() => setActiveStatusTab(activeStatusTab === 'cancelado' ? 'all' : 'cancelado')}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 group cursor-pointer shadow-xs ${
                        activeStatusTab === 'cancelado'
                            ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500 ring-2 ring-rose-500/30'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/[0.02]'
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            activeStatusTab === 'cancelado'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20'
                        }`}>
                            <RotateCcw size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Canceladas</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                                Anuladas
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-xl sm:text-2xl font-black tabular-nums text-rose-600 dark:text-rose-400">
                            {statusCounts.cancelado}
                        </span>
                    </div>
                </button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                {/* Status Tabs Header */}
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveStatusTab('all')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeStatusTab === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-white dark:bg-slate-800/80 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span>Todas</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                activeStatusTab === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-slate-200 dark:bg-white/10'
                            }`}>
                                {statusCounts.all}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveStatusTab('en_proceso')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeStatusTab === 'en_proceso'
                                    ? 'bg-sky-500 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800/80 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                            <span>En Proceso</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                activeStatusTab === 'en_proceso' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'
                            }`}>
                                {statusCounts.en_proceso}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveStatusTab('entregado')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeStatusTab === 'entregado'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800/80 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Entregadas</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                activeStatusTab === 'entregado' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'
                            }`}>
                                {statusCounts.entregado}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveStatusTab('pendiente')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeStatusTab === 'pendiente'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800/80 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>Pendientes</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                activeStatusTab === 'pendiente' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'
                            }`}>
                                {statusCounts.pendiente}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveStatusTab('cancelado')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeStatusTab === 'cancelado'
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800/80 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span>Canceladas</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                activeStatusTab === 'cancelado' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10'
                            }`}>
                                {statusCounts.cancelado}
                            </span>
                        </button>
                    </div>

                    {/* Search & Custom Date Range */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Search Bar */}
                        <div className="md:col-span-6 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                            <input
                                type="text"
                                placeholder="Buscar por mascota, tutor, convenio, código o N° orden..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm outline-none focus:border-primary/50 transition-all font-medium h-[44px]"
                            />
                        </div>

                        {/* Date Range Inputs */}
                        <div className="md:col-span-4 flex items-center gap-2 h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 group overflow-hidden">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">Desde:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => {
                                    setStartDate(e.target.value);
                                    setPeriodMode('custom');
                                }}
                                className="bg-transparent border-none text-xs text-foreground outline-none w-full cursor-pointer min-w-0"
                            />
                            <span className="text-muted-foreground/40">-</span>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">Hasta:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => {
                                    setEndDate(e.target.value);
                                    setPeriodMode('custom');
                                }}
                                className="bg-transparent border-none text-xs text-foreground outline-none w-full cursor-pointer min-w-0"
                            />
                        </div>

                        {/* Sort Order & Reset Button */}
                        <div className="md:col-span-2 flex items-center gap-2 h-[44px]">
                            <button
                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-foreground rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all h-[44px]"
                                title={sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
                            >
                                <ArrowUpDown size={16} />
                                <span className="text-[11px] font-bold uppercase tracking-wider">{sortOrder === 'desc' ? 'Recientes' : 'Antiguos'}</span>
                            </button>
                            {(searchTerm || startDate || endDate || activeStatusTab !== 'all') && (
                                <button
                                    onClick={resetFilters}
                                    title="Limpiar filtros"
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 h-[44px] shrink-0"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-primary mb-3" size={36} />
                        <p className="text-muted-foreground text-sm font-medium">Cargando órdenes y registros comerciales...</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards View */}
                        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedCremations.length > 0 ? paginatedCremations.map((cremation: any) => {
                                const partner = getPartnerName(cremation);
                                return (
                                    <div key={cremation.id} className="p-4 space-y-3">
                                        <div className="flex items-center gap-3">
                                            {renderPetThumb(cremation)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-bold truncate text-slate-900 dark:text-white">
                                                        {cremation.pet_name || cremation.pet?.name || 'Sin nombre'}
                                                    </p>
                                                    {cremation.pet?.species && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            ({cremation.pet.species})
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {cremation.customer_name || cremation.pet?.customer?.name || 'Cliente directo'}
                                                </p>
                                                {partner && (
                                                    <div className="flex items-center gap-1 text-[11px] text-primary font-medium mt-0.5 truncate">
                                                        <Building2 size={12} className="shrink-0" />
                                                        <span className="truncate">{partner}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                                                    {formatCLP(cremation.total_price)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground font-mono">
                                                    #OC-{cremation.oc_number || cremation.id}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                            <span>{orderDate(cremation)}</span>
                                            <span className="truncate font-medium">{cremation.cremation_type || 'Servicio'}</span>
                                        </div>
                                        <div className="pt-1 flex items-center justify-between gap-2">
                                            <div className="w-36">
                                                {renderStatusSelect(cremation)}
                                            </div>
                                            {renderActions(cremation, 'justify-end')}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="px-6 py-16 text-center">
                                    <Layout size={36} className="mx-auto mb-3 text-muted-foreground/30" />
                                    <p className="text-muted-foreground text-sm font-medium">No se encontraron órdenes registradas en este período.</p>
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="relative hidden md:block overflow-x-auto min-h-[450px]">
                            <table className="w-full text-left min-w-[900px]">
                                <thead>
                                    <tr className="bg-slate-50/75 dark:bg-white/[0.02] border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Orden / Fecha</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Angelito</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tutor & Convenio</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalle Servicio</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedCremations.length > 0 ? paginatedCremations.map((cremation: any) => {
                                        const partner = getPartnerName(cremation);
                                        const petName = cremation.pet_name || cremation.pet?.name || 'Sin nombre';
                                        const species = cremation.pet?.species || 'Mascota';
                                        const breed = cremation.pet?.breed || null;
                                        const customerName = cremation.customer_name || cremation.pet?.customer?.name || 'Cliente directo';
                                        const planName = cremation.planes?.[0]?.plan?.name || cremation.planes?.[0]?.nombre || cremation.planes?.[0]?.name;
                                        const serviceName = cremation.servicios?.[0]?.service?.name || cremation.servicios?.[0]?.nombre || cremation.servicios?.[0]?.name;
                                        const serviceType = planName || serviceName || cremation.cremation_type || 'Cremación';
                                        const ocCode = cremation.oc_number ? `#OC-${cremation.oc_number}` : `#${cremation.id}`;
                                        const verifCode = cremation.verification_code || null;

                                        return (
                                            <tr
                                                key={cremation.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                                onClick={() => {
                                                    setSlideOverCremation(cremation);
                                                    setIsSlideOverOpen(true);
                                                }}
                                            >
                                                {/* 1. Orden / Fecha */}
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                                {ocCode}
                                                            </span>
                                                            {verifCode && (
                                                                <button
                                                                    onClick={(e) => handleCopyCode(cremation.id, verifCode, e)}
                                                                    title="Copiar código de verificación"
                                                                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                                                                >
                                                                    {copiedCodeId === cremation.id ? (
                                                                        <Check size={12} className="text-emerald-500" />
                                                                    ) : (
                                                                        <Copy size={12} />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                                            {orderDate(cremation)}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* 2. Angelito */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        {renderPetThumb(cremation, "mr-3")}
                                                        <div>
                                                            <span className="text-sm font-bold block text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                                {petName}
                                                            </span>
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {species}{breed ? ` • ${breed}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 3. Tutor & Convenio */}
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                        {customerName}
                                                    </div>
                                                    {partner ? (
                                                        <div className="flex items-center gap-1 text-[11px] text-primary font-semibold mt-0.5">
                                                            <Building2 size={12} className="shrink-0" />
                                                            <span className="truncate max-w-[160px]">{partner}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                                                            Particular directo
                                                        </span>
                                                    )}
                                                </td>

                                                {/* 4. Detalle Servicio */}
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block" title={serviceType}>
                                                            {serviceType}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            {planName && cremation.cremation_type && (
                                                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 capitalize">
                                                                    {cremation.cremation_type}
                                                                </span>
                                                            )}
                                                            {cremation.weight_price > 0 && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                                    +Peso
                                                                </span>
                                                            )}
                                                            {cremation.discount > 0 && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                                    -{cremation.discount}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 5. Total */}
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-sm tabular-nums text-slate-900 dark:text-white">
                                                        {formatCLP(cremation.total_price)}
                                                    </span>
                                                </td>

                                                {/* 6. Estado */}
                                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="w-36">
                                                        {renderStatusSelect(cremation)}
                                                    </div>
                                                </td>

                                                {/* 7. Acciones */}
                                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    {renderActions(cremation, "justify-end")}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-20 text-center">
                                                <Layout size={40} className="mx-auto mb-3 text-muted-foreground/30" />
                                                <p className="text-muted-foreground font-medium text-sm">
                                                    No se han registrado servicios en este período con los filtros aplicados.
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination Controls */}
                {!loading && sortedCremations.length > 0 && (
                    <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02]">
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
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary/50 transition-all cursor-pointer shadow-sm"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-xs text-muted-foreground">
                                    Mostrando {startIndex + 1}-{Math.min(endIndex, sortedCremations.length)} de {sortedCremations.length} órdenes
                                </span>
                            </div>

                            {/* Page navigation */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                >
                                    Primera
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
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
                                                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === pageNum
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                >
                                    Siguiente
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                >
                                    Última
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SlideOver Expediente del Servicio */}
            <OrderSlideOver
                isOpen={isSlideOverOpen}
                onClose={() => setIsSlideOverOpen(false)}
                cremation={slideOverCremation}
                onUpdateStatus={handleStatusChange}
            />

            {/* Modal de Eliminación con Alcance (DeleteOrderModal) */}
            {isDeleteModalOpen && itemToDelete && (
                <DeleteOrderModal
                    isOpen={isDeleteModalOpen}
                    orderId={itemToDelete}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onDeleted={() => {
                        setIsDeleteModalOpen(false);
                        setItemToDelete(null);
                        if (slideOverCremation?.id === itemToDelete) {
                            setIsSlideOverOpen(false);
                        }
                        fetchData();
                    }}
                />
            )}

            {/* Modal de Cancelación */}
            <CancellationModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={confirmCancellation}
                orderId={idToCancel || ''}
            />

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
                    <p className="text-muted-foreground mb-8 text-center text-sm">
                        Selecciona el diseño para crear el homenaje digital de la mascota.
                    </p>
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
                                    <div className="relative w-40 h-40 md:w-44 md:h-44 rounded-full overflow-hidden p-[3px] flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-primary/20">
                                        <div
                                            className="absolute inset-[-20%] animate-spin-slow"
                                            style={{
                                                background: `conic-gradient(from 0deg, ${colors.join(', ')})`,
                                            }}
                                        />
                                        <div className="relative w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center">
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
                                            
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-3 text-center">
                                                <span className="bg-primary text-primary-foreground p-2 rounded-full text-xs font-bold shadow-lg flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                    <ArrowRight size={16} />
                                                </span>
                                                <span className="text-[10px] text-white font-bold mt-1.5 uppercase tracking-wider">Usar Diseño</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 text-center flex flex-col items-center">
                                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
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
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl gap-4 border border-slate-200 dark:border-white/5 shrink-0">
                        {!isReceiptPreview ? (
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
                                    className="bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-2xl flex items-center justify-center shadow-md hover:opacity-90 active:scale-95 transition-all text-sm w-full sm:w-auto"
                                >
                                    <Printer className="mr-2" size={18} />
                                    Imprimir Certificado
                                </button>
                            </>
                        ) : (
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
                                        className="bg-primary text-primary-foreground font-bold py-2.5 px-6 rounded-2xl flex items-center justify-center shadow-md hover:opacity-90 active:scale-95 transition-all text-sm w-full sm:w-auto"
                                    >
                                        <Printer className="mr-2" size={18} />
                                        Imprimir Recibo
                                    </button>
                                    <button
                                        onClick={() => previewCremationId && handleGenerateReceipt(previewCremationId, true)}
                                        disabled={loading}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all text-sm w-full sm:w-auto disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                                        Guardar Recibo
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex-1 min-h-0 bg-white rounded-2xl p-1 shadow-inner border border-slate-200 dark:border-slate-800 overflow-y-auto">
                        <iframe
                            srcDoc={certHtml}
                            className="w-full h-[850px] border-none rounded-xl"
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
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-primary" size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">¿Confirmar emisión e impresión?</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm mb-6 leading-relaxed">
                        Al imprimir este documento, se guardará una copia definitiva en el historial con todos los datos y logos del crematorio.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsConfirmPrintOpen(false)}
                            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all font-semibold text-xs sm:text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                handlePrintCert();
                                setIsConfirmPrintOpen(false);
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all text-xs sm:text-sm shadow-md"
                        >
                            Confirmar e Imprimir
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
