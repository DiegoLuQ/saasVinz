"use client";

import React, { useEffect, useState } from 'react';
import { useOrderForm } from '@/hooks/tenant/useOrderForm';
import CancellationModal from '@/components/tenant/CancellationModal';
import ImageCropper from '@/components/tenant/ImageCropper';
import ReplacementConfirmationModal from '@/components/tenant/orders/ReplacementConfirmationModal';
import OrderFormSkeleton from '@/components/tenant/orders/OrderFormSkeleton';
import ProfileCard from '@/components/tenant/orders/ProfileCard';
import LogisticsCard from '@/components/tenant/orders/LogisticsCard';
import EvidenceCard from '@/components/tenant/orders/EvidenceCard';
import FinancialTicketCard from '@/components/tenant/orders/FinancialTicketCard';
import DraftRecoveryBanner from '@/components/tenant/orders/DraftRecoveryBanner';
import QuickTemplates from '@/components/tenant/orders/QuickTemplates';
import ChangeDiffBadge, { getChangedFields } from '@/components/tenant/orders/ChangeDiffBadge';
import QuickPetModal from '@/components/tenant/crm/QuickPetModal';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { statusLabels, statusColors } from '@/lib/tenant/orders/types';
import { ArrowLeft, PawPrint, Truck, Camera, Receipt, Loader2, ChevronRight, ChevronLeft, Check, Sparkles, Activity, Share2, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { copyToClipboard } from '@/lib/clipboard';
import { buildTrackingUrl } from '@/lib/publicUrls';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';

type TabId = 'angelito' | 'logistica' | 'evidencia' | 'comercial';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'angelito', label: 'Angelito', icon: <PawPrint size={16} /> },
    { id: 'logistica', label: 'Logística', icon: <Truck size={16} /> },
    { id: 'evidencia', label: 'Evidencia', icon: <Camera size={16} /> },
    { id: 'comercial', label: 'Comercial', icon: <Receipt size={16} /> },
];

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export default function RegisterServicePage() {
    // ==========================================
    // Post-Save Destination Modal State
    // ==========================================
    const { showToast } = useToast();
    const currentTenant = useCurrentTenant();
    const [savedOrderInfo, setSavedOrderInfo] = useState<{
        id: number;
        verification_code?: string;
        pet_name?: string;
        customer_name?: string;
        customer_phone?: string;
    } | null>(null);

    const {
        // Route
        editId,
        router,

        // Loading
        loading,
        isSaving,

        // Catalog data
        services,
        plans,
        products,

        // Memoized lookups
        selectedPet,
        relatedCustomer,
        selectedPartner,
        petOptions,

        // Form state
        currentCremation,
        setCurrentCremation,
        selectedServices,
        selectedPlans,
        selectedProducts,
        localPreviews,
        showCancelModal,
        setShowCancelModal,
        tempStatus,
        setTempStatus,
        showCropper,
        setShowCropper,
        cropSource,
        setCropSource,

        // Validation & dirty
        sectionStatus,
        allSectionsComplete,

        // Phase 4: Auto-Draft
        draftPrompt,
        restoreDraft,
        discardDraft,
        formRef,

        // Phase 4: Templates
        applyTemplate,

        // Phase 4: Diff tracking
        originalCremation,

        // Computed
        grandTotal,

        // Handlers
        handleStatusChange,
        handleConfirmCancel,
        handlePetChange,
        syncAddressFromCustomer,
        syncImagesFromPet,
        handleImageSelect,
        handleCropComplete,
        handleRemoveLocalImage,
        handleRemoveRemoteImage,
        handleAddProduct,
        handleRemoveProduct,
        handleUpdateProduct,
        handleAddService,
        handleRemoveServiceItem,
        handleUpdateServicePrice,
        handleSetPrincipalService,
        handleAddPlan,
        handleRemovePlanItem,
        handleUpdatePlanPrice,
        handleSetPrincipalPlan,
        handleWeightChange,
        handleSave,
        replacementPending,
        setReplacementPending,
    } = useOrderForm({
        redirectAfterSave: false,
        onSaveSuccess: (result) => {
            // Guardamos información para el modal de destino
            setSavedOrderInfo({
                id: result?.id || 0,
                verification_code: result?.verification_code || currentCremation?.verification_code,
                pet_name: selectedPet?.name || 'Angelito',
                customer_name: relatedCustomer?.name || '',
                customer_phone: relatedCustomer?.phone || '',
            });
        }
    });

    // ==========================================
    // Tab State
    // ==========================================
    const [activeTab, setActiveTab] = useState<TabId>('angelito');

    // ==========================================
    // Quick Pet Modal State
    // ==========================================
    const [isQuickPetModalOpen, setIsQuickPetModalOpen] = useState(false);

    // ==========================================
    // Diff tracking for edit mode
    // ==========================================
    const changedFields = editId && originalCremation
        ? getChangedFields(originalCremation, currentCremation)
        : [];

    // ==========================================
    // Ctrl+S hint (shown briefly on first load)
    // ==========================================
    const [showShortcutHint, setShowShortcutHint] = useState(false);
    useEffect(() => {
        if (!loading) {
            setShowShortcutHint(true);
            const timer = setTimeout(() => setShowShortcutHint(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    // ==========================================
    // Loading State — Premium Skeleton
    // ==========================================
    if (loading) {
        return <OrderFormSkeleton />;
    }

    // ==========================================
    // Section completeness for tab badges
    // ==========================================
    const sectionEntries = Object.entries(sectionStatus);
    const completedCount = sectionEntries.filter(([, s]) => s.complete).length;
    const totalCount = sectionEntries.length;

    // ==========================================
    // Main Render
    // ==========================================
    return (
        <div className="max-w-7xl mx-auto pb-20 px-4 sm:px-6 xl:px-0">
            {/* ======================================== */}
            {/* COMPACT HEADER                            */}
            {/* ======================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/[0.08] transition-all"
                        aria-label="Volver a la lista"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white leading-none">
                            {editId ? 'Editar Orden' : 'Nueva Orden'}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {editId
                                ? 'Gestiona los detalles de esta orden de servicio'
                                : 'Configura una nueva orden de servicio'}
                        </p>
                    </div>
                </div>

                {/* Quick info chips */}
                <div className="flex items-center gap-2 flex-wrap">
                    {currentCremation?.oc_number && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[10px] font-black text-white uppercase tracking-wider">
                            OC #{String(currentCremation.oc_number).padStart(4, '0')}
                        </span>
                    )}
                    {currentCremation?.verification_code && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-black text-primary uppercase tracking-widest font-mono">
                            {currentCremation.verification_code}
                        </span>
                    )}
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusColors[currentCremation?.status || 'pendiente'] || 'bg-gray-500/10 text-gray-400'}`}>
                        {statusLabels[currentCremation?.status || 'pendiente']}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        {completedCount}/{totalCount}
                    </span>
                </div>
            </div>

            {/* Draft Recovery Banner */}
            {draftPrompt && (
                <div className="mb-4">
                    <DraftRecoveryBanner
                        savedAt={draftPrompt.savedAt}
                        onRestore={restoreDraft}
                        onDiscard={discardDraft}
                    />
                </div>
            )}

            {/* Diff Summary Bar (Edit Mode) */}
            {editId && changedFields.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-4 py-2.5 flex items-center gap-3 mb-4" role="status">
                    <ChangeDiffBadge field="resumen" originalValue="original" currentValue="modificado" />
                    <span className="text-[10px] font-bold text-yellow-400/70 uppercase tracking-widest">
                        {changedFields.length} campo{changedFields.length > 1 ? 's' : ''} modificado{changedFields.length > 1 ? 's' : ''}
                    </span>
                </div>
            )}

            {/* Quick Templates (New orders only) */}
            {!editId && (
                <div className="mb-4">
                    <QuickTemplates onApply={applyTemplate} disabled={isSaving} />
                </div>
            )}

            {/* Ctrl+S Hint */}
            {showShortcutHint && (
                <div className="text-center mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded-md text-white text-[9px] font-mono">Ctrl+S</kbd>
                        para guardar rápido
                    </span>
                </div>
            )}

            {/* ======================================== */}
            {/* MAIN LAYOUT: Sidebar Tabs + Content      */}
            {/* ======================================== */}
            <form ref={formRef} onSubmit={handleSave} className="flex flex-col lg:flex-row gap-6">
                {/* ---- LEFT SIDEBAR: Tabs + Mini Summary ---- */}
                <aside className="lg:w-64 shrink-0">
                    <div className="lg:sticky lg:top-6 space-y-4">
                        {/* Tab Navigation */}
                        <nav className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden" aria-label="Secciones de la orden">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-l-2
                                            ${isActive
                                                ? 'bg-primary/10 border-l-primary text-white'
                                                : 'border-l-transparent text-muted-foreground hover:text-white hover:bg-white/[0.03]'
                                            }
                                        `}
                                        aria-selected={isActive}
                                        role="tab"
                                    >
                                        <span className={`shrink-0 ${isActive ? 'text-primary' : ''}`}>
                                            {tab.icon}
                                        </span>
                                        <span className="text-xs font-bold uppercase tracking-wider flex-1">
                                            {tab.label}
                                        </span>
                                        {isActive && (
                                            <ChevronRight size={14} className="text-primary/60" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Mini Financial Summary — always visible */}
                        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                            <div className="text-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.22em] mb-1">Total a Pagar</p>
                                <p className="text-2xl font-black text-white tracking-tight font-mono">
                                    {CLP.format(grandTotal)}
                                </p>
                            </div>

                            {/* Quick stats */}
                            <div className="flex justify-between text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                <span>{selectedPlans.length} plan{selectedPlans.length !== 1 ? 'es' : ''}</span>
                                <span>{selectedServices.length} serv.</span>
                                <span>{selectedProducts.length} prod.</span>
                            </div>

                            {/* Discount inline */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Dcto %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentCremation?.discount || 0}
                                    onChange={(e) => setCurrentCremation(prev => ({ ...prev, discount: Number(e.target.value) }))}
                                    className="w-14 h-7 bg-black/20 border border-white/[0.08] rounded-lg px-2 text-right text-[10px] font-black text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                                />
                            </div>

                            {/* Actions */}
                            <div className="space-y-2 pt-2">
                                {activeTab === 'comercial' || allSectionsComplete ? (
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className={`
                                            w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-[0.18em]
                                            transition-all active:scale-[0.97] flex items-center justify-center gap-2
                                            ${allSectionsComplete
                                                ? 'bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20'
                                                : 'bg-primary/40 text-white/70 cursor-default'
                                            }
                                            disabled:opacity-50
                                        `}
                                        title={!allSectionsComplete ? 'Completa todas las secciones para confirmar la orden' : undefined}
                                    >
                                        {isSaving && <Loader2 className="animate-spin" size={14} />}
                                        {editId ? 'Actualizar Orden' : 'Confirmar Orden'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextTab: Record<TabId, TabId> = {
                                                angelito: 'logistica',
                                                logistica: 'evidencia',
                                                evidencia: 'comercial',
                                                comercial: 'comercial',
                                            };
                                            setActiveTab(nextTab[activeTab]);
                                        }}
                                        className="w-full h-11 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-black uppercase text-[10px] tracking-[0.18em] transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <span>Continuar al Siguiente Paso</span>
                                        <ChevronRight size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="w-full h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-muted-foreground font-bold uppercase text-[9px] tracking-[0.18em] hover:bg-white/[0.08] hover:text-white transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ---- RIGHT PANEL: Active Tab Content ---- */}
                <main className="flex-1 min-w-0">
                    <div className="animate-in fade-in duration-300">
                        {/* TAB: Angelito */}
                        {activeTab === 'angelito' && (
                            <div key="tab-angelito" className="space-y-6">
                                <ProfileCard
                                    currentCremation={currentCremation}
                                    petOptions={petOptions}
                                    selectedPet={selectedPet}
                                    relatedCustomer={relatedCustomer}
                                    selectedPartner={selectedPartner}
                                    onPetChange={handlePetChange}
                                    onStatusChange={handleStatusChange}
                                    onNewPetClick={() => setIsQuickPetModalOpen(true)}
                                />
                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('logistica')}
                                        className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        <span>Siguiente: Logística</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB: Logística */}
                        {activeTab === 'logistica' && (
                            <div key="tab-logistica" className="space-y-6">
                                <LogisticsCard
                                    currentCremation={currentCremation}
                                    setCurrentCremation={setCurrentCremation}
                                    onWeightChange={handleWeightChange}
                                    onSyncAddress={syncAddressFromCustomer}
                                />
                                <div className="flex justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('angelito')}
                                        className="h-12 px-5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white font-bold uppercase text-xs tracking-wider flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <ChevronLeft size={16} />
                                        <span>Anterior: Angelito</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('evidencia')}
                                        className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        <span>Siguiente: Evidencia</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB: Evidencia */}
                        {activeTab === 'evidencia' && (
                            <div key="tab-evidencia" className="space-y-6">
                                <EvidenceCard
                                    currentCremation={currentCremation}
                                    setCurrentCremation={setCurrentCremation}
                                    localPreviews={localPreviews}
                                    onImageSelect={handleImageSelect}
                                    onRemoveLocalImage={handleRemoveLocalImage}
                                    onRemoveRemoteImage={handleRemoveRemoteImage}
                                    onSyncImages={syncImagesFromPet}
                                />
                                <div className="flex justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('logistica')}
                                        className="h-12 px-5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-white font-bold uppercase text-xs tracking-wider flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <ChevronLeft size={16} />
                                        <span>Anterior: Logística</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('comercial')}
                                        className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        <span>Siguiente: Comercial y Cobro</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB: Comercial */}
                        {activeTab === 'comercial' && (
                            <div key="tab-comercial" className="space-y-6">
                                <FinancialTicketCard
                                    services={services}
                                    plans={plans}
                                    products={products}
                                    selectedPlans={selectedPlans}
                                    selectedServices={selectedServices}
                                    selectedProducts={selectedProducts}
                                    currentCremation={currentCremation}
                                    setCurrentCremation={setCurrentCremation}
                                    grandTotal={grandTotal}
                                    editId={editId}
                                    isSaving={isSaving}
                                    allSectionsComplete={allSectionsComplete}
                                    onAddPlan={handleAddPlan}
                                    onAddService={handleAddService}
                                    onAddProduct={handleAddProduct}
                                    onUpdateProduct={handleUpdateProduct}
                                    onRemoveProduct={handleRemoveProduct}
                                    onUpdatePlanPrice={handleUpdatePlanPrice}
                                    onRemovePlan={handleRemovePlanItem}
                                    onSetPrincipalPlan={handleSetPrincipalPlan}
                                    onUpdateServicePrice={handleUpdateServicePrice}
                                    onRemoveService={handleRemoveServiceItem}
                                    onSetPrincipalService={handleSetPrincipalService}
                                    onBack={() => setActiveTab('evidencia')}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </form>

            {/* Quick Pet Modal */}
            <QuickPetModal
                isOpen={isQuickPetModalOpen}
                onClose={() => setIsQuickPetModalOpen(false)}
                onPetCreated={(newPet) => {
                    handlePetChange(newPet.id);
                }}
            />

            {/* Modals */}
            <CancellationModal
                isOpen={showCancelModal}
                onClose={() => {
                    setShowCancelModal(false);
                    setTempStatus(null);
                }}
                onConfirm={handleConfirmCancel}
                orderId={editId ? Number(editId) : 0}
            />

            {replacementPending && (
                <ReplacementConfirmationModal
                    isOpen={!!replacementPending}
                    onClose={() => setReplacementPending(null)}
                    onConfirm={replacementPending.onConfirm}
                    type={replacementPending.type}
                    currentName={replacementPending.currentName}
                    newName={replacementPending.newName}
                    isConflict={replacementPending.isConflict}
                    conflictMessage={replacementPending.conflictMessage}
                    customLabels={replacementPending.customLabels}
                />
            )}

            {showCropper && cropSource && (
                <ImageCropper
                    image={cropSource}
                    aspect={1}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(false);
                        setCropSource(null);
                    }}
                    title="Recortar Foto de Orden (1:1)"
                />
            )}

            {/* ========================================== */}
            {/* Modal de Éxito y Selección de Destino      */}
            {/* ========================================== */}
            <Modal
                isOpen={!!savedOrderInfo}
                onClose={() => {
                    // Por defecto, si cierran el modal van a recepción y pedidos
                    router.push('/dashboard/recepcion-pedidos');
                }}
                title=""
                maxWidth="max-w-lg"
            >
                {savedOrderInfo && (
                    <div className="space-y-6 text-center py-2">
                        {/* Icono animado de éxito */}
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 to-primary/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                            <Check className="w-8 h-8" />
                        </div>

                        {/* Título y datos del angelito */}
                        <div>
                            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                {editId ? 'Orden Actualizada' : '¡Orden Creada con Éxito!'}
                            </span>
                            <h2 className="text-2xl font-black text-white tracking-tight mt-3">
                                {savedOrderInfo.pet_name}
                            </h2>
                            {savedOrderInfo.verification_code && (
                                <div className="mt-2 flex items-center justify-center gap-2">
                                    <span className="text-xs text-muted-foreground font-mono">Código de Tracking:</span>
                                    <span className="text-sm font-black font-mono text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg">
                                        {savedOrderInfo.verification_code}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Pregunta de destino */}
                        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-left space-y-3">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
                                ¿Qué deseas hacer a continuación?
                            </p>

                            {/* Opción 1: Panel de Trabajo / Operaciones y Tracking */}
                            <button
                                type="button"
                                onClick={() => {
                                    const codeParam = savedOrderInfo.verification_code || String(savedOrderInfo.id);
                                    router.push(`/dashboard/operaciones/lista?openTracking=${encodeURIComponent(codeParam)}`);
                                }}
                                className="w-full p-4 rounded-xl bg-primary hover:brightness-110 text-white flex items-center justify-between group transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3.5 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-wider">
                                            Ir al Panel de Trabajo (Tracking)
                                        </div>
                                        <div className="text-[11px] text-white/80 font-normal">
                                            Abrir el seguimiento operativo para subir fotos y registrar fases en planta.
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
                            </button>

                            {/* Opción 2: Quedarse en Recepción y Pedidos */}
                            <button
                                type="button"
                                onClick={() => {
                                    router.push('/dashboard/recepcion-pedidos');
                                }}
                                className="w-full p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 text-white flex items-center justify-between group transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3.5 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-muted-foreground group-hover:text-white shrink-0">
                                        <Receipt size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-white">
                                            Volver a Recepción y Pedidos
                                        </div>
                                        <div className="text-[11px] text-muted-foreground font-normal">
                                            Ver el tablero general de ventas, cobros y registrar otros servicios.
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-transform shrink-0" />
                            </button>
                        </div>

                        {/* Acciones Rápidas: Copiar link familiar / WhatsApp */}
                        {savedOrderInfo.verification_code && (
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const trackingUrl = buildTrackingUrl(
                                            currentTenant?.slug || 'demo',
                                            savedOrderInfo.pet_name || 'angelito',
                                            savedOrderInfo.verification_code!
                                        );
                                        const ok = await copyToClipboard(trackingUrl);
                                        if (ok) {
                                            showToast('Link de tracking copiado al portapapeles', 'success');
                                        }
                                    }}
                                    className="flex-1 h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-muted-foreground hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Copy size={14} />
                                    <span>Copiar Link Familiar</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const trackingUrl = buildTrackingUrl(
                                            currentTenant?.slug || 'demo',
                                            savedOrderInfo.pet_name || 'angelito',
                                            savedOrderInfo.verification_code!
                                        );
                                        const message = encodeURIComponent(
                                            `Hola ${savedOrderInfo.customer_name || ''}, puedes seguir el proceso y homenaje de ${savedOrderInfo.pet_name} aquí: ${trackingUrl}`
                                        );
                                        const phoneClean = (savedOrderInfo.customer_phone || '').replace(/\D/g, '');
                                        const waUrl = phoneClean
                                            ? `https://wa.me/${phoneClean}?text=${message}`
                                            : `https://api.whatsapp.com/send?text=${message}`;
                                        window.open(waUrl, '_blank');
                                    }}
                                    className="flex-1 h-10 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <MessageCircle size={14} />
                                    <span>Enviar WhatsApp</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
