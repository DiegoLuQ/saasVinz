"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Heart, Infinity as InfinityIcon, MessageCircle, Sparkles, Star, Clock, AlertTriangle } from 'lucide-react';
import { getLandingContent, whatsappLink, type PlanId } from '@/lib/memorialLanding';

/**
 * Planes en la gestión familiar del memorial. Reemplaza a TributePlans (planes
 * CLP/Polar antiguos) con los mismos planes USD de la landing, venta asistida
 * por WhatsApp. Solo ofrece mejoras reales sobre el plan actual y muestra qué
 * se gana en concreto.
 */

type Tier = 'free' | 'legacy' | 'mensual' | 'anual' | 'eterno';

// Límites por plan: deben coincidir con rec_plans.features (migración e3b5d7f9a124)
const PLAN_SPECS: Record<PlanId, { photos: number; dedications: number }> = {
    mensual: { photos: 3, dedications: 10 },
    anual: { photos: 10, dedications: 35 },
    eterno: { photos: 25, dedications: Infinity },
};

const UNLIMITED = 10000;

const PLAN_STYLE: Record<PlanId, { Icon: typeof Heart; gradient: string }> = {
    mensual: { Icon: Heart, gradient: 'from-sky-400 to-cyan-300' },
    anual: { Icon: Star, gradient: 'from-indigo-400 to-violet-300' },
    eterno: { Icon: Crown, gradient: 'from-amber-400 to-orange-300' },
};

/** Nombre amable del plan del memorial (incluye los planes heredados). */
export function memorialPlanDisplay(raw: string | null | undefined, locale: 'es' | 'en' = 'es'): { tier: Tier; name: string } {
    const p = (raw || '').toUpperCase().trim();
    const en = locale === 'en';
    if (p === 'ETERNO') return { tier: 'eterno', name: en ? 'Eternal' : 'Eterno' };
    if (p === 'ANUAL') return { tier: 'anual', name: en ? 'Yearly' : 'Anual' };
    if (p === 'MENSUAL') return { tier: 'mensual', name: en ? 'Monthly' : 'Mensual' };
    if (p.includes('ULTRA') || p.includes('PARAISO') || p.includes('PARAÍSO')) return { tier: 'legacy', name: en ? 'Paradise' : 'Paraíso' };
    if (p.includes('PRO') || p.includes('VINCULO') || p.includes('VÍNCULO')) return { tier: 'legacy', name: en ? 'Bond' : 'Vínculo' };
    if (p.includes('NORMAL') || p.includes('HUELLA')) return { tier: 'legacy', name: en ? 'Pawprint' : 'Huella' };
    return { tier: 'free', name: en ? 'Memory' : 'Recuerdo' };
}

interface MemorialPlanUpgradeProps {
    plan: string | null | undefined;
    validUntil: string | null | undefined;
    photosUsed: number;
    photoLimit: number;
    dedicationsUsed: number;
    dedicationLimit: number;
    gestures: number;
    petName: string;
    uuid: string;
    locale: 'es' | 'en';
    isDark: boolean;
}

export default function MemorialPlanUpgrade({
    plan, validUntil, photosUsed, photoLimit, dedicationsUsed, dedicationLimit,
    gestures, petName, uuid, locale, isDark,
}: MemorialPlanUpgradeProps) {
    const en = locale === 'en';
    const { plans } = getLandingContent(locale);
    const current = memorialPlanDisplay(plan, locale);
    const name = petName || (en ? 'your companion' : 'tu compañero');

    // ── Vigencia ──
    const expiry = validUntil ? new Date(validUntil) : null;
    const daysLeft = expiry && !isNaN(expiry.getTime())
        ? Math.ceil((expiry.getTime() - Date.now()) / 86_400_000)
        : null;
    const isForever = current.tier === 'eterno' || (!expiry && current.tier !== 'free');
    const isExpired = daysLeft !== null && daysLeft < 0;
    const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 60;
    const dateFmt = new Intl.DateTimeFormat(en ? 'en-US' : 'es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const expiryLabel = expiry && !isNaN(expiry.getTime()) ? dateFmt.format(expiry) : null;
    // Al extender, los 12 meses se suman a la vigencia actual
    const extendedLabel = expiry && !isNaN(expiry.getTime())
        ? dateFmt.format(new Date(Date.UTC(expiry.getUTCFullYear() + 1, expiry.getUTCMonth(), expiry.getUTCDate())))
        : null;

    // ── Qué ofrecer: solo mejoras reales sobre el plan actual ──
    const offerIds: PlanId[] =
        current.tier === 'eterno' ? []
            : (current.tier === 'free' || isExpired) ? ['mensual', 'anual', 'eterno']
                : current.tier === 'mensual' ? ['anual', 'eterno']
                    : ['anual', 'eterno']; // anual / heredados: extender un año o pasar a Eterno
    const isRenewal = (id: PlanId) => id === 'anual' && (current.tier === 'anual' || current.tier === 'legacy') && !isExpired;
    // Plan vencido que se vuelve a ofrecer: se presenta como "Renovar"
    const isReactivation = (id: PlanId) => isExpired && id === current.tier;
    const offers = plans.list.filter(p => offerIds.includes(p.id));
    // Con 3 opciones, el estado va arriba a lo ancho y las opciones en 3 columnas
    const stacked = offers.length >= 3;

    const gainsFor = (id: PlanId): string[] => {
        const spec = PLAN_SPECS[id];
        const out: string[] = [];
        if (id === 'eterno') out.push(en ? 'No expiration date, ever' : 'Sin fecha de vencimiento, nunca');
        if (isRenewal(id)) out.push(en ? '12 more months for their altar' : '12 meses más para su altar');
        if (spec.photos > photoLimit) {
            out.push(en ? `Photos: from ${photoLimit} to ${spec.photos}` : `Fotos: de ${photoLimit} a ${spec.photos}`);
        }
        if (spec.dedications > dedicationLimit && dedicationLimit < UNLIMITED) {
            out.push(spec.dedications === Infinity
                ? (en ? `Dedications: from ${dedicationLimit} to unlimited` : `Dedicatorias: de ${dedicationLimit} a ilimitadas`)
                : (en ? `Dedications: from ${dedicationLimit} to ${spec.dedications}` : `Dedicatorias: de ${dedicationLimit} a ${spec.dedications}`));
        }
        if (current.tier === 'free' || isExpired) {
            out.push(en ? 'All altar designs and effects' : 'Todos los diseños y efectos del altar');
        }
        return out;
    };

    const concept: Record<PlanId, string> = {
        mensual: en ? 'Their altar lit, month by month.' : 'Su altar encendido, mes a mes.',
        anual: en ? 'A whole year of candles, photos and words.' : 'Un año entero de velas, fotos y palabras.',
        eterno: en ? 'A memory with no expiration date.' : 'Que su memoria no tenga fecha de vencimiento.',
    };

    const waText = (id: PlanId, planName: string, price: number, period: string) => {
        const action = id === 'eterno'
            ? (en ? 'move to' : 'pasar al')
            : isRenewal(id)
                ? (en ? 'extend by one year with' : 'extender por un año con el')
                : isReactivation(id)
                    ? (en ? 'renew' : 'renovar el')
                : (en ? 'activate' : 'activar el');
        return en
            ? `Hi, I'm from ${petName}'s family. I'd like to ${action} the ${planName} plan (${price} USD ${period}). Current plan: ${current.name}. Memorial ID: ${uuid}`
            : `Hola, soy de la familia de ${petName}. Quiero ${action} Plan ${planName} (${price} USD ${period}). Plan actual: ${current.name}. ID del memorial: ${uuid}`;
    };

    // ── Estilos según el tema de la gestión ──
    const card = isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/70 border-white shadow-sky-100/60';
    const muted = isDark ? 'text-slate-400' : 'text-slate-500';
    const strong = isDark ? 'text-slate-100' : 'text-slate-800';
    const track = isDark ? 'bg-slate-700/60' : 'bg-slate-100';

    const usage = [
        { label: en ? 'Photos' : 'Fotos', used: photosUsed, limit: photoLimit },
        { label: en ? 'Dedications' : 'Dedicatorias', used: dedicationsUsed, limit: dedicationLimit },
    ];

    return (
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-20 pt-6">
            {/* Encabezado */}
            <div className="text-center mb-10 space-y-3">
                <span className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                    <Sparkles size={14} /> {en ? 'Their space in heaven' : 'Su espacio en el cielo'}
                </span>
                <h2 className={`text-3xl sm:text-4xl font-serif font-black tracking-tight ${strong}`}>
                    {isForever
                        ? (en ? `${name}'s light is forever` : `La luz de ${name} es para siempre`)
                        : (en ? `Keep ${name}'s light shining` : `Mantén encendida la luz de ${name}`)}
                </h2>
                {gestures > 0 && (
                    <p className={`text-base sm:text-lg italic ${muted}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {en
                            ? `${gestures} ${gestures === 1 ? 'person has' : 'people have'} already left a gesture of love on their altar.`
                            : `${gestures} ${gestures === 1 ? 'gesto de cariño ya acompaña' : 'gestos de cariño ya acompañan'} su altar.`}
                    </p>
                )}
            </div>

            <div className={`grid gap-6 items-start ${!offers.length ? 'max-w-xl mx-auto' : stacked ? 'max-w-4xl mx-auto' : 'lg:grid-cols-[minmax(0,340px)_1fr]'}`}>
                {/* ── Estado del plan ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`rounded-[2rem] border p-6 sm:p-7 shadow-xl backdrop-blur-xl ${card}`}
                >
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${muted}`}>{en ? 'Current plan' : 'Plan actual'}</p>
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${isForever ? 'from-amber-400 to-orange-300' : 'from-sky-400 to-indigo-400'}`}>
                            {isForever ? <InfinityIcon size={22} /> : <Heart size={20} />}
                        </div>
                        <p className={`text-2xl font-serif font-bold ${strong}`}>{en ? `${current.name} plan` : `Plan ${current.name}`}</p>
                    </div>

                    {/* Vigencia */}
                    {isForever ? (
                        <div className={`rounded-2xl px-4 py-3 mb-6 text-sm ${isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>
                            ✨ {en ? 'No expiration date. Their altar stays open forever.' : 'Sin fecha de vencimiento. Su altar queda abierto para siempre.'}
                        </div>
                    ) : expiryLabel && (
                        <div className={`rounded-2xl px-4 py-3 mb-6 text-sm flex items-start gap-2 ${
                            isExpired
                                ? (isDark ? 'bg-red-500/10 text-red-200' : 'bg-red-50 text-red-700')
                                : isExpiringSoon
                                    ? (isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800')
                                    : (isDark ? 'bg-slate-700/40 text-slate-300' : 'bg-slate-50 text-slate-600')
                        }`}>
                            {isExpired || isExpiringSoon ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Clock size={16} className="mt-0.5 shrink-0" />}
                            <span>
                                {isExpired
                                    ? (en ? `Expired on ${expiryLabel}. Visitors see a renewal notice.` : `Venció el ${expiryLabel}. Quienes lo visitan ven un aviso de renovación.`)
                                    : (en
                                        ? `Active until ${expiryLabel} · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
                                        : `Activo hasta el ${expiryLabel} · ${daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`}`)}
                            </span>
                        </div>
                    )}

                    {/* Uso */}
                    <div className="space-y-4">
                        {usage.map(u => {
                            const unlimited = u.limit >= UNLIMITED;
                            const pct = unlimited || u.limit <= 0 ? 0 : Math.min(100, Math.round((u.used / u.limit) * 100));
                            const full = !unlimited && u.limit > 0 && u.used >= u.limit;
                            return (
                                <div key={u.label}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className={muted}>{u.label}</span>
                                        <span className={`font-semibold tabular-nums ${full ? (isDark ? 'text-red-300' : 'text-red-600') : strong}`}>
                                            {u.used} / {unlimited ? '∞' : u.limit}
                                        </span>
                                    </div>
                                    <div className={`h-2 rounded-full overflow-hidden ${track}`}>
                                        <div
                                            className={`h-full rounded-full ${full ? 'bg-red-400' : 'bg-gradient-to-r from-sky-400 to-indigo-400'}`}
                                            style={{ width: unlimited ? '100%' : `${pct}%`, opacity: unlimited ? 0.35 : 1 }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {isForever && (
                        <a
                            href={whatsappLink(en
                                ? `Hi, I'm from ${petName}'s family (memorial ID: ${uuid}). I have a question.`
                                : `Hola, soy de la familia de ${petName} (ID del memorial: ${uuid}). Tengo una consulta.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-colors ${isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700/50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                            <MessageCircle size={16} /> {en ? 'Need help? Write to us' : '¿Necesitas ayuda? Escríbenos'}
                        </a>
                    )}
                </motion.div>

                {/* ── Mejoras disponibles ── */}
                {offers.length > 0 && (
                    <div className={`grid gap-5 ${stacked ? 'md:grid-cols-3 pt-3' : 'md:grid-cols-2'}`}>
                        {offers.map((p, i) => {
                            const { Icon, gradient } = PLAN_STYLE[p.id];
                            const highlight = p.id === 'eterno';
                            const renewal = isRenewal(p.id);
                            const gains = gainsFor(p.id);
                            return (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 * i }}
                                    className={`relative flex flex-col rounded-[2rem] border p-6 sm:p-7 shadow-xl backdrop-blur-xl ${
                                        highlight
                                            ? (isDark ? 'bg-slate-900/70 border-amber-400/50 shadow-amber-500/10' : 'bg-white border-amber-300 shadow-amber-100')
                                            : card
                                    } ${highlight ? 'order-first md:order-none' : ''}`}
                                >
                                    {highlight && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 shadow-md">
                                            {en ? 'Recommended' : 'Recomendado'}
                                        </span>
                                    )}

                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${gradient}`}>
                                            <Icon size={18} />
                                        </div>
                                        <h3 className={`text-xl font-serif font-bold ${strong}`}>
                                            {renewal
                                                ? (en ? 'Extend 1 year' : 'Extender 1 año')
                                                : isReactivation(p.id)
                                                    ? (en ? `Renew ${p.name}` : `Renovar ${p.name}`)
                                                    : (en ? `${p.name} plan` : `Plan ${p.name}`)}
                                        </h3>
                                    </div>

                                    <p className={`text-sm italic mb-5 ${muted}`} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem' }}>
                                        {renewal
                                            ? (en ? 'Add 12 months to their current validity.' : 'Suma 12 meses a su vigencia actual.')
                                            : concept[p.id]}
                                    </p>

                                    <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                                        <span className={`whitespace-nowrap text-4xl font-serif font-bold ${highlight ? (isDark ? 'text-amber-300' : 'text-amber-600') : strong}`}>
                                            {p.price} USD
                                        </span>
                                        <span className={`text-sm ${muted}`}>{p.period}</span>
                                    </div>
                                    <p className={`text-xs mb-5 ${muted}`}>
                                        {highlight
                                            ? (en ? 'Less than 2 years of the yearly plan' : 'Menos que 2 años del plan anual')
                                            : renewal && extendedLabel
                                                ? (en ? `New validity: until ${extendedLabel}` : `Nueva vigencia: hasta el ${extendedLabel}`)
                                                : p.note}
                                    </p>

                                    {gains.length > 0 && (
                                        <ul className="space-y-2.5 mb-6 flex-1">
                                            {gains.map(g => (
                                                <li key={g} className={`flex items-start gap-2.5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    <Check size={16} className={`mt-0.5 shrink-0 ${highlight ? 'text-amber-500' : 'text-sky-500'}`} />
                                                    <span>{g}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <a
                                        href={whatsappLink(waText(p.id, p.name, p.price, p.period))}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`mt-auto w-full inline-flex items-center justify-center gap-2 min-h-[48px] py-3.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 ${
                                            highlight
                                                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
                                                : (isDark ? 'bg-slate-700/70 text-white hover:bg-slate-700' : 'bg-sky-50 text-sky-800 hover:bg-sky-100')
                                        }`}
                                    >
                                        <MessageCircle size={16} />
                                        {renewal
                                            ? (en ? 'Extend by WhatsApp' : 'Extender por WhatsApp')
                                            : highlight
                                                ? (en ? 'Make it eternal' : 'Hacerlo eterno')
                                                : isReactivation(p.id)
                                                    ? (en ? 'Renew by WhatsApp' : 'Renovar por WhatsApp')
                                                    : (en ? `Choose ${p.name}` : `Elegir ${p.name}`)}
                                    </a>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {offers.length > 0 && (
                <p className={`text-center text-xs sm:text-sm mt-8 ${muted}`}>
                    {en
                        ? 'Prices in USD. A person from our team will help you by WhatsApp to arrange the payment and apply the change.'
                        : 'Precios en USD. Una persona del equipo te atiende por WhatsApp para coordinar el pago y aplicar el cambio.'}
                </p>
            )}
        </section>
    );
}
