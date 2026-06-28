import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle } from 'lucide-react';
import { getPlanStyle, type PlanInfo } from './types';

interface PlanSelectionCardProps {
    plans: PlanInfo[];
    selectedPlanId: string | number;
    currentPlanName: string;
    onSelect: (plan: PlanInfo) => void;
    children?: React.ReactNode;
}

function PlanSelectionCard({
    plans,
    selectedPlanId,
    currentPlanName,
    onSelect,
    children
}: PlanSelectionCardProps) {
    const headerStyle = getPlanStyle(currentPlanName);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
        >
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <Shield size={24} className="text-primary" />
                    Selección de Plan
                </h2>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${headerStyle.bg} ${headerStyle.color}`}>
                    Plan Actual: {currentPlanName}
                </div>
            </div>

            <div className="p-8">
                <label className="text-[10px] uppercase font-black text-white/30 mb-4 block tracking-[0.15em]">
                    Plan de Suscripción
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map(plan => {
                        const isSelected = selectedPlanId == plan.id;
                        const pStyle = getPlanStyle(plan.name);
                        return (
                            <div
                                key={plan.id}
                                onClick={() => onSelect(plan)}
                                className={`cursor-pointer rounded-2xl p-6 border-2 transition-all relative overflow-hidden group ${
                                    isSelected
                                        ? `${pStyle.border} ${pStyle.bg} shadow-lg shadow-${plan.name.toLowerCase()}-500/10 ring-1 ring-white/10`
                                        : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                                }`}
                            >
                                {isSelected && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                                )}
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <h3 className={`text-lg font-black mb-1 ${isSelected ? 'text-white' : 'text-white/60'}`}>
                                            {plan.name}
                                        </h3>
                                        <p className="text-white/40 text-xs font-medium">
                                            Hasta {plan.max_pets} mascotas/mes
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xl font-bold font-mono ${pStyle.color}`}>
                                            ${plan.price.toLocaleString()}
                                        </div>
                                        <span className="text-[10px] text-white/30 uppercase">Mensual</span>
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle size={16} className={pStyle.color} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {children}
        </motion.div>
    );
}

export default memo(PlanSelectionCard);
