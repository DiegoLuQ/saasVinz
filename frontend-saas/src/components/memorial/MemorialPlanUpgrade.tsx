"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Crown, Heart, Infinity as InfinityIcon, MessageCircle, Sparkles, Clock, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { whatsappLink } from '@/lib/memorialLanding';
import { formatPrice, planPeriod, useMemorialPlans, type MemorialPlanFeatures, type MemorialPlanInfo } from '@/lib/memorialPlans';

/**
 * Plan del memorial en la gestión familiar: estado (vigencia y uso) y mejoras reales
 * sobre el plan actual. Precio y límites desde Admin (lib/memorialPlans.ts); la
 * renovación del plan actual se ofrece al precio congelado del memorial. Venta por WhatsApp.
 * Memoriales de cortesía de un crematorio (Partner): se ofrecen los planes Vinzer comparados con
 * sus límites actuales (`currentFeatures`); elegir uno avisa al SuperAdmin
 * (POST /memorials/{uuid}/manage/upgrade-request) y abre WhatsApp. Conserva crematorio y enlace.
 */

const PLAN_STYLE: Record<string, { Icon: typeof Heart; gradient: string }> = {
    recuerdo: { Icon: Heart, gradient: 'from-sky-400 to-cyan-300' },
    eterno: { Icon: Crown, gradient: 'from-indigo-400 to-violet-300' },
    infinito: { Icon: InfinityIcon, gradient: 'from-amber-400 to-orange-300' },
};
const styleOf = (key: string) => PLAN_STYLE[key] || PLAN_STYLE.recuerdo;

export interface MemorialContract {
    price?: number | null;
    currency?: string | null;
    billing?: string | null;
}

interface MemorialPlanUpgradeProps {
    plan: string | null | undefined;
    validUntil: string | null | undefined;
    contract?: MemorialContract;
    photosUsed: number;
    photoLimit: number;
    dedicationsUsed: number;
    dedicationLimit: number;
    gestures: number;
    petName: string;
    uuid: string;
    locale: 'es' | 'en';
    isDark: boolean;
    isFromCrematorium?: boolean;
    /** Límites del plan actual (memorial.plan_features); necesarios para comparar un Partner */
    currentFeatures?: MemorialPlanFeatures | null;
    crematoriumName?: string | null;
    /** PIN de la gestión: registra la solicitud de mejora */
    accessKey?: string;
}

export default function MemorialPlanUpgrade({
    plan, validUntil, contract, photosUsed, photoLimit, dedicationsUsed, dedicationLimit,
    gestures, petName, uuid, locale, isDark, isFromCrematorium, currentFeatures, crematoriumName, accessKey,
}: MemorialPlanUpgradeProps) {
    const en = locale === 'en';
    const plans = useMemorialPlans();
    const key = (plan || '').trim().toLowerCase();
    const currentIdx = plans.findIndex((p) => p.key === key);
    const name = petName || (en ? 'your companion' : 'tu compañero');
    // Memorial de cortesía (Partner u otro plan del crematorio): se compara con sus límites reales
    const courtesy = currentIdx < 0;
    const current: MemorialPlanInfo | null = currentIdx >= 0
        ? plans[currentIdx]
        : (currentFeatures
            ? { key: 'partner', name: en ? 'Courtesy' : 'Cortesía', price: 0, currency: 'USD', billing: 'included', features: currentFeatures }
            : null);
    if (!current || (courtesy && !isFromCrematorium && !currentFeatures)) {
        return null;
    }

    // ── Vigencia ──
    const expiry = validUntil ? new Date(validUntil) : null;
    const daysLeft = expiry && !isNaN(expiry.getTime())
        ? Math.ceil((expiry.getTime() - Date.now()) / 86_400_000)
        : null;
    const isForever = !courtesy && (contract?.billing || current.billing) === 'one_time';
    const isExpired = !isForever && daysLeft !== null && daysLeft < 0;
    const isExpiringSoon = !isForever && daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
    const dateFmt = new Intl.DateTimeFormat(en ? 'en-US' : 'es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const expiryLabel = expiry && !isNaN(expiry.getTime()) ? dateFmt.format(expiry) : null;
    const extendedLabel = expiry && !isNaN(expiry.getTime())
        ? dateFmt.format(new Date(Date.UTC(expiry.getUTCFullYear() + 1, expiry.getUTCMonth(), expiry.getUTCDate())))
        : null;

    // ── Qué ofrecer: renovar el actual (anual, a su precio) + planes superiores ──
    type Offer = { plan: MemorialPlanInfo; renewal: boolean; price: number; currency: string };
    const offers: Offer[] = [];
    if (!isForever && !courtesy) {
        offers.push({
            plan: current, renewal: true,
            price: contract?.price ?? current.price,
            currency: contract?.currency || current.currency,
        });
    }
    plans.slice(currentIdx + 1).forEach((p) => offers.push({ plan: p, renewal: false, price: p.price, currency: p.currency }));
    const stacked = offers.length >= 3;

    type Gain = { label: string; from?: string; to?: string };
    const gainsFor = (o: Offer): Gain[] => {
        const f = o.plan.features;
        const c = current.features;
        const out: Gain[] = [];
        if (o.renewal) {
            out.push({ label: en ? '12 more months for their altar' : '12 meses más para su altar' });
            out.push({ label: en ? 'Same price you signed up for' : 'El mismo precio que contrataste' });
            return out;
        }
        if (o.plan.billing === 'one_time') out.push({ label: en ? 'No expiration date, ever' : 'Sin fecha de vencimiento, nunca' });
        if (f.max_images > photoLimit) out.push({ label: en ? 'Photos' : 'Fotos', from: String(photoLimit), to: String(f.max_images) });
        if (f.max_dedications > dedicationLimit) out.push({ label: en ? 'Messages' : 'Mensajes', from: String(dedicationLimit), to: String(f.max_dedications) });
        if (f.timeline && f.max_timeline > (c.timeline ? c.max_timeline : 0)) {
            out.push(c.timeline
                ? { label: en ? 'Timeline moments' : 'Momentos de su historia', from: String(c.max_timeline), to: String(f.max_timeline) }
                : { label: en ? `Life timeline (${f.max_timeline} moments)` : `Línea de tiempo de su vida (${f.max_timeline} momentos)` });
        }
        if (f.max_melodies > c.max_melodies) out.push({ label: en ? 'Melodies to choose' : 'Melodías a elegir', from: String(c.max_melodies), to: String(f.max_melodies) });
        if (f.qr && !c.qr) out.push({ label: en ? 'Printable QR code' : 'Código QR para imprimir' });
        if (f.max_videos > c.max_videos) out.push({ label: en ? 'A 30-second video' : 'Un video de 30 segundos' });
        if (f.max_voice > c.max_voice) out.push({ label: en ? 'Their voice, 30 seconds' : 'Su voz, 30 segundos' });
        return out;
    };

    const waText = (o: Offer) => {
        const action = o.renewal
            ? (en ? (isExpired ? 'renew' : 'extend by one year') : (isExpired ? 'renovar' : 'extender por un año'))
            : (en ? 'move to' : 'pasar al');
        const price = `${formatPrice(o.price)} ${o.currency} ${planPeriod(o.plan.billing, en)}`;
        if (courtesy) {
            return en
                ? `Hi, I'm from ${petName}'s family. Our memorial was a gift from ${crematoriumName || 'the crematorium'} and we'd like to upgrade it to the ${o.plan.name} plan (${price}). Memorial ID: ${uuid}`
                : `Hola, soy de la familia de ${petName}. Nuestro memorial fue una cortesía de ${crematoriumName || 'el crematorio'} y queremos mejorarlo al Plan ${o.plan.name} (${price}). ID del memorial: ${uuid}`;
        }
        return en
            ? `Hi, I'm from ${petName}'s family. I'd like to ${action} the ${o.plan.name} plan (${price}). Current plan: ${current.name}. Memorial ID: ${uuid}`
            : `Hola, soy de la familia de ${petName}. Quiero ${action} Plan ${o.plan.name} (${price}). Plan actual: ${current.name}. ID del memorial: ${uuid}`;
    };

    // Deja registrada la solicitud para el SuperAdmin (además del WhatsApp); no bloquea el enlace.
    const requestUpgrade = (planKey: string) => {
        if (!accessKey) return;
        fetch(`/api/internal/memorials/${uuid}/manage/upgrade-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access-key': accessKey },
            body: JSON.stringify({ plan: planKey }),
            keepalive: true,
        }).catch(() => undefined);
    };

    // ── Estilos según el tema de la gestión ──
    const card = isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/70 border-white shadow-sky-100/60';
    const muted = isDark ? 'text-slate-400' : 'text-slate-500';
    const strong = isDark ? 'text-slate-100' : 'text-slate-800';
    const track = isDark ? 'bg-slate-700/60' : 'bg-slate-100';

    const usage = [
        { label: en ? 'Photos' : 'Fotos', used: photosUsed, limit: photoLimit },
        { label: en ? 'Messages' : 'Mensajes', used: dedicationsUsed, limit: dedicationLimit },
    ];

    return (
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-20 pt-6">
            {/* Encabezado */}
            <div className="text-center mb-10 space-y-3">
                <span className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                    <Sparkles size={14} /> {en ? 'Their space in heaven' : 'Su espacio en el cielo'}
                </span>
                <h2 className={`text-3xl sm:text-4xl font-serif font-black tracking-tight ${strong}`}>
                    {courtesy
                        ? (en ? `Give ${name}'s memory more room` : `Dale más espacio al recuerdo de ${name}`)
                        : isForever
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

            <div className={`grid gap-6 items-stretch ${!offers.length ? 'max-w-xl mx-auto' : stacked ? 'max-w-4xl mx-auto' : 'lg:grid-cols-[minmax(0,340px)_1fr]'}`}>
                {/* ── Estado del plan ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`flex flex-col rounded-[2rem] border p-6 sm:p-7 shadow-xl backdrop-blur-xl ${card}`}
                >
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${muted}`}>{en ? 'Current plan' : 'Plan actual'}</p>
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${styleOf(current.key).gradient}`}>
                            {React.createElement(styleOf(current.key).Icon, { size: 20 })}
                        </div>
                        <p className={`text-2xl font-serif font-bold ${strong}`}>{en ? `${current.name} plan` : `Plan ${current.name}`}</p>
                    </div>

                    {/* Vigencia */}
                    {courtesy ? (
                        <div className={`rounded-2xl px-4 py-3 mb-6 text-sm ${isDark ? 'bg-slate-700/40 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                            🎁 {en
                                ? `A gift from ${crematoriumName || 'your crematorium'}. Upgrade it whenever you want: you keep everything.`
                                : `Un regalo de ${crematoriumName || 'tu crematorio'}. Puedes mejorarlo cuando quieras: conservas todo.`}
                        </div>
                    ) : isForever ? (
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
                                    ? (en ? `Expired on ${expiryLabel}. Visitors only see part of it until you renew.` : `Venció el ${expiryLabel}. Quienes lo visitan ven solo una parte hasta que renueves.`)
                                    : (en
                                        ? `Active until ${expiryLabel} · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
                                        : `Activo hasta el ${expiryLabel} · ${daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`}`)}
                            </span>
                        </div>
                    )}

                    {/* Uso */}
                    <div className="space-y-4">
                        {usage.map(u => {
                            const pct = u.limit <= 0 ? 0 : Math.min(100, Math.round((u.used / u.limit) * 100));
                            const full = u.limit > 0 && u.used >= u.limit;
                            return (
                                <div key={u.label}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className={muted}>{u.label}</span>
                                        <span className={`font-semibold tabular-nums ${full ? (isDark ? 'text-red-300' : 'text-red-600') : strong}`}>
                                            {u.used} / {u.limit}
                                        </span>
                                    </div>
                                    <div className={`h-2 rounded-full overflow-hidden ${track}`}>
                                        <div
                                            className={`h-full rounded-full ${full ? 'bg-red-400' : 'bg-gradient-to-r from-sky-400 to-indigo-400'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    {u.limit > 0 && (
                                        <p className={`text-xs mt-1 ${full ? (isDark ? 'text-red-300' : 'text-red-600') : muted}`}>
                                            {full
                                                ? (en ? 'Limit reached' : 'Llegaste al límite')
                                                : en
                                                    ? `${u.limit - u.used} left`
                                                    : (u.limit - u.used === 1 ? 'Queda 1' : `Quedan ${u.limit - u.used}`)}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {offers.length > 0 && (
                        <div className={`mt-auto pt-6 text-xs flex items-start gap-2 ${muted}`}>
                            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                            <span>
                                {en
                                    ? 'When you upgrade you keep everything: photos, messages, design and the same link.'
                                    : 'Al mejorar conservas todo: fotos, mensajes, diseño y el mismo enlace.'}
                            </span>
                        </div>
                    )}

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
                        {offers.map((o, i) => {
                            const { Icon, gradient } = styleOf(o.plan.key);
                            const highlight = !o.renewal && !!o.plan.highlight;
                            const gains = gainsFor(o);
                            return (
                                <motion.div
                                    key={`${o.plan.key}-${o.renewal}`}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.1 * i }}
                                    className={`relative flex flex-col rounded-[2rem] border p-6 sm:p-7 shadow-xl backdrop-blur-xl ${
                                        highlight
                                            ? (isDark ? 'bg-slate-900/70 border-amber-400/50 shadow-amber-500/10' : 'bg-white border-amber-300 shadow-amber-100')
                                            : card
                                    }`}
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
                                            {o.renewal
                                                ? (isExpired ? (en ? `Renew ${o.plan.name}` : `Renovar ${o.plan.name}`) : (en ? 'Extend 1 year' : 'Extender 1 año'))
                                                : (en ? `${o.plan.name} plan` : `Plan ${o.plan.name}`)}
                                        </h3>
                                    </div>

                                    {(o.renewal || o.plan.description) && (
                                        <p className={`text-sm italic mb-5 ${muted}`} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem' }}>
                                            {o.renewal ? (en ? 'Add 12 months to their current validity.' : 'Suma 12 meses a su vigencia actual.') : o.plan.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                                        <span className={`whitespace-nowrap text-4xl font-serif font-bold ${highlight ? (isDark ? 'text-amber-300' : 'text-amber-600') : strong}`}>
                                            {formatPrice(o.price)} {o.currency}
                                        </span>
                                        <span className={`text-sm ${muted}`}>{planPeriod(o.plan.billing, en)}</span>
                                    </div>
                                    {o.renewal && extendedLabel && !isExpired && (
                                        <p className={`text-xs mb-5 ${muted}`}>{en ? `New validity: until ${extendedLabel}` : `Nueva vigencia: hasta el ${extendedLabel}`}</p>
                                    )}

                                    {gains.length > 0 && (
                                        <ul className="space-y-2.5 my-5 flex-1">
                                            {gains.map(g => (
                                                <li key={g.label} className={`flex items-center gap-2.5 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    <Check size={16} className={`shrink-0 ${highlight ? 'text-amber-500' : 'text-sky-500'}`} />
                                                    <span className="flex-1">{g.label}</span>
                                                    {g.to && (
                                                        <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                                                            <span className={`line-through ${muted}`}>{g.from}</span>
                                                            <ArrowRight size={12} className={muted} />
                                                            <span className={`font-bold px-2 py-0.5 rounded-md ${
                                                                highlight
                                                                    ? (isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700')
                                                                    : (isDark ? 'bg-sky-500/15 text-sky-300' : 'bg-sky-50 text-sky-700')
                                                            }`}>{g.to}</span>
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <a
                                        href={whatsappLink(waText(o))}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => { if (!o.renewal) requestUpgrade(o.plan.key); }}
                                        className={`mt-auto w-full inline-flex items-center justify-center gap-2 min-h-[48px] py-3.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 ${
                                            highlight
                                                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
                                                : (isDark ? 'bg-slate-700/70 text-white hover:bg-slate-700' : 'bg-sky-50 text-sky-800 hover:bg-sky-100')
                                        }`}
                                    >
                                        <MessageCircle size={16} />
                                        {o.renewal
                                            ? (isExpired ? (en ? 'Renew by WhatsApp' : 'Renovar por WhatsApp') : (en ? 'Extend by WhatsApp' : 'Extender por WhatsApp'))
                                            : (en ? `Choose ${o.plan.name}` : `Elegir ${o.plan.name}`)}
                                    </a>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {offers.length > 0 && (
                <div className={`mt-10 max-w-4xl mx-auto grid gap-3 sm:grid-cols-3 text-xs sm:text-sm ${muted}`}>
                    {[
                        { Icon: MessageCircle, text: en ? 'A real person helps you by WhatsApp' : 'Te atiende una persona real por WhatsApp' },
                        { Icon: Lock, text: en ? 'No automatic charges or hidden fees' : 'Sin cobros automáticos ni costos ocultos' },
                        { Icon: ShieldCheck, text: en ? 'Your price stays the same when you renew' : 'Tu precio se mantiene al renovar' },
                    ].map(({ Icon, text }) => (
                        <div key={text} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 border ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-white bg-white/50'}`}>
                            <Icon size={15} className="shrink-0" />
                            <span>{text}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
