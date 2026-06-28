"use client";

import React from 'react';
import { Star, Share2 } from 'lucide-react';
import SocialShareCard from './SocialShareCard';
import { type Locale } from '@/lib/translations';

interface MemorialActionButtonsProps {
    onSendKiss: (e: React.MouseEvent) => void;
    onShare: () => void;
    memorial: any;
    mascota: any;
    tenant_info: any;
    locale: Locale;
    t: any;
    mainImage?: string;
}

export default function MemorialActionButtons({
    onSendKiss,
    onShare,
    memorial,
    mascota,
    tenant_info,
    locale,
    t,
    mainImage
}: MemorialActionButtonsProps) {
    return (
        <div className="flex flex-wrap justify-center gap-3 w-full">
            {/* Send Kiss Button (Greeting to Heaven) */}
            <button
                onClick={onSendKiss}
                className="px-6 py-3 bg-white/80 dark:bg-white/10 backdrop-blur-md text-slate-800 dark:text-white rounded-full font-semibold text-xs tracking-wider shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:bg-white dark:hover:bg-white/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 border border-slate-200/50 dark:border-white/10"
            >
                <Star size={14} className="text-[#c5a059]" fill="currentColor" />
                {t.mem_send_kiss || "Greeting to heaven"}
            </button>

            {/* Share Button */}
            <button
                onClick={onShare}
                className="px-6 py-3 bg-white/80 dark:bg-white/10 backdrop-blur-md text-slate-800 dark:text-white rounded-full font-semibold text-xs tracking-wider shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:bg-white dark:hover:bg-white/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 border border-slate-200/50 dark:border-white/10"
            >
                <Share2 size={14} className="opacity-70" />
                {t.mem_share}
            </button>

            {/* Download Button (SocialShareCard) */}
            <SocialShareCard
                memorial={memorial}
                mascota={mascota}
                tenant_info={tenant_info}
                locale={locale}
                externalBtnClass="px-6 py-3 bg-white/80 dark:bg-white/10 backdrop-blur-md text-slate-800 dark:text-white rounded-full font-semibold text-xs tracking-wider shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:bg-white dark:hover:bg-white/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 border border-slate-200/50 dark:border-white/10"
                mainImage={mainImage}
            />
        </div>
    );
}
