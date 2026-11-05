"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    Tag,
    CheckCircle2,
    XCircle,
    Edit2,
    Trash2,
    Loader2,
    Layers,
    X,
    FolderTree,
    Diamond,
    Info,
    Lock,
    BookOpen,
    Share2,
    Star,
    AlertCircle,
    Sparkles,
    LayoutGrid,
    List,
    TrendingUp,
    DollarSign,
    Percent,
    SlidersHorizontal,
    ArrowUpDown,
    Check,
    Eye,
    EyeOff,
    FileSpreadsheet,
    Folder,
    Pencil
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { API_URL } from '@/lib/tenant/api';
import { motion, AnimatePresence } from 'framer-motion';

import { sortPlansForCatalog } from '@/lib/tenant/planOrder';
const PlansDownloadLink = dynamic(() => import('@/components/tenant/catalog/PDFPlansDownloadButton'), { ssr: false });
import {
    useCatalogServices,
    useCatalogPlans,
    useSaveService,
    useSavePlan,
    useDeleteService,
    useDeletePlan,
    type Service,
    type Plan
} from '@/hooks/useCatalog';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import ShareCatalogModal from '@/components/tenant/catalog/ShareCatalogModal';
import ImportServicesModal from '@/components/tenant/catalog/ImportServicesModal';
import { apiRequest } from '@/lib/tenant/api';
import { useQueryClient } from '@tanstack/react-query';

const NO_GROUP = '__none__';

const cardInitial = { opacity: 0, y: 15 };
const cardAnimate = { opacity: 1, y: 0 };

/** Interruptor Activo / Inactivo de un plan. `onImage`: versión sobre la foto del plan. */
function ActiveSwitch({ active, loading, disabled, onToggle, onImage = false }: {
    active: boolean; loading?: boolean; disabled?: boolean; onToggle: () => void; onImage?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={onToggle}
            disabled={disabled || loading}
            title={disabled ? undefined : active ? 'Clic para desactivar' : 'Clic para activar'}
            className={`inline-flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 text-[10px] font-bold border transition-all disabled:cursor-default ${
                onImage
                    ? 'bg-slate-900/70 backdrop-blur-md border-white/25 text-white'
                    : active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            } ${disabled ? '' : 'cursor-pointer hover:brightness-95'}`}
        >
            <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}>
                <span className={`absolute h-3 w-3 rounded-full bg-white shadow flex items-center justify-center transition-transform ${active ? 'translate-x-3.5' : 'translate-x-0.5'}`}>
                    {loading && <Loader2 size={8} className="animate-spin text-slate-500" />}
                </span>
            </span>
            <span>{active ? 'Activo' : 'Inactivo'}</span>
        </button>
    );
}

const formatCLP = (val: number) => `$${Math.round(val || 0).toLocaleString('es-CL')}`;

export default function ServicesPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const { canDelete, canCreate, canEdit } = usePermissions();
    const { tenantData, formatLimit } = useTenant();

    const queryClient = useQueryClient();
    const { data: services = [], isLoading: loadingServices } = useCatalogServices();
    const { data: plans = [], isLoading: loadingPlans } = useCatalogPlans();

    const saveServiceMutation = useSaveService();
    const savePlanMutation = useSavePlan();
    const deleteServiceMutation = useDeleteService();
    const deletePlanMutation = useDeletePlan();

    const [isSaving, setIsSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'servicios' | 'planes'>('servicios');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Service> | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'service' | 'plan'; id: number; name: string } | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [modalResource, setModalResource] = useState('Servicios');

    // Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'price_desc' | 'price_asc' | 'margin_desc'>('name');
    const [marginInfoId, setMarginInfoId] = useState<number | null>(null);
    const [groupFilter, setGroupFilter] = useState<string>('all');

    // Grupos de servicios (solo panel) e importación desde Excel
    const [showImportModal, setShowImportModal] = useState(false);
    const [groupToRename, setGroupToRename] = useState<{ kind: 'service' | 'plan'; old: string; value: string } | null>(null);
    const [planGroupFilter, setPlanGroupFilter] = useState<string>('all');
    const [catalogPlansGroup, setCatalogPlansGroup] = useState<string>('all');
    const [renamingGroup, setRenamingGroup] = useState(false);

    // Catalog modal states
    const [showPlansCatalogModal, setShowPlansCatalogModal] = useState(false);
    const [showSharePlansModal, setShowSharePlansModal] = useState(false);
    const [catalogPlansOnlyActive, setCatalogPlansOnlyActive] = useState(false);
    const [catalogPlansShowPrices, setCatalogPlansShowPrices] = useState(true);
    const [catalogPlansShowImages, setCatalogPlansShowImages] = useState(true);

    const getLogoUrl = () => {
        if (!tenantData?.logo_url) return null;
        return tenantData.logo_url.startsWith('http') ? tenantData.logo_url : `${API_URL}${tenantData.logo_url}`;
    };

    const maxServices = tenantData?.subscription_plan?.max_services || 0;
    const isServiceLimitReached = maxServices > 0 && maxServices < 999999 && services.length >= maxServices;

    const maxPlans = tenantData?.subscription_plan?.max_plans || 0;
    const isPlanLimitReached = maxPlans > 0 && maxPlans < 999999 && plans.length >= maxPlans;

    const isPlanesEnabled = maxServices === 0 || maxServices === null || maxServices > 2;

    useEffect(() => {
        if (!isPlanesEnabled && activeTab === 'planes') {
            setActiveTab('servicios');
        }
    }, [isPlanesEnabled, activeTab]);

    // Financial & Operational Metrics
    const stats = useMemo(() => {
        const totalServices = services.length;
        const activeServices = services.filter((s: Service) => s.is_active).length;
        const specialServices = services.filter((s: Service) => s.is_special).length;

        const pricedServices = services.filter((s: Service) => (s.price || 0) > 0);
        const avgPrice = pricedServices.length > 0
            ? Math.round(pricedServices.reduce((acc: number, s: Service) => acc + (s.price || 0), 0) / pricedServices.length)
            : 0;

        const servicesWithMargin = services.filter((s: Service) => (s.price || 0) > 0 && (s.cost || 0) > 0);
        const avgMargin = servicesWithMargin.length > 0
            ? Math.round(servicesWithMargin.reduce((acc: number, s: Service) => {
                const m = ((s.price - s.cost) / s.price) * 100;
                return acc + m;
            }, 0) / servicesWithMargin.length)
            : 0;

        const totalPlans = plans.length;
        const activePlans = plans.filter((p: Plan) => p.is_active).length;
        const featuredPlans = plans.filter((p: Plan) => p.is_featured).length;

        return {
            totalServices,
            activeServices,
            specialServices,
            avgPrice,
            avgMargin,
            totalPlans,
            activePlans,
            featuredPlans,
        };
    }, [services, plans]);

    // Filter & Sort Services
    const filteredAndSortedServices = useMemo(() => {
        const searchLower = searchTerm.trim().toLowerCase();
        const filtered = services.filter((s: Service) => {
            const matchSearch = !searchLower ||
                s.name.toLowerCase().includes(searchLower) ||
                (s.description?.toLowerCase()?.includes(searchLower) ?? false) ||
                (s.group_name?.toLowerCase()?.includes(searchLower) ?? false);
            const matchStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && s.is_active) ||
                (statusFilter === 'inactive' && !s.is_active);
            const matchGroup = groupFilter === 'all' ||
                (groupFilter === NO_GROUP ? !s.group_name : s.group_name === groupFilter);
            return matchSearch && matchStatus && matchGroup;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
            if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'margin_desc') {
                const mA = a.price > 0 && a.cost > 0 ? ((a.price - a.cost) / a.price) * 100 : 0;
                const mB = b.price > 0 && b.cost > 0 ? ((b.price - b.cost) / b.price) * 100 : 0;
                return mB - mA;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [services, searchTerm, statusFilter, sortBy, groupFilter]);

    // Grupos existentes (orden alfabético) y servicios filtrados agrupados; «Sin grupo» al final.
    const serviceGroupNames = useMemo(
        () => Array.from(new Set(services.map((s: Service) => s.group_name).filter((g): g is string => !!g)))
            .sort((a, b) => a.localeCompare(b, 'es')),
        [services]
    );
    const hasGroups = serviceGroupNames.length > 0;
    const groupedServices = useMemo(() => {
        const map = new Map<string, Service[]>();
        for (const s of filteredAndSortedServices) {
            const key = s.group_name || NO_GROUP;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(s);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => (a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : a.localeCompare(b, 'es')))
            .map(([key, items]) => ({ key, name: key === NO_GROUP ? null : key, items }));
    }, [filteredAndSortedServices]);

    useEffect(() => {
        if (groupFilter !== 'all' && groupFilter !== NO_GROUP && !serviceGroupNames.includes(groupFilter)) {
            setGroupFilter('all');
        }
    }, [groupFilter, serviceGroupNames]);

    const handleRenameGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupToRename) return;
        setRenamingGroup(true);
        try {
            const isPlan = groupToRename.kind === 'plan';
            const res = await apiRequest(`/api/internal/${isPlan ? 'plans' : 'services'}/groups/rename`, {
                method: 'PUT',
                body: JSON.stringify({ old_name: groupToRename.old, new_name: groupToRename.value }),
            });
            queryClient.invalidateQueries({ queryKey: [isPlan ? 'catalog-plans' : 'catalog-services'] });
            if (isPlan) {
                if (planGroupFilter === groupToRename.old) setPlanGroupFilter(res?.group_name || 'all');
            } else if (groupFilter === groupToRename.old) {
                setGroupFilter(res?.group_name || 'all');
            }
            showToast(res?.group_name ? `Grupo renombrado a «${res.group_name}»` : `${isPlan ? 'Planes' : 'Servicios'} movidos a «Sin grupo»`, 'success');
            setGroupToRename(null);
        } catch (err) {
            showToast((err as { message?: string })?.message || 'No se pudo renombrar el grupo', 'error');
        } finally {
            setRenamingGroup(false);
        }
    };

    const renderGroupHeader = (g: { key: string; name: string | null; items: unknown[] }, kind: 'service' | 'plan' = 'service') => (
        <div className="flex items-center gap-2 mb-3">
            <Folder size={15} className={g.name ? 'text-primary' : 'text-muted-foreground'} />
            <h2 className={`text-sm font-bold ${g.name ? 'text-slate-900 dark:text-white' : 'text-muted-foreground'}`}>
                {g.name || 'Sin grupo'}
            </h2>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{g.items.length}</span>
            {g.name && canEdit('servicios') && (
                <button
                    type="button"
                    onClick={() => setGroupToRename({ kind, old: g.name!, value: g.name! })}
                    className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Renombrar grupo"
                >
                    <Pencil size={12} />
                </button>
            )}
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>
    );

    // Filter & Sort Plans
    const filteredAndSortedPlans = useMemo(() => {
        const searchLower = searchTerm.trim().toLowerCase();
        const filtered = plans.filter((p: Plan) => {
            const matchSearch = !searchLower ||
                p.name.toLowerCase().includes(searchLower) ||
                (p.description?.toLowerCase()?.includes(searchLower) ?? false) ||
                (p.group_name?.toLowerCase()?.includes(searchLower) ?? false);
            const matchStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && p.is_active) ||
                (statusFilter === 'inactive' && !p.is_active);
            const matchGroup = planGroupFilter === 'all' ||
                (planGroupFilter === NO_GROUP ? !p.group_name : p.group_name === planGroupFilter);
            return matchSearch && matchStatus && matchGroup;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
            if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [plans, searchTerm, statusFilter, sortBy, planGroupFilter]);

    // Grupos de planes (cada enlace del catálogo elige cuáles muestra)
    const planGroupNames = useMemo(
        () => Array.from(new Set(plans.map((p: Plan) => p.group_name).filter((g): g is string => !!g)))
            .sort((a, b) => a.localeCompare(b, 'es')),
        [plans]
    );
    const hasPlanGroups = planGroupNames.length > 0;
    const groupedPlans = useMemo(() => {
        const map = new Map<string, Plan[]>();
        for (const pl of filteredAndSortedPlans) {
            const key = pl.group_name || NO_GROUP;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(pl);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => (a === NO_GROUP ? 1 : b === NO_GROUP ? -1 : a.localeCompare(b, 'es')))
            .map(([key, items]) => ({ key, name: key === NO_GROUP ? null : key, items }));
    }, [filteredAndSortedPlans]);

    useEffect(() => {
        if (planGroupFilter !== 'all' && planGroupFilter !== NO_GROUP && !planGroupNames.includes(planGroupFilter)) {
            setPlanGroupFilter('all');
        }
        if (catalogPlansGroup !== 'all' && catalogPlansGroup !== NO_GROUP && !planGroupNames.includes(catalogPlansGroup)) {
            setCatalogPlansGroup('all');
        }
    }, [planGroupFilter, catalogPlansGroup, planGroupNames]);

    // Planes del catálogo PDF / vista previa (solo activos y grupo elegido)
    const catalogPdfPlans = useMemo(() => plans.filter((p: Plan) =>
        (!catalogPlansOnlyActive || p.is_active) &&
        (catalogPlansGroup === 'all' || (catalogPlansGroup === NO_GROUP ? !p.group_name : p.group_name === catalogPlansGroup))
    ), [plans, catalogPlansOnlyActive, catalogPlansGroup]);

    const handleOpenServiceModal = (service?: Service) => {
        if (!service && isServiceLimitReached) {
            setModalResource('Recursos');
            setShowLimitModal(true);
            return;
        }
        setCurrentService(service || {
            name: '',
            description: '',
            price: 0,
            cost: 0,
            is_active: true,
            is_special: false,
            show_in_form: true
        });
        setIsModalOpen(true);
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const isEdit = !!currentService?.id;
            await saveServiceMutation.mutateAsync({
                isEdit,
                service: currentService || {}
            });
            setIsModalOpen(false);
        } catch {
            // Toast handled by mutation
        } finally {
            setIsSaving(false);
        }
    };

    // 1-Click Status Toggle for Service
    const handleToggleServiceActive = async (service: Service) => {
        if (!canEdit('servicios') || togglingId === service.id) return;
        setTogglingId(service.id);
        try {
            await saveServiceMutation.mutateAsync({
                isEdit: true,
                service: {
                    id: service.id,
                    is_active: !service.is_active
                }
            });
        } catch {
            // Handled
        } finally {
            setTogglingId(null);
        }
    };

    // 1-Click Status Toggle for Plan
    const handleTogglePlanActive = async (plan: Plan) => {
        if (!canEdit('servicios') || togglingId === plan.id) return;
        setTogglingId(plan.id);
        try {
            await savePlanMutation.mutateAsync({
                isEdit: true,
                plan: {
                    id: plan.id,
                    is_active: !plan.is_active
                }
            });
        } catch {
            // Handled
        } finally {
            setTogglingId(null);
        }
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'service') {
                await deleteServiceMutation.mutateAsync(itemToDelete.id);
            } else {
                await deletePlanMutation.mutateAsync(itemToDelete.id);
            }
            setItemToDelete(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = (type: 'service' | 'plan', id: number, name: string) => {
        setItemToDelete({ type, id, name });
    };

    const margin = (price: number, cost: number) => {
        if (!cost || !price) return 0;
        return Math.round(((price - cost) / price) * 100);
    };

    // Modal Live Profit Calculation
    const modalProfit = useMemo(() => {
        const p = currentService?.price || 0;
        const c = currentService?.cost || 0;
        const profit = p - c;
        const pct = p > 0 ? Math.round((profit / p) * 100) : 0;
        return { profit, pct };
    }, [currentService?.price, currentService?.cost]);

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header Modernizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <FolderTree className="text-primary" size={28} />
                        <span>Catálogo de Servicios y Planes</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                        Diseña los servicios individuales y paquetes comerciales para ofrecer a las familias.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Botones contextuales de Planes */}
                    {activeTab === 'planes' && (
                        <>
                            <button
                                onClick={() => setShowSharePlansModal(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
                                title="Generar enlace público del catálogo"
                            >
                                <Share2 size={15} className="text-primary" />
                                <span>Compartir</span>
                            </button>
                            <button
                                onClick={() => setShowPlansCatalogModal(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
                                title="Previsualizar catálogo y descargar PDF"
                            >
                                <BookOpen size={15} className="text-primary" />
                                <span>Ver Catálogo PDF</span>
                            </button>
                        </>
                    )}

                    {activeTab === 'servicios' && canCreate('servicios') && (
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
                            title="Crear varios servicios desde una planilla Excel"
                        >
                            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Importar Excel</span>
                        </button>
                    )}

                    {/* Botón Principal Crear */}
                    {canCreate('servicios') && (
                        <button
                            onClick={() => activeTab === 'servicios' ? handleOpenServiceModal() : router.push('/dashboard/gestion-servicios/plan/nuevo')}
                            disabled={activeTab === 'servicios' ? isServiceLimitReached : isPlanLimitReached}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-md hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={16} />
                            <span>{activeTab === 'servicios' ? 'Nuevo Servicio' : 'Nuevo Plan'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Fila de KPIs Compactos (Visión Ejecutiva y Rentabilidad) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Servicios Activos / Cupo */}
                <div className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Servicios Activos</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {stats.activeServices}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                                / {stats.totalServices} total
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Cupo: {formatLimit(maxServices)}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Tag size={20} />
                    </div>
                </div>

                {/* 2. Planes Comerciales */}
                <div className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Planes Comerciales</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {isPlanesEnabled ? stats.activePlans : 0}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                                {isPlanesEnabled ? `/ ${stats.totalPlans} total` : 'Bloqueado'}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isPlanesEnabled ? `${stats.featuredPlans} destacados` : 'Requiere plan superior'}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Layers size={20} />
                    </div>
                </div>

                {/* 3. Margen Promedio */}
                <div className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Margen Promedio</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {stats.avgMargin}%
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Rentabilidad sobre precio
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Percent size={20} />
                    </div>
                </div>

                {/* 4. Ticket Promedio Catálogo */}
                <div className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Precio Promedio</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {formatCLP(stats.avgPrice)}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stats.specialServices} adicionales especiales
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <TrendingUp size={20} />
                    </div>
                </div>
            </div>

            {/* Barra de Navegación, Filtros y Switch de Vista */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                {/* Tabs Principales: Servicios vs Planes */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5">
                    <button
                        onClick={() => { setActiveTab('servicios'); setSearchTerm(''); setStatusFilter('all'); setGroupFilter('all'); }}
                        className={`relative flex items-center gap-2 py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'servicios'
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Tag size={14} />
                        <span>Servicios</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                            {services.length}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            if (!isPlanesEnabled) {
                                setModalResource('Planes Comerciales');
                                setShowLimitModal(true);
                                return;
                            }
                            setActiveTab('planes');
                            setSearchTerm('');
                            setStatusFilter('all');
                            setPlanGroupFilter('all');
                        }}
                        className={`relative flex items-center gap-2 py-1.5 px-4 rounded-lg text-xs font-bold transition-all ${
                            !isPlanesEnabled
                                ? 'opacity-60 cursor-not-allowed text-muted-foreground/60'
                                : activeTab === 'planes'
                                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {!isPlanesEnabled ? <Lock size={13} className="text-amber-500" /> : <Layers size={14} />}
                        <span>Planes</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                            {plans.length}
                        </span>
                    </button>
                </div>

                {/* Filtros, Búsqueda y Modos de Vista */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {/* Búsqueda */}
                    <div className="relative flex-1 sm:flex-none sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                        <input
                            type="text"
                            placeholder={activeTab === 'servicios' ? 'Buscar servicio...' : 'Buscar plan...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl py-1.5 pl-9 pr-8 text-xs font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Filtro Estado */}
                    <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5">
                        {(['all', 'active', 'inactive'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    statusFilter === f
                                        ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
                            </button>
                        ))}
                    </div>

                    {/* Filtro Grupo */}
                    {activeTab === 'servicios' && hasGroups && (
                        <select
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer max-w-[11rem]"
                            title="Filtrar por grupo"
                        >
                            <option value="all">Todos los grupos</option>
                            {serviceGroupNames.map(g => <option key={g} value={g}>{g}</option>)}
                            <option value={NO_GROUP}>Sin grupo</option>
                        </select>
                    )}

                    {activeTab === 'planes' && hasPlanGroups && (
                        <select
                            value={planGroupFilter}
                            onChange={(e) => setPlanGroupFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer max-w-[11rem]"
                            title="Filtrar planes por grupo"
                        >
                            <option value="all">Todos los grupos</option>
                            {planGroupNames.map(g => <option key={g} value={g}>{g}</option>)}
                            <option value={NO_GROUP}>Sin grupo</option>
                        </select>
                    )}

                    {/* Selector de Orden */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                        >
                            <option value="name">Alfabético (A-Z)</option>
                            <option value="price_desc">Mayor Precio</option>
                            <option value="price_asc">Menor Precio</option>
                            {activeTab === 'servicios' && <option value="margin_desc">Mayor Margen %</option>}
                        </select>
                    </div>

                    {/* Switch Cuadrícula ▦ / Tabla ☰ */}
                    <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Vista en tarjetas"
                        >
                            <LayoutGrid size={15} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Vista en tabla detallada"
                        >
                            <List size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            {loadingServices || loadingPlans ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-primary" size={36} />
                    <p className="text-muted-foreground text-sm font-medium">Cargando catálogo...</p>
                </div>
            ) : activeTab === 'servicios' ? (
                /* ========================================================
                   SECCIÓN SERVICIOS (Grid o Table)
                   ======================================================== */
                filteredAndSortedServices.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                            <Tag size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            {searchTerm || statusFilter !== 'all' || groupFilter !== 'all' ? 'Sin resultados para los filtros' : 'Aún no hay servicios registrados'}
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                            {searchTerm || statusFilter !== 'all' || groupFilter !== 'all'
                                ? 'Prueba con otros términos de búsqueda o restablece los filtros.'
                                : 'Comienza creando los servicios principales de tu crematorio, o impórtalos desde un Excel.'}
                        </p>
                        {!searchTerm && statusFilter === 'all' && groupFilter === 'all' && canCreate('servicios') && (
                            <button
                                onClick={() => handleOpenServiceModal()}
                                disabled={isServiceLimitReached}
                                className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/95 transition-all"
                            >
                                <Plus size={16} />
                                Crear Primer Servicio
                            </button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Vista Grid de Servicios (por grupo) */
                    <div className="space-y-7">
                    {groupedServices.map((g) => (
                    <section key={g.key}>
                    {hasGroups && renderGroupHeader(g)}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                        {g.items.map((service) => {
                            const isToggling = togglingId === service.id;
                            const mPct = margin(service.price, service.cost);
                            const profit = (service.price || 0) - (service.cost || 0);

                            return (
                                <motion.div
                                    key={service.id}
                                    initial={cardInitial}
                                    animate={cardAnimate}
                                    className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-300 hover:shadow-lg p-5 sm:p-6"
                                >
                                    <div>
                                        {/* Cabecera de la Card */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/15">
                                                <Tag size={20} />
                                            </div>

                                            {/* 1-Click Status Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleServiceActive(service)}
                                                disabled={isToggling || !canEdit('servicios')}
                                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                                                    service.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                } ${canEdit('servicios') ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                                                title={canEdit('servicios') ? 'Clic para cambiar estado' : undefined}
                                            >
                                                {isToggling ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : service.is_active ? (
                                                    <CheckCircle2 size={12} />
                                                ) : (
                                                    <XCircle size={12} />
                                                )}
                                                <span>{service.is_active ? 'Activo' : 'Pausado'}</span>
                                            </button>
                                        </div>

                                        {/* Badges de atributos */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                            {service.is_special && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                                                    <Sparkles size={10} />
                                                    Especial
                                                </span>
                                            )}
                                            {service.show_in_form === false && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    <EyeOff size={10} />
                                                    Oculto en formulario
                                                </span>
                                            )}
                                        </div>

                                        {/* Título y Descripción */}
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                            {service.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                            {service.description || 'Sin descripción detallada.'}
                                        </p>
                                    </div>

                                    {/* Precios, Margen y Acciones */}
                                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-end justify-between gap-2">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Precio de Venta
                                                </p>
                                                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                                    {formatCLP(service.price)}
                                                </div>

                                                {/* Barra de Costo y Margen */}
                                                {service.cost > 0 && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Costo: {formatCLP(service.cost)}
                                                        </span>
                                                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                                            mPct >= 50
                                                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                                                : mPct >= 20
                                                                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                                                                    : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                                                        }`}>
                                                            {mPct}% margen (+{formatCLP(profit)})
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Botones de Acción */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {canEdit('servicios') && (
                                                    <button
                                                        onClick={() => handleOpenServiceModal(service)}
                                                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary transition-all"
                                                        title="Editar servicio"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                )}
                                                {canDelete('servicios') && (
                                                    <button
                                                        onClick={() => handleDelete('service', service.id, service.name)}
                                                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                                        title="Eliminar servicio"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    </section>
                    ))}

                        {/* Card Agregar Nuevo Servicio */}
                        {canCreate('servicios') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                            <button
                                type="button"
                                onClick={() => handleOpenServiceModal()}
                                disabled={isServiceLimitReached}
                                className="min-h-[220px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-primary/[0.02] flex flex-col items-center justify-center gap-2 p-6 transition-all group disabled:opacity-40 disabled:cursor-not-allowed text-center"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus size={24} />
                                </div>
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                                    Nuevo Servicio
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    Añadir otra prestación al catálogo
                                </span>
                            </button>
                    </div>
                        )}
                    </div>
                ) : (
                    /* Vista Tabla de Servicios */
                    <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <th className="py-3 px-4">Servicio</th>
                                        <th className="py-3 px-4">Tipo / Opciones</th>
                                        <th className="py-3 px-4 text-right">Precio Venta</th>
                                        <th className="py-3 px-4 text-right">Costo Directo</th>
                                        <th className="py-3 px-4 text-center">Margen Bruto</th>
                                        <th className="py-3 px-4 text-center">Estado</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {groupedServices.map((g) => (
                                    <React.Fragment key={g.key}>
                                    {hasGroups && (
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                            <td colSpan={7} className="pt-3 pb-1 px-4">{renderGroupHeader(g)}</td>
                                        </tr>
                                    )}
                                    {g.items.map((service) => {
                                        const isToggling = togglingId === service.id;
                                        const mPct = margin(service.price, service.cost);
                                        const profit = (service.price || 0) - (service.cost || 0);

                                        return (
                                            <tr key={service.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {service.name}
                                                    </div>
                                                    {service.description && (
                                                        <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                                                            {service.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {service.is_special ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                                                                <Sparkles size={9} /> Especial
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground">Estándar</span>
                                                        )}
                                                        {service.show_in_form === false && (
                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                                                                Oculto web
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white text-sm">
                                                    {formatCLP(service.price)}
                                                </td>
                                                <td className="py-3 px-4 text-right text-muted-foreground">
                                                    {service.cost > 0 ? formatCLP(service.cost) : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {service.cost > 0 ? (
                                                        <span className={`inline-block font-extrabold text-[11px] px-2 py-0.5 rounded-full ${
                                                            mPct >= 50
                                                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                                                : mPct >= 20
                                                                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                                                                    : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                                                        }`}>
                                                            {mPct}% (+{formatCLP(profit)})
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[10px]">Sin costo reg.</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleServiceActive(service)}
                                                        disabled={isToggling || !canEdit('servicios')}
                                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                                            service.is_active
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {isToggling ? <Loader2 size={10} className="animate-spin" /> : null}
                                                        <span>{service.is_active ? 'Activo' : 'Pausado'}</span>
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canEdit('servicios') && (
                                                            <button
                                                                onClick={() => handleOpenServiceModal(service)}
                                                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        )}
                                                        {canDelete('servicios') && (
                                                            <button
                                                                onClick={() => handleDelete('service', service.id, service.name)}
                                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                /* ========================================================
                   SECCIÓN PLANES COMERCIALES (Grid o Table)
                   ======================================================== */
                filteredAndSortedPlans.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                            <Layers size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            {searchTerm || statusFilter !== 'all' ? 'Sin resultados para los filtros' : 'Aún no hay planes comerciales'}
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Prueba con otros términos de búsqueda o restablece los filtros.'
                                : 'Agrupa servicios y productos en paquetes completos para las familias.'}
                        </p>
                        {!searchTerm && statusFilter === 'all' && canCreate('servicios') && (
                            <button
                                onClick={() => router.push('/dashboard/gestion-servicios/plan/nuevo')}
                                disabled={isPlanLimitReached}
                                className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/95 transition-all"
                            >
                                <Plus size={16} />
                                Crear Primer Plan
                            </button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Vista Grid de Planes (por grupo) */
                    <div className="space-y-7">
                    {groupedPlans.map((g) => (
                    <section key={g.key}>
                    {hasPlanGroups && renderGroupHeader(g, 'plan')}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                        {g.items.map((plan) => {
                            const isToggling = togglingId === plan.id;
                            const totalItemsIncluded = (plan.services?.length || 0) + (plan.products?.length || 0);

                            return (
                                <motion.div
                                    key={plan.id}
                                    initial={cardInitial}
                                    animate={cardAnimate}
                                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-300 hover:shadow-lg"
                                >
                                    <div>
                                        {/* Imagen o Banner Superior */}
                                        {plan.image_url ? (
                                            <div className="relative w-full h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={plan.image_url}
                                                    alt={plan.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                                {/* Acciones flotantes sobre imagen */}
                                                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                                    {canEdit('servicios') && (
                                                        <button
                                                            onClick={() => router.push(`/dashboard/gestion-servicios/plan/${plan.id}`)}
                                                            className="w-8 h-8 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/30 text-white hover:bg-primary hover:border-primary transition-all flex items-center justify-center shadow-sm"
                                                            title="Editar plan"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                    {canDelete('servicios') && (
                                                        <button
                                                            onClick={() => handleDelete('plan', plan.id, plan.name)}
                                                            className="w-8 h-8 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/30 text-white hover:bg-red-600 hover:border-red-600 transition-all flex items-center justify-center shadow-sm"
                                                            title="Eliminar plan"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Toggle Activo / Inactivo sobre imagen */}
                                                <div className="absolute bottom-3 left-3 z-10">
                                                    <ActiveSwitch
                                                        onImage
                                                        active={plan.is_active}
                                                        loading={isToggling}
                                                        disabled={!canEdit('servicios')}
                                                        onToggle={() => handleTogglePlanActive(plan)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-5 pb-0 flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/15">
                                                        <Diamond size={20} />
                                                    </div>
                                                    <ActiveSwitch
                                                        active={plan.is_active}
                                                        loading={isToggling}
                                                        disabled={!canEdit('servicios')}
                                                        onToggle={() => handleTogglePlanActive(plan)}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {canEdit('servicios') && (
                                                        <button
                                                            onClick={() => router.push(`/dashboard/gestion-servicios/plan/${plan.id}`)}
                                                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary transition-all"
                                                            title="Editar plan"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                    {canDelete('servicios') && (
                                                        <button
                                                            onClick={() => handleDelete('plan', plan.id, plan.name)}
                                                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                                            title="Eliminar plan"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Información del Plan */}
                                        <div className="p-5 space-y-2.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {plan.is_featured && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                        <Star size={10} className="fill-amber-500 text-amber-500" />
                                                        Más solicitado
                                                    </span>
                                                )}
                                                {plan.important_note && (
                                                    <span
                                                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800 truncate max-w-full"
                                                        title={plan.important_note}
                                                    >
                                                        <AlertCircle size={10} className="shrink-0" />
                                                        <span className="truncate">{plan.important_note}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                {plan.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {plan.description || 'Sin descripción detallada.'}
                                            </p>

                                            {/* Servicios incluidos en el plan */}
                                            {plan.services && plan.services.length > 0 && (
                                                <div className="pt-2">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                                                        Servicios incluidos ({plan.services.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {plan.services.slice(0, 3).map((svc: any) => (
                                                            <span
                                                                key={svc.id}
                                                                className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md"
                                                            >
                                                                <Check size={9} className="text-emerald-500" />
                                                                {svc.name}
                                                            </span>
                                                        ))}
                                                        {plan.services.length > 3 && (
                                                            <span className="text-[10px] font-bold text-primary px-1.5 py-0.5">
                                                                +{plan.services.length - 3} más
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer con Precio del Plan */}
                                    <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Precio del Plan
                                            </p>
                                            <div className="text-xl sm:text-2xl font-black text-primary">
                                                {formatCLP(plan.price)}
                                            </div>
                                            {(plan.cost || 0) > 0 && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Costo estimado: {formatCLP(plan.cost)}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => router.push(`/dashboard/gestion-servicios/plan/${plan.id}`)}
                                            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
                                        >
                                            Configurar
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    </section>
                    ))}

                        {/* Card Agregar Nuevo Plan */}
                        {canCreate('servicios') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard/gestion-servicios/plan/nuevo')}
                                disabled={isPlanLimitReached}
                                className="min-h-[220px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-primary/[0.02] flex flex-col items-center justify-center gap-2 p-6 transition-all group disabled:opacity-40 disabled:cursor-not-allowed text-center"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus size={24} />
                                </div>
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                                    Nuevo Plan Comercial
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    Diseña un nuevo paquete integrado
                                </span>
                            </button>
                    </div>
                        )}
                    </div>
                ) : (
                    /* Vista Tabla de Planes */
                    <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <th className="py-3 px-4">Plan</th>
                                        <th className="py-3 px-4">Servicios Incluidos</th>
                                        <th className="py-3 px-4 text-right">Precio Plan</th>
                                        <th className="py-3 px-4 text-right">Costo Estimado</th>
                                        <th className="py-3 px-4 text-center">Estado</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {groupedPlans.map((g) => (
                                    <React.Fragment key={g.key}>
                                    {hasPlanGroups && (
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                            <td colSpan={6} className="pt-3 pb-1 px-4">{renderGroupHeader(g, 'plan')}</td>
                                        </tr>
                                    )}
                                    {g.items.map((plan) => {
                                        const isToggling = togglingId === plan.id;

                                        return (
                                            <tr key={plan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        {plan.image_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={plan.image_url}
                                                                alt={plan.name}
                                                                className="w-10 h-10 rounded-xl object-cover shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                                <Diamond size={18} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                                                <span>{plan.name}</span>
                                                                {plan.is_featured && (
                                                                    <Star size={12} className="fill-amber-500 text-amber-500" />
                                                                )}
                                                            </div>
                                                            {plan.description && (
                                                                <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                                                                    {plan.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {plan.services?.length || 0}
                                                    </span>
                                                    <span className="text-muted-foreground ml-1">servicios</span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-primary text-sm">
                                                    {formatCLP(plan.price)}
                                                </td>
                                                <td className="py-3 px-4 text-right text-muted-foreground">
                                                    {(plan.cost || 0) > 0 ? formatCLP(plan.cost) : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <ActiveSwitch
                                                        active={plan.is_active}
                                                        loading={isToggling}
                                                        disabled={!canEdit('servicios')}
                                                        onToggle={() => handleTogglePlanActive(plan)}
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canEdit('servicios') && (
                                                            <button
                                                                onClick={() => router.push(`/dashboard/gestion-servicios/plan/${plan.id}`)}
                                                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        )}
                                                        {canDelete('servicios') && (
                                                            <button
                                                                onClick={() => handleDelete('plan', plan.id, plan.name)}
                                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Modal de Creación / Edición de Servicio (con Calculadora en Vivo de Margen) */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentService?.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            >
                {currentService && (
                    <form onSubmit={handleSaveService} className="space-y-5">
                        <div className="space-y-4">
                            {/* Nombre */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Nombre del Servicio *
                                </label>
                                <input
                                    required
                                    value={currentService?.name || ''}
                                    onChange={(e) => setCurrentService({ ...currentService, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                                    placeholder="Ej: Cremación Individual con Sala de Duelo"
                                />
                            </div>

                            {/* Grupo (solo para ordenar este panel) */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Grupo
                                </label>
                                <input
                                    list="service-groups"
                                    maxLength={60}
                                    value={currentService?.group_name || ''}
                                    onChange={(e) => setCurrentService({ ...currentService, group_name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                                    placeholder={serviceGroupNames.length ? 'Elige uno existente o escribe uno nuevo' : 'Ej: Cremaciones, Traslados, Ceremonias'}
                                />
                                <datalist id="service-groups">
                                    {serviceGroupNames.map(g => <option key={g} value={g} />)}
                                </datalist>
                                <p className="text-[11px] text-muted-foreground">
                                    Solo ordena esta lista; la familia no lo ve. Vacío = «Sin grupo».
                                </p>
                            </div>

                            {/* Descripción */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Descripción
                                </label>
                                <textarea
                                    value={currentService?.description || ''}
                                    onChange={(e) => setCurrentService({ ...currentService, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white min-h-[75px] resize-none"
                                    placeholder="Detalles sobre lo que incluye esta prestación..."
                                />
                            </div>

                            {/* Precios: Venta y Costo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Precio de Venta ($ CLP) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            required
                                            min={0}
                                            value={currentService?.price || 0}
                                            onChange={(e) => setCurrentService({ ...currentService, price: Number(e.target.value) })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-8 pr-3.5 text-sm font-black outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Costo Directo ($ CLP)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={currentService?.cost || 0}
                                            onChange={(e) => setCurrentService({ ...currentService, cost: Number(e.target.value) })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-8 pr-3.5 text-sm font-black outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Widget en Vivo: Rentabilidad Estimada */}
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                                        Utilidad Bruta Estimada
                                    </span>
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                        {formatCLP(modalProfit.profit)}
                                    </span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    modalProfit.pct >= 50
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : modalProfit.pct >= 20
                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                            : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800'
                                }`}>
                                    {modalProfit.pct}% margen
                                </div>
                            </div>

                            {/* Estado y Opciones Avanzadas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Estado Operativo
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'true', label: 'Activo' },
                                            { value: 'false', label: 'Inactivo / Pausado' }
                                        ]}
                                        value={currentService?.is_active ? 'true' : 'false'}
                                        onChange={(val) => setCurrentService({ ...currentService, is_active: val === 'true' })}
                                        placeholder="Seleccionar estado..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Visibilidad en Formulario
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'true', label: 'Visible en formulario web' },
                                            { value: 'false', label: 'Oculto (Solo interno)' }
                                        ]}
                                        value={currentService?.show_in_form !== false ? 'true' : 'false'}
                                        onChange={(val) => setCurrentService({ ...currentService, show_in_form: val === 'true' })}
                                        placeholder="Seleccionar visibilidad..."
                                    />
                                </div>
                            </div>

                            {/* Checkbox Servicio Especial */}
                            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={!!currentService?.is_special}
                                    onChange={(e) => setCurrentService({ ...currentService, is_special: e.target.checked })}
                                    className="mt-0.5 w-4 h-4 accent-primary rounded cursor-pointer"
                                />
                                <div>
                                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                                        Marcar como Servicio Especial (Adicional)
                                    </span>
                                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                                        Ej: eutanasia, exhumación o traslados urgentes. Se ofrece como un servicio opcional posterior a la selección del plan.
                                    </span>
                                </div>
                            </label>
                        </div>

                        {/* Botones del Modal */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all text-slate-700 dark:text-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving && <Loader2 size={14} className="animate-spin" />}
                                <span>{currentService?.id ? 'Guardar Cambios' : 'Crear Servicio'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de Confirmación de Eliminación */}
            <DeleteConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`¿Eliminar ${itemToDelete?.type === 'service' ? 'Servicio' : 'Plan'}?`}
                description={`Estás a punto de eliminar "${itemToDelete?.name}". Esta acción no se puede deshacer.`}
            />

            {/* Importar servicios desde Excel */}
            <ImportServicesModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

            {/* Renombrar grupo */}
            <Modal
                isOpen={!!groupToRename}
                onClose={() => !renamingGroup && setGroupToRename(null)}
                title="Renombrar grupo"
                maxWidth="max-w-md"
            >
                {groupToRename && (
                    <form onSubmit={handleRenameGroup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Nuevo nombre para «{groupToRename.old}»
                            </label>
                            <input
                                autoFocus
                                maxLength={60}
                                value={groupToRename.value}
                                onChange={(e) => setGroupToRename({ ...groupToRename, value: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-medium outline-none focus:border-primary transition-all text-slate-900 dark:text-white"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {groupToRename.kind === 'plan'
                                    ? 'Cambia el grupo de todos sus planes; los enlaces del catálogo que lo mostraban lo siguen mostrando. Vacío = «Sin grupo».'
                                    : 'Cambia el grupo de todos sus servicios. Si escribes el nombre de otro grupo, se unen. Vacío = «Sin grupo».'}
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setGroupToRename(null)}
                                disabled={renamingGroup}
                                className="px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all text-slate-700 dark:text-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={renamingGroup || groupToRename.value.trim() === groupToRename.old}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {renamingGroup && <Loader2 size={14} className="animate-spin" />}
                                <span>Guardar</span>
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de Límite de Plan */}
            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName={modalResource}
            />

            {/* Modal de Catálogo Completo / Descarga PDF */}
            <Modal
                isOpen={showPlansCatalogModal}
                onClose={() => setShowPlansCatalogModal(false)}
                title="Catálogo de Planes Comerciales"
                maxWidth="max-w-7xl"
            >
                <div className="space-y-6">
                    {/* Controles de Vista Previa */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4">
                        <div className="flex flex-wrap items-center gap-5">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogPlansOnlyActive}
                                    onChange={(e) => setCatalogPlansOnlyActive(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                                />
                                <span>Solo Activos</span>
                            </label>

                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogPlansShowPrices}
                                    onChange={(e) => setCatalogPlansShowPrices(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                                />
                                <span>Mostrar Precios</span>
                            </label>

                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogPlansShowImages}
                                    onChange={(e) => setCatalogPlansShowImages(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                                />
                                <span>Mostrar Imágenes</span>
                            </label>

                            {hasPlanGroups && (
                                <select
                                    value={catalogPlansGroup}
                                    onChange={(e) => setCatalogPlansGroup(e.target.value)}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                                    title="Grupo de planes del PDF"
                                >
                                    <option value="all">Todos los grupos</option>
                                    {planGroupNames.map(g => <option key={g} value={g}>{g}</option>)}
                                    <option value={NO_GROUP}>Sin grupo</option>
                                </select>
                            )}
                        </div>

                        <div className="shrink-0">
                            <PlansDownloadLink
                                plans={catalogPdfPlans}
                                showPrices={catalogPlansShowPrices}
                                showImages={catalogPlansShowImages}
                                contact={{ phone: tenantData?.phone, email: tenantData?.email, address: tenantData?.address, city: tenantData?.city }}
                                tenantName={tenantData?.name || 'Catálogo de Planes'}
                                logoUrl={getLogoUrl()}
                                filename={`planes-${tenantData?.name?.toLowerCase().replace(/\s+/g, '-') || 'crematorio'}.pdf`}
                            />
                        </div>
                    </div>

                    {/* Previsualización del Catálogo */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Cabecera Dossier */}
                        <div className="bg-white dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 px-6 py-6 flex items-center gap-4">
                            {getLogoUrl() && (
                                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-2 shrink-0 flex items-center justify-center">
                                    <img src={getLogoUrl()!} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                    {tenantData?.name || 'Catálogo de Planes'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Dossier de servicios y prestaciones disponibles
                                </p>
                            </div>
                        </div>

                        {/* Listado de Planes */}
                        <div className="p-6">
                            {catalogPdfPlans.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground text-sm font-medium">
                                    No hay planes para mostrar con los filtros seleccionados.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {sortPlansForCatalog(catalogPdfPlans).map((plan: any) => (
                                        <div
                                            key={plan.id}
                                            className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex gap-4"
                                        >
                                            {catalogPlansShowImages && plan.image_url && (
                                                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0">
                                                    <img src={plan.image_url} alt={plan.name} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                        {plan.name}
                                                    </h4>
                                                    {catalogPlansShowPrices && (
                                                        <span className="font-black text-primary text-sm shrink-0">
                                                            {formatCLP(plan.price)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {plan.description || 'Sin descripción.'}
                                                </p>
                                                {plan.services && plan.services.length > 0 && (
                                                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1">
                                                        {plan.services.slice(0, 3).map((svc: any) => (
                                                            <span
                                                                key={svc.id}
                                                                className="text-[10px] font-medium bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded"
                                                            >
                                                                ✓ {svc.name}
                                                            </span>
                                                        ))}
                                                        {plan.services.length > 3 && (
                                                            <span className="text-[10px] font-bold text-primary">
                                                                +{plan.services.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal para Compartir Catálogo Público */}
            <ShareCatalogModal
                isOpen={showSharePlansModal}
                onClose={() => setShowSharePlansModal(false)}
                tenantSlug={tenantData?.slug || ''}
                tenantName={tenantData?.name || ''}
                planGroups={planGroupNames}
                catalogType="plans"
            />
        </div>
    );
}
