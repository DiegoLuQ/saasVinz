"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

interface CarouselConfig {
    enabled?: boolean;
    images?: string[];
    transition?: 'fade' | 'slide' | 'zoom' | string;
    borderRadius?: string;
    ctaText?: string;
    ctaUrl?: string;
}

interface VinzerCarouselProps {
    config?: CarouselConfig;
    theme?: string;
}

export default function VinzerCarousel({ config, theme = 'dark' }: VinzerCarouselProps) {
    const images = (config?.images || []).filter((img) => typeof img === 'string' && img.trim().length > 0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [direction, setDirection] = useState(1); // 1 = next, -1 = prev

    const nextSlide = useCallback(() => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % (images.length || 1));
    }, [images.length]);

    const prevSlide = useCallback(() => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + (images.length || 1)) % (images.length || 1));
    }, [images.length]);

    // Auto-advance
    useEffect(() => {
        if (!config?.enabled || images.length <= 1 || isPaused) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 5000);

        return () => clearInterval(interval);
    }, [config?.enabled, images.length, isPaused, nextSlide]);

    if (!config?.enabled || images.length === 0) {
        return null;
    }

    const currentImage = images[currentIndex];
    const transitionType = config.transition || 'fade';

    // Animation variants based on transition setting
    const variants: Variants = {
        initial: (dir: number) => {
            if (transitionType === 'slide') {
                return { x: dir > 0 ? '100%' : '-100%', opacity: 0 };
            }
            if (transitionType === 'zoom') {
                return { scale: 0.92, opacity: 0 };
            }
            return { opacity: 0 };
        },
        animate: {
            x: 0,
            scale: 1,
            opacity: 1,
            transition: { duration: 0.6, ease: "easeInOut" as const }
        },
        exit: (dir: number) => {
            if (transitionType === 'slide') {
                return { x: dir > 0 ? '-100%' : '100%', opacity: 0, transition: { duration: 0.4 } };
            }
            if (transitionType === 'zoom') {
                return { scale: 1.05, opacity: 0, transition: { duration: 0.4 } };
            }
            return { opacity: 0, transition: { duration: 0.4 } };
        }
    };

    return (
        <section
            id="galeria"
            className="py-24 relative overflow-hidden bg-gradient-to-b from-[#060D17] via-[#081524] to-[#060D17] border-t border-b border-cyan-500/10"
        >
            {/* Ambient Backlight Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] h-[350px] bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-teal-500/10 blur-[130px] pointer-events-none rounded-full" />
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-400/5 blur-[90px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        <Sparkles size={14} className="text-cyan-400" />
                        <span>Recorrido Visual</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                        La experiencia <span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">Vinzer</span> en acción
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                        Explora la interfaz moderna, limpia y diseñada específicamente para acelerar la operativa diaria de tu centro crematorio y funerario.
                    </p>
                </div>

                {/* Carousel Card Container */}
                <div
                    className="relative group rounded-2xl md:rounded-3xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl p-2 sm:p-4 shadow-2xl shadow-cyan-950/40"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    style={{ borderRadius: config.borderRadius || '1.5rem' }}
                >
                    {/* Viewport */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl md:rounded-2xl bg-black/50 border border-white/5">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={currentIndex}
                                custom={direction}
                                variants={variants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="absolute inset-0 w-full h-full flex items-center justify-center select-none"
                            >
                                <img
                                    src={currentImage}
                                    alt={`Captura del sistema Vinzer #${currentIndex + 1}`}
                                    className="w-full h-full object-contain md:object-cover"
                                    loading="lazy"
                                />
                            </motion.div>
                        </AnimatePresence>

                        {/* Top Indicator Badge */}
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-cyan-300 shadow-md">
                            <ShieldCheck size={14} className="text-cyan-400" />
                            <span>
                                {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                            </span>
                        </div>

                        {/* Prev / Next Navigation Controls */}
                        {images.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={prevSlide}
                                    aria-label="Foto anterior"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-cyan-500 hover:text-black text-white border border-white/10 hover:border-cyan-400 flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <button
                                    type="button"
                                    onClick={nextSlide}
                                    aria-label="Foto siguiente"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 hover:bg-cyan-500 hover:text-black text-white border border-white/10 hover:border-cyan-400 flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95"
                                >
                                    <ChevronRight size={22} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Bottom Navigation Dots & Quick Thumbs */}
                    {images.length > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 pb-1">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        setDirection(idx > currentIndex ? 1 : -1);
                                        setCurrentIndex(idx);
                                    }}
                                    aria-label={`Ir a foto ${idx + 1}`}
                                    className={`transition-all duration-300 rounded-full ${
                                        idx === currentIndex
                                            ? 'w-8 h-2.5 bg-gradient-to-r from-cyan-400 to-sky-400 shadow-sm shadow-cyan-400/50'
                                            : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Optional CTA Under Carousel */}
                {config.ctaText && (
                    <div className="mt-8 flex justify-center">
                        <a
                            href={config.ctaUrl || 'https://wa.me/56998239540'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <MessageCircle size={18} />
                            <span>{config.ctaText}</span>
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
}
