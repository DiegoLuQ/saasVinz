"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import TenantAuthCard, { authInputCls, authButtonCls } from '@/components/tenant/auth/TenantAuthCard';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await apiRequest('/api/internal/auth/forgot-password', {
                method: 'POST',
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
        <TenantAuthCard title="¿Olvidaste tu contraseña?" subtitle="Te enviaremos un enlace para crear una nueva.">
            {sent ? (
                <div className="space-y-5 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
                    <p className="text-sm text-foreground leading-relaxed">{sent}</p>
                    <p className="text-xs text-muted-foreground">Revisa también la carpeta de spam. El enlace vence en 30 minutos.</p>
                    <Link href="/login" className="inline-block text-sm font-semibold text-primary hover:underline">
                        Volver al inicio de sesión
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="forgot-email" className="text-sm font-semibold ml-1 text-muted-foreground">Correo electrónico</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                            <input
                                id="forgot-email"
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nombre@crematorio.cl"
                                className={authInputCls}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-3">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} /> {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className={authButtonCls}>
                        {loading ? 'Enviando…' : <>Enviar enlace <ArrowRight size={18} /></>}
                    </button>

                    <p className="text-center">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">Volver al inicio de sesión</Link>
                    </p>
                </form>
            )}
        </TenantAuthCard>
    );
}
