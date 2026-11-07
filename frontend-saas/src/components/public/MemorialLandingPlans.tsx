'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Heart, Infinity as InfinityIcon, MessageCircle, Minus, Sparkles } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getLandingContent, whatsappLink } from '@/lib/memorialLanding';
import { compareRows, formatPrice, planHighlights, planPeriod, useMemorialPlans, type CompareValue } from '@/lib/memorialPlans';

/** Planes de memorial de Vinzer (precio y límites desde Admin): tarjetas + comparación. */
export function MemorialLandingPlans({ locale }: { locale: Locale }) {
    const c = getLandingContent(locale);
    const p = c.plans;
    const en = locale === 'en';
    const plans = useMemorialPlans();
    const rows = compareRows(plans, en);

    const renderValue = (v: CompareValue, highlight: boolean) =>
        v === true
            ? <Check size={18} className={`mx-auto ${highlight ? 'text-amber-400' : 'text-emerald-400'}`} aria-label={en ? 'Included' : 'Incluido'} />
            : v === false
                ? <Minus size={16} className="mx-auto text-slate-600" aria-label={en ? 'Not included' : 'No incluido'} />
                : <span className={highlight ? 'font-semibold text-amber-200' : 'text-slate-300'}>{v}</span>;

    const icon = (key: string) => key === 'infinito' ? <InfinityIcon size={24} /> : key === 'eterno' ? <Crown size={22} /> : <Heart size={22} />;

    return (
        <section id="planes" className="scroll-mt-28 relative py-24 md:py-32 px-4 sm:px-6 bg-[#0A0D14] border-t border-white/10">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14 space-y-3.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-sans font-black uppercase tracking-[0.25em]">
                        <Sparkles size={11} className="text-amber-400" />
                        <span>{p.label}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-sans font-extrabold tracking-tight text-white leading-tight">
                        {p.title}
                    </h2>
                    <p className="text-slate-400 font-sans text-sm sm:text-base max-w-2xl mx-auto">{p.subtitle}</p>
                </div>

                {/* Tarjetas */}
                <div className={`grid grid-cols-1 gap-6 items-stretch ${plans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'}`}>
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.key}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            className={`relative flex flex-col rounded-[2.2rem] p-8 transition-all duration-300 backdrop-blur-xl ${plan.highlight
                                ? 'border-2 border-amber-500 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 shadow-[0_0_50px_rgba(251,191,36,0.25)] md:-translate-y-2'
                                : 'border border-white/10 bg-slate-900/70 shadow-xl hover:border-white/20'}`}
                        >
                            {plan.highlight && (
                                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-md whitespace-nowrap bg-amber-500 text-slate-950">
                                    {en ? 'Recommended' : 'Recomendado'}
                                </span>
                            )}

                            <div className="flex justify-center mb-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${plan.highlight ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400' : 'bg-white/5 border border-white/10 text-slate-300'}`}>
                                    {icon(plan.key)}
                                </div>
                            </div>

                            <h3 className="text-center text-xl font-sans font-bold tracking-tight text-white">{plan.name}</h3>

                            <div className="text-center mt-5 mb-2">
                                {(plan.discount_percent || 0) > 0 && (
                                    <div className="mb-1.5 space-y-1">
                                        <div className="flex items-center justify-center gap-2">
                                            {plan.original_price && plan.original_price > plan.price && (
                                                <span className="text-xs font-medium text-slate-400 line-through tabular-nums">
                                                    ${formatPrice(plan.original_price)} {plan.currency}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                                                -{plan.discount_percent}% OFF
                                            </span>
                                        </div>
                                        {plan.discount_label && (
                                            <p className="text-[11px] font-medium text-emerald-400/90 leading-snug">
                                                {plan.discount_label}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <span className={`text-3xl sm:text-4xl font-sans font-extrabold tracking-tight tabular-nums ${plan.highlight ? 'text-amber-300' : 'text-white'}`}>${formatPrice(plan.price)}</span>
                                <span className="ml-1.5 text-xs font-bold text-slate-400">{plan.currency}</span>
                                <div className="text-xs text-slate-400 mt-1">{planPeriod(plan.billing, en)}</div>
                            </div>
                            {plan.description && <p className="text-center text-xs text-slate-400 mb-6 font-light">{plan.description}</p>}

                            <ul className="space-y-3 mb-8 flex-1">
                                {planHighlights(plan, en).map((h) => (
                                    <li key={h} className="flex items-start gap-3 text-sm text-slate-300">
                                        <Check size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-amber-400' : 'text-emerald-400'}`} />
                                        <span>{h}</span>
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={`/crear?plan=${plan.key}`}
                                className={`w-full inline-flex items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-300 shadow-lg hover:-translate-y-0.5 ${plan.highlight
                                    ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-amber-500/25 font-black'
                                    : 'bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/10'}`}
                            >
                                {en ? `Choose ${plan.name}` : `Elegir ${plan.name}`}
                            </a>
                            <a
                                href={whatsappLink(en
                                    ? `Hi, I have a question about the ${plan.name} memorial plan (${formatPrice(plan.price)} ${plan.currency} ${planPeriod(plan.billing, true)}).`
                                    : `Hola, tengo una consulta sobre el Plan ${plan.name} del memorial (${formatPrice(plan.price)} ${plan.currency} ${planPeriod(plan.billing)}).`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white"
                            >
                                <MessageCircle size={13} /> {en ? 'Questions? Write to us' : '¿Dudas? Escríbenos'}
                            </a>
                        </motion.div>
                    ))}
                </div>

                {/* Comparación */}
                <div className="mt-16">
                    <h3 className="text-center text-lg font-sans font-bold tracking-tight text-white mb-6">{p.compare_title}</h3>
                    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th scope="col" className="text-left font-semibold text-slate-400 text-xs uppercase tracking-wider px-5 py-4">{p.feature}</th>
                                    {plans.map(plan => (
                                        <th key={plan.key} scope="col" className={`px-4 py-4 text-center font-sans font-bold text-sm ${plan.highlight ? 'text-amber-300 bg-amber-500/5' : 'text-white'}`}>
                                            {plan.name}
                                            <div className="text-xs font-sans font-semibold text-slate-400 mt-0.5">
                                                {(plan.discount_percent || 0) > 0 && plan.original_price && (
                                                    <span className="line-through text-slate-600 mr-1.5">${formatPrice(plan.original_price)}</span>
                                                )}
                                                ${formatPrice(plan.price)} {plan.currency}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.label} className="border-b border-white/5 last:border-0">
                                        <th scope="row" className="text-left font-medium text-slate-300 px-5 py-3.5 text-xs sm:text-sm">{row.label}</th>
                                        {row.values.map((v, i) => (
                                            <td key={i} className={`px-4 py-3.5 text-center text-xs sm:text-sm ${plans[i]?.highlight ? 'bg-amber-500/5' : ''}`}>
                                                {renderValue(v, !!plans[i]?.highlight)}
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
