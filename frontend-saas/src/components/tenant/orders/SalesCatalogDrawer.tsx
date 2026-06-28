"use client";

import React, { useState, useMemo } from 'react';
import { Search, Layers, Sparkles, Package, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SlideOver from '@/components/tenant/SlideOver';
import { API_URL } from '@/lib/tenant/api';
import type { Plan, Service, Product } from '@/lib/tenant/orders/types';

type CatalogType = 'plan' | 'service' | 'product';

interface SalesCatalogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    type: CatalogType;
    plans: Plan[];
    services: Service[];
    products: Product[];
    onSelectPlan: (planId: number) => void;
    onSelectService: (serviceId: number) => void;
    onSelectProduct: (productId: string) => void;
    /** IDs of already-selected items to show a check badge */
    selectedPlanIds?: number[];
    selectedServiceIds?: number[];
    selectedProductIds?: number[];
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

const catalogMeta: Record<CatalogType, { title: string; subtitle: string; icon: React.ReactNode; accent: string }> = {
    plan: {
        title: 'Plan Principal',
        subtitle: 'Define el tipo de orden para estadísticas',
        icon: <Layers size={18} />,
        accent: 'primary',
    },
    service: {
        title: 'Servicio Principal',
        subtitle: 'Define el tipo de orden para estadísticas',
        icon: <Sparkles size={18} />,
        accent: 'blue-400',
    },
    product: {
        title: 'Vincular Producto',
        subtitle: 'Urnas y accesorios disponibles',
        icon: <Package size={18} />,
        accent: 'orange-400',
    },
};

export default function SalesCatalogDrawer({
    isOpen,
    onClose,
    type,
    plans,
    services,
    products,
    onSelectPlan,
    onSelectService,
    onSelectProduct,
    selectedPlanIds = [],
    selectedServiceIds = [],
    selectedProductIds = [],
}: SalesCatalogDrawerProps) {
    const [search, setSearch] = useState('');
    const meta = catalogMeta[type];

    // Reset search when drawer opens
    React.useEffect(() => {
        if (isOpen) setSearch('');
    }, [isOpen]);

    const handleSelect = (id: number | string) => {
        if (type === 'plan') onSelectPlan(Number(id));
        else if (type === 'service') onSelectService(Number(id));
        else onSelectProduct(String(id));
        onClose();
    };

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={meta.title}
            subtitle={meta.subtitle}
            icon={meta.icon}
            width="max-w-md"
        >
            {/* Search Bar */}
            <div className="px-5 py-4 border-b border-white/[0.06] bg-black/20 sticky top-0 z-10">
                <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                        type="text"
                        autoFocus
                        placeholder="Buscar por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40"
                    />
                </div>
            </div>

            {/* Items Grid */}
            <div className="p-5 space-y-3">
                {type === 'plan' && <PlanList plans={plans} search={search} selectedIds={selectedPlanIds} onSelect={handleSelect} />}
                {type === 'service' && <ServiceList services={services} search={search} selectedIds={selectedServiceIds} onSelect={handleSelect} />}
                {type === 'product' && <ProductList products={products} search={search} selectedIds={selectedProductIds} onSelect={handleSelect} />}
            </div>
        </SlideOver>
    );
}

/* ========== PLAN LIST ========== */
function PlanList({ plans, search, selectedIds, onSelect }: { plans: Plan[]; search: string; selectedIds: number[]; onSelect: (id: number) => void }) {
    const filtered = useMemo(() =>
        plans.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
        [plans, search]
    );

    if (filtered.length === 0) return <EmptyState />;

    return (
        <div className="space-y-3">
            {filtered.map((plan, idx) => {
                const isSelected = selectedIds.includes(plan.id);
                return (
                    <motion.button
                        key={plan.id}
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => onSelect(plan.id)}
                        whileHover={{ y: -2 }}
                        className={`
                            w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden backdrop-blur-md
                            ${isSelected
                                ? 'border-primary/40 bg-gradient-to-br from-primary/[0.08] to-primary/[0.01] shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]'
                                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20'
                            }
                        `}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary/20 text-primary' : 'bg-white/[0.06] text-muted-foreground/60'}`}>
                                <Layers size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                {/* Header with title and badge aligned cleanly to prevent overlaps */}
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight leading-snug">{plan.name}</h3>
                                    {isSelected && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                                                ★ Principal
                                            </span>
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
                                                <Check size={11} className="text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-xl font-black text-primary mt-1.5 font-mono">{CLP.format(plan.price)}</p>

                                {/* Included items */}
                                {(plan.services?.length > 0 || plan.products?.length > 0) && (
                                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] space-y-1.5">
                                        {plan.services?.map((s, i) => (
                                            <div key={`s-${i}`} className="flex items-center gap-2 text-[10px] text-muted-foreground/75 uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                                <span className="truncate">{s.name}</span> 
                                                <span className="text-primary/50 font-medium shrink-0 ml-auto">(incluido)</span>
                                            </div>
                                        ))}
                                        {plan.products?.map((p, i) => (
                                            <div key={`p-${i}`} className="flex items-center gap-2 text-[10px] text-muted-foreground/75 uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400/40 shrink-0" />
                                                <span className="truncate">{p.name}</span>
                                                <span className="text-orange-400/50 font-medium shrink-0 ml-auto">(incluido)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}

/* ========== SERVICE LIST ========== */
function ServiceList({ services, search, selectedIds, onSelect }: { services: Service[]; search: string; selectedIds: number[]; onSelect: (id: number) => void }) {
    const filtered = useMemo(() =>
        services.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
        [services, search]
    );

    if (filtered.length === 0) return <EmptyState />;

    return (
        <div className="space-y-2.5">
            {filtered.map((service, idx) => {
                const isSelected = selectedIds.includes(service.id);
                return (
                    <motion.button
                        key={service.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => onSelect(service.id)}
                        whileHover={{ y: -1 }}
                        className={`
                            w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 group backdrop-blur-md
                            ${isSelected
                                ? 'border-blue-400/30 bg-gradient-to-br from-blue-400/[0.08] to-blue-400/[0.01] shadow-[0_4px_15px_-4px_rgba(96,165,250,0.15)]'
                                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                            }
                        `}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-400/20 text-blue-400' : 'bg-white/[0.06] text-muted-foreground/60 group-hover:text-blue-400 group-hover:bg-blue-400/10'}`}>
                            {isSelected ? <Check size={16} /> : <Sparkles size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white uppercase tracking-tight truncate">{service.name}</p>
                            {isSelected && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                                    ★ Principal
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-black text-blue-400 font-mono shrink-0">
                            {CLP.format(service.price)}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}

/* ========== PRODUCT LIST ========== */
function ProductList({ products, search, selectedIds, onSelect }: { products: Product[]; search: string; selectedIds: number[]; onSelect: (id: string) => void }) {
    const filtered = useMemo(() =>
        products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
        [products, search]
    );

    if (filtered.length === 0) return <EmptyState />;

    return (
        <div className="space-y-2.5">
            {filtered.map((product, idx) => {
                const isSelected = selectedIds.includes(product.id);
                const lowStock = product.stock > 0 && product.stock <= 3;
                const noStock = product.stock <= 0;

                return (
                    <motion.button
                        key={product.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => !noStock && onSelect(String(product.id))}
                        disabled={noStock}
                        whileHover={noStock ? {} : { y: -1 }}
                        className={`
                            w-full text-left flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-300 group relative backdrop-blur-md
                            ${noStock
                                ? 'border-white/[0.04] opacity-35 cursor-not-allowed bg-black/10'
                                : isSelected
                                    ? 'border-orange-400/30 bg-gradient-to-br from-orange-400/[0.08] to-orange-400/[0.01] shadow-[0_4px_15px_-4px_rgba(251,146,60,0.15)]'
                                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                            }
                        `}
                    >
                        {/* Image */}
                        <div className="w-16 h-16 rounded-xl bg-black/35 overflow-hidden shrink-0 border border-white/[0.06] relative shadow-inner">
                            {product.image_url ? (
                                <img
                                    src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/35">
                                    <Package size={20} />
                                </div>
                            )}

                            {/* Selected overlay check */}
                            {isSelected && (
                                <div className="absolute inset-0 bg-orange-400/20 backdrop-blur-[1px] flex items-center justify-center">
                                    <Check size={16} className="text-white" />
                                </div>
                            )}
                        </div>

                        {/* Info details */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white uppercase tracking-tight truncate leading-snug">{product.name}</p>
                            
                            {/* Stock status indicator */}
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className={`
                                    px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider
                                    ${noStock 
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/15' 
                                        : lowStock 
                                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/15' 
                                            : 'bg-black/30 text-muted-foreground/75 border border-white/[0.05]'
                                    }
                                `}>
                                    {noStock ? 'Agotado' : `Stock: ${product.stock}`}
                                </span>
                            </div>
                        </div>

                        {/* Price details */}
                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                            <span className="text-xs font-black text-orange-400 font-mono">
                                {CLP.format(product.unit_price)}
                            </span>
                            {isSelected && (
                                <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest bg-orange-400/10 px-1.5 py-0.5 rounded-full border border-orange-400/20 shadow-sm">
                                    Listo
                                </span>
                            )}
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}

/* ========== EMPTY STATE ========== */
function EmptyState() {
    return (
        <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3 text-muted-foreground/30">
                <AlertCircle size={24} />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                No se encontraron resultados
            </p>
        </div>
    );
}
