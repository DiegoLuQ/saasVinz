import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Moon } from 'lucide-react';
import Image from 'next/image';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import { getLifeDates, isDarkSurface, nameSizeClass, seededRandom } from '@/lib/memorialDesign';
import { ritualLabel, type RitualProps } from '@/lib/memorialRituals';

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
    const portadaUrl = memorial?.diseno?.portada_url;
    // Sin portada ni color propio se pinta el cielo nocturno: el texto debe ser claro
    // aunque el tema elegido sea "claro".
    const usesNightSky = !portadaUrl && !memorial?.diseno?.color_fondo;
    // Sobre portada se aplica un velo oscuro: el texto siempre va claro
    const isDarkTheme = usesNightSky || isDarkSurface(themeConfig, portadaUrl);

    // Estrellas deterministas (mismas en servidor y cliente) animadas con CSS:
    // 90 nodos de framer-motion costaban mucho en celulares de gama baja.
    const stars = useMemo(() => {
        const rand = seededRandom(90);
        return Array.from({ length: 90 }, (_, i) => ({
            id: i,
            size: rand() * 2.5 + 1,
            top: rand() * 100,
            left: rand() * 100,
            duration: rand() * 4 + 2,
            delay: rand() * 4,
        }));
    }, []);

    const petName = mascota?.name || '';
    const dates = getLifeDates(mascota?.birth_date, mascota?.death_date, locale);

    const rituals: RitualProps | undefined = props.rituals;
    const starCount = rituals?.counts.estrella || 0;
    const [askingName, setAskingName] = useState(false);
    const [starName, setStarName] = useState('');
    const [activeStar, setActiveStar] = useState<number | null>(null);

    // Cada estrella encendida queda en el cielo, en una posición estable según
    // su id (franja superior, lejos del retrato y del texto).
    const litStarPositions = useMemo(() => (rituals?.stars || []).map(st => {
        const rand = seededRandom(Math.abs(st.id) + 7);
        const side = rand() < 0.5;
        return {
            ...st,
            top: 4 + rand() * 40,
            left: side ? 3 + rand() * 25 : 72 + rand() * 25,
            size: 10 + rand() * 6,
        };
    }), [rituals?.stars]);

    const confirmStar = () => {
        const name = starName.trim();
        setLitStars(prev => prev + 1);
        setAskingName(false);
        setStarName('');
        rituals?.send('estrella', name || undefined);
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
            <style>{`
                @keyframes constelacion-twinkle { 0%, 100% { opacity: .15 } 50% { opacity: .9 } }
                @media (prefers-reduced-motion: reduce) { .constelacion-star { animation: none !important; opacity: .5 } }
            `}</style>

            {/* Velo para que el texto se lea sobre cualquier portada */}
            {portadaUrl && <div className="absolute inset-0 bg-[#050816]/55 pointer-events-none" />}

            {/* ─── CIELO ESTRELLADO ─── */}
            <div className="absolute inset-0 pointer-events-none">
                {stars.map(s => (
                    <div
                        key={s.id}
                        className={`constelacion-star absolute rounded-full ${isDarkTheme ? 'bg-white' : 'bg-slate-400/40'}`}
                        style={{
                            width: s.size, height: s.size, top: `${s.top}%`, left: `${s.left}%`,
                            animation: `constelacion-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                        }}
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

                {/* Estrellas encendidas por los visitantes */}
                {litStarPositions.map(st => (
                    <button
                        key={st.id}
                        type="button"
                        onClick={() => setActiveStar(activeStar === st.id ? null : st.id)}
                        className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                        style={{ top: `${st.top}%`, left: `${st.left}%` }}
                        aria-label={st.name
                            ? (locale === 'es' ? `Estrella encendida por ${st.name}` : `Star lit by ${st.name}`)
                            : (locale === 'es' ? 'Estrella encendida' : 'Lit star')}
                    >
                        <Star
                            size={st.size}
                            className="text-amber-200 fill-amber-200 drop-shadow-[0_0_6px_rgba(253,230,138,0.9)]"
                        />
                        {activeStar === st.id && (
                            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-[11px] text-amber-100 backdrop-blur-sm">
                                {st.name
                                    ? (locale === 'es' ? `Encendida por ${st.name}` : `Lit by ${st.name}`)
                                    : (locale === 'es' ? 'Una estrella para siempre' : 'A star forever')}
                            </span>
                        )}
                    </button>
                ))}

                {/* Luna creciente decorativa */}
                <div className={`absolute top-10 right-8 sm:top-16 sm:right-20 ${isDarkTheme ? 'text-amber-100/30' : 'text-slate-400/20'}`}>
                    <Moon size={44} fill="currentColor" />
                </div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center pointer-events-none [&>*]:pointer-events-auto">
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
                    className={`${nameSizeClass(petName, {
                        short: 'text-5xl sm:text-7xl md:text-8xl',
                        long: 'text-4xl sm:text-6xl md:text-7xl',
                        xlong: 'text-3xl sm:text-5xl md:text-6xl',
                    })} font-bold mb-5 leading-tight break-words max-w-full bg-gradient-to-b bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(165,180,252,0.4)] ${
                        isDarkTheme ? 'from-white via-indigo-100 to-indigo-300/80' : 'from-[#1a2151] via-indigo-950 to-indigo-900'
                    }`}
                    style={{ fontFamily: "'Cinzel', serif" }}
                >
                    {mascota?.name}
                </motion.h1>

                {dates.years && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 1 }}
                    className={`inline-flex items-center gap-3 px-5 py-2 rounded-full border text-xs sm:text-sm font-bold uppercase tracking-[0.25em] ${dates.yearsOfLove ? 'mb-3' : 'mb-10'} ${
                        isDarkTheme
                            ? 'border-indigo-300/20 bg-indigo-400/10 text-indigo-100/80'
                            : 'border-indigo-600/10 bg-indigo-600/5 text-indigo-900/85'
                    }`}
                >
                    <Star size={12} fill="currentColor" className={isDarkTheme ? 'text-amber-200' : 'text-indigo-600'} />
                    {dates.years}
                    <Star size={12} fill="currentColor" className={isDarkTheme ? 'text-amber-200' : 'text-indigo-600'} />
                </motion.div>
                )}
                {dates.yearsOfLove && (
                    <p
                        className={`mb-10 text-base sm:text-lg italic ${isDarkTheme ? 'text-indigo-100/70' : 'text-slate-600'}`}
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                        {dates.yearsOfLove}
                    </p>
                )}

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
                <div className="relative mb-12 flex flex-col items-center">
                    {askingName ? (
                        <form
                            onSubmit={(e) => { e.preventDefault(); confirmStar(); }}
                            className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-3xl sm:rounded-full border w-full max-w-md ${
                                isDarkTheme ? 'bg-white/5 border-indigo-300/30' : 'bg-white/70 border-indigo-600/20'
                            }`}
                        >
                            <input
                                autoFocus
                                value={starName}
                                maxLength={40}
                                onChange={(e) => setStarName(e.target.value)}
                                placeholder={locale === 'es' ? 'Tu nombre (opcional)' : 'Your name (optional)'}
                                className={`flex-1 min-w-0 bg-transparent px-4 py-2.5 outline-none text-base ${
                                    isDarkTheme ? 'text-white placeholder:text-indigo-200/50' : 'text-slate-800 placeholder:text-slate-400'
                                }`}
                            />
                            <button
                                type="submit"
                                className="px-6 py-2.5 rounded-full bg-amber-200 text-indigo-950 text-xs font-bold uppercase tracking-widest hover:bg-amber-100 transition-colors"
                            >
                                {locale === 'es' ? 'Encender' : 'Light'}
                            </button>
                        </form>
                    ) : (
                    <button
                        onClick={() => setAskingName(true)}
                        className={`group px-8 sm:px-10 py-4 rounded-full border font-bold text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-[0_0_30px_rgba(129,140,248,0.2)] ${
                            isDarkTheme
                                ? 'bg-gradient-to-r from-indigo-400/20 to-purple-400/20 hover:from-indigo-400/30 hover:to-purple-400/30 border-indigo-300/30 text-indigo-100'
                                : 'bg-gradient-to-r from-indigo-600/10 to-indigo-700/10 hover:from-indigo-600/20 hover:to-indigo-700/20 border-indigo-600/20 text-indigo-950'
                        }`}
                    >
                        <Star size={18} className={litStars > 0 ? 'fill-amber-200 text-amber-200' : (isDarkTheme ? 'text-indigo-200 group-hover:text-amber-200 transition-colors' : 'text-indigo-600 group-hover:text-indigo-800 transition-colors')} />
                        {litStars > 0
                            ? (locale === 'es' ? 'Encender otra estrella' : 'Light another star')
                            : (locale === 'es' ? 'Encender una estrella' : 'Light a star')}
                    </button>
                    )}
                    {starCount > 0 && (
                        <p className={`mt-3 text-sm italic ${isDarkTheme ? 'text-indigo-100/70' : 'text-slate-600'}`}
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            ⭐ {locale === 'es'
                                ? `${ritualLabel('estrella', starCount, locale)} en su cielo`
                                : `${ritualLabel('estrella', starCount, locale)} in their sky`}
                        </p>
                    )}
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
