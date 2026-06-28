"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PricingSection } from '@/components/public/PricingSection';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Sparkles,
  ChevronRight,
  Moon,
  Feather,
  PawPrint,
  Flame,
  Sun,
  Camera,
  Eye
} from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';
import { PublicHeader } from '@/components/public/PublicHeader';
import { HuellasFooter } from '@/components/public/HuellasFooter';

interface Memorial {
  id_recuerdo: string;
  pet_name: string;
  pet_image_url: string | null;
  pet_birth_date: string | null;
  pet_death_date: string | null;
  tenant_name: string;
}

export default function HomePage() {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>('es');

  useEffect(() => {
    // Sync with PublicHeader changes using the shared key
    const current = localStorage.getItem('preferred_locale') as Locale | null;
    if (current) setLocale(current);

    const syncLocale = () => {
      const saved = localStorage.getItem('preferred_locale') as Locale | null;
      if (saved) setLocale(saved);
    };
    window.addEventListener('localeChange', syncLocale);
    window.addEventListener('storage', syncLocale);
    return () => {
      window.removeEventListener('localeChange', syncLocale);
      window.removeEventListener('storage', syncLocale);
    };
  }, []);

  const t = getTranslations(locale);

  useEffect(() => {
    fetchMemorials();
  }, []);

  const fetchMemorials = async () => {
    try {
      const res = await fetch('/api/internal/memorials/');
      if (res.ok) {
        const data = await res.json();
        // Solo tomamos los últimos 5 registrados
        setMemorials(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching memorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birth: string | null, death: string | null) => {
    if (!birth || !death) return null;
    const birthDate = new Date(birth);
    const deathDate = new Date(death);
    let years = deathDate.getFullYear() - birthDate.getFullYear();
    if (isNaN(years)) return null;
    return years;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-sky-100">
      {/* Header */}
      <PublicHeader isDark={false} />

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        {/* Background Image with Mask */}
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
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-slate-50/20 to-slate-50" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 bg-sky-100 text-sky-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm"
          >
            {t.hero_badge}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif font-bold text-slate-900 leading-tight"
          >
            {t.hero_title_before}<span className="text-sky-500 underline decoration-sky-100 decoration-8 underline-offset-8">{t.hero_title_highlight}</span>{t.hero_title_after}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 font-serif italic max-w-2xl mx-auto leading-relaxed"
          >
            {t.hero_subtitle}
          </motion.p>
        </div>
      </section>

      {/* Altar Experience Section */}
      <section className="py-32 px-6 bg-slate-900 overflow-hidden relative">
        {/* Top Gradient - Light bleed from Hero */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-50/10 to-transparent z-10 pointer-events-none" />

        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-400">{t.exp_subtitle}</h4>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight italic">
              {t.exp_title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-amber-400 shadow-2xl">
                <Flame size={32} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white">{t.exp_candles_title}</h3>
              <p className="text-slate-400 font-serif leading-relaxed text-lg max-w-md">
                {t.exp_candles_desc}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-sky-400 shadow-2xl">
                <Sun size={32} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white">{t.exp_ritual_title}</h3>
              <p className="text-slate-400 font-serif leading-relaxed text-lg max-w-md">
                {t.exp_ritual_desc}
              </p>
            </motion.div>
          </div>

          <div className="mt-24 aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl bg-black relative group">
            <Image
              src={`https://pub-${process.env.NEXT_PUBLIC_CLOUDFLARE_R2}/library/backgrounds/5d165444-f1a1-449c-835c-a4a7375cc46f.webp`}
              alt="Experiencia de altar digital"
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover transform scale-105 group-hover:scale-100 transition-transform duration-[3s] opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

          </div>
        </div>

        {/* Bottom Gradient - Transition to Light */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/10 to-transparent z-10 pointer-events-none" />
      </section>

      {/* Gallery Section */}
      <section id="galeria" className="py-20 px-6 bg-white border-y border-slate-100 relative">
        <div className="max-w-7xl mx-auto space-y-12 relative z-20">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
                <AnimatePresence mode="popLayout">
                  {memorials.map((memorial) => {
                    const age = calculateAge(memorial.pet_birth_date, memorial.pet_death_date);
                    return (
                      <motion.div
                        layout
                        key={memorial.id_recuerdo}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group"
                      >
                        <Link
                          href={`/memorials/v/${memorial.tenant_name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}/${memorial.pet_name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}/${memorial.id_recuerdo}`}
                          className="block space-y-4"
                        >
                          <div className="relative aspect-[4/5] bg-white p-2.5 shadow-xl shadow-slate-200/50 group-hover:-translate-y-2 transition-all duration-500">
                            <div className="w-full h-full overflow-hidden bg-slate-50 relative">
                              {memorial.pet_image_url ? (
                                <img
                                  src={memorial.pet_image_url}
                                  alt={memorial.pet_name}
                                  className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                  <Heart size={40} fill="currentColor" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="text-center px-2">
                            <h3 className="font-serif font-bold text-slate-900 group-hover:text-sky-600 transition-colors uppercase tracking-tight">
                              {memorial.pet_name}
                            </h3>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
                              {memorial.tenant_name}
                            </p>
                            {age !== null && (
                              <div className="flex items-center justify-center gap-1.5 mt-1">
                                <Heart size={8} className="text-sky-400 fill-sky-400/20" />
                                <p className="text-[10px] font-serif italic font-medium text-slate-500">
                                  {age} {age === 1 ? t.gallery_age_suffix_singular : t.gallery_age_suffix_plural}
                                </p>
                              </div>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="flex justify-center pt-12">
                <Link
                  href="/memorials"
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-full font-serif italic hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm hover:shadow-md flex items-center gap-2 group"
                >
                  <span>{t.gallery_view_all}</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {memorials.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Heart size={24} className="text-slate-200" />
                  </div>
                  <p className="font-serif italic text-slate-400">{t.gallery_empty}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent z-10 pointer-events-none" />
      </section>

      {/* Philosophy Section */}
      <section id="filosofia" className="py-32 px-6 bg-slate-50 relative">
        <div className="max-w-5xl mx-auto relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="aspect-square rounded-[3rem] bg-sky-100 overflow-hidden shadow-2xl shadow-sky-100 rotate-3 group relative">
                <Image
                  src="https://i.postimg.cc/c4MrqMQR/Image-fx-8.webp"
                  alt="Filosofía"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400/20 to-transparent mix-blend-overlay" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white rounded-3xl shadow-xl flex items-center justify-center p-6 border border-slate-50">
                <Sparkles className="text-amber-500 animate-pulse" size={48} />
              </div>
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-500">{t.philosophy_label}</h4>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 leading-tight italic">
                  {t.philosophy_title}
                </h2>
              </div>
              <p className="text-slate-500 font-serif leading-relaxed text-lg">
                {t.philosophy_text}
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mt-1 shrink-0">
                    <Feather size={14} />
                  </div>
                  <p className="text-slate-600 text-sm font-serif">{t.philosophy_feature_1}</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mt-1 shrink-0">
                    <Moon size={14} />
                  </div>
                  <p className="text-slate-600 text-sm font-serif">{t.philosophy_feature_2}</p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mt-1 shrink-0">
                    <PawPrint size={14} />
                  </div>
                  <p className="text-slate-600 text-sm font-serif">{t.philosophy_feature_3}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 px-6 bg-white border-y border-slate-100 relative">
        {/* Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-50/20 to-transparent z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-20">
          <div className="text-center mb-24 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-500">{t.hero_badge}</h4>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 leading-tight italic">
              {t.how_title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-slate-50 p-10 rounded-[3rem] space-y-6 relative border border-slate-100 hover:shadow-xl transition-all duration-500"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-sky-500 shadow-sm">
                <Heart size={24} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-slate-900">{t.how_step_1_title}</h3>
              <p className="text-slate-500 font-serif leading-relaxed italic">
                {t.how_step_1_desc}
              </p>
              <div className="absolute top-10 right-10 text-slate-100 font-black text-6xl">01</div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-slate-50 p-10 rounded-[3rem] space-y-6 relative border border-slate-100 hover:shadow-xl transition-all duration-500 md:translate-y-8"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
                <Camera size={24} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-slate-900">{t.how_step_2_title}</h3>
              <p className="text-slate-500 font-serif leading-relaxed italic">
                {t.how_step_2_desc}
              </p>
              <div className="absolute top-10 right-10 text-slate-100 font-black text-6xl">02</div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-slate-50 p-10 rounded-[3rem] space-y-6 relative border border-slate-100 hover:shadow-xl transition-all duration-500"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                <Eye size={24} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-slate-900">{t.how_step_3_title}</h3>
              <p className="text-slate-500 font-serif leading-relaxed italic">
                {t.how_step_3_desc}
              </p>
              <div className="absolute top-10 right-10 text-slate-100 font-black text-6xl">03</div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50/50 to-transparent z-10 pointer-events-none" />
      </section>

      {/* Pricing Section */}
      <PricingSection locale={locale} />



      <HuellasFooter locale={locale} t={t} />
    </div>
  );
}
