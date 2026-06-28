// Estado de suscripción del tenant, derivado de la fecha de próximo cobro.
// Debe mantenerse consistente con el backend (app/utils/subscription.py):
//   - lockdown cuando ahora > billing_end + GRACE_PERIOD_DAYS.
// Los módulos que siguen accesibles en lockdown se definen en MODULES_ALLOWED_WHEN_LOCKED.

export const GRACE_PERIOD_DAYS = 3;

// Coincide con ALLOWED_MODULES_WHEN_LOCKED del backend (sin 'perfil', que no es
// un item del sidebar). Se permite navegar Dashboard y Configuración.
export const MODULES_ALLOWED_WHEN_LOCKED = ['dashboard', 'configuracion', 'perfil'];

export type SubscriptionState = 'active' | 'warning' | 'grace' | 'locked';

export interface SubscriptionInfo {
    state: SubscriptionState;
    daysRemaining: number; // negativo si ya venció
    locked: boolean;
}

/**
 * Calcula el estado de la suscripción a partir del plan y la fecha de próximo
 * cobro. Parsea la fecha como local a medianoche para evitar desfaces por TZ.
 */
export function getSubscriptionInfo(
    plan: string | null | undefined,
    nextBillingDate: string | null | undefined
): SubscriptionInfo {
    const inactive: SubscriptionInfo = { state: 'active', daysRemaining: Infinity, locked: false };

    if (!nextBillingDate || plan === 'FREE') return inactive;

    try {
        const datePart = nextBillingDate.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length !== 3) return inactive;

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const expiration = new Date(year, month, day);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const DAY = 1000 * 60 * 60 * 24;
        const diffDays = Math.round((expiration.getTime() - today.getTime()) / DAY);

        // Lockdown calculado con timestamp exacto, igual que el backend
        // (now > billing_end + GRACE_PERIOD_DAYS). Esto evita el off-by-one que
        // surge al contar solo por días.
        const lockTs = expiration.getTime() + GRACE_PERIOD_DAYS * DAY;
        const isLocked = Date.now() > lockTs;

        if (isLocked) {
            return { state: 'locked', daysRemaining: diffDays, locked: true };
        }
        if (diffDays < 0) {
            return { state: 'grace', daysRemaining: diffDays, locked: false };
        }
        if (diffDays <= 5) {
            return { state: 'warning', daysRemaining: diffDays, locked: false };
        }
        return { state: 'active', daysRemaining: diffDays, locked: false };
    } catch {
        return inactive;
    }
}

/** ¿Está permitido este módulo cuando la suscripción está en lockdown? */
export function isModuleAllowedWhenLocked(moduleKey?: string | null): boolean {
    if (!moduleKey) return true; // items sin módulo (no operativos) se permiten
    return MODULES_ALLOWED_WHEN_LOCKED.includes(moduleKey);
}
