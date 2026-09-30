"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Package,
    Plus,
    Loader2,
    X,
    TrendingUp,
    Layers,
    AlertTriangle,
    ChevronUp,
    ChevronDown,
    Star,
    Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useCatalogPlans,
    useCatalogServices,
    useCatalogProducts,
    useSavePlan,
    useSaveProduct,
    type Plan,
    type Service,
    type Product
} from '@/hooks/useCatalog';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import PlanImageUploader from '@/components/tenant/catalog/PlanImageUploader';
import { apiRequest } from '@/lib/tenant/api';

export default function EditPlanPage() {
    const { id } = useParams();
    const router = useRouter();
    const { showToast } = useToast();

    const isNew = id === 'nuevo';
    const { data: plans = [], isLoading: loadingPlans } = useCatalogPlans();
    const { data: services = [] } = useCatalogServices();
    const { data: products = [] } = useCatalogProducts();

    const savePlanMutation = useSavePlan();
    const saveProductMutation = useSaveProduct();

    const [currentPlan, setCurrentPlan] = useState<Partial<Plan> | null>(isNew ? { name: '', description: '', price: 0, cost: 0, is_active: true, is_featured: false, price_label: '', sort_order: 0, service_ids: [], optional_service_ids: [], product_ids: [] } : null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showQuickProduct, setShowQuickProduct] = useState(false);
    const [quickProduct, setQuickProduct] = useState({ name: '', cost_price: 0, sale_price: 0 });
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (isNew) return;
        if (!loadingPlans && plans.length > 0 && id) {
            const plan = plans.find((p: Plan) => p.id === Number(id));
            if (plan) {
                setCurrentPlan({
                    ...plan,
                    service_ids: plan.services?.map(s => s.id) || [],
                    optional_service_ids: plan.optional_service_ids || [],
                    product_ids: plan.products?.map(p => p.id) || [],
                });
            } else {
                setNotFound(true);
            }
        }
    }, [plans, loadingPlans, id, isNew]);

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isNew && !currentPlan?.id) return;
        setIsSaving(true);
        try {
            let finalImageUrl = currentPlan?.image_url;

            // Si hay un archivo local seleccionado y recortado, lo subimos ahora
            if (selectedImageFile) {
                const formData = new FormData();
                formData.append('file', selectedImageFile);
                const uploadRes = await apiRequest('/api/internal/plans/upload-image', {
                    method: 'POST',
                    body: formData,
                });
                finalImageUrl = uploadRes.image_url;
            }

            const planToSave = {
                ...currentPlan,
                image_url: finalImageUrl
            };

            await savePlanMutation.mutateAsync({
                isEdit: !isNew,
                plan: planToSave || {}
            });
            showToast(isNew ? 'Plan creado con éxito' : 'Plan actualizado con éxito', 'success');
            router.push('/dashboard/gestion-servicios');
        } catch (err: any) {
            showToast(err.message || 'Error al guardar el plan', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Orden de los servicios = orden en que se muestran en el catálogo público
    const moveService = (index: number, delta: number) => {
        const ids = [...(currentPlan?.service_ids || [])];
        const target = index + delta;
        if (target < 0 || target >= ids.length) return;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        setCurrentPlan({ ...currentPlan, service_ids: ids });
    };

    const toggleOptional = (svcId: number) => {
        const current = currentPlan?.optional_service_ids || [];
        const optional_service_ids = current.includes(svcId)
            ? current.filter(id => id !== svcId)
            : [...current, svcId];
        setCurrentPlan({ ...currentPlan, optional_service_ids });
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

    if (!isNew && loadingPlans) {
        return (
            <div className="h-64 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-amber-500" size={40} />
                <p className="text-muted-foreground font-medium">Cargando plan...</p>
            </div>
        );
    }

    if (!isNew && (notFound || !currentPlan)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/10 flex items-center justify-center mb-6">
                    <AlertTriangle size={36} className="text-red-400/60" />
                </div>
                <h3 className="text-xl font-bold mb-2">Plan no encontrado</h3>
                <p className="text-muted-foreground max-w-md mb-6">El plan que buscas no existe o ha sido eliminado.</p>
                <button
                    onClick={() => router.push('/dashboard/gestion-servicios')}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3 px-7 rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all text-sm"
                >
                    <ArrowLeft className="inline mr-2" size={16} />
                    Volver a Servicios
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/gestion-servicios')}
                        className="p-2.5 rounded-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-amber-500/25 text-muted-foreground hover:text-amber-400 transition-all"
                        title="Volver"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">{isNew ? 'Nuevo Plan' : 'Editar Plan'}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{isNew ? 'Crea un nuevo paquete de servicios y productos' : currentPlan?.name}</p>
                    </div>
                </div>
            </div>

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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Form Details */}
                        <div className="lg:col-span-2 space-y-5">
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
                                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all min-h-[70px] max-h-[140px] text-sm font-medium resize-none"
                                    placeholder="Describe brevemente lo que incluye este plan..."
                                />
                            </div>

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

                        {/* Right Column: Image Uploader inside a beautiful frame */}
                        <div className="flex flex-col items-center justify-center bg-black/10 rounded-2xl p-5 border border-white/[0.04]">
                            <PlanImageUploader
                                imageUrl={currentPlan?.image_url}
                                onChange={(file) => setSelectedImageFile(file)}
                                onClearUrl={() => setCurrentPlan({ ...currentPlan, image_url: null })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Catalog presentation */}
                <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/[0.04] space-y-5">
                    <div className="flex items-center gap-3 pb-3 border-b border-white/[0.04]">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/10">
                            <Store className="text-amber-400" size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">Catálogo Online</h3>
                            <p className="text-[9px] text-muted-foreground/50">Cómo se muestra este plan a las familias</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Texto de precio</label>
                            <input
                                type="text"
                                maxLength={60}
                                value={currentPlan?.price_label || ''}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, price_label: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all text-sm font-medium"
                                placeholder="Ej: Valores según peso · Mascotas < 1 kg"
                            />
                            <p className="text-[10px] text-muted-foreground/60 ml-1">
                                Reemplaza al precio en el catálogo. Vacío: se muestra el precio de venta, o &quot;Valor según peso&quot; si es $0.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Posición</label>
                            <input
                                type="number"
                                min={0}
                                value={currentPlan?.sort_order ?? 0}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, sort_order: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all text-sm font-bold"
                            />
                            <p className="text-[10px] text-muted-foreground/60 ml-1">Menor = aparece primero. Empates: por precio.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Destacado</label>
                            <button
                                type="button"
                                onClick={() => setCurrentPlan({ ...currentPlan, is_featured: !currentPlan?.is_featured })}
                                className={`w-full rounded-2xl py-3 px-4 border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                    currentPlan?.is_featured
                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                        : 'bg-black/20 border-white/10 text-muted-foreground hover:border-amber-500/30'
                                }`}
                            >
                                <Star size={15} className={currentPlan?.is_featured ? 'fill-amber-400 text-amber-400' : ''} />
                                {currentPlan?.is_featured ? 'Más solicitado' : 'No destacado'}
                            </button>
                            <p className="text-[10px] text-muted-foreground/60 ml-1">Solo un plan a la vez; marcar este desmarca el anterior.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Importante (opcional)</label>
                        <input
                            type="text"
                            maxLength={200}
                            value={currentPlan?.important_note || ''}
                            onChange={(e) => setCurrentPlan({ ...currentPlan, important_note: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-amber-500/40 transition-all text-sm font-medium"
                            placeholder="Ej: Exclusivo para mascotas de menos de 1 kg (aves, roedores, exóticos)"
                        />
                        <p className="text-[10px] text-muted-foreground/60 ml-1">Aviso destacado en la tarjeta del plan. Vacío: no se muestra.</p>
                    </div>
                </div>

                {/* Section 2: Composition */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Services Column - 60% */}
                    <div className="md:col-span-3 bg-white/[0.03] rounded-3xl p-6 border border-white/[0.04] flex flex-col min-h-[280px]">
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

                        {(currentPlan?.service_ids?.length || 0) > 1 && (
                            <p className="mt-3 text-[10px] text-muted-foreground/60">Usa las flechas para definir el orden en el catálogo. Marca como &quot;Opcional&quot; los extras que no vienen incluidos.</p>
                        )}

                        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto max-h-[320px] pr-1 scrollbar-hide">
                            <AnimatePresence>
                                {currentPlan?.service_ids?.map((svcId, index) => {
                                    const service = services.find((s: Service) => s.id === svcId);
                                    if (!service) return null;
                                    const isOptional = currentPlan?.optional_service_ids?.includes(svcId);
                                    const total = currentPlan?.service_ids?.length || 0;
                                    return (
                                        <motion.div
                                            key={svcId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="flex justify-between items-center bg-black/30 px-3.5 py-2.5 rounded-xl border border-white/[0.04] hover:border-blue-500/20 transition-all group/item"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="flex flex-col shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveService(index, -1)}
                                                        disabled={index === 0}
                                                        className="text-muted-foreground/50 hover:text-blue-300 disabled:opacity-20 disabled:hover:text-muted-foreground/50 transition-colors"
                                                        title="Subir"
                                                    >
                                                        <ChevronUp size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveService(index, 1)}
                                                        disabled={index === total - 1}
                                                        className="text-muted-foreground/50 hover:text-blue-300 disabled:opacity-20 disabled:hover:text-muted-foreground/50 transition-colors"
                                                        title="Bajar"
                                                    >
                                                        <ChevronDown size={13} />
                                                    </button>
                                                </div>
                                                <span className={`text-xs font-medium truncate ${isOptional ? 'text-white/50' : 'text-white/80'}`}>{service.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleOptional(svcId)}
                                                    className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                                                        isOptional
                                                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                            : 'border-white/10 text-muted-foreground/60 hover:text-amber-300 hover:border-amber-500/30'
                                                    }`}
                                                    title="Marcar como extra opcional (no incluido en el plan)"
                                                >
                                                    {isOptional ? 'Opcional' : 'Incluido'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPlan({
                                                        ...currentPlan,
                                                        service_ids: currentPlan.service_ids?.filter(id => id !== svcId),
                                                        optional_service_ids: currentPlan.optional_service_ids?.filter(id => id !== svcId),
                                                    })}
                                                    className="text-red-500/30 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
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

                    {/* Products Column - 40% */}
                    <div className="md:col-span-2 bg-white/[0.03] rounded-3xl p-6 border border-white/[0.04] flex flex-col min-h-[280px]">
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

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t border-white/[0.04]">
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/gestion-servicios')}
                        className="px-8 py-3.5 rounded-2xl bg-white/5 text-white/70 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/5 flex items-center gap-2"
                    >
                        <ArrowLeft size={14} />
                        Volver
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-gradient-to-r from-primary to-[#00B377] text-white px-10 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={16} />}
                        {isSaving ? 'Guardando...' : isNew ? 'Crear Plan' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}
