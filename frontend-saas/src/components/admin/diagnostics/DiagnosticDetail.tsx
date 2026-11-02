"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import {
    ArrowLeft, Building2, Download, Loader2, Mail, MessageCircle, Trash2, Sparkles, AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import {
    DIAG_API, STATUS_META, MODES, type DiagnosticFull, type DiagStatus,
    fmtPct, pctTone, TONE_HEX, clp, waLink, pdfFileName,
} from '@/lib/diagnostics';
import { buildDiagnosticPdf, downloadBlob } from '@/components/diagnostics/buildDiagnosticPdf';

const cardCls = 'bg-white/5 border border-white/10 rounded-2xl p-5';
const inputCls = 'bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60';
const btnCls = 'px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40';

export default function DiagnosticDetail({ id }: { id: string }) {
    const router = useRouter();
    const qc = useQueryClient();
    const { showToast } = useToast();
    const qrWrap = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState<'pdf' | 'send' | null>(null);
    const [notes, setNotes] = useState('');
    const [sendTo, setSendTo] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const key = ['admin', 'diagnostics', 'detail', id];
    const { data: d, isLoading, error } = useQuery<DiagnosticFull>({
        queryKey: key,
        queryFn: () => apiRequest(`${DIAG_API}/${id}`),
    });
    useEffect(() => {
        if (d) { setNotes(d.notes ?? ''); setSendTo(d.email ?? ''); }
    }, [d]);

    const patch = useMutation({
        mutationFn: (body: Record<string, unknown>) => apiRequest(`${DIAG_API}/${id}`, { method: 'PATCH', body }),
        onSuccess: (data: DiagnosticFull) => { qc.setQueryData(key, data); qc.invalidateQueries({ queryKey: ['admin', 'diagnostics'] }); showToast('Guardado', 'success'); },
        onError: (e: Error) => showToast(e.message, 'error'),
    });
    const remove = useMutation({
        mutationFn: () => apiRequest(`${DIAG_API}/${id}`, { method: 'DELETE' }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'diagnostics'] }); router.push('/dashboard/diagnosticos'); },
        onError: (e: Error) => showToast(e.message, 'error'),
    });

    if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (error || !d) return <p className="p-8 text-red-300">{(error as Error)?.message || 'No se encontró el diagnóstico'}</p>;
    if (!d.completed_at) {
        return (
            <div className="space-y-4">
                <Link href="/dashboard/diagnosticos" className="text-xs font-bold text-white/50 hover:text-white inline-flex items-center gap-1.5">
                    <ArrowLeft size={14} /> Diagnósticos
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{d.business_name}</h1>
                <div className={cardCls}>
                    <p className="text-amber-300 font-bold flex items-center gap-2"><AlertTriangle size={16} /> No terminó las preguntas</p>
                    <p className="text-sm text-white/60 mt-2">
                        Dejó su correo en la web el {new Date(d.created_at).toLocaleString('es-CL')}
                        {d.utm?.utm_source && ` (origen: ${d.utm.utm_source})`}, pero no completó el diagnóstico. Es un prospecto igual: escríbele a{' '}
                        {d.email ? <a href={`mailto:${d.email}`} className="text-primary hover:underline">{d.email}</a> : 'su correo'}.
                    </p>
                </div>
            </div>
        );
    }

    const qrDataUrl = () => qrWrap.current?.querySelector('canvas')?.toDataURL('image/png') ?? null;
    const makePdf = () => buildDiagnosticPdf(d, qrDataUrl());

    const download = async () => {
        setBusy('pdf');
        try {
            downloadBlob(await makePdf(), pdfFileName(d.business_name));
        } catch (e) {
            console.error(e);
            showToast('No se pudo generar el PDF', 'error');
        } finally {
            setBusy(null);
        }
    };
    const send = async () => {
        setBusy('send');
        try {
            const form = new FormData();
            form.append('pdf', await makePdf(), pdfFileName(d.business_name));
            if (sendTo.trim()) form.append('to', sendTo.trim());
            const r = await apiRequest(`${DIAG_API}/${id}/send`, { method: 'POST', body: form });
            showToast(`Informe enviado a ${r.sent_to}`, 'success');
            qc.invalidateQueries({ queryKey: ['admin', 'diagnostics'] });
        } catch (e) {
            showToast((e as Error).message || 'No se pudo enviar', 'error');
        } finally {
            setBusy(null);
        }
    };

    const tone = (p: number | null) => TONE_HEX[pctTone(p)];
    const scored = d.category_scores.filter(c => c.pct !== null);
    const weak = [...scored].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).filter(c => (c.pct ?? 0) < 100).slice(0, 3);
    const recs = d.answers.filter(a => a.recommendation);
    const firstName = (d.contact_name || '').split(' ')[0];
    const wa = waLink(d.phone,
        `Hola${firstName ? ` ${firstName}` : ''}, te comparto el resultado del Diagnóstico 360° de ${d.business_name}: ${fmtPct(d.total_pct)} (${d.level}). ` +
        `Tus principales oportunidades: ${weak.map(c => c.name).join(', ') || '—'}. Te envío el informe en PDF con las recomendaciones.`);
    const plan = d.suggested_plan;

    return (
        <div className="space-y-5">
            {/* Canvas oculto para el QR del PDF */}
            <div ref={qrWrap} className="hidden" aria-hidden><QRCodeCanvas value={d.cta_url} size={256} marginSize={1} /></div>

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <Link href="/dashboard/diagnosticos" className="text-xs font-bold text-white/50 hover:text-white inline-flex items-center gap-1.5">
                        <ArrowLeft size={14} /> Diagnósticos
                    </Link>
                    <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">{d.business_name}</h1>
                    <p className="text-white/50 text-sm mt-1">
                        {[[d.city, d.region].filter(Boolean).join(', '), d.contact_name, d.email, d.phone,
                            `${MODES.find(m => m.value === d.mode)?.label} (${d.mode} preguntas)`,
                            new Date(d.created_at).toLocaleDateString('es-CL')].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-xs text-white/50 flex flex-wrap gap-x-3 gap-y-1">
                        <span className={d.source === 'web' ? 'text-primary font-bold' : ''}>
                            {d.source === 'web' ? 'Se diagnosticó solo en la web' : 'Hecho desde el admin'}
                            {d.utm?.utm_source && ` · origen: ${d.utm.utm_source}`}
                        </span>
                        {d.public_url && <a href={d.public_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver su informe</a>}
                    </p>
                    {d.linked_tenant_id && (
                        <p className="mt-1 text-xs text-emerald-300 inline-flex items-center gap-1.5"><Building2 size={13} /> Ya tiene cuenta en Vinzer</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={download} disabled={!!busy} className={`${btnCls} bg-primary text-white hover:brightness-110`}>
                        {busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Descargar PDF
                    </button>
                    {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btnCls} bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25`}>
                            <MessageCircle size={15} /> WhatsApp
                        </a>
                    )}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
                <section className={`${cardCls} flex items-center gap-5`}>
                    <div className="text-center shrink-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Resultado</p>
                        <p className="text-5xl font-black mt-1" style={{ color: tone(d.total_pct) }}>{fmtPct(d.total_pct)}</p>
                    </div>
                    <div className="border-l border-white/10 pl-5">
                        <p className="text-white text-lg font-bold">{d.level ?? '—'}</p>
                        {d.level_message && <p className="text-sm text-white/60 mt-1">{d.level_message}</p>}
                        {d.is_partial && <p className="text-xs text-amber-300 mt-2 flex items-center gap-1"><AlertTriangle size={13} /> Diagnóstico parcial</p>}
                    </div>
                </section>

                <section className={cardCls}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5"><Sparkles size={13} /> Plan sugerido</p>
                    {plan ? (
                        <>
                            <p className="text-white text-xl font-black mt-1">
                                {d.plan_price?.name ?? plan.plan}
                                {d.plan_price && d.plan_price.price > 0 && <span className="text-sm text-white/60 font-bold"> · {clp(d.plan_price.price)}/mes</span>}
                            </p>
                            <p className="text-sm text-white/60 mt-1">{plan.reason}</p>
                            {plan.start_free && <p className="text-xs text-primary mt-2">Sugerir empezar gratis (FREE) y subir después.</p>}
                        </>
                    ) : <p className="text-white/50 text-sm mt-1">—</p>}
                </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <section className={cardCls}>
                    <h2 className="text-white font-bold mb-4">Resultado por área</h2>
                    <div className="space-y-2.5">
                        {d.category_scores.map(c => (
                            <div key={c.key} className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] sm:grid-cols-[13rem_1fr_3.5rem] gap-3 items-center">
                                <span className="text-sm text-white/70 truncate" title={c.name}>{c.name}</span>
                                <div className="h-2.5 rounded-full bg-white/5">
                                    {c.pct !== null && <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.pct)}%`, backgroundColor: tone(c.pct) }} />}
                                </div>
                                <span className="text-sm font-bold text-right" style={{ color: tone(c.pct) }}>{c.pct === null ? 'N/A' : fmtPct(c.pct)}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={`${cardCls} space-y-4`}>
                    <h2 className="text-white font-bold">Seguimiento comercial</h2>
                    <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(STATUS_META) as DiagStatus[]).map(s => (
                            <button key={s} type="button" onClick={() => patch.mutate({ status: s })} aria-pressed={d.status === s}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${d.status === s ? `${STATUS_META[s].cls} border-current` : 'border-white/10 text-white/50 hover:text-white'}`}>
                                {STATUS_META[s].label}
                            </button>
                        ))}
                    </div>
                    <div>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000}
                            placeholder="Notas internas (no salen en el informe)" className={`${inputCls} w-full`} />
                        {notes !== (d.notes ?? '') && (
                            <button type="button" onClick={() => patch.mutate({ notes })} className="mt-2 text-xs font-bold text-primary hover:underline">Guardar notas</button>
                        )}
                    </div>
                    <div className="border-t border-white/10 pt-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Enviar informe por correo</p>
                        <div className="flex gap-2">
                            <input type="email" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="correo@crematorio.cl" className={`${inputCls} flex-1 min-w-0`} />
                            <button type="button" onClick={send} disabled={!!busy || !sendTo.trim()} className={`${btnCls} bg-sky-500/20 text-sky-200 hover:bg-sky-500/30`}>
                                {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Enviar
                            </button>
                        </div>
                        {d.sent_at && <p className="text-[11px] text-white/40 mt-1.5">Último envío: {new Date(d.sent_at).toLocaleString('es-CL')}</p>}
                        {!d.consent && <p className="text-[11px] text-amber-300/80 mt-1.5">No marcó el consentimiento para comunicaciones comerciales.</p>}
                    </div>
                </section>
            </div>

            {recs.length > 0 && (
                <section className={cardCls}>
                    <h2 className="text-white font-bold mb-3">Recomendaciones ({recs.length})</h2>
                    <ul className="space-y-2.5">
                        {recs.map(a => (
                            <li key={a.question_id} className="text-sm">
                                <span className="text-white/80">{a.recommendation}</span>
                                {a.vinzer_feature && <span className="block text-xs text-primary mt-0.5">Vinzer: {a.vinzer_feature}</span>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className={`${cardCls} p-0 overflow-hidden`}>
                <h2 className="text-white font-bold px-5 pt-5 pb-3">Respuestas</h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                        <tbody>
                            {d.answers.map(a => (
                                <tr key={a.question_id} className="border-t border-white/5">
                                    <td className="px-5 py-3 text-sm text-white/80 align-top">
                                        {a.question}<span className="block text-[11px] text-white/40">{a.category_name}</span>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-white/60 align-top">{a.answer}</td>
                                    <td className="px-5 py-3 text-sm font-bold text-right align-top whitespace-nowrap" style={{ color: tone(a.pct) }}>{a.na ? 'N/A' : fmtPct(a.pct)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="flex justify-end">
                {confirmDelete ? (
                    <span className="flex items-center gap-2 text-sm text-white/60">
                        ¿Eliminar este diagnóstico?
                        <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className={`${btnCls} bg-red-500/20 text-red-300 hover:bg-red-500/30`}>Eliminar</button>
                        <button type="button" onClick={() => setConfirmDelete(false)} className={`${btnCls} text-white/50 hover:bg-white/5`}>Cancelar</button>
                    </span>
                ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} className={`${btnCls} text-white/40 hover:text-red-300`}><Trash2 size={15} /> Eliminar diagnóstico</button>
                )}
            </div>
        </div>
    );
}
