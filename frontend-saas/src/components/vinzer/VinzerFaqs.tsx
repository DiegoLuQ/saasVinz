'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { VINZER_FAQS as faqs } from '@/lib/vinzer-faqs';

interface VinzerFaqsProps {
    theme?: 'dark' | 'light';
}

export function VinzerFaqs({ theme = 'dark' }: VinzerFaqsProps) {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <section id="faqs" className="py-24 px-6 max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-16 space-y-4">
                <h2 className={`text-3xl md:text-5xl font-black ${
                    theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                }`}>
                    Preguntas Frecuentes
                </h2>
                <p className={`font-medium ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                }`}>
                    Todo lo que necesitas saber sobre la implementación, seguridad y funcionamiento de Vinzer.
                </p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, i) => (
                    <div
                        key={i}
                        className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
                            theme === 'light'
                                ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                                : 'bg-[#0b0a24]/40 border-white/5'
                        }`}
                    >
                        <button
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                        >
                            <span className={`font-bold text-sm sm:text-base ${
                                theme === 'light' ? 'text-slate-900' : 'text-[#FFFFFF]'
                            }`}>{faq.q}</span>
                            <ChevronDown
                                size={18}
                                className={`transition-transform duration-300 ${
                                    theme === 'light' ? 'text-[#0284C7]' : 'text-[#19B5FE]'
                                } ${openFaq === i ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <AnimatePresence initial={false}>
                            {openFaq === i && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className={`px-6 pb-5 text-xs sm:text-sm border-t pt-4 leading-relaxed ${
                                        theme === 'light'
                                            ? 'text-slate-600 border-slate-100'
                                            : 'text-slate-400 border-white/5'
                                    }`}>
                                        {faq.a}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </section>
    );
}
