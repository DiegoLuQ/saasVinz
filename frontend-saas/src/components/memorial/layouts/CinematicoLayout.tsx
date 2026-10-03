import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import { getLifeDates, nameSizeClass, pageBackgroundHex } from '@/lib/memorialDesign';

/**
 * Plantilla ULTRA "Cinemático": héroe a pantalla completa con efecto Ken Burns,
 * barras letterbox y tipografía épica. Antes era un stub que caía a NormalLayout.
 */
export default function CinematicoLayout(props: any) {
    const {
        memorial, mascota, randomMainImage, galleryImages,
        tenant_info, locale, t, onShare, onSendKiss, themeConfig
    } = props;

    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start']
    });
    const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);

    // El epitafio y la galería se pintan con el fondo real de la página (tema o
    // color propio); antes eran crema y negro fijos, sin importar el tema.
    const isDarkPage = !!themeConfig?.dark;
    const pageBg = pageBackgroundHex(themeConfig, memorial?.diseno?.color_fondo);
    const petName = mascota?.name || '';
    const dates = getLifeDates(mascota?.birth_date, mascota?.death_date, locale);
    const heroImage = memorial?.diseno?.portada_url || randomMainImage;

    return (
        <div
            className={`relative z-10 w-full ${isDarkPage ? 'text-white' : 'text-slate-900'}`}
            style={{ fontFamily: "'Marcellus', serif", backgroundColor: pageBg }}
        >
            {/* ─── HERO CINEMATOGRÁFICO ─── */}
            <div ref={heroRef} className="relative h-[100svh] w-full overflow-hidden flex flex-col items-center justify-center">
                {/* Imagen con Ken Burns (zoom lento permanente) + parallax al scrollear */}
                <motion.div className="absolute inset-0 z-0" style={{ y: imageY }}>
                    <motion.div
                        className="absolute inset-0"
                        animate={{ scale: [1, 1.08] }}
                        transition={{ duration: 24, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
                    >
                        {heroImage ? (
                            <Image
                                src={heroImage}
                                alt={petName || 'Memorial'}
                                fill
                                priority
                                sizes="100vw"
                                className="object-cover object-center"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
                                <Heart size={120} className="text-white/10" fill="currentColor" />
                            </div>
                        )}
                    </motion.div>
                </motion.div>

                {/* Velo de póster: oscurece la foto para que el título blanco se lea
                    sobre cualquier imagen (antes: título casi negro con brillo blanco) */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/55 pointer-events-none z-[1]" />

                {/* Desvanecimiento inferior hacia el color del epitafio */}
                <div
                    className="absolute inset-x-0 bottom-0 h-72 pointer-events-none z-[1]"
                    style={{ background: `linear-gradient(to top, ${pageBg} 0%, ${pageBg} 18%, transparent 100%)` }}
                />

                {/* Título y créditos centrados vertical y horizontalmente en el héroe */}
                <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl select-none text-white">
                    <motion.p
                        initial={{ opacity: 0, letterSpacing: '0.2em' }}
                        animate={{ opacity: 0.85, letterSpacing: '0.45em' }}
                        transition={{ duration: 2, delay: 0.4 }}
                        className="text-xs sm:text-sm uppercase mb-6 font-light tracking-[0.45em]"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                        {locale === 'es' ? 'En memoria de' : 'In loving memory of'}
                    </motion.p>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
                        className={`${nameSizeClass(petName, {
                            short: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl',
                            long: 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl',
                            xlong: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
                        })} leading-none break-words max-w-full mb-8 font-normal`}
                        style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            textShadow: '0 2px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.3)'
                        }}
                    >
                        {petName}
                    </motion.h1>

                    {dates.years && (
                        <motion.div
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 0.9, scaleX: 1 }}
                            transition={{ duration: 1.2, delay: 1.5 }}
                            className="flex items-center gap-6 text-sm sm:text-base tracking-[0.3em] font-semibold"
                            style={{ fontFamily: "'Quicksand', sans-serif", textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
                        >
                            <span className="h-[2px] w-8 sm:w-16 bg-white/50" />
                            {dates.years}
                            <span className="h-[2px] w-8 sm:w-16 bg-white/50" />
                        </motion.div>
                    )}
                </div>

                {/* Indicador de scroll */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <motion.div
                        animate={{ y: [0, 6, 0], opacity: [0.4, 0.85, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className={isDarkPage ? 'text-white/70' : 'text-[#5a5045]'}
                    >
                        <ChevronDown size={36} strokeWidth={1.5} />
                    </motion.div>
                </div>
            </div>

            {/* ─── EPITAFIO ─── */}
            <div className="relative w-full -mt-px py-24 sm:py-32 overflow-hidden" style={{ backgroundColor: pageBg }}>
                <div className="relative max-w-4xl mx-auto px-6 text-center z-10 flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 0.25, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="mb-8 text-[#C5A880]"
                    >
                        <svg className="w-12 h-12 fill-current mx-auto" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                        </svg>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        className={`text-2xl sm:text-3xl md:text-4xl leading-relaxed italic font-light px-4 ${isDarkPage ? 'text-white/90' : 'text-[#3E3E3E]'}`}
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                        {memorial?.msg_despedida}
                    </motion.p>

                    {dates.yearsOfLove && (
                        <p className={`mt-6 text-xs uppercase tracking-[0.4em] ${isDarkPage ? 'text-white/50' : 'text-slate-500'}`}
                            style={{ fontFamily: "'Quicksand', sans-serif" }}>
                            {dates.yearsOfLove}
                        </p>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className={`mt-16 w-full flex justify-center ${isDarkPage
                            ? '[&_button]:!bg-white/10 [&_button]:!backdrop-blur-md [&_button]:!text-white [&_button]:!border-white/20 [&_button:hover]:!bg-white/20'
                            : '[&_button]:!bg-white/45 [&_button]:!backdrop-blur-md [&_button]:!text-[#3E3E3E] [&_button]:!border-white/80 [&_button]:!shadow-[0_4px_20px_rgba(0,0,0,0.02)] [&_button:hover]:!bg-white/90'
                        } [&_button:hover]:!-translate-y-0.5`}
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

            {/* ─── TIRA DE FOTOGRAMAS (galería) ─── */}
            {galleryImages?.length > 1 && (
                <div className="relative pb-24 sm:pb-28">
                    <p className={`text-center text-[10px] uppercase tracking-[0.5em] mb-8 ${isDarkPage ? 'text-white/40' : 'text-slate-900/40'}`}>
                        {locale === 'es' ? 'Escenas de una vida' : 'Scenes from a life'}
                    </p>
                    {/* scrollbar oculto inline: la utilidad .no-scrollbar solo existe en el CSS del grupo tenant */}
                    <div
                        className="flex gap-3 sm:gap-4 overflow-x-auto px-6 sm:justify-center [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {galleryImages.map((img: string, i: number) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: Math.min(i, 6) * 0.12 }}
                                // En táctil no hay hover: las fotos van a color; el blanco
                                // y negro "de película" queda solo para escritorio.
                                className={`relative shrink-0 w-40 sm:w-52 aspect-[3/4] rounded-sm overflow-hidden border-y-4 border-black ring-1 md:grayscale md:hover:grayscale-0 transition-all duration-700 hover:scale-[1.03] ${isDarkPage ? 'ring-white/15' : 'ring-black/10'}`}
                            >
                                <Image src={img} alt={`${petName} ${i + 1}`} fill sizes="208px" className="object-cover" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
