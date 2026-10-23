// Errores del servidor de Next (render, rutas API, middleware) → Sentry.
// Solo con NEXT_PUBLIC_SENTRY_DSN; los del navegador van en instrumentation-client.ts.
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sentryOptions } from '@/lib/sentryOptions';

export function register() {
    if (SENTRY_DSN) Sentry.init(sentryOptions);
}

export const onRequestError = Sentry.captureRequestError;
