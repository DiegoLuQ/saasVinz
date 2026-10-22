"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown, HelpCircle, LifeBuoy, Mail, MessageCircle, Search, X } from 'lucide-react';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useFeatures } from '@/hooks/useFeatures';
import { featureForPath, moduleForPath } from '@/lib/tenant/moduleRoutes';
import { usePlatformInfo, whatsappLink } from '@/lib/platformInfo';
import { FAQ_CATEGORIES, FAQS, GUIDES, type Faq, type FaqCategory, type HelpLink } from '@/lib/tenant/helpContent';

const cardCls = 'rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]';

/** Normaliza para buscar sin tildes ni mayúsculas. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function GoLink({ item }: { item: HelpLink }) {
    if (!item.href || !item.linkText) return null;
    return (
        <Link href={item.href} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            {item.linkText} <ArrowRight size={13} />
        </Link>
    );
}

function FaqItem({ faq, open, onToggle, showCategory }: { faq: Faq; open: boolean; onToggle: () => void; showCategory?: boolean }) {
    return (
        <div className={`${cardCls} overflow-hidden`}>
            <button type="button" onClick={onToggle} aria-expanded={open}
                className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition">
                <span className="min-w-0">
                    {showCategory && (
                        <span className="block text-[10px] font-black uppercase tracking-wider text-primary mb-1">{faq.category}</span>
                    )}
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{faq.q}</span>
                </span>
                <ChevronDown size={18} className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${open ? 'rotate-180 text-primary' : ''}`} />
            </button>
            {open && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 border-t border-slate-100 dark:border-white/5 pt-3">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{faq.a}</p>
                    <GoLink item={faq} />
                </div>
            )}
        </div>
    );
}

export default function AyudaPage() {
    const { data } = useSessionBootstrap();
    const { hasFeature } = useFeatures();
    // Canales de soporte: Configuración Global → Datos del SaaS (WhatsApp y correo).
    const platform = usePlatformInfo();
    const [query, setQuery] = useState('');
    const [guideId, setGuideId] = useState(GUIDES[0].id);
    const [category, setCategory] = useState<FaqCategory | 'all'>('all');
    const [openFaq, setOpenFaq] = useState<string | null>(null);

    const activeModules = useMemo(
        () => data?.rbac.modules.filter(m => m.is_active).map(m => m.module_key) ?? [],
        [data],
    );

    // Solo lo que este usuario puede abrir: módulo de su rol + características del plan.
    const applies = (item: HelpLink) => {
        if (!data) return true;
        const path = (item.href || item.checkPath || '').split('?')[0];
        if (path) {
            const mod = moduleForPath(path);
            if (mod && !activeModules.includes(mod)) return false;
            const feat = featureForPath(path);
            if (feat && !hasFeature(feat, true)) return false;
        }
        return !item.feature || hasFeature(item.feature, true);
    };

    const guides = GUIDES.map(g => ({ ...g, steps: g.steps.filter(applies) })).filter(g => g.steps.length > 0);
    const guide = guides.find(g => g.id === guideId) ?? guides[0];
    const faqs = FAQS.filter(applies);
    const categories = FAQ_CATEGORIES.filter(c => faqs.some(f => f.category === c));

    const q = norm(query.trim());
    const searching = q.length > 0;
    const faqResults = searching ? faqs.filter(f => norm(`${f.q} ${f.a} ${f.category}`).includes(q)) : [];
    const stepResults = searching
        ? guides.flatMap(g => g.steps.filter(s => norm(`${s.title} ${s.desc}`).includes(q)).map(s => ({ guide: g.title, step: s })))
        : [];
    const shownFaqs = category === 'all' ? faqs : faqs.filter(f => f.category === category);

    const tenantName = data?.tenant?.name;
    const supportWa = whatsappLink(platform.whatsapp, `Hola, necesito ayuda con ${platform.name}${tenantName ? ` (crematorio ${tenantName})` : ''}.`);
    const supportEmail = platform.correo?.trim() || null;

    return (
        <div className="space-y-8 pb-12 max-w-6xl mx-auto">
            {/* Encabezado + búsqueda */}
            <div className={`${cardCls} p-6 sm:p-10 bg-gradient-to-br from-primary/10 via-white to-white dark:from-primary/15 dark:via-transparent dark:to-transparent`}>
                <div className="max-w-3xl space-y-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
                        <LifeBuoy size={14} /> Centro de Ayuda
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">¿Cómo usar Vinzer?</h1>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                        El flujo de trabajo paso a paso, respuestas a las dudas frecuentes y contacto con soporte.
                        Solo ves lo que corresponde a tu plan y a tus permisos.
                    </p>
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text" role="searchbox" value={query} onChange={(e) => setQuery(e.target.value)}
                            placeholder="Busca un tema: créditos, certificado, formulario, seguimiento…"
                            className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-primary dark:border-white/10 dark:bg-black/20 dark:text-white"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {searching ? (
                /* Resultados de búsqueda (guía + preguntas) */
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {faqResults.length + stepResults.length} resultado{faqResults.length + stepResults.length === 1 ? '' : 's'} para «{query.trim()}»
                    </h2>
                    {stepResults.map(({ guide: g, step }) => (
                        <div key={`${g}-${step.title}`} className={`${cardCls} p-4 sm:p-5 space-y-2`}>
                            <p className="text-[10px] font-black uppercase tracking-wider text-primary">Guía · {g}</p>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{step.title}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step.desc}</p>
                            <GoLink item={step} />
                        </div>
                    ))}
                    {faqResults.map(f => (
                        <FaqItem key={f.q} faq={f} showCategory open={openFaq === f.q} onToggle={() => setOpenFaq(openFaq === f.q ? null : f.q)} />
                    ))}
                    {faqResults.length + stepResults.length === 0 && (
                        <div className={`${cardCls} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>
                            No encontramos nada sobre «{query.trim()}». Prueba con otra palabra o escríbenos a soporte (abajo).
                        </div>
                    )}
                </section>
            ) : (
                <>
                    {/* Guía paso a paso */}
                    {guide && (
                        <section className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <BookOpen size={20} className="text-primary" /> Paso a paso
                                </h2>
                                {guides.length > 1 && (
                                    <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 w-full sm:w-auto">
                                        {guides.map(g => (
                                            <button key={g.id} type="button" onClick={() => setGuideId(g.id)}
                                                className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-bold transition ${guide.id === g.id ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                                {g.title}
                                                {g.badge && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] uppercase">{g.badge}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{guide.intro}</p>
                            <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {guide.steps.map((step, i) => (
                                    <li key={step.title} className={`${cardCls} p-5 flex flex-col gap-3`}>
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-black">{i + 1}</span>
                                            <h3 className="font-bold text-slate-900 dark:text-white leading-snug">{step.title}</h3>
                                        </div>
                                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 flex-1">{step.desc}</p>
                                        {step.href && <div className="pt-3 border-t border-slate-100 dark:border-white/5"><GoLink item={step} /></div>}
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {/* Preguntas frecuentes */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <HelpCircle size={20} className="text-primary" /> Preguntas frecuentes
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {(['all', ...categories] as const).map(c => (
                                <button key={c} type="button" onClick={() => { setCategory(c); setOpenFaq(null); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${category === c ? 'bg-primary text-white border-primary' : 'border-slate-300 text-slate-600 hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300'}`}>
                                    {c === 'all' ? `Todas (${faqs.length})` : c}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-2.5">
                            {shownFaqs.map(f => (
                                <FaqItem key={f.q} faq={f} showCategory={category === 'all'}
                                    open={openFaq === f.q} onToggle={() => setOpenFaq(openFaq === f.q ? null : f.q)} />
                            ))}
                        </div>
                    </section>
                </>
            )}

            {/* Soporte */}
            {(supportWa || supportEmail) && (
            <section className={`${cardCls} p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">¿No encontraste lo que buscabas?</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Escríbele al equipo de {platform.name} y te ayudamos.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    {supportWa && (
                        <a href={supportWa} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5b] text-white text-sm font-bold">
                            <MessageCircle size={17} /> WhatsApp
                        </a>
                    )}
                    {supportEmail && (
                        <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Ayuda ${platform.name}${tenantName ? ` · ${tenantName}` : ''}`)}`}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10 text-sm font-bold">
                            <Mail size={17} /> {supportEmail}
                        </a>
                    )}
                </div>
            </section>
            )}
        </div>
    );
}
