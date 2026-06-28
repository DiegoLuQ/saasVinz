import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, RotateCcw, Lock } from 'lucide-react';
import { BILLING_CYCLES } from './types';

interface CycleAndDateFormProps {
    cycle: string;
    endDate: string;
    status: string;
    isDateManual: boolean;
    autoEndDateProjection: Date | null;
    onCycleChange: (value: string) => void;
    onDateChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onResetAutoDate: () => void;
}

export default function CycleAndDateForm({
    cycle,
    endDate,
    status,
    isDateManual,
    autoEndDateProjection,
    onCycleChange,
    onDateChange,
    onStatusChange,
    onResetAutoDate
}: CycleAndDateFormProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
        >
            <div className="p-8 border-b border-white/10">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <Clock size={24} className="text-blue-400" />
                    Ciclo y Vigencia
                </h2>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                        Periodo de Facturación
                    </label>
                    <div className="space-y-2">
                        {BILLING_CYCLES.map(c => (
                            <label
                                key={c.value}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/10"
                            >
                                <input
                                    type="radio"
                                    name="billing_cycle"
                                    value={c.value}
                                    checked={cycle === c.value}
                                    onChange={(e) => onCycleChange(e.target.value)}
                                    className="accent-primary w-4 h-4"
                                />
                                <span className="text-sm font-medium text-white">{c.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] uppercase font-black text-white/30 block tracking-[0.15em]">
                                Fecha de Término (Vencimiento)
                            </label>
                            {isDateManual && (
                                <span className="flex items-center gap-1 text-[9px] font-black text-amber-400 uppercase tracking-widest">
                                    <Lock size={10} /> Manual
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-mono font-bold outline-none focus:border-blue-500 transition-all"
                            />
                        </div>

                        {isDateManual && autoEndDateProjection && (
                            <button
                                type="button"
                                onClick={onResetAutoDate}
                                className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wide"
                            >
                                <RotateCcw size={12} />
                                Restaurar cálculo automático ({autoEndDateProjection.toLocaleDateString()})
                            </button>
                        )}

                        {!isDateManual && autoEndDateProjection && (
                            <p className="mt-2 text-[10px] text-blue-400/80 font-medium">
                                Proyección automática según ciclo: {autoEndDateProjection.toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                            Estado de Facturación
                        </label>
                        <select
                            value={status}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
                        >
                            <option value="active">Activo (Al día)</option>
                            <option value="pending">Pendiente de Pago</option>
                            <option value="overdue_blocked">Vencido (Bloqueado)</option>
                        </select>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
