"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/tenant/api';
import { usePlatformInfo, whatsappLink, type DashboardSlide } from '@/lib/platformInfo';
import { overlayBackground, slideTextClasses } from '@/lib/dashboardSlides';

const AUTOPLAY_MS = 7000;

/** Diapositiva principal original: va siempre primero. El admin puede editarla;
 *  lo que falte (o una imagen que no carga) se completa con esto. */
const DEFAULT_IMAGE = '/images/vinzer-hero-banner.jpg';
const DEFAULT_SLIDE: DashboardSlide = {
    image_url: DEFAULT_IMAGE,
    title: 'Cada historia\nmerece un adiós digno',
    message: 'Gestiona de forma simple y segura todo el proceso de cremación de mascotas.',
    button_label: '',
    whatsapp_text: '',
    show_button: false,
    overlay_auto: true,
};

const imageSrc = (url: string) => (url.startsWith('/images/') ? url : getImageUrl(url));

/**
 * Banner del inicio del crematorio. Carrusel con la diapositiva principal
 * (editable, nunca se quita) más hasta 3 extra (imagen, título, mensaje y botón de
 * WhatsApp a Vinzer), todo editado en Configuración → «Banner del panel».
 * Si algo no carga (API o imagen), la principal vuelve a la original.
 * Avanza solo cada 7 s y se pausa al pasar el mouse.
 */
export default function DashboardHeroCarousel() {
    const info = usePlatformInfo();
    const [failed, setFailed] = useState<Set<string>>(() => new Set());
    // Principal: la editada en el admin, completada con la original. Las extra cuya
    // imagen no carga se saltan; si la de la principal falla, vuelve la original.
    const saved = info.dashboard_default_slide;
    const customImageFailed = !!saved?.image_url && failed.has(saved.image_url);
    const effectiveImage = (saved?.image_url && !customImageFailed) ? saved.image_url : DEFAULT_IMAGE;
    const principal: DashboardSlide = saved ? {
        ...saved,
        title: saved.title || DEFAULT_SLIDE.title,
        image_url: effectiveImage,
        pos_x: customImageFailed ? 80 : (saved.pos_x ?? 80),
        pos_y: customImageFailed ? 50 : (saved.pos_y ?? 50),
    } : DEFAULT_SLIDE;
    const slides = [principal, ...(info.dashboard_slides ?? []).filter((sl) => !failed.has(sl.image_url))];
    const [index, setIndex] = useState(0);

    // Precarga las imágenes del admin para detectar las que no cargan.
    useEffect(() => {
        for (const sl of [...(info.dashboard_slides ?? []), ...(saved ? [saved] : [])]) {
            if (!sl.image_url) continue;
            const img = new Image();
            img.onerror = () => setFailed((prev) => new Set(prev).add(sl.image_url));
            img.src = imageSrc(sl.image_url);
        }
    }, [info.dashboard_slides, saved]);
    const [paused, setPaused] = useState(false);
    const count = slides.length;
    const current = slides[Math.min(index, count - 1)];

    useEffect(() => {
        if (count < 2 || paused) return;
        const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
        return () => clearInterval(t);
    }, [count, paused]);

    const go = (dir: -1 | 1) => setIndex((i) => (i + dir + count) % count);
    const wa = current.show_button ? whatsappLink(info.whatsapp, current.whatsapp_text || undefined) : null;
    // Degradado propio, o automático (celeste / azul noche según el modo, como la original).
    const custom = !current.overlay_auto && !!current.overlay_color;
    const text = slideTextClasses(current.text_theme);

    return (
        <div
            className="relative overflow-hidden rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 min-h-[190px] sm:min-h-[220px] flex items-center bg-[#D8EDFA] dark:bg-[#0B1628]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-roledescription="carrusel"
        >
            <AnimatePresence mode="sync">
                <motion.div
                    key={`bg-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-cover bg-no-repeat dark:opacity-75"
                    style={{
                        backgroundImage: current.image_url ? `url('${imageSrc(current.image_url)}')` : undefined,
                        // Encuadre elegido en el admin; por defecto cargado a la derecha y centrado.
                        backgroundPosition: `${current.pos_x ?? 80}% ${current.pos_y ?? 50}%`,
                    }}
                />
            </AnimatePresence>

            {/* Degradé a la izquierda para que el texto se lea sobre cualquier foto. Las diapositivas del
                admin usan su propio color; el banner de siempre sigue el modo claro / oscuro. */}
            {custom ? (
                <div className="absolute inset-0 sm:w-2/3 transition-[background] duration-500" style={{ background: overlayBackground(current.overlay_color, current.overlay_opacity) }} />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-[#D8EDFA] via-[#D8EDFA]/85 to-transparent sm:w-2/3 dark:from-[#0B1628] dark:via-[#0B1628]/85" />
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={`txt-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className={`relative z-10 px-6 sm:px-10 py-6 max-w-xl ${count > 1 ? 'pb-10' : ''}`}
                >
                    {/* role=heading y no <h1>: el CSS del panel en modo claro fuerza `main h1` a azul
                        oscuro con !important y taparía el texto blanco de los degradados oscuros. */}
                    {current.title && (
                        <p role="heading" aria-level={1} className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight whitespace-pre-line ${custom ? text.title : 'text-[#0A192F] dark:text-white'}`}>
                            {current.title}
                        </p>
                    )}
                    {current.message && (
                        <p className={`mt-2.5 text-xs sm:text-sm font-medium leading-relaxed max-w-md whitespace-pre-line ${custom ? text.message : 'text-slate-600 dark:text-slate-300'}`}>
                            {current.message}
                        </p>
                    )}
                    {wa && (
                        <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba5a] px-5 py-2.5 text-xs font-black text-[#062e16] shadow-md shadow-[#25D366]/25 transition-colors"
                        >
                            <MessageCircle size={15} /> {current.button_label || 'Escríbenos por WhatsApp'}
                        </a>
                    )}
                </motion.div>
            </AnimatePresence>

            {count > 1 && (
                <div className="absolute bottom-3 left-6 right-4 sm:left-10 z-20 flex items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                        {slides.map((_, i) => (
                            <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`Ir a la diapositiva ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-[#0A192F] dark:bg-white' : 'w-1.5 bg-[#0A192F]/30 dark:bg-white/40'}`} />
                        ))}
                    </div>
                    <div className="flex gap-1.5">
                        {([[-1, ChevronLeft, 'Anterior'], [1, ChevronRight, 'Siguiente']] as const).map(([dir, Icon, label]) => (
                            <button key={label} type="button" onClick={() => go(dir)} aria-label={label}
                                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center shadow-sm dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900">
                                <Icon size={16} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
