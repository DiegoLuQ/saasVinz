"use client";

import React, { useState } from 'react';
import { Star, Share2, Download, Loader2 } from 'lucide-react';
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
    const [downloadingImg, setDownloadingImg] = useState(false);

    const handleDownloadPortrait = async () => {
        const targetUrl = mainImage || memorial?.main_image_url || mascota?.image_url || memorial?.imagen_portada;
        if (!targetUrl || downloadingImg) return;

        setDownloadingImg(true);
        const safeName = (mascota?.name || 'Memorial').toString().replace(/[^a-zA-Z0-9_-]/g, '_');

        try {
            const proxyUrl = targetUrl.startsWith('http')
                ? `/api/image-proxy?url=${encodeURIComponent(targetUrl)}`
                : targetUrl;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error('Proxy failed');
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Retrato_${safeName}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            // Fallback opening in new tab if CORS blocks direct blob
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } finally {
            setDownloadingImg(false);
        }
    };

    const btnClass =
        "px-5 py-3 bg-white/85 dark:bg-white/10 backdrop-blur-md text-slate-800 dark:text-white rounded-full font-semibold text-xs tracking-wider shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:bg-white dark:hover:bg-white/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 border border-slate-200/60 dark:border-white/15";

    return (
        <div className="flex flex-wrap justify-center gap-2.5 w-full">
            {/* Send Kiss Button (Greeting to Heaven) */}
            <button
                onClick={onSendKiss}
                className={btnClass}
            >
                <Star size={14} className="text-[#c5a059]" fill="currentColor" />
                {t.mem_send_kiss || "Saludo al cielo"}
            </button>

            {/* Share Button */}
            <button
                onClick={onShare}
                className={btnClass}
            >
                <Share2 size={14} className="opacity-70" />
                {t.mem_share}
            </button>

            {/* Direct Cover Portrait Download */}
            {(mainImage || memorial?.main_image_url || mascota?.image_url) && (
                <button
                    onClick={handleDownloadPortrait}
                    disabled={downloadingImg}
                    title={locale === 'en' ? 'Download cover portrait' : 'Descargar imagen de portada'}
                    className={btnClass}
                >
                    {downloadingImg ? (
                        <Loader2 size={14} className="animate-spin text-[#c5a059]" />
                    ) : (
                        <Download size={14} className="text-[#c5a059]" />
                    )}
                    {locale === 'en' ? 'Download Photo' : 'Descargar Imagen'}
                </button>
            )}

            {/* Commemorative Card Download (SocialShareCard) */}
            <SocialShareCard
                memorial={memorial}
                mascota={mascota}
                tenant_info={tenant_info}
                locale={locale}
                externalBtnClass={btnClass}
                mainImage={mainImage}
            />
        </div>
    );
}
