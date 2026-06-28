"use client";

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useOrderForm } from '@/hooks/tenant/useOrderForm';
import CancellationModal from '@/components/tenant/CancellationModal';
import ImageCropper from '@/components/tenant/ImageCropper';
import ReplacementConfirmationModal from '@/components/tenant/orders/ReplacementConfirmationModal';
import OrderFormSkeleton from '@/components/tenant/orders/OrderFormSkeleton';
import FormHeader from '@/components/tenant/orders/FormHeader';
import ProfileCard from '@/components/tenant/orders/ProfileCard';
import LogisticsEvidenceCard from '@/components/tenant/orders/LogisticsEvidenceCard';
import FinancialTicketCard from '@/components/tenant/orders/FinancialTicketCard';
// Wizard mode keeps the original split cards
import PatientCard from '@/components/tenant/orders/PatientCard';
import LogisticsCard from '@/components/tenant/orders/LogisticsCard';
import EvidenceCard from '@/components/tenant/orders/EvidenceCard';
import SalesConfigCard from '@/components/tenant/orders/SalesConfigCard';
import OrderSummaryCard from '@/components/tenant/orders/OrderSummaryCard';
import DraftRecoveryBanner from '@/components/tenant/orders/DraftRecoveryBanner';
import QuickTemplates from '@/components/tenant/orders/QuickTemplates';
import ChangeDiffBadge, { getChangedFields } from '@/components/tenant/orders/ChangeDiffBadge';

export default function RegisterServicePage() {
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
    } = useOrderForm();

    // ==========================================
    // Section refs for scroll-to
    // ==========================================
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const handleScrollTo = useCallback((sectionId: string) => {
        const el = sectionRefs.current[sectionId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Brief highlight animation
            el.classList.add('ring-2', 'ring-primary/40');
            setTimeout(() => el.classList.remove('ring-2', 'ring-primary/40'), 1500);
        }
    }, []);

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
            const timer = setTimeout(() => setShowShortcutHint(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    // ==========================================
    // Wizard Mode State (Phase 4)
    // ==========================================
    const [isWizardMode, setIsWizardMode] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

    // ==========================================
    // Loading State — Premium Skeleton
    // ==========================================
    if (loading) {
        return <OrderFormSkeleton />;
    }

    // ==========================================
    // Main Render
    // ==========================================
    return (
        <div className="space-y-10 max-w-6xl mx-auto pb-20 px-4 sm:px-8 xl:px-0">
            <FormHeader
                editId={editId}
                currentCremation={currentCremation}
                sectionStatus={sectionStatus}
                onBack={() => router.back()}
                onScrollTo={handleScrollTo}
            />

            {/* Draft Recovery Banner */}
            {draftPrompt && (
                <DraftRecoveryBanner
                    savedAt={draftPrompt.savedAt}
                    onRestore={restoreDraft}
                    onDiscard={discardDraft}
                />
            )}

            {/* Diff Summary Bar (Edit Mode) */}
            {editId && changedFields.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-2xl px-4 py-3 flex items-center gap-3" role="status">
                    <ChangeDiffBadge field="resumen" originalValue="original" currentValue="modificado" />
                    <span className="text-[10px] font-bold text-yellow-400/70 uppercase tracking-widest">
                        {changedFields.length} campo{changedFields.length > 1 ? 's' : ''} modificado{changedFields.length > 1 ? 's' : ''}
                    </span>
                </div>
            )}

            {/* Quick Templates (New orders only) */}
            {!editId && (
                <QuickTemplates
                    onApply={applyTemplate}
                    disabled={isSaving}
                />
            )}

            {/* Ctrl+S Hint */}
            {showShortcutHint && (
                <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <kbd className="px-1.5 py-0.5 bg-white/10 rounded-md text-white text-[9px] font-mono">Ctrl+S</kbd>
                        para guardar rápido
                    </span>
                </div>
            )}

            {/* Wizard Toggle — Pill Switch */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => {
                        setIsWizardMode(!isWizardMode);
                        setWizardStep(1);
                    }}
                    role="switch"
                    aria-checked={isWizardMode}
                    aria-label="Alternar modo guiado"
                    className="relative inline-flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-full p-1 pr-4 hover:border-white/20 transition-all"
                >
                    <span
                        className={`
                            relative inline-flex w-10 h-6 rounded-full transition-colors duration-300
                            ${isWizardMode ? 'bg-primary' : 'bg-white/10'}
                        `}
                    >
                        <span
                            className={`
                                absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md
                                transition-transform duration-300
                                ${isWizardMode ? 'translate-x-4' : 'translate-x-0'}
                            `}
                        />
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Modo Guiado
                    </span>
                </button>
            </div>

            <form ref={formRef} onSubmit={handleSave} className={isWizardMode ? "max-w-3xl mx-auto space-y-12" : "grid grid-cols-12 gap-8 lg:gap-10"}>
                {isWizardMode ? (
                    <>
                        {/* WIZARD MODE */}
                        {wizardStep === 1 && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                <PatientCard
                                    currentCremation={currentCremation}
                                    petOptions={petOptions}
                                    selectedPet={selectedPet}
                                    relatedCustomer={relatedCustomer}
                                    selectedPartner={selectedPartner}
                                    onPetChange={handlePetChange}
                                    onStatusChange={handleStatusChange}
                                />
                                <EvidenceCard
                                    currentCremation={currentCremation}
                                    setCurrentCremation={setCurrentCremation}
                                    localPreviews={localPreviews}
                                    onImageSelect={handleImageSelect}
                                    onRemoveLocalImage={handleRemoveLocalImage}
                                    onRemoveRemoteImage={handleRemoveRemoteImage}
                                    onSyncImages={syncImagesFromPet}
                                />
                            </div>
                        )}

                        {wizardStep === 2 && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                <LogisticsCard
                                    currentCremation={currentCremation}
                                    setCurrentCremation={setCurrentCremation}
                                    onWeightChange={handleWeightChange}
                                    onSyncAddress={syncAddressFromCustomer}
                                />
                            </div>
                        )}

                        {wizardStep === 3 && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                <SalesConfigCard
                                    services={services}
                                    plans={plans}
                                    products={products}
                                    selectedPlans={selectedPlans}
                                    selectedServices={selectedServices}
                                    selectedProducts={selectedProducts}
                                    onAddPlan={handleAddPlan}
                                    onAddService={handleAddService}
                                    onAddProduct={handleAddProduct}
                                    onUpdateProduct={handleUpdateProduct}
                                    onRemoveProduct={handleRemoveProduct}
                                />
                                <OrderSummaryCard
                                    currentCremation={currentCremation}
                                    setCurrentCremation={setCurrentCremation}
                                    selectedPlans={selectedPlans}
                                    selectedServices={selectedServices}
                                    selectedProducts={selectedProducts}
                                    plans={plans}
                                    grandTotal={grandTotal}
                                    editId={editId}
                                    isSaving={isSaving}
                                    allSectionsComplete={allSectionsComplete}
                                    onUpdatePlanPrice={handleUpdatePlanPrice}
                                    onRemovePlan={handleRemovePlanItem}
                                    onUpdateServicePrice={handleUpdateServicePrice}
                                    onRemoveService={handleRemoveServiceItem}
                                    onBack={() => router.back()}
                                />
                            </div>
                        )}

                        {/* Wizard Navigation */}
                        <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-8">
                            <button
                                type="button"
                                onClick={() => setWizardStep(prev => Math.max(1, prev - 1) as 1 | 2 | 3)}
                                disabled={wizardStep === 1}
                                className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                                Anterior
                            </button>
                            
                            <div className="flex gap-2">
                                {[1, 2, 3].map(step => (
                                    <div key={step} className={`w-2 h-2 rounded-full ${wizardStep === step ? 'bg-primary' : 'bg-white/20'}`} />
                                ))}
                            </div>

                            {wizardStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={() => setWizardStep(prev => Math.min(3, prev + 1) as 1 | 2 | 3)}
                                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:brightness-110 transition-all uppercase tracking-wider shadow-lg shadow-primary/20"
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <div className="w-[100px]" /> /* Spacer to balance the flex-between when button is in OrderSummaryCard */
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* === ORDER CONTROL CENTER (Default Unified View) === */}
                        {/* Left Column 70%: Profiles + Logistics/Evidence */}
                        <div className="col-span-12 lg:col-span-8 space-y-8">
                            <div ref={el => { sectionRefs.current['patient'] = el; }} className="transition-all duration-300 rounded-3xl">
                                <ProfileCard
                                    currentCremation={currentCremation}
                                    petOptions={petOptions}
                                    selectedPet={selectedPet}
                                    relatedCustomer={relatedCustomer}
                                    selectedPartner={selectedPartner}
                                    onPetChange={handlePetChange}
                                    onStatusChange={handleStatusChange}
                                />
                            </div>

                            <div ref={el => { sectionRefs.current['logistics'] = el; }} className="transition-all duration-300 rounded-3xl">
                                <LogisticsEvidenceCard
                                    currentCremation={currentCremation}
                                    setCurrentCremation={setCurrentCremation}
                                    localPreviews={localPreviews}
                                    onWeightChange={handleWeightChange}
                                    onSyncAddress={syncAddressFromCustomer}
                                    onImageSelect={handleImageSelect}
                                    onRemoveLocalImage={handleRemoveLocalImage}
                                    onRemoveRemoteImage={handleRemoveRemoteImage}
                                    onSyncImages={syncImagesFromPet}
                                />
                            </div>
                            {/* Hidden anchor for Evidence/Sales section indicator scroll */}
                            <div ref={el => { sectionRefs.current['evidence'] = el; }} aria-hidden="true" />
                            <div ref={el => { sectionRefs.current['sales'] = el; }} aria-hidden="true" />
                        </div>

                        {/* Right Column 30%: Financial Ticket (sticky) */}
                        <div className="col-span-12 lg:col-span-4">
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
                                onBack={() => router.back()}
                            />
                        </div>
                    </>
                )}
            </form>

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
        </div>
    );
}
