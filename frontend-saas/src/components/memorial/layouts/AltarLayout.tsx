"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Flame,
    Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import MemorialCandleRow from '@/components/memorial/MemorialCandleRow';
import MemorialCloud from '@/components/memorial/MemorialCloud';
import { getLifeDates, isDarkSurface, nameSizeClass, getMemorialThemeStyles, getMemorialAtmosphereBg } from '@/lib/memorialDesign';
import { ritualLabel, type RitualProps } from '@/lib/memorialRituals';

export default function AltarLayout(props: any) {
    const {
        memorial,
        mascota,
        randomMainImage,
        t,
        onSendKiss,
        onShare,
        tenant_info,
        locale,
        themeConfig,
    } = props;

    const rituals: RitualProps | undefined = props.rituals;
    const candleCount = rituals?.counts?.vela || 0;

    const [candleLitLocal, setCandleLitLocal] = useState(false);
    const isCandleLit = candleLitLocal || Boolean(rituals?.did?.vela);
    // Las velas grandes empiezan apagadas: se prenden cuando este visitante toca
    // «Encender una velita» y siguen prendidas al volver. La fila bajo la foto muestra las de todos.
    const flameOn = isCandleLit;

    const lightCandle = () => {
        rituals?.playMusic?.();
        if (isCandleLit) return;
        setCandleLitLocal(true);
        rituals?.send('vela');
    };

    const petName = mascota?.name || '';
    const bio =
        memorial?.msg_despedida ||
        t?.philosophy_text ||
        "Tu espíritu gentil y amor incondicional enriquecieron nuestras vidas para siempre. Te extrañamos profundamente y te llevamos grabado en el alma. Descansa en paz, ángel de amor.";

    const portadaUrl = memorial?.diseno?.portada_url;
    const isDarkTheme = isDarkSurface(themeConfig, portadaUrl);
    const tema = memorial?.diseno?.tema || 'claro';
    const themeStyles = getMemorialThemeStyles(tema, isDarkTheme);
    const dates = getLifeDates(mascota?.birth_date, mascota?.death_date, locale, mascota);

    return (
        <div
            suppressHydrationWarning
            className={`relative min-h-screen w-full flex items-center justify-center overflow-hidden py-12 px-4 sm:px-6 ${
                isDarkTheme ? 'text-white' : 'text-slate-900'
            }`}
            style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                ...(portadaUrl
                    ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : {}),
            }}
        >
            <link
                href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Quicksand:wght@400;600&display=swap"
                rel="stylesheet"
            />

            {/* ═══════════════════════════════════════════════
                ATMÓSFERA Y FONDOS
            ═══════════════════════════════════════════════ */}
            {/* Fondo base cálido armonizado con la atmósfera si no hay portada */}
            {!portadaUrl && !memorial?.diseno?.color_fondo && (
                <div
                    className="absolute inset-0"
                    style={{
                        background: getMemorialAtmosphereBg('altar', tema, isDarkTheme),
                    }}
                />
            )}

            {portadaUrl && <div className="absolute inset-0 bg-[#080706]/65 pointer-events-none" />}

            {/* Resplandor radial de velas vivas */}
            <AnimatePresence>
                {flameOn && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.65, 0.85, 0.7] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(ellipse 55% 55% at 50% 48%, rgba(251,191,36,0.22) 0%, rgba(245,158,11,0.08) 45%, transparent 75%)',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                SANTUARIO / PANEL CENTRAL DEL ALTAR
            ═══════════════════════════════════════════════ */}
            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                {/* 1. CABECERA: NOMBRE Y FECHAS SOLEMNES */}
                <div className="text-center mb-8 sm:mb-10 max-w-2xl px-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[11px] font-sans font-bold uppercase tracking-[0.25em] mb-4 shadow-sm backdrop-blur-md ${themeStyles.badgeClass}`}>
                        <Sparkles size={12} className={isDarkTheme ? "text-amber-400" : "text-amber-800"} />
                        <span>
                            {locale === 'en' ? 'ALTAR OF LIGHT' : 'ALTAR DE LUZ'}
                            {dates.years ? ` · ${dates.years}` : ''}
                        </span>
                    </div>

                    <h1
                        className={`${nameSizeClass(petName, {
                            short: 'text-3xl sm:text-5xl md:text-6xl',
                            long: 'text-2xl sm:text-4xl md:text-5xl',
                            xlong: 'text-xl sm:text-3xl md:text-4xl',
                        })} font-normal tracking-[0.14em] uppercase leading-tight bg-gradient-to-r ${themeStyles.titleGradient} bg-clip-text text-transparent`}
                        style={{ fontFamily: "'Cinzel', serif" }}
                    >
                        <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                            {petName.split(/\s+/).map((word: string, idx: number) => (
                                <span key={idx} className="inline-block whitespace-nowrap">
                                    {word}
                                </span>
                            ))}
                        </span>
                    </h1>

                    {dates.full && (
                        <p
                            className={`mt-2.5 text-sm sm:text-base tracking-[0.1em] ${themeStyles.dateText} italic font-light`}
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                            {dates.full}
                            {dates.yearsOfLove && (
                                <span className={`block not-italic text-xs tracking-[0.2em] uppercase font-sans ${themeStyles.dateHighlight} mt-1 font-semibold`}>
                                    ✦ {dates.yearsOfLove} ✦
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {/* 2. CONJUNTO DEL ALTAR: RETRATO ENMARCADO + CIRIOS GEMELOS + PEANA */}
                <div className="relative flex flex-col items-center mb-10 w-full max-w-lg">
                    {/* Resplandor superior de aura */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-400/20 blur-3xl rounded-full pointer-events-none" />

                    {/* Escena central: Vela Izq + Retrato en Arco + Vela Der */}
                    <div className="relative flex items-end justify-center gap-3 sm:gap-6 z-10 w-full">
                        {/* 🕯️ Cirio Ceremonial Izquierdo */}
                        <CeremonialCandle
                            isLit={flameOn}
                            onLight={lightCandle}
                            locale={locale}
                            isDark={isDarkTheme}
                            side="left"
                        />

                        {/* 🖼️ Retrato de Portada en Arco Dorado */}
                        <div className="relative group">
                            {/* Halo dorado posterior */}
                            <div className="absolute -inset-2 bg-gradient-to-t from-amber-500/30 via-amber-300/20 to-amber-100/10 rounded-[160px_160px_16px_16px] blur-md pointer-events-none" />

                            <div
                                className="relative p-[6px] sm:p-[8px] rounded-[150px_150px_14px_14px] shadow-[0_16px_50px_rgba(0,0,0,0.5)]"
                                style={{
                                    background:
                                        'linear-gradient(145deg, #d4af37 0%, #fef3c7 25%, #b45309 50%, #fde68a 75%, #92400e 100%)',
                                }}
                            >
                                <div className="relative w-[210px] h-[270px] sm:w-[270px] sm:h-[345px] overflow-hidden rounded-[144px_144px_8px_8px] bg-stone-900 border border-black/20">
                                    {randomMainImage ? (
                                        <Image
                                            src={randomMainImage}
                                            alt={petName}
                                            fill
                                            priority
                                            sizes="(max-width: 640px) 210px, 270px"
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-amber-300/40">
                                            <Heart size={64} fill="currentColor" />
                                        </div>
                                    )}

                                    {/* Sombreado interno para profundidad pictórica */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* 🕯️ Cirio Ceremonial Derecho */}
                        <CeremonialCandle
                            isLit={flameOn}
                            onLight={lightCandle}
                            locale={locale}
                            isDark={isDarkTheme}
                            side="right"
                        />
                    </div>

                    {/* 🏛️ Peana / Repisa de Mármol y Oro del Altar */}
                    <div className="relative w-full mt-[-10px] z-20 flex flex-col items-center">
                        {/* Moldura superior biselada */}
                        <div
                            className="w-[94%] sm:w-[98%] h-[12px] rounded-t-md shadow-md"
                            style={{
                                background:
                                    'linear-gradient(90deg, #92400e 0%, #fde68a 20%, #d4af37 50%, #fde68a 80%, #92400e 100%)',
                            }}
                        />
                        {/* Bloque principal de la repisa */}
                        <div
                            className="w-full h-[24px] sm:h-[30px] rounded-b-xl shadow-2xl flex items-center justify-center border-t border-amber-300/50"
                            style={{
                                background: isDarkTheme
                                    ? 'linear-gradient(180deg, #27221d 0%, #161310 100%)'
                                    : 'linear-gradient(180deg, #e7decb 0%, #cfc3ab 100%)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.2)',
                            }}
                        >
                            <span className={`text-[9px] tracking-[0.3em] font-sans font-black uppercase ${isDarkTheme ? 'text-amber-400/90' : 'text-amber-950/90 font-bold'}`}>
                                ✦ SANTUARIO DE RECUERDO ETERNO ✦
                            </span>
                        </div>
                    </div>

                    {/* Velitas de los visitantes, bajo el altar, sobre una nube: la nube va DETRÁS y
                        bajo la última fila (con 2 filas de velas antes tapaba la segunda) */}
                    <div className="relative mt-6 px-6 pb-5">
                        <MemorialCloud className="absolute -bottom-1 -inset-x-4 h-7 !z-0" tone={isDarkTheme ? 'night' : 'day'} delay={1.2} intensity={0.35} />
                        <div className="relative z-30">
                            <MemorialCandleRow count={candleCount} isDark={isDarkTheme} locale={locale} className="" />
                        </div>
                    </div>
                </div>

                {/* 3. BOTÓN RITUAL INTERACTIVO & CONTADOR DE VELAS */}
                <div className="flex flex-col items-center gap-2 mb-8 z-20">
                    <button
                        onClick={lightCandle}
                        className={`px-7 py-3 rounded-full text-xs font-sans font-bold tracking-[0.18em] uppercase transition-all flex items-center gap-2.5 shadow-lg ${
                            !isCandleLit
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-500/60 shadow-amber-400/30'
                                : `border ${themeStyles.candleButtonUnlit}`
                        }`}
                    >
                        <Flame
                            size={16}
                            className={
                                !isCandleLit
                                    ? 'text-slate-950'
                                    : isDarkTheme
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-amber-700 fill-amber-700'
                            }
                        />
                        <span>
                            {isCandleLit
                                ? locale === 'en' ? 'Candle lit' : 'Vela encendida'
                                : locale === 'en' ? 'Light a candle' : 'Encender una velita'}
                        </span>
                    </button>

                    {candleCount > 0 && (
                        <p
                            className={`text-xs italic mt-1 ${themeStyles.candleCounter}`}
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                            🕯️ {ritualLabel('vela', candleCount, locale)}
                        </p>
                    )}
                </div>

                {/* 4. TARJETA DE DEDICATORIA: CRISTAL CÁLIDO CON COMILLAS DORADAS */}
                <div className="relative w-full max-w-xl px-4 mb-10">
                    <div
                        className="relative p-7 sm:p-9 text-center rounded-3xl border backdrop-blur-xl shadow-2xl"
                        style={{
                            background: themeStyles.cardBg,
                            borderColor: themeStyles.cardBorder,
                            boxShadow: themeStyles.cardShadow,
                        }}
                    >
                        <span className={`block text-4xl sm:text-5xl leading-none font-serif mb-2 select-none ${themeStyles.quoteMarkColor}`}>
                            “
                        </span>
                        <p
                            className={`text-lg sm:text-2xl leading-[1.75] italic ${themeStyles.bioText}`}
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                            {bio}
                        </p>
                        <span className={`block text-4xl sm:text-5xl leading-none font-serif mt-2 select-none ${themeStyles.quoteMarkColor}`}>
                            ”
                        </span>
                    </div>
                </div>

                {/* 5. CINTA DE ACCIONES (DESCARGAR IMAGEN, TARJETA, COMPARTIR, SALUDO AL CIELO) */}
                <div className={`w-full flex justify-center ${themeStyles.actionButtonsClass}`}>
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
                </div>
            </div>
        </div>
    );
}

/**
 * Componente de Cirio Ceremonial con Candelabro Dorado
 */
function CeremonialCandle({
    isLit,
    onLight,
    locale,
    side,
    isDark = false,
}: {
    isLit: boolean;
    onLight: () => void;
    locale: string;
    side: 'left' | 'right';
    isDark?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onLight}
            title={locale === 'en' ? 'Light this candle' : 'Toca para encender la vela'}
            className="flex flex-col items-center group cursor-pointer focus:outline-none -mb-1 pb-1 transition-transform hover:scale-105"
        >
            {/* Llama con animación y resplandor radial */}
            <div className="relative h-10 w-6 flex items-end justify-center mb-1">
                <AnimatePresence>
                    {isLit && (
                        <>
                            {/* Halo exterior difuso */}
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: [1, 1.25, 0.95, 1.15, 1],
                                    opacity: [0.75, 1, 0.7, 0.95, 0.75],
                                }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute -top-3 w-12 h-12 rounded-full pointer-events-none"
                                style={{
                                    background:
                                        'radial-gradient(circle, rgba(251,191,36,0.65) 0%, rgba(245,158,11,0.2) 50%, transparent 80%)',
                                    filter: 'blur(6px)',
                                }}
                            />

                            {/* Flama exterior dorada (opacidad plena: antes quedaba en 0 y solo se veía el halo) */}
                            <motion.div
                                initial={{ scaleY: 0, opacity: 0 }}
                                animate={{
                                    scaleX: [1, 1.06, 0.96, 1.03, 1],
                                    scaleY: [1, 1.12, 0.96, 1.08, 1],
                                    rotate: side === 'left' ? [-1, 2, -2, 1] : [1, -2, 2, -1],
                                    opacity: 1,
                                }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', opacity: { duration: 0.4 } }}
                                className="relative w-[18px] h-8 origin-bottom rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%]"
                                style={{
                                    background:
                                        'radial-gradient(ellipse at 50% 85%, #ffffff 0%, #fff7c2 22%, #fcd34d 45%, #f59e0b 70%, #ea580c 100%)',
                                    filter: 'drop-shadow(0 0 6px #fde047) drop-shadow(0 0 16px rgba(245,158,11,0.9))',
                                }}
                            >
                                {/* Núcleo blanco brillante */}
                                <motion.span
                                    animate={{ opacity: [0.9, 1, 0.85, 1, 0.9], scaleY: [0.9, 1.05, 0.92, 1, 0.9] }}
                                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute left-1/2 bottom-[2px] -translate-x-1/2 w-[7px] h-[14px] origin-bottom rounded-full"
                                    style={{ background: 'radial-gradient(ellipse at 50% 80%, #ffffff 0%, #fffbe6 55%, rgba(255,251,230,0) 100%)' }}
                                />
                                {/* Base azulada, como una llama real */}
                                <span
                                    className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[6px] h-[4px] rounded-full"
                                    style={{ background: 'rgba(96,165,250,0.55)', filter: 'blur(1px)' }}
                                />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Resplandor suave antes de encender */}
                {!isLit && (
                    <div className="w-2.5 h-3 rounded-full bg-amber-400/25 group-hover:bg-amber-400/60 transition-colors animate-pulse" />
                )}
            </div>

            {/* Mecha */}
            <div className="w-[2px] h-2 bg-stone-700/80 -mt-1" />

            {/* Cuerpo del cirio de cera, flotando sobre una nube (como en Constelación Eterna) */}
            <div className="relative">
            <div
                className="w-10 sm:w-12 h-24 sm:h-28 rounded-t-sm rounded-b-none relative overflow-hidden shadow-lg border border-amber-200/40"
                style={{
                    background:
                        'linear-gradient(180deg, #fffef9 0%, #fef8eb 35%, #f5e8cf 75%, #ebd8b5 100%)',
                    boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.8), inset -2px 0 4px rgba(0,0,0,0.06)',
                }}
            >
                {/* Gotas de cera decorativas */}
                <div className="absolute top-1 left-2 w-1.5 h-5 bg-white/70 rounded-full blur-[0.5px]" />
                <div className="absolute top-1 right-2.5 w-1 h-3 bg-white/60 rounded-full blur-[0.5px]" />
                <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
            <MemorialCloud
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-14"
                tone={isDark ? 'night' : 'day'}
                delay={side === 'left' ? 0 : 2.5}
                intensity={0.55}
            />
            </div>
        </button>
    );
}
