// Opciones comunes de Sentry (navegador y servidor de Next). Sin
// NEXT_PUBLIC_SENTRY_DSN no se inicia (desarrollo local). Nunca se envían datos
// personales: sin cookies, cuerpos ni la query de la URL (los enlaces de
// restablecer contraseña y de formularios llevan tokens ahí).
import type { ErrorEvent } from '@sentry/nextjs';

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

const stripQuery = (url?: string) => (url ? url.split('?')[0] : url);

export function scrubEvent(event: ErrorEvent): ErrorEvent {
    if (event.request) {
        event.request.url = stripQuery(event.request.url);
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.query_string;
        if (event.request.headers) {
            for (const h of Object.keys(event.request.headers)) {
                if (['authorization', 'cookie'].includes(h.toLowerCase())) event.request.headers[h] = '[filtrado]';
            }
        }
    }
    for (const b of event.breadcrumbs || []) {
        if (b.data?.url) b.data.url = stripQuery(String(b.data.url));
    }
    return event;
}

export const sentryOptions = {
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
};
