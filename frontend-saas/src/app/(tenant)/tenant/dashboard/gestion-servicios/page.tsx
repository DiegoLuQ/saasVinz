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
    Package,
    Loader2,
    Layers,
    TrendingUp,
    X,
    FolderTree,
    Diamond,
    Info,
    Lock,
    BookOpen
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { apiRequest, API_URL } from '@/lib/tenant/api';
import { motion, AnimatePresence } from 'framer-motion';

const PlansDownloadLink = dynamic(() => import('@/components/tenant/catalog/PDFPlansDownloadButton'), { ssr: false });
import PlanImageUploader from '@/components/tenant/catalog/PlanImageUploader';
import {
    useCatalogServices,
    useCatalogPlans,
    useSaveService,
    useDeleteService,
    useSavePlan,
    useDeletePlan,
    useCatalogProducts,
    useSaveProduct
} from '@/hooks/useCatalog';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import SearchableSelect from '@/components/tenant/SearchableSelect';

interface Service {
    id: number;
    name: string;
    description: string;
    price: number;
    cost: number;
    is_active: boolean;
}

interface Product {
    id: number;
    name: string;
    sale_price: number;
    cost_price: number;
}

interface Plan {
    id: number;
    name: string;
    description: string;
    price: number;
    cost: number;
    image_url?: string | null;
    is_active: boolean;
    services?: Service[];
    service_ids?: number[];
    products?: any[];
    product_ids?: number[];
}

const cardInitial = { opacity: 0, y: 20 };
const cardAnimate = { opacity: 1, y: 0 };

export default function ServicesPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const { canDelete, canCreate } = usePermissions();
    const { tenantData, formatLimit } = useTenant();

    const { data: services = [], isLoading: loadingServices } = useCatalogServices();
    const { data: plans = [], isLoading: loadingPlans } = useCatalogPlans();
    const { data: products = [] } = useCatalogProducts();

    const saveServiceMutation = useSaveService();
    const deleteServiceMutation = useDeleteService();
    const savePlanMutation = useSavePlan();
    const deletePlanMutation = useDeletePlan();
    const saveProductMutation = useSaveProduct();

    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'servicios' | 'planes'>('servicios');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Service> | null>(null);
    const [currentPlan, setCurrentPlan] = useState<Partial<Plan> | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'service' | 'plan'; id: number; name: string } | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [modalResource, setModalResource] = useState('Servicios');

    const [showQuickProduct, setShowQuickProduct] = useState(false);
    const [quickProduct, setQuickProduct] = useState({ name: '', cost_price: 0, sale_price: 0 });
    // Imagen del plan pendiente de subir (se sube al guardar el formulario)
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [marginInfoId, setMarginInfoId] = useState<number | null>(null);

    const [showPlansCatalogModal, setShowPlansCatalogModal] = useState(false);
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

    const filteredServices = useMemo(() => {
        return services.filter((s: Service) => {
            const matchSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.description?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false);
            const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && s.is_active) || (statusFilter === 'inactive' && !s.is_active);
            return matchSearch && matchStatus;
        });
    }, [services, searchTerm, statusFilter]);

    const filteredPlans = useMemo(() => {
        return plans.filter((p: Plan) => {
            const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.description?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false);
            const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && p.is_active) || (statusFilter === 'inactive' && !p.is_active);
            return matchSearch && matchStatus;
        });
    }, [plans, searchTerm, statusFilter]);

    const handleOpenServiceModal = (service?: Service) => {
        if (!service && isServiceLimitReached) {
            setModalResource('Recursos');
            setShowLimitModal(true);
            return;
        }
        setCurrentService(service || { name: '', description: '', price: 0, cost: 0, is_active: true });
        setCurrentPlan(null);
        setIsModalOpen(true);
    };

    const handleOpenPlanModal = (plan?: Plan) => {
        if (!plan && isPlanLimitReached) {
            setModalResource('Planes Comerciales');
            setShowLimitModal(true);
            return;
        }
        const service_ids = plan?.services?.map(s => s.id) || [];
        const product_ids = plan?.products?.map(p => p.id) || [];
        setCurrentPlan(plan ? { ...plan, service_ids, product_ids } : { name: '', description: '', price: 0, cost: 0, is_active: true, service_ids: [], product_ids: [] });
        setCurrentService(null);
        setSelectedImageFile(null); // limpiar archivo pendiente al abrir el modal
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
        } catch (err: any) {
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const isEdit = !!currentPlan?.id;

            // Subir la imagen pendiente (recortada 1:1) antes de guardar el plan
            let finalImageUrl = currentPlan?.image_url;
            if (selectedImageFile) {
                const formData = new FormData();
                formData.append('file', selectedImageFile);
                const uploadRes = await apiRequest('/api/internal/plans/upload-image', {
                    method: 'POST',
                    body: formData,
                });
                finalImageUrl = uploadRes.image_url;
            }

            await savePlanMutation.mutateAsync({
                isEdit,
                plan: { ...currentPlan, image_url: finalImageUrl }
            });
            setSelectedImageFile(null);
            setIsModalOpen(false);
        } catch (err: any) {
        } finally {
            setIsSaving(false);
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

    const handleQuickProductCreate = async () => {
        if (!quickProduct.name) return;
        try {
            const newProd = await saveProductMutation.mutateAsync({
                product: { ...quickProduct, code: `AUTO_${Date.now()}` },
                isEdit: false
            });
            if (currentPlan) {
                const product_ids = [...(currentPlan.product_ids || []), newProd.id];
                setCurrentPlan({ ...currentPlan, product_ids });
            }
            setQuickProduct({ name: '', cost_price: 0, sale_price: 0 });
            setShowQuickProduct(false);
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

    return (
        <div className="space-y-8">
            {/* Header decorativo */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-900/20 via-primary/5 to-transparent border border-amber-900/10 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
                            <FolderTree className="text-amber-400" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Catálogo de Servicios</h1>
                            <p className="text-muted-foreground mt-1.5 max-w-xl">Diseña los servicios y paquetes que ofrecerás a las familias. Cada servicio puede incluir productos y prestaciones personalizadas.</p>
                            {tenantData?.subscription_plan && (
                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                    <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1 rounded-xl text-xs text-muted-foreground font-medium">
                                        Plan: <strong className="text-amber-400 font-bold uppercase">{tenantData.subscription_plan.name}</strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1 rounded-xl text-xs text-muted-foreground font-medium">
                                        Servicios: <strong className="text-white font-bold">{services.length} / {formatLimit(maxServices)}</strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1 rounded-xl text-xs text-muted-foreground font-medium">
                                        Planes Comerciales: <strong className="text-white font-bold">{isPlanesEnabled ? `${plans.length} / ${formatLimit(maxPlans)}` : 'No disponible'}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {activeTab === 'planes' && (
                            <button
                                onClick={() => setShowPlansCatalogModal(true)}
                                className="border border-white/10 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center transition-all text-sm bg-white/5 text-white hover:bg-white/10 hover:border-amber-500/30 active:scale-95"
                                title="Ver Catálogo de Planes"
                            >
                                <BookOpen className="mr-2" size={18} />
                                Ver Catálogo
                            </button>
                        )}
                        {canCreate('servicios') && (
                            <button
                                onClick={() => activeTab === 'servicios' ? handleOpenServiceModal() : router.push('/dashboard/gestion-servicios/plan/nuevo')}
                                disabled={activeTab === 'servicios' ? isServiceLimitReached : isPlanLimitReached}
                                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3.5 px-7 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                <Plus className="mr-2" size={18} />
                                {activeTab === 'servicios' ? 'Nuevo Servicio' : 'Nuevo Plan'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs + Filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex p-1 bg-white/5 rounded-2xl border border-white/5">
                        <button
                            onClick={() => { setActiveTab('servicios'); setSearchTerm(''); setStatusFilter('all'); }}
                            className={`relative flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold transition-all ${activeTab === 'servicios' ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {activeTab === 'servicios' && (
                                <motion.div layoutId="tab-bg" className="absolute inset-0 bg-primary rounded-xl shadow-md" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                            )}
                            <Tag size={16} className="relative z-10" />
                            <span className="relative z-10">Servicios</span>
                            <span className="relative z-10 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md">{services.length}</span>
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
                            }}
                            className={`relative flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold transition-all ${
                                !isPlanesEnabled
                                    ? 'opacity-60 cursor-not-allowed text-muted-foreground/60 hover:text-muted-foreground'
                                    : activeTab === 'planes'
                                        ? 'text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {activeTab === 'planes' && isPlanesEnabled && (
                                <motion.div layoutId="tab-bg" className="absolute inset-0 bg-primary rounded-xl shadow-md" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                            )}
                            {!isPlanesEnabled ? <Lock size={14} className="relative z-10 text-amber-500/85" /> : <Layers size={16} className="relative z-10" />}
                            <span className="relative z-10">Planes</span>
                            <span className="relative z-10 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md">{plans.length}</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-56">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} />
                        <input
                            type="text"
                            placeholder={activeTab === 'servicios' ? 'Buscar servicio...' : 'Buscar plan...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-500/40 transition-all font-medium"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex p-0.5 bg-white/5 rounded-xl border border-white/5">
                        {(['all', 'active', 'inactive'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-white/10 text-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-muted-foreground'}`}
                            >
                                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            {loadingServices || loadingPlans ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                        <Loader2 className="animate-spin text-amber-500" size={40} />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent blur-xl" />
                    </div>
                    <p className="text-muted-foreground font-medium">Cargando catálogo...</p>
                </div>
            ) : (
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                >
                    {activeTab === 'servicios' ? (
                        filteredServices.length > 0 ? (
                            filteredServices.map((service) => (
                                <motion.div
                                    key={service.id}
                                    initial={cardInitial}
                                    animate={cardAnimate}
                                    className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] hover:border-amber-500/25 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.03] rounded-full blur-2xl group-hover:bg-amber-500/[0.06] transition-all duration-700" />
                                    <div className="p-7 flex flex-col h-full relative z-10">
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                <Tag size={22} className="text-amber-400" />
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${service.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' : 'bg-red-500/10 text-red-400 border-red-500/15'}`}>
                                                {service.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                {service.is_active ? 'Activo' : 'Inactivo'}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2.5">
                                            <h3 className="text-lg font-bold group-hover:text-amber-400 transition-colors duration-300">{service.name}</h3>
                                            <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2">{service.description || 'Sin descripción'}</p>
                                        </div>

                                        <div className="mt-6 pt-5 border-t border-white/[0.04] flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider mb-1">Precio</p>
                                                <div className="text-2xl font-black tracking-tight text-white">
                                                    ${(service.price || 0).toLocaleString()}
                                                </div>
                                                {service.cost > 0 && (
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <div className="h-1.5 w-16 rounded-full bg-white/5 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${margin(service.price, service.cost) >= 50 ? 'bg-emerald-500' : margin(service.price, service.cost) >= 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                style={{ width: `${Math.min(margin(service.price, service.cost), 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-muted-foreground/50">{margin(service.price, service.cost)}%</span>
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => setMarginInfoId(marginInfoId === service.id ? null : service.id)}
                                                                className="text-muted-foreground/40 hover:text-amber-400 transition-colors"
                                                            >
                                                                <Info size={11} />
                                                            </button>
                                                            {marginInfoId === service.id && (
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-[10px] text-white/90 rounded-xl p-3 shadow-xl border border-white/10 text-center leading-relaxed z-50 pointer-events-none">
                                                                    Diferencia entre el precio de venta y el costo del servicio, expresada como porcentaje.
                                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-white/10 -mt-1" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleOpenServiceModal(service)}
                                                    className="p-2.5 rounded-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-amber-500/25 text-muted-foreground hover:text-amber-400 transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                {canDelete('servicios') && (
                                                    <button
                                                        onClick={() => handleDelete('service', service.id, service.name)}
                                                        className="p-2.5 rounded-xl border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/25 text-muted-foreground hover:text-red-400 transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="sm:col-span-2 xl:col-span-3 py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/10 flex items-center justify-center mb-6">
                                    <Tag size={36} className="text-amber-400/60" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{searchTerm || statusFilter !== 'all' ? 'Sin resultados' : 'Aún no hay servicios'}</h3>
                                <p className="text-muted-foreground max-w-md">
                                    {searchTerm || statusFilter !== 'all'
                                        ? 'Intenta con otros términos de búsqueda o cambia el filtro de estado.'
                                        : 'Crea tu primer servicio para comenzar a armar el catálogo de prestaciones.'}
                                </p>
                                {!searchTerm && statusFilter === 'all' && canCreate('servicios') && (
                                    <button
                                        onClick={() => handleOpenServiceModal()}
                                        disabled={isServiceLimitReached}
                                        className="mt-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3 px-7 rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all text-sm"
                                    >
                                        <Plus className="inline mr-2" size={16} />
                                        Crear Servicio
                                    </button>
                                )}
                            </div>
                        )
                    ) : (
                        filteredPlans.length > 0 ? (
                            filteredPlans.map((plan) => (
                                <motion.div
                                    key={plan.id}
                                    initial={cardInitial}
                                    animate={cardAnimate}
                                    className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500/[0.04] via-white/[0.02] to-transparent border border-amber-500/10 hover:border-amber-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1"
                                >
                                    <div className="pointer-events-none absolute -top-6 -right-6 w-40 h-40 bg-amber-500/[0.04] rounded-full blur-3xl group-hover:bg-amber-500/[0.08] transition-all duration-700" />

                                    {/* Acciones: siempre visibles arriba a la derecha (sobre imagen o encabezado) */}
                                    <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                                        <button
                                            onClick={() => router.push(`/dashboard/gestion-servicios/plan/${plan.id}`)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-white/80 hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-amber-300 transition-all"
                                            title="Editar"
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                        {canDelete('servicios') && (
                                            <button
                                                onClick={() => handleDelete('plan', plan.id, plan.name)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-white/80 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Media: banner de altura fija si hay imagen; si no, franja con ícono */}
                                    {plan.image_url ? (
                                        <div className="relative w-full h-44 overflow-hidden shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={plan.image_url} alt={plan.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/10 to-transparent" />
                                            <div className={`absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border backdrop-blur-sm ${plan.is_active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/25' : 'bg-red-500/20 text-red-300 border-red-500/25'}`}>
                                                {plan.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                {plan.is_active ? 'Activo' : 'Inactivo'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative px-7 pt-7 pb-2 flex items-center gap-3 shrink-0">
                                            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/15 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                                                <Diamond size={22} className="text-amber-400" />
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border ${plan.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' : 'bg-red-500/10 text-red-400 border-red-500/15'}`}>
                                                {plan.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                {plan.is_active ? 'Activo' : 'Inactivo'}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-7 pt-5 flex flex-col flex-1 relative z-10">
                                        <div className="flex-1 space-y-3">
                                            <h3 className="text-lg font-bold leading-tight">{plan.name}</h3>
                                            <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2">{plan.description || 'Sin descripción'}</p>

                                            {plan.services && plan.services.length > 0 && (
                                                <div className="space-y-1.5 pt-2">
                                                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Servicios incluidos</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {plan.services.slice(0, 4).map(svc => (
                                                            <span key={svc.id} className="inline-flex items-center gap-1 bg-white/[0.04] px-2.5 py-1 rounded-lg text-[10px] font-medium text-muted-foreground/70 border border-white/[0.04]">
                                                                <CheckCircle2 size={8} className="text-emerald-400/60" />
                                                                {svc.name}
                                                            </span>
                                                        ))}
                                                        {plan.services.length > 4 && (
                                                            <span className="inline-flex items-center text-[10px] font-bold text-amber-400/60 px-2">+{plan.services.length - 4} más</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-5 border-t border-amber-500/10">
                                            <p className="text-[10px] text-amber-400/50 font-medium uppercase tracking-wider mb-1">Precio Plan</p>
                                            <div className="text-2xl font-black tracking-tight text-amber-400">
                                                ${(plan.price || 0).toLocaleString()}
                                            </div>
                                            {(plan.cost || 0) > 0 && (
                                                <div className="text-[9px] text-muted-foreground/40 mt-1">Costo: ${(plan.cost || 0).toLocaleString()}</div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="sm:col-span-2 xl:col-span-3 py-20 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/10 flex items-center justify-center mb-6">
                                    <Layers size={36} className="text-amber-400/60" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{searchTerm || statusFilter !== 'all' ? 'Sin resultados' : 'Aún no hay planes'}</h3>
                                <p className="text-muted-foreground max-w-md">
                                    {searchTerm || statusFilter !== 'all'
                                        ? 'Intenta con otros términos de búsqueda o cambia el filtro de estado.'
                                        : 'Agrupa servicios y productos en un plan para ofrecer paquetes completos a las familias.'}
                                </p>
                                {!searchTerm && statusFilter === 'all' && canCreate('servicios') && (
                                    <button
                                        onClick={() => handleOpenPlanModal()}
                                        disabled={isPlanLimitReached}
                                        className="mt-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3 px-7 rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all text-sm"
                                    >
                                        <Plus className="inline mr-2" size={16} />
                                        Crear Plan
                                    </button>
                                )}
                            </div>
                        )
                    )}

                    {/* Add New Skeleton Card */}
                    {canCreate('servicios') && (
                        <motion.div
                            initial={cardInitial}
                            animate={cardAnimate}
                            onClick={() => (activeTab === 'servicios' ? !isServiceLimitReached : !isPlanLimitReached) ? (activeTab === 'servicios' ? handleOpenServiceModal() : router.push('/dashboard/gestion-servicios/plan/nuevo')) : (setModalResource(activeTab === 'servicios' ? 'Servicios' : 'Planes Comerciales'), setShowLimitModal(true))}
                            className={`relative overflow-hidden rounded-[2rem] border-2 border-dashed border-white/[0.06] bg-transparent hover:bg-white/[0.02] hover:border-amber-500/30 cursor-pointer transition-all min-h-[280px] flex flex-col items-center justify-center group ${(activeTab === 'servicios' ? isServiceLimitReached : isPlanLimitReached) ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/10 to-amber-600/5 flex items-center justify-center text-amber-400/60 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-500 border border-amber-500/10">
                                <Plus size={30} />
                            </div>
                            <p className="mt-5 font-bold text-muted-foreground/50 group-hover:text-amber-400/80 transition-colors text-base">
                                {activeTab === 'servicios' ? 'Añadir Servicio' : 'Añadir Plan'}
                            </p>
                            <p className="text-[10px] text-muted-foreground/30 mt-1">{activeTab === 'servicios' ? 'Nueva prestación' : 'Nuevo paquete'}</p>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Modal de CRUD */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentService ? (currentService.id ? 'Editar Servicio' : 'Nuevo Servicio') : (currentPlan?.id ? 'Editar Plan' : 'Nuevo Plan')}
            >
                {currentService ? (
                    <form onSubmit={handleSaveService} className="space-y-6">
                        <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/[0.04] space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.04]">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/10">
                                    <Tag className="text-amber-400" size={16} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Información del Servicio</h3>
                                    <p className="text-[9px] text-muted-foreground/50">Define los detalles de la prestación</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Nombre del Servicio</label>
                                    <input
                                        required
                                        value={currentService?.name || ''}
                                        onChange={(e) => setCurrentService({ ...currentService, name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all text-sm font-medium"
                                        placeholder="Ej: Cremación Individual"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Descripción</label>
                                    <textarea
                                        value={currentService?.description || ''}
                                        onChange={(e) => setCurrentService({ ...currentService, description: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all min-h-[80px] text-sm font-medium resize-none"
                                        placeholder="Describe brevemente en qué consiste este servicio..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Precio Venta</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                                        <input
                                            type="number"
                                            required
                                            value={currentService?.price || 0}
                                            onChange={(e) => setCurrentService({ ...currentService, price: Number(e.target.value) })}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-8 pr-4 outline-none focus:border-amber-500/40 transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Costo</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                                        <input
                                            type="number"
                                            required
                                            value={currentService?.cost || 0}
                                            onChange={(e) => setCurrentService({ ...currentService, cost: Number(e.target.value) })}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-8 pr-4 outline-none focus:border-amber-500/40 transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Estado</label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'true', label: 'Activo' },
                                            { value: 'false', label: 'Inactivo' }
                                        ]}
                                        value={currentService?.is_active ? 'true' : 'false'}
                                        onChange={(val) => setCurrentService({ ...currentService, is_active: val === 'true' })}
                                        placeholder="Seleccionar estado..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl hover:bg-white/5 font-bold transition-all text-sm">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-gradient-to-r from-primary to-[#00B377] text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all text-sm flex items-center">
                                {isSaving && <Loader2 className="animate-spin mr-2" size={18} />}
                                {currentService?.id ? 'Guardar Cambios' : 'Crear Servicio'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleSavePlan} className="space-y-6">
                        {/* Section 1: General Information */}
                        <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/[0.04] space-y-5">
                            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.04]">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/10">
                                    <Layers className="text-amber-400" size={16} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Información General</h3>
                                    <p className="text-[9px] text-muted-foreground/50">Datos principales del plan</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div className="md:col-span-3 space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Nombre del Plan</label>
                                    <input
                                        type="text"
                                        required
                                        value={currentPlan?.name || ''}
                                        onChange={(e) => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all text-sm font-medium"
                                        placeholder="Ej: Plan Premium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Estado</label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'true', label: 'Activo' },
                                            { value: 'false', label: 'Inactivo' }
                                        ]}
                                        value={currentPlan?.is_active ? 'true' : 'false'}
                                        onChange={(val) => setCurrentPlan({ ...currentPlan, is_active: val === 'true' })}
                                        placeholder="Seleccionar..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Descripción</label>
                                <textarea
                                    value={currentPlan?.description || ''}
                                    onChange={(e) => setCurrentPlan({ ...currentPlan, description: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all min-h-[60px] max-h-[120px] text-sm font-medium resize-none"
                                    placeholder="Describe brevemente lo que incluye este plan..."
                                />
                            </div>

                            <PlanImageUploader
                                imageUrl={currentPlan?.image_url}
                                onChange={(file) => setSelectedImageFile(file)}
                                onClearUrl={() => setCurrentPlan({ ...currentPlan, image_url: null })}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Precio Venta</label>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                                        <input
                                            type="number"
                                            required
                                            value={currentPlan?.price || 0}
                                            onChange={(e) => setCurrentPlan({ ...currentPlan, price: Number(e.target.value) })}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-8 pr-4 outline-none focus:border-amber-500/40 transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Costo</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const totalSvcCost = services.filter((s: Service) => currentPlan?.service_ids?.includes(s.id)).reduce((acc: number, curr: Service) => acc + (curr.cost || 0), 0);
                                                const totalProdCost = products.filter((p: Product) => currentPlan?.product_ids?.includes(p.id)).reduce((acc: number, curr: Product) => acc + (curr.cost_price || 0), 0);
                                                const totalSvcPrice = services.filter((s: Service) => currentPlan?.service_ids?.includes(s.id)).reduce((acc: number, curr: Service) => acc + (curr.price || 0), 0);
                                                const totalProdPrice = products.filter((p: Product) => currentPlan?.product_ids?.includes(p.id)).reduce((acc: number, curr: Product) => acc + (curr.sale_price || 0), 0);
                                                setCurrentPlan({ ...currentPlan, cost: totalSvcCost + totalProdCost, price: totalSvcPrice + totalProdPrice });
                                            }}
                                            className="text-[9px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors uppercase tracking-wider"
                                        >
                                            <TrendingUp size={11} /> Auto-Calcular
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                                        <input
                                            type="number"
                                            required
                                            value={currentPlan?.cost || 0}
                                            onChange={(e) => setCurrentPlan({ ...currentPlan, cost: Number(e.target.value) })}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-8 pr-4 outline-none focus:border-amber-500/40 transition-all text-sm font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Composition */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Services Column */}
                            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/[0.04] flex flex-col min-h-[280px]">
                                <div className="flex items-center gap-3 pb-3 border-b border-white/[0.04] mb-4">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/10">
                                        <Package className="text-blue-400" size={16} />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Servicios Incluidos</h3>
                                </div>

                                <SearchableSelect
                                    isMulti
                                    options={services.map(s => ({ value: s.id, label: s.name }))}
                                    value={currentPlan?.service_ids || []}
                                    onChange={(val) => setCurrentPlan({ ...currentPlan, service_ids: val })}
                                    placeholder="Agregar servicios..."
                                />

                                <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto max-h-[180px] pr-1 scrollbar-hide">
                                    <AnimatePresence>
                                        {currentPlan?.service_ids?.map(svcId => {
                                            const service = services.find((s: Service) => s.id === svcId);
                                            if (!service) return null;
                                            return (
                                                <motion.div
                                                    key={svcId}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="flex justify-between items-center bg-black/30 px-3.5 py-2.5 rounded-xl border border-white/[0.04] hover:border-blue-500/20 transition-all group/item"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40 shrink-0" />
                                                        <span className="text-xs font-medium text-white/80 truncate">{service.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPlan({ ...currentPlan, service_ids: currentPlan.service_ids?.filter(id => id !== svcId) })}
                                                        className="text-red-500/30 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                    {(currentPlan?.service_ids?.length || 0) === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-8">
                                            <Package size={28} className="mb-2" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Sin servicios</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Products Column */}
                            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/[0.04] flex flex-col min-h-[280px]">
                                <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-500/10">
                                            <Plus className="text-orange-400" size={16} />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Productos</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickProduct(!showQuickProduct)}
                                        className="text-[9px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors uppercase tracking-wider"
                                    >
                                        <Plus size={11} /> {showQuickProduct ? 'Cerrar' : 'Nuevo'}
                                    </button>
                                </div>

                                <SearchableSelect
                                    isMulti
                                    options={products.map((p: Product) => ({ value: p.id, label: p.name }))}
                                    value={currentPlan?.product_ids || []}
                                    onChange={(val) => setCurrentPlan({ ...currentPlan, product_ids: val })}
                                    placeholder="Agregar productos..."
                                />

                                <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto max-h-[180px] pr-1 scrollbar-hide">
                                    <AnimatePresence>
                                        {currentPlan?.product_ids?.map(prodId => {
                                            const product = products.find((p: Product) => p.id === prodId);
                                            if (!product) return null;
                                            return (
                                                <motion.div
                                                    key={prodId}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="flex justify-between items-center bg-black/30 px-3.5 py-2.5 rounded-xl border border-white/[0.04] hover:border-orange-500/20 transition-all group/item"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400/40 shrink-0" />
                                                        <span className="text-xs font-medium text-white/80 truncate">{product.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPlan({ ...currentPlan, product_ids: currentPlan.product_ids?.filter(id => id !== prodId) })}
                                                        className="text-red-500/30 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                    {(currentPlan?.product_ids?.length || 0) === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-8">
                                            <Plus size={28} className="mb-2" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Sin productos</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Product Creation */}
                        <AnimatePresence>
                            {showQuickProduct && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="bg-gradient-to-br from-orange-500/5 to-orange-600/5 border border-orange-500/15 rounded-3xl p-6 space-y-4"
                                >
                                    <div className="flex items-center gap-3 pb-2 border-b border-orange-500/10">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-500/10">
                                            <Plus className="text-orange-400" size={16} />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-400">Creación Rápida de Producto</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-orange-400/60 tracking-wider ml-1">Nombre</label>
                                            <input
                                                value={quickProduct.name}
                                                onChange={(e) => setQuickProduct({ ...quickProduct, name: e.target.value })}
                                                className="w-full bg-black/20 border border-orange-500/20 rounded-2xl py-2.5 px-4 text-sm outline-none focus:border-orange-500/40 text-white font-medium transition-all"
                                                placeholder="Nombre del producto..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-orange-400/60 tracking-wider ml-1">Precio Costo</label>
                                            <input
                                                type="number"
                                                value={quickProduct.cost_price}
                                                onChange={(e) => setQuickProduct({ ...quickProduct, cost_price: Number(e.target.value) })}
                                                className="w-full bg-black/20 border border-orange-500/20 rounded-2xl py-2.5 px-4 text-sm outline-none focus:border-orange-500/40 text-white font-bold transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-orange-400/60 tracking-wider ml-1">Precio Venta</label>
                                            <input
                                                type="number"
                                                value={quickProduct.sale_price}
                                                onChange={(e) => setQuickProduct({ ...quickProduct, sale_price: Number(e.target.value) })}
                                                className="w-full bg-black/20 border border-orange-500/20 rounded-2xl py-2.5 px-4 text-sm outline-none focus:border-orange-500/40 text-white font-bold transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleQuickProductCreate}
                                            disabled={!quickProduct.name || saveProductMutation.isPending}
                                            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md"
                                        >
                                            {saveProductMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                                            Registrar e Incluir
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-end gap-4 pt-4 border-t border-white/[0.04]">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-3.5 rounded-2xl bg-white/5 text-white/70 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/5"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-gradient-to-r from-primary to-[#00B377] text-white px-10 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center"
                            >
                                {isSaving && <Loader2 className="animate-spin mr-3" size={18} />}
                                {currentPlan?.id ? 'Actualizar Plan' : 'Crear Nuevo Plan'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <DeleteConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`¿Eliminar ${itemToDelete?.type === 'service' ? 'Servicio' : 'Plan'}?`}
                description={`Estás a punto de eliminar "${itemToDelete?.name}". Esta acción no se puede deshacer.`}
            />

            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName={modalResource}
            />

            {/* Modal de Catálogo de Planes */}
            <Modal
                isOpen={showPlansCatalogModal}
                onClose={() => setShowPlansCatalogModal(false)}
                title="Catálogo de Planes Comerciales"
                maxWidth="max-w-7xl"
            >
                <div className="space-y-6">
                    {/* Controles del Catálogo */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5">
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer group select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogPlansOnlyActive}
                                    onChange={(e) => setCatalogPlansOnlyActive(e.target.checked)}
                                    className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-amber-500 focus:ring-amber-500/20 focus:ring-offset-0 cursor-pointer transition-all group-hover:border-amber-500/30"
                                />
                                <span className="group-hover:text-amber-400 transition-colors">Solo Activos</span>
                            </label>
                            
                            <label className="flex items-center gap-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer group select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogPlansShowPrices}
                                    onChange={(e) => setCatalogPlansShowPrices(e.target.checked)}
                                    className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-amber-500 focus:ring-amber-500/20 focus:ring-offset-0 cursor-pointer transition-all group-hover:border-amber-500/30"
                                />
                                <span className="group-hover:text-amber-400 transition-colors">Mostrar Precios</span>
                            </label>

                            <label className="flex items-center gap-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer group select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogPlansShowImages}
                                    onChange={(e) => setCatalogPlansShowImages(e.target.checked)}
                                    className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-amber-500 focus:ring-amber-500/20 focus:ring-offset-0 cursor-pointer transition-all group-hover:border-amber-500/30"
                                />
                                <span className="group-hover:text-amber-400 transition-colors">Mostrar Imágenes</span>
                            </label>
                        </div>
                        <div className="shrink-0">
                            <PlansDownloadLink
                                plans={plans.filter((p: any) => !catalogPlansOnlyActive || p.is_active)}
                                showPrices={catalogPlansShowPrices}
                                tenantName={tenantData?.name || 'Catálogo de Planes'}
                                logoUrl={getLogoUrl()}
                                filename={`planes-${tenantData?.name?.toLowerCase().replace(/\s+/g, '-') || 'crematorio'}.pdf`}
                            />
                        </div>
                    </div>

                    {/* Vista Previa del Catálogo de Planes */}
                    <div className="bg-[#0f1117] rounded-3xl border border-white/[0.06] overflow-hidden">
                        {/* Encabezado de la Vista Previa */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-amber-900/30 via-primary/5 to-transparent border-b border-white/[0.06] px-8 py-10">
                            <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
                            <div className="flex items-center gap-6 relative z-10">
                                {getLogoUrl() && (
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-2">
                                        <img
                                            src={getLogoUrl()!}
                                            alt="Logo"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight text-white">
                                        {tenantData?.name || 'Planes Comerciales'}
                                    </h2>
                                    <p className="text-muted-foreground mt-1.5 font-medium">
                                        Dossier informativo de servicios y planes contratables
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                                        {plans.filter((p: any) => !catalogPlansOnlyActive || p.is_active).length} plan(es) • {new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Listado de Planes de la Vista Previa */}
                        <div className="p-8 space-y-6">
                            {plans.filter((p: any) => !catalogPlansOnlyActive || p.is_active).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Layers size={48} className="text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground font-medium">No hay planes para mostrar</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {plans.filter((p: any) => !catalogPlansOnlyActive || p.is_active).map((plan: any) => (
                                        <div
                                            key={plan.id}
                                            className="group bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-[2rem] overflow-hidden flex flex-row hover:border-amber-500/25 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300"
                                        >
                                            {/* Imagen 1:1 cuadrada al costado (si está activada y existe) */}
                                            {catalogPlansShowImages && plan.image_url && (
                                                <div className="relative w-28 sm:w-40 aspect-square shrink-0 overflow-hidden bg-black/40 border-r border-white/5 self-stretch">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={plan.image_url} alt={plan.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                </div>
                                            )}

                                            {/* Información del plan */}
                                            <div className="p-5 space-y-3 flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {(!catalogPlansShowImages || !plan.image_url) && (
                                                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15 shrink-0">
                                                                <Diamond size={16} className="text-amber-400" />
                                                            </div>
                                                        )}
                                                        <h4 className="text-base font-bold text-white leading-tight truncate">{plan.name}</h4>
                                                    </div>
                                                    {catalogPlansShowPrices ? (
                                                        <span className="text-base font-black text-amber-400 shrink-0">
                                                            ${(plan.price || 0).toLocaleString('es-CL')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-muted-foreground bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0">
                                                            Consultar
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                                                    {plan.description || 'Sin descripción detallada.'}
                                                </p>

                                                {/* Composición en Dos Columnas (Servicios y Productos) */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
                                                    {/* Columna de Servicios */}
                                                    <div>
                                                        {plan.services && plan.services.length > 0 ? (
                                                            <div className="space-y-2">
                                                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest font-mono">Servicios incluidos</p>
                                                                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-hide">
                                                                    {plan.services.map((svc: any) => (
                                                                        <div key={svc.id} className="flex items-start gap-2 bg-black/20 border border-white/[0.02] p-2.5 rounded-xl">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 mt-1.5 shrink-0" />
                                                                            <div className="min-w-0">
                                                                                <p className="text-xs font-bold text-white/95">{svc.name}</p>
                                                                                {svc.description && (
                                                                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{svc.description}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-muted-foreground/30 italic">Sin servicios incluidos</div>
                                                        )}
                                                    </div>

                                                    {/* Columna de Productos */}
                                                    <div>
                                                        {plan.products && plan.products.length > 0 ? (
                                                            <div className="space-y-2">
                                                                <p className="text-[9px] font-bold text-orange-400/60 uppercase tracking-widest font-mono">Productos incluidos</p>
                                                                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-hide">
                                                                    {plan.products.map((prod: any) => (
                                                                        <div key={prod.id} className="flex items-start gap-2 bg-black/20 border border-white/[0.02] p-2.5 rounded-xl">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60 mt-1.5 shrink-0" />
                                                                            <div className="min-w-0">
                                                                                <p className="text-xs font-bold text-white/95">{prod.name}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-muted-foreground/30 italic">Sin productos incluidos</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
