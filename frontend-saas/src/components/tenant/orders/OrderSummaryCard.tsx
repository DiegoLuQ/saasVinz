"use client";

import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import type { Cremation, Plan, SelectedService, SelectedPlan, SelectedProduct } from '@/lib/tenant/orders/types';

interface OrderSummaryCardProps {
    currentCremation: Partial<Cremation>;
    setCurrentCremation: React.Dispatch<React.SetStateAction<Partial<Cremation>>>;
    selectedPlans: SelectedPlan[];
    selectedServices: SelectedService[];
    selectedProducts: SelectedProduct[];
    plans: Plan[];
    grandTotal: number;
    editId: string | null;
    isSaving: boolean;
    allSectionsComplete: boolean;
    onUpdatePlanPrice: (index: number, price: number) => void;
    onRemovePlan: (index: number) => void;
    onUpdateServicePrice: (index: number, price: number) => void;
    onRemoveService: (index: number) => void;
    onBack: () => void;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export default function OrderSummaryCard({
    currentCremation,
    setCurrentCremation,
    selectedPlans,
    selectedServices,
    selectedProducts,
    plans,
    grandTotal,
    editId,
    isSaving,
    allSectionsComplete,
    onUpdatePlanPrice,
    onRemovePlan,
    onUpdateServicePrice,
    onRemoveService,
    onBack,
}: OrderSummaryCardProps) {
    const productsSubtotal = selectedProducts.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const hasItems = selectedPlans.length > 0 || selectedServices.length > 0 || selectedProducts.length > 0;

    return (
        <div className="lg:sticky lg:top-6 space-y-6 transition-all">
            {/* Anchored Summary Panel — Solid dark for financial prominence */}
            <div className="bg-zinc-950 rounded-3xl border border-primary/20 p-6 sm:p-10 lg:p-12 relative overflow-hidden shadow-2xl shadow-primary/10 ring-1 ring-white/[0.04]">
                {/* Subtle ambient glow */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary/15 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-primary/[0.07] blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />

                <div className="relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-12">
                        <h2 className="text-2xl lg:text-3xl font-light text-white tracking-tight">
                            Resumen Orden
                        </h2>
                        <div className="px-3 py-1.5 bg-primary/20 rounded-full border border-primary/30">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.18em]">Finanzas</span>
                        </div>
                    </div>

                    {!hasItems ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/[0.06] rounded-2xl">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <span className="text-3xl">📋</span>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.18em]">Sin items agregados</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1.5">Agrega un plan, servicio o producto</p>
                        </div>
                    ) : (
                        <div className="space-y-5 mb-10">
                            {/* Plans & Included Services */}
                            {selectedPlans.map((p, idx) => (
                                <div key={`sum-plan-${idx}`} className="space-y-3">
                                    <div className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                                            <span className="text-xs font-black text-white uppercase tracking-tight truncate">Plan {p.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="bg-black/40 rounded-lg px-2.5 py-1 border border-white/[0.06] flex items-center gap-1">
                                                <span className="text-[10px] text-muted-foreground/60 font-mono">$</span>
                                                <input
                                                    type="number"
                                                    value={p.unit_price}
                                                    onChange={(e) => onUpdatePlanPrice(idx, Number(e.target.value))}
                                                    className="w-20 bg-transparent text-right text-xs font-black text-white outline-none p-0 font-mono"
                                                    aria-label={`Precio del plan ${p.name}`}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onRemovePlan(idx)}
                                                className="text-red-500/60 hover:text-red-500 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
                                                aria-label={`Eliminar plan ${p.name}`}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Nested Included Services & Products */}
                                    <div className="ml-4 pl-4 border-l border-white/[0.05] space-y-1.5">
                                        {plans.find(pl => pl.id === p.plan_id)?.services?.map((s, sIdx) => (
                                            <div key={`svc-${sIdx}`} className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-white/20" aria-hidden="true" />
                                                {s.name} <span className="text-primary/40 leading-none ml-1">(incluído)</span>
                                            </div>
                                        ))}
                                        {plans.find(pl => pl.id === p.plan_id)?.products?.map((prod, pIdx) => (
                                            <div key={`prod-${pIdx}`} className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-orange-400/40" aria-hidden="true" />
                                                {prod.name} <span className="text-orange-400/40 leading-none ml-1">(incluído)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Extra Services */}
                            {selectedServices.map((s, idx) => (
                                <div key={`sum-srv-${idx}`} className="flex justify-between items-center group">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" aria-hidden="true" />
                                        <span className="text-xs font-black text-white/80 uppercase tracking-tight truncate">{s.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="bg-black/40 rounded-lg px-2.5 py-1 border border-white/[0.06] flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground/60 font-mono">$</span>
                                            <input
                                                type="number"
                                                value={s.unit_price}
                                                onChange={(e) => onUpdateServicePrice(idx, Number(e.target.value))}
                                                className="w-20 bg-transparent text-right text-xs font-black text-white/80 outline-none p-0 font-mono"
                                                aria-label={`Precio del servicio ${s.name}`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveService(idx)}
                                            className="text-red-500/60 hover:text-red-500 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
                                            aria-label={`Eliminar servicio ${s.name}`}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Weight Surcharge */}
                            {currentCremation?.weight && (currentCremation?.weight_price ?? 0) >= 0 && (
                                <div className="flex justify-between items-center py-3 border-y border-white/[0.05] group">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00C985] shrink-0" aria-hidden="true" />
                                        <span className="text-xs font-black text-[#00C985] uppercase tracking-tight truncate">
                                            Cargo por Peso ({currentCremation.weight}kg)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="bg-[#00C985]/5 rounded-lg px-2.5 py-1 border border-[#00C985]/20 flex items-center gap-1">
                                            <span className="text-[10px] text-[#00C985]/60 font-mono">$</span>
                                            <input
                                                type="number"
                                                value={currentCremation.weight_price}
                                                onChange={(e) => setCurrentCremation(prev => ({ ...prev, weight_price: Number(e.target.value) }))}
                                                className="w-20 bg-transparent text-right text-xs font-black text-[#00C985] outline-none p-0 font-mono"
                                                aria-label="Cargo por peso"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentCremation(prev => ({ ...prev, weight_price: 0 }))}
                                            className="text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-500/10 rounded-lg"
                                            title="Remover cargo por peso"
                                            aria-label="Remover cargo por peso"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Products Subtotal Line */}
                            {selectedProducts.length > 0 && (
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-tight pt-3 border-t border-white/[0.05]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
                                        <span className="text-orange-400">Productos & Urnas ({selectedProducts.length})</span>
                                    </div>
                                    <span className="text-orange-400 font-mono">{CLP.format(productsSubtotal)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Discount + Total */}
                    <div className="space-y-5 pt-8 border-t-2 border-white/[0.08]">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em]">Descuento (%)</span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={currentCremation?.discount || 0}
                                onChange={(e) => setCurrentCremation(prev => ({ ...prev, discount: Number(e.target.value) }))}
                                className="w-20 h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-right text-sm font-black text-white focus:border-primary outline-none font-mono"
                                aria-label="Porcentaje de descuento"
                            />
                        </div>

                        <div className="flex flex-col items-end gap-2 pt-6 border-t border-white/[0.05]">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.22em] leading-none">
                                Total a Pagar
                            </p>
                            <p className="text-5xl font-black text-white tracking-tight font-mono">
                                {CLP.format(grandTotal)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions — Massive Save Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="sm:flex-1 h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-black uppercase text-xs tracking-[0.18em] transition-all active:scale-95"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className={`
                        group relative sm:flex-[2] h-16 text-white px-8 rounded-2xl font-black uppercase text-sm tracking-[0.22em]
                        transition-all active:scale-95 flex items-center justify-center overflow-hidden
                        ${allSectionsComplete
                            ? 'bg-gradient-to-r from-primary to-[#00B377] shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 ring-1 ring-primary/40'
                            : 'bg-gradient-to-r from-primary/40 to-[#00B377]/40 shadow-none cursor-default ring-1 ring-white/[0.05]'
                        }
                        disabled:opacity-50 disabled:translate-y-0
                    `}
                    title={!allSectionsComplete ? 'Completa todas las secciones para continuar' : undefined}
                >
                    {/* Holographic shine overlay on hover */}
                    {allSectionsComplete && (
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                        />
                    )}
                    {/* Subtle inner top highlight */}
                    {allSectionsComplete && (
                        <span
                            aria-hidden="true"
                            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                        />
                    )}
                    {isSaving && <Loader2 className="animate-spin mr-3 relative" size={20} />}
                    <span className="relative">
                        {editId ? 'Actualizar Orden' : 'Confirmar Orden'}
                    </span>
                </button>
            </div>
        </div>
    );
}
