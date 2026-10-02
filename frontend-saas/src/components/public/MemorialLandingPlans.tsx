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
            ? <Check size={18} className={`mx-auto ${highlight ? 'text-[#c5a059]' : 'text-sky-500'}`} aria-label="Incluido" />
            : <span className={highlight ? 'font-semibold text-slate-900' : 'text-slate-600'}>{v}</span>;

    return (
        <section id="planes" className="scroll-mt-28 relative py-24 md:py-28 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-500">{p.label}</h4>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 leading-tight italic">{p.title}</h2>
                    <p className="text-slate-500 font-serif text-lg">{p.subtitle}</p>
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
                            className={`relative flex flex-col rounded-[2rem] p-8 bg-white transition-all duration-300 ${plan.highlight
                                ? 'border-2 border-[#c5a059] shadow-[0_20px_60px_-20px_rgba(197,160,89,0.45)] md:-translate-y-2'
                                : 'border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl'}`}
                        >
                            {plan.tag && (
                                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-md whitespace-nowrap ${plan.highlight ? 'bg-[#c5a059] text-white' : 'bg-sky-100 text-sky-700'}`}>
                                    {plan.tag}
                                </span>
                            )}

                            <div className="flex justify-center mb-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${plan.highlight ? 'bg-[#c5a059]/10 text-[#c5a059]' : 'bg-sky-50 text-sky-500'}`}>
                                    {plan.id === 'eterno' ? <InfinityIcon size={24} /> : <Sparkles size={22} strokeWidth={1.5} />}
                                </div>
                            </div>

                            <h3 className="text-center text-2xl font-serif font-bold text-slate-900">{plan.name}</h3>

                            <div className="text-center mt-5 mb-2">
                                <span className={`text-5xl font-serif font-bold ${plan.highlight ? 'text-[#a8843f]' : 'text-slate-900'}`}>${plan.price}</span>
                                <span className="ml-1.5 text-xs font-bold text-slate-400">{p.usd}</span>
                                <div className="text-sm text-slate-500 mt-1">{plan.period}</div>
                            </div>
                            <p className="text-center text-xs text-slate-400 mb-6">{plan.note}</p>

                            <ul className="space-y-3 mb-8 flex-1">
                                {p.rows.slice(1, 3).map(row => (
                                    <li key={row.label} className="flex items-start gap-3 text-sm text-slate-600">
                                        <Check size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-[#c5a059]' : 'text-sky-400'}`} />
                                        <span>{row.label}: <strong className="font-semibold text-slate-800">{row.values[i] as string}</strong></span>
                                    </li>
                                ))}
                                <li className="flex items-start gap-3 text-sm text-slate-600">
                                    <Check size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-[#c5a059]' : 'text-sky-400'}`} />
                                    <span>{p.rows[6].values[i] as string}</span>
                                </li>
                            </ul>

                            <a
                                href={whatsappLink(plan.whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-300 shadow-lg hover:-translate-y-0.5 ${plan.highlight
                                    ? 'bg-[#c5a059] text-white hover:bg-[#b38f4d] shadow-[#c5a059]/30'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'}`}
                            >
                                <MessageCircle size={15} />
                                {plan.cta}
                            </a>
                        </motion.div>
                    ))}
                </div>

                {/* Comparación */}
                <div className="mt-16">
                    <h3 className="text-center text-xl font-serif font-bold text-slate-900 mb-6">{p.compare_title}</h3>
                    <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th scope="col" className="text-left font-semibold text-slate-400 text-xs uppercase tracking-wider px-5 py-4">{p.feature}</th>
                                    {p.list.map(plan => (
                                        <th key={plan.id} scope="col" className={`px-4 py-4 text-center font-serif text-base ${plan.highlight ? 'text-[#a8843f] bg-[#c5a059]/5' : 'text-slate-900'}`}>
                                            {plan.name}
                                            <div className="text-xs font-sans font-semibold text-slate-500 mt-0.5">${plan.price} {p.usd}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {p.rows.map(row => (
                                    <tr key={row.label} className="border-b border-slate-50 last:border-0">
                                        <th scope="row" className="text-left font-medium text-slate-700 px-5 py-3.5">{row.label}</th>
                                        {row.values.map((v, i) => (
                                            <td key={i} className={`px-4 py-3.5 text-center ${p.list[i].highlight ? 'bg-[#c5a059]/5' : ''}`}>
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
                            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500 hover:text-sky-600 hover:underline"
                        >
                            <MessageCircle size={14} /> {p.help}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
