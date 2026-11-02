'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Infinity as InfinityIcon, MessageCircle, Sparkles } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, whatsappLink, type CompareValue } from '@/lib/memorialLanding';

/** Planes en USD de la landing del memorial: tarjetas + comparación. Venta por WhatsApp. */
export function MemorialLandingPlans({ locale }: { locale: Locale }) {
    const c = getLandingContent(locale);
    const p = c.plans;

    const renderValue = (v: CompareValue, highlight: boolean) =>
        v === true
            ? <Check size={18} className={`mx-auto ${highlight ? 'text-amber-400' : 'text-emerald-400'}`} aria-label="Incluido" />
            : <span className={highlight ? 'font-semibold text-amber-200' : 'text-slate-300'}>{v}</span>;

    return (
        <section id="planes" className="scroll-mt-28 relative py-24 md:py-32 px-4 sm:px-6 bg-[#0A0D14] border-t border-white/10">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14 space-y-3.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-sans font-black uppercase tracking-[0.25em]">
                        <Sparkles size={11} className="text-amber-400" />
                        <span>{p.label}</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
                        {p.title}
                    </h2>
                    <p className="text-slate-400 font-serif text-base sm:text-lg">{p.subtitle}</p>
                </div>

                {/* Tarjetas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    {p.list.map((plan, i) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            className={`relative flex flex-col rounded-[2.2rem] p-8 transition-all duration-300 backdrop-blur-xl ${plan.highlight
                                ? 'border-2 border-amber-500 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 shadow-[0_0_50px_rgba(251,191,36,0.25)] md:-translate-y-2'
                                : 'border border-white/10 bg-slate-900/70 shadow-xl hover:border-white/20'}`}
                        >
                            {plan.tag && (
                                <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-md whitespace-nowrap ${plan.highlight ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-300 border border-amber-500/30'}`}>
                                    {plan.tag}
                                </span>
                            )}

                            <div className="flex justify-center mb-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${plan.highlight ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400' : 'bg-white/5 border border-white/10 text-slate-300'}`}>
                                    {plan.id === 'eterno' ? <InfinityIcon size={24} /> : <Sparkles size={22} strokeWidth={1.5} />}
                                </div>
                            </div>

                            <h3 className="text-center text-2xl font-serif font-bold text-white">{plan.name}</h3>

                            <div className="text-center mt-5 mb-2">
                                <span className={`text-5xl font-serif font-bold ${plan.highlight ? 'text-amber-300' : 'text-white'}`}>${plan.price}</span>
                                <span className="ml-1.5 text-xs font-bold text-slate-400">{p.usd}</span>
                                <div className="text-xs text-slate-400 mt-1">{plan.period}</div>
                            </div>
                            <p className="text-center text-xs text-slate-400 mb-6 font-light">{plan.note}</p>

                            <ul className="space-y-3 mb-8 flex-1">
                                {p.rows.slice(1, 3).map(row => (
                                    <li key={row.label} className="flex items-start gap-3 text-sm text-slate-300">
                                        <Check size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-amber-400' : 'text-emerald-400'}`} />
                                        <span>{row.label}: <strong className="font-semibold text-white">{row.values[i] as string}</strong></span>
                                    </li>
                                ))}
                                <li className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-amber-400' : 'text-emerald-400'}`} />
                                    <span>{p.rows[6].values[i] as string}</span>
                                </li>
                            </ul>

                            <a
                                href={whatsappLink(plan.whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-300 shadow-lg hover:-translate-y-0.5 ${plan.highlight
                                    ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-amber-500/25 font-black'
                                    : 'bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/10'}`}
                            >
                                <MessageCircle size={15} />
                                {plan.cta}
                            </a>
                        </motion.div>
                    ))}
                </div>

                {/* Comparación */}
                <div className="mt-16">
                    <h3 className="text-center text-xl font-serif font-bold text-white mb-6">{p.compare_title}</h3>
                    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th scope="col" className="text-left font-semibold text-slate-400 text-xs uppercase tracking-wider px-5 py-4">{p.feature}</th>
                                    {p.list.map(plan => (
                                        <th key={plan.id} scope="col" className={`px-4 py-4 text-center font-serif text-base ${plan.highlight ? 'text-amber-300 bg-amber-500/5' : 'text-white'}`}>
                                            {plan.name}
                                            <div className="text-xs font-sans font-semibold text-slate-400 mt-0.5">${plan.price} {p.usd}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {p.rows.map(row => (
                                    <tr key={row.label} className="border-b border-white/5 last:border-0">
                                        <th scope="row" className="text-left font-medium text-slate-300 px-5 py-3.5 text-xs sm:text-sm">{row.label}</th>
                                        {row.values.map((v, i) => (
                                            <td key={i} className={`px-4 py-3.5 text-center text-xs sm:text-sm ${p.list[i].highlight ? 'bg-amber-500/5' : ''}`}>
                                                {renderValue(v, !!p.list[i].highlight)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-5">{p.footnote}</p>
                    <div className="text-center mt-3">
                        <a
                            href={whatsappLink(c.whatsapp_general)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300 hover:underline"
                        >
                            <MessageCircle size={14} /> {p.help}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
