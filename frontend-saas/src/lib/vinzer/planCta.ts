// Botón de acción de cada plan en la web pública (tarjetas de la landing y
// /comparar-planes). Un solo lugar para el texto y el destino.
//
// FREE va al registro autoservicio (/crear-cuenta). Los pagados (Track, NORMAL,
// PRO) aún no tienen checkout público (el de Polar exige un crematorio con
// sesión): si se define NEXT_PUBLIC_SIGNUP_URL van ahí con ?plan=<nombre>; si no,
// a WhatsApp con un mensaje para ese plan. ULTRA siempre es atención de ventas.

export const VINZER_WHATSAPP = 'https://wa.me/56982395940?text=';

export type PlanCtaKind = 'free' | 'self' | 'recommended' | 'sales';

export interface PlanCta {
    label: string;
    href: string;
    kind: PlanCtaKind;
    /** Abre en otra pestaña (WhatsApp). */
    external: boolean;
}

const wa = (text: string) => `${VINZER_WHATSAPP}${encodeURIComponent(text)}`;

export function planCta(planName: string, price: number): PlanCta {
    const name = planName.trim().toUpperCase();
    const signup = (process.env.NEXT_PUBLIC_SIGNUP_URL || '').trim();
    const selfServe = (label: string, kind: PlanCtaKind, message: string): PlanCta => signup
        ? { label, kind, external: false, href: `${signup}${signup.includes('?') ? '&' : '?'}plan=${encodeURIComponent(name.toLowerCase())}` }
        : { label, kind, external: true, href: wa(message) };

    if (name === 'ULTRA') {
        return { label: 'Contactar ventas', kind: 'sales', external: true, href: wa('Hola, quiero hablar con ventas sobre el Plan ULTRA de Vinzer, incluido el sitio web institucional.') };
    }
    if (price <= 0 || name === 'FREE') {
        return { label: 'Comenzar gratis', kind: 'free', external: false, href: '/crear-cuenta' };
    }
    if (name === 'PRO') {
        return selfServe('Elegir plan Pro', 'recommended', 'Hola, quiero contratar el Plan PRO de Vinzer.');
    }
    return selfServe('Elegir plan', 'self', `Hola, quiero contratar el Plan ${planName} de Vinzer.`);
}
