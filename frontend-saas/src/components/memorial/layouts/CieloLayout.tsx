import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Cloud as CloudIcon
} from 'lucide-react';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import { getLifeDates, isDarkSurface, nameSizeClass, seededRandom } from '@/lib/memorialDesign';
import { ritualLabel, type RitualProps } from '@/lib/memorialRituals';

export default function CieloLayout(props: any) {
    const { memorial, mascota, randomMainImage, t, themeConfig, tenant_info, locale, onShare, onSendKiss } = props;
    const [sentKisses, setSentKisses] = useState(0);
    const rituals: RitualProps | undefined = props.rituals;
    const kissCount = rituals?.counts.beso || 0;

    const sendKiss = () => {
        setSentKisses(prev => prev + 1);
        rituals?.send('beso');
    };

    const portadaUrl = memorial?.diseno?.portada_url;
    // Sobre portada hay un velo oscuro: el texto debe ir claro aunque el tema sea claro
    const isDarkTheme = isDarkSurface(themeConfig, portadaUrl);
    const showDefaultCieloBg = !portadaUrl && !memorial?.diseno?.color_fondo && (!themeConfig || !themeConfig.dark);
    const petName = mascota?.name || '';
    const dates = getLifeDates(mascota?.birth_date, mascota?.death_date, locale);

    // Destellos deterministas: antes se recalculaban con Math.random() en cada
    // render y "saltaban" con cada beso enviado.
    const sparkles = useMemo(() => {
        const rand = seededRandom(20);
        return Array.from({ length: 20 }, (_, i) => ({
            id: i,
            size: rand() * 4 + 2,
            top: rand() * 100,
            left: rand() * 100,
            duration: rand() * 3 + 2,
        }));
    }, []);

    return (
        <div
            className={`relative z-10 min-h-screen w-full flex items-center justify-center px-4 py-12 sm:p-6 overflow-hidden ${
                showDefaultCieloBg ? 'bg-gradient-to-br from-[#89f7fe] to-[#66a6ff]' : ''
            }`}
            style={{
                fontFamily: "'Quicksand', sans-serif",
                ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
            }}
        >
            {/* Velo para que el texto se lea sobre cualquier portada */}
            {portadaUrl && <div className="absolute inset-0 bg-[#0b1a33]/45 pointer-events-none" />}

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

            <div className={`max-w-6xl w-full backdrop-blur-xl border rounded-[32px] sm:rounded-[40px] p-6 sm:p-12 md:p-20 flex flex-col md:flex-row items-center gap-10 md:gap-16 relative z-10 shadow-2xl ${
                isDarkTheme ? 'bg-white/10 border-white/25' : 'bg-white/20 border-white/60'
            }`}>
                {/* Image Section */}
                <div className="flex-1 relative">
                    {/* Halo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square opacity-40 pointer-events-none">
                        <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full" />
                    </div>

                    <motion.div
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="relative w-[240px] sm:w-[280px] md:w-[350px] aspect-[3/4] p-3 rounded-[150px_150px_20px_20px] shadow-2xl"
                        style={{ background: 'linear-gradient(45deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)' }}
                    >
                        <div className="w-full h-full bg-white rounded-[145px_145px_15px_15px] overflow-hidden border border-black/5">
                            {randomMainImage ? (
                                <img src={randomMainImage} className="w-full h-full object-cover" alt={petName} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-blue-200">
                                    <CloudIcon size={100} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Content Section */}
                <div className="flex-[1.2] min-w-0 text-center md:text-left">
                    <h1
                        className={`${nameSizeClass(petName, {
                            short: 'text-5xl md:text-7xl lg:text-8xl',
                            long: 'text-4xl md:text-6xl lg:text-7xl',
                            xlong: 'text-3xl md:text-5xl lg:text-6xl',
                        })} font-normal leading-tight break-words mb-4 bg-gradient-to-r bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,255,255,0.35)] ${
                            isDarkTheme ? 'from-white to-blue-100' : 'from-[#1c4b82] to-[#4facfe]'
                        }`}
                        style={{ fontFamily: "'Cinzel', serif" }}
                    >
                        {petName}
                    </h1>

                    <div className={`inline-block px-5 py-2 bg-white/30 border border-white/40 rounded-full font-bold uppercase tracking-widest text-xs sm:text-sm mb-8 ${
                        isDarkTheme ? 'text-white' : 'text-[#1c4b82]'
                    }`}>
                        {dates.years ? `${dates.years} • ` : ''}{locale === 'en' ? 'GUARDIAN ANGEL' : 'ÁNGEL GUARDIÁN'}
                    </div>

                    <p className={`text-lg sm:text-xl md:text-2xl font-medium leading-[1.8] mb-10 ${
                        isDarkTheme ? 'text-white/90' : 'text-blue-900/80'
                    }`}>
                        {memorial?.msg_despedida}
                    </p>

                    <div className="relative group w-fit mx-auto md:mx-0 mb-8">
                        <button
                            onClick={sendKiss}
                            className={`px-8 sm:px-10 py-4 sm:py-5 rounded-full text-sm sm:text-lg font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 ${
                                isDarkTheme
                                    ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                                    : 'bg-white text-[#1c4b82]'
                            }`}
                        >
                            <motion.span animate={sentKisses > 0 ? { rotate: [0, 20, -20, 0] } : {}} transition={{ duration: 0.5 }}>
                                <Heart size={24} className={sentKisses > 0 ? "fill-pink-400 text-pink-400" : "fill-blue-400 text-blue-400"} />
                            </motion.span>
                            {sentKisses > 0
                                ? (t?.mem_kiss_received || 'Recibido en el cielo')
                                : (locale === 'en' ? 'Send a kiss to heaven' : 'Enviar un beso al cielo')}
                        </button>
                        <AnimatePresence>
                            {sentKisses > 0 && (
                                <motion.div
                                    key={sentKisses}
                                    initial={{ y: 0, opacity: 1, scale: 1 }}
                                    animate={{ y: -200, opacity: 0, scale: 1.5 }}
                                    className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-3xl"
                                >
                                    ✨
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {kissCount > 0 && (
                        <p className={`-mt-4 mb-8 text-sm italic ${isDarkTheme ? 'text-white/75' : 'text-blue-900/70'}`}>
                            💙 {ritualLabel('beso', kissCount, locale)}
                        </p>
                    )}

                    {/* Compartir / Descargar tarjeta: el motor viral del memorial */}
                    <div className={`md:[&>div]:justify-start ${isDarkTheme ? '[&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!border-white/20' : ''}`}>
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
