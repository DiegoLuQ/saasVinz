'use client';

import React, { useState } from 'react';
import FreeMemorialModal from '../contact/FreeMemorialModal';
import { getTranslations, type Locale } from '@/lib/translations';
import { TributePlans } from '../memorial/TributePlans';

interface PricingSectionProps {
    locale?: Locale;
}

export const PricingSection = ({ locale = 'es' }: PricingSectionProps) => {
    const [showFreeModal, setShowFreeModal] = useState(false);
    const t = getTranslations(locale);

    return (
        <section id="planes" className="relative py-28 px-6 overflow-hidden bg-slate-50 border-y border-slate-100">
            {/* Top Gradient */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 to-transparent z-10 pointer-events-none" />

            <FreeMemorialModal
                isOpen={showFreeModal}
                onClose={() => setShowFreeModal(false)}
                locale={locale}
            />

            <div className="relative z-10 max-w-6xl mx-auto">
                <TributePlans
                    currentPlan="NONE"
                    showFree={true}
                    onFreeSelect={() => setShowFreeModal(true)}
                    t={(key) => (t as any)[key]}
                    isDark={false}
                    petName=""
                    locale={locale}
                />

                {/* Optional Help Footer - kept from original if needed */}
                <div className="text-center mt-8 space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.4em] font-medium text-slate-400">
                        {t.pricing_footer}
                    </p>
                    <a
                        href="https://wa.me/56930245084?text=Hola,%20tengo%20dudas%20sobre%20los%20planes%20de%20memorial."
                        className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 hover:text-blue-500 transition-colors duration-300 hover:underline"
                    >
                        {t.pricing_help}
                    </a>
                </div>
            </div>

            {/* Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent z-10 pointer-events-none" />
        </section>
    );
};
