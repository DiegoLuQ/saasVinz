import { useMemo } from 'react';
import { useSessionBootstrap } from './useSessionBootstrap';
import { useFeatures } from './useFeatures';
import { featureForPath, moduleForPath } from '@/lib/tenant/moduleRoutes';

/**
 * ¿Puede este usuario abrir una ruta del panel? Mismo criterio que
 * ModuleRouteGuard: módulo activo para su rol y plan + característica del plan.
 * Sirve para no mostrar enlaces que terminan en «no incluido en tu plan».
 */
export function useCanOpen() {
    const { data } = useSessionBootstrap();
    const { hasFeature } = useFeatures();
    const activeModules = useMemo(
        () => data?.rbac.modules.filter((m) => m.is_active).map((m) => m.module_key) ?? [],
        [data],
    );

    const canOpen = (href: string): boolean => {
        if (!data) return true;
        const path = href.split('?')[0];
        const mod = moduleForPath(path);
        if (mod && !activeModules.includes(mod)) return false;
        const feat = featureForPath(path);
        if (feat && !hasFeature(feat, true)) return false;
        // Pestañas de Configuración que dependen de una característica o módulo.
        const tab = new URLSearchParams(href.split('?')[1] || '').get('tab');
        if (path === '/dashboard/configuracion' && tab) {
            const tabFeature = CONFIG_TAB_FEATURES[tab];
            if (tabFeature && !hasFeature(tabFeature, configTabDefault(tabFeature))) return false;
            const tabModule = CONFIG_TAB_MODULES[tab];
            if (tabModule && !activeModules.includes(tabModule)) return false;
        }
        return true;
    };

    return { canOpen, ready: !!data, activeModules };
}

/** Pestañas de Configuración → característica del plan que exigen. */
export const CONFIG_TAB_FEATURES: Record<string, string> = {
    flujo: 'configuracion:flujo',
    formulario: 'configuracion:formulario',
    'documentos-auto': 'certificados:generar_todo',
    creditos: 'configuracion:creditos_ia',
    resenas: 'configuracion:resena_google',
};

/** Características de pestaña que, sin marcar en el plan, quedan APAGADAS (el resto: sin marcar = incluida). */
export const CONFIG_TAB_FEATURE_OFF_BY_DEFAULT = new Set(['configuracion:resena_google']);

/** Valor por defecto de la característica de una pestaña cuando el plan no la tiene guardada. */
export const configTabDefault = (feature: string) => !CONFIG_TAB_FEATURE_OFF_BY_DEFAULT.has(feature);

/** Pestañas de Configuración → módulo del plan que exigen (además de Configuración). */
export const CONFIG_TAB_MODULES: Record<string, string> = {
    certificados: 'certificados',
    'documentos-auto': 'certificados',
};
