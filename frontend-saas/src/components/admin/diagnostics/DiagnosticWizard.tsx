"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, HelpCircle, Loader2, Check } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { DIAG_API, MODES, type DiagMode, type QuestionsResponse, type DiagnosticFull } from '@/lib/diagnostics';

const DRAFT_KEY = 'vz_diag_draft';
const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5';

interface Prospect {
    business_name: string; contact_name: string; city: string; region: string;
    email: string; phone: string; website: string; monthly_cremations: string; consent: boolean;
}
type Answer = number | 'na';
interface Draft { prospect: Prospect; mode: DiagMode; answers: Record<string, Answer>; step: number }

const EMPTY: Prospect = {
    business_name: '', contact_name: '', city: '', region: '', email: '', phone: '', website: '',
    monthly_cremations: '', consent: false,
};

function loadDraft(): Draft | null {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export default function DiagnosticWizard() {
    const router = useRouter();
    const { showToast } = useToast();
    const [prospect, setProspect] = useState<Prospect>(EMPTY);
    const [mode, setMode] = useState<DiagMode>(15);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [step, setStep] = useState(0); // 0 = datos; 1..N = preguntas
    const [showHelp, setShowHelp] = useState(false);
    const [restored, setRestored] = useState(false);

    // Borrador local: una llamada interrumpida no pierde lo respondido
    useEffect(() => {
        const d = loadDraft();
        if (d) {
            setProspect({ ...EMPTY, ...d.prospect });
            setMode(d.mode);
            setAnswers(d.answers || {});
            setStep(d.step || 0);
        }
        setRestored(true);
    }, []);
    useEffect(() => {
        if (!restored) return;
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ prospect, mode, answers, step })); } catch { /* storage bloqueado */ }
    }, [prospect, mode, answers, step, restored]);

    const { data, isLoading } = useQuery<QuestionsResponse>({
        queryKey: ['admin', 'diagnostics', 'questions', mode],
        queryFn: () => apiRequest(`${DIAG_API}/questions?mode=${mode}`),
    });
    const questions = useMemo(() => data?.questions ?? [], [data]);
    const total = questions.length;
    const current = step > 0 ? questions[step - 1] : null;
    const answeredCount = questions.filter(q => answers[q.id] !== undefined).length;
    // Un borrador viejo puede apuntar a una pregunta que ya no existe
    useEffect(() => { if (data && step > total) setStep(total); }, [data, step, total]);

    const submit = useMutation({
        mutationFn: () => apiRequest(DIAG_API, {
            method: 'POST',
            body: {
                business_name: prospect.business_name.trim(),
                contact_name: prospect.contact_name.trim(),
                city: prospect.city.trim(),
                region: prospect.region.trim() || null,
                email: prospect.email.trim() || null,
                phone: prospect.phone.trim() || null,
                website: prospect.website.trim() || null,
                monthly_cremations: prospect.monthly_cremations ? Number(prospect.monthly_cremations) : null,
                consent: prospect.consent,
                mode,
                answers: Object.fromEntries(questions.map(q => [String(q.id), answers[q.id]])),
            },
        }),
        onSuccess: (d: DiagnosticFull) => {
            try { localStorage.removeItem(DRAFT_KEY); } catch { /* idem */ }
            router.push(`/dashboard/diagnosticos/${d.id}`);
        },
        onError: (e: Error) => showToast(e.message, 'error'),
    });

    const set = (k: keyof Prospect, v: string | boolean) => setProspect(p => ({ ...p, [k]: v }));
    const prospectValid = prospect.business_name.trim().length >= 2 && prospect.contact_name.trim().length >= 2
        && prospect.city.trim().length >= 2 && (!prospect.email || /^\S+@\S+\.\S+$/.test(prospect.email.trim()));

    const choose = (value: Answer) => {
        if (!current) return;
        setAnswers(a => ({ ...a, [current.id]: value }));
        setShowHelp(false);
        if (step < total) setTimeout(() => setStep(s => Math.min(s + 1, total)), 220);
    };
    const reset = () => {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* idem */ }
        setProspect(EMPTY); setAnswers({}); setStep(0);
    };

    // ---- Paso 0: datos del crematorio y modalidad ----
    if (step === 0) {
        return (
            <div className="space-y-6">
                <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
                    <h2 className="text-white font-bold">Datos del crematorio</h2>
                    <div className="mt-4 grid sm:grid-cols-2 gap-4">
                        <div><label className={labelCls}>Nombre del crematorio *</label><input value={prospect.business_name} onChange={e => set('business_name', e.target.value)} maxLength={150} className={inputCls} /></div>
                        <div><label className={labelCls}>Persona de contacto *</label><input value={prospect.contact_name} onChange={e => set('contact_name', e.target.value)} maxLength={120} className={inputCls} /></div>
                        <div><label className={labelCls}>Ciudad *</label><input value={prospect.city} onChange={e => set('city', e.target.value)} maxLength={80} className={inputCls} /></div>
                        <div><label className={labelCls}>Región</label><input value={prospect.region} onChange={e => set('region', e.target.value)} maxLength={80} className={inputCls} /></div>
                        <div><label className={labelCls}>Correo</label><input type="email" value={prospect.email} onChange={e => set('email', e.target.value)} maxLength={150} className={inputCls} /></div>
                        <div><label className={labelCls}>WhatsApp / teléfono</label><input value={prospect.phone} onChange={e => set('phone', e.target.value)} maxLength={40} className={inputCls} /></div>
                        <div><label className={labelCls}>Sitio web o Instagram</label><input value={prospect.website} onChange={e => set('website', e.target.value)} maxLength={200} className={inputCls} /></div>
                        <div><label className={labelCls}>Cremaciones aprox. al mes</label><input type="number" min={0} value={prospect.monthly_cremations} onChange={e => set('monthly_cremations', e.target.value)} className={inputCls} /></div>
                    </div>
                    <label className="mt-4 flex items-start gap-2 text-sm text-white/70">
                        <input type="checkbox" checked={prospect.consent} onChange={e => set('consent', e.target.checked)} className="accent-primary mt-0.5" />
                        Acepta recibir el informe y comunicaciones comerciales de Vinzer.
                    </label>
                </section>

                <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
                    <h2 className="text-white font-bold">Modalidad</h2>
                    <div className="mt-4 grid sm:grid-cols-3 gap-3" role="radiogroup">
                        {MODES.map(m => (
                            <button key={m.value} type="button" role="radio" aria-checked={mode === m.value}
                                onClick={() => { setMode(m.value); setAnswers({}); }}
                                className={`text-left rounded-2xl border p-4 transition-colors ${mode === m.value ? 'border-primary bg-primary/15' : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'}`}>
                                <p className="text-white font-bold">{m.label}</p>
                                <p className="text-xs text-white/50 mt-1">{m.value} preguntas · ~{m.minutes} min</p>
                            </button>
                        ))}
                    </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={reset} className="text-xs font-bold text-white/40 hover:text-white">Empezar de cero</button>
                    <button type="button" disabled={!prospectValid || isLoading || total === 0} onClick={() => setStep(1)}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 disabled:opacity-40 flex items-center gap-2">
                        {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                        {answeredCount > 0 ? 'Continuar' : 'Comenzar'} <ArrowRight size={15} />
                    </button>
                </div>
            </div>
        );
    }

    // ---- Preguntas ----
    if (!current) return null;
    const chosen = answers[current.id];
    const isLast = step === total;
    const allAnswered = answeredCount === total;

    return (
        <div className="space-y-5">
            <div>
                <div className="flex justify-between text-xs text-white/50 mb-2">
                    <span>{current.category_name}</span>
                    <span>Pregunta {step} de {total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} />
                </div>
            </div>

            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-7">
                <div className="flex items-start gap-3">
                    <h2 className="flex-1 text-lg sm:text-xl font-bold text-white leading-snug">{current.text}</h2>
                    {current.help && (
                        <button type="button" onClick={() => setShowHelp(v => !v)} aria-expanded={showHelp} aria-label="¿Qué significa esta pregunta?"
                            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${showHelp ? 'bg-primary/20 border-primary/60 text-white' : 'border-white/15 text-white/50 hover:text-white'}`}>
                            <HelpCircle size={18} />
                        </button>
                    )}
                </div>
                {showHelp && current.help && (
                    <p className="mt-3 text-sm text-white/70 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">{current.help}</p>
                )}

                <div className="mt-5 space-y-2.5" role="radiogroup">
                    {current.options.map((o, i) => (
                        <button key={i} type="button" role="radio" aria-checked={chosen === i} onClick={() => choose(i)}
                            className={`w-full text-left rounded-xl border px-4 py-3 text-sm flex items-center gap-3 transition-colors ${chosen === i ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.07]'}`}>
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${chosen === i ? 'border-primary bg-primary' : 'border-white/30'}`}>
                                {chosen === i && <Check size={12} className="text-white" />}
                            </span>
                            <span className="flex-1">{o.text}</span>
                        </button>
                    ))}
                    {current.allows_na && (
                        <button type="button" role="radio" aria-checked={chosen === 'na'} onClick={() => choose('na')}
                            className={`w-full text-left rounded-xl border border-dashed px-4 py-2.5 text-sm ${chosen === 'na' ? 'border-primary bg-primary/10 text-white' : 'border-white/15 text-white/50 hover:text-white'}`}>
                            No aplica a este crematorio
                        </button>
                    )}
                </div>
            </section>

            <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => { setShowHelp(false); setStep(s => s - 1); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:bg-white/5 flex items-center gap-2">
                    <ArrowLeft size={15} /> {step === 1 ? 'Datos' : 'Anterior'}
                </button>
                {isLast || allAnswered ? (
                    <button type="button" disabled={!allAnswered || submit.isPending} onClick={() => submit.mutate()}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 disabled:opacity-40 flex items-center gap-2">
                        {submit.isPending && <Loader2 size={15} className="animate-spin" />}
                        {allAnswered ? 'Ver resultado' : `Faltan ${total - answeredCount}`}
                    </button>
                ) : (
                    <button type="button" disabled={chosen === undefined} onClick={() => setStep(s => s + 1)}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/70 hover:bg-white/5 disabled:opacity-30 flex items-center gap-2">
                        Siguiente <ArrowRight size={15} />
                    </button>
                )}
            </div>
        </div>
    );
}
