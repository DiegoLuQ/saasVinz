"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import TenantAuthCard, { authButtonCls } from '@/components/tenant/auth/TenantAuthCard';
import { getMainRootUrl } from '@/lib/publicUrls';

type State = { kind: 'loading' } | { kind: 'done' } | { kind: 'active'; msg: string } | { kind: 'error'; msg: string };

/** Enlace del correo de registro: crea la cuenta FREE, deja la sesión iniciada y entra al panel. */
function Confirm() {
    const token = useSearchParams().get('t') || '';
    const router = useRouter();
    const [state, setState] = useState<State>(() => (token ? { kind: 'loading' } : { kind: 'error', msg: 'El enlace no es válido.' }));
    const once = useRef(false);

    useEffect(() => {
        if (once.current || !token) return;
        once.current = true;
        (async () => {
            try {
                const r = await fetch('/api/public/signup/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const d = await r.json().catch(() => ({}));
                if (r.status === 409) return setState({ kind: 'active', msg: d.detail });
                if (!r.ok) return setState({ kind: 'error', msg: typeof d.detail === 'string' ? d.detail : 'No pudimos activar tu cuenta.' });
                // La sesión queda en cookies httpOnly emitidas por el backend (igual que el login).
                localStorage.setItem('saasc_user', JSON.stringify(d.user));
                setState({ kind: 'done' });
                setTimeout(() => router.replace('/dashboard'), 1200);
            } catch {
                setState({ kind: 'error', msg: 'No pudimos conectar. Revisa tu conexión y vuelve a abrir el enlace.' });
            }
        })();
    }, [token, router]);

    if (state.kind === 'loading') {
        return <div className="py-6 flex flex-col items-center gap-3 text-sm text-muted-foreground"><Loader2 className="animate-spin text-primary" size={32} /> Activando tu cuenta…</div>;
    }
    if (state.kind === 'done') {
        return (
            <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
                <p className="text-sm text-foreground">¡Listo! Tu cuenta está activa. Entrando a tu panel…</p>
            </div>
        );
    }
    return (
        <div className="space-y-5 text-center">
            {state.kind === 'active' ? <CheckCircle2 className="mx-auto text-emerald-500" size={44} /> : <AlertCircle className="mx-auto text-red-500" size={44} />}
            <p className="text-sm text-foreground">{state.msg}</p>
            {state.kind === 'active'
                ? <Link href="/login" className={authButtonCls}>Iniciar sesión <ArrowRight size={18} /></Link>
                : <a href={`${getMainRootUrl()}/crear-cuenta`} className={authButtonCls}>Volver a registrarme <ArrowRight size={18} /></a>}
        </div>
    );
}

export default function ConfirmarCuentaPage() {
    return (
        <TenantAuthCard title="Activando tu cuenta" subtitle="Bienvenido a Vinzer.">
            <Suspense fallback={null}><Confirm /></Suspense>
        </TenantAuthCard>
    );
}
