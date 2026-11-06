"use client";

/**
 * Aviso del memorial vencido o pendiente de pago. Es suave y se puede cerrar: el memorial no
 * desaparece; vencido, el backend ya entrega la vista reducida (pocas fotos y mensajes) y al
 * renovar vuelve todo. La renovación es por WhatsApp al precio congelado del memorial
 * (`plan_price`); sin precio congelado (Partner / antiguos) se ofrecen los planes de Vinzer.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Heart, MessageCircle, Sparkles, X } from 'lucide-react';
import { whatsappLink } from '@/lib/memorialLanding';
import { formatPrice, planPeriod, useMemorialPlans } from '@/lib/memorialPlans';

interface ExpirationModalProps {
    isOpen: boolean;
    petName: string;
    memorialId: string;
    onClose?: () => void;
    locale?: 'es' | 'en';
    status?: string;
    /** Plan contratado y precio congelado (renovación al mismo precio) */
    planName?: string | null;
    planPrice?: number | null;
    planCurrency?: string | null;
    planBilling?: string | null;
    validUntil?: string | null;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({
    isOpen,
    petName,
    memorialId,
    onClose,
    locale = 'es',
    status = 'expired',
    planName,
    planPrice,
    planCurrency,
    planBilling,
    validUntil,
}) => {
    const plans = useMemorialPlans();
    const isEn = locale === 'en';
    const pending = status === 'pending';
    const archived = status === 'archived';
    const name = petName || (isEn ? 'your pet' : 'tu mascota');
    const plan = plans.find((p) => p.key === (planName || '').trim().toLowerCase());
    const label = plan?.name || planName || '';
    const hasContract = !!planPrice && planPrice > 0;
    const dateTxt = validUntil
        ? new Date(validUntil).toLocaleDateString(isEn ? 'en-US' : 'es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const action = pending ? (isEn ? 'activate' : 'activar') : (isEn ? 'renew' : 'renovar');
    const waText = (pName: string) => isEn
        ? `Hi, I would like to ${action} the memorial of ${name} (plan ${pName}). Memorial ID: ${memorialId}`
        : `Hola, quiero ${action} el memorial de ${name} (plan ${pName}). ID del memorial: ${memorialId}`;

    const title = pending
        ? (isEn ? 'Almost ready' : 'Casi listo')
        : archived
            ? (isEn ? 'Memorial archived' : 'Memorial archivado')
            : (isEn ? 'This memorial’s period has ended' : 'El periodo de este memorial venció');
    const message = pending
        ? (isEn
            ? `The memorial for ${name} will be published as soon as the payment is confirmed.`
            : `El memorial de ${name} se publicará en cuanto se confirme el pago.`)
        : (isEn
            ? `${name}’s memory is still here. Until it is renewed, only some photos and messages are shown — nothing has been deleted, and renewing brings everything back.`
            : `El recuerdo de ${name} sigue aquí. Mientras se renueva, solo se muestran algunas fotos y mensajes: no se borró nada y al renovarlo vuelve todo.`);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="expiration-title"
                        className="relative my-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a] p-6 text-center text-white shadow-2xl sm:p-8"
                    >
                        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
                        {onClose && (
                            <button type="button" onClick={onClose} aria-label={isEn ? 'Close' : 'Cerrar'}
                                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                                <X size={18} />
                            </button>
                        )}

                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                            {pending ? <Clock className="text-amber-200" size={28} /> : <Sparkles className="text-amber-200" size={28} />}
                        </div>
                        <h2 id="expiration-title" className="mb-3 font-serif text-2xl sm:text-3xl">{title}</h2>
                        <p className="text-sm font-light leading-relaxed text-slate-300 sm:text-base">{message}</p>
                        {!pending && dateTxt && (
                            <p className="mt-2 text-xs text-slate-500">{isEn ? `Ended on ${dateTxt}` : `Venció el ${dateTxt}`}</p>
                        )}

                        <div className="mt-6 space-y-3">
                            {hasContract && label ? (
                                <a href={whatsappLink(waText(label))} target="_blank" rel="noopener noreferrer"
                                    className="flex w-full flex-col items-center justify-center rounded-2xl bg-amber-400 px-4 py-3.5 font-bold text-amber-950 transition-colors hover:bg-amber-300">
                                    <span className="flex items-center gap-2 text-sm">
                                        <MessageCircle size={16} /> {pending ? (isEn ? 'Confirm payment on WhatsApp' : 'Confirmar el pago por WhatsApp') : (isEn ? 'Renew on WhatsApp' : 'Renovar por WhatsApp')}
                                    </span>
                                    <span className="mt-0.5 text-xs font-semibold opacity-80">
                                        {label} · {formatPrice(planPrice!)} {planCurrency || 'USD'} {planPeriod(planBilling || 'yearly', isEn)}
                                        {!pending && (isEn ? ' · same price' : ' · mismo precio')}
                                    </span>
                                </a>
                            ) : (
                                plans.map((p) => (
                                    <a key={p.key} href={whatsappLink(waText(p.name))} target="_blank" rel="noopener noreferrer"
                                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${p.highlight ? 'border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20' : 'border-white/10 hover:bg-white/5'}`}>
                                        <span className="flex items-center gap-2 font-semibold"><Heart size={15} className="text-amber-300" /> {p.name}</span>
                                        <span className="text-xs text-slate-300">{formatPrice(p.price)} {p.currency} {planPeriod(p.billing, isEn)}</span>
                                    </a>
                                ))
                            )}
                            {onClose && !pending && (
                                <button type="button" onClick={onClose}
                                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5">
                                    {isEn ? 'View the memorial' : 'Ver el memorial'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
