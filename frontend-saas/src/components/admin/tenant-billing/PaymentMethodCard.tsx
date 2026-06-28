import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, History } from 'lucide-react';

interface PaymentMethodCardProps {
    method: string;
    onChange: (method: string) => void;
}

export default function PaymentMethodCard({ method, onChange }: PaymentMethodCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
        >
            <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-black text-white flex items-center gap-3">
                    <DollarSign size={20} className="text-green-400" />
                    Último Pago
                </h2>
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                        Método registrado
                    </label>
                    <select
                        value={method}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-3 text-white font-medium outline-none focus:border-green-500 transition-colors"
                    >
                        <option value="transfer">Transferencia Bancaria</option>
                        <option value="card">Tarjeta de Crédito/Débito</option>
                        <option value="cash">Efectivo</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
                <div className="bg-white/5 p-4 rounded-xl flex items-start gap-3">
                    <History size={20} className="text-white/40 mt-1" />
                    <div>
                        <p className="text-white text-sm font-bold">Historial de Pagos</p>
                        <p className="text-white/40 text-xs mt-1">
                            La auditoría de pagos se mostrará aquí cuando se registren transacciones automáticamente.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
