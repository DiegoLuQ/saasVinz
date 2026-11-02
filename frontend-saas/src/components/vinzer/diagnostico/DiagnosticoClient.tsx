'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import {
    ArrowLeft, ArrowRight, Building2, Mail, Loader2, HelpCircle, Check, Gauge, ListChecks, FileText, Clock, AlertCircle, BadgePercent,
} from 'lucide-react';
import DiagnosticoHeader from './DiagnosticoHeader';
import { cleanEmail, emailError, cleanName } from '@/lib/vinzer/signupFields';
import { PUBLIC_DIAG_API, MODES, type DiagMode, type PublicDiagConfig } from '@/lib/diagnostics';
import { DIAG_AREAS, DIAG_FAQS, DIAG_STEPS } from '@/lib/vinzer/diagnosticoContent';

const DRAFT_KEY = 'vz_diag_public';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'];
const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#19B5FE]/60 focus:ring-4 focus:ring-[#19B5FE]/10 transition-all';

type Answer = number | 'na';
interface Draft { token: string; business: string; mode: DiagMode; answers: Record<string, Answer>; step: number }

const PERKS = [
    { icon: Gauge, text: 'Tu puntaje por área: gestión, trazabilidad, marca, Google, redes y más' },
    { icon: ListChecks, text: 'Recomendaciones concretas para lo que hoy te falta' },
    { icon: FileText, text: 'Informe en PDF para revisarlo con tu equipo' },
];

function readDraft(): Draft | null {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
function writeDraft(d: Draft | null) {
    try {
        if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
        else localStorage.removeItem(DRAFT_KEY);
    } catch { /* storage bloqueado */ }
}

/** Landing del Diagnóstico 360° (vinzer.cl/diagnostico): nombre + correo y a las preguntas. */
export default function DiagnosticoClient() {
    const router = useRouter();
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [config, setConfig] = useState<PublicDiagConfig | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [business, setBusiness] = useState('');
    const [email, setEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [mode, setMode] = useState<DiagMode | null>(null);
    const [monthly, setMonthly] = useState<number | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, Answer>>({});
    const [step, setStep] = useState(0); // 0 = portada; 1..N = preguntas
    const [showHelp, setShowHelp] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(PUBLIC_DIAG_API).then(r => (r.ok ? r.json() : Promise.reject())).then((c: PublicDiagConfig) => {
            setConfig(c);
            setMode(m => m ?? c.mode);
        }).catch(() => setLoadError(true));
        // Retoma un diagnóstico a medias (recargó o volvió más tarde)
        const d = readDraft();
        if (d?.token && d.mode) {
            setToken(d.token); setBusiness(d.business); setMode(d.mode); setAnswers(d.answers || {}); setStep(d.step || 1);
        }
    }, []);
    useEffect(() => {
        if (token && mode) writeDraft({ token, business, mode, answers, step });
    }, [token, business, mode, answers, step]);

    const modeOptions = useMemo(
        () => MODES.flatMap(m => {
            const count = config?.modes.find(x => x.value === m.value)?.count;
            return count ? [{ ...m, count }] : [];
        }),
        [config],
    );
    const questions = useMemo(() => (config && mode ? config.questions.filter(q => q.modes.includes(mode)) : []), [config, mode]);
    const total = questions.length;
    useEffect(() => { if (config && step > total) setStep(total); }, [config, step, total]);
    const answered = questions.filter(q => answers[q.id] !== undefined).length;
    const current = step > 0 ? questions[step - 1] : null;
    const emailMsg = emailError(email);
    const needsVolume = !!config?.volume_ranges.length;
    const canStart = business.trim().length >= 2 && !emailMsg && !!config && !!mode && (!needsVolume || !!monthly);

    const start = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailTouched(true);
        if (needsVolume && !monthly) { setError('Indica cuántas cremaciones haces al mes.'); return; }
        if (!canStart) return;
        setBusy(true); setError(null);
        try {
            const params = new URLSearchParams(window.location.search);
            const utm = Object.fromEntries(UTM_KEYS.map(k => [k, params.get(k)]).filter(([, v]) => v));
            const recaptcha = executeRecaptcha ? await executeRecaptcha('diagnostic').catch(() => '') : '';
            const r = await fetch(`${PUBLIC_DIAG_API}/start`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ business_name: business.trim(), email: email.trim(), recaptcha_token: recaptcha, utm, mode, monthly_cremations: monthly }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No pudimos iniciar el diagnóstico. Inténtalo de nuevo.');
            setToken(data.token);
            setStep(1);
            window.scrollTo({ top: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos iniciar el diagnóstico.');
        } finally {
            setBusy(false);
        }
    };

    const finish = async (final: Record<string, Answer>) => {
        if (!token) return;
        setBusy(true); setError(null);
        try {
            const r = await fetch(`${PUBLIC_DIAG_API}/${encodeURIComponent(token)}/answers`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: final }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No pudimos calcular tu resultado.');
            writeDraft(null);
            router.push(`/diagnostico/informe/${token}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos calcular tu resultado.');
            setBusy(false);
        }
    };

    const choose = (value: Answer) => {
        if (!current || busy) return;
        const next: Record<string, Answer> = { ...answers, [current.id]: value };
        setAnswers(next);
        setShowHelp(false);
        if (step < total) setTimeout(() => setStep(s => Math.min(s + 1, total)), 220);
        else if (questions.every(q => next[q.id] !== undefined)) finish(next);
    };

    const restart = () => { writeDraft(null); setToken(null); setAnswers({}); setStep(0); };

    return (
        <div className="min-h-screen bg-[#020210] text-white font-sans antialiased relative overflow-x-clip">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none" aria-hidden>
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#19B5FE]/10 blur-[150px] rounded-full" />
                <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 blur-[170px] rounded-full" />
            </div>

            <DiagnosticoHeader
                right={step > 0 && token ? <span className="text-xs text-slate-400 truncate max-w-[40%]">{business}</span> : undefined}
            />

            {step === 0 ? (
                <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
                    <section className="space-y-6">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#19B5FE]/10 border border-[#19B5FE]/25 text-[#7dd3fc] text-[11px] font-bold uppercase tracking-wider">
                            <Clock size={12} /> Gratis · 10, 15 o 20 preguntas · desde 3 minutos
                        </span>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                            ¿Qué tan optimizado está tu <span className="text-[#19B5FE]">crematorio de mascotas</span>?
                        </h1>
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg">
                            Haz el Diagnóstico 360° y descubre al instante qué tienes bien y qué te falta para atender mejor a las familias y conseguir más servicios.
                        </p>
                        <ul className="space-y-3">
                            {PERKS.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                                    <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><Icon size={16} className="text-[#19B5FE]" /></span>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl">
                        <form onSubmit={start} className="space-y-4">
                            <h2 className="text-xl font-black">Empieza tu diagnóstico</h2>
                            <div className="space-y-1.5">
                                <label htmlFor="dg-business" className="text-xs font-semibold text-slate-300 ml-1">Nombre de tu crematorio</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                                    <input id="dg-business" required minLength={2} maxLength={150} value={business}
                                        onChange={e => setBusiness(cleanName(e.target.value))} placeholder="Ej: Crematorio Huellas del Sol"
                                        className={inputCls} autoComplete="organization" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="dg-email" className="text-xs font-semibold text-slate-300 ml-1">Tu correo</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                                    <input id="dg-email" required type="email" inputMode="email" maxLength={150} value={email}
                                        onChange={e => setEmail(cleanEmail(e.target.value))} onBlur={() => setEmailTouched(true)}
                                        placeholder="nombre@crematorio.cl" className={inputCls} autoComplete="email" spellCheck={false} />
                                </div>
                                {emailTouched && email && emailMsg && <p className="text-[11px] text-red-400 ml-1">{emailMsg}</p>}
                            </div>

                            {needsVolume && (
                                <fieldset className="space-y-1.5">
                                    <legend className="text-xs font-semibold text-slate-300 ml-1 mb-1.5">¿Cuántas cremaciones haces al mes?</legend>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Cremaciones al mes">
                                        {config!.volume_ranges.map(r => {
                                            const on = monthly === r.value;
                                            return (
                                                <button key={r.value} type="button" role="radio" aria-checked={on}
                                                    onClick={() => { setMonthly(r.value); setError(null); }}
                                                    className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors ${on ? 'border-[#19B5FE] bg-[#19B5FE]/15 text-white' : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]'}`}>
                                                    {r.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            )}

                            {modeOptions.length > 0 && (
                                <fieldset className="space-y-1.5">
                                    <legend className="text-xs font-semibold text-slate-300 ml-1 mb-1.5">Elige tu diagnóstico</legend>
                                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de diagnóstico">
                                        {modeOptions.map(m => {
                                            const on = mode === m.value;
                                            return (
                                                <button key={m.value} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.value)}
                                                    className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${on ? 'border-[#19B5FE] bg-[#19B5FE]/15' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06]'}`}>
                                                    <span className={`block text-sm font-black ${on ? 'text-white' : 'text-slate-200'}`}>{m.label}</span>
                                                    <span className="block text-[10px] text-slate-400 mt-0.5">{m.count} preguntas</span>
                                                    <span className="block text-[10px] text-slate-500">~{m.minutes} min</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {mode && <p className="text-[11px] text-slate-400 ml-1">{MODES.find(m => m.value === mode)?.description}</p>}
                                </fieldset>
                            )}

                            {error && <p className="text-sm text-red-300 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}</p>}
                            {loadError && <p className="text-sm text-red-300">No pudimos cargar el diagnóstico. Recarga la página.</p>}

                            <button type="submit" disabled={busy || !config}
                                className="w-full py-3.5 rounded-xl bg-[#19B5FE] text-[#020210] font-black text-sm hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 transition">
                                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Comenzar diagnóstico <ArrowRight size={17} />
                            </button>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Te enviaremos tu informe a este correo. Al continuar aceptas nuestra{' '}
                                <a href="/privacidad" target="_blank" className="underline hover:text-slate-300">política de privacidad</a>.
                            </p>
                            {!!config?.promo_pct && (
                                <p className="text-xs text-emerald-300 flex items-center gap-2 pt-1">
                                    <BadgePercent size={15} className="shrink-0" />
                                    Al terminar: {config.promo_pct} % de descuento en Vinzer{config.promo_text ? `, ${config.promo_text.charAt(0).toLowerCase()}${config.promo_text.slice(1)}` : ''}.
                                </p>
                            )}
                        </form>
                    </section>

                    <SeoContent />
                </main>
            ) : (
                <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">
                    {!current ? (
                        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-[#19B5FE]" /></div>
                    ) : (
                        <>
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-2">
                                    <span>{current.category_name}</span>
                                    <span>{step} de {total}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                    <div className="h-full bg-[#19B5FE] transition-all duration-300" style={{ width: `${(answered / total) * 100}%` }} />
                                </div>
                            </div>

                            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 sm:p-8">
                                <div className="flex items-start gap-3">
                                    <h2 className="flex-1 text-lg sm:text-2xl font-black leading-snug">{current.text}</h2>
                                    {current.help && (
                                        <button type="button" onClick={() => setShowHelp(v => !v)} aria-expanded={showHelp} aria-label="¿Qué significa esta pregunta?"
                                            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${showHelp ? 'bg-[#19B5FE]/20 border-[#19B5FE]/60 text-white' : 'border-white/15 text-slate-400 hover:text-white'}`}>
                                            <HelpCircle size={18} />
                                        </button>
                                    )}
                                </div>
                                {showHelp && current.help && (
                                    <p className="mt-3 text-sm text-slate-300 bg-[#19B5FE]/10 border border-[#19B5FE]/20 rounded-xl px-4 py-3">{current.help}</p>
                                )}
                                <div className="mt-6 space-y-2.5" role="radiogroup" aria-label={current.text}>
                                    {current.options.map((text, i) => {
                                        const on = answers[current.id] === i;
                                        return (
                                            <button key={i} type="button" role="radio" aria-checked={on} onClick={() => choose(i)} disabled={busy}
                                                className={`w-full text-left rounded-2xl border px-4 py-3.5 text-sm flex items-center gap-3 transition-colors ${on ? 'border-[#19B5FE] bg-[#19B5FE]/15 text-white' : 'border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/[0.06]'}`}>
                                                <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${on ? 'border-[#19B5FE] bg-[#19B5FE]' : 'border-white/30'}`}>
                                                    {on && <Check size={12} className="text-[#020210]" />}
                                                </span>
                                                <span className="flex-1">{text}</span>
                                            </button>
                                        );
                                    })}
                                    {current.allows_na && (
                                        <button type="button" role="radio" aria-checked={answers[current.id] === 'na'} onClick={() => choose('na')} disabled={busy}
                                            className={`w-full text-left rounded-2xl border border-dashed px-4 py-3 text-sm ${answers[current.id] === 'na' ? 'border-[#19B5FE] bg-[#19B5FE]/10 text-white' : 'border-white/15 text-slate-400 hover:text-white'}`}>
                                            No aplica a mi crematorio
                                        </button>
                                    )}
                                </div>
                            </section>

                            {error && <p className="text-sm text-red-300 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}</p>}

                            <div className="flex items-center justify-between gap-3">
                                {step > 1 ? (
                                    <button type="button" onClick={() => { setShowHelp(false); setStep(s => s - 1); }} disabled={busy}
                                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white flex items-center gap-2">
                                        <ArrowLeft size={15} /> Anterior
                                    </button>
                                ) : (
                                    <button type="button" onClick={restart} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-white">Cambiar datos</button>
                                )}
                                {answered === total ? (
                                    <button type="button" onClick={() => finish(answers)} disabled={busy}
                                        className="px-5 py-3 rounded-xl bg-[#19B5FE] text-[#020210] font-black text-sm hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                                        {busy && <Loader2 size={16} className="animate-spin" />} Ver mi resultado <ArrowRight size={16} />
                                    </button>
                                ) : answers[current.id] !== undefined && step < total ? (
                                    <button type="button" onClick={() => setStep(s => s + 1)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white flex items-center gap-2">
                                        Siguiente <ArrowRight size={15} />
                                    </button>
                                ) : <span />}
                            </div>
                            {busy && answered === total && (
                                <p className="text-center text-sm text-slate-400">Calculando tu resultado…</p>
                            )}
                        </>
                    )}
                </main>
            )}
        </div>
    );
}

/** Texto visible para buscadores bajo la portada: qué mide, cómo funciona y preguntas frecuentes. */
function SeoContent() {
    return (
        <div className="lg:col-span-2 space-y-14 pt-6 lg:pt-10 border-t border-white/5">
            <section>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Qué mide el Diagnóstico 360° de tu crematorio de mascotas</h2>
                <p className="text-slate-400 mt-2 max-w-3xl text-sm sm:text-base">
                    Evaluamos 10 áreas que influyen en cómo te eligen las familias y en lo ordenada que es tu operación diaria.
                </p>
                <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {DIAG_AREAS.map((a, i) => (
                        <li key={a.name} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                            <span className="text-[11px] font-black text-[#19B5FE]">{String(i + 1).padStart(2, '0')}</span>
                            <h3 className="text-sm font-bold mt-1">{a.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{a.text}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Cómo funciona</h2>
                <ol className="mt-6 grid sm:grid-cols-3 gap-3">
                    {DIAG_STEPS.map((st, i) => (
                        <li key={st.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                            <span className="w-8 h-8 rounded-full bg-[#19B5FE]/15 text-[#19B5FE] font-black text-sm flex items-center justify-center">{i + 1}</span>
                            <h3 className="font-bold mt-3">{st.title}</h3>
                            <p className="text-sm text-slate-400 mt-1">{st.text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="max-w-3xl">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Preguntas frecuentes</h2>
                <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
                    {DIAG_FAQS.map(f => (
                        <details key={f.q} className="group py-4">
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-bold text-sm sm:text-base">
                                {f.q}
                                <span className="text-[#19B5FE] text-xl leading-none transition-transform group-open:rotate-45" aria-hidden>+</span>
                            </summary>
                            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.a}</p>
                        </details>
                    ))}
                </div>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="inline-flex items-center gap-2 mt-8 px-5 py-3 rounded-xl bg-[#19B5FE] text-[#020210] font-black text-sm hover:brightness-110">
                    Hacer mi diagnóstico gratis <ArrowRight size={16} />
                </button>
            </section>
        </div>
    );
}
