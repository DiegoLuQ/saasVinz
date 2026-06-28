import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, ChevronDown, Quote } from 'lucide-react';
import Image from 'next/image';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';

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
    const overlayOpacity = useTransform(scrollYProgress, [0, 0.8], [0, 0.85]);

    const isDarkTheme = themeConfig?.text?.includes('white') || themeConfig?.text?.includes('50') || themeConfig?.text?.includes('slate-200');
    const colorFondo = memorial?.diseno?.color_fondo;

    const topGradientStyle = colorFondo
        ? { background: `linear-gradient(to bottom, ${colorFondo} 0%, ${colorFondo}99 50%, transparent 100%)` }
        : { background: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.6) 50%, transparent 100%)' };

    const bottomGradientStyle = colorFondo
        ? { background: `linear-gradient(to top, ${colorFondo} 0%, ${colorFondo}B3 50%, transparent 100%)` }
        : { background: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.7) 50%, transparent 100%)' };

    const overlayStyle = colorFondo
        ? { backgroundColor: colorFondo }
        : { backgroundColor: 'black' };

    const years = `${mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'} — ${mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'}`;

    return (
        <div 
            className={`relative z-10 w-full ${colorFondo ? '' : 'bg-black'} ${isDarkTheme ? 'text-white' : 'text-slate-900'}`} 
            style={{ fontFamily: "'Marcellus', serif" }}
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
                    {(() => {
                        const heroImage = memorial?.diseno?.portada_url || randomMainImage;
                        return heroImage ? (
                            <Image
                                src={heroImage}
                                alt={mascota?.name || 'Memorial'}
                                fill
                                priority
                                sizes="100vw"
                                className="object-cover object-center"
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${isDarkTheme ? 'bg-gradient-to-br from-zinc-900 to-black' : 'bg-stone-200'}`}>
                                <Heart size={120} className={isDarkTheme ? 'text-white/10' : 'text-black/5'} fill="currentColor" />
                            </div>
                        );
                    })()}
                    </motion.div>
                </motion.div>

                {/* Overlays para evitar banding y garantizar legibilidad */}
                {/* Desvanecimiento superior sutil */}
                <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none z-1" />
                
                {/* Oscurecimiento central sutil y desenfoque ligero para legibilidad sobre nubes */}
                <div className="absolute inset-0 bg-black/15 backdrop-blur-[0.5px] pointer-events-none z-1" />
                
                {/* Desvanecimiento inferior suave que se disuelve en la niebla celestial de la segunda sección */}
                <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/90 to-transparent pointer-events-none z-1" />

                {/* Título y créditos centrados vertical y horizontalmente en el héroe */}
                <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl select-none">
                    <motion.p
                        initial={{ opacity: 0, letterSpacing: '0.2em' }}
                        animate={{ opacity: 0.85, letterSpacing: '0.45em' }}
                        transition={{ duration: 2, delay: 0.4 }}
                        className="text-xs sm:text-sm uppercase mb-6 text-white font-light tracking-[0.45em]"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                        {locale === 'es' ? 'En memoria de' : 'In loving memory of'}
                    </motion.p>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
                        className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none mb-8 text-[#0f172a] font-normal drop-shadow-[0_2px_15px_rgba(255,255,255,0.7)]"
                        style={{ 
                            fontFamily: "'Cormorant Garamond', serif",
                            textShadow: '0 2px 10px rgba(255, 255, 255, 0.9), 0 0 40px rgba(255, 255, 255, 0.5)'
                        }}
                    >
                        {mascota?.name}
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 0.8, scaleX: 1 }}
                        transition={{ duration: 1.2, delay: 1.5 }}
                        className="flex items-center gap-6 text-sm sm:text-base tracking-[0.3em] text-[#3a3a3a] font-semibold"
                        style={{ fontFamily: "'Quicksand', sans-serif" }}
                    >
                        <span className="h-[2px] w-8 sm:w-16 bg-[#3a3a3a]/40" />
                        {years}
                        <span className="h-[2px] w-8 sm:w-16 bg-[#3a3a3a]/40" />
                    </motion.div>
                </div>

                {/* Indicador de scroll (Chevron inferior) - Faro de guía en transición */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                    <motion.div
                        animate={{ 
                            y: [0, 6, 0],
                            opacity: [0.4, 0.85, 0.4]
                        }}
                        transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: 'easeInOut' 
                        }}
                        className="text-[#5a5045] hover:text-[#2c2217] transition-colors cursor-pointer"
                    >
                        <ChevronDown size={36} strokeWidth={1.5} />
                    </motion.div>
                </div>
            </div>

            {/* ─── EPITAFIO (Niebla Celestial) ─── */}
            <div className="relative w-full bg-[#FDFBF7] py-24 sm:py-32 overflow-hidden">
                {/* Textura de partículas / Nubes de fondo sutiles */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay bg-repeat" 
                     style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
                
                <div className="relative max-w-4xl mx-auto px-6 text-center z-10 flex flex-col items-center">
                    {/* Icono de comillas minimalista en color champaña/dorado apagado */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 0.15, scale: 1 }}
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
                        className="text-2xl sm:text-3xl md:text-4xl leading-relaxed italic text-[#3E3E3E] font-light px-4"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                        {memorial?.msg_despedida || t.philosophy_text || (locale === 'es'
                            ? 'Las grandes historias nunca terminan; solo cambian de escenario.'
                            : 'Great stories never end; they only change their stage.')}
                    </motion.p>

                    {/* Botones de acción flotantes (Estilo Éter/Glassmorphism) */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="mt-16 w-full flex justify-center [&_button]:!bg-white/45 [&_button]:!backdrop-blur-md [&_button]:!text-[#3E3E3E] [&_button]:!border-white/80 [&_button]:!shadow-[0_4px_20px_rgba(0,0,0,0.02)] [&_button:hover]:!bg-white/90 [&_button:hover]:!-translate-y-0.5"
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
                <div className="relative pb-20 sm:pb-28">
                    <p className={`text-center text-[10px] uppercase tracking-[0.5em] mb-8 ${isDarkTheme ? 'text-white/30' : 'text-slate-900/30'}`}>
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
                                transition={{ delay: i * 0.12 }}
                                className={`relative shrink-0 w-40 sm:w-52 aspect-[3/4] rounded-sm overflow-hidden border-y-4 border-black ring-1 grayscale hover:grayscale-0 transition-all duration-700 hover:scale-[1.03] ${isDarkTheme ? 'ring-white/15' : 'ring-black/10'}`}
                            >
                                <Image src={img} alt={`${mascota?.name} ${i + 1}`} fill sizes="208px" className="object-cover" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
