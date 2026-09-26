"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/veterinary/api';
import VetAuthCard, { vetInputCls, vetButtonCls } from '@/components/veterinary/VetAuthCard';

export default function VetForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await apiRequest('/api/veterinary/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { email: email.trim() },
            });
            setSent(res.detail);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <VetAuthCard subtitle="Recupera el acceso a tu portal.">
            {sent ? (
                <div className="space-y-6 text-center">
                    <CheckCircle2 className="mx-auto text-teal-400" size={40} />
                    <p className="text-sm text-slate-300 leading-relaxed">{sent}</p>
                    <p className="text-xs text-slate-500">Revisa también la carpeta de spam. El enlace vence en 30 minutos.</p>
                    <Link href="/login" className="inline-block text-sm font-bold text-teal-400 hover:text-teal-300">
                        Volver al inicio de sesión
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Ingresa el correo de tu clínica y te enviaremos un enlace para crear una nueva contraseña.
                    </p>
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-[10px] uppercase font-bold text-slate-500 ml-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                className={vetInputCls}
                                placeholder="contacto@veterinaria.cl"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                            <p className="text-red-200 text-xs leading-relaxed">{error}</p>
                        </div>
                    )}

                    <button type="submit" disabled={loading} className={vetButtonCls}>
                        {loading ? <span className="animate-pulse">Enviando...</span> : <>Enviar enlace <ArrowRight size={18} /></>}
                    </button>

                    <p className="text-center">
                        <Link href="/login" className="text-xs text-slate-400 hover:text-teal-400">Volver al inicio de sesión</Link>
                    </p>
                </form>
            )}
        </VetAuthCard>
    );
}
