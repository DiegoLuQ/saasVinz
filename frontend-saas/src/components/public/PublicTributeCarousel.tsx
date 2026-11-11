"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Check,
    Download,
    Heart,
    Loader2,
    Share2,
    Sparkles,
} from 'lucide-react';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';
import PublicAiDesignCard, { type PublicAiDesignData } from '@/components/public/PublicAiDesignCard';

interface PublicTributeCarouselProps {
    farewellConfig: any | null;
    aiDesign?: PublicAiDesignData | null;
    petName: string;
    isDarkMode: boolean;
    variant?: 'central' | 'compact';
    cardExportRef: React.RefObject<HTMLDivElement | null>;
    isDownloadingCard: boolean;
    onDownloadCard: () => void;
    copiedLink?: boolean;
    onShare?: () => void;
}

export default function PublicTributeCarousel({
    farewellConfig,
    aiDesign,
    petName,
    isDarkMode,
    variant = 'compact',
    cardExportRef,
    isDownloadingCard,
    onDownloadCard,
    copiedLink = false,
    onShare,
}: PublicTributeCarouselProps) {
    const [slide, setSlide] = useState<0 | 1>(0);

    const hasFarewell = !!farewellConfig;
    const hasDesign = !!aiDesign;

    if (!hasFarewell && !hasDesign) return null;

    if (!hasFarewell && aiDesign) {
        return (
            <PublicAiDesignCard
                design={aiDesign}
                petName={petName}
                isDarkMode={isDarkMode}
                variant={variant}
            />
        );
    }

    const isCentral = variant === 'central';
    const hasBoth = hasFarewell && hasDesign;
    const activeSlide: 0 | 1 = hasBoth ? slide : 0;

    // Dimensiones del homenaje conmemorativo según formato guardado
    const baseHeight = 550;
    const fmt = farewellConfig?.format || '3:4';
    let dims = { width: baseHeight * (3 / 4), height: baseHeight };
    if (fmt === '9:16') dims = { width: baseHeight * (9 / 16), height: baseHeight };
    else if (fmt === '3:4') dims = { width: baseHeight * (3 / 4), height: baseHeight };
    else if (fmt === '4:3') dims = { width: baseHeight, height: baseHeight * (3 / 4) };
    else if (fmt === '1:1') dims = { width: baseHeight, height: baseHeight };

    const targetWidth = isCentral ? 340 : 260;
    const scale = Math.min(isCentral ? 0.76 : 0.58, targetWidth / dims.width);

    const cardSurface =
        activeSlide === 1
            ? isDarkMode
                ? 'bg-[#0f1a35]/65 border-violet-400/25'
                : 'bg-gradient-to-br from-violet-50/70 via-white to-amber-50/30 border-violet-200/80 shadow-md shadow-violet-500/5'
            : isDarkMode
                ? isCentral
                    ? 'bg-[#0f1a35]/70 border-amber-500/30 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]'
                    : 'bg-[#0f1a35]/60 border-amber-500/30'
                : isCentral
                    ? 'bg-gradient-to-b from-white/95 via-amber-50/40 to-white/95 border-amber-200/90 shadow-[0_20px_50px_-15px_rgba(217,119,6,0.1)]'
                    : 'bg-gradient-to-br from-amber-50/70 to-white border-amber-200/80 shadow-md shadow-amber-500/5';

    return (
        <div
            className={`${
                isCentral ? 'p-6 sm:p-8 rounded-[2.5rem] shadow-xl' : 'p-5 rounded-[2rem]'
            } border backdrop-blur-md transition-all duration-300 flex flex-col items-center text-center overflow-hidden ${cardSurface}`}
        >
            {/* Target HD offscreen siempre montado para exportar aunque esté en el otro slide */}
            {farewellConfig && (
                <div
                    style={{
                        position: 'fixed',
                        left: '-9999px',
                        top: '-9999px',
                        width: `${dims.width}px`,
                        height: `${dims.height}px`,
                        pointerEvents: 'none',
                        zIndex: -999,
                    }}
                >
                    <FarewellPreview ref={cardExportRef} config={farewellConfig} />
                </div>
            )}

            {/* Controles del carrusel cuando existen ambos recuerdos */}
            {hasBoth && (
                <div
                    className={`w-full flex items-center justify-center pb-3 mb-4 border-b ${
                        isDarkMode ? 'border-white/10' : 'border-black/5'
                    }`}
                >
                    <div className="flex items-center gap-1 p-1 rounded-full bg-black/5 dark:bg-white/5">
                        <button
                            type="button"
                            onClick={() => setSlide(0)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                activeSlide === 0
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : isDarkMode
                                        ? 'text-slate-400 hover:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Sparkles size={11} />
                            <span>Homenaje</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSlide(1)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                activeSlide === 1
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : isDarkMode
                                        ? 'text-slate-400 hover:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Heart size={11} />
                            <span>Recuerdo</span>
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, x: activeSlide === 1 ? 14 : -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: activeSlide === 1 ? -14 : 14 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="w-full"
                >
                    {activeSlide === 0 ? (
                <div className="flex flex-col items-center text-center w-full">
                    <div
                        className={
                            isCentral
                                ? 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mb-5'
                                : 'flex items-center gap-2 mb-3'
                        }
                    >
                        <Sparkles size={isCentral ? 14 : 16} className="text-amber-500" />
                        <span
                            className={`text-[11px] uppercase tracking-wider ${
                                isCentral
                                    ? 'font-black'
                                    : 'font-bold text-amber-700 dark:text-amber-300'
                            }`}
                        >
                            Homenaje Conmemorativo
                        </span>
                    </div>

                    {/* Visual Scaled Card */}
                    <div
                        style={{
                            width: `${dims.width * scale}px`,
                            height: `${dims.height * scale}px`,
                        }}
                        className={`rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30 relative flex-shrink-0 bg-black/40 ${
                            isCentral ? 'my-2' : 'my-1'
                        }`}
                    >
                        <div
                            style={{
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                                width: `${dims.width}px`,
                                height: `${dims.height}px`,
                            }}
                            className="absolute inset-0"
                        >
                            <FarewellPreview config={farewellConfig} />
                        </div>
                    </div>

                    <p
                        className={`italic mt-3 ${
                            isCentral
                                ? 'text-xs text-slate-500 dark:text-neutral-400 max-w-md'
                                : 'text-[11px] text-slate-500 dark:text-slate-400 mt-2.5'
                        }`}
                    >
                        {isCentral
                            ? `Inmortalizando con amor la memoria y el legado de ${petName}.`
                            : `Inmortalizando la memoria de ${petName}.`}
                    </p>

                    {isCentral && onShare ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6 pt-5 border-t border-amber-500/15">
                            <button
                                type="button"
                                onClick={onDownloadCard}
                                disabled={isDownloadingCard}
                                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                            >
                                {isDownloadingCard ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Generando en HD...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        <span>Descargar Recuerdo (HD)</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={onShare}
                                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                                    copiedLink
                                        ? 'bg-sky-500 text-white border-sky-500'
                                        : isDarkMode
                                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                                            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm'
                                }`}
                            >
                                {copiedLink ? (
                                    <>
                                        <Check size={16} />
                                        <span>¡Enlace Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <Share2 size={16} />
                                        <span>Compartir</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onDownloadCard}
                            disabled={isDownloadingCard}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                        >
                            {isDownloadingCard ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>Generando en HD...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={15} />
                                    <span>Guardar / Descargar (HD)</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            ) : (
                aiDesign && (
                    <PublicAiDesignCard
                        design={aiDesign}
                        petName={petName}
                        isDarkMode={isDarkMode}
                        variant={variant}
                        embedded={true}
                    />
                )
            )}
                </motion.div>
            </AnimatePresence>

            {/* Indicadores inferiores de carrusel */}
            {hasBoth && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    {[0, 1].map((idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setSlide(idx as 0 | 1)}
                            aria-label={idx === 0 ? 'Ver Homenaje Conmemorativo' : 'Ver Recuerdo Especial'}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                                activeSlide === idx
                                    ? `w-6 ${idx === 0 ? 'bg-amber-500' : 'bg-violet-500'}`
                                    : `w-2 ${isDarkMode ? 'bg-white/20 hover:bg-white/40' : 'bg-black/15 hover:bg-black/30'}`
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

