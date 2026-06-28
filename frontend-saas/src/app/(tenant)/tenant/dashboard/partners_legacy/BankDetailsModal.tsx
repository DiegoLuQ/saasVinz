"use client";

import React, { useState, useEffect } from 'react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { Loader2, Landmark, CheckCircle2 } from 'lucide-react';

interface BankDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    partner: any;
}

const CHILEAN_BANKS = [
    "Banco de Chile / Edwards",
    "Banco de Crédito e Inversiones (BCI)",
    "Banco Estado",
    "Banco Santander",
    "Banco Itaú CORPBANCA",
    "Banco BICE",
    "Banco Scotiabank",
    "Banco Security",
    "Banco Falabella",
    "Banco Ripley",
    "Banco Consorcio",
    "Banco Internacional",
    "HSBC Bank",
    "Tenpo",
    "Mercado Pago",
];

const ACCOUNT_TYPES = [
    "Vista",
    "Cuenta Corriente",
    "Chequera Electronica",
    "Otro",
];

export default function BankDetailsModal({ isOpen, onClose, onSuccess, partner }: BankDetailsModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        banco_nombre: '',
        banco_tipo_cuenta: 'Cuenta Corriente',
        banco_numero_cuenta: '',
    });

    useEffect(() => {
        if (partner) {
            setFormData({
                banco_nombre: partner.banco_nombre || '',
                banco_tipo_cuenta: partner.banco_tipo_cuenta || 'Cuenta Corriente',
                banco_numero_cuenta: partner.banco_numero_cuenta || '',
            });
        }
    }, [partner, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiRequest(`/api/internal/partners/${partner.id_partner}`, {
                method: 'PATCH',
                body: JSON.stringify(formData)
            });

            showToast('Datos bancarios actualizados correctamente', 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Error al guardar datos bancarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!partner) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Datos Bancarios del Partner">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                    <Landmark size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-white uppercase text-xs">{partner.nombre_clinica}</h3>
                    <p className="text-[10px] text-emerald-400 font-bold tracking-widest">{partner.rut_clinica}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Nombre del Banco</label>
                    <div className="relative group">
                        <input
                            list="chilean-banks"
                            value={formData.banco_nombre}
                            onChange={(e) => setFormData({ ...formData, banco_nombre: e.target.value })}
                            placeholder="Escribe o selecciona un banco..."
                            className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            required
                        />
                        <datalist id="chilean-banks">
                            {CHILEAN_BANKS.map(bank => (
                                <option key={bank} value={bank} />
                            ))}
                        </datalist>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo de Cuenta</label>
                        <select
                            value={formData.banco_tipo_cuenta}
                            onChange={(e) => setFormData({ ...formData, banco_tipo_cuenta: e.target.value })}
                            className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none cursor-pointer appearance-none"
                            required
                        >
                            {ACCOUNT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Número de Cuenta</label>
                        <input
                            type="text"
                            value={formData.banco_numero_cuenta}
                            onChange={(e) => setFormData({ ...formData, banco_numero_cuenta: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="00-000-0000"
                            className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/5 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        Guardar Datos Bancarios
                    </button>
                </div>
            </form>
        </Modal>
    );
}
