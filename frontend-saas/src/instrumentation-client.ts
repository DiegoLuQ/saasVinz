// Errores del navegador → Sentry (solo con NEXT_PUBLIC_SENTRY_DSN).
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sentryOptions } from '@/lib/sentryOptions';

if (SENTRY_DSN) {
    Sentry.init({
        ...sentryOptions,
        // Ruido conocido que no es un error de Vinzer.
        ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection captured', 'NetworkError', 'Failed to fetch', 'Load failed'],
    });
}
