import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Crown, Star, Check, MessageCircle } from 'lucide-react';
import { getLandingContent, whatsappLink, type PlanId } from '@/lib/memorialLanding';

interface ExpirationModalProps {
    isOpen: boolean;
    petName: string;
    memorialId: string;
    onClose?: () => void;
    locale?: 'es' | 'en';
    status?: string;
}

// Estilo visual por plan; precios, textos y beneficios vienen de la landing
// (lib/memorialLanding.ts) para que el memorial y la landing vendan lo mismo.
const PLAN_STYLE: Record<PlanId, { color: string; Icon: typeof Heart }> = {
    mensual: { color: 'from-blue-400 to-cyan-300', Icon: Heart },
    anual: { color: 'from-indigo-400 to-purple-300', Icon: Star },
    eterno: { color: 'from-amber-400 to-orange-300', Icon: Crown },
};

export const ExpirationModal: React.FC<ExpirationModalProps> = ({
    isOpen,
    petName,
    memorialId,
    onClose,
    locale = 'es',
    status = 'expired'
}) => {
    if (!isOpen) return null;

    const isEn = locale === 'en';
    const { plans } = getLandingContent(locale);

    let title = isEn ? 'A Space in Heaven' : 'Un Espacio en el Cielo';
    let message = isEn
        ? `The memorial for ${petName} is waiting to be renewed. Choose a plan to keep their light shining.`
        : `El memorial de ${petName} está esperando ser renovado. Elige un plan para mantener su luz encendida.`;
    let action = isEn ? 'renew' : 'renovar';

    if (status === 'pending') {
        title = isEn ? 'Pending Activation' : 'Pendiente de Activación';
        message = isEn
            ? `The memorial for ${petName} is almost ready. Choose a plan to publish it and share their memory.`
            : `El memorial de ${petName} está casi listo. Elige un plan para publicarlo y compartir su memoria.`;
        action = isEn ? 'activate' : 'activar';
    } else if (status === 'archived') {
        title = isEn ? 'Memorial Archived' : 'Memorial Archivado';
        message = isEn
            ? `The memorial for ${petName} has been archived. Choose a plan to restore it.`
            : `El memorial de ${petName} ha sido archivado. Elige un plan para restaurarlo.`;
        action = isEn ? 'restore' : 'restaurar';
    }

    // Beneficios por plan tomados de la tabla comparativa (columna = índice del
    // plan): primero los que varían (fotos, velas, permanencia), luego uno incluido.
    // Se omite la primera fila (facturación), que ya se ve en el precio.
    const featuresFor = (idx: number) => {
        const rows = plans.rows.slice(1);
        const varying = rows.filter(row => row.values[idx] !== true);
        const included = rows.filter(row => row.values[idx] === true);
        return [...varying, ...included]
            .slice(0, 4)
            .map(row => (row.values[idx] === true ? row.label : `${row.label}: ${row.values[idx]}`));
    };

    const waText = (planName: string) => isEn
        ? `Hi, I would like to ${action} the memorial of ${petName} with the ${planName} plan. Memorial ID: ${memorialId}`
        : `Hola, quiero ${action} el memorial de ${petName} con el Plan ${planName}. ID del memorial: ${memorialId}`;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-6xl my-auto"
                    >
                        {/* Background Effects */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full -ml-20 -mb-20 pointer-events-none" />

                        <div className="relative z-10 text-center space-y-8">
                            {/* Header */}
                            <div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="w-20 h-20 mx-auto bg-gradient-to-br from-white/10 to-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner mb-6 backdrop-blur-sm"
                                >
                                    <Sparkles className="text-amber-200" size={32} />
                                </motion.div>

                                <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">
                                    {title}
                                </h2>
                                <p className="text-slate-300 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                                    {message}
                                </p>
                            </div>

                            {/* Plans Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                                {plans.list.map((plan, idx) => {
                                    const { color, Icon } = PLAN_STYLE[plan.id];
                                    return (
                                        <motion.div
                                            key={plan.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + (idx * 0.1) }}
                                            className={`relative group rounded-3xl p-1 bg-[#0f172a] border transition-all duration-300 h-full flex flex-col ${plan.highlight ? 'border-amber-400/40 shadow-[0_0_40px_rgba(251,191,36,0.12)]' : 'border-white/10 hover:border-white/20'}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none" />

                                            <div className="relative h-full flex flex-col p-6 md:p-8">
                                                {/* Badge */}
                                                {plan.tag && (
                                                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg border border-white/20 whitespace-nowrap ${plan.highlight ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'}`}>
                                                        {plan.tag}
                                                    </div>
                                                )}

                                                {/* Icon & Title */}
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg text-white`}>
                                                        <Icon size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-medium text-white">{plan.name}</h3>
                                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium opacity-80">
                                                            {plan.note}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div className="mb-6 flex items-baseline gap-2">
                                                    <span className="text-4xl font-light text-white tracking-tight">
                                                        {plan.price} USD
                                                    </span>
                                                    <span className="text-sm text-slate-400">{plan.period}</span>
                                                </div>

                                                {/* Features */}
                                                <ul className="space-y-4 mb-8 flex-1">
                                                    {featuresFor(idx).map((feature, i) => (
                                                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                                            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                                            <span className="leading-tight">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                {/* Action: venta asistida por WhatsApp, igual que la landing */}
                                                <div className="mt-auto pt-6 border-t border-white/5">
                                                    <a
                                                        href={whatsappLink(waText(plan.name))}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${plan.highlight ? 'bg-amber-400 text-amber-950 hover:bg-amber-300' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                                                    >
                                                        <MessageCircle size={16} />
                                                        {plan.cta}
                                                    </a>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {onClose && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 }}
                                    onClick={onClose}
                                    className="text-slate-500 hover:text-white text-xs uppercase tracking-widest transition-colors py-4"
                                >
                                    {isEn ? 'Close Preview' : 'Cerrar Vista Previa'}
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
