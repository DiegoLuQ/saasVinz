"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PawPrint,
    Heart,
    Sparkles,
    Flame,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import MemorialCandleRow from '@/components/memorial/MemorialCandleRow';
import { getLifeDates, nameSizeClass } from '@/lib/memorialDesign';
import { ritualLabel, type RitualProps } from '@/lib/memorialRituals';

export default function NormalLayout(props: any) {
    const {
        memorial, mascota, mixedItems, themeConfig, isUltra,
        randomMainImage, galleryImages, newDedication, setNewDedication,
        handleSubmitDedication, isSubmitting, canAddMore,
        formRef, setIsDedicationModalOpen, setSelectedDedication,
        tenant_info, tenant_status, ensureAbsoluteUrl, formatInstagramUrl, uuid, router,
        scrollToForm, setShowShareModal, t, locale, onSendKiss, onShare
    } = props;

    const [showScrollTop, setShowScrollTop] = useState(false);
    const [litLocal, setLit] = useState(false);
    const rituals: RitualProps | undefined = props.rituals;
    // La vela queda prendida al volver (el gesto se recuerda en el navegador)
    const lit = litLocal || Boolean(rituals?.did?.vela);
    const candleCount = rituals?.counts.vela || 0;
    // La vela grande empieza apagada: se prende cuando este visitante toca
    // «Encender una velita» y sigue prendida al volver. La fila bajo la foto muestra las de todos.
    const flameOn = lit;
    // Encender la vela registra el gesto (una vez por visita) y suma al contador
    const lightCandle = () => {
        rituals?.playMusic?.();
        if (lit) return;
        setLit(true);
        rituals?.send('vela');
    };

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleReleaseStar = (e: React.MouseEvent) => {
        const star = document.createElement('div');
        star.innerHTML = "✨";
        star.style.position = "fixed";
        star.style.left = "50%";
        star.style.top = "50%";
        star.style.fontSize = "2rem";
        star.style.zIndex = "100";
        star.style.transition = "all 1.5s ease-out";
        star.style.pointerEvents = "none";
        document.body.appendChild(star);
        requestAnimationFrame(() => {
            star.style.transform = "translate(100px, -500px) scale(0)";
            star.style.opacity = "0";
        });
        setTimeout(() => star.remove(), 2000);
    };

    const handleShare = async () => {
        const shareData = {
            title: `Homenaje a ${mascota?.name}`,
            text: `Un recuerdo eterno para ${mascota?.name} 🕊️`,
            url: typeof window !== 'undefined' ? window.location.href : '',
        };
        if (typeof navigator !== 'undefined' && navigator.share) {
            try { await navigator.share(shareData); } catch { }
        } else {
            setShowShareModal(true);
        }
    };

    const petName = mascota?.name || '';
    const dates = getLifeDates(mascota?.birth_date, mascota?.death_date, locale, mascota);
    const bio = memorial?.msg_despedida || '';
    const isDark = Boolean(memorial?.diseno?.portada_url || themeConfig?.dark);

    return (
        <div
            className="relative min-h-screen overflow-hidden flex flex-col"
            style={{
                fontFamily: "'Cormorant Garamond', serif",
                ...(memorial?.diseno?.portada_url ? { backgroundImage: `url(${memorial.diseno.portada_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
        >
            {/* Overlay for portada readability */}
            {memorial?.diseno?.portada_url && (
                <div className="absolute inset-0 bg-black/30 z-0" />
            )}
            {/* Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Quicksand:wght@300;400;500&display=swap" rel="stylesheet" />

            {/* ═══════════════════════════════════════════════
                NAVIGATION HEADER
            ═══════════════════════════════════════════════ */}
            <header className="relative z-20 w-full">
                <div className="flex items-center justify-between px-6 md:px-12 py-5">
                    {/* Memorial Title / Brand */}
                    <div className="flex items-center gap-3">
                        <PawPrint size={18} className="opacity-40" />
                        <span
                            className="text-sm md:text-base font-light tracking-[0.15em] opacity-70"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                            {tenant_info?.name || 'Memorial'} — {locale === 'es' ? 'Un Homenaje' : 'A Tribute'}
                        </span>
                    </div>

                </div>

                {/* Thin separator */}
                <div className="w-full h-px opacity-10 bg-current" />
            </header>

            {/* ═══════════════════════════════════════════════
                HERO SECTION — SPLIT SCREEN (Desktop 2-col, Mobile stacked)
            ═══════════════════════════════════════════════ */}
            <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 min-h-[80vh]">

                {/* ── LEFT COLUMN: Photo with Canvas Frame ── */}
                <div className="relative flex items-center justify-center p-8 md:p-16"
                    style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>

                    {/* Subtle texture overlay */}
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
                        }}
                    />

                    {/* Canvas-style Photo Frame */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-[420px] md:max-w-[480px]"
                    >
                        {/* Outer frame (canvas mat) */}
                        <div className="relative bg-[#f0ebe3] p-5 md:p-7 shadow-[0_15px_60px_rgba(0,0,0,0.15),_0_5px_20px_rgba(0,0,0,0.08)]"
                            style={{
                                background: 'linear-gradient(145deg, #f5f0e8 0%, #ebe5da 50%, #e8e2d8 100%)'
                            }}>

                            {/* Inner photo */}
                            <div className="relative aspect-[4/5] overflow-hidden bg-stone-200">
                                {randomMainImage ? (
                                    <Image
                                        src={randomMainImage}
                                        alt={petName}
                                        fill
                                        priority
                                        sizes="(max-width: 768px) 90vw, 45vw"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-30">
                                        <Heart size={80} fill="currentColor" />
                                    </div>
                                )}
                            </div>

                            {/* Subtle inner shadow to simulate depth */}
                            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.06)]" />
                        </div>

                        {/* Velitas encendidas por los visitantes, bajo la foto */}
                        <MemorialCandleRow count={candleCount} isDark={isDark} locale={locale} />
                    </motion.div>
                </div>

                {/* ── RIGHT COLUMN: Content ── */}
                <div className="relative flex items-center justify-center p-8 md:p-16">

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className={`max-w-xl w-full text-center space-y-7 ${
                            memorial?.diseno?.portada_url
                                ? 'bg-black/55 backdrop-blur-md p-6 sm:p-10 md:p-12 rounded-3xl border border-white/15 shadow-2xl text-white'
                                : isDark
                                ? 'bg-slate-900/60 backdrop-blur-md p-6 sm:p-10 md:p-12 rounded-3xl border border-slate-700/60 shadow-xl text-white'
                                : 'p-4 sm:p-8 text-slate-800'
                        }`}
                    >
                        {/* Pet Name — Majestic, Radiant & Unbroken */}
                        <div className="space-y-3">
                            <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-sans uppercase tracking-[0.22em] backdrop-blur-md shadow-xs ${
                                isDark
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold'
                                    : 'border-amber-800/30 bg-amber-800/10 text-amber-950 font-black'
                            }`}>
                                <Sparkles size={11} className={isDark ? "text-amber-400" : "text-amber-800"} />
                                <span>{locale === 'en' ? 'IN ETERNAL MEMORY' : 'EN MEMORIA ETERNA'}</span>
                            </div>

                            <h1
                                className={`${nameSizeClass(petName, {
                                    short: 'text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-[2.75rem]',
                                    long: 'text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-4xl',
                                    xlong: 'text-lg sm:text-xl md:text-xl lg:text-2xl xl:text-3xl',
                                })} font-medium tracking-[0.08em] leading-tight select-none uppercase`}
                                style={{ 
                                    fontFamily: "'Cinzel', serif",
                                }}
                            >
                                <span
                                    className={`inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 ${
                                        isDark || memorial?.diseno?.portada_url
                                            ? 'bg-gradient-to-b from-white via-amber-50 to-amber-200/90 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(251,191,36,0.35)]'
                                            : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                                    }`}
                                >
                                    {petName.split(/\s+/).map((word: string, idx: number) => (
                                        <span key={idx} className="inline-block whitespace-nowrap">
                                            {word}
                                        </span>
                                    ))}
                                </span>
                            </h1>

                            {/* Ornate Thin Decorative Divider */}
                            <div className="flex items-center justify-center gap-2 text-amber-400/60 my-1">
                                <div className="w-8 sm:w-14 h-px bg-gradient-to-r from-transparent to-amber-400/50" />
                                <span className="text-[10px] text-amber-400/80">✦</span>
                                <div className="w-8 sm:w-14 h-px bg-gradient-to-l from-transparent to-amber-400/50" />
                            </div>
                        </div>

                        {/* Dedication / Bio */}
                        <p className="text-base sm:text-lg md:text-xl leading-relaxed opacity-90 italic font-light px-2 sm:px-4">
                            {bio}
                        </p>

                        {/* Dates */}
                        {dates.full && (
                            <div className="space-y-1">
                                <p
                                    className="text-sm tracking-[0.2em] opacity-60 font-medium"
                                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                                >
                                    {dates.full}
                                </p>
                                {dates.yearsOfLove && (
                                    <p className="text-lg italic opacity-70">{dates.yearsOfLove}</p>
                                )}
                            </div>
                        )}

                        {/* ── Candle ── */}
                        <div className="flex flex-col items-center pt-4">
                            <button
                                onClick={lightCandle}
                                className="group relative flex flex-col items-center focus:outline-none"
                                aria-label={lit ? (locale === 'en' ? 'Candle lit' : 'Vela encendida') : (locale === 'en' ? 'Light a candle' : 'Encender una velita')}
                            >
                                {/* Glow aura */}
                                <div className={`absolute -top-8 w-20 h-20 rounded-full transition-all duration-1000 ${flameOn
                                    ? 'bg-amber-400/20 blur-2xl scale-100 opacity-100'
                                    : 'bg-amber-400/5 blur-xl scale-75 opacity-0'
                                    }`} />

                                {/* Flame */}
                                <div className="relative w-4 h-7 mb-0.5">
                                    <AnimatePresence>
                                        {flameOn && (
                                            <>
                                                {/* Llama serena: se enciende una vez y queda quieta (sin parpadeo),
                                                    solo un leve vaivén muy lento */}
                                                <motion.div
                                                    initial={{ scaleY: 0, opacity: 0 }}
                                                    animate={{ scaleY: [1, 1.03, 1], opacity: 1 }}
                                                    transition={{ scaleY: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.6 } }}
                                                    className="absolute inset-0 origin-bottom bg-gradient-to-t from-orange-500 via-amber-400 to-transparent rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] blur-[1px]"
                                                />
                                                {/* Inner flame (white core) */}
                                                <motion.div
                                                    initial={{ scaleY: 0, opacity: 0 }}
                                                    animate={{ scaleY: 1, opacity: 1 }}
                                                    transition={{ duration: 0.6 }}
                                                    className="absolute inset-x-[3px] bottom-0 h-[65%] origin-bottom bg-gradient-to-t from-yellow-100 via-white to-transparent rounded-full blur-[0.5px]"
                                                />
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Wick */}
                                <div className="w-[1.5px] h-1.5 bg-stone-500 opacity-60" />

                                {/* Candle body */}
                                <div className="w-10 h-14 bg-gradient-to-b from-[#faf5ee] to-[#f0e8d8] rounded-sm shadow-[inset_0_2px_6px_rgba(0,0,0,0.04),_0_4px_15px_rgba(0,0,0,0.08)] relative overflow-hidden border border-stone-200/50">
                                    {/* Wax shine */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-white/50 blur-[1px]" />
                                    {/* Side shadow */}
                                    <div className="absolute top-0 bottom-0 right-0 w-2 bg-black/[0.03]" />
                                </div>

                                {/* Botón visible (con contraste): apagada → «Encender una velita»; encendida → estado */}
                                {lit ? (
                                    <span
                                        className={`mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-semibold ${
                                            isDark ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-amber-600/30 bg-amber-50 text-amber-900'
                                        }`}
                                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                                    >
                                        <Flame size={14} className="text-amber-500 fill-amber-400" />
                                        {locale === 'en' ? 'Candle lit' : 'Vela encendida'}
                                    </span>
                                ) : (
                                    <span
                                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/30 ring-1 ring-amber-500/60 transition-all group-hover:bg-amber-300 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-offset-2"
                                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                                    >
                                        <Flame size={16} />
                                        {locale === 'en' ? 'Light a candle' : 'Encender una velita'}
                                    </span>
                                )}
                                {candleCount > 0 && (
                                    <span className="mt-1.5 text-sm italic opacity-70">
                                        🕯️ {ritualLabel('vela', candleCount, locale)}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* ── Action Buttons ── */}
                        <div className="pt-6">
                            <MemorialActionButtons
                                onSendKiss={onSendKiss || handleReleaseStar}
                                onShare={onShare || handleShare}
                                memorial={memorial}
                                mascota={mascota}
                                tenant_info={tenant_info}
                                locale={locale}
                                t={t}
                                mainImage={randomMainImage || mascota?.image_url}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="relative z-10 h-24" />

            {/* Back to Top */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 50 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-8 right-8 z-[100] w-12 h-12 md:w-14 md:h-14 bg-[#c5a059] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                    >
                        <PawPrint size={24} className="group-hover:rotate-12 transition-transform" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
