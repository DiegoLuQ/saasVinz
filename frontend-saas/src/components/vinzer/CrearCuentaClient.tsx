'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import {
    ArrowLeft, ArrowRight, Building2, User, Mail, Phone, Lock, Globe, Check, AlertCircle, Loader2, MailCheck,
    QrCode, FileCheck2, ClipboardList, ChevronDown,
} from 'lucide-react';
import { VinzerLogo } from '@/components/vinzer/VinzerLogo';
import { getAppUrl, getTrackingBaseUrl } from '@/lib/publicUrls';
import {
    SA_PHONE_CODES, phoneRule, cleanPhoneDigits, phoneError, cleanEmail, emailError, cleanName, EMAIL_MAX,
} from '@/lib/vinzer/signupFields';

const MIN_PASSWORD = 8;

const PERKS = [
    { icon: ClipboardList, text: 'Órdenes, clientes y mascotas en un solo lugar' },
    { icon: QrCode, text: 'Seguimiento en vivo para las familias' },
    { icon: FileCheck2, text: 'Formulario online para recibir los servicios' },
];

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#19B5FE]/60 focus:ring-4 focus:ring-[#19B5FE]/10 transition-all';

type SlugState = { checking: boolean; available: boolean | null; problem: string | null };

function Field({ id, label, icon: Icon, hint, children }: { id: string; label: string; icon: React.ElementType; hint?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-semibold text-slate-300 ml-1">{label}</label>
            <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                {children}
            </div>
            {hint && <div className="text-[11px] ml-1">{hint}</div>}
        </div>
    );
}

/** Registro autoservicio del plan FREE (vinzer.cl/crear-cuenta). */
export default function CrearCuentaClient() {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [form, setForm] = useState({ business: '', slug: '', name: '', email: '', phone: '', password: '' });
    const [phoneCode, setPhoneCode] = useState<string>('+56');
    const [touched, setTouched] = useState({ phone: false, email: false });
    const [accept, setAccept] = useState(false);
    const [slugTouched, setSlugTouched] = useState(false);
    const [slug, setSlug] = useState<SlugState>({ checking: false, available: null, problem: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState<string | null>(null);
    const [trackingHost, setTrackingHost] = useState('track.vinzer.cl');
    const [appUrl, setAppUrl] = useState('');
    const seq = useRef(0);

    useEffect(() => {
        setTrackingHost(getTrackingBaseUrl().replace(/^https?:\/\//, ''));
        setAppUrl(getAppUrl());
    }, []);

    const set = (k: keyof typeof form, clean: (v: string) => string = (v) => v) =>
        (e: React.ChangeEvent<HTMLInputElement>) => { const v = clean(e.target.value); setForm((f) => ({ ...f, [k]: v })); };
    const phoneMsg = phoneError(form.phone, phoneCode);
    const emailMsg = emailError(form.email);
    const rule = phoneRule(phoneCode);

    // Dirección sugerida a partir del nombre (hasta que la persona la edite) y
    // verificación en vivo de que esté libre.
    const name = form.business.trim();
    const typed = form.slug.trim().toLowerCase();
    const slugQuery = slugTouched
        ? (typed ? `slug=${encodeURIComponent(typed)}` : '')
        : (name.length >= 2 ? `name=${encodeURIComponent(name)}` : '');
    useEffect(() => {
        if (!slugQuery) { setSlug({ checking: false, available: null, problem: null }); return; }
        const n = ++seq.current;
        setSlug((s) => ({ ...s, checking: true }));
        const t = setTimeout(async () => {
            try {
                const r = await fetch(`/api/public/signup/slug?${slugQuery}`);
                const d = await r.json();
                if (n !== seq.current) return;
                if (!r.ok) throw new Error();
                if (slugQuery.startsWith('name=')) setForm((f) => ({ ...f, slug: d.slug }));
                setSlug({ checking: false, available: d.available, problem: d.problem });
            } catch {
                if (n === seq.current) setSlug({ checking: false, available: null, problem: null });
            }
        }, 450);
        return () => clearTimeout(t);
    }, [slugQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setTouched({ phone: true, email: true });
        if (phoneMsg) return setError(phoneMsg);
        if (emailMsg) return setError(emailMsg);
        if (form.password.length < MIN_PASSWORD) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
        if (slug.available === false) return setError(slug.problem || 'Elige otra dirección.');
        if (!accept) return setError('Debes aceptar los Términos y la Política de Privacidad.');
        setLoading(true);
        try {
            const token = executeRecaptcha ? await executeRecaptcha('signup') : '';
            const r = await fetch('/api/public/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_name: form.business.trim(), slug: form.slug.trim().toLowerCase(), admin_name: form.name.trim(),
                    email: form.email, phone: `${phoneCode}${form.phone}`, password: form.password,
                    accept_terms: accept, recaptcha_token: token,
                }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                const msg = typeof d.detail === 'string' ? d.detail
                    : Array.isArray(d.detail) ? String(d.detail[0]?.msg || 'Revisa los datos del formulario.').replace(/^Value error, /, '')
                    : d.error ? 'Hiciste varios intentos seguidos. Espera un minuto e inténtalo de nuevo.'
                    : 'No pudimos crear tu cuenta. Inténtalo de nuevo.';
                throw new Error(msg);
            }
            setSent(d.detail);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta.');
        } finally {
            setLoading(false);
        }
    };

    const slugHint = slug.checking
        ? <span className="text-slate-500 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Revisando…</span>
        : slug.available === false ? <span className="text-red-400">{slug.problem}</span>
        : slug.available ? <span className="text-emerald-400 inline-flex items-center gap-1"><Check size={12} /> Disponible · {trackingHost}/{form.slug}/…</span>
        : <span className="text-slate-500">Aparece en los enlaces que reciben las familias.</span>;

    return (
        <div className="min-h-screen bg-[#020210] text-white font-sans antialiased relative overflow-x-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#19B5FE]/10 blur-[150px] rounded-full" />
                <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 blur-[170px] rounded-full" />
            </div>

            <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between border-b border-white/5">
                <Link href="/"><VinzerLogo size="md" /></Link>
                <Link href="/#planes" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white">
                    <ArrowLeft size={14} /> Planes
                </Link>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start">
                <section className="lg:sticky lg:top-10 space-y-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                        Plan FREE · sin tarjeta
                    </span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                        Crea la cuenta de tu crematorio <span className="text-[#19B5FE]">gratis</span>
                    </h1>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-md">
                        Empieza en minutos. Cuando necesites más capacidad o funciones, cambias de plan desde tu panel.
                    </p>
                    <ul className="space-y-3">
                        {PERKS.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                                <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><Icon size={16} className="text-[#19B5FE]" /></span>
                                {text}
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-slate-500">
                        ¿Ya tienes cuenta? {appUrl && <a href={`${appUrl}/login`} className="text-[#19B5FE] font-semibold hover:underline">Inicia sesión</a>}
                    </p>
                </section>

                <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl">
                    {sent ? (
                        <div className="py-8 text-center space-y-4">
                            <span className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"><MailCheck size={30} className="text-emerald-300" /></span>
                            <h2 className="text-2xl font-black">Revisa tu correo</h2>
                            <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">{sent}</p>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Abre el enlace del correo para activar tu cuenta y entrar a tu panel. Vence en 48 horas.</p>
                            <button type="button" onClick={() => setSent(null)} className="text-xs text-slate-400 hover:text-white underline">¿Escribiste mal el correo? Volver al formulario</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
                            <h2 className="text-xl font-black">Datos de tu crematorio</h2>
                            <Field id="su-business" label="Nombre del crematorio" icon={Building2}>
                                <input id="su-business" required minLength={2} maxLength={80} value={form.business} onChange={set('business', cleanName)} placeholder="Ej: Crematorio Huellas del Sol" className={inputCls} autoComplete="organization" />
                            </Field>
                            <Field id="su-slug" label="Dirección web" icon={Globe} hint={slugHint}>
                                <input id="su-slug" required minLength={3} maxLength={40} value={form.slug}
                                    onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })); }}
                                    placeholder="huellas-del-sol" className={inputCls} autoComplete="off" spellCheck={false} />
                            </Field>

                            <h2 className="text-xl font-black pt-3">Tus datos</h2>
                            <Field id="su-name" label="Nombre y apellido" icon={User}>
                                <input id="su-name" required minLength={2} maxLength={80} value={form.name} onChange={set('name', cleanName)} className={inputCls} autoComplete="name" />
                            </Field>
                            <div className="space-y-1.5">
                                <label htmlFor="su-phone" className="text-xs font-semibold text-slate-300 ml-1">Celular / WhatsApp</label>
                                <div className="flex gap-2">
                                    <div className="relative shrink-0">
                                        <select aria-label="Código de país" value={phoneCode}
                                            onChange={(e) => { setPhoneCode(e.target.value); setForm((f) => ({ ...f, phone: cleanPhoneDigits(f.phone, e.target.value) })); }}
                                            className="h-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl pl-3 pr-8 py-3 text-sm text-white outline-none focus:border-[#19B5FE]/60 cursor-pointer [&>option]:bg-[#0b1020]">
                                            {SA_PHONE_CODES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} {c.country}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>
                                    <div className="relative flex-1 min-w-0">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                                        <input id="su-phone" required type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={rule.max}
                                            value={form.phone} onChange={set('phone', (v) => cleanPhoneDigits(v, phoneCode))}
                                            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                                            placeholder={rule.placeholder} className={inputCls} autoComplete="tel-national" />
                                    </div>
                                </div>
                                <p className={`text-[11px] ml-1 ${touched.phone && phoneMsg ? 'text-red-400' : 'text-slate-500'}`}>
                                    {touched.phone && phoneMsg ? phoneMsg : `Solo números, ${rule.min === rule.max ? rule.min : `${rule.min} a ${rule.max}`} dígitos sin el ${rule.code}.`}
                                </p>
                            </div>
                            <Field id="su-email" label="Correo (con él ingresarás)" icon={Mail}
                                hint={touched.email && emailMsg ? <span className="text-red-400">{emailMsg}</span> : <span className="text-slate-500">Máximo {EMAIL_MAX} caracteres.</span>}>
                                <input id="su-email" required type="email" inputMode="email" maxLength={EMAIL_MAX} value={form.email}
                                    onChange={set('email', cleanEmail)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                                    placeholder="nombre@crematorio.cl" className={inputCls} autoComplete="email" spellCheck={false} />
                            </Field>
                            <Field id="su-password" label="Contraseña" icon={Lock} hint={<span className="text-slate-500">Mínimo {MIN_PASSWORD} caracteres.</span>}>
                                <input id="su-password" required type="password" minLength={MIN_PASSWORD} maxLength={128} value={form.password} onChange={set('password')} className={inputCls} autoComplete="new-password" />
                            </Field>

                            <label className="flex items-start gap-3 pt-2 cursor-pointer select-none">
                                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#19B5FE] shrink-0" />
                                <span className="text-xs text-slate-300 leading-relaxed">
                                    Acepto los <Link href="/terminos" target="_blank" className="text-[#19B5FE] hover:underline">Términos del Servicio</Link> y
                                    la <Link href="/privacidad" target="_blank" className="text-[#19B5FE] hover:underline">Política de Privacidad</Link>.
                                </span>
                            </label>

                            {error && (
                                <p className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
                                </p>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#020210] font-black py-3.5 rounded-xl transition-colors disabled:opacity-60">
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Creando…</> : <>Crear cuenta gratis <ArrowRight size={18} /></>}
                            </button>
                            <p className="text-[11px] text-slate-500 text-center">Te enviaremos un correo para confirmar tu dirección. Protegido por reCAPTCHA.</p>
                        </form>
                    )}
                </section>
            </main>
        </div>
    );
}
