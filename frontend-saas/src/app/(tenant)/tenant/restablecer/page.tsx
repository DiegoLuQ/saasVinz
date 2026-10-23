"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import TenantAuthCard, { authInputCls, authButtonCls } from '@/components/tenant/auth/TenantAuthCard';

const MIN_LENGTH = 8;

function ResetForm() {
    const token = useSearchParams().get('token') || '';
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!token) {
        return (
            <div className="space-y-5 text-center">
                <AlertCircle className="mx-auto text-red-500" size={44} />
                <p className="text-sm text-foreground">El enlace no es válido. Solicita uno nuevo.</p>
                <Link href="/olvide-contrasena" className="inline-block text-sm font-semibold text-primary hover:underline">
                    Solicitar un nuevo enlace
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="space-y-5 text-center">
                <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
                <p className="text-sm text-foreground">Tu contraseña se actualizó. Ya puedes ingresar con la nueva.</p>
                <Link href="/login" className={authButtonCls}>Ir al inicio de sesión <ArrowRight size={18} /></Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password.length < MIN_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
        if (password !== confirm) return setError('Las contraseñas no coinciden.');
        setLoading(true);
        try {
            await apiRequest('/api/internal/auth/reset-password', {
                method: 'POST',
                body: { token, new_password: password },
            });
            setDone(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {[
                { id: 'new-password', label: 'Nueva contraseña', value: password, set: setPassword },
                { id: 'confirm-password', label: 'Repite la contraseña', value: confirm, set: setConfirm },
            ].map((f) => (
                <div key={f.id} className="space-y-2">
                    <label htmlFor={f.id} className="text-sm font-semibold ml-1 text-muted-foreground">{f.label}</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            id={f.id}
                            type="password"
                            required
                            minLength={MIN_LENGTH}
                            autoComplete="new-password"
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            className={authInputCls}
                        />
                    </div>
                </div>
            ))}
            <p className="text-xs text-muted-foreground ml-1">Mínimo {MIN_LENGTH} caracteres. Al guardar se cerrarán las sesiones abiertas en otros dispositivos.</p>

            {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <span>
                        {error}{' '}
                        {error.includes('enlace') && <Link href="/olvide-contrasena" className="underline">Solicitar uno nuevo</Link>}
                    </span>
                </div>
            )}

            <button type="submit" disabled={loading} className={authButtonCls}>
                {loading ? 'Guardando…' : <>Guardar contraseña <ArrowRight size={18} /></>}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <TenantAuthCard title="Crea una nueva contraseña" subtitle="Elige una contraseña que no uses en otros sitios.">
            <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Cargando…</p>}>
                <ResetForm />
            </Suspense>
        </TenantAuthCard>
    );
}
