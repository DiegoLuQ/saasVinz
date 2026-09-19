import React, { useState } from 'react';
import Modal from '../Modal';
import { quickCreatePartner, QuickPartnerCreateData } from '@/lib/tenant/api';
import { formatRut } from '@/lib/formatters';
import { Building2, Percent, Phone, Mail, MapPin, Hash, CheckCircle2, Loader2, Navigation } from 'lucide-react';

interface QuickCreatePartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function QuickCreatePartnerModal({ isOpen, onClose, onSuccess }: QuickCreatePartnerModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<QuickPartnerCreateData>({
        name: '',
        rut: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        region: '',
        tipo_comision: 'porcentaje',
        porcentaje_comision: 10,
        monto_comision: 0,
    });

    const handleChange = (field: keyof QuickPartnerCreateData, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatRut(e.target.value).slice(0, 12);
        handleChange('rut', formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('El nombre de la veterinaria es obligatorio.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await quickCreatePartner({
                ...form,
                name: form.name.trim(),
                rut: form.rut?.trim() || undefined,
                phone: form.phone?.trim() || undefined,
                email: form.email?.trim() || undefined,
                address: form.address?.trim() || undefined,
                city: form.city?.trim() || undefined,
                region: form.region?.trim() || undefined,
                porcentaje_comision: Number(form.porcentaje_comision) || 0,
            });

            onSuccess();
            onClose();
            // Reset
            setForm({
                name: '',
                rut: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                region: '',
                tipo_comision: 'porcentaje',
                porcentaje_comision: 10,
                monto_comision: 0,
            });
        } catch (err: any) {
            setError(err.message || 'Error al registrar veterinaria');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Nueva Veterinaria / Partner">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                        Nombre de la Veterinaria o Clínica *
                    </label>
                    <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            required
                            placeholder="Ej: Clínica Veterinaria San Patricio"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            RUT / Identificador
                        </label>
                        <div className="relative">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Ej: 76.123.456-7"
                                maxLength={12}
                                value={form.rut || ''}
                                onChange={handleRutChange}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            Teléfono de Contacto
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="tel"
                                placeholder="+56 9 1234 5678"
                                value={form.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            Correo Electrónico
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                placeholder="contacto@veterinaria.cl"
                                value={form.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            Ciudad / Comuna
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Ej: Providencia, Santiago"
                                value={form.city || ''}
                                onChange={(e) => handleChange('city', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                        Dirección (Calle, Número / Sucursal)
                    </label>
                    <div className="relative">
                        <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Ej: Av. Los Leones 1234, Local 2"
                            value={form.address || ''}
                            onChange={(e) => handleChange('address', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Comisión pactada */}
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Percent size={15} /> Comisión Pactada del Crematorio
                        </span>
                        <span className="text-[11px] text-emerald-300 font-medium">Exclusivo de tu crematorio</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">Porcentaje sobre la orden (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={form.porcentaje_comision}
                                    onChange={(e) => handleChange('porcentaje_comision', e.target.value)}
                                    className="w-full px-4 py-2 bg-black/40 border border-emerald-500/30 rounded-xl text-emerald-300 font-black text-base outline-none focus:ring-2 focus:ring-emerald-400"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-sm">%</span>
                            </div>
                        </div>

                        <div className="text-xs text-gray-400 max-w-[200px] pt-4">
                            Se aplicará automáticamente a todas las órdenes derivadas por este partner.
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/30"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Guardar Convenio
                    </button>
                </div>
            </form>
        </Modal>
    );
}
