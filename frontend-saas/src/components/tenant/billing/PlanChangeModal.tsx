"use client";

import React, { useState, useEffect } from 'react';
import {
    Zap,
    CheckCircle2,
    X,
    Ticket,
    Loader2,
    Info,
    ArrowRight
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { cn } from '@/lib/utils';

interface PlanChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (couponCode?: string) => void;
    plan: {
        id: number;
        name: string;
        monthly_price: number;
        annual_price: number;
    } | null;
    cycle: 'monthly' | 'annual';
    isLoading?: boolean;
}

export const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    plan,
    cycle,
    isLoading = false
}) => {
    const [couponCode, setCouponCode] = useState('');
    const [couponData, setCouponData] = useState<{
        code: string;
        discount_percent: number;
        valid: boolean;
    } | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCouponCode('');
            setCouponData(null);
            setCouponError(null);
        }
    }, [isOpen]);

    if (!isOpen || !plan) return null;

    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) return;

        setIsValidating(true);
        setCouponError(null);
        setCouponData(null);

        try {
            const response = await apiRequest(`/api/internal/billing/coupons/validate/${couponCode.trim()}`);
            setCouponData(response);
            setCouponError(null);
        } catch (error: any) {
            setCouponError(error.message || "Cupón inválido o expirado");
        } finally {
            setIsValidating(false);
        }
    };

    // Price Calculations (matching backend logic)
    const baseMonthly = plan.monthly_price;
    const months = cycle === 'annual' ? 12 : 1;
    const subtotal = baseMonthly * months;

    // Cycle discount (15% for annual)
    const cycleDiscountPercent = cycle === 'annual' ? 15 : 0;
    const cycleDiscountAmount = subtotal * (cycleDiscountPercent / 100);
    const intermediatePrice = subtotal - cycleDiscountAmount;

    // Coupon discount
    const couponDiscountPercent = couponData?.valid ? couponData.discount_percent : 0;
    const couponDiscountAmount = intermediatePrice * (couponDiscountPercent / 100);

    const finalPrice = intermediatePrice - couponDiscountAmount;
    const totalSavings = cycleDiscountAmount + couponDiscountAmount;

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10 bg-[#0B1121]/95 text-white"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 relative bg-gradient-to-br from-primary/10 to-transparent">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white/40" />
                    </button>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">Cambiar Plan</h3>
                            <p className="text-white/40 text-sm">Confirma los detalles de tu nueva suscripción.</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Plan Summary */}
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Plan Destino</p>
                                <h4 className="text-xl font-bold">{plan.name}</h4>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Frecuencia</p>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold capitalize">
                                    {cycle === 'annual' ? 'Anual' : 'Mensual'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/40">Subtotal ({months} meses)</span>
                                <span className="font-medium">{formatPrice(subtotal)}</span>
                            </div>

                            {cycleDiscountPercent > 0 && (
                                <div className="flex justify-between text-sm text-green-400">
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 size={14} />
                                        Descuento Anual (15%)
                                    </span>
                                    <span>-{formatPrice(cycleDiscountAmount)}</span>
                                </div>
                            )}

                            {couponData?.valid && (
                                <div className="flex justify-between text-sm text-primary animate-in slide-in-from-left-2 transition-all">
                                    <span className="flex items-center gap-1.5 font-bold">
                                        <Ticket size={14} />
                                        Cupón {couponData.code} (-{couponData.discount_percent}%)
                                    </span>
                                    <span className="font-bold">-{formatPrice(couponDiscountAmount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                <span className="text-lg font-bold">Total a Pagar</span>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-primary tracking-tighter">
                                        {formatPrice(finalPrice)}
                                    </div>
                                    {totalSavings > 0 && (
                                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-wide">
                                            Ahorras {formatPrice(totalSavings)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coupon Input */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                            ¿Tienes un código de descuento?
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    type="text"
                                    placeholder="Ingresa tu cupón..."
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    className={cn(
                                        "w-full bg-white/5 border rounded-2xl py-3 pl-12 pr-4 text-sm outline-none transition-all",
                                        couponError ? "border-red-500/50 focus:border-red-500" :
                                            couponData?.valid ? "border-green-500/50 focus:border-green-500" :
                                                "border-white/10 focus:border-primary/50"
                                    )}
                                />
                            </div>
                            <button
                                onClick={handleValidateCoupon}
                                disabled={isValidating || !couponCode.trim()}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isValidating ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                            </button>
                        </div>
                        {couponError && (
                            <p className="text-xs text-red-400 font-medium ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                                <X size={12} /> {couponError}
                            </p>
                        )}
                        {couponData?.valid && (
                            <p className="text-xs text-green-400 font-medium ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                                <CheckCircle2 size={12} /> El cupón ha sido aplicado correctamente.
                            </p>
                        )}
                    </div>

                    {/* Disclaimer */}
                    <div className="flex gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                        <Info size={18} className="text-primary shrink-0" />
                        <p className="text-[11px] text-white/60 leading-relaxed">
                            Al confirmar, se generará una solicitud de cambio. Un administrador validará el pago y el cupón antes de activar el nuevo plan.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(couponData?.valid ? couponData.code : undefined)}
                            disabled={isLoading}
                            className="flex-1 py-4 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>Confirmar Cambio <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
