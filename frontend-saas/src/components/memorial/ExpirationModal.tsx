import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Crown, Star, Check } from 'lucide-react';
import { PaymentInterface } from '@/components/payments/PaymentInterface';

interface ExpirationModalProps {
    isOpen: boolean;
    petName: string;
    memorialId: string;
    onClose?: () => void;
    locale?: 'es' | 'en';
    status?: string;
}

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

    let title = isEn ? 'A Space in Heaven' : 'Un Espacio en el Cielo';
    let message = isEn
        ? `The memorial for ${petName} is waiting to be renewed. Choose a plan to keep their light shining forever.`
        : `El memorial de ${petName} está esperando ser renovado. Elige un plan para mantener su luz brillando para siempre.`;

    if (status === 'pending') {
        title = isEn ? 'Pending Activation' : 'Pendiente de Activación';
        message = isEn
            ? `The memorial for ${petName} is pending activation. Choose a plan to publish it and share their memory.`
            : `El memorial de ${petName} está pendiente de activación. Elige un plan para publicarlo y compartir su memoria.`;
    } else if (status === 'archived') {
        title = isEn ? 'Memorial Archived' : 'Memorial Archivado';
        message = isEn
            ? `The memorial for ${petName} has been archived. Select a plan to restore it.`
            : `El memorial de ${petName} ha sido archivado. Selecciona un plan para restaurarlo.`;
    }

    // Plan Configuration
    const plans = [
        {
            id: 'NORMAL',
            name: 'Plan Huella',
            priceCLP: '$5.990',
            priceUSD: '7',
            productId: 'PLACEHOLDER_HUELLA_ID',
            concept: isEn ? 'A gesture of love forever.' : 'Un gesto de amor para siempre.',
            features: [
                isEn ? '1 Main Photo' : '1 Fotografía principal',
                isEn ? '1 Special Dedication' : '1 Dedicatoria especial',
                isEn ? 'Space for 5 candles' : 'Espacio para 5 velas'
            ],
            color: 'from-blue-400 to-cyan-300',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            Icon: Heart
        },
        {
            id: 'PRO',
            name: 'Plan Vínculo',
            priceCLP: '$14.990',
            priceUSD: '17',
            productId: '1651066b-559e-4682-a8f1-608e48ff6675',
            concept: isEn ? 'Our stories with yours.' : 'Nuestras historias con la tuya.',
            features: [
                isEn ? 'Gallery of 3 Photos' : 'Galería de 3 Fotos',
                isEn ? 'Space for 21 candles' : 'Espacio para 21 velas',
                isEn ? 'Custom Background' : 'Fondo Personalizado'
            ],
            color: 'from-indigo-400 to-purple-300',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            popular: true,
            Icon: Star
        },
        {
            id: 'ULTRA',
            name: 'Plan Paraíso',
            priceCLP: '$19.990',
            priceUSD: '22',
            productId: 'dd0e2fd6-aae7-4910-8c11-f3033c9462de',
            concept: isEn ? 'The peace of having them always close.' : 'La paz de tenerlos siempre cerca.',
            duration: isEn ? '2 Years' : 'Por 2 años',
            features: [
                isEn ? 'Gallery of 5 Photos' : 'Galería de 5 Fotos',
                isEn ? '3D Altar + Premium Design' : 'Altar 3D + Diseño Premium'
            ],
            color: 'from-amber-400 to-orange-300',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            Icon: Crown
        }
    ];

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
                                {plans.map((plan, idx) => (
                                    <motion.div
                                        key={plan.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + (idx * 0.1) }}
                                        className={`relative group rounded-3xl p-1 bg-[#0f172a] border border-white/10 hover:border-white/20 transition-all duration-300 h-full flex flex-col`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none" />

                                        <div className="relative h-full flex flex-col p-6 md:p-8">
                                            {/* Badge */}
                                            {plan.popular && (
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg border border-white/20">
                                                    {isEn ? 'Most Popular' : 'Más Popular'}
                                                </div>
                                            )}

                                            {/* Icon & Title */}
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${plan.color} shadow-lg text-white`}>
                                                    <plan.Icon size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-medium text-white">{plan.name}</h3>
                                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium opacity-80">
                                                        {(plan as any).duration || (isEn ? '1 Year' : 'Por 1 año')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="mb-6">
                                                <span className="text-4xl font-light text-white tracking-tight">
                                                    {isEn ? `$${plan.priceUSD}` : plan.priceCLP}
                                                </span>
                                            </div>

                                            {/* Concept */}
                                            <p className="text-sm text-slate-400 italic mb-8 border-l-2 border-white/10 pl-4">
                                                "{plan.concept}"
                                            </p>

                                            {/* Features */}
                                            <ul className="space-y-4 mb-8 flex-1">
                                                {plan.features.map((feature, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                                        <span className="leading-tight">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* Action */}
                                            <div className="mt-auto pt-6 border-t border-white/5">
                                                <PaymentInterface
                                                    productId={plan.productId}
                                                    targetResource="memorial"
                                                    targetId={memorialId}
                                                    action={`upgrade_to_${plan.id.toLowerCase()}`}
                                                    buttonText={isEn ? 'Select Plan' : 'Seleccionar Plan'}
                                                    isDark={true}
                                                    variant="default" // Use default variant but styled via CSS if needed
                                                    successUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/success?type=memorial&id=${memorialId}&plan=${plan.id}`}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
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
