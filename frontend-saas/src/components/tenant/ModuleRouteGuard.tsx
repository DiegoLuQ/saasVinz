"use client";

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useFeatures } from '@/hooks/useFeatures';
import { featureForPath, homeRouteFor, moduleForPath } from '@/lib/tenant/moduleRoutes';

/** Módulos que ningún plan bloquea (igual que PLAN_EXEMPT_MODULES del backend). */
const PLAN_EXEMPT_MODULES = ['dashboard', 'perfil', 'configuracion'];

/**
 * Bloquea el acceso por URL a módulos que el rol no tiene activos (blueprint +
 * plan + configuración del tenant, ya resueltos por el bootstrap) y redirige a
 * la página de inicio del rol. Ej.: el operador sin Dashboard entra directo al
 * Panel de Trabajo en vez de ver /dashboard.
 *
 * Lo que el PLAN no incluye (un módulo fuera de allowed_modules, o una sección
 * apagada en admin → Planes → "Configurar Características") muestra un aviso con
 * «Ver planes» en vez de la página, para que se entienda y se pueda mejorar el
 * plan. Lo que el ROL no tiene sigue redirigiendo a la página de inicio del rol.
 */
export default function ModuleRouteGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data, error } = useSessionBootstrap();
    const { hasFeature } = useFeatures();

    const activeModules = useMemo(
        () => data?.rbac.modules.filter(m => m.is_active).map(m => m.module_key) ?? [],
        [data],
    );
    const required = moduleForPath(pathname);
    const allowed = !required || activeModules.includes(required);
    // Módulo fuera del plan (no del rol): se explica en vez de redirigir.
    const planModules: string[] | null = data?.tenant?.subscription_plan?.allowed_modules ?? null;
    const planBlocked = !!required && !allowed && !!planModules && !planModules.includes(required)
        && !PLAN_EXEMPT_MODULES.includes(required);
    const isOwner = data?.user?.role === 'admin' || data?.user?.role === 'creator';
    const home = data ? homeRouteFor(activeModules, data.user?.role) : null;
    // Sin el flag configurado en el plan se permite (mismo criterio que el Sidebar).
    const feature = featureForPath(pathname);
    const featureAllowed = !feature || hasFeature(feature, true);

    useEffect(() => {
        if (data && !allowed && !planBlocked && home && home !== pathname) router.replace(home);
    }, [data, allowed, planBlocked, home, pathname, router]);

    // Si el bootstrap falla, StatusGuard/los propios módulos muestran el error
    if (error) return <>{children}</>;

    if (!data || (!allowed && !planBlocked)) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (planBlocked || !featureAllowed) {
        return (
            <div className="flex items-center justify-center py-24 px-4">
                <div className="max-w-md w-full text-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-white/[0.03]">
                    <span className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 flex items-center justify-center">
                        <Lock size={22} />
                    </span>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Esta sección no está incluida en tu plan</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-muted-foreground">
                        {isOwner
                            ? 'Puedes revisar los planes disponibles y lo que incluye cada uno en Facturación.'
                            : 'Pídele al administrador de tu crematorio que revise el plan contratado.'}
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                        {isOwner && (
                            <Link href="/dashboard/configuracion?tab=facturacion" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">
                                Ver planes
                            </Link>
                        )}
                        {home && home !== pathname && (
                            <Link href={home} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                                Ir al inicio
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
