"use client";

import React, { useRef, useState } from 'react';
import { Download, Share2, Instagram, Loader2, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTranslations, type Locale } from '@/lib/translations';
import { createPortal } from 'react-dom';

import { useCardTheme } from './social-card/useCardTheme';
import { useSocialCardGenerator } from './social-card/useSocialCardGenerator';
import LayoutAltar from './social-card/layouts/LayoutAltar';
import LayoutEditorial from './social-card/layouts/LayoutEditorial';
import LayoutCarta from './social-card/layouts/LayoutCarta';
import LayoutPolaroid from './social-card/layouts/LayoutPolaroid';

interface SocialShareCardProps {
    memorial: any;
    mascota: any;
    tenant_info: any;
    locale: Locale;
    externalBtnClass?: string;
    mainImage?: string;
}

export default function SocialShareCard({
    memorial,
    mascota,
    tenant_info,
    locale,
    externalBtnClass,
    mainImage
}: SocialShareCardProps) {
    const t = getTranslations(locale);
    const exportRef = useRef<HTMLDivElement>(null);
    const [ratio, setRatio] = useState<'9:16' | '3:4'>('9:16');
    const [showPreview, setShowPreview] = useState(false);
    const [mounted, setMounted] = useState(false);

    const { generateCard, isGenerating, getProxiedUrl } = useSocialCardGenerator({
        fileNamePrefix: mascota?.name || 'memorial',
        metrics: { ratio }
    });

    React.useEffect(() => {
        setMounted(true);
        window.dispatchEvent(new CustomEvent('paw-modal-toggle', { detail: showPreview }));
    }, [showPreview]);

    const layoutType = memorial?.diseno?.tipo_diseno || 'normal';

    const handleDownload = () => {
        if (!exportRef.current) return;
        generateCard(exportRef.current);
    };

    const isStories = ratio === '9:16';
    const isPost = ratio === '3:4';
    const previewText = ratio === '9:16' ? t.preview_subtitle_story : t.preview_subtitle_post;

    const birthYear = mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '';
    const deathYear = mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '';
    const lifeYearsText = birthYear || deathYear ? `${birthYear || '…'} — ${deathYear || '…'}` : '';

    return (
        <>
            {/* Fonts for Download */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Marcellus&family=Outfit:wght@300;600&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&family=Montserrat:wght@300;600&family=Pinyon+Script&display=swap" rel="stylesheet" crossOrigin="anonymous" />

            {/* Action Button */}
            <button
                onClick={() => setShowPreview(true)}
                className={externalBtnClass || "px-8 py-4 bg-white/5 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2 backdrop-blur-md group whitespace-nowrap min-w-[200px]"}
            >
                <Share2 size={14} className="group-hover:scale-110 transition-transform text-[#D4AF37]" />
                {t.mem_download || "Tarjeta Conmemorativa"}
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {showPreview && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-[#0b1022] border border-amber-500/20 rounded-[2.5rem] p-4 sm:p-7 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-start md:justify-center transform-gpu"
                            >
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="absolute top-4 right-4 p-2.5 bg-white/10 border border-white/20 rounded-full text-white hover:bg-white/20 hover:border-white/40 transition-all z-50 group hover:scale-110"
                                >
                                    <X size={18} className="text-white" />
                                </button>

                                {/* Left Side: Preview Section */}
                                <div className="flex flex-col items-center gap-4 relative z-10 w-full md:w-auto">
                                    <div className="text-center space-y-1 mt-2">
                                        <h3 className="text-xl sm:text-2xl font-serif text-[#D4AF37] font-bold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
                                            {t.preview_title || "Vista Previa"}
                                        </h3>
                                        <p className="text-[11px] text-amber-100/70 uppercase tracking-widest font-sans font-semibold">
                                            {previewText || "Tu tarjeta lista para compartir"}
                                        </p>
                                    </div>

                                    {/* Scaled Preview Wrapper */}
                                    <div className="relative transform-gpu scale-[0.68] sm:scale-[0.72] origin-top h-[390px] sm:h-[420px] flex items-start justify-center">
                                        <div className="relative group perspective-1000">
                                            <div
                                                className="relative bg-black shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-amber-400/30 overflow-hidden transform-gpu rounded-2xl"
                                                style={{
                                                    width: ratio === '9:16' ? '320px' : '390px',
                                                    height: ratio === '9:16' ? '569px' : '520px',
                                                }}
                                            >
                                                {/* Live Preview Background Image */}
                                                <div className="absolute inset-0">
                                                    {(mainImage || mascota?.image_url) ? (
                                                        <img
                                                            src={mainImage || mascota.image_url}
                                                            alt={mascota?.name}
                                                            className="w-full h-full object-cover opacity-90"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-stone-900" />
                                                    )}
                                                    {/* Warm atmospheric overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/70" />
                                                </div>

                                                {/* Overlay Information in 100% Spanish */}
                                                <div className="absolute inset-0 p-7 flex flex-col items-center text-center justify-between border-[1.5px] border-[#D4AF37]/40 m-3.5 rounded-xl">
                                                    <div className="pt-2 flex flex-col items-center gap-1 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                                                        <span className="text-[#fde68a] text-[10px] uppercase tracking-[0.4em] font-sans font-black flex items-center gap-1.5">
                                                            <span className="text-[#D4AF37] text-xs leading-none">♥</span>
                                                            {t.altar_eternal_memory || "Un Recuerdo Eterno"}
                                                        </span>

                                                        {lifeYearsText && (
                                                            <p className="text-white/90 text-xs font-serif font-bold italic mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
                                                                {lifeYearsText}
                                                            </p>
                                                        )}

                                                        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wide leading-tight mt-1" style={{ fontFamily: 'Cinzel, serif', textShadow: '0 3px 12px rgba(0,0,0,0.9)' }}>
                                                            {mascota?.name}
                                                        </h1>

                                                        <p className="text-[11px] text-amber-200/90 italic font-serif mt-1 max-w-[240px]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                                                            “Siempre vivirás en nuestros corazones”
                                                        </p>
                                                    </div>

                                                    <div className="flex-grow" />

                                                    <div className="pb-2 space-y-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                                                        <p className="text-white/70 text-[9px] uppercase tracking-[0.3em] font-sans font-bold">
                                                            {t.preview_tribute_from || "Un Homenaje de"}
                                                        </p>
                                                        <p className="text-[#D4AF37] text-xs font-black tracking-widest uppercase font-serif" style={{ fontFamily: 'Cinzel, serif' }}>
                                                            {tenant_info?.name || 'Santuario de Recuerdos'}
                                                        </p>
                                                        <p className="text-white/60 text-[8px] mt-0.5 font-bold font-sans">
                                                            {tenant_info?.instagram_handle ? `@${tenant_info.instagram_handle.replace('@', '')}` : '✦ Un Ángel en el Cielo ✦'}
                                                        </p>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* Reflection Effect */}
                                            <div className="absolute -bottom-8 left-0 right-0 h-8 bg-gradient-to-b from-amber-400/10 to-transparent blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Design Controls */}
                                <div className="w-full md:w-[320px] space-y-6 relative z-10 pl-0 md:pl-8 border-t md:border-t-0 md:border-l border-white/10 pt-5 md:pt-0">

                                    {/* Format Selection */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase tracking-widest text-white/50 font-black flex items-center gap-2">
                                            <span className="w-6 h-px bg-white/15"></span>
                                            {t.preview_format || "Elige Formato"}
                                            <span className="w-full h-px bg-white/15"></span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setRatio('9:16')}
                                                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${ratio === '9:16'
                                                    ? 'bg-amber-500/15 border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)] text-white'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'}`}
                                            >
                                                <div className={`w-5 h-9 border-2 rounded-sm transition-colors ${ratio === '9:16' ? 'border-[#D4AF37]' : 'border-white/30'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${ratio === '9:16' ? 'text-[#D4AF37]' : 'text-white/60'}`}>
                                                    Historias (9:16)
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRatio('3:4')}
                                                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${ratio === '3:4'
                                                    ? 'bg-amber-500/15 border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)] text-white'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'}`}
                                            >
                                                <div className={`w-7 h-8 border-2 rounded-sm transition-colors ${ratio === '3:4' ? 'border-[#D4AF37]' : 'border-white/30'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${ratio === '3:4' ? 'text-[#D4AF37]' : 'text-white/60'}`}>
                                                    Publicación (3:4)
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Social media optimization note */}
                                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-white/10 flex items-center gap-3.5">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-sm">
                                            <Instagram size={18} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-white text-xs font-bold">
                                                {t.preview_ready_insta || "Listo para Redes Sociales"}
                                            </h4>
                                            <p className="text-[10px] text-white/60 leading-snug">
                                                {t.preview_quality || "Formato optimizado en alta resolución."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Download Action */}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            disabled={isGenerating}
                                            className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_35px_rgba(212,175,55,0.45)] disabled:opacity-50 disabled:cursor-not-allowed group"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin text-slate-950" />
                                                    {t.preview_generating || "Generando Tarjeta..."}
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={16} className="group-hover:scale-110 transition-transform" />
                                                    {t.preview_download_btn || "Descargar Tarjeta"}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Hidden Export Container */}
            {showPreview && (
                <div
                    ref={exportRef}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: ratio === '9:16' ? '320px' : '400px',
                        height: ratio === '9:16' ? '569px' : '533px',
                        zIndex: -100,
                        opacity: 0.01,
                        pointerEvents: 'none',
                        backgroundColor: '#ffffff',
                        visibility: 'visible',
                    }}
                >
                    <CardContent
                        ratio={ratio}
                        layoutType={layoutType}
                        memorial={memorial}
                        mascota={mascota}
                        tenant_info={tenant_info}
                        locale={locale}
                        mainImage={mainImage}
                        getProxiedUrl={getProxiedUrl}
                    />
                </div>
            )}
        </>
    );
}

function CardContent({ ratio, layoutType, memorial, mascota, tenant_info, locale, mainImage, getProxiedUrl }: any) {
    const {
        bgColor,
        isEditorial,
        isCarta,
        isAltar,
        isStories,
        isPost
    } = useCardTheme({ memorial, layoutType, ratio });

    const rawImage = mainImage || memorial?.main_image_url || mascota?.image_url;
    const bgImage = getProxiedUrl ? getProxiedUrl(rawImage) : rawImage;

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden font-sans" style={{ backgroundColor: bgColor }}>
            {isAltar && <LayoutAltar memorial={memorial} mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} />}
            {isCarta && <LayoutCarta mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} isPost={isPost} isStories={isStories} />}
            {isEditorial && <LayoutEditorial mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} isPost={isPost} isStories={isStories} />}

            {!isAltar && !isCarta && !isEditorial && (
                <LayoutPolaroid mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} isStories={isStories} />
            )}
        </div>
    );
}
