'use client';

import React, { useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface VinzerDemoFormProps {
    theme?: 'dark' | 'light';
}

/**
 * Formulario express de solicitud de demo (3 campos).
 *
 * Envía a POST /api/public/leads/demo, que valida reCAPTCHA v3, limita por IP
 * y notifica por correo. No escribe en las tablas de negocio.
 */
export function VinzerDemoForm({ theme = 'dark' }: VinzerDemoFormProps) {
    const isLight = theme === 'light';
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [nombre, setNombre] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [telefono, setTelefono] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [error, setError] = useState('');

    const inputCls = isLight
        ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:ring-[#0284C7]/15'
        : 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-[#19B5FE] focus:ring-[#19B5FE]/20';

    const labelCls = isLight ? 'text-slate-500' : 'text-slate-400';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === 'sending') return;

        if (!nombre.trim() || !empresa.trim() || !telefono.trim()) {
            setError('Completa los tres campos para que podamos contactarte.');
            return;
        }

        setStatus('sending');
        setError('');

        try {
            // Si reCAPTCHA no cargó, el backend lo rechaza fuera de dev. Se avisa
            // en vez de enviar una petición que va a fallar en silencio.
            if (!executeRecaptcha) {
                setError('No pudimos cargar la verificación de seguridad. Recarga la página e inténtalo otra vez.');
                setStatus('idle');
                return;
            }

            const token = await executeRecaptcha('vinzer_demo_lead');

            const response = await fetch('/api/public/leads/demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recaptcha_token: token,
                    nombre: nombre.trim(),
                    empresa: empresa.trim(),
                    telefono: telefono.trim(),
                    origen: 'landing-vinzer',
                }),
            });

            if (response.status === 429) {
                setError('Recibimos varias solicitudes desde tu conexión. Espera un minuto e inténtalo de nuevo.');
                setStatus('idle');
                return;
            }

            if (!response.ok) {
                setError('No pudimos enviar tu solicitud. Escríbenos por WhatsApp y te atendemos al instante.');
                setStatus('idle');
                return;
            }

            setStatus('sent');
        } catch {
            setError('Ocurrió un problema de conexión. Revisa tu red e inténtalo nuevamente.');
            setStatus('idle');
        }
    };

    if (status === 'sent') {
        return (
            <div
                className={`rounded-3xl border p-8 text-center flex flex-col items-center gap-3 ${
                    isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/5 border-emerald-500/20'
                }`}
                role="status"
            >
                <CheckCircle2 size={36} className={isLight ? 'text-emerald-600' : 'text-emerald-400'} />
                <h3 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Recibimos tu solicitud
                </h3>
                <p className={`text-sm max-w-sm ${isLight ? 'text-slate-600' : 'text-[#C0C0C0]'}`}>
                    Te contactamos dentro del día hábil para coordinar la demostración guiada.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label htmlFor="demo-nombre" className={`block text-[10px] font-bold uppercase tracking-widest ml-1 ${labelCls}`}>
                        Nombre y apellido
                    </label>
                    <input
                        id="demo-nombre"
                        type="text"
                        autoComplete="name"
                        value={nombre}
                        onChange={(e) => { setNombre(e.target.value); if (error) setError(''); }}
                        placeholder="María Rojas"
                        className={`w-full h-12 px-4 rounded-xl border text-sm focus:outline-none focus:ring-4 transition-all ${inputCls}`}
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="demo-empresa" className={`block text-[10px] font-bold uppercase tracking-widest ml-1 ${labelCls}`}>
                        Crematorio / Empresa
                    </label>
                    <input
                        id="demo-empresa"
                        type="text"
                        autoComplete="organization"
                        value={empresa}
                        onChange={(e) => { setEmpresa(e.target.value); if (error) setError(''); }}
                        placeholder="Crematorio Los Andes"
                        className={`w-full h-12 px-4 rounded-xl border text-sm focus:outline-none focus:ring-4 transition-all ${inputCls}`}
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="demo-telefono" className={`block text-[10px] font-bold uppercase tracking-widest ml-1 ${labelCls}`}>
                        WhatsApp o teléfono
                    </label>
                    <input
                        id="demo-telefono"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={telefono}
                        onChange={(e) => { setTelefono(e.target.value); if (error) setError(''); }}
                        placeholder="+56 9 1234 5678"
                        className={`w-full h-12 px-4 rounded-xl border text-sm focus:outline-none focus:ring-4 transition-all ${inputCls}`}
                    />
                </div>
            </div>

            {error && (
                <div className={`flex items-start gap-2 text-sm px-1 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} role="alert">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={status === 'sending'}
                className={`w-full sm:w-auto min-h-[48px] px-8 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                    isLight
                        ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-lg shadow-sky-500/20'
                        : 'bg-[#19B5FE] hover:brightness-110 text-[#020210] shadow-lg shadow-[#19B5FE]/20'
                }`}
            >
                {status === 'sending' ? (
                    <><Loader2 size={16} className="animate-spin" /> Enviando…</>
                ) : (
                    <>Solicitar demostración guiada <ArrowRight size={16} /></>
                )}
            </button>

            <p className={`text-[10px] leading-relaxed ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                Solo usamos estos datos para contactarte por la demostración.
            </p>
        </form>
    );
}
