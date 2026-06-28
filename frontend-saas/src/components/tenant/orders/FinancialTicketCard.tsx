"use client";

import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, Receipt, Package, Sparkles, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SalesCatalogDrawer from '@/components/tenant/orders/SalesCatalogDrawer';
import { API_URL } from '@/lib/tenant/api';
import type { Cremation, Service, Plan, Product, SelectedProduct, SelectedService, SelectedPlan } from '@/lib/tenant/orders/types';

interface FinancialTicketCardProps {
    // Catalog
    services: Service[];
    plans: Plan[];
    products: Product[];

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
    onUpdateProduct: (index: number, field: keyof SelectedProduct, value: number) => void;
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
function PriceCell({ value, onChange, accentClass = 'text-white' }: { value: number; onChange: (v: number) => void; accentClass?: string }) {
    return (
        <div className="bg-black/30 rounded-md px-2 py-0.5 border border-white/[0.06] flex items-center gap-0.5 shrink-0">
            <span className="text-[9px] text-muted-foreground/60 font-mono">$</span>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={`w-16 bg-transparent text-right text-[11px] font-black outline-none p-0 font-mono ${accentClass}`}
            />
        </div>
    );
}

export default function FinancialTicketCard({
    services,
    plans,
    products,
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
    const productsSubtotal = selectedProducts.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const hasItems = selectedPlans.length > 0 || selectedServices.length > 0 || selectedProducts.length > 0;
    const discountValue = currentCremation?.discount || 0;

    return (
        <div className="lg:sticky lg:top-6 space-y-4">
            {/* === Single dark ticket panel === */}
            <article
                aria-label="Ticket financiero de la orden"
                className="bg-zinc-950 rounded-3xl border border-white/[0.06] ring-1 ring-primary/[0.08] shadow-2xl shadow-black/40 overflow-hidden"
            >
                {/* Ticket header */}
                <header className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary" aria-hidden="true">
                            <Receipt size={17} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-tight uppercase">Ticket de Orden</h2>
                            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-[0.18em]">Resumen y configuración</p>
                        </div>
                    </div>
                    {currentCremation?.oc_number && (
                        <span className="text-[10px] font-mono font-black text-primary/80 bg-primary/10 px-2 py-1 rounded-md">
                            OC #{String(currentCremation.oc_number).padStart(4, '0')}
                        </span>
                    )}
                </header>

                {/* === Add items section — Compact drawer triggers === */}
                <section className="px-6 py-4 space-y-2 border-b border-dashed border-white/[0.06]">
                    <button
                        type="button"
                        onClick={() => setDrawerType('plan')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] hover:border-primary/30 hover:bg-primary/[0.04] transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                            <Layers size={14} />
                        </div>
                        <span className="text-[10px] font-black text-white/80 uppercase tracking-wider flex-1 text-left">Agregar Plan <span className="text-red-400">*</span></span>
                        <Plus size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setDrawerType('service')}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] hover:border-blue-400/30 hover:bg-blue-400/[0.04] transition-all group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-blue-400/15 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                                <Sparkles size={12} />
                            </div>
                            <span className="text-[9px] font-black text-white/70 uppercase tracking-wider">Servicio</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDrawerType('product')}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] hover:border-orange-400/30 hover:bg-orange-400/[0.04] transition-all group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-orange-400/15 flex items-center justify-center text-orange-400 shrink-0 group-hover:scale-110 transition-transform">
                                <Package size={12} />
                            </div>
                            <span className="text-[9px] font-black text-white/70 uppercase tracking-wider">Producto</span>
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
                                        {plans.find(pl => pl.id === p.plan_id)?.products?.map((prod, pIdx) => (
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
                            {currentCremation?.weight && (currentCremation?.weight_price ?? 0) >= 0 && (
                                <div className="flex justify-between items-center pt-3 border-t border-dashed border-white/[0.05] group gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C985] shrink-0" aria-hidden="true" />
                                        <span className="text-[10px] font-black text-[#00C985] uppercase tracking-tight truncate">
                                            Cargo por peso ({currentCremation.weight}kg)
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
                        </>
                    )}
                </section>

                {/* === Discount + Total === */}
                <section className="px-6 py-5 border-t border-dashed border-white/[0.06] space-y-4 bg-black/20">
                    {selectedProducts.length > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-orange-400/70">Subtotal Productos ({selectedProducts.length})</span>
                            <span className="text-orange-400 font-mono">{CLP.format(productsSubtotal)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <label htmlFor="input-discount" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                            Descuento (%)
                        </label>
                        <input
                            id="input-discount"
                            type="number"
                            min="0"
                            max="100"
                            value={discountValue}
                            onChange={(e) => setCurrentCremation(prev => ({ ...prev, discount: Number(e.target.value) }))}
                            className="w-16 h-9 bg-black/40 border border-white/[0.06] rounded-lg px-2.5 text-right text-[12px] font-black text-white focus:border-primary outline-none font-mono"
                            aria-label="Porcentaje de descuento"
                        />
                    </div>

                    <div className="pt-4 border-t-2 border-white/[0.08] flex flex-col items-end gap-1">
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.22em]">Total a Pagar</p>
                        <p className="text-3xl lg:text-4xl font-black text-white tracking-tight font-mono">
                            {CLP.format(grandTotal)}
                        </p>
                    </div>
                </section>

                {/* === Actions === */}
                <footer className="px-6 py-5 border-t border-white/[0.06] flex flex-col sm:flex-row gap-2.5">
                    <button
                        type="button"
                        onClick={onBack}
                        className="sm:flex-1 h-12 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white/80 font-black uppercase text-[10px] tracking-[0.18em] transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className={`
                            group relative sm:flex-[2] h-14 text-white px-6 rounded-xl font-black uppercase text-xs tracking-[0.22em]
                            transition-all active:scale-95 flex items-center justify-center overflow-hidden
                            ${allSectionsComplete
                                ? 'bg-gradient-to-r from-primary to-[#00B377] shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 ring-1 ring-primary/40'
                                : 'bg-gradient-to-r from-primary/40 to-[#00B377]/40 shadow-none cursor-default ring-1 ring-white/[0.05]'
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

            {/* Catalog Drawer */}
            <SalesCatalogDrawer
                isOpen={drawerType !== null}
                onClose={() => setDrawerType(null)}
                type={drawerType || 'plan'}
                plans={plans}
                services={services}
                products={products}
                onSelectPlan={onAddPlan}
                onSelectService={onAddService}
                onSelectProduct={onAddProduct}
                selectedPlanIds={selectedPlans.map(p => p.plan_id)}
                selectedServiceIds={selectedServices.map(s => s.service_id)}
                selectedProductIds={selectedProducts.map(p => Number(p.product_id))}
            />
        </div>
    );
}
