"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PricingSection } from '@/components/public/PricingSection';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Search,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Sparkles
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

const ITEMS_PER_PAGE = 20;

export default function MemorialsGalleryPage() {
    const [memorials, setMemorials] = useState<Memorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [locale, setLocale] = useState<Locale>('es');

    useEffect(() => {
        // Sync with PublicHeader changes using the shared key
        const current = localStorage.getItem('preferred_locale') as Locale | null;
        if (current) setLocale(current);

        const syncLocale = () => {
            const saved = localStorage.getItem('preferred_locale') as Locale | null;
            if (saved === 'es' || saved === 'en') setLocale(saved);
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
                setMemorials(data);
            }
        } catch (error) {
            console.error('Error fetching memorials:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMemorials = useMemo(() => {
        return memorials.filter(m =>
            m.pet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [memorials, searchTerm]);

    const totalPages = Math.ceil(filteredMemorials.length / ITEMS_PER_PAGE);

    const paginatedMemorials = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredMemorials.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredMemorials, currentPage]);

    // Reset page when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

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
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-transparent to-slate-50 z-10" />
                    <img
                        src="https://i.postimg.cc/W3XkPmLR/Image_fx_2.webp"
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-50/30 mix-blend-overlay z-10" />
                    {/* Bottom Gradient Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent z-20" />
                </div>

                <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-block px-4 py-1.5 bg-sky-100 text-sky-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm"
                    >
                        {locale === 'es' ? 'Nuestro Legado' : 'Our Legacy'}
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-serif font-bold text-slate-900 leading-tight"
                    >
                        {locale === 'es' ? 'Galería de' : 'Gallery of'} <span className="text-sky-500 underline decoration-sky-100 decoration-8 underline-offset-8">{locale === 'es' ? 'Recuerdos' : 'Memories'}</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg md:text-xl text-slate-500 font-serif italic max-w-2xl mx-auto leading-relaxed"
                    >
                        {locale === 'es'
                            ? 'Explora las historias de amor incondicional que permanecen vivas en nuestro corazón y en este espacio eterno.'
                            : 'Explore the stories of unconditional love that stay alive in our hearts and in this eternal space.'}
                    </motion.p>
                </div>
            </section>

            {/* Gallery Section */}
            <section id="galeria" className="py-10 px-6 bg-white border-y border-slate-100 relative">
                {/* Top Gradient */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 to-transparent z-10 pointer-events-none" />

                <div className="max-w-7xl mx-auto space-y-12 relative z-20">
                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Busca por nombre de mascota..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/20 transition-all font-serif text-lg"
                        />
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[2rem] animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
                                <AnimatePresence mode="popLayout">
                                    {paginatedMemorials.map((memorial) => {
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

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 pt-12">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-500 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-500 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}

                            {paginatedMemorials.length === 0 && (
                                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                        <Search size={24} className="text-slate-200" />
                                    </div>
                                    <p className="font-serif italic text-slate-400">No encontramos resultados para tu búsqueda</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Bottom Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent z-10 pointer-events-none" />
            </section>

            {/* Philosophy Section */}
            <section className="py-10 px-6 relative overflow-hidden border-t border-slate-100 bg-slate-50/50">
                {/* Top Gradient */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 to-transparent z-10 pointer-events-none" />

                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.4]" />
                <div className="max-w-5xl mx-auto text-center space-y-16 relative z-10">
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-block px-5 py-2 bg-sky-100 text-sky-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border border-sky-200"
                        >
                            {t.philosophy_label}
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-6xl font-serif font-medium text-slate-900 leading-tight tracking-tight"
                        >
                            {t.philosophy_title}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-lg md:text-2xl text-slate-500 font-serif italic max-w-3xl mx-auto leading-relaxed"
                        >
                            {t.philosophy_text}
                        </motion.p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Heart, text: t.philosophy_feature_1, delay: 0 },
                            { icon: ShieldCheck, text: t.philosophy_feature_2, delay: 0.1 },
                            { icon: Sparkles, text: t.philosophy_feature_3, delay: 0.2 }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 + feature.delay }}
                                className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center gap-6 text-center group hover:-translate-y-2 transition-all duration-500"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors duration-500 shadow-inner">
                                    <feature.icon size={28} strokeWidth={1.5} />
                                </div>
                                <p className="font-serif text-lg font-medium text-slate-600 leading-relaxed">
                                    {feature.text}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Bottom Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 via-slate-50/50 to-transparent z-10 pointer-events-none" />
            </section>

            {/* Pricing Section */}
            <PricingSection locale={locale} />


            <HuellasFooter locale={locale} t={t} />
        </div>
    );
}
