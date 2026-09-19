"use client";

import React, { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { homeRouteFor, moduleForPath } from '@/lib/tenant/moduleRoutes';

/**
 * Bloquea el acceso por URL a módulos que el rol no tiene activos (blueprint +
 * plan + configuración del tenant, ya resueltos por el bootstrap) y redirige a
 * la página de inicio del rol. Ej.: el operador sin Dashboard entra directo al
 * Panel de Trabajo en vez de ver /dashboard.
 */
export default function ModuleRouteGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data, error } = useSessionBootstrap();

    const activeModules = useMemo(
        () => data?.rbac.modules.filter(m => m.is_active).map(m => m.module_key) ?? [],
        [data],
    );
    const required = moduleForPath(pathname);
    const allowed = !required || activeModules.includes(required);
    const home = data ? homeRouteFor(activeModules, data.user?.role) : null;

    useEffect(() => {
        if (data && !allowed && home && home !== pathname) router.replace(home);
    }, [data, allowed, home, pathname, router]);

    // Si el bootstrap falla, StatusGuard/los propios módulos muestran el error
    if (error) return <>{children}</>;

    if (!data || !allowed) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
