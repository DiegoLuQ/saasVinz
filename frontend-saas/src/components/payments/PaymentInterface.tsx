'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentInterfaceProps {
    productId: string;
    successUrl: string;
    targetResource: 'memorial' | 'tenant' | 'veterinary';
    targetId: string;
    action: string;
    customerEmail?: string;
    buttonText?: string;
    description?: string;
    priceLabel?: string;
    isDark?: boolean;
    variant?: 'default' | 'consecration';
    className?: string;
}

import { usePolar } from '@/hooks/usePolar';

export const PaymentInterface: React.FC<PaymentInterfaceProps> = ({
    productId,
    successUrl,
    targetResource,
    targetId,
    action,
    customerEmail,
    buttonText = "Suscribirse Ahora",
    description,
    priceLabel,
    isDark = true,
    variant = 'default',
    className
}) => {
    const { createCheckout, loading: isLoading } = usePolar();
    const [error, setError] = useState<string | null>(null);

    const handlePayment = async () => {
        setError(null);
        try {
            await createCheckout({
                product_id: productId,
                success_url: successUrl,
                target_resource: targetResource,
                target_id: targetId,
                action: action,
                customer_email: customerEmail
            });
        } catch (err: any) {
            setError(err.message || 'Error al iniciar el pago');
        }
    };

    const isConsecration = variant === 'consecration';

    // If variant is Consecration, we might want to return JUST the button if no description/price is provided
    // This allows the parent to control the container fully, as done in TributePlans
    if (isConsecration && !description && !priceLabel) {
        return (
            <>
                <button
                    onClick={handlePayment}
                    disabled={isLoading}
                    className={className || `w-full py-3 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-300 shadow-lg ${isLoading
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-sky-200 text-sky-900 hover:bg-sky-300 shadow-sky-200/50'
                        }`}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                    ) : (
                        buttonText
                    )}
                </button>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-xs text-red-500 text-center"
                    >
                        {error}
                    </motion.p>
                )}
            </>
        );
    }

    return (
        <div className={`p-6 rounded-3xl border transition-all ${isConsecration
            ? 'bg-transparent border-transparent'
            : isDark
                ? 'bg-slate-900/50 border-white/5 shadow-xl shadow-black/20'
                : 'bg-white border-slate-100 shadow-lg shadow-slate-200/50'
            }`}>
            {description && (
                <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {description}
                </p>
            )}

            <div className={`flex items-center gap-4 ${isConsecration ? 'flex-col' : 'justify-between'}`}>
                {priceLabel && (
                    <div className={`flex flex-col ${isConsecration ? 'items-center' : ''}`}>
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${isConsecration
                            ? 'text-sky-400/60 tracking-[0.3em] font-medium'
                            : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {isConsecration ? 'Contribución única' : 'Inversión'}
                        </span>
                        <span className={`font-black ${isConsecration
                            ? 'text-lg text-sky-200'
                            : 'text-2xl ' + (isDark ? 'text-white' : 'text-slate-900')}`}>
                            {priceLabel}
                        </span>
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={isLoading}
                    className={className || `${isConsecration ? 'w-full' : 'flex-1'} py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${isLoading
                        ? (isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                        : isConsecration
                            // Celestial Blue Button Style requested by user + Typography update
                            ? (isDark
                                ? 'bg-sky-400 text-slate-900 hover:bg-sky-300 shadow-sky-400/20 uppercase text-[11px] tracking-[0.2em]'
                                : 'bg-sky-200 text-sky-900 hover:bg-sky-300 shadow-sky-200/50 uppercase text-[11px] tracking-[0.2em]')
                            : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                        }`}
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                        buttonText
                    )}
                </button>
            </div>

            {error && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-xs font-bold text-red-500 text-center bg-red-500/10 py-2 rounded-xl border border-red-500/20"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
};

