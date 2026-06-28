"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PublicHeader } from '@/components/public/PublicHeader';
import { HuellasFooter } from '@/components/public/HuellasFooter';
import { getTranslations, type Locale } from '@/lib/translations';
import {
    Heart,
    Camera,
    MessageCircle,
    ShieldCheck,
    ChevronRight
} from 'lucide-react';

export default function PlanningPage() {
    const [locale, setLocale] = useState<Locale>('es');

    useEffect(() => {
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

    const resources = [
        {
            title: t.planning_resource_1_title,
            desc: t.planning_resource_1_desc,
            icon: <Camera className="text-sky-500" size={24} />
        },
        {
            title: t.planning_resource_2_title,
            desc: t.planning_resource_2_desc,
            icon: <MessageCircle className="text-amber-500" size={24} />
        },
        {
            title: t.planning_resource_3_title,
            desc: t.planning_resource_3_desc,
            icon: <Heart className="text-emerald-500" size={24} />
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-sky-100">
            <PublicHeader isDark={false} />

            <main className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="max-w-5xl mx-auto space-y-24">

                    {/* Hero Section */}
                    <div className="text-center space-y-6">
                        <motion.h4
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] font-black uppercase tracking-[0.5em] text-sky-500"
                        >
                            {t.planning_title}
                        </motion.h4>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-serif font-bold text-slate-900 leading-tight italic"
                        >
                            {t.planning_subtitle}
                        </motion.h1>
                    </div>

                    {/* Validation & Intro */}
                    <motion.section
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="bg-white p-12 md:p-20 rounded-[4rem] shadow-2xl shadow-slate-200 border border-slate-100 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-12 text-sky-50 opacity-20">
                            <ShieldCheck size={120} />
                        </div>

                        <div className="max-w-2xl space-y-8 relative z-10">
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 italic">
                                {t.planning_intro_title}
                            </h2>
                            <p className="text-xl text-slate-500 font-serif leading-relaxed italic">
                                {t.planning_intro_text}
                            </p>
                            <div className="w-20 h-px bg-slate-200" />
                        </div>
                    </motion.section>

                    {/* Resource List */}
                    <section className="space-y-12">
                        <h2 className="text-center text-3xl font-serif font-bold text-slate-800 italic">Recursos para tu familia</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {resources.map((res, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-lg hover:shadow-xl transition-all group cursor-default"
                                >
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        {res.icon}
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-slate-900 mb-4 italic">{res.title}</h3>
                                    <p className="text-slate-500 font-serif text-sm leading-relaxed italic">
                                        {res.desc}
                                    </p>
                                    <div className="pt-6 flex items-center text-[10px] font-black uppercase tracking-widest text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Leer más <ChevronRight size={12} className="ml-1" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Comfort Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="aspect-[21/9] rounded-[4rem] overflow-hidden grayscale-[30%] shadow-2xl"
                    >
                        <img
                            src="https://i.postimg.cc/T35p335F/Image-fx-11.webp"
                            alt="Comforting scene"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                </div>
            </main>

            <HuellasFooter locale={locale} t={t} />
        </div>
    );
}
