"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, whatsappLink } from '@/lib/memorialLanding';
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

function SectionHeading({ label, title, subtitle, dark = false }: { label: string; title: string; subtitle?: string; dark?: boolean }) {
  return (
    <div className="text-center mb-14 space-y-4 max-w-3xl mx-auto">
      <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] ${dark ? 'text-sky-400' : 'text-sky-500'}`}>{label}</h4>
      <h2 className={`text-4xl md:text-5xl font-serif font-bold leading-tight italic ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {subtitle && <p className={`font-serif text-lg leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
    </div>
  );
}

export default function MemorialLandingClient() {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [crematoria, setCrematoria] = useState<Crematorium[]>([]);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>('es');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Idioma compartido con PublicHeader (misma clave y evento)
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

  // Navegación por anclas con desplazamiento suave (solo en esta página)
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = previous; };
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

  const c = getLandingContent(locale);
  const pointIcons = [ClipboardCheck, KeyRound, Route];
  const stepIcons = [Heart, Camera, Eye];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-sky-100">
      <PublicHeader isDark={false} />

      {/* 1. Hero */}
      <section className="relative pt-36 pb-28 md:pt-44 md:pb-36 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://i.postimg.cc/25Nvd8Fw/Image_fx_6.webp"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40 grayscale-[20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-slate-50/30 to-slate-50" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-7 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 bg-white/80 border border-[#c5a059]/30 text-[#a8843f] rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm backdrop-blur"
          >
            {c.hero.badge}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-slate-900 leading-tight"
          >
            {c.hero.title}
            <span className="text-sky-500 italic">{c.hero.highlight}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 font-serif italic max-w-2xl mx-auto leading-relaxed"
          >
            {c.hero.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <a
              href="#planes"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-[#c5a059] hover:shadow-[#c5a059]/30 transition-all"
            >
              {c.hero.primary}
            </a>
            <a
              href="#experiencia"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/80 border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-[0.2em] hover:border-[#c5a059] hover:text-[#a8843f] transition-all backdrop-blur"
            >
              {c.hero.secondary}
            </a>
          </motion.div>
        </div>
      </section>

      {/* 2. Experiencia del altar */}
      <section id="experiencia" className="scroll-mt-24 py-24 md:py-32 px-6 bg-slate-900 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeading label={c.experience.label} title={c.experience.title} dark />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
            {[
              { icon: <Flame size={32} />, color: 'text-amber-400', title: c.experience.candles_title, desc: c.experience.candles_desc },
              { icon: <Sun size={32} />, color: 'text-sky-400', title: c.experience.ritual_title, desc: c.experience.ritual_desc },
            ].map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-5 flex flex-col items-center text-center"
              >
                <div className={`w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center ${pillar.color} shadow-2xl`}>
                  {pillar.icon}
                </div>
                <h3 className="text-2xl font-serif font-bold text-white">{pillar.title}</h3>
                <p className="text-slate-400 font-serif leading-relaxed text-lg max-w-md">{pillar.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 aspect-video rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-black relative group">
            <Image
              src={`https://pub-${process.env.NEXT_PUBLIC_CLOUDFLARE_R2}/library/backgrounds/5d165444-f1a1-449c-835c-a4a7375cc46f.webp`}
              alt="Altar digital Vinzer Memorial"
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover transform scale-105 group-hover:scale-100 transition-transform duration-[3s] opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            <p className="absolute bottom-5 inset-x-6 text-center text-sm font-serif italic text-white/70">{c.experience.caption}</p>
          </div>
        </div>
      </section>

      {/* 3. Galería de últimos homenajes */}
      <section id="galeria" className="scroll-mt-24 py-24 px-6 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <SectionHeading label={c.gallery.label} title={c.gallery.title} subtitle={c.gallery.subtitle} />

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: GALLERY_SIZE }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-slate-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : memorials.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <Heart size={28} className="mx-auto mb-4 text-slate-200" />
              <p className="font-serif italic text-slate-400">{c.gallery.empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 md:gap-x-8">
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
                    <Link href={`/memorials/v/${slugify(m.tenant_name)}/${slugify(m.pet_name)}/${m.id_recuerdo}`} className="block">
                      {/* Polaroid */}
                      <div className={`relative bg-white p-2.5 pb-14 shadow-xl shadow-slate-200/60 group-hover:-translate-y-2 transition-all duration-500 ${i % 2 === 0 ? '-rotate-1' : 'rotate-1'} group-hover:rotate-0`}>
                        <div className="aspect-square overflow-hidden bg-slate-50 relative">
                          {m.pet_image_url ? (
                            <img
                              src={m.pet_image_url}
                              alt={m.pet_name}
                              loading="lazy"
                              className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                              <Heart size={40} fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-3 inset-x-2.5 text-center">
                          <h3 className="font-serif font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">{m.pet_name}</h3>
                          {years !== null && (
                            <p className="text-[10px] font-serif italic text-slate-500 truncate">{c.gallery.years(years)}</p>
                          )}
                        </div>
                      </div>
                      {/* Sello del crematorio */}
                      <div className="mt-3 flex items-center justify-center gap-2 min-w-0">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-[9px] font-black text-white flex items-center justify-center overflow-hidden ring-1 ring-[#c5a059]/40">
                          {m.tenant_logo_url
                            ? <img src={m.tenant_logo_url} alt="" className="w-full h-full object-cover bg-white" />
                            : initials(m.tenant_name)}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {c.gallery.served_by} <span className="font-bold text-slate-600">{m.tenant_name}</span>
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="flex justify-center pt-12">
            <Link
              href="/memorials"
              className="px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-full font-serif italic hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm hover:shadow-md flex items-center gap-2 group"
            >
              <span>{c.gallery.view_all}</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Red de crematorios */}
      <section id="crematorios" className="scroll-mt-24 py-24 px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-72 bg-[#c5a059]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c5a059]/40 bg-[#c5a059]/10 text-[#e2c58a] text-[10px] font-black uppercase tracking-[0.2em]">
              <ShieldCheck size={14} /> {c.network.badge}
            </span>
          </div>
          <SectionHeading label={c.network.label} title={c.network.title} subtitle={c.network.subtitle} dark />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            {c.network.points.map((pt, i) => {
              const Icon = pointIcons[i];
              return (
                <div key={pt.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <Icon size={22} className="text-[#c5a059] mb-3" />
                  <h3 className="font-serif font-bold text-white text-lg">{pt.title}</h3>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{pt.desc}</p>
                </div>
              );
            })}
          </div>

          {crematoria.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {crematoria.map(cr => (
                <div key={cr.name} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 min-w-0">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center text-sm font-black text-slate-900">
                    {cr.logo_url
                      ? <img src={cr.logo_url} alt={cr.name} loading="lazy" className="w-full h-full object-contain p-1" />
                      : initials(cr.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{cr.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      {(cr.city || cr.region) && <><MapPin size={11} className="shrink-0" /> {[cr.city, cr.region].filter(Boolean).join(', ')} · </>}
                      {c.network.memorials(cr.memorials_count)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <p className="text-center text-sm text-slate-500 font-serif italic">{c.network.empty}</p>
          )}
        </div>
      </section>

      {/* 5. Cómo funciona */}
      <section className="py-24 md:py-32 px-6 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <SectionHeading label={c.steps.label} title={c.steps.title} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {c.steps.items.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-slate-50 p-10 rounded-[2.5rem] space-y-5 relative border border-slate-100 hover:shadow-xl transition-all duration-500 ${i === 1 ? 'md:translate-y-8' : ''}`}
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-sky-500 shadow-sm">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-slate-900">{step.title}</h3>
                  <p className="text-slate-500 font-serif leading-relaxed italic">{step.desc}</p>
                  <div className="absolute top-10 right-10 text-slate-100 font-black text-6xl select-none" aria-hidden="true">0{i + 1}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Planes */}
      <MemorialLandingPlans locale={locale} />

      {/* 7. Preguntas frecuentes */}
      <section id="faq" className="scroll-mt-24 py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <SectionHeading label={c.faq.label} title={c.faq.title} />
          <div className="space-y-3">
            {c.faq.items.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} className={`rounded-2xl border transition-colors ${open ? 'border-[#c5a059]/40 bg-[#c5a059]/[0.04]' : 'border-slate-100 bg-slate-50/60'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-${i}`}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                  >
                    <span className="font-serif font-bold text-slate-900">{item.q}</span>
                    <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-[#c5a059]' : ''}`} />
                  </button>
                  {open && (
                    <p id={`faq-${i}`} className="px-6 pb-5 -mt-1 text-slate-600 leading-relaxed">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <a
              href={whatsappLink(c.whatsapp_general)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
            >
              <MessageCircle size={16} /> {c.faq.contact}
            </a>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <MemorialLandingFooter locale={locale} />
    </div>
  );
}
