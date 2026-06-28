"use client";

import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Layers, Sparkles, Package, Check, LayoutGrid, PanelRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/lib/tenant/api';
import SalesCatalogDrawer from '@/components/tenant/orders/SalesCatalogDrawer';
import type { Service, Plan, Product, SelectedProduct, SelectedPlan, SelectedService } from '@/lib/tenant/orders/types';

type ViewMode = 'grid' | 'drawer';

interface SalesConfigCardProps {
    services: Service[];
    plans: Plan[];
    products: Product[];
    selectedPlans: SelectedPlan[];
    selectedServices: SelectedService[];
    selectedProducts: SelectedProduct[];
    onAddPlan: (planId: number) => void;
    onAddService: (serviceId: number) => void;
    onAddProduct: (productId: string) => void;
    onUpdateProduct: (index: number, field: keyof SelectedProduct, value: number) => void;
    onRemoveProduct: (index: number) => void;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export default function SalesConfigCard({
    services,
    plans,
    products,
    selectedPlans,
    selectedServices,
    selectedProducts,
    onAddPlan,
    onAddService,
    onAddProduct,
    onUpdateProduct,
    onRemoveProduct,
}: SalesConfigCardProps) {
    const [drawerType, setDrawerType] = useState<'plan' | 'service' | 'product' | null>(null);

    const openDrawer = (type: 'plan' | 'service' | 'product') => setDrawerType(type);
    const closeDrawer = () => setDrawerType(null);

    return (
        <>
            <div className="bg-white/[0.015] rounded-3xl border border-white/[0.07] p-6 sm:p-10 lg:p-12 transition-colors duration-300 hover:border-white/[0.12]">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-primary/10 rounded-2xl" aria-hidden="true">
                            <Plus className="text-primary" size={28} />
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-light text-white tracking-tight" id="section-sales">
                            Configuración de Venta
                        </h2>
                    </div>
                </div>

                <div className="space-y-8" role="group" aria-labelledby="section-sales">
                    {/* ===== DRAWER MODE (Standard for all items) ===== */}
                    <div className="space-y-4">
                        {/* Plan trigger */}
                        <DrawerTrigger
                            label="Seleccionar Plan"
                            sublabel="Haz clic para explorar planes disponibles"
                            icon={<Layers size={20} />}
                            accentClass="text-primary bg-primary/15"
                            required
                            onClick={() => openDrawer('plan')}
                        />

                        {/* Service trigger */}
                        <DrawerTrigger
                            label="Agregar Servicio Extra"
                            sublabel="Streaming, traslado y más"
                            icon={<Sparkles size={20} />}
                            accentClass="text-blue-400 bg-blue-400/15"
                            onClick={() => openDrawer('service')}
                        />

                        {/* Product trigger */}
                        <DrawerTrigger
                            label="Vincular Urna / Producto"
                            sublabel="Explora el catálogo con fotos y stock"
                            icon={<Package size={20} />}
                            accentClass="text-orange-400 bg-orange-400/15"
                            onClick={() => openDrawer('product')}
                        />
                    </div>

                    {/* ===== SELECTED PRODUCTS LIST (shared between both modes) ===== */}
                    <AnimatePresence>
                        {selectedProducts.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4 pt-6 border-t border-white/[0.06] overflow-hidden"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.18em]">
                                        Productos Agregados ({selectedProducts.length})
                                    </span>
                                </div>
                                {selectedProducts.map((product, index) => (
                                    <motion.div
                                        key={`prod-${product.product_id}-${index}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="flex items-center gap-5 bg-white/[0.04] border border-white/[0.08] p-4 rounded-2xl group transition-all hover:bg-white/[0.07] relative"
                                    >
                                        <div className="w-14 h-14 bg-black/20 rounded-xl overflow-hidden shrink-0 border border-white/[0.06]">
                                            {product.image_url ? (
                                                <img src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30" aria-hidden="true">
                                                    <Plus size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-white truncate uppercase tracking-tight mb-2">{product.name}</p>
                                            <div className="flex items-center gap-3">
                                                {/* Quantity Stepper */}
                                                <div className="flex items-center gap-2 bg-black/40 rounded-lg px-2.5 py-1 border border-white/[0.06]">
                                                    <button
                                                        type="button"
                                                        onClick={() => onUpdateProduct(index, 'quantity', Math.max(1, product.quantity - 1))}
                                                        className="text-muted-foreground hover:text-white transition-colors"
                                                        aria-label={`Reducir cantidad de ${product.name}`}
                                                    >
                                                        <ChevronDown size={13} />
                                                    </button>
                                                    <span className="text-[11px] font-black text-primary min-w-[14px] text-center font-mono" aria-label={`Cantidad: ${product.quantity}`}>
                                                        {product.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => onUpdateProduct(index, 'quantity', product.quantity + 1)}
                                                        className="text-muted-foreground hover:text-white transition-colors"
                                                        aria-label={`Aumentar cantidad de ${product.name}`}
                                                    >
                                                        <ChevronUp size={13} />
                                                    </button>
                                                </div>
                                                <span className="text-[10px] font-black text-muted-foreground/60">×</span>
                                                {/* Price Badge */}
                                                <div className="bg-black/40 rounded-lg px-3 py-1 border border-white/[0.06] flex items-center gap-1">
                                                    <span className="text-[10px] text-muted-foreground/60 font-mono">$</span>
                                                    <input
                                                        type="number"
                                                        value={product.unit_price}
                                                        onChange={(e) => onUpdateProduct(index, 'unit_price', Number(e.target.value))}
                                                        className="w-20 bg-transparent text-[11px] font-black text-white border-none outline-none focus:ring-0 p-0 font-mono"
                                                        aria-label={`Precio unitario de ${product.name}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveProduct(index)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all absolute right-3 top-1/2 -translate-y-1/2"
                                            aria-label={`Eliminar ${product.name}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Catalog Drawer (used only in drawer mode but accessible from anywhere) */}
            <SalesCatalogDrawer
                isOpen={drawerType !== null}
                onClose={closeDrawer}
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
        </>
    );
}

/* ========== DRAWER TRIGGER BUTTON ========== */
function DrawerTrigger({
    label,
    sublabel,
    icon,
    accentClass,
    required,
    onClick,
}: {
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    accentClass: string;
    required?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-5 p-6 rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-200 group text-left"
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accentClass} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white uppercase tracking-tight">
                    {label}
                    {required && <span className="text-red-400 ml-1">*</span>}
                </p>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-0.5">{sublabel}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/15 group-hover:text-primary transition-all shrink-0">
                <Plus size={18} />
            </div>
        </button>
    );
}
