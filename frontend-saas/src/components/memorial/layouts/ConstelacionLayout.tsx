import React, { useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Compass, Flame } from 'lucide-react';
import MemorialActionButtons from '@/components/memorial/MemorialActionButtons';
import MemorialCandleRow from '@/components/memorial/MemorialCandleRow';
import MemorialCloud from '@/components/memorial/MemorialCloud';
import { getLifeDates, nameSizeClass, seededRandom, isDarkSurface, getMemorialThemeStyles, getMemorialAtmosphereBg } from '@/lib/memorialDesign';
import { ritualLabel, type RitualProps } from '@/lib/memorialRituals';

/**
 * Constelación Eterna (Escenario 4: ULTRA):
 * - Bóveda estelar interactiva, constelación del nombre con líneas doradas
 * - Vela eterna interactiva + encendido de estrella personal en el cielo
 * - Portada estelar, dedicatoria solemne y descarga de imagen/tarjeta
 */
export default function ConstelacionLayout(props: any) {
    const { memorial, mascota, randomMainImage, t, tenant_info, locale, onShare, onSendKiss, themeConfig } = props;
    const rituals: RitualProps | undefined = props.rituals;
    const skyRef = useRef<HTMLDivElement>(null);

    const [userStars, setUserStars] = useState<{ id: number; x: number; y: number }[]>([]);
    const [candleLitLocal, setCandleLitLocal] = useState(false);

    const starCount = rituals?.counts?.estrella || 0;
    const candleCount = rituals?.counts?.vela || 0;
    const isCandleLit = candleLitLocal || Boolean(rituals?.did?.vela);
    // Las velas grandes empiezan apagadas: se prenden cuando este visitante toca
    // «Encender una velita» y siguen prendidas al volver. La fila bajo la foto muestra las de todos.
    const flameOn = isCandleLit;

    const portadaUrl = memorial?.diseno?.portada_url;
    const tema = memorial?.diseno?.tema || 'nocturno';
    const isDarkTheme = isDarkSurface(themeConfig, portadaUrl);
    const themeStyles = getMemorialThemeStyles(tema, isDarkTheme);
    const petName = (mascota?.name || '').trim();
    const dates = getLifeDates(mascota?.birth_date, mascota?.death_date, locale, mascota);

    // Campo estelar de fondo determinista
    const stars = useMemo(() => {
        const rand = seededRandom(101);
        return Array.from({ length: 110 }, (_, i) => ({
            id: i,
            x: rand() * 100,
            y: rand() * 100,
            r: i % 6 === 0 ? rand() * 1.6 + 1 : rand() * 0.9 + 0.4,
            delay: rand() * 4,
            duration: rand() * 3 + 2.5,
            gold: i % 9 === 0,
        }));
    }, []);

    // Nodos de la constelación: uno por letra del nombre (entre 5 y 9 puntos)
    const constellationNodes = useMemo(() => {
        const count = Math.min(9, Math.max(5, petName.length || 6));
        const rand = seededRandom(petName.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 42));
        return Array.from({ length: count }, (_, i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const radius = 38 + (i % 2 === 0 ? 5 : -4) + (rand() - 0.5) * 4;
            return {
                x: 50 + Math.cos(angle) * radius,
                y: 50 + Math.sin(angle) * radius,
                major: i === 0 || i === Math.floor(count / 2),
            };
        });
    }, [petName]);

    // Coordenadas celestiales ficticias derivadas del id
    const coords = useMemo(() => {
        const seed = String(memorial?.id_recuerdo || petName || '0');
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
        const raH = (h % 24).toString().padStart(2, '0');
        const raM = ((h >> 4) % 60).toString().padStart(2, '0');
        const dec = ((h % 70) + 10);
        return `RA ${raH}h ${raM}m · DEC +${dec}°`;
    }, [memorial?.id_recuerdo, petName]);

    const placeStarAt = (xPct: number, yPct: number) => {
        setUserStars(prev => [...prev.slice(-14), { id: Date.now() + Math.random(), x: xPct, y: yPct }]);
        rituals?.send('estrella');
    };

    const handleSkyClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, a')) return;
        const rect = skyRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        placeStarAt(x, y);
    };

    const handleButtonStar = () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 22 + Math.random() * 22;
        placeStarAt(50 + Math.cos(angle) * dist, 38 + Math.sin(angle) * dist * 0.7);
    };

    const handleLightCandle = () => {
        rituals?.playMusic?.();
        if (isCandleLit) return;
        setCandleLitLocal(true);
        rituals?.send('vela');
    };

    const polylinePoints = constellationNodes.map(n => `${n.x},${n.y}`).join(' ')
        + ` ${constellationNodes[0].x},${constellationNodes[0].y}`;

    return (
        <div
            ref={skyRef}
            onClick={handleSkyClick}
            className={`relative z-10 min-h-screen w-full flex flex-col items-center justify-center px-4 py-16 sm:p-8 overflow-hidden select-none cursor-crosshair ${
                isDarkTheme ? 'text-white' : 'text-slate-900'
            }`}
            style={{
                background: portadaUrl
                    ? undefined
                    : getMemorialAtmosphereBg('constelacion', tema, isDarkTheme),
                ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
            }}
        >
            {portadaUrl && <div className={`absolute inset-0 pointer-events-none ${isDarkTheme ? 'bg-[#050712]/75' : 'bg-black/30'}`} />}

            {/* Nebulosa: nubes de gas violeta en capas + resplandor dorado tras el retrato */}
            {!portadaUrl && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute -top-[10%] -left-[15%] w-[70vw] h-[60vh] rounded-full opacity-60 blur-[90px]"
                        style={{ background: 'radial-gradient(ellipse at 60% 50%, #5b3fa0 0%, #3b2a78 35%, transparent 70%)' }}
                    />
                    <div
                        className="absolute top-[5%] left-[18%] w-[38vw] h-[30vh] rounded-full opacity-45 blur-[70px] rotate-[-18deg]"
                        style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, #4c1d95 50%, transparent 75%)' }}
                    />
                    <div
                        className="absolute top-[30%] -right-[18%] w-[60vw] h-[55vh] rounded-full opacity-50 blur-[100px]"
                        style={{ background: 'radial-gradient(ellipse at 40% 50%, #4338ca 0%, #312e81 40%, transparent 72%)' }}
                    />
                    <div
                        className="absolute bottom-[-15%] left-[10%] w-[55vw] h-[45vh] rounded-full opacity-35 blur-[110px]"
                        style={{ background: 'radial-gradient(ellipse, #6d28d9 0%, #2e1065 50%, transparent 75%)' }}
                    />
                    <div
                        className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-30 blur-[90px]"
                        style={{ background: 'radial-gradient(circle, #f59e0b 0%, #a16207 30%, transparent 65%)' }}
                    />
                    {/* Viñeta para dar profundidad */}
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(3,4,18,0.65) 100%)' }} />
                </div>
            )}

            {/* Campo estelar fijo */}
            <div className="absolute inset-0 pointer-events-none">
                {stars.map(s => (
                    <motion.span
                        key={s.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            width: s.r * 2,
                            height: s.r * 2,
                            backgroundColor: s.gold ? '#fde68a' : '#ffffff',
                            boxShadow: s.gold ? '0 0 8px #fbbf24' : '0 0 6px rgba(255,255,255,0.8)',
                        }}
                        animate={{ opacity: [0.25, 0.95, 0.25] }}
                        transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
                    />
                ))}

                {/* Estrella fugaz ocasional */}
                <motion.div
                    className="absolute h-[1.5px] w-24 bg-gradient-to-r from-transparent via-amber-200 to-white rounded-full"
                    style={{ top: '18%', left: '12%', rotate: '22deg' }}
                    animate={{ x: [0, 520], y: [0, 210], opacity: [0, 1, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 9, ease: 'easeOut' }}
                />
            </div>

            {/* Estrellas encendidas por visitantes en esta sesión */}
            <div className="absolute inset-0 pointer-events-none">
                <AnimatePresence>
                    {userStars.map(s => (
                        <motion.div
                            key={s.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.5, 1], opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            style={{ left: `${s.x}%`, top: `${s.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                        >
                            <span
                                className="block w-3 h-3 rounded-full bg-amber-200"
                                style={{ boxShadow: '0 0 14px 4px #fbbf24, 0 0 32px 8px rgba(251,191,36,0.55)' }}
                            />
                            <motion.span
                                initial={{ scale: 0.4, opacity: 0.9 }}
                                animate={{ scale: 3.2, opacity: 0 }}
                                transition={{ duration: 1.1 }}
                                className="absolute inset-0 rounded-full border border-amber-300"
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Contenido central */}
            <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center cursor-default">
                {/* Coordenadas de carta astral */}
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] tracking-[0.28em] uppercase mb-6 backdrop-blur-md border ${
                    isDarkTheme
                        ? 'bg-white/5 border-amber-300/25 text-amber-200/80'
                        : 'bg-amber-900/10 border-amber-900/25 text-amber-950 font-bold'
                }`}>
                    <Compass size={12} className={isDarkTheme ? "text-amber-300" : "text-amber-800"} />
                    <span>{locale === 'en' ? 'ETERNAL CONSTELLATION' : 'CONSTELACIÓN ETERNA'} · {coords}</span>
                </div>

                {/* Planetario / Retrato de Portada con líneas de constelación + Vela Eterna */}
                <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] flex items-center justify-center mb-4">
                    {/* Halo dorado detrás del retrato */}
                    <div
                        className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full blur-3xl opacity-60 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.75) 0%, rgba(217,119,6,0.35) 45%, transparent 72%)' }}
                    />

                    {/* Marco ornamental: aros dorados, mandala, órbitas con estrellas */}
                    <OrnateFrame />

                    {/* SVG de la constelación del nombre */}
                    <svg
                        viewBox="0 0 100 100"
                        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                    >
                        <motion.polyline
                            points={polylinePoints}
                            fill="none"
                            stroke={isDarkTheme ? "rgba(253, 230, 138, 0.3)" : "rgba(180, 83, 9, 0.5)"}
                            strokeWidth="0.3"
                            strokeDasharray="1.2 1.6"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 2.4, ease: 'easeInOut' }}
                        />
                        {constellationNodes.map((n, i) => (
                            <g key={i}>
                                <circle
                                    cx={n.x}
                                    cy={n.y}
                                    r={n.major ? 1.25 : 0.8}
                                    fill={isDarkTheme ? "#fde68a" : "#b45309"}
                                    style={{ filter: isDarkTheme ? 'drop-shadow(0 0 4px #fbbf24)' : 'drop-shadow(0 0 4px #f59e0b)' }}
                                />
                                {n.major && (
                                    <circle
                                        cx={n.x}
                                        cy={n.y}
                                        r={3.2}
                                        fill="none"
                                        stroke={isDarkTheme ? "rgba(253,230,138,0.4)" : "rgba(180,83,9,0.4)"}
                                        strokeWidth="0.3"
                                    />
                                )}
                            </g>
                        ))}
                    </svg>

                    {/* Retrato central de Portada (el aro dorado lo dibuja OrnateFrame) */}
                    <div className="relative w-[160px] h-[160px] sm:w-[206px] sm:h-[206px] rounded-full overflow-hidden bg-[#0b1026] flex items-center justify-center shadow-[inset_0_0_18px_rgba(0,0,0,0.5)]">
                        {randomMainImage ? (
                            <img src={randomMainImage} alt={petName} className="w-full h-full object-cover" />
                        ) : (
                            <Star size={64} className="text-amber-200/50" />
                        )}
                        <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(253,230,138,0.35), inset 0 -24px 30px rgba(0,0,0,0.25)' }} />
                    </div>
                </div>

                {/* Velitas de los visitantes, bajo el retrato */}
                <MemorialCandleRow count={candleCount} isDark={isDarkTheme} locale={locale} className="-mt-2 mb-6" />

                {/* Nombre */}
                <h1
                    className={`${nameSizeClass(petName, {
                        short: 'text-3xl sm:text-5xl md:text-6xl',
                        long: 'text-2xl sm:text-4xl md:text-5xl',
                        xlong: 'text-xl sm:text-3xl md:text-4xl',
                    })} font-normal tracking-wider mb-3 bg-clip-text text-transparent ${
                        isDarkTheme
                            ? 'bg-gradient-to-b from-white via-amber-100 to-amber-300/90 drop-shadow-[0_2px_20px_rgba(251,191,36,0.25)]'
                            : 'bg-gradient-to-b from-slate-950 via-amber-950 to-slate-900 drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                    }`}
                    style={{ fontFamily: "'Cinzel', 'Playfair Display', serif" }}
                >
                    <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                        {petName.split(/\s+/).map((word: string, idx: number) => (
                            <span key={idx} className="inline-block whitespace-nowrap">
                                {word}
                            </span>
                        ))}
                    </span>
                </h1>

                {/* Fechas y años de amor */}
                {(dates.full || dates.yearsOfLove) && (
                    <div className={`flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm tracking-[0.2em] uppercase mb-6 ${
                        isDarkTheme ? 'text-amber-200/80' : 'text-amber-950 font-bold'
                    }`}>
                        {dates.full && <span>{dates.full}</span>}
                        {dates.full && dates.yearsOfLove && <span className={isDarkTheme ? "text-amber-400" : "text-amber-800"}>✦</span>}
                        {dates.yearsOfLove && (
                            <span className={`italic normal-case tracking-normal ${isDarkTheme ? 'text-amber-100' : 'text-amber-900 font-semibold'}`}>
                                {dates.yearsOfLove}
                            </span>
                        )}
                    </div>
                )}

                {/* Dedicatoria Principal */}
                <p
                    className={`max-w-2xl text-lg sm:text-xl md:text-2xl italic leading-relaxed mb-2 px-2 ${
                        isDarkTheme ? 'font-light text-slate-100/90' : 'font-normal text-slate-900'
                    }`}
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                    “{memorial?.msg_despedida}”
                </p>

                {/* Vela Eterna sobre una nube */}
                <CelestialCandle
                    lit={flameOn}
                    onLight={handleLightCandle}
                    label={locale === 'en' ? 'Light Eternal Candle' : 'Encender Vela Eterna'}
                />

                {/* Rituales: Encender Vela Eterna + Encender Estrella */}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-3.5 -mt-3 mb-3">
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleLightCandle}
                        className={`${GOLD_PILL} ${!isCandleLit ? 'text-[#2a1a05]' : (isDarkTheme ? 'text-amber-100' : 'text-amber-950')}`}
                        style={!isCandleLit ? GOLD_PILL_STYLE : (isDarkTheme ? DARK_PILL_STYLE : LIGHT_PILL_STYLE)}
                    >
                        <Flame size={17} className={!isCandleLit ? 'text-[#2a1a05]' : (isDarkTheme ? 'text-amber-300 fill-amber-300' : 'text-amber-700 fill-amber-700')} />
                        {isCandleLit
                            ? (locale === 'en' ? 'Candle lit' : 'Vela encendida')
                            : (locale === 'en' ? 'Light a candle' : 'Encender una velita')}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleButtonStar}
                        className={`${GOLD_PILL} text-[#2a1a05]`}
                        style={GOLD_PILL_STYLE}
                    >
                        <Sparkles size={17} className="fill-[#2a1a05]" />
                        {locale === 'en' ? 'Light a star for them' : 'Encender una estrella'}
                    </motion.button>
                </div>

                <p className={`text-xs mb-2 ${isDarkTheme ? 'text-slate-300/75' : 'text-slate-700 font-medium'}`}>
                    {locale === 'en'
                        ? 'Or tap anywhere on the night sky to place your star'
                        : 'O toca cualquier punto del cielo nocturno para dejar tu estrella'}
                </p>

                {(candleCount > 0 || starCount > 0) && (
                    <div
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        className={`flex flex-wrap items-center justify-center gap-4 text-sm sm:text-base italic mb-8 ${
                        isDarkTheme ? 'text-amber-200/90' : 'text-amber-950 font-semibold'
                    }`}>
                        {candleCount > 0 && (
                            <span>🕯️ {ritualLabel('vela', candleCount, locale)}</span>
                        )}
                        {starCount > 0 && (
                            <span>✦ {ritualLabel('estrella', starCount, locale)}</span>
                        )}
                    </div>
                )}

                {candleCount === 0 && starCount === 0 && <div className="mb-6" />}

                {/* Acciones para compartir y descargar imagen/tarjeta */}
                <div className={themeStyles.actionButtonsClass}>
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

// Botones dorados tipo píldora (serif, brillo interior). Misma acción y texto de siempre.
const GOLD_PILL =
    'px-7 py-3.5 rounded-full text-base sm:text-lg flex items-center gap-2.5 border transition-shadow hover:shadow-[0_0_45px_rgba(251,191,36,0.6)] font-semibold tracking-wide';
const GOLD_PILL_STYLE: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    background: 'linear-gradient(180deg, #fbe7a6 0%, #e9c46a 45%, #c99a3b 100%)',
    borderColor: 'rgba(255,240,200,0.75)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -2px 6px rgba(120,72,10,0.35), 0 0 28px rgba(251,191,36,0.35), 0 6px 18px rgba(0,0,0,0.35)',
};
const DARK_PILL_STYLE: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    background: 'linear-gradient(180deg, rgba(30,27,75,0.85) 0%, rgba(15,13,45,0.9) 100%)',
    borderColor: 'rgba(233,196,106,0.7)',
    boxShadow: 'inset 0 1px 0 rgba(253,230,138,0.25), 0 0 22px rgba(251,191,36,0.18), 0 6px 18px rgba(0,0,0,0.35)',
};
const LIGHT_PILL_STYLE: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(254,243,199,0.9) 100%)',
    borderColor: 'rgba(180,83,9,0.55)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 14px rgba(120,72,10,0.18)',
};

// Estrella de 4 puntas centrada en (0,0), radio 1.
const SPARKLE = 'M0,-1 L0.22,-0.22 L1,0 L0.22,0.22 L0,1 L-0.22,0.22 L-1,0 L-0.22,-0.22Z';

const ORBITS = [
    { rx: 93, ry: 30, rot: -24, stars: [0.35, 1.2, 2.1, 4.6, 5.5] },
    { rx: 86, ry: 42, rot: 38, stars: [0.9, 2.8, 3.9, 5.9] },
];

/**
 * Marco ornamental del retrato (viewBox 200×200, el retrato ocupa r≈54):
 * banda oscura + doble aro dorado, mandala geométrico tenue, marcas de carta
 * celeste y dos órbitas inclinadas con estrellas que giran lentamente.
 */
function OrnateFrame() {
    const uid = useId().replace(/:/g, '');
    const gold = `gold-${uid}`;
    const ticks = Array.from({ length: 48 }, (_, i) => i * 7.5);

    return (
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" aria-hidden="true">
            <defs>
                <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fff2c4" />
                    <stop offset="35%" stopColor="#e9c46a" />
                    <stop offset="65%" stopColor="#b8862b" />
                    <stop offset="100%" stopColor="#fbe7a6" />
                </linearGradient>
            </defs>

            {/* Mandala tenue: octograma + círculo exterior */}
            <g stroke={`url(#${gold})`} fill="none" opacity="0.38" strokeWidth="0.45">
                <rect x="50" y="50" width="100" height="100" />
                <rect x="50" y="50" width="100" height="100" transform="rotate(45 100 100)" />
                <circle cx="100" cy="100" r="71" />
                <circle cx="100" cy="100" r="74" strokeDasharray="0.6 2.2" />
            </g>

            {/* Marcas de carta celeste */}
            <g stroke="#e9c46a" opacity="0.55">
                {ticks.map((a) => {
                    const long = a % 45 === 0;
                    const r1 = 64.5;
                    const r2 = long ? 69 : 66.5;
                    const rad = (a * Math.PI) / 180;
                    return (
                        <line
                            key={a}
                            x1={100 + Math.cos(rad) * r1}
                            y1={100 + Math.sin(rad) * r1}
                            x2={100 + Math.cos(rad) * r2}
                            y2={100 + Math.sin(rad) * r2}
                            strokeWidth={long ? 0.6 : 0.3}
                        />
                    );
                })}
            </g>

            {/* Banda oscura + doble aro dorado alrededor del retrato */}
            <circle cx="100" cy="100" r="59" fill="#16133a" stroke={`url(#${gold})`} strokeWidth="2.2" />
            <circle cx="100" cy="100" r="62.5" fill="none" stroke={`url(#${gold})`} strokeWidth="0.8" />
            {[0, 90, 180, 270].map((a) => (
                <path key={a} d="M100,35.5 L102,38 L100,40.5 L98,38Z" fill={`url(#${gold})`} transform={`rotate(${a} 100 100)`} />
            ))}

            {/* Órbitas inclinadas con estrellas, giro muy lento */}
            <motion.g
                style={{ originX: '100px', originY: '100px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 220, repeat: Infinity, ease: 'linear' }}
            >
                {ORBITS.map((o, oi) => (
                    <g key={oi} transform={`rotate(${o.rot} 100 100)`}>
                        <ellipse cx="100" cy="100" rx={o.rx} ry={o.ry} fill="none" stroke="#e9c46a" strokeOpacity="0.4" strokeWidth="0.45" />
                        {o.stars.map((t, si) => {
                            const x = 100 + Math.cos(t) * o.rx;
                            const y = 100 + Math.sin(t) * o.ry;
                            const size = si % 2 === 0 ? 3.4 : 2.2;
                            return (
                                <motion.path
                                    key={si}
                                    d={SPARKLE}
                                    fill="#fff4cc"
                                    transform={`translate(${x} ${y}) scale(${size})`}
                                    style={{ filter: 'drop-shadow(0 0 2px #fbbf24)' }}
                                    animate={{ opacity: [0.55, 1, 0.55] }}
                                    transition={{ duration: 2.6 + si * 0.4, repeat: Infinity, ease: 'easeInOut', delay: oi * 0.7 + si * 0.3 }}
                                />
                            );
                        })}
                    </g>
                ))}
            </motion.g>
        </svg>
    );
}

/**
 * Vela Eterna: cirio dorado que asoma de una nube, con mecha, llama de doble
 * capa y halo. Al tocarla se enciende (misma acción que el botón).
 */
function CelestialCandle({ lit, onLight, label }: { lit: boolean; onLight: () => void; label: string }) {
    return (
        <div className="relative w-72 h-44 flex items-end justify-center pointer-events-none">
            {/* Destellos que suben desde la nube */}
            <div
                className="absolute inset-x-10 top-2 bottom-10 opacity-60"
                style={{
                    backgroundImage: 'radial-gradient(1px 1px at 20% 30%, #fde68a, transparent), radial-gradient(1px 1px at 70% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 85% 55%, #fde68a, transparent), radial-gradient(1px 1px at 35% 65%, #fff, transparent), radial-gradient(1px 1px at 60% 75%, #fde68a, transparent)',
                }}
            />

            <button
                type="button"
                onClick={onLight}
                title={label}
                aria-label={label}
                aria-pressed={lit}
                className="pointer-events-auto relative z-10 mb-9 flex flex-col items-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded-xl"
            >
                {/* Llama */}
                <div className="relative w-14 h-12 flex items-end justify-center">
                    <AnimatePresence>
                        {lit && (
                            <>
                                <motion.div
                                    key="halo"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: [1, 1.3, 0.95, 1.2, 1], opacity: [0.7, 1, 0.65, 0.9, 0.7] }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute -bottom-6 w-28 h-28 rounded-full pointer-events-none"
                                    style={{
                                        background: 'radial-gradient(circle, rgba(253,224,71,0.55) 0%, rgba(245,158,11,0.22) 45%, transparent 72%)',
                                        filter: 'blur(4px)',
                                    }}
                                />
                                <motion.div
                                    key="flame"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: [1, 1.1, 0.94, 1.06, 1], rotate: [-1.5, 2, -2, 1.5, -1.5], opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    // La opacidad va aparte: con repeat infinito volvería a 0 en cada ciclo
                                    // y la llama parecería apagarse y encenderse sola.
                                    transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', opacity: { duration: 0.4 } }}
                                    className="relative w-[22px] h-10 origin-bottom flex items-end justify-center"
                                    style={{
                                        borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
                                        background: 'radial-gradient(ellipse at 50% 78%, #ffffff 0%, #fef9c3 22%, #fcd34d 48%, #f59e0b 74%, #ea580c 100%)',
                                        filter: 'drop-shadow(0 0 8px #fbbf24) drop-shadow(0 0 18px rgba(245,158,11,0.8))',
                                    }}
                                >
                                    {/* Núcleo azulado en la base, como una llama real */}
                                    <span
                                        className="mb-[4px] w-[8px] h-[11px]"
                                        style={{
                                            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                                            background: 'radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.95) 0%, rgba(147,197,253,0.6) 70%, transparent 100%)',
                                        }}
                                    />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                    {!lit && (
                        <span className="mb-0.5 w-3 h-3.5 rounded-full bg-amber-300/30 group-hover:bg-amber-300/70 transition-colors animate-pulse" />
                    )}
                </div>

                {/* Mecha */}
                <div className={`w-[2px] h-2 -mt-px ${lit ? 'bg-stone-800' : 'bg-stone-600'}`} />

                {/* Cirio dorado */}
                <div
                    className="relative w-12 h-16 sm:w-14 sm:h-[72px] rounded-t-[6px] overflow-hidden"
                    style={{
                        background: 'linear-gradient(90deg, #a87a26 0%, #e9c46a 22%, #fbe7a6 42%, #f1d080 60%, #c99a3b 85%, #8f6420 100%)',
                        boxShadow: lit
                            ? '0 0 30px rgba(251,191,36,0.6), inset 0 8px 12px rgba(255,236,170,0.55)'
                            : '0 0 14px rgba(251,191,36,0.25)',
                    }}
                >
                    <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-[#fff4cc]/80 to-transparent" />
                    <div className="absolute top-0 left-2 w-1.5 h-4 rounded-b-full bg-[#fff2c4]/80" />
                    <div className="absolute top-0 right-2.5 w-1 h-2.5 rounded-b-full bg-[#fff2c4]/70" />
                </div>
            </button>

            {/* Nube: capas difuminadas que cubren la base del cirio */}
            <MemorialCloud className="absolute bottom-0 inset-x-0 h-20" tone="night" />
        </div>
    );
}
