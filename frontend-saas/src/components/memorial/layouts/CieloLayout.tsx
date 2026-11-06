import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Flame,
    Cloud as CloudIcon
} from 'lucide-react';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import MemorialCandleRow from '@/components/memorial/MemorialCandleRow';
import { getLifeDates, isDarkSurface, nameSizeClass, seededRandom, getMemorialThemeStyles, getMemorialAtmosphereBg } from '@/lib/memorialDesign';
import { ritualLabel, type RitualProps } from '@/lib/memorialRituals';

export default function CieloLayout(props: any) {
    const { memorial, mascota, randomMainImage, t, themeConfig, tenant_info, locale, onShare, onSendKiss } = props;
    const [sentKisses, setSentKisses] = useState(0);
    const rituals: RitualProps | undefined = props.rituals;
    const [candleLitLocal, setCandleLitLocal] = useState(false);

    const kissCount = rituals?.counts?.beso || 0;
    const candleCount = rituals?.counts?.vela || 0;
    const isCandleLit = candleLitLocal || Boolean(rituals?.did?.vela);
    // Las velas grandes empiezan apagadas: se prenden cuando este visitante toca
    // «Encender una velita» y siguen prendidas al volver. La fila bajo la foto muestra las de todos.
    const flameOn = isCandleLit;

    const sendKiss = () => {
        setSentKisses(prev => prev + 1);
        rituals?.send('beso');
    };

    const lightCandle = () => {
        rituals?.playMusic?.();
        if (isCandleLit) return;
        setCandleLitLocal(true);
        rituals?.send('vela');
    };

    const portadaUrl = memorial?.diseno?.portada_url;
    const tema = memorial?.diseno?.tema || 'cielo';
    const isDarkTheme = isDarkSurface(themeConfig, portadaUrl);
    const themeStyles = getMemorialThemeStyles(tema, isDarkTheme);
    const petName = mascota?.name || '';
    const dates = getLifeDates(mascota?.birth_date, mascota?.death_date, locale);

    const sparkles = useMemo(() => {
        const rand = seededRandom(20);
        return Array.from({ length: 20 }, (_, i) => ({
            id: i,
            size: Number((rand() * 4 + 2).toFixed(2)),
            top: Number((rand() * 100).toFixed(2)),
            left: Number((rand() * 100).toFixed(2)),
            duration: Number((rand() * 3 + 2).toFixed(2)),
        }));
    }, []);

    return (
        <div
            suppressHydrationWarning
            className={`relative z-10 min-h-screen w-full flex items-center justify-center px-4 py-12 sm:p-6 overflow-hidden ${
                isDarkTheme ? 'text-white' : 'text-slate-900'
            }`}
            style={{
                fontFamily: "'Quicksand', sans-serif",
                background: portadaUrl
                    ? undefined
                    : getMemorialAtmosphereBg('cielo', tema, isDarkTheme),
                ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
        >
            {/* Velo para que el texto se lea sobre cualquier portada */}
            {portadaUrl && <div className={`absolute inset-0 pointer-events-none ${isDarkTheme ? 'bg-[#0b1a33]/65' : 'bg-black/30'}`} />}

            {/* Background Decorations */}
            <div className="absolute inset-0 pointer-events-none">
                {sparkles.map(s => (
                    <motion.div
                        key={s.id}
                        className="absolute bg-white rounded-full shadow-[0_0_10px_white]"
                        style={{ width: s.size, height: s.size, top: `${s.top}%`, left: `${s.left}%` }}
                        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ duration: s.duration, repeat: Infinity }}
                    />
                ))}
                <div className="absolute top-[10%] left-[-5%] w-80 h-32 bg-white/40 blur-[40px] rounded-full animate-pulse motion-reduce:animate-none" />
                <div className="absolute bottom-[20%] right-[-5%] w-96 h-40 bg-white/40 blur-[40px] rounded-full animate-pulse motion-reduce:animate-none" />
            </div>

            <div className={`max-w-6xl w-full backdrop-blur-xl border rounded-[32px] sm:rounded-[40px] p-6 sm:p-12 md:p-16 flex flex-col md:flex-row items-center gap-10 md:gap-16 relative z-10 shadow-2xl ${
                isDarkTheme ? 'bg-white/10 border-white/25' : 'bg-white/25 border-white/60'
            }`}>
                {/* Cover Portrait + Celestial Candle Section */}
                <div className="flex-1 flex flex-col items-center relative">
                    {/* Halo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square opacity-40 pointer-events-none">
                        <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full" />
                    </div>

                    <motion.div
                        animate={{ y: [-8, 8, -8] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="relative w-[240px] sm:w-[280px] md:w-[340px] aspect-[3/4] p-3 rounded-[150px_150px_24px_24px] shadow-2xl"
                        style={{ background: 'linear-gradient(45deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)' }}
                    >
                        <div className="w-full h-full bg-white rounded-[145px_145px_18px_18px] overflow-hidden border border-black/5 relative">
                            {randomMainImage ? (
                                <img src={randomMainImage} className="w-full h-full object-cover" alt={petName} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-blue-200">
                                    <CloudIcon size={100} />
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
                        </div>

                        {/* Interactive Celestial Candle at base of cover frame */}
                        <button
                            onClick={lightCandle}
                            title={locale === 'en' ? 'Light a candle' : 'Encender una vela conmemorativa'}
                            className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center group cursor-pointer focus:outline-none"
                        >
                            <div className="relative h-7 flex items-end justify-center">
                                <AnimatePresence>
                                    {flameOn && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: [1, 1.12, 0.96, 1.06, 1], opacity: 1 }}
                                            transition={{ duration: 2, repeat: Infinity, opacity: { duration: 0.4 } }}
                                            className="w-4 h-6 rounded-full"
                                            style={{
                                                background: 'radial-gradient(circle at 50% 80%, #fff, #fbbf24 45%, #f97316 80%, transparent)',
                                                filter: 'drop-shadow(0 0 12px #fbbf24) drop-shadow(0 0 24px #f59e0b)',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="w-8 h-10 rounded-t-md rounded-b-lg bg-gradient-to-b from-[#fffdf7] to-[#e7dcc6] border border-[#d4af37]/50 shadow-lg flex items-center justify-center">
                                <Flame size={13} className={flameOn ? 'text-amber-500 fill-amber-400' : 'text-slate-400 group-hover:text-amber-500 transition-colors'} />
                            </div>
                        </button>
                    </motion.div>

                    {/* Velitas de los visitantes, bajo la foto */}
                    <MemorialCandleRow count={candleCount} isDark={isDarkTheme} locale={locale} className="mt-12" />
                </div>

                {/* Content Section */}
                <div className="flex-[1.2] min-w-0 text-center md:text-left">
                    <h1
                        className={`${nameSizeClass(petName, {
                            short: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
                            long: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
                            xlong: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
                        })} font-normal leading-tight break-normal hyphens-none mb-4 bg-gradient-to-r ${themeStyles.titleGradient} bg-clip-text text-transparent`}
                        style={{ fontFamily: "'Cinzel', serif" }}
                    >
                        <span className="inline-flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1">
                            {petName.split(/\s+/).map((word: string, idx: number) => (
                                <span key={idx} className="inline-block whitespace-nowrap">
                                    {word}
                                </span>
                            ))}
                        </span>
                    </h1>

                    <div className={`inline-block px-5 py-2 border rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm mb-6 ${
                        isDarkTheme
                            ? 'text-white bg-white/20 border-white/30'
                            : tema === 'otono'
                            ? 'text-amber-950 bg-amber-500/20 border-amber-600/30'
                            : tema === 'jardin'
                            ? 'text-emerald-950 bg-emerald-500/20 border-emerald-600/30'
                            : tema === 'claro'
                            ? 'text-slate-900 bg-black/5 border-black/15'
                            : 'text-[#1c4b82] bg-white/60 border-white/80'
                    }`}>
                        {dates.years ? `${dates.years} • ` : ''}{locale === 'en' ? 'GUARDIAN ANGEL' : 'ÁNGEL GUARDIÁN'}
                    </div>

                    {/* Dedicatoria Principal */}
                    <p className={`text-lg sm:text-xl md:text-2xl leading-[1.8] mb-8 ${
                        isDarkTheme
                            ? 'text-white/95 font-light'
                            : tema === 'otono'
                            ? 'text-amber-950 font-medium'
                            : tema === 'jardin'
                            ? 'text-emerald-950 font-medium'
                            : tema === 'claro'
                            ? 'text-slate-900 font-medium'
                            : 'text-blue-950 font-medium'
                    }`}>
                        “{memorial?.msg_despedida}”
                    </p>

                    {/* Dual Rituals: Encender Vela + Enviar Beso al Cielo */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-5">
                        <button
                            onClick={lightCandle}
                            className={`px-6 py-3.5 rounded-full text-xs sm:text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 border ${
                                !isCandleLit
                                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-500/60 shadow-amber-400/30'
                                    : isDarkTheme
                                        ? 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                                        : 'bg-white/95 text-slate-900 border-slate-200/80 hover:bg-white shadow-md'
                            }`}
                        >
                            <Flame size={18} className={!isCandleLit ? 'text-slate-950' : 'text-amber-500 fill-amber-400'} />
                            {isCandleLit
                                ? (locale === 'en' ? 'Candle lit' : 'Vela encendida')
                                : (locale === 'en' ? 'Light a candle' : 'Encender una velita')}
                        </button>

                        <div className="relative group">
                            <button
                                onClick={sendKiss}
                                className={`px-6 py-3.5 rounded-full text-xs sm:text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 border ${
                                    isDarkTheme
                                        ? 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                                        : 'bg-white/95 text-slate-900 border-slate-200/80 hover:bg-white shadow-md'
                                }`}
                            >
                                <motion.span animate={sentKisses > 0 ? { rotate: [0, 20, -20, 0] } : {}} transition={{ duration: 0.5 }}>
                                    <Heart size={18} className={sentKisses > 0 ? "fill-pink-400 text-pink-400" : "fill-blue-500 text-blue-500"} />
                                </motion.span>
                                {sentKisses > 0
                                    ? (t?.mem_kiss_received || 'Recibido en el cielo')
                                    : (locale === 'en' ? 'Send a kiss to heaven' : 'Enviar beso al cielo')}
                            </button>
                            <AnimatePresence>
                                {sentKisses > 0 && (
                                    <motion.div
                                        key={sentKisses}
                                        initial={{ y: 0, opacity: 1, scale: 1 }}
                                        animate={{ y: -160, opacity: 0, scale: 1.5 }}
                                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-2xl"
                                    >
                                        ✨
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Live Counters */}
                    {(candleCount > 0 || kissCount > 0) && (
                        <div className={`flex flex-wrap items-center justify-center md:justify-start gap-4 mb-7 text-xs sm:text-sm font-semibold ${
                            isDarkTheme ? 'text-white/85' : 'text-slate-900'
                        }`}>
                            {candleCount > 0 && (
                                <span>🕯️ {ritualLabel('vela', candleCount, locale)}</span>
                            )}
                            {kissCount > 0 && (
                                <span>💙 {ritualLabel('beso', kissCount, locale)}</span>
                            )}
                        </div>
                    )}

                    {/* Compartir / Descargar imagen y tarjeta */}
                    <div className={`md:[&>div]:justify-start ${
                        isDarkTheme
                            ? '[&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!border-white/20'
                            : '[&_button]:!bg-white/95 [&_button]:!text-slate-900 [&_button]:!border-slate-300/80 hover:[&_button]:!bg-white shadow-md'
                    }`}>
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
        </div>
    );
}
