'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { BadgePercent, Download, Loader2, MessageCircle, Sparkles, TrendingUp, Target, ArrowRight, AlertTriangle } from 'lucide-react';
import DiagnosticoHeader from './DiagnosticoHeader';
import { buildDiagnosticPdf, downloadBlob } from '@/components/diagnostics/buildDiagnosticPdf';
import {
    PUBLIC_DIAG_API, type DiagnosticReport, fmtPct, pctTone, TONE_HEX, clp, promoPrice, waLink, pdfFileName,
} from '@/lib/diagnostics';

const card = 'bg-white/[0.03] border border-white/10 rounded-3xl p-5 sm:p-7';

/** Informe del Diagnóstico 360° que ve el crematorio (enlace privado /diagnostico/informe/<token>). */
export default function DiagnosticReportClient({ token }: { token: string }) {
    const [d, setD] = useState<DiagnosticReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pdfBusy, setPdfBusy] = useState(false);
    const qrWrap = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(`${PUBLIC_DIAG_API}/${encodeURIComponent(token)}`)
            .then(async r => {
                if (!r.ok) throw new Error(r.status === 409 ? 'Este diagnóstico aún no está terminado.' : 'No encontramos este diagnóstico.');
                return r.json();
            })
            .then(setD)
            .catch(e => setError(e.message));
    }, [token]);

    const shell = (children: React.ReactNode) => (
        <div className="min-h-screen bg-[#020210] text-white font-sans antialiased relative overflow-x-clip">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none" aria-hidden>
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#19B5FE]/10 blur-[150px] rounded-full" />
                <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 blur-[170px] rounded-full" />
            </div>
            <DiagnosticoHeader />
            <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">{children}</main>
        </div>
    );

    if (error) {
        return shell(
            <div className={`${card} text-center py-14`}>
                <p className="text-lg font-bold">{error}</p>
                <Link href="/diagnostico" className="inline-flex mt-4 text-[#19B5FE] font-bold hover:underline">Hacer el diagnóstico</Link>
            </div>,
        );
    }
    if (!d) return shell(<div className="py-24 flex justify-center"><Loader2 className="animate-spin text-[#19B5FE]" size={30} /></div>);

    const tone = (p: number | null) => TONE_HEX[pctTone(p)];
    const scored = d.category_scores.filter(c => c.pct !== null);
    const strengths = [...scored].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 3);
    const weak = [...scored].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).filter(c => (c.pct ?? 0) < 100).slice(0, 3);
    const recGroups = d.category_scores
        .map(c => ({ cat: c, items: d.answers.filter(a => a.category_key === c.key && a.recommendation) }))
        .filter(g => g.items.length > 0);

    const plan = d.suggested_plan;
    const planName = d.plan_price?.name ?? plan?.plan ?? '';
    const price = d.plan_price?.price ?? 0;
    const promo = d.promo_pct > 0 ? d.promo_pct : 0;
    const wa = waLink(d.sales_whatsapp,
        `Hola, hice el Diagnóstico 360° de ${d.business_name} (${fmtPct(d.total_pct)}) y quiero ${promo ? `aprovechar el ${promo} % de descuento en` : 'conocer'} el plan ${planName} de Vinzer.`);
    const waSimpler = plan?.needs_plan
        ? waLink(d.sales_whatsapp, `Hola, hice el Diagnóstico 360° de ${d.business_name} y quiero saber si me sirve partir con el plan ${plan.needs_plan}.`)
        : null;
    const waQuestion = waLink(d.sales_whatsapp, `Hola, hice el Diagnóstico 360° de ${d.business_name} y tengo una consulta sobre Vinzer.`);

    const downloadPdf = async () => {
        setPdfBusy(true);
        try {
            const qr = qrWrap.current?.querySelector('canvas')?.toDataURL('image/png') ?? null;
            downloadBlob(await buildDiagnosticPdf(d, qr), pdfFileName(d.business_name));
        } finally {
            setPdfBusy(false);
        }
    };

    const WhatsAppButton = ({ big = false }: { big?: boolean }) => wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[#04210f] font-black hover:brightness-110 transition ${big ? 'px-6 py-4 text-base' : 'px-5 py-3 text-sm'}`}>
            <MessageCircle size={big ? 20 : 17} /> {promo ? `Quiero mi ${promo} % de descuento` : 'Hablar por WhatsApp'}
        </a>
    ) : (
        <a href={d.cta_url} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#19B5FE] text-[#020210] font-black hover:brightness-110 ${big ? 'px-6 py-4 text-base' : 'px-5 py-3 text-sm'}`}>
            Conocer Vinzer <ArrowRight size={17} />
        </a>
    );

    return shell(
        <>
            <div ref={qrWrap} className="hidden" aria-hidden><QRCodeCanvas value={d.cta_url} size={256} marginSize={1} /></div>

            {/* Resultado */}
            <section className={`${card} grid sm:grid-cols-[auto_1fr] gap-6 items-center`}>
                <div className="text-center sm:pr-6 sm:border-r border-white/10">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Resultado general</p>
                    <p className="text-6xl sm:text-7xl font-black mt-1" style={{ color: tone(d.total_pct) }}>{fmtPct(d.total_pct)}</p>
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#19B5FE]">Diagnóstico 360° · {d.business_name}</p>
                    <h1 className="text-2xl sm:text-3xl font-black mt-1">{d.level ?? '—'}</h1>
                    {d.level_message && <p className="text-slate-300 mt-2 leading-relaxed">{d.level_message}</p>}
                    {d.is_partial && <p className="text-xs text-amber-300 mt-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Diagnóstico parcial: varias preguntas no aplicaban.</p>}
                    <button type="button" onClick={downloadPdf} disabled={pdfBusy}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-sm font-bold text-slate-200 hover:bg-white/5 disabled:opacity-50">
                        {pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Descargar informe PDF
                    </button>
                </div>
            </section>

            {/* Oferta */}
            {plan && (
                <section className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-[#19B5FE]/10 to-transparent p-5 sm:p-8">
                    {promo > 0 && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400 text-[#04210f] text-xs font-black uppercase tracking-wider">
                            <BadgePercent size={14} /> {promo} % de descuento{d.promo_text ? ` · ${d.promo_text}` : ''}
                        </span>
                    )}
                    <div className="mt-4 grid lg:grid-cols-[1fr_auto] gap-6 items-end">
                        <div>
                            <p className="text-sm text-slate-300 flex items-center gap-1.5"><Sparkles size={15} className="text-emerald-300" /> Según tu resultado, te recomendamos</p>
                            <h2 className="text-3xl sm:text-4xl font-black mt-1">Plan {planName}</h2>
                            {price > 0 && (
                                <p className="mt-2 flex items-baseline gap-3 flex-wrap">
                                    {promo > 0 && <span className="text-slate-400 line-through text-lg">{clp(price)}</span>}
                                    <span className="text-3xl font-black text-emerald-300">{clp(promo ? promoPrice(price, promo) : price)}</span>
                                    <span className="text-slate-400 text-sm">al mes</span>
                                </p>
                            )}
                            <p className="text-slate-300 mt-2 max-w-xl">{plan.reason}</p>
                            {plan.by_volume && plan.needs_plan && waSimpler && (
                                <p className="text-sm text-slate-400 mt-2">
                                    ¿Prefieres partir más simple?{' '}
                                    <a href={waSimpler} target="_blank" rel="noopener noreferrer" className="text-[#19B5FE] font-bold hover:underline">Pregúntanos por {plan.needs_plan}</a>.
                                </p>
                            )}
                            {plan.start_free && (
                                <p className="text-sm text-slate-400 mt-2">
                                    ¿Prefieres partir de a poco? <a href={d.cta_url} className="text-[#19B5FE] font-bold hover:underline">Crea tu cuenta gratis</a> y sube de plan cuando lo necesites.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 lg:items-end">
                            <WhatsAppButton big />
                            <p className="text-[11px] text-slate-400">Te respondemos por WhatsApp y te ayudamos a empezar.</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Por área */}
            <section className={card}>
                <h2 className="text-lg font-black">Tu resultado por área</h2>
                <div className="mt-5 space-y-3">
                    {d.category_scores.map(c => (
                        <div key={c.key} className="grid grid-cols-[minmax(0,9rem)_1fr_3.2rem] sm:grid-cols-[14rem_1fr_3.5rem] gap-3 items-center">
                            <span className="text-sm text-slate-300 truncate" title={c.name}>{c.name}</span>
                            <div className="h-3 rounded-full bg-white/5">
                                {c.pct !== null && <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, c.pct)}%`, backgroundColor: tone(c.pct) }} />}
                            </div>
                            <span className="text-sm font-black text-right" style={{ color: tone(c.pct) }}>{c.pct === null ? 'N/A' : fmtPct(c.pct)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                        <p className="text-sm font-black text-emerald-300 flex items-center gap-2"><TrendingUp size={16} /> Tus fortalezas</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-300">{strengths.map(c => <li key={c.key}>{c.name} · {fmtPct(c.pct)}</li>)}</ul>
                    </div>
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
                        <p className="text-sm font-black text-red-300 flex items-center gap-2"><Target size={16} /> Oportunidades de mejora</p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-300">
                            {weak.length ? weak.map(c => <li key={c.key}>{c.name} · {fmtPct(c.pct)}</li>) : <li>Todas tus áreas están al máximo.</li>}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Recomendaciones */}
            {recGroups.length > 0 && (
                <section className={card}>
                    <h2 className="text-lg font-black">Qué te recomendamos</h2>
                    <div className="mt-4 space-y-5">
                        {recGroups.map(g => (
                            <div key={g.cat.key}>
                                <p className="text-sm font-bold" style={{ color: tone(g.cat.pct) }}>{g.cat.name} · {fmtPct(g.cat.pct)}</p>
                                <ul className="mt-2 space-y-2">
                                    {g.items.map(a => (
                                        <li key={a.question_id} className="text-sm text-slate-200 pl-4 border-l-2 border-white/10">
                                            {a.recommendation}
                                            {a.vinzer_feature && <span className="block text-xs text-[#19B5FE] mt-0.5">Con Vinzer: {a.vinzer_feature}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Cierre */}
            <section className="rounded-3xl bg-[#19B5FE]/10 border border-[#19B5FE]/25 p-6 sm:p-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-black">Mejora tu resultado con Vinzer</h2>
                <p className="text-slate-300 mt-2 max-w-2xl mx-auto">
                    Órdenes, seguimiento en línea para las familias, certificados con tu marca y catálogo de planes, en un solo lugar.
                    {promo > 0 && <> Por ser de los primeros, tienes <strong className="text-emerald-300">{promo} % de descuento</strong>.</>}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <WhatsAppButton big />
                    <button type="button" onClick={downloadPdf} disabled={pdfBusy}
                        className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/15 font-bold hover:bg-white/5 disabled:opacity-50">
                        {pdfBusy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Descargar PDF
                    </button>
                </div>
                {waQuestion && wa && (
                    <a href={waQuestion} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-xs text-slate-400 hover:text-white underline">
                        Solo tengo una consulta
                    </a>
                )}
            </section>
        </>,
    );
}
