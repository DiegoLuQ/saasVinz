"use client";

import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, Receipt, Package, Sparkles, Layers, Building2, Percent, Handshake, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SalesCatalogDrawer from '@/components/tenant/orders/SalesCatalogDrawer';
import ReceiptPreviewModal from '@/components/tenant/orders/ReceiptPreviewModal';
import { API_URL } from '@/lib/tenant/api';
import type { Cremation, Service, Plan, Product, SelectedProduct, SelectedService, SelectedPlan } from '@/lib/tenant/orders/types';
import { describeTerms, type AgreementOption, type AgreementTerms, type AgreementBreakdown } from '@/lib/tenant/orders/agreements';
import { transportLabel } from '@/lib/transport';

interface FinancialTicketCardProps {
    // Catalog
    services: Service[];
    plans: Plan[];
    products: Product[];
    partners?: any[];
    onNewPartnerClick?: () => void;
    // Convenios con empresas (descuento al cliente; distinto de la veterinaria)
    agreements?: AgreementOption[];
    agreementTerms?: AgreementTerms | null;
    agreementBreakdown?: AgreementBreakdown;
    showAgreements?: boolean;

    // Selection state
    selectedPlans: SelectedPlan[];
    selectedServices: SelectedService[];
    selectedProducts: SelectedProduct[];

    // Order state
    currentCremation: Partial<Cremation>;
    setCurrentCremation: React.Dispatch<React.SetStateAction<Partial<Cremation>>>;

    // Computed
    grandTotal: number;

    // Mode
    editId: string | null;
    isSaving: boolean;
    allSectionsComplete: boolean;

    // Handlers
    onAddPlan: (planId: number) => void;
    onAddService: (serviceId: number) => void;
    onAddProduct: (productId: string) => void;
    /** Cambia el ánfora incluida en el plan (línea `index`) por otro producto. */
    onSwapProduct?: (index: number, productId: number) => void;
    /** Precio por plan y peso: sin recargo aparte (el peso va en el precio del plan) */
    weightPriceTable?: boolean;
    onUpdateProduct:(index: number, field: keyof SelectedProduct, value: number) => void;
    onRemoveProduct: (index: number) => void;
    onUpdatePlanPrice: (index: number, price: number) => void;
    onRemovePlan: (index: number) => void;
    onSetPrincipalPlan: (index: number) => void;
    onUpdateServicePrice: (index: number, price: number) => void;
    onRemoveService: (index: number) => void;
    onSetPrincipalService: (index: number) => void;

    onBack: () => void;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

// Compact ticket-style price input
function PriceCell({ value, onChange, accentClass = 'text-foreground' }: { value: number; onChange: (v: number) => void; accentClass?: string }) {
    return (
        <div className="bg-background border border-border rounded-lg px-2 py-1 flex items-center gap-0.5 shrink-0 shadow-sm focus-within:ring-2 focus-within:ring-primary/40">
            <span className="text-[10px] text-muted-foreground font-mono font-bold">$</span>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={`w-18 bg-transparent text-right text-xs font-extrabold outline-none p-0 font-mono ${accentClass}`}
            />
        </div>
    );
}

export default function FinancialTicketCard({
    services,
    plans,
    products,
    partners = [],
    onNewPartnerClick,
    agreements = [],
    agreementTerms = null,
    agreementBreakdown,
    showAgreements = true,
    selectedPlans,
    selectedServices,
    selectedProducts,
    currentCremation,
    setCurrentCremation,
    grandTotal,
    editId,
    isSaving,
    allSectionsComplete,
    onAddPlan,
    onAddService,
    onAddProduct,
    onSwapProduct,
    weightPriceTable = false,
    onUpdateProduct,
    onRemoveProduct,
    onUpdatePlanPrice,
    onRemovePlan,
    onSetPrincipalPlan,
    onUpdateServicePrice,
    onRemoveService,
    onSetPrincipalService,
    onBack,
}: FinancialTicketCardProps) {
    const [drawerType, setDrawerType] = useState<'plan' | 'service' | 'product' | null>(null);
    // Línea del ánfora del plan que se está cambiando (el catálogo de productos elige la nueva).
    const [swapIndex, setSwapIndex] = useState<number | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const productsSubtotal = selectedProducts.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const hasItems = selectedPlans.length > 0 || selectedServices.length > 0 || selectedProducts.length > 0;
    // Servicios «a cotizar» que aún no tienen precio en esta orden
    const pendingQuote = (s: SelectedService) => !s.unit_price && !!services.find(x => x.id === s.service_id)?.price_on_request;
    const pendingQuotes = selectedServices.filter(pendingQuote);
    const discountValue = currentCremation?.discount || 0;

    const currentPartnerId = currentCremation?.partner_link_id || currentCremation?.partner_id;
    const selectedPartnerObj = partners.find(p => (p.id || p.id_partner) === currentPartnerId);
    
    // Calcular comisión estimada
    const partnerCommissionAmount = React.useMemo(() => {
        if (!selectedPartnerObj) return 0;
        const tipo = selectedPartnerObj.tipo_comision || 'porcentaje';
        if (tipo === 'fijo') {
            return selectedPartnerObj.monto_comision || 0;
        }
        const pct = selectedPartnerObj.porcentaje_comision || 0;
        return (grandTotal * pct) / 100;
    }, [selectedPartnerObj, grandTotal]);

    return (
        <div className="lg:sticky lg:top-6 space-y-4">
            {/* === Single dark ticket panel === */}
            <article
                aria-label="Ticket financiero de la orden"
                className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden backdrop-blur-xl"
            >
                {/* Ticket header */}
                <header className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary" aria-hidden="true">
                            <Receipt size={17} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-foreground tracking-tight uppercase">Ticket de Orden</h2>
                            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-[0.18em]">Resumen y configuración</p>
                        </div>
                    </div>
                    {currentCremation?.oc_number && (
                        <span className="text-[10px] font-mono font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                            OC #{String(currentCremation.oc_number).padStart(4, '0')}
                        </span>
                    )}
                </header>

                {/* === Add items section — Compact drawer triggers === */}
                <section className="px-6 py-4 space-y-2 border-b border-dashed border-border/60 bg-background/50">
                    <button
                        type="button"
                        onClick={() => setDrawerType('plan')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                            <Layers size={14} />
                        </div>
                        <span className="text-[10px] font-black text-foreground uppercase tracking-wider flex-1 text-left">Agregar Plan <span className="text-red-500">*</span></span>
                        <Plus size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setDrawerType('service')}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border bg-muted/40 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                                <Sparkles size={12} />
                            </div>
                            <span className="text-[9px] font-black text-foreground/80 uppercase tracking-wider">Servicio</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDrawerType('product')}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border bg-muted/40 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                                <Package size={12} />
                            </div>
                            <span className="text-[9px] font-black text-foreground/80 uppercase tracking-wider">Producto</span>
                        </button>
                    </div>
                </section>

                {/* === Line Items === */}
                <section className="px-6 py-5 space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar">
                    {!hasItems ? (
                        <div className="py-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/[0.06] rounded-2xl">
                            <Receipt className="text-muted-foreground/30 mb-2" size={28} aria-hidden="true" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">Sin items agregados</p>
                            <p className="text-[9px] text-muted-foreground/60 mt-1">Agrega un plan, servicio o producto</p>
                        </div>
                    ) : (
                        <>
                            {/* Plans */}
                            {selectedPlans.map((p, idx) => (
                                <div key={`plan-${idx}`} className="space-y-2">
                                    <div className="flex justify-between items-center group gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Layers size={11} className="text-primary shrink-0" aria-hidden="true" />
                                            <div className="min-w-0">
                                                <span className="text-[11px] font-black text-white uppercase tracking-tight truncate block">{p.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => onSetPrincipalPlan(idx)}
                                                    title={p.es_principal ? 'Principal — clic para quitar' : 'Marcar como principal'}
                                                    className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border transition-all ${
                                                        p.es_principal
                                                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20'
                                                            : 'text-muted-foreground/40 bg-white/[0.03] border-white/[0.06] hover:text-emerald-400 hover:border-emerald-400/20 hover:bg-emerald-400/10'
                                                    }`}
                                                >
                                                    {p.es_principal ? '★' : '☆'} Principal
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <PriceCell value={p.unit_price} onChange={(v) => onUpdatePlanPrice(idx, v)} />
                                            <button
                                                type="button"
                                                onClick={() => onRemovePlan(idx)}
                                                className="text-red-500/40 hover:text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                                                aria-label={`Eliminar plan ${p.name}`}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Nested Included Items */}
                                    <div className="ml-5 pl-3 border-l border-white/[0.05] space-y-1">
                                        {plans.find(pl => pl.id === p.plan_id)?.services?.map((s, sIdx) => (
                                            <div key={`isvc-${sIdx}`} className="text-[9px] text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-white/15" aria-hidden="true" />
                                                {s.name} <span className="text-primary/40 ml-1">(incluido)</span>
                                            </div>
                                        ))}
                                        {!selectedProducts.some(sp => sp.plan_id === p.plan_id) && plans.find(pl => pl.id === p.plan_id)?.products?.map((prod, pIdx) => (
                                            <div key={`iprod-${pIdx}`} className="text-[9px] text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-orange-400/40" aria-hidden="true" />
                                                {prod.name} <span className="text-orange-400/40 ml-1">(incluido)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Services */}
                            {selectedServices.map((s, idx) => (
                                <div key={`srv-${idx}`} className="flex justify-between items-center group gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Sparkles size={11} className="text-blue-400 shrink-0" aria-hidden="true" />
                                        <div className="min-w-0">
                                            <span className="text-[11px] font-black text-white/80 uppercase tracking-tight truncate block">{s.name}</span>
                                            {pendingQuote(s) && (
                                                <span className="mr-1 inline-flex items-center text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border text-amber-400 bg-amber-400/10 border-amber-400/30"
                                                    title="Precio a cotizar: escribe el valor cuando lo sepas">
                                                    Por cotizar
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => onSetPrincipalService(idx)}
                                                title={s.es_principal ? 'Principal — clic para quitar' : 'Marcar como principal'}
                                                className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border transition-all ${
                                                    s.es_principal
                                                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20'
                                                        : 'text-muted-foreground/40 bg-white/[0.03] border-white/[0.06] hover:text-emerald-400 hover:border-emerald-400/20 hover:bg-emerald-400/10'
                                                }`}
                                            >
                                                {s.es_principal ? '★' : '☆'} Principal
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <PriceCell value={s.unit_price} onChange={(v) => onUpdateServicePrice(idx, v)} accentClass="text-white/80" />
                                        <button
                                            type="button"
                                            onClick={() => onRemoveService(idx)}
                                            className="text-red-500/40 hover:text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                                            aria-label={`Eliminar servicio ${s.name}`}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Products with quantity */}
                            <AnimatePresence>
                                {selectedProducts.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 pt-3 border-t border-dashed border-white/[0.05]"
                                    >
                                        {selectedProducts.map((product, index) => (
                                            <motion.div
                                                key={`prod-${product.product_id}-${index}`}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 8 }}
                                                className="flex items-center gap-3 group"
                                            >
                                                <div className="w-9 h-9 bg-black/30 rounded-lg overflow-hidden shrink-0 border border-white/[0.05]">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30" aria-hidden="true">
                                                            <Package size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{product.name}</p>
                                                    {product.plan_id ? (
                                                        <IncludedProductTools
                                                            product={product}
                                                            listPrice={products.find(pr => pr.id === product.product_id)?.unit_price ?? 0}
                                                            onSwap={onSwapProduct ? () => { setSwapIndex(index); setDrawerType('product'); } : undefined}
                                                            onCharge={(amount) => onUpdateProduct(index, 'unit_price', amount)}
                                                        />
                                                    ) : null}
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className="flex items-center gap-1 bg-black/30 rounded px-1.5 py-0.5 border border-white/[0.05]">
                                                            <button
                                                                type="button"
                                                                onClick={() => onUpdateProduct(index, 'quantity', Math.max(1, product.quantity - 1))}
                                                                className="text-muted-foreground hover:text-white transition-colors"
                                                                aria-label={`Reducir cantidad de ${product.name}`}
                                                            >
                                                                <ChevronDown size={11} />
                                                            </button>
                                                            <span className="text-[10px] font-black text-primary min-w-[10px] text-center font-mono">
                                                                {product.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => onUpdateProduct(index, 'quantity', product.quantity + 1)}
                                                                className="text-muted-foreground hover:text-white transition-colors"
                                                                aria-label={`Aumentar cantidad de ${product.name}`}
                                                            >
                                                                <ChevronUp size={11} />
                                                            </button>
                                                        </div>
                                                        <span className="text-[9px] text-muted-foreground/60">×</span>
                                                        <PriceCell
                                                            value={product.unit_price}
                                                            onChange={(v) => onUpdateProduct(index, 'unit_price', v)}
                                                            accentClass="text-orange-400"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveProduct(index)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 p-1 rounded transition-all shrink-0"
                                                    aria-label={`Eliminar ${product.name}`}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Weight Surcharge */}
                            {/* Con kg o con recargo guardado (tramo elegido en el formulario público, sin kg) */}
                            {((currentCremation?.weight && !weightPriceTable) || (currentCremation?.weight_price ?? 0) > 0) && (
                                <div className="flex justify-between items-center pt-3 border-t border-dashed border-white/[0.05] group gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C985] shrink-0" aria-hidden="true" />
                                        <span className="text-[10px] font-black text-[#00C985] uppercase tracking-tight truncate">
                                            Cargo por peso {currentCremation.weight ? `(${currentCremation.weight}kg)` : '(según tramo)'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <PriceCell
                                            value={currentCremation.weight_price || 0}
                                            onChange={(v) => setCurrentCremation(prev => ({ ...prev, weight_price: v }))}
                                            accentClass="text-[#00C985]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCurrentCremation(prev => ({ ...prev, weight_price: 0 }))}
                                            className="opacity-0 group-hover:opacity-100 text-red-500/40 hover:text-red-500 p-1 rounded transition-all"
                                            aria-label="Remover cargo por peso"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Traslado por comuna (retiro + entrega): editable; el convenio no lo descuenta */}
                            {(currentCremation?.transport_price ?? 0) > 0 && (
                                <div className="flex justify-between items-center pt-3 border-t border-dashed border-white/[0.05] group gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
                                        <span className="text-[10px] font-black text-sky-500 uppercase tracking-tight truncate" title={transportLabel(currentCremation.transport_detail)}>
                                            {transportLabel(currentCremation.transport_detail)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <PriceCell
                                            value={currentCremation.transport_price || 0}
                                            onChange={(v) => setCurrentCremation(prev => ({ ...prev, transport_price: v }))}
                                            accentClass="text-sky-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCurrentCremation(prev => ({ ...prev, transport_price: 0 }))}
                                            className="opacity-0 group-hover:opacity-100 text-red-500/40 hover:text-red-500 p-1 rounded transition-all"
                                            aria-label="Quitar traslado"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* === Discount + Total === */}
                <section className="px-6 py-5 border-t border-dashed border-border/60 space-y-4 bg-muted/20">
                    {pendingQuotes.length > 0 && (
                        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-500">
                            Falta cotizar: {pendingQuotes.map(s => s.name).join(', ')}. El total no incluye su valor hasta que lo escribas.
                        </div>
                    )}
                    {selectedProducts.length > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-amber-500 font-semibold">Subtotal Productos ({selectedProducts.length})</span>
                            <span className="text-amber-500 font-mono font-bold">{CLP.format(productsSubtotal)}</span>
                        </div>
                    )}

                    {/* === Ajustes comerciales: bloques diferenciados === */}
                    <div className="pt-3 border-t border-border/40 space-y-3">
                    {/* === Bloque 1: Descuento especial (%) manual === */}
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-3.5 flex justify-between items-center gap-3">
                        <div>
                            <label htmlFor="input-discount" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] flex items-center gap-1.5">
                                <Percent size={13} className="text-amber-500" />
                                Descuento especial (%)
                            </label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Se aplica sobre el total, después del convenio.</p>
                        </div>
                        <input
                            id="input-discount"
                            type="number"
                            min="0"
                            max="100"
                            value={discountValue}
                            onChange={(e) => setCurrentCremation(prev => ({ ...prev, discount: Number(e.target.value) }))}
                            className="w-16 h-9 bg-background border border-border rounded-lg px-2.5 text-right text-xs font-black text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono shadow-sm"
                            aria-label="Porcentaje de descuento especial"
                        />
                    </div>

                    {/* === Bloque 2: Convenio con empresa (descuento al cliente) === */}
                    {(showAgreements || currentCremation?.agreement_id) && (
                        <AgreementSection
                            agreements={agreements}
                            currentCremation={currentCremation}
                            setCurrentCremation={setCurrentCremation}
                            terms={agreementTerms}
                            breakdown={agreementBreakdown}
                        />
                    )}

                    {/* === Bloque 3: Veterinaria derivadora (comisión) === */}
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <label htmlFor="select-partner" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] flex items-center gap-1.5">
                                <Handshake size={13} className="text-emerald-500" />
                                Veterinaria derivadora
                            </label>
                            <div className="flex items-center gap-2">
                                {onNewPartnerClick && (
                                    <button
                                        type="button"
                                        onClick={onNewPartnerClick}
                                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 tracking-wider transition-colors"
                                    >
                                        + Nueva Veterinaria
                                    </button>
                                )}
                                {selectedPartnerObj && (
                                    <span className="text-[10px] font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        {selectedPartnerObj.tipo_comision === 'fijo'
                                            ? `${CLP.format(selectedPartnerObj.monto_comision || 0)} fijo`
                                            : `${selectedPartnerObj.porcentaje_comision || 0}% com.`}
                                    </span>
                                )}
                            </div>
                        </div>

                        <select
                            id="select-partner"
                            value={currentPartnerId || ''}
                            onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : undefined;
                                setCurrentCremation(prev => ({
                                    ...prev,
                                    partner_id: val,
                                    partner_link_id: val
                                }));
                            }}
                            className="w-full h-10 bg-background border border-border rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                        >
                            <option value="">Sin veterinaria (directo / particular)</option>
                            {partners.map((p: any) => (
                                <option key={p.id || p.id_partner} value={p.id || p.id_partner}>
                                    {p.name || p.nombre || p.nombre_clinica} ({p.porcentaje_comision || 0}%)
                                </option>
                            ))}
                        </select>

                        {selectedPartnerObj && partnerCommissionAmount > 0 && (
                            <div className="flex justify-between items-center px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
                                <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                                    <Percent size={12} /> Comisión Interna Estimada:
                                </span>
                                <span className="font-mono font-black text-emerald-300">
                                    {CLP.format(partnerCommissionAmount)}
                                </span>
                            </div>
                        )}
                    </div>
                    </div>

                    <div className="pt-4 border-t-2 border-border/80 flex items-end justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setShowReceipt(true)}
                            disabled={!hasItems}
                            title={hasItems ? undefined : 'Agrega un plan, servicio o producto'}
                            className="h-10 px-3.5 rounded-xl border border-border bg-background hover:bg-muted text-[10px] font-black uppercase tracking-[0.14em] text-foreground/80 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Receipt size={14} /> Vista previa del recibo
                        </button>
                        <div className="flex flex-col items-end gap-1">
                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.22em]">Total a Pagar</p>
                            <p className="text-3xl lg:text-4xl font-black text-foreground tracking-tight font-mono">
                                {CLP.format(grandTotal)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* === Actions === */}
                <footer className="px-6 py-5 border-t border-border/60 flex flex-col sm:flex-row gap-2.5 bg-muted/10">
                    <button
                        type="button"
                        onClick={onBack}
                        className="sm:flex-1 h-12 px-4 rounded-xl bg-background border border-border hover:bg-muted text-foreground/80 font-black uppercase text-[10px] tracking-[0.18em] transition-all active:scale-95 shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className={`
                            group relative sm:flex-[2] h-14 text-white px-6 rounded-xl font-black uppercase text-xs tracking-[0.22em]
                            transition-all active:scale-95 flex items-center justify-center overflow-hidden shadow-lg
                            ${allSectionsComplete
                                ? 'bg-gradient-to-r from-primary via-emerald-600 to-primary shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5'
                                : 'bg-slate-200 !text-slate-600 dark:bg-primary/50 dark:!text-white cursor-default dark:opacity-80'
                            }
                            disabled:opacity-50 disabled:translate-y-0
                        `}
                        title={!allSectionsComplete ? 'Completa todas las secciones para continuar' : undefined}
                    >
                        {allSectionsComplete && (
                            <>
                                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                            </>
                        )}
                        {isSaving && <Loader2 className="animate-spin mr-2.5 relative" size={16} />}
                        <span className="relative">{editId ? 'Actualizar Orden' : 'Confirmar Orden'}</span>
                    </button>
                </footer>
            </article>

            <ReceiptPreviewModal
                isOpen={showReceipt}
                onClose={() => setShowReceipt(false)}
                editId={editId}
                currentCremation={currentCremation}
                selectedServices={selectedServices}
                selectedPlans={selectedPlans}
                selectedProducts={selectedProducts}
            />

            {/* Catalog Drawer */}
            <SalesCatalogDrawer
                isOpen={drawerType !== null}
                onClose={() => { setDrawerType(null); setSwapIndex(null); }}
                type={drawerType || 'plan'}
                plans={plans}
                services={services}
                products={products}
                onSelectPlan={onAddPlan}
                onSelectService={onAddService}
                onSelectProduct={(id) => {
                    if (swapIndex !== null && onSwapProduct) {
                        onSwapProduct(swapIndex, Number(id));
                        setSwapIndex(null);
                        setDrawerType(null);
                        return;
                    }
                    onAddProduct(id);
                }}
                selectedPlanIds={selectedPlans.map(p => p.plan_id)}
                selectedServiceIds={selectedServices.map(s => s.service_id)}
                selectedProductIds={selectedProducts.map(p => Number(p.product_id))}
            />
        </div>
    );
}

function AgreementSection({
    agreements,
    currentCremation,
    setCurrentCremation,
    terms,
    breakdown,
}: {
    agreements: AgreementOption[];
    currentCremation: Partial<Cremation>;
    setCurrentCremation: React.Dispatch<React.SetStateAction<Partial<Cremation>>>;
    terms: AgreementTerms | null;
    breakdown?: AgreementBreakdown;
}) {
    const currentId = currentCremation?.agreement_id || null;
    // La orden puede tener un convenio ya desactivado: se muestra igual con su nombre guardado.
    const missing = !!currentId && !agreements.some(a => a.id === currentId);
    const lines: { label: string; pct: number; amount: number }[] = breakdown && terms
        ? [
            { label: 'Planes', pct: terms.plans_pct, amount: breakdown.plans },
            { label: 'Ánforas y productos', pct: terms.products_pct, amount: breakdown.products },
            { label: terms.special_service_name || 'Servicio especial', pct: terms.special_service_pct, amount: breakdown.special },
        ].filter(l => l.amount > 0)
        : [];

    return (
        <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.04] p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor="select-agreement" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] flex items-center gap-1.5">
                    <Building2 size={13} className="text-sky-500" />
                    Convenio empresa
                </label>
                <a
                    href="/dashboard/convenios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-sky-500 hover:underline tracking-wider"
                >
                    Gestionar convenios
                </a>
            </div>
            <select
                id="select-agreement"
                value={currentId ?? ''}
                onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setCurrentCremation(prev => ({ ...prev, agreement_id: val }));
                }}
                className="w-full h-10 bg-background border border-border rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
            >
                <option value="">Sin convenio</option>
                {missing && (
                    <option value={currentId!}>{currentCremation.agreement_name || 'Convenio'} (inactivo)</option>
                )}
                {agreements.map(a => (
                    <option key={a.id} value={a.id}>
                        {a.name}{a.rut ? ` · ${a.rut}` : ''}
                    </option>
                ))}
            </select>

            {currentId && terms && (
                <div className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs space-y-1">
                    <p className="text-[11px] text-sky-600 dark:text-sky-300 font-medium">{describeTerms(terms)}</p>
                    {lines.map(l => (
                        <div key={l.label} className="flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">{l.label} ({l.pct} %)</span>
                            <span className="font-mono font-bold text-sky-600 dark:text-sky-300">−{CLP.format(l.amount)}</span>
                        </div>
                    ))}
                    {breakdown && breakdown.total > 0 ? (
                        <div className="flex justify-between items-center pt-1 border-t border-sky-500/20">
                            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-200 flex items-center gap-1">
                                <Percent size={12} /> Descuento convenio
                            </span>
                            <span className="font-mono font-black text-sky-700 dark:text-sky-200">−{CLP.format(breakdown.total)}</span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">Ningún ítem de la orden tiene descuento con este convenio.</p>
                    )}
                </div>
            )}
        </div>
    );
}

/** Ánfora incluida en el plan: etiqueta, «Cambiar» y sugerencia de cobrar la diferencia. */
function IncludedProductTools({
    product,
    listPrice,
    onSwap,
    onCharge,
}: {
    product: SelectedProduct;
    listPrice: number;
    onSwap?: () => void;
    onCharge: (amount: number) => void;
}) {
    const diff = Math.max(0, Math.round(listPrice - (product.included_price ?? listPrice)));
    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border text-primary bg-primary/10 border-primary/20">
                Incluida en el plan
            </span>
            {onSwap && (
                <button
                    type="button"
                    onClick={onSwap}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors"
                >
                    <RefreshCw size={9} aria-hidden="true" /> Cambiar
                </button>
            )}
            {diff > 0 && product.unit_price !== diff && (
                <button
                    type="button"
                    onClick={() => onCharge(diff)}
                    title="La familia eligió un ánfora de mayor precio que la del plan"
                    className="text-[9px] font-bold text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                >
                    Cobrar diferencia +{CLP.format(diff)}
                </button>
            )}
            {product.unit_price > 0 && (
                <button
                    type="button"
                    onClick={() => onCharge(0)}
                    className="text-[9px] font-bold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                    Sin cargo
                </button>
            )}
        </div>
    );
}

