"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PublicHeader } from '@/components/public/PublicHeader';
import { HuellasFooter } from '@/components/public/HuellasFooter';
import { getTranslations, type Locale } from '@/lib/translations';
import {
    Sparkles,
    Activity,
    Palette,
    Lock,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function OurServicesPage() {
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

    const services = [
        {
            title: t.services_p1_title,
            desc: t.services_p1_desc,
            icon: <Sparkles className="text-sky-400" size={32} />,
            gradient: "from-sky-400/20 to-transparent"
        },
        {
            title: t.services_p2_title,
            desc: t.services_p2_desc,
            icon: <Activity className="text-amber-400" size={32} />,
            gradient: "from-amber-400/20 to-transparent"
        },
        {
            title: t.services_p3_title,
            desc: t.services_p3_desc,
            icon: <Palette className="text-emerald-400" size={32} />,
            gradient: "from-emerald-400/20 to-transparent"
        },
        {
            title: t.services_p4_title,
            desc: t.services_p4_desc,
            icon: <Lock className="text-rose-400" size={32} />,
            gradient: "from-rose-400/20 to-transparent"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-sky-100">
            <PublicHeader isDark={false} />

            <main className="relative pt-32 pb-20 px-6 overflow-hidden">
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-100/50 blur-[120px] rounded-full -z-10" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-100/30 blur-[120px] rounded-full -z-10" />

                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <motion.h4
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] font-black uppercase tracking-[0.5em] text-sky-500"
                        >
                            Vínculo Cercano
                        </motion.h4>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-serif font-bold text-slate-900 leading-tight italic"
                        >
                            {t.services_title}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg md:text-xl text-slate-500 font-serif italic"
                        >
                            {t.services_subtitle}
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {services.map((service, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative bg-white/40 backdrop-blur-xl p-10 md:p-16 rounded-[4rem] border border-white/60 shadow-xl hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center space-y-8"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-[4rem] pointer-events-none`} />

                                <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-110">
                                    {service.icon}
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <h3 className="text-3xl font-serif font-bold text-slate-900 italic">{service.title}</h3>
                                    <p className="text-lg text-slate-500 font-serif leading-relaxed italic max-w-md mx-auto">
                                        {service.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex justify-center pt-8"
                    >
                        <Link
                            href="/memorials"
                            className="px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase text-xs tracking-[0.3em] flex items-center gap-4 hover:bg-sky-600 transition-all shadow-xl active:scale-95"
                        >
                            Explorar Memoriales
                            <ChevronRight size={18} />
                        </Link>
                    </motion.div>
                </div>
            </main>

            <HuellasFooter locale={locale} t={t} />
        </div>
    );
}
