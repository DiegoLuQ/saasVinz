"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ChevronDown,
  Flame,
  Camera,
  Eye,
  Route,
  KeyRound,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  Sparkles,
  Lock,
  Flower2,
  Star,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, whatsappLink } from '@/lib/memorialLanding';
import { MEMORIAL_SCENARIOS } from '@/lib/memorialDesign';
import { planWithScenario, scenariosOf, useMemorialPlans } from '@/lib/memorialPlans';
import { PublicHeader } from '@/components/public/PublicHeader';
import { MemorialLandingPlans } from '@/components/public/MemorialLandingPlans';
import { MemorialLandingFooter } from '@/components/public/MemorialLandingFooter';

interface Memorial {
  id_recuerdo: string;
  pet_name: string;
  pet_image_url: string | null;
  pet_birth_date: string | null;
  pet_death_date: string | null;
  tenant_name: string;
  tenant_logo_url?: string | null;
}

interface Crematorium {
  name: string;
  logo_url: string | null;
  city: string | null;
  region: string | null;
  memorials_count: number;
}

const GALLERY_SIZE = 8;
const THEME_STORAGE_KEY = 'memorial_landing_theme';

const slugify = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'V';

const yearsTogether = (birth: string | null, death: string | null) => {
  if (!birth || !death) return null;
  const years = new Date(death).getFullYear() - new Date(birth).getFullYear();
  return Number.isNaN(years) || years < 0 ? null : years;
};

function SectionHeading({
  label,
  title,
  subtitle,
  dark = false,
}: {
  label: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div className="text-center mb-14 space-y-3.5 max-w-3xl mx-auto">
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-sans font-black uppercase tracking-[0.25em] ${
          dark
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
            : 'border-amber-700/20 bg-amber-500/10 text-amber-800'
        }`}
      >
        <Sparkles size={11} className={dark ? 'text-amber-400' : 'text-amber-600'} />
        <span>{label}</span>
      </div>
      <h2
        className={`text-3xl sm:text-4xl md:text-5xl font-serif font-bold leading-tight ${
          dark
            ? 'bg-gradient-to-b from-white via-slate-100 to-amber-100/90 bg-clip-text text-transparent drop-shadow-sm'
            : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`font-serif text-base sm:text-lg leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function MemorialLandingClient() {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [crematoria, setCrematoria] = useState<Crematorium[]>([]);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>('es');
  const [isDark, setIsDark] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('altar');
  const [heroCandleLit, setHeroCandleLit] = useState(true);
  const [heroCandleCount, setHeroCandleCount] = useState(28);

  // Preferencia de tema (por defecto light; recuerda la última elección del visitante)
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark') setIsDark(true);
    } catch {}
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  // Idioma compartido con PublicHeader
  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem('preferred_locale');
      if (saved === 'es' || saved === 'en') setLocale(saved);
    };
    read();
    window.addEventListener('localeChange', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('localeChange', read);
      window.removeEventListener('storage', read);
    };
  }, []);

  // Navegación por anclas con desplazamiento suave
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => {
      html.style.scrollBehavior = previous;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [memRes, cremRes] = await Promise.all([
          fetch(`/api/internal/memorials?limit=${GALLERY_SIZE}`),
          fetch('/api/internal/memorials/crematorios'),
        ]);
        if (memRes.ok) setMemorials((await memRes.json()).slice(0, GALLERY_SIZE));
        if (cremRes.ok) setCrematoria(await cremRes.json());
      } catch (error) {
        console.error('Error cargando la landing del memorial:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggleHeroCandle = () => {
    if (!heroCandleLit) {
      setHeroCandleLit(true);
      setHeroCandleCount((c) => c + 1);
    } else {
      setHeroCandleLit(false);
    }
  };

  const c = getLandingContent(locale);
  const pointIcons = [ClipboardCheck, KeyRound, Route];
  const stepIcons = [Heart, Camera, Eye];

  const currentScenario =
    MEMORIAL_SCENARIOS.find((s) => s.id === activeScenarioId) || MEMORIAL_SCENARIOS[1];
  const currentScenarioCopy = c.scenarios.items[currentScenario.id];

  // Qué plan incluye cada diseño (Admin → Memoriales → Planes y precios).
  const memorialPlans = useMemorialPlans();
  const scenarioInAll = (id: string) => memorialPlans.every((p) => scenariosOf(p.features).includes(id));
  const scenarioPlanTag = (id: string) => {
    if (scenarioInAll(id)) return null;
    const p = planWithScenario(memorialPlans, id);
    return p ? p.name : null;
  };
  const scenarioPlanText = (id: string) => {
    if (scenarioInAll(id)) return c.scenarios.included_all;
    const p = planWithScenario(memorialPlans, id);
    return p ? c.scenarios.from_plan(p.name) : c.scenarios.included;
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? 'bg-[#0A0D14] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200'
          : 'bg-[#FAF8F4] text-slate-900 selection:bg-amber-200 selection:text-slate-900'
      }`}
    >
      {/* Encabezado Principal Celestial */}
      <PublicHeader isDark={isDark} onToggleTheme={toggleTheme} transparent={true} />

      {/* ═══════════════════════════════════════════════
          1. HERO SECTION: SANTUARIO CELESTIAL & MAJESTUOSO
      ═══════════════════════════════════════════════ */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 px-4 sm:px-6 overflow-hidden">
        {/* Fondo Ecosistémico con Luces Celestiales */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b ${isDark ? 'from-amber-500/15 via-sky-500/10' : 'from-amber-400/20 via-sky-300/15'} to-transparent blur-[140px] rounded-full`} />
          <div className={`absolute bottom-0 left-1/4 w-[450px] h-[350px] ${isDark ? 'bg-amber-500/10' : 'bg-amber-300/15'} blur-[130px] rounded-full`} />
          <div className={`absolute top-1/3 right-10 w-[400px] h-[300px] ${isDark ? 'bg-indigo-500/10' : 'bg-sky-200/25'} blur-[120px] rounded-full`} />
          <div
            className={`absolute inset-0 ${
              isDark
                ? 'bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] opacity-40'
                : 'bg-[radial-gradient(#0f172a0d_1px,transparent_1px)] opacity-60'
            } [background-size:24px_24px]`}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Columna Izquierda: Mensaje y Acciones */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] sm:text-[11px] font-sans font-black uppercase tracking-[0.25em] shadow-sm backdrop-blur-md ${
                isDark
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-amber-700/20 bg-amber-500/10 text-amber-800'
              }`}
            >
              <Sparkles size={12} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
              <span>{c.hero.badge}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-4xl sm:text-5xl md:text-6xl font-serif font-bold leading-[1.12] tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {c.hero.title}
              <span
                className={`bg-gradient-to-r bg-clip-text text-transparent italic ${
                  isDark
                    ? 'from-amber-300 via-amber-200 to-amber-400 drop-shadow-[0_2px_20px_rgba(251,191,36,0.25)]'
                    : 'from-amber-700 via-amber-600 to-amber-800'
                }`}
              >
                {c.hero.highlight}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`text-base sm:text-lg font-serif leading-relaxed max-w-2xl mx-auto lg:mx-0 italic ${
                isDark ? 'text-slate-300/90 font-light' : 'text-slate-600'
              }`}
            >
              {c.hero.subtitle}
            </motion.p>

            {/* Botones de Acción */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-3"
            >
              <a
                href="#escenarios"
                className="px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>{c.hero.cta_scenarios}</span>
              </a>
              <a
                href="#galeria"
                className={`px-6 py-3.5 rounded-full active:scale-95 border text-xs font-black uppercase tracking-[0.2em] transition-all backdrop-blur-md flex items-center gap-2 ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                    : 'bg-white hover:bg-stone-50 border-stone-200 text-slate-800 shadow-sm'
                }`}
              >
                <Flame size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                <span>{c.hero.cta_gallery}</span>
              </a>
            </motion.div>
          </div>

          {/* Columna Derecha: Tarjeta Ceremonial Interactiva en Vivo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 flex justify-center"
          >
            <div className="w-full max-w-sm sm:max-w-md relative">
              {/* Resplandor áureo posterior */}
              <div className={`absolute -inset-2 bg-gradient-to-r rounded-[2.5rem] blur-2xl pointer-events-none ${
                isDark ? 'from-amber-500/25 via-amber-400/10 to-sky-500/20 opacity-75' : 'from-amber-400/25 via-amber-200/20 to-sky-300/20 opacity-90'
              }`} />

              <div
                className={`relative border rounded-[2.2rem] p-6 sm:p-7 shadow-2xl backdrop-blur-xl text-center space-y-5 overflow-hidden ${
                  isDark
                    ? 'bg-slate-900/90 border-amber-500/35'
                    : 'bg-white/95 border-amber-500/30 shadow-stone-900/10'
                }`}
              >
                {/* Cabecera del Demo */}
                <div className={`flex items-center justify-between text-[10px] font-mono uppercase tracking-widest border-b pb-3 ${
                  isDark ? 'text-slate-400 border-white/10' : 'text-slate-500 border-stone-200/80'
                }`}>
                  <span className={`flex items-center gap-1.5 font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {c.hero_card.preview_badge}
                  </span>
                  <span>{c.hero_card.scenario_tag}</span>
                </div>

                {/* Retrato del Angelito */}
                <div className="relative mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-tr from-amber-500 via-amber-200 to-amber-500 shadow-[0_0_35px_rgba(251,191,36,0.28)]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 relative">
                    <img
                      src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop"
                      alt="UNIVERSE"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Nombre y Fechas */}
                <div className="space-y-1">
                  <h3
                    className={`text-2xl sm:text-3xl font-serif font-bold uppercase tracking-[0.1em] ${
                      isDark
                        ? 'bg-gradient-to-b from-white via-amber-50 to-amber-200 bg-clip-text text-transparent drop-shadow-sm'
                        : 'text-slate-900'
                    }`}
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    UNIVERSE
                  </h3>
                  <p className={`text-xs font-serif italic ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                    {c.hero_card.years_line}
                  </p>
                </div>

                {/* Cita de Consuelo */}
                <p className={`text-xs sm:text-sm font-serif italic leading-relaxed px-2 ${
                  isDark ? 'text-slate-300/90 font-light' : 'text-slate-600'
                }`}>
                  {c.hero_card.quote}
                </p>

                {/* Vela Interactiva de Homenaje */}
                <div className={`pt-2 border-t flex flex-col items-center ${isDark ? 'border-white/10' : 'border-stone-200/80'}`}>
                  <button
                    type="button"
                    onClick={handleToggleHeroCandle}
                    className="group relative flex flex-col items-center focus:outline-none transition-transform active:scale-95 cursor-pointer"
                  >
                    {/* Resplandor de llama */}
                    <div
                      className={`absolute -top-7 w-16 h-16 rounded-full transition-all duration-700 ${
                        heroCandleLit
                          ? 'bg-amber-400/35 blur-xl scale-100 opacity-100'
                          : 'bg-transparent scale-50 opacity-0'
                      }`}
                    />

                    {/* Llama */}
                    <div className="relative w-4 h-6 mb-0.5">
                      <AnimatePresence>
                        {heroCandleLit && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [1, 1.15, 0.95, 1.05, 1], opacity: 1 }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-4 h-6 rounded-full bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-100 blur-[0.6px] shadow-[0_0_15px_#fbbf24]"
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Cuerpo de Vela Dorada */}
                    <div className="w-9 h-11 bg-gradient-to-b from-[#faf5ee] to-[#e6d8c3] rounded-t-sm rounded-b-md border border-amber-400/50 shadow-md flex items-center justify-center">
                      <Flame size={12} className={heroCandleLit ? 'text-amber-500 fill-amber-400' : 'text-slate-400'} />
                    </div>

                    <span className={`mt-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                      isDark ? 'text-amber-300 group-hover:text-amber-200' : 'text-amber-700 group-hover:text-amber-800'
                    }`}>
                      {heroCandleLit ? c.hero_card.candle_lit : c.hero_card.candle_off}
                    </span>
                    <span className={`text-xs font-serif italic mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {c.hero_card.candles_count(heroCandleCount)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          2. LOS 4 ESCENARIOS CONMEMORATIVOS (SHOWCASE INTERACTIVO)
      ═══════════════════════════════════════════════ */}
      <section
        id="escenarios"
        className={`scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden border-t transition-colors duration-300 ${
          isDark ? 'bg-slate-950 border-white/10' : 'bg-[#F3EFE7] border-stone-200/80'
        }`}
      >
        <div id="experiencia" className="scroll-mt-28" />
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeading
            label={c.scenarios.label}
            title={c.scenarios.title}
            subtitle={c.scenarios.subtitle}
            dark={isDark}
          />

          {/* Selector de Pestañas de los 4 Escenarios */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
            {MEMORIAL_SCENARIOS.map((sc) => {
              const active = sc.id === activeScenarioId;
              const scCopy = c.scenarios.items[sc.id];
              const icons: Record<string, string> = {
                normal: '🕯️',
                altar: '🏛️',
                cielo: '☁️',
                constelacion: '🌌',
              };

              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScenarioId(sc.id)}
                  className={`px-4 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-105'
                      : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        : 'bg-white/90 hover:bg-white text-slate-700 border border-stone-200 shadow-xs'
                  }`}
                >
                  <span className="text-base sm:text-lg">{icons[sc.id]}</span>
                  <span>{scCopy.name}</span>
                  {scenarioPlanTag(sc.id) && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-widest ${
                        active
                          ? 'bg-slate-950/15 text-slate-950'
                          : isDark
                            ? 'bg-slate-950/40 text-amber-200'
                            : 'bg-amber-500/15 text-amber-800'
                      }`}
                    >
                      {scenarioPlanTag(sc.id)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tarjeta de Detalle del Escenario Seleccionado */}
          <div
            className={`border rounded-[2.5rem] p-6 sm:p-10 md:p-14 shadow-2xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${
              isDark
                ? 'bg-slate-900/60 border-amber-500/30'
                : 'bg-white/95 border-amber-500/25 shadow-stone-900/5'
            }`}
          >
            <div className="lg:col-span-7 space-y-5 text-left">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] ${
                  isDark
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-amber-500/10 border-amber-600/25 text-amber-800'
                }`}
              >
                <span>{currentScenarioCopy.levelLabel}</span> · <span>{scenarioPlanText(currentScenario.id)}</span>
              </div>

              <h3 className={`text-3xl sm:text-4xl font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentScenarioCopy.name}
              </h3>
              <p className={`text-sm sm:text-base font-serif italic ${isDark ? 'text-amber-200/90' : 'text-amber-700'}`}>
                “{currentScenarioCopy.subtitle}”
              </p>
              <p className={`leading-relaxed text-sm sm:text-base ${isDark ? 'text-slate-300 font-light' : 'text-slate-600'}`}>
                {currentScenarioCopy.description}
              </p>

              {/* Atributos Incluidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                {[
                  { icon: <Flame size={16} className={isDark ? 'text-amber-400' : 'text-amber-600'} />, label: c.scenarios.perks.candle },
                  { icon: <Camera size={16} className={isDark ? 'text-sky-400' : 'text-sky-600'} />, label: c.scenarios.perks.download },
                  { icon: <Lock size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />, label: c.scenarios.perks.pin },
                  { icon: <MessageCircle size={16} className={isDark ? 'text-amber-400' : 'text-amber-600'} />, label: c.scenarios.perks.dedications },
                ].map((attr) => (
                  <div
                    key={attr.label}
                    className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                      isDark ? 'bg-white/5 border-white/10' : 'bg-[#FAF8F4] border-stone-200/90'
                    }`}
                  >
                    <span className="shrink-0">{attr.icon}</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{attr.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Representación Visual Miniaturizada */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`w-full aspect-[4/3] rounded-3xl overflow-hidden border shadow-2xl relative flex items-center justify-center p-6 text-center ${
                isDark
                  ? 'border-white/15 bg-slate-950'
                  : 'border-amber-500/25 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/80'
              }`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent z-10" />
                <div className="relative z-20 space-y-2">
                  <span className="text-5xl block animate-bounce">
                    {activeScenarioId === 'altar' && '🏛️'}
                    {activeScenarioId === 'cielo' && '☁️'}
                    {activeScenarioId === 'constelacion' && '🌌'}
                    {activeScenarioId === 'normal' && '🕯️'}
                  </span>
                  <h4 className="text-xl font-serif font-bold text-white uppercase tracking-wider">
                    {currentScenarioCopy.name}
                  </h4>
                  <p className="text-xs text-amber-200/90 font-serif italic max-w-xs mx-auto">
                    {currentScenarioCopy.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          3. LOS 4 RITUALES INTERACTIVOS DE VISITA
      ═══════════════════════════════════════════════ */}
      <section
        className={`py-24 sm:py-32 px-4 sm:px-6 border-t relative transition-colors duration-300 ${
          isDark ? 'bg-[#080B11] border-white/10' : 'bg-[#FAF8F4] border-stone-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label={c.rituals.label}
            title={c.rituals.title}
            subtitle={c.rituals.subtitle}
            dark={isDark}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              <Flame key="flame" size={24} className={isDark ? 'text-amber-400' : 'text-amber-600'} />,
              <Flower2 key="flower" size={24} className={isDark ? 'text-rose-400' : 'text-rose-500'} />,
              <Star key="star" size={24} className={isDark ? 'text-sky-400' : 'text-sky-600'} />,
              <Heart key="heart" size={24} className={isDark ? 'text-pink-400' : 'text-pink-500'} />,
            ].map((icon, idx) => {
              const ritual = c.rituals.items[idx];
              return (
              <div
                key={idx}
                className={`rounded-3xl border p-7 space-y-4 transition-all group ${
                  isDark
                    ? 'border-white/10 bg-white/[0.03] hover:border-amber-500/40 hover:bg-white/[0.05]'
                    : 'border-stone-200/90 bg-white shadow-sm shadow-stone-900/5 hover:border-amber-500/40 hover:shadow-md'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center group-hover:scale-110 transition-transform ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-amber-50/70 border-amber-200/70'
                  }`}
                >
                  {icon}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest block ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  {ritual.badge}
                </span>
                <h3 className={`text-xl font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{ritual.title}</h3>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400 font-light' : 'text-slate-600'}`}>
                  {ritual.desc}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          4. GALERÍA DE ÚLTIMOS HOMENAJES
      ═══════════════════════════════════════════════ */}
      <section
        id="galeria"
        className={`scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 border-t transition-colors duration-300 ${
          isDark ? 'bg-[#0A0D14] border-white/10' : 'bg-[#F3EFE7] border-stone-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label={c.gallery.label}
            title={c.gallery.title}
            subtitle={c.gallery.subtitle}
            dark={isDark}
          />

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: GALLERY_SIZE }).map((_, i) => (
                <div key={i} className={`aspect-[4/5] rounded-3xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-stone-200/70'}`} />
              ))}
            </div>
          ) : memorials.length === 0 ? (
            <div
              className={`text-center py-16 rounded-[2.5rem] border border-dashed max-w-lg mx-auto ${
                isDark ? 'bg-white/[0.02] border-white/15' : 'bg-white/80 border-stone-300'
              }`}
            >
              <Heart size={32} className="mx-auto mb-4 text-amber-500/60" />
              <p className={`font-serif italic text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {c.gallery.empty}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
              {memorials.map((m, i) => {
                const years = yearsTogether(m.pet_birth_date, m.pet_death_date);
                return (
                  <motion.div
                    key={m.id_recuerdo}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 4) * 0.06 }}
                    className="group"
                  >
                    <Link
                      href={`/memorials/v/${slugify(m.tenant_name)}/${slugify(m.pet_name)}/${m.id_recuerdo}`}
                      className="block"
                    >
                      {/* Tarjeta con Marco Dorado Sutil */}
                      <div
                        className={`relative border rounded-3xl p-3 pb-5 group-hover:-translate-y-2 transition-all duration-500 overflow-hidden ${
                          isDark
                            ? 'bg-slate-900/80 border-white/10 group-hover:border-amber-500/40 shadow-xl shadow-black/40'
                            : 'bg-white border-stone-200/90 group-hover:border-amber-500/50 shadow-lg shadow-stone-900/5'
                        }`}
                      >
                        <div className={`aspect-square rounded-2xl overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-stone-100'}`}>
                          {m.pet_image_url ? (
                            <img
                              src={m.pet_image_url}
                              alt={m.pet_name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Heart size={36} fill="currentColor" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-60" />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-amber-300">
                            {c.gallery.badge}
                          </span>
                        </div>

                        <div className="mt-3 text-center space-y-0.5">
                          <h3
                            className={`font-serif font-bold transition-colors truncate text-base ${
                              isDark ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-amber-700'
                            }`}
                          >
                            {m.pet_name}
                          </h3>
                          {years !== null && (
                            <p className={`text-[11px] font-serif italic truncate ${isDark ? 'text-amber-200/70' : 'text-amber-700'}`}>
                              {c.gallery.years_short(years)}
                            </p>
                          )}
                        </div>

                        {/* Sello del Crematorio */}
                        <div className={`mt-2.5 pt-2 border-t flex items-center justify-center gap-1.5 min-w-0 ${isDark ? 'border-white/5' : 'border-stone-100'}`}>
                          {m.tenant_logo_url ? (
                            <span className="shrink-0 w-5 h-5 flex items-center justify-center overflow-hidden bg-transparent">
                              <img src={m.tenant_logo_url} alt={m.tenant_name} className="w-full h-full object-contain" />
                            </span>
                          ) : (
                            <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-[8px] font-black text-slate-950 flex items-center justify-center">
                              {initials(m.tenant_name)}
                            </span>
                          )}
                          <span className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {m.tenant_name}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          5. RED OFICIAL DE CREMATORIOS ASOCIADOS
      ═══════════════════════════════════════════════ */}
      <section
        id="crematorios"
        className={`scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden border-t transition-colors duration-300 ${
          isDark
            ? 'bg-[#0B101B] border-white/10'
            : 'bg-gradient-to-b from-[#FAF8F4] via-white to-[#F5F1E8] border-stone-200/80'
        }`}
      >
        {/* Resplandor sutil en el fondo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-12 left-1/2 -translate-x-1/2 w-[620px] h-[280px] rounded-full blur-[120px] ${
            isDark ? 'bg-amber-500/5' : 'bg-amber-300/15'
          }`} />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <SectionHeading
            label={c.network.label}
            title={c.network.title}
            subtitle={c.network.subtitle}
            dark={isDark}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
            {c.network.points.map((pt, i) => {
              const Icon = pointIcons[i];
              return (
                <div
                  key={pt.title}
                  className={`rounded-3xl border p-7 space-y-3 transition-all ${
                    isDark
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-stone-200/90 bg-white shadow-sm shadow-stone-900/5 hover:border-amber-500/35'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                      isDark
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-700'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className={`font-serif font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{pt.title}</h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400 font-light' : 'text-slate-600'}`}>
                    {pt.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {crematoria.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {crematoria.map((cr) => (
                <div
                  key={cr.name}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-3.5 min-w-0 transition-all ${
                    isDark
                      ? 'border-white/10 bg-white/[0.04] hover:border-amber-500/30'
                      : 'border-stone-200/90 bg-white shadow-sm shadow-stone-900/5 hover:border-amber-500/40 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-sm font-black ${
                      isDark ? 'bg-white text-slate-900' : 'bg-stone-50 border border-stone-200/80 text-slate-900'
                    }`}
                  >
                    {cr.logo_url ? (
                      <img
                        src={cr.logo_url}
                        alt={cr.name}
                        loading="lazy"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      initials(cr.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold truncate text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{cr.name}</p>
                    <p className={`text-xs flex items-center gap-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {(cr.city || cr.region) && (
                        <>
                          <MapPin size={11} className={`shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                          {[cr.city, cr.region].filter(Boolean).join(', ')} ·{' '}
                        </>
                      )}
                      {c.network.memorials(cr.memorials_count)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
              <p className={`text-center text-sm font-serif italic ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{c.network.empty}</p>
            )
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          6. CÓMO FUNCIONA
      ═══════════════════════════════════════════════ */}
      <section
        className={`py-24 sm:py-32 px-4 sm:px-6 border-t transition-colors duration-300 ${
          isDark ? 'bg-[#080B11] border-white/10' : 'bg-[#F3EFE7] border-stone-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label={c.steps.label}
            title={c.steps.title}
            subtitle={c.steps.subtitle}
            dark={isDark}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {c.steps.items.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`border p-8 sm:p-10 rounded-[2.5rem] space-y-4 relative transition-all duration-500 ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 hover:border-amber-500/30'
                      : 'bg-white border-stone-200/90 shadow-sm shadow-stone-900/5 hover:border-amber-500/40 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-sm ${
                      isDark
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-700'
                    }`}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className={`text-xl sm:text-2xl font-serif font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{step.title}</h3>
                  <p className={`font-serif leading-relaxed italic text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{step.desc}</p>
                  <div
                    className={`absolute top-8 right-8 font-black text-6xl select-none ${
                      isDark ? 'text-white/5' : 'text-stone-900/[0.05]'
                    }`}
                    aria-hidden="true"
                  >
                    0{i + 1}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          7. PLANES DE MEMORIAL
      ═══════════════════════════════════════════════ */}
      <div className={isDark ? 'bg-[#0A0D14]' : 'bg-[#FAF8F4]'}>
        <MemorialLandingPlans locale={locale} isDark={isDark} />
      </div>

      {/* ═══════════════════════════════════════════════
          8. PREGUNTAS FRECUENTES (FAQ)
      ═══════════════════════════════════════════════ */}
      <section
        id="faq"
        className={`scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 border-t transition-colors duration-300 ${
          isDark ? 'bg-[#080B11] border-white/10' : 'bg-[#FAF8F4] border-stone-200/80'
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <SectionHeading
            label={c.faq.label}
            title={c.faq.title}
            subtitle={c.faq.subtitle}
            dark={isDark}
          />
          <div className="space-y-3.5">
            {c.faq.items.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={`rounded-2xl border transition-all ${
                    open
                      ? isDark
                        ? 'border-amber-500/40 bg-amber-500/5 shadow-lg'
                        : 'border-amber-500/45 bg-amber-50/50 shadow-md'
                      : isDark
                        ? 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        : 'border-stone-200/90 bg-white hover:border-amber-500/35 shadow-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-${i}`}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 cursor-pointer"
                  >
                    <span className={`font-serif font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 transition-transform ${
                        open
                          ? `rotate-180 ${isDark ? 'text-amber-400' : 'text-amber-600'}`
                          : isDark
                            ? 'text-slate-400'
                            : 'text-slate-500'
                      }`}
                    />
                  </button>
                  {open && (
                    <p
                      id={`faq-${i}`}
                      className={`px-6 pb-5 -mt-1 leading-relaxed text-sm ${
                        isDark ? 'text-slate-300 font-light' : 'text-slate-600'
                      }`}
                    >
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <a
              href={whatsappLink(c.whatsapp_general)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all"
            >
              <MessageCircle size={17} />
              <span>{c.faq.contact}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          9. FOOTER SOLEMNE OFICIAL
      ═══════════════════════════════════════════════ */}
      <MemorialLandingFooter locale={locale} isDark={isDark} />
    </div>
  );
}
