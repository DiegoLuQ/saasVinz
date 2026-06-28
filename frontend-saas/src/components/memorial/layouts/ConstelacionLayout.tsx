import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Moon } from 'lucide-react';
import Image from 'next/image';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';

/**
 * Plantilla ULTRA "Constelación": cielo nocturno profundo donde la mascota
 * brilla como una estrella más. Retrato con halo lunar, estrellas titilantes
 * y estrellas fugaces ocasionales.
 */
export default function ConstelacionLayout(props: any) {
    const {
        memorial, mascota, randomMainImage, galleryImages,
        tenant_info, locale, t, onShare, onSendKiss, themeConfig
    } = props;

    const [litStars, setLitStars] = useState(0);
    const isDarkTheme = themeConfig?.text?.includes('white') || themeConfig?.text?.includes('50') || themeConfig?.text?.includes('slate-200');
    const portadaUrl = memorial?.diseno?.portada_url;

    // Estrellas fijas generadas una sola vez (posiciones estables entre renders)
    const stars = useMemo(() =>
        Array.from({ length: 90 }, (_, i) => ({
            id: i,
            size: Math.random() * 2.5 + 1,
            top: Math.random() * 100,
            left: Math.random() * 100,
            duration: Math.random() * 4 + 2,
            delay: Math.random() * 4,
        })), []);

    const years = `${mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'} — ${mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'}`;

    const handleLightStar = (e: React.MouseEvent) => {
        setLitStars(prev => prev + 1);
        onSendKiss?.(e);
    };

    return (
        <div
            className={`relative z-10 min-h-screen w-full overflow-hidden ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}
            style={{
                fontFamily: "'Quicksand', sans-serif",
                background: portadaUrl ? undefined : (memorial?.diseno?.color_fondo ? undefined : 'radial-gradient(ellipse at 50% 0%, #1a2151 0%, #0d1135 45%, #050816 100%)'),
                ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
        >
            {/* ─── CIELO ESTRELLADO ─── */}
            <div className="absolute inset-0 pointer-events-none">
                {stars.map(s => (
                    <motion.div
                        key={s.id}
                        className={`absolute rounded-full ${isDarkTheme ? 'bg-white' : 'bg-slate-400/40'}`}
                        style={{ width: s.size, height: s.size, top: `${s.top}%`, left: `${s.left}%` }}
                        animate={{ opacity: [0.15, 0.9, 0.15] }}
                        transition={{ duration: s.duration, delay: s.delay, repeat: Infinity }}
                    />
                ))}

                {/* Estrellas fugaces */}
                {isDarkTheme && [0, 1].map(i => (
                    <motion.div
                        key={`shooting-${i}`}
                        className="absolute h-px w-28 bg-gradient-to-r from-transparent via-white to-transparent"
                        style={{ top: `${12 + i * 22}%`, left: '-10%', rotate: '-20deg' }}
                        animate={{ x: ['0vw', '120vw'], opacity: [0, 1, 0] }}
                        transition={{ duration: 2.4, delay: 4 + i * 9, repeat: Infinity, repeatDelay: 14 }}
                    />
                ))}

                {/* Luna creciente decorativa */}
                <div className={`absolute top-10 right-8 sm:top-16 sm:right-20 ${isDarkTheme ? 'text-amber-100/30' : 'text-slate-400/20'}`}>
                    <Moon size={44} fill="currentColor" />
                </div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center">
                {/* ─── RETRATO CON HALO ─── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                    className="relative mb-10 sm:mb-12"
                >
                    {/* Halo pulsante */}
                    <motion.div
                        className="absolute inset-[-25px] sm:inset-[-35px] rounded-full"
                        style={{ background: isDarkTheme ? 'radial-gradient(circle, rgba(199,210,254,0.35) 0%, rgba(199,210,254,0.08) 50%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.04) 50%, transparent 70%)' }}
                        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className={`relative w-56 h-56 sm:w-72 sm:h-72 rounded-full p-[3px] shadow-[0_0_60px_rgba(165,180,252,0.35)] ${
                        isDarkTheme
                            ? 'bg-gradient-to-br from-indigo-200/70 via-white/40 to-indigo-300/40'
                            : 'bg-gradient-to-br from-indigo-500/40 via-white/40 to-indigo-600/40'
                    }`}>
                        <div className={`w-full h-full rounded-full overflow-hidden relative ${isDarkTheme ? 'bg-indigo-950' : 'bg-slate-100'}`}>
                            {randomMainImage ? (
                                <Image
                                    src={randomMainImage}
                                    alt={mascota?.name || 'Memorial'}
                                    fill
                                    priority
                                    sizes="(max-width: 640px) 224px, 288px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center ${isDarkTheme ? 'text-indigo-300/40' : 'text-indigo-600/40'}`}>
                                    <Star size={80} fill="currentColor" />
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Estrella en la "punta" del halo */}
                    <motion.div
                        className={`absolute -top-3 left-1/2 -translate-x-1/2 ${isDarkTheme ? 'text-amber-200' : 'text-indigo-600'}`}
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 6, repeat: Infinity }}
                    >
                        <Star size={26} fill="currentColor" />
                    </motion.div>
                </motion.div>

                {/* ─── NOMBRE Y FECHAS ─── */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1.2 }}
                    className={`text-[10px] sm:text-xs uppercase tracking-[0.45em] mb-4 ${
                        isDarkTheme ? 'text-indigo-200/60' : 'text-indigo-950/60'
                    }`}
                >
                    {locale === 'es' ? 'Una estrella más en el cielo' : 'One more star in the sky'}
                </motion.p>

                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 1.2 }}
                    className={`text-5xl sm:text-7xl md:text-8xl font-bold mb-5 bg-gradient-to-b bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(165,180,252,0.4)] ${
                        isDarkTheme ? 'from-white via-indigo-100 to-indigo-300/80' : 'from-[#1a2151] via-indigo-950 to-indigo-900'
                    }`}
                    style={{ fontFamily: "'Cinzel', serif" }}
                >
                    {mascota?.name}
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 1 }}
                    className={`inline-flex items-center gap-3 px-5 py-2 rounded-full border text-xs sm:text-sm font-bold uppercase tracking-[0.25em] mb-10 ${
                        isDarkTheme
                            ? 'border-indigo-300/20 bg-indigo-400/10 text-indigo-100/80'
                            : 'border-indigo-600/10 bg-indigo-600/5 text-indigo-900/85'
                    }`}
                >
                    <Star size={12} fill="currentColor" className={isDarkTheme ? 'text-amber-200' : 'text-indigo-600'} />
                    {years}
                    <Star size={12} fill="currentColor" className={isDarkTheme ? 'text-amber-200' : 'text-indigo-600'} />
                </motion.div>

                {/* ─── MENSAJE ─── */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2 }}
                    className={`max-w-2xl text-lg sm:text-xl leading-relaxed mb-12 ${
                        isDarkTheme ? 'text-indigo-100/85' : 'text-slate-700'
                    }`}
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}
                >
                    {memorial?.msg_despedida || t.philosophy_text || (locale === 'es'
                        ? 'Cuando mires al cielo de noche, una de esas estrellas te estará cuidando.'
                        : 'When you look at the night sky, one of those stars will be watching over you.')}
                </motion.p>

                {/* ─── ENCENDER UNA ESTRELLA ─── */}
                <div className="relative mb-12">
                    <button
                        onClick={handleLightStar}
                        className={`group px-8 sm:px-10 py-4 rounded-full border font-bold text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-[0_0_30px_rgba(129,140,248,0.2)] ${
                            isDarkTheme
                                ? 'bg-gradient-to-r from-indigo-400/20 to-purple-400/20 hover:from-indigo-400/30 hover:to-purple-400/30 border-indigo-300/30 text-indigo-100'
                                : 'bg-gradient-to-r from-indigo-600/10 to-indigo-700/10 hover:from-indigo-600/20 hover:to-indigo-700/20 border-indigo-600/20 text-indigo-950'
                        }`}
                    >
                        <Star size={18} className={litStars > 0 ? 'fill-amber-200 text-amber-200' : (isDarkTheme ? 'text-indigo-200 group-hover:text-amber-200 transition-colors' : 'text-indigo-600 group-hover:text-indigo-800 transition-colors')} />
                        {litStars > 0
                            ? (locale === 'es' ? `Brillando (${litStars})` : `Shining (${litStars})`)
                            : (locale === 'es' ? 'Encender una estrella' : 'Light a star')}
                    </button>
                    <AnimatePresence>
                        {litStars > 0 && (
                            <motion.div
                                key={litStars}
                                initial={{ y: 0, opacity: 1, scale: 1 }}
                                animate={{ y: -180, opacity: 0, scale: 1.6 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.6, ease: 'easeOut' }}
                                className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none text-2xl"
                            >
                                ⭐
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className={isDarkTheme ? '[&_button]:!bg-white/10 [&_button]:!text-indigo-100 [&_button]:!border-indigo-300/20 [&_button:hover]:!bg-white/20' : '[&_button]:!bg-black/5 [&_button]:!text-slate-800 [&_button]:!border-slate-300/30 [&_button:hover]:!bg-black/10'}>
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

                {/* ─── CONSTELACIÓN DE RECUERDOS (galería) ─── */}
                {galleryImages?.length > 1 && (
                    <div className="mt-20 w-full">
                        <p className={`text-[10px] uppercase tracking-[0.5em] mb-8 ${
                            isDarkTheme ? 'text-indigo-200/40' : 'text-slate-500/40'
                        }`}>
                            {locale === 'es' ? 'Constelación de recuerdos' : 'Constellation of memories'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-5 sm:gap-8">
                            {galleryImages.map((img: string, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15, duration: 0.8 }}
                                    className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 shadow-[0_0_25px_rgba(129,140,248,0.25)] hover:scale-110 transition-all duration-500 ${
                                        isDarkTheme ? 'border-indigo-300/30 hover:border-amber-200/50' : 'border-indigo-600/30 hover:border-indigo-600'
                                    }`}
                                    style={{ marginTop: i % 2 === 1 ? '2rem' : '0' }}
                                >
                                    <Image src={img} alt={`${mascota?.name} ${i + 1}`} fill sizes="128px" className="object-cover" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
