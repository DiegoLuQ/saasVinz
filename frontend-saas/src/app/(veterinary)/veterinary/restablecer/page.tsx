"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/veterinary/api';
import VetAuthCard, { vetInputCls, vetButtonCls } from '@/components/veterinary/VetAuthCard';

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
            <div className="space-y-6 text-center">
                <AlertCircle className="mx-auto text-red-400" size={40} />
                <p className="text-sm text-slate-300">El enlace no es válido. Solicita uno nuevo.</p>
                <Link href="/olvide-contrasena" className="inline-block text-sm font-bold text-teal-400 hover:text-teal-300">
                    Solicitar un nuevo enlace
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="space-y-6 text-center">
                <CheckCircle2 className="mx-auto text-teal-400" size={40} />
                <p className="text-sm text-slate-300">Tu contraseña se actualizó. Ya puedes ingresar con la nueva.</p>
                <Link href="/login" className={vetButtonCls}>Ir al inicio de sesión <ArrowRight size={18} /></Link>
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
            await apiRequest('/api/veterinary/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        <form onSubmit={handleSubmit} className="space-y-6">
            {[
                { id: 'new-password', label: 'Nueva contraseña', value: password, set: setPassword },
                { id: 'confirm-password', label: 'Repite la contraseña', value: confirm, set: setConfirm },
            ].map((f) => (
                <div key={f.id} className="space-y-2">
                    <label htmlFor={f.id} className="text-[10px] uppercase font-bold text-slate-500 ml-1">{f.label}</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            id={f.id}
                            type="password"
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            required
                            minLength={MIN_LENGTH}
                            autoComplete="new-password"
                            className={vetInputCls}
                        />
                    </div>
                </div>
            ))}
            <p className="text-xs text-slate-500">Mínimo {MIN_LENGTH} caracteres.</p>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                    <p className="text-red-200 text-xs leading-relaxed">
                        {error}{' '}
                        {error.includes('enlace') && <Link href="/olvide-contrasena" className="underline">Solicitar uno nuevo</Link>}
                    </p>
                </div>
            )}

            <button type="submit" disabled={loading} className={vetButtonCls}>
                {loading ? <span className="animate-pulse">Guardando...</span> : <>Guardar contraseña <ArrowRight size={18} /></>}
            </button>
        </form>
    );
}

export default function VetResetPasswordPage() {
    return (
        <VetAuthCard subtitle="Crea una nueva contraseña.">
            <Suspense fallback={<p className="text-center text-sm text-slate-400">Cargando...</p>}>
                <ResetForm />
            </Suspense>
        </VetAuthCard>
    );
}
