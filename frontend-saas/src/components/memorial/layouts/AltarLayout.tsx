"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Flame,
} from 'lucide-react';
import Image from 'next/image';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';

export default function AltarLayout(props: any) {
    const {
        memorial, mascota, randomMainImage, t,
        onSendKiss, onShare, tenant_info, locale,
        mixedItems, themeConfig,
        newDedication, setNewDedication, handleSubmitDedication, isSubmitting, canAddMore, formRef,
        setSelectedDedication, setIsDedicationModalOpen
    } = props;
    const [lit, setLit] = useState(true);

    const petName = mascota?.name || '';
    const bio = memorial?.msg_despedida || t?.philosophy_text || "Tu espíritu gentil y amor incondicional enriquecieron nuestras vidas de maneras que nunca podremos expresar. Te extrañamos profundamente y siempre te guardaremos en nuestros corazones. Descansa en paz, dulce amigo.";
    
    const isDarkTheme = themeConfig?.text?.includes('white') || themeConfig?.text?.includes('50') || themeConfig?.text?.includes('slate-200');
    const portadaUrl = memorial?.diseno?.portada_url;

    return (
        <div
            className="relative min-h-screen w-full flex items-center justify-center overflow-hidden py-4"
            style={{
                fontFamily: "'Cormorant Garamond', serif",
                ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
        >
            {/* ═══════════════════════════════════════════════
                GOOGLE FONTS
            ═══════════════════════════════════════════════ */}
            <link
                href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Quicksand:wght@300;400;500&family=Marcellus&display=swap"
                rel="stylesheet"
            />

            {/* ═══════════════════════════════════════════════
                BACKGROUND LAYERS
            ═══════════════════════════════════════════════ */}
            {/* Base warm gradient — hidden when portada is set */}
            {!portadaUrl && !memorial?.diseno?.color_fondo && (!themeConfig || themeConfig.bg.includes('faf9f6')) && (
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(180deg, #d5c9b3 0%, #c7b99e 25%, #bfb192 50%, #c7b99e 75%, #d5c9b3 100%)',
                    }}
                />
            )}

            {/* Dark overlay when portada background is active */}
            {portadaUrl && (
                <div className="absolute inset-0 bg-black/40" />
            )}

            {/* Center glow — warm light radiating from candle area */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: memorial?.diseno?.color_fondo
                        ? 'radial-gradient(ellipse 60% 70% at 50% 55%, rgba(255,248,230,0.25) 0%, rgba(245,235,210,0.1) 30%, rgba(215,200,170,0.03) 60%, transparent 85%)'
                        : 'radial-gradient(ellipse 60% 70% at 50% 55%, rgba(255,248,230,0.9) 0%, rgba(245,235,210,0.6) 30%, rgba(215,200,170,0.2) 60%, transparent 85%)',
                }}
            />

            {/* Subtle warm ambient glow behind the candle flame */}
            <AnimatePresence>
                {lit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse 40% 50% at 50% 58%, rgba(255,200,80,0.15) 0%, rgba(255,180,60,0.05) 40%, transparent 70%)',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                MAIN GLASSMORPHIC PANEL
            ═══════════════════════════════════════════════ */}
            <div className="relative z-10 w-full max-w-[780px] mx-4 md:mx-8 mt-[10px] mb-12">

                {/* The frosted glass card */}
                <div
                    className="relative bg-white/30 backdrop-blur-xl border border-white/40 shadow-[0_25px_80px_rgba(0,0,0,0.08),_0_8px_30px_rgba(0,0,0,0.04)] overflow-visible"
                    style={{
                        borderRadius: '24px',
                    }}
                >
                    {/* Inner subtle glow */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            borderRadius: '24px',
                            background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
                        }}
                    />

                    {/* ═══════════════════════════════════════
                        CONTENT
                    ═══════════════════════════════════════ */}
                    <div className="relative z-10 flex flex-col items-center px-6 md:px-12 pt-12 md:pt-16 pb-8">

                        {/* ── PET NAME ── */}
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className={`text-4xl md:text-5xl lg:text-6xl font-light tracking-[0.12em] leading-none mb-8 md:mb-10 ${
                                isDarkTheme ? 'text-white/95' : 'text-[#3a3228]'
                            }`}
                            style={{ fontFamily: "'Cinzel', serif" }}
                        >
                            {petName.toUpperCase()}
                        </motion.h1>

                        {/* ── ARCHED PHOTO FRAME ── */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="relative mb-0"
                        >
                            {/* Outer metallic arch border */}
                            <div
                                className="relative p-[5px] md:p-[6px]"
                                style={{
                                    borderRadius: '140px 140px 8px 8px',
                                    background: 'linear-gradient(160deg, #c5a059 0%, #f2dcb3 25%, #b8943f 45%, #f2dcb3 65%, #a07e35 85%, #dcc48e 100%)',
                                    boxShadow: '0 8px 40px rgba(139,111,47,0.25), 0 2px 10px rgba(139,111,47,0.15), inset 0 1px 2px rgba(255,255,255,0.4)',
                                }}
                            >
                                {/* Inner photo container */}
                                <div
                                    className="relative w-[220px] h-[280px] md:w-[260px] md:h-[330px] overflow-hidden bg-stone-200"
                                    style={{
                                        borderRadius: '136px 136px 4px 4px',
                                    }}
                                >
                                    {randomMainImage ? (
                                        <Image
                                            src={randomMainImage}
                                            alt={petName}
                                            fill
                                            priority
                                            sizes="(max-width: 768px) 220px, 260px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-30 text-[#8a6e2f]">
                                            <Heart size={60} fill="currentColor" />
                                        </div>
                                    )}

                                    {/* Photo inner shadow for depth */}
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            borderRadius: '136px 136px 4px 4px',
                                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.12), inset 0 -2px 10px rgba(0,0,0,0.06)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Metallic frame highlight (top arc shine) */}
                            <div
                                className="absolute top-0 left-[10%] right-[10%] h-[3px] pointer-events-none"
                                style={{
                                    borderRadius: '140px 140px 0 0',
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.5) 70%, transparent 100%)',
                                }}
                            />
                        </motion.div>

                        {/* ── INTERACTIVE PILLAR CANDLE ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="relative flex flex-col items-center -mt-2 z-20"
                        >
                            <button
                                onClick={() => setLit(true)}
                                className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
                                aria-label={lit ? (t?.mem_candle_lit || 'Vela encendida') : (t?.mem_candle_light || 'Encender vela')}
                            >
                                {/* Large glow halo behind the candle when lit */}
                                <div
                                    className={`absolute -top-16 w-48 h-48 rounded-full transition-all duration-[2000ms] ${
                                        lit
                                            ? 'opacity-100 scale-100'
                                            : 'opacity-0 scale-50'
                                    }`}
                                    style={{
                                        background: 'radial-gradient(circle, rgba(255,200,80,0.35) 0%, rgba(255,180,60,0.15) 40%, transparent 70%)',
                                        filter: 'blur(20px)',
                                    }}
                                />

                                {/* Flame container */}
                                <div className="relative w-6 h-10 mb-0.5">
                                    <AnimatePresence>
                                        {lit && (
                                            <>
                                                {/* Outer flame */}
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{
                                                        scale: [1, 1.15, 0.92, 1.08, 1],
                                                        opacity: [0.9, 1, 0.85, 1, 0.9],
                                                    }}
                                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                                    className="absolute inset-0 rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%]"
                                                    style={{
                                                        background: 'linear-gradient(to top, #e8850c 0%, #f5b731 30%, #ffe082 60%, transparent 100%)',
                                                        filter: 'blur(1px)',
                                                    }}
                                                />
                                                {/* Inner flame (white-yellow core) */}
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{
                                                        scale: [0.75, 1, 0.8, 0.95, 0.75],
                                                        opacity: [0.8, 1, 0.7, 1, 0.8],
                                                    }}
                                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                                    className="absolute inset-x-[5px] bottom-0 h-[60%] rounded-full"
                                                    style={{
                                                        background: 'linear-gradient(to top, #fff8e1 0%, #ffffff 40%, transparent 100%)',
                                                        filter: 'blur(0.5px)',
                                                    }}
                                                />
                                            </>
                                        )}
                                    </AnimatePresence>

                                    {/* Un-lit prompt glow */}
                                    {!lit && (
                                        <motion.div
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                background: 'radial-gradient(circle, rgba(255,200,80,0.3) 0%, transparent 70%)',
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Wick */}
                                <div className="w-[2px] h-2 bg-stone-500 opacity-50" />

                                {/* Candle body */}
                                <div
                                    className="relative w-[58px] h-[77px] overflow-hidden border border-stone-200/40"
                                    style={{
                                        borderRadius: '3px 3px 4px 4px',
                                        background: 'linear-gradient(180deg, #faf6ee 0%, #f5eedf 30%, #ede4d0 60%, #e2d6be 100%)',
                                        boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.6), inset 0 -2px 6px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {/* Wax highlight */}
                                    <div className="absolute top-0 left-0 right-0 h-3 bg-white/60 blur-[1px]" />
                                    {/* Side shadow */}
                                    <div className="absolute top-0 bottom-0 right-0 w-2.5 bg-black/[0.03]" />
                                    {/* Left highlight */}
                                    <div className="absolute top-0 bottom-0 left-0 w-2 bg-white/20" />
                                </div>

                                {/* Candle base */}
                                <div
                                    className="w-[67px] h-[10px] rounded-b-sm"
                                    style={{
                                        background: 'linear-gradient(180deg, #d8ccb4 0%, #c4b89e 100%)',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                    }}
                                />
                            </button>
                        </motion.div>

                        {/* ── DEDICATION CARD (Translucent overlay) ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                            className="relative z-10 w-full max-w-[480px] mt-6 md:mt-8 px-2"
                        >
                            <div
                                className="relative px-8 py-7 md:px-10 md:py-8 text-center"
                                style={{
                                    background: isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    borderRadius: '14px',
                                    border: isDarkTheme ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.5)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)',
                                }}
                            >
                                <p
                                    className={`text-[15px] md:text-base leading-[1.8] font-light ${
                                        isDarkTheme ? 'text-white/90' : 'text-[#4a3f33]'
                                    }`}
                                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                >
                                    {bio}
                                </p>
                            </div>
                        </motion.div>

                        {/* ── ACTION BUTTONS ── */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 1 }}
                            className="mt-8 mb-4"
                        >
                            <MemorialActionButtons
                                onSendKiss={onSendKiss}
                                onShare={onShare}
                                memorial={memorial}
                                mascota={mascota}
                                tenant_info={tenant_info}
                                locale={locale}
                                t={t}
                                mainImage={randomMainImage || mascota?.image_url}
                            />
                        </motion.div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="text-center mt-8 mb-4">
                    <span
                        className={`text-[10px] tracking-[0.3em] uppercase opacity-30 ${
                            isDarkTheme ? 'text-white' : 'text-[#5a4e3c]'
                        }`}
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                        © {new Date().getFullYear()} {tenant_info?.name || 'Memorial'}
                    </span>
                </div>
            </div>
        </div>
    );
}
