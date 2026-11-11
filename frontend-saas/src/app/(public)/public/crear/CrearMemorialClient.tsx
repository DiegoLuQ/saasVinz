'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Copy,
    Heart,
    Loader2,
    MessageCircle,
    RotateCcw,
} from 'lucide-react';
import MemorialCreateForm, { type MemorialCreateResult, type MemorialSignupOptions } from '@/components/memorial/create/MemorialCreateForm';
import { PublicHeader } from '@/components/public/PublicHeader';
import { whatsappLink } from '@/lib/memorialLanding';

const THEME_STORAGE_KEY = 'memorial_landing_theme';
const LOAD_FALLBACK = 'No pudimos cargar los planes y opciones en este momento. Intenta nuevamente.';
const SUBMIT_FALLBACK = 'No se pudo crear el memorial. Intenta de nuevo.';

const errorText = async (r: Response, fallback: string) => {
    try {
        const j = await r.json();
        return typeof j.detail === 'string' && j.detail.trim() ? j.detail : fallback;
    } catch {
        return fallback;
    }
};

export default function CrearMemorialClient() {
    const params = useSearchParams();
    const invite = params.get('i') || '';
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [isDark, setIsDark] = useState(false);
    const [options, setOptions] = useState<MemorialSignupOptions | null>(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [done, setDone] = useState<(MemorialCreateResult & { petName: string }) | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            if (localStorage.getItem(THEME_STORAGE_KEY) === 'dark') {
                setIsDark(true);
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    const toggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
            } catch {
                // ignore
            }
            return next;
        });
    };

    const loadOptions = useCallback(async () => {
        setLoadingOptions(true);
        setLoadError(null);
        try {
            const r = await fetch(`/api/public/memorial-signup${invite ? `?invite=${encodeURIComponent(invite)}` : ''}`);
            if (!r.ok) {
                throw new Error(await errorText(r, LOAD_FALLBACK));
            }
            const data: MemorialSignupOptions = await r.json();
            setOptions(data);
        } catch (e) {
            setOptions(null);
            setLoadError(e instanceof Error && e.message && e.message !== 'Failed to fetch' ? e.message : LOAD_FALLBACK);
        } finally {
            setLoadingOptions(false);
        }
    }, [invite]);

    useEffect(() => {
        loadOptions();
    }, [loadOptions]);

    const submit = async (fd: FormData) => {
        if (invite) fd.append('invite', invite);
        else fd.append('recaptcha_token', executeRecaptcha ? await executeRecaptcha('memorial_signup') : '');
        const r = await fetch('/api/public/memorial-signup', { method: 'POST', body: fd });
        if (!r.ok) throw new Error(await errorText(r, SUBMIT_FALLBACK));
        const res: MemorialCreateResult = await r.json();
        const data = JSON.parse(String(fd.get('data')));
        setDone({ ...res, petName: data.pet.name });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div
            className={`relative min-h-screen transition-colors duration-500 ${
                isDark ? 'bg-[#040711] text-white' : 'bg-[#FAF8F4] text-slate-900'
            }`}
        >
            <PublicHeader isDark={isDark} onToggleTheme={toggleTheme} />

            {/* Halo ambiental sutil acorde a memorial.vinzer.cl */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div
                    className={`absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-[120px] ${
                        isDark ? 'bg-amber-500/10' : 'bg-amber-300/20'
                    }`}
                />
            </div>

            <main className="relative z-10 px-4 pb-16 pt-28 sm:pt-32 sm:pb-24">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-8 text-center">
                        <Link
                            href="/"
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] transition-colors ${
                                isDark
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                                    : 'border-amber-700/20 bg-amber-500/10 text-amber-800 hover:bg-amber-500/15'
                            }`}
                        >
                            <Heart size={11} className="fill-current" />
                            <span>Vinzer Memorial</span>
                        </Link>

                        <h1
                            className={`mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl ${
                                isDark ? 'text-white' : 'text-slate-900'
                            }`}
                        >
                            {done ? `El memorial de ${done.petName} está creado` : 'Crea el memorial de tu mascota'}
                        </h1>

                        {!done && (
                            <p className={`mt-2.5 text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Toma unos minutos. Podrás cambiar todo después con tu PIN.
                            </p>
                        )}
                    </div>

                    <div
                        className={`rounded-[2rem] border bg-white p-5 sm:p-8 ${
                            isDark
                                ? 'border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]'
                                : 'border-stone-200/90 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]'
                        }`}
                    >
                        {done ? (
                            <div className="py-2 text-center text-slate-700">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 size={32} />
                                </div>
                                <p className="mt-4 text-sm font-medium text-slate-500">Tu PIN de administración es</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard?.writeText(done.pin);
                                        setCopied(true);
                                    }}
                                    className="mt-2 inline-flex items-center gap-2.5 rounded-2xl bg-slate-900 px-6 py-3 font-mono text-3xl font-black tracking-[0.3em] text-white transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                                >
                                    {done.pin} <Copy size={16} className="text-slate-400" />
                                </button>
                                {copied && <p className="mt-1.5 text-xs font-semibold text-emerald-600">PIN copiado</p>}
                                <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-600">
                                    Te lo enviamos también por correo. El memorial se publicará en cuanto confirmemos el pago del plan elegido;
                                    te escribiremos por WhatsApp para coordinarlo.
                                </p>
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                                    <a
                                        href={whatsappLink(`Hola, creé el memorial de ${done.petName} (plan ${done.plan}) y quiero coordinar el pago.`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                                    >
                                        <MessageCircle size={16} /> Coordinar el pago
                                    </a>
                                    <a
                                        href={`/memorials/m/${done.id_recuerdo}/login`}
                                        className="inline-flex items-center justify-center rounded-xl border border-stone-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-stone-50"
                                    >
                                        Entrar a mi memorial
                                    </a>
                                </div>
                            </div>
                        ) : loadError ? (
                            <div className="py-6 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                    <AlertCircle size={24} />
                                </div>
                                <h2 className="mt-4 font-serif text-xl font-bold text-slate-900">
                                    No pudimos abrir el formulario
                                </h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                                    {loadError}
                                </p>
                                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={loadOptions}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 sm:w-auto cursor-pointer"
                                    >
                                        <RotateCcw size={15} />
                                        Reintentar
                                    </button>
                                    <Link
                                        href="/"
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-stone-50 sm:w-auto"
                                    >
                                        <ArrowLeft size={15} />
                                        Volver al inicio
                                    </Link>
                                </div>
                                <div className="mt-5 border-t border-stone-100 pt-4">
                                    <a
                                        href={whatsappLink('Hola, tuve un problema para cargar el formulario de creación en Vinzer Memorial.')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
                                    >
                                        <MessageCircle size={13} />
                                        ¿Necesitas ayuda? Escríbenos por WhatsApp
                                    </a>
                                </div>
                            </div>
                        ) : loadingOptions || !options ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-500">
                                <Loader2 size={24} className="animate-spin text-amber-600" />
                                <p className="text-xs font-medium tracking-wide text-slate-500">Cargando opciones del santuario…</p>
                            </div>
                        ) : (
                            <MemorialCreateForm options={options} initialPlan={params.get('plan')} onSubmit={submit} />
                        )}
                    </div>

                    {!done && !invite && (
                        <p className={`mt-4 text-center text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Protegido por reCAPTCHA.
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
