"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ChevronRight,
  ChevronDown,
  Flame,
  Sun,
  Camera,
  Eye,
  ShieldCheck,
  Route,
  KeyRound,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  Sparkles,
  Search,
  Lock,
  Flower2,
  Star,
  Crown,
  Compass,
  ArrowRight,
  Share2,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, whatsappLink } from '@/lib/memorialLanding';
import { MEMORIAL_SCENARIOS } from '@/lib/memorialDesign';
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
  dark = true,
}: {
  label: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div className="text-center mb-14 space-y-3.5 max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-sans font-black uppercase tracking-[0.25em]">
        <Sparkles size={11} className="text-amber-400" />
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('altar');
  const [heroCandleLit, setHeroCandleLit] = useState(true);
  const [heroCandleCount, setHeroCandleCount] = useState(28);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    // Si parece un PIN de 6 dígitos, ir directo al login de memorial
    if (/^\d{6}$/.test(q)) {
      window.location.href = `/memorials/login?pin=${q}`;
      return;
    }
    // Desplazar a la galería de homenajes
    const el = document.getElementById('galeria');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredMemorials = memorials.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.pet_name.toLowerCase().includes(q) ||
      m.tenant_name.toLowerCase().includes(q)
    );
  });

  const c = getLandingContent(locale);
  const pointIcons = [ClipboardCheck, KeyRound, Route];
  const stepIcons = [Heart, Camera, Eye];

  const currentScenario =
    MEMORIAL_SCENARIOS.find((s) => s.id === activeScenarioId) || MEMORIAL_SCENARIOS[1];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Encabezado Principal Celestial */}
      <PublicHeader isDark={true} transparent={true} />

      {/* ═══════════════════════════════════════════════
          1. HERO SECTION: SANTUARIO CELESTIAL & MAJESTUOSO
      ═══════════════════════════════════════════════ */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 px-4 sm:px-6 overflow-hidden">
        {/* Fondo Cósmico Ecosistémico con Luces Celestiales */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-amber-500/15 via-sky-500/10 to-transparent blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-1/4 w-[450px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full" />
          <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Columna Izquierda: Mensaje y Acciones */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] sm:text-[11px] font-sans font-black uppercase tracking-[0.25em] shadow-sm backdrop-blur-md"
            >
              <Sparkles size={12} className="text-amber-400" />
              <span>SANTUARIO DIGITAL CONMEMORATIVO · RED VINZER</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white leading-[1.12] tracking-tight"
            >
              Un espacio sagrado donde su amor{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent italic drop-shadow-[0_2px_20px_rgba(251,191,36,0.25)]">
                vive por siempre
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-base sm:text-lg text-slate-300/90 font-serif leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light italic"
            >
              Preserva el recuerdo eterno de tu angelito con velas perpetuas, retratos ceremoniales,
              estrellas en el firmamento y palabras de consuelo que trascienden el tiempo.
            </motion.p>

            {/* Barra de Búsqueda Rápida de Memorial o PIN Familiar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="pt-2 max-w-xl mx-auto lg:mx-0"
            >
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center bg-slate-900/80 border border-amber-500/30 rounded-2xl p-1.5 shadow-xl shadow-black/40 backdrop-blur-md focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all"
              >
                <div className="pl-3.5 pr-2 text-amber-400/80 shrink-0">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre de mascota o código PIN..."
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 outline-none pr-2 font-sans"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all shrink-0"
                >
                  Buscar
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-2">
                <span className="flex items-center gap-1.5">
                  <Lock size={12} className="text-amber-400" /> Acceso familiar privado con PIN de 6 dígitos
                </span>
                <a
                  href="#galeria"
                  className="text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1 font-semibold"
                >
                  Ver galería <ArrowRight size={11} />
                </a>
              </div>
            </motion.div>

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
                <span>Explorar los 4 Escenarios</span>
              </a>
              <a
                href="#galeria"
                className="px-6 py-3.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/15 text-slate-200 text-xs font-black uppercase tracking-[0.2em] transition-all backdrop-blur-md flex items-center gap-2"
              >
                <Flame size={14} className="text-amber-400" />
                <span>Homenajes en Vivo</span>
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
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/25 via-amber-400/10 to-sky-500/20 rounded-[2.5rem] blur-2xl opacity-75 pointer-events-none" />

              <div className="relative bg-slate-900/90 border border-amber-500/35 rounded-[2.2rem] p-6 sm:p-7 shadow-2xl backdrop-blur-xl text-center space-y-5 overflow-hidden">
                {/* Cabecera del Demo */}
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-400 border-b border-white/10 pb-3">
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Vista Previa Oficial
                  </span>
                  <span>Escenario: Altar de Luz</span>
                </div>

                {/* Retrato del Angelito */}
                <div className="relative mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-[0_0_35px_rgba(251,191,36,0.3)]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 relative">
                    <img
                      src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop"
                      alt="Angelito Conmemorativo"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Nombre y Fechas */}
                <div className="space-y-1">
                  <h3
                    className="text-2xl sm:text-3xl font-serif font-bold uppercase tracking-[0.1em] bg-gradient-to-b from-white via-amber-50 to-amber-200 bg-clip-text text-transparent drop-shadow-sm"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    UNIVERSE
                  </h3>
                  <p className="text-xs text-amber-200/80 font-serif italic">
                    2018 — 2026 · 8 años de amor incondicional
                  </p>
                </div>

                {/* Cita de Consuelo */}
                <p className="text-xs sm:text-sm text-slate-300/90 font-serif italic leading-relaxed px-2 font-light">
                  “Gracias por cada momento, cada alegría y por ser nuestro fiel guardián. Tu recuerdo
                  brillará por siempre.”
                </p>

                {/* Vela Interactiva de Homenaje */}
                <div className="pt-2 border-t border-white/10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handleToggleHeroCandle}
                    className="group relative flex flex-col items-center focus:outline-none transition-transform active:scale-95 cursor-pointer"
                  >
                    {/* Resplandor de llama */}
                    <div
                      className={`absolute -top-7 w-16 h-16 rounded-full transition-all duration-700 ${
                        heroCandleLit
                          ? 'bg-amber-400/30 blur-xl scale-100 opacity-100'
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
                    <div className="w-9 h-11 bg-gradient-to-b from-[#faf5ee] to-[#e6d8c3] rounded-t-sm rounded-b-md border border-amber-300/40 shadow-md flex items-center justify-center">
                      <Flame size={12} className={heroCandleLit ? 'text-amber-500 fill-amber-400' : 'text-slate-400'} />
                    </div>

                    <span className="mt-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 group-hover:text-amber-200 transition-colors">
                      {heroCandleLit ? 'Luz Perpetua Encendida' : 'Clic para Encender Vela'}
                    </span>
                    <span className="text-xs text-slate-400 font-serif italic mt-0.5">
                      🕯️ {heroCandleCount} velas encendidas por visitantes
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
      <section id="escenarios" className="scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 bg-slate-950 relative overflow-hidden border-t border-white/10">
        <div id="experiencia" className="scroll-mt-28" />
        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeading
            label="ESCENARIOS OFICIALES"
            title="Cuatro Maneras Únicas de Honrar su Memoria"
            subtitle="Cada memorial es un santuario personalizado según el plan del crematorio o la elección de la familia."
            dark={true}
          />

          {/* Selector de Pestañas de los 4 Escenarios */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
            {MEMORIAL_SCENARIOS.map((sc) => {
              const active = sc.id === activeScenarioId;
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
                  className={`px-4 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <span className="text-base sm:text-lg">{icons[sc.id]}</span>
                  <span>{sc.name}</span>
                  {sc.requiresUltraPlan && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-950/40 text-amber-200 uppercase font-black tracking-widest">
                      Ultra
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tarjeta de Detalle del Escenario Seleccionado */}
          <div className="bg-slate-900/60 border border-amber-500/30 rounded-[2.5rem] p-6 sm:p-10 md:p-14 shadow-2xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <span>{currentScenario.levelLabel}</span> · <span>{currentScenario.badgeText}</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                {currentScenario.name}
              </h3>
              <p className="text-amber-200/90 text-sm sm:text-base font-serif italic">
                “{currentScenario.subtitle}”
              </p>
              <p className="text-slate-300 leading-relaxed font-light text-sm sm:text-base">
                {currentScenario.description}
              </p>

              {/* Atributos Incluidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <Flame size={16} className="text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Vela perpetua interactiva</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <Camera size={16} className="text-sky-400 shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Descarga de retrato oficial</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <Lock size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Moderación familiar con PIN</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <MessageCircle size={16} className="text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Hasta 20 dedicatorias de amor</span>
                </div>
              </div>
            </div>

            {/* Representación Visual Miniaturizada */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden border border-white/15 shadow-2xl relative bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                <div className="relative z-20 space-y-2">
                  <span className="text-5xl block animate-bounce">
                    {activeScenarioId === 'altar' && '🏛️'}
                    {activeScenarioId === 'cielo' && '☁️'}
                    {activeScenarioId === 'constelacion' && '🌌'}
                    {activeScenarioId === 'normal' && '🕯️'}
                  </span>
                  <h4 className="text-xl font-serif font-bold text-white uppercase tracking-wider">
                    {currentScenario.name}
                  </h4>
                  <p className="text-xs text-amber-200/90 font-serif italic max-w-xs mx-auto">
                    {currentScenario.subtitle}
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
      <section className="py-24 sm:py-32 px-4 sm:px-6 bg-[#080B11] border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label="GESTOS DE CONSUELO"
            title="Cuatro Maneras de Acompañar a la Familia"
            subtitle="Amigos y familiares pueden rendir homenaje en cualquier momento desde cualquier lugar del mundo."
            dark={true}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Flame size={24} className="text-amber-400" />,
                title: 'Luz Perpetua',
                desc: 'Enciende una vela en el altar. Su llama permanece viva como símbolo de amor eterno.',
                badge: 'Vela de consuelo',
              },
              {
                icon: <Flower2 size={24} className="text-rose-400" />,
                title: 'Flores & Pétalos',
                desc: 'Ofrenda flores virtuales al retrato ceremonial para honrar su paso por nuestras vidas.',
                badge: 'Tributo floral',
              },
              {
                icon: <Star size={24} className="text-sky-400" />,
                title: 'Estrellas Celestiales',
                desc: 'Enciende un astro en el firmamento con tu nombre y deseos de paz para la familia.',
                badge: 'Cosmos eterno',
              },
              {
                icon: <Heart size={24} className="text-pink-400" />,
                title: 'Destellos de Amor',
                desc: 'Envía abrazos y besos virtuales que se suman al contador visible de cariño familiar.',
                badge: 'Gesto de cariño',
              },
            ].map((ritual, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 space-y-4 hover:border-amber-500/40 hover:bg-white/[0.05] transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {ritual.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                  {ritual.badge}
                </span>
                <h3 className="text-xl font-serif font-bold text-white">{ritual.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                  {ritual.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          4. GALERÍA DE ÚLTIMOS HOMENAJES
      ═══════════════════════════════════════════════ */}
      <section id="galeria" className="scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 bg-[#0A0D14] border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label="MEMORIALES EN VIVO"
            title="Recuerdos que Siguen Brillando"
            subtitle="Homenajes públicos creados junto a los crematorios autorizados de nuestra red."
            dark={true}
          />

          {searchQuery.trim() && (
            <div className="flex items-center justify-center gap-2.5 mb-8">
              <span className="px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                Resultados para: <strong>"{searchQuery}"</strong> ({filteredMemorials.length})
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Limpiar filtro
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: GALLERY_SIZE }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredMemorials.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] rounded-[2.5rem] border border-dashed border-white/15 max-w-lg mx-auto">
              <Heart size={32} className="mx-auto mb-4 text-amber-500/50" />
              <p className="font-serif italic text-slate-400 text-sm">
                {searchQuery.trim()
                  ? `No se encontraron homenajes con "${searchQuery}".`
                  : 'Pronto verás aquí los primeros homenajes públicos.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
              {filteredMemorials.map((m, i) => {
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
                      <div className="relative bg-slate-900/80 border border-white/10 group-hover:border-amber-500/40 rounded-3xl p-3 pb-5 shadow-xl shadow-black/40 group-hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        <div className="aspect-square rounded-2xl overflow-hidden bg-slate-950 relative">
                          {m.pet_image_url ? (
                            <img
                              src={m.pet_image_url}
                              alt={m.pet_name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Heart size={36} fill="currentColor" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-amber-300">
                            🕯️ Homenaje
                          </span>
                        </div>

                        <div className="mt-3 text-center space-y-0.5">
                          <h3 className="font-serif font-bold text-white group-hover:text-amber-300 transition-colors truncate text-base">
                            {m.pet_name}
                          </h3>
                          {years !== null && (
                            <p className="text-[11px] font-serif italic text-amber-200/70 truncate">
                              {years} {years === 1 ? 'año' : 'años'} de amor
                            </p>
                          )}
                        </div>

                        {/* Sello del Crematorio */}
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-center gap-1.5 min-w-0">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-[8px] font-black text-slate-950 flex items-center justify-center overflow-hidden">
                            {m.tenant_logo_url ? (
                              <img src={m.tenant_logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initials(m.tenant_name)
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
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
      <section id="crematorios" className="scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 bg-slate-950 relative overflow-hidden border-t border-white/10">
        <div className="max-w-6xl mx-auto relative z-10">
          <SectionHeading
            label="RED OFICIAL DE CREMATORIOS"
            title="Garantía de Respeto, Solemne Custodia y Veracidad"
            subtitle="Cada homenaje proviene de crematorios verificados que entregan el código de acceso oficial a las familias."
            dark={true}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
            {c.network.points.map((pt, i) => {
              const Icon = pointIcons[i];
              return (
                <div
                  key={pt.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-serif font-bold text-white text-lg">{pt.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
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
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 min-w-0"
                >
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center text-sm font-black text-slate-900">
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
                    <p className="font-semibold text-white truncate text-sm">{cr.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      {(cr.city || cr.region) && (
                        <>
                          <MapPin size={11} className="shrink-0 text-amber-400" />
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
              <p className="text-center text-sm text-slate-500 font-serif italic">{c.network.empty}</p>
            )
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          6. CÓMO FUNCIONA
      ═══════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 bg-[#080B11] border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label="PROCESO SENCILLO"
            title="Cómo Crear o Activar tu Santuario"
            subtitle="Tres simples pasos para inmortalizar el amor de tu compañero eterno."
            dark={true}
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
                  className="bg-white/[0.03] border border-white/10 p-8 sm:p-10 rounded-[2.5rem] space-y-4 relative hover:border-amber-500/30 transition-all duration-500"
                >
                  <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-sm">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">{step.title}</h3>
                  <p className="text-slate-400 font-serif leading-relaxed italic text-sm">{step.desc}</p>
                  <div
                    className="absolute top-8 right-8 text-white/5 font-black text-6xl select-none"
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
      <div className="bg-[#0A0D14]">
        <MemorialLandingPlans locale={locale} />
      </div>

      {/* ═══════════════════════════════════════════════
          8. PREGUNTAS FRECUENTES (FAQ)
      ═══════════════════════════════════════════════ */}
      <section id="faq" className="scroll-mt-24 py-24 sm:py-32 px-4 sm:px-6 bg-[#080B11] border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <SectionHeading
            label="RESOLVEMOS TUS DUDAS"
            title="Preguntas Frecuentes"
            subtitle="Todo lo que necesitas saber sobre el funcionamiento de los memoriales digitales."
            dark={true}
          />
          <div className="space-y-3.5">
            {c.faq.items.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={`rounded-2xl border transition-all ${
                    open
                      ? 'border-amber-500/40 bg-amber-500/5 shadow-lg'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-${i}`}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                  >
                    <span className="font-serif font-bold text-white text-base sm:text-lg">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        open ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <p
                      id={`faq-${i}`}
                      className="px-6 pb-5 -mt-1 text-slate-300 leading-relaxed font-light text-sm"
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
      <MemorialLandingFooter locale={locale} />
    </div>
  );
}
