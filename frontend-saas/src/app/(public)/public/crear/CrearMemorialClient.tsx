'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { CheckCircle2, Copy, Loader2, MessageCircle } from 'lucide-react';
import MemorialCreateForm, { type MemorialCreateResult, type MemorialSignupOptions } from '@/components/memorial/create/MemorialCreateForm';
import { whatsappLink } from '@/lib/memorialLanding';

const errorText = async (r: Response) => {
    try {
        const j = await r.json();
        return typeof j.detail === 'string' ? j.detail : 'No se pudo crear el memorial. Intenta de nuevo.';
    } catch {
        return 'No se pudo crear el memorial. Intenta de nuevo.';
    }
};

export default function CrearMemorialClient() {
    const params = useSearchParams();
    const invite = params.get('i') || '';
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [options, setOptions] = useState<MemorialSignupOptions | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [done, setDone] = useState<(MemorialCreateResult & { petName: string }) | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch(`/api/public/memorial-signup${invite ? `?invite=${encodeURIComponent(invite)}` : ''}`)
            .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(await errorText(r)))))
            .then(setOptions)
            .catch((e) => setLoadError(e.message));
    }, [invite]);

    const submit = async (fd: FormData) => {
        if (invite) fd.append('invite', invite);
        else fd.append('recaptcha_token', executeRecaptcha ? await executeRecaptcha('memorial_signup') : '');
        const r = await fetch('/api/public/memorial-signup', { method: 'POST', body: fd });
        if (!r.ok) throw new Error(await errorText(r));
        const res: MemorialCreateResult = await r.json();
        const data = JSON.parse(String(fd.get('data')));
        setDone({ ...res, petName: data.pet.name });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 sm:py-16">
            <div className="mx-auto max-w-2xl">
                <div className="mb-8 text-center">
                    <a href="/" className="text-xs font-black uppercase tracking-[0.3em] text-[#c5a059]">Vinzer Memorial</a>
                    <h1 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
                        {done ? `El memorial de ${done.petName} está creado` : 'Crea el memorial de tu mascota'}
                    </h1>
                    {!done && <p className="mt-2 text-sm text-slate-400">Toma unos minutos. Podrás cambiar todo después con tu PIN.</p>}
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
                    {done ? (
                        <div className="text-center text-slate-700">
                            <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
                            <p className="mt-4 text-sm">Tu PIN de administración es</p>
                            <button type="button" onClick={() => { navigator.clipboard?.writeText(done.pin); setCopied(true); }}
                                className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-mono text-3xl font-black tracking-[0.3em] text-white">
                                {done.pin} <Copy size={16} className="text-slate-400" />
                            </button>
                            {copied && <p className="mt-1 text-xs text-emerald-600">Copiado</p>}
                            <p className="mt-5 text-sm">
                                Te lo enviamos también por correo. El memorial se publicará en cuanto confirmemos el pago del plan elegido;
                                te escribiremos por WhatsApp para coordinarlo.
                            </p>
                            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                                <a href={whatsappLink(`Hola, creé el memorial de ${done.petName} (plan ${done.plan}) y quiero coordinar el pago.`)}
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white">
                                    <MessageCircle size={16} /> Coordinar el pago
                                </a>
                                <a href={`/memorials/m/${done.id_recuerdo}/login`}
                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                                    Entrar a mi memorial
                                </a>
                            </div>
                        </div>
                    ) : loadError ? (
                        <p className="text-center text-sm font-medium text-rose-600">{loadError}</p>
                    ) : !options ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : (
                        <MemorialCreateForm options={options} initialPlan={params.get('plan')} onSubmit={submit} />
                    )}
                </div>
                {!done && !invite && <p className="mt-4 text-center text-[11px] text-slate-500">Protegido por reCAPTCHA.</p>}
            </div>
        </main>
    );
}
