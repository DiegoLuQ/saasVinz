"use client";

import React, { useRef, useState } from 'react';
import { Download, Share2, Instagram, Loader2, X } from 'lucide-react';
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

export default function SocialShareCard({ memorial, mascota, tenant_info, locale, externalBtnClass, mainImage }: SocialShareCardProps) {
    const t = getTranslations(locale);
    const exportRef = useRef<HTMLDivElement>(null);
    const [ratio, setRatio] = useState<'9:16' | '3:4'>('9:16');
    const [showPreview, setShowPreview] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Initial hook setup
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

    // We can use the same getProxiedUrl from the hook for consistent behavior
    // but the hook is inside the component, so we pass it down or use it here.

    return (
        <>
            {/* Fonts for Download - Load globally with CORS support */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Marcellus&family=Outfit:wght@300;600&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&family=Montserrat:wght@300;600&family=Pinyon+Script&display=swap" rel="stylesheet" crossOrigin="anonymous" />

            {/* Action Button */}
            <button
                onClick={() => setShowPreview(true)}
                className={externalBtnClass || "px-8 py-4 bg-white/5 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2 backdrop-blur-md group whitespace-nowrap min-w-[200px]"}
            >
                <Share2 size={14} className="group-hover:scale-110 transition-transform text-primary" />
                {t.mem_download}
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {showPreview && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 0.95, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-[#0f172a] border border-white/10 rounded-[2rem] p-3 md:p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto md:overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-start md:justify-center transform-gpu"
                            >
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="absolute top-3 right-3 p-2 bg-white/10 border border-white/20 rounded-full text-white hover:bg-white/20 hover:border-white/40 transition-all z-50 group hover:scale-110"
                                >
                                    <X size={20} className="text-white" />
                                </button>

                                {/* Left Side: Preview Section */}
                                <div className="flex flex-col items-center gap-6 relative z-10 w-full md:w-auto">
                                    <div className="text-center space-y-2 mt-4 md:mt-[50px]">
                                        <h3 className="text-2xl font-serif text-[#D4AF37] font-medium tracking-wide">{t.preview_title}</h3>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest">
                                            {previewText}
                                        </p>
                                    </div>

                                    {/* Scaled Preview Wrapper */}
                                    <div className="relative transform-gpu scale-[0.65] origin-top h-[380px] md:h-[400px] flex items-start justify-center">
                                        <div className="relative group perspective-1000">
                                            <div
                                                className="relative bg-black shadow-[0_25px_50px_rgba(0,0,0,0.7)] border border-white/10 overflow-hidden transform-gpu transition-transform duration-500 group-hover:rotate-y-2 group-hover:rotate-x-2"
                                                style={{
                                                    width: ratio === '9:16' ? '320px' : '400px',
                                                    height: ratio === '9:16' ? '569px' : '533px',
                                                }}
                                            >
                                                {/* Live Preview (Simplified) */}
                                                <div className="absolute inset-0">
                                                    {(mainImage || mascota?.image_url) ? (
                                                        <img
                                                            src={mainImage || mascota.image_url}
                                                            alt={mascota?.name}
                                                            className="w-full h-full object-cover opacity-100"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-stone-900" />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
                                                </div>

                                                {/* Overlay Information (Simplified for preview) */}
                                                <div className="absolute inset-0 p-8 flex flex-col items-center text-center justify-between border-[1.5px] border-[#D4AF37]/40 m-4">
                                                    <div className="pt-2 flex flex-col items-center gap-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
                                                        <p className="text-[#D4AF37] text-[10px] uppercase tracking-[0.4em] font-black">
                                                            An Eternal Memory
                                                        </p>
                                                        <p className="text-white/90 text-[13px] font-serif font-bold italic mb-2">
                                                            {mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : ''} — {mascota?.death_date ? new Date(mascota.death_date).getFullYear() : ''}
                                                        </p>
                                                        <h1 className="text-5xl font-bold text-white tracking-tight leading-none" style={{ fontFamily: 'Cinzel, serif', textShadow: '0 2px 10px rgba(0,0,0,1)' }}>
                                                            {mascota?.name}
                                                        </h1>
                                                    </div>
                                                    <div className="flex-grow" />
                                                    <div className="pb-2 space-y-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                                        <p className="text-white text-[9px] uppercase tracking-[0.3em] font-black opacity-90">A Tribute From</p>
                                                        <p className="text-[#D4AF37] text-sm font-black tracking-widest uppercase">{tenant_info?.name || 'Huellas del Norte'}</p>
                                                        <p className="text-white/60 text-[8px] mt-1 font-bold">
                                                            {tenant_info?.instagram_handle ? `@${tenant_info.instagram_handle.replace('@', '')}` : '♥ Un Angel en el Cielo ♥'}
                                                        </p>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* Reflection Effect */}
                                            <div className="absolute -bottom-10 left-0 right-0 h-10 bg-gradient-to-b from-white/5 to-transparent blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Design Controls */}
                                <div className="w-full md:w-[320px] space-y-8 relative z-10 pl-0 md:pl-8 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0">

                                    {/* Format Selection */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-black flex items-center gap-2">
                                            <span className="w-8 h-px bg-white/10"></span>
                                            {t.preview_format}
                                            <span className="w-full h-px bg-white/10"></span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setRatio('9:16')}
                                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 group ${ratio === '9:16'
                                                    ? 'bg-white/10 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                                                    : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <div className={`w-6 h-10 border-2 rounded-sm transition-colors ${ratio === '9:16' ? 'border-[#D4AF37]' : 'border-white/20 group-hover:border-white/40'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-wider ${ratio === '9:16' ? 'text-[#D4AF37]' : 'text-white/40'}`}>Stories</span>
                                            </button>
                                            <button
                                                onClick={() => setRatio('3:4')}
                                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 group ${ratio === '3:4'
                                                    ? 'bg-white/10 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                                                    : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <div className={`w-8 h-8 border-2 rounded-sm transition-colors ${ratio === '3:4' ? 'border-[#D4AF37]' : 'border-white/20 group-hover:border-white/40'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-wider ${ratio === '3:4' ? 'text-[#D4AF37]' : 'text-white/40'}`}>Post</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Download Action */}
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-white/5 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                                <Instagram size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h4 className="text-white text-xs font-bold">Ready for Instagram</h4>
                                                <p className="text-[10px] text-white/50">Optimized format for maximum quality.</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleDownload}
                                            disabled={isGenerating}
                                            className="w-full py-4 bg-[#D4AF37] hover:bg-[#b5932a] text-black rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:shadow-[0_15px_30px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={16} className="group-hover:scale-110 transition-transform" />
                                                    {t.preview_download_btn}
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

            {/* Hidden Export Container - Matching base proportions exactly */}
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
    // Use the proxy helper from the hook passed down as prop
    const bgImage = getProxiedUrl ? getProxiedUrl(rawImage) : rawImage;

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden font-sans" style={{ backgroundColor: bgColor }}>
            {isAltar && <LayoutAltar memorial={memorial} mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} />}
            {isCarta && <LayoutCarta mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} isPost={isPost} isStories={isStories} />}
            {isEditorial && <LayoutEditorial mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} isPost={isPost} isStories={isStories} />}

            {/* Fallback to Polaroid (Standard) layout if none of the specific layouts match */}
            {!isAltar && !isCarta && !isEditorial && (
                <LayoutPolaroid mascota={mascota} tenant_info={tenant_info} locale={locale} bgImage={bgImage} isStories={isStories} />
            )}
        </div>
    );
}
