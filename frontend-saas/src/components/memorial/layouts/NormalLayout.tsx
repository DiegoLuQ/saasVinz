"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    PawPrint,
    Quote,
    Heart,
    Flame,
    Star,
    Share2,
    BookOpen,
    Image as ImageIcon,
    MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import MemorialReactions from '@/components/memorial/MemorialReactions';

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
    const [lit, setLit] = useState(false);

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
    const birthYear = mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : null;
    const deathYear = mascota?.death_date ? new Date(mascota.death_date).getFullYear() : null;
    const bio = memorial?.msg_despedida || t?.philosophy_text || "Miramos al cielo y sonreímos, porque sabemos que ahora corres libre entre nubes de algodón.";

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

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-8">
                        {[
                            { label: locale === 'es' ? 'Inicio' : 'Home', icon: <Heart size={12} /> },
                            { label: locale === 'es' ? 'Tributo' : 'Tribute', icon: <BookOpen size={12} />, action: () => document.getElementById('tribute-section')?.scrollIntoView({ behavior: 'smooth' }) },
                            { label: locale === 'es' ? 'Galería' : 'Gallery', icon: <ImageIcon size={12} />, action: () => document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' }) },
                            { label: locale === 'es' ? 'Dedicatoria' : 'Tribute', icon: <MessageCircle size={12} />, action: scrollToForm },
                        ].map((item, idx) => (
                            <button
                                key={idx}
                                onClick={item.action || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
                                className="text-xs tracking-[0.2em] uppercase opacity-50 hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5"
                                style={{ fontFamily: "'Quicksand', sans-serif" }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
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
                    </motion.div>
                </div>

                {/* ── RIGHT COLUMN: Content ── */}
                <div className="relative flex items-center justify-center p-8 md:p-16">

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className={`max-w-lg w-full text-center space-y-8 ${
                            memorial?.diseno?.portada_url
                                ? 'bg-black/45 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-white/10 shadow-2xl text-white'
                                : ''
                        }`}
                    >
                        {/* Pet Name — Large Serif */}
                        <div className="space-y-4">
                            <h1
                                className="text-5xl md:text-7xl lg:text-8xl font-light tracking-[0.08em] leading-none"
                                style={{ 
                                    fontFamily: "'Cinzel', serif",
                                    textShadow: memorial?.diseno?.portada_url
                                        ? '0 2px 10px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.4)'
                                        : 'none'
                                }}
                            >
                                {petName.toUpperCase()}
                            </h1>

                            {/* Thin decorative line */}
                            <div className="w-20 h-px bg-current opacity-20 mx-auto" />
                        </div>

                        {/* Dedication / Bio */}
                        <p className="text-lg md:text-xl leading-relaxed opacity-80 italic font-light px-4">
                            {bio}
                        </p>

                        {/* Dates */}
                        {(birthYear || deathYear) && (
                            <p
                                className="text-sm tracking-[0.25em] opacity-50 font-medium"
                                style={{ fontFamily: "'Quicksand', sans-serif" }}
                            >
                                {birthYear || '...'} — {deathYear || '...'}.
                            </p>
                        )}

                        {/* ── Candle ── */}
                        <div className="flex flex-col items-center pt-4">
                            <button
                                onClick={() => setLit(true)}
                                className="group relative flex flex-col items-center focus:outline-none"
                                aria-label={lit ? t?.mem_candle_lit : t?.mem_candle_light}
                            >
                                {/* Glow aura */}
                                <div className={`absolute -top-8 w-20 h-20 rounded-full transition-all duration-1000 ${lit
                                    ? 'bg-amber-400/20 blur-2xl scale-100 opacity-100'
                                    : 'bg-amber-400/5 blur-xl scale-75 opacity-0'
                                    }`} />

                                {/* Flame */}
                                <div className="relative w-4 h-7 mb-0.5">
                                    <AnimatePresence>
                                        {lit && (
                                            <>
                                                {/* Outer flame */}
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: [1, 1.1, 0.95, 1.05, 1], opacity: 1 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                                    className="absolute inset-0 bg-gradient-to-t from-orange-500 via-amber-400 to-transparent rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] blur-[1px]"
                                                />
                                                {/* Inner flame (white core) */}
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: [0.8, 1, 0.85, 0.95, 0.8], opacity: [0.9, 1, 0.8, 1, 0.9] }}
                                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                                    className="absolute inset-x-[3px] bottom-0 h-[65%] bg-gradient-to-t from-yellow-100 via-white to-transparent rounded-full blur-[0.5px]"
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

                                {/* Label */}
                                <span
                                    className="mt-5 text-[10px] tracking-[0.3em] uppercase opacity-40 group-hover:opacity-70 transition-opacity"
                                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                                >
                                    {lit
                                        ? (t?.mem_candle_lit || 'Luz Perpetua Encendida')
                                        : (t?.mem_candle_light || 'Encender una Vela')}
                                </span>
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

            {/* ═══════════════════════════════════════════════
                FOOTER
            ═══════════════════════════════════════════════ */}
            <footer className="relative z-10 w-full py-6">
                <div className="w-full h-px opacity-10 bg-current" />
                <div className="flex items-center justify-center py-5">
                    <span
                        className="text-[10px] tracking-[0.3em] uppercase opacity-30"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                        © {new Date().getFullYear()} {tenant_info?.name || 'Memorial'}
                    </span>
                </div>
            </footer>

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
