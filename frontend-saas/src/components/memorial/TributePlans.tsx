"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { PaymentInterface } from '@/components/payments/PaymentInterface';

interface TributePlansProps {
    currentPlan: string;
    uuid?: string;
    petName?: string;
    t: (key: string) => string;
    isDark?: boolean;
    onFreeSelect?: () => void;
    showFree?: boolean;
    locale?: string;
    showCurrent?: boolean;
}

export const TributePlans: React.FC<TributePlansProps> = ({
    currentPlan,
    uuid,
    petName,
    t,
    isDark = true,
    onFreeSelect,
    showFree = false,
    locale = 'es',
    showCurrent = false
}) => {
    const planName = currentPlan.toUpperCase().trim();
    const isEn = locale === 'en';

    // Map internal IDs to the "Reference Image" names
    const plans = [
        {
            id: 'FREE',
            name: t('plan_free_name'),
            subtitle: t('plan_free_concept'),
            priceCLP: '$0',
            priceUSD: '0',
            productId: '',
            features: [
                t('plan_free_f1'),
                t('plan_free_f2'),
                t('plan_free_f3')
            ],
            buttonText: t('plan_btn_start') || 'START',
            highlight: false
        },
        {
            id: 'NORMAL',
            name: t('plan_basic_name'),
            subtitle: t('plan_basic_concept'),
            priceCLP: '$5.990',
            priceUSD: '7',
            productId: 'PLACEHOLDER_HUELLA_ID',
            features: [
                t('plan_basic_f1'),
                t('plan_basic_f2'),
                t('plan_basic_f3')
            ],
            buttonText: t('plan_btn_start') || 'START',
            highlight: false
        },
        {
            id: 'PRO',
            name: t('plan_mid_name'),
            subtitle: t('plan_mid_concept'),
            priceCLP: '$14.990',
            priceUSD: '17',
            productId: '1651066b-559e-4682-a8f1-608e48ff6675',
            features: [
                t('plan_mid_f1'),
                t('plan_mid_f2'),
                t('plan_mid_f3')
            ],
            buttonText: t('plan_btn_start') || 'START',
            highlight: true,
            popular: true
        },
        {
            id: 'ULTRA',
            name: t('plan_premium_name'),
            subtitle: t('plan_premium_concept'),
            priceCLP: '$19.990',
            priceUSD: '22',
            productId: 'dd0e2fd6-aae7-4910-8c11-f3033c9462de',
            features: [
                t('plan_premium_f1'),
                t('plan_premium_f2'),
                t('plan_premium_f3')
            ],
            buttonText: t('plan_btn_start') || 'START',
            highlight: false
        }
    ];

    const ranks: Record<string, number> = { 'NONE': -1, 'FREE': 0, 'NORMAL': 1, 'PRO': 2, 'ULTRA': 3 };
    const currentRank = ranks[planName] ?? -1;

    const filteredPlans = plans.filter(p => {
        if (showFree && p.id === 'FREE') return true;
        if (showCurrent) return true; // Show all plans, just disable/mark current
        return ranks[p.id] > currentRank;
    });

    if (filteredPlans.length === 0) return null;

    return (
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 font-sans">
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch`}>
                {filteredPlans.map((plan, i) => {
                    const isHighlighted = plan.highlight;
                    const isCurrent = plan.id === planName;
                    const priceDisplay = isEn && plan.id !== 'FREE' ? `$${plan.priceUSD}` : (plan.id === 'FREE' ? 'Free' : plan.priceCLP);

                    return (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative flex flex-col h-full bg-white rounded-[2rem] p-8 transition-all duration-300
                                ${isHighlighted
                                    ? 'border-2 border-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.15)] scale-[1.02] z-10'
                                    : 'border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:scale-[1.01]'
                                }
                            `}
                        >
                            {/* Top Decor Icon */}
                            <div className="flex justify-center mb-6">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${isHighlighted ? 'bg-sky-50 text-sky-500' : 'bg-slate-50 text-slate-300'}`}>
                                    <Sparkles size={24} strokeWidth={1.5} />
                                </div>
                            </div>

                            {/* Title & Subtitle */}
                            <div className="text-center mb-8 space-y-3">
                                <h3 className="text-2xl font-serif font-bold text-slate-900">
                                    {plan.name}
                                </h3>
                                <p className="text-xs text-slate-400 font-light leading-relaxed px-2 min-h-[2.5em]">
                                    {plan.subtitle}
                                </p>
                            </div>

                            {/* Price */}
                            <div className="text-center mb-8">
                                <div className={`text-4xl font-serif font-bold ${isHighlighted ? 'text-sky-600' : 'text-slate-800'}`}>
                                    {priceDisplay}
                                </div>
                                <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {plan.id === 'ULTRA' ? t('plan_duration_2years') : t('plan_duration_annual')}
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-10 flex-1 px-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm font-light text-slate-500">
                                        <Check size={16} className={`mt-0.5 shrink-0 ${isHighlighted ? 'text-sky-400' : 'text-slate-300'}`} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Action Button */}
                            <div className="mt-auto">
                                {isCurrent ? (
                                    <button
                                        disabled
                                        className="w-full py-4 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] bg-slate-100 text-slate-400 cursor-not-allowed"
                                    >
                                        {t('plan_current_btn') || 'CURRENT PLAN'}
                                    </button>
                                ) : plan.id === 'FREE' ? (
                                    <button
                                        onClick={onFreeSelect}
                                        className={`w-full py-4 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-300 shadow-lg hover:translate-y-[-2px]
                                            ${isHighlighted
                                                ? 'bg-sky-200 text-sky-900 hover:bg-sky-300 shadow-sky-200/50'
                                                : 'bg-sky-100 text-sky-700 hover:bg-sky-200 shadow-sky-100/50'
                                            }`}
                                    >
                                        {plan.buttonText}
                                    </button>
                                ) : (
                                    <PaymentInterface
                                        productId={plan.productId}
                                        targetResource={uuid ? "memorial" : "tenant"}
                                        targetId={uuid || "new_registration"}
                                        action={uuid ? `upgrade_to_${plan.id.toLowerCase()}` : "subscription_start"}
                                        buttonText={plan.buttonText}
                                        isDark={false} // Force light mode for these cards
                                        variant="consecration"
                                        successUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/success?type=memorial&id=${uuid || 'new'}&plan=${plan.id}`}
                                        className={`w-full py-4 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-300 shadow-lg hover:translate-y-[-2px]
                                            ${isHighlighted
                                                ? 'bg-sky-200 text-sky-900 hover:bg-sky-300 shadow-sky-200/50'
                                                : 'bg-sky-100 text-sky-700 hover:bg-sky-200 shadow-sky-100/50'
                                            }`}
                                    />
                                )}
                            </div>

                            {/* Current Plan Badge (Absolute) */}
                            {isCurrent && showCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-slate-800 text-white shadow-lg">
                                    {t('plan_current')}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
