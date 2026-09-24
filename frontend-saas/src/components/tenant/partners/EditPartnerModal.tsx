import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { updatePartnerLink, PartnerLink, PartnerLinkUpdateData } from '@/lib/tenant/api';
import { formatRut } from '@/lib/formatters';
import { Building2, Percent, Phone, Mail, MapPin, Hash, CheckCircle2, Loader2, Navigation, Activity, Globe } from 'lucide-react';
import { SOUTH_AMERICA_COUNTRIES, CHILE_REGIONS_COMUNAS } from '@/lib/geo-data';

interface EditPartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    partnerLink: PartnerLink | null;
}

export default function EditPartnerModal({ isOpen, onClose, onSuccess, partnerLink }: EditPartnerModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<PartnerLinkUpdateData>({
        name: '',
        rut: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        region: 'Metropolitana de Santiago',
        country: 'Chile',
        tipo_comision: 'porcentaje',
        porcentaje_comision: 10,
        status: 'active',
    });

    useEffect(() => {
        if (partnerLink) {
            setForm({
                name: partnerLink.veterinary?.name || '',
                rut: partnerLink.veterinary?.rut || '',
                phone: partnerLink.veterinary?.phone || '',
                email: partnerLink.veterinary?.email || '',
                address: partnerLink.veterinary?.address || '',
                city: partnerLink.veterinary?.city || '',
                region: partnerLink.veterinary?.region || 'Metropolitana de Santiago',
                country: partnerLink.veterinary?.country || 'Chile',
                tipo_comision: partnerLink.tipo_comision || 'porcentaje',
                porcentaje_comision: partnerLink.porcentaje_comision ?? 0,
                status: partnerLink.status || 'active',
            });
            setError(null);
        }
    }, [partnerLink, isOpen]);

    const handleChange = (field: keyof PartnerLinkUpdateData, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatRut(e.target.value).slice(0, 12);
        handleChange('rut', formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partnerLink) return;

        if (!form.name?.trim()) {
            setError('El nombre de la veterinaria es obligatorio.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await updatePartnerLink(partnerLink.id, {
                ...form,
                name: form.name.trim(),
                rut: form.rut?.trim() || undefined,
                phone: form.phone?.trim() || undefined,
                email: form.email?.trim() || undefined,
                address: form.address?.trim() || undefined,
                city: form.city?.trim() || undefined,
                region: form.region?.trim() || undefined,
                country: form.country?.trim() || 'Chile',
                porcentaje_comision: Number(form.porcentaje_comision) || 0,
                status: form.status,
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el partner');
        } finally {
            setLoading(false);
        }
    };

    if (!partnerLink) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Datos del Partner">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                        {error}
                    </div>
                )}

                {/* Nombre de la Veterinaria */}
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
                            value={form.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* RUT y Teléfono */}
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

                {/* Correo Electrónico */}
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

                {/* Ubicación: País y Región */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            País
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            <select
                                value={form.country || 'Chile'}
                                onChange={(e) => {
                                    const newCountry = e.target.value;
                                    handleChange('country', newCountry);
                                    if (newCountry === 'Chile' && !form.region) {
                                        handleChange('region', 'Metropolitana de Santiago');
                                    }
                                }}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                            >
                                {SOUTH_AMERICA_COUNTRIES.map(c => (
                                    <option key={c} value={c} className="bg-[#121827] text-white">
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            Región
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            {(!form.country || form.country === 'Chile') ? (
                                <select
                                    value={form.region || ''}
                                    onChange={(e) => {
                                        handleChange('region', e.target.value);
                                        handleChange('city', '');
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                                >
                                    <option value="" className="bg-[#121827] text-gray-400">Selecciona Región</option>
                                    {Object.keys(CHILE_REGIONS_COMUNAS).map(r => (
                                        <option key={r} value={r} className="bg-[#121827] text-white">
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Estado / Región / Provincia"
                                    value={form.region || ''}
                                    onChange={(e) => handleChange('region', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Comuna / Ciudad y Dirección */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            Ciudad / Comuna
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            {(!form.country || form.country === 'Chile') && form.region && CHILE_REGIONS_COMUNAS[form.region] ? (
                                <select
                                    value={form.city || ''}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                                >
                                    <option value="" className="bg-[#121827] text-gray-400">Selecciona Comuna</option>
                                    {CHILE_REGIONS_COMUNAS[form.region].map(com => (
                                        <option key={com} value={com} className="bg-[#121827] text-white">
                                            {com}
                                        </option>
                                    ))}
                                    {form.city && !CHILE_REGIONS_COMUNAS[form.region].includes(form.city) && (
                                        <option value={form.city} className="bg-[#121827] text-white">
                                            {form.city}
                                        </option>
                                    )}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Ej: Providencia, Santiago"
                                    value={form.city || ''}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                                />
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                            Dirección (Calle, Número / Sucursal)
                        </label>
                        <div className="relative">
                            <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Ej: Av. Los Leones 1234, Local 2"
                                value={form.address || ''}
                                onChange={(e) => handleChange('address', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Comisión y Estado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Comisión pactada */}
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Percent size={14} /> Comisión (%)
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={form.porcentaje_comision ?? 0}
                                onChange={(e) => handleChange('porcentaje_comision', e.target.value)}
                                className="w-full px-4 py-2 bg-black/40 border border-emerald-500/30 rounded-xl text-emerald-300 font-black text-base outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-sm">%</span>
                        </div>
                        <p className="text-[10px] text-gray-400">Porcentaje aplicado por orden derivada.</p>
                    </div>

                    {/* Estado del Vínculo */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity size={14} className="text-indigo-400" /> Estado del Vínculo
                            </span>
                        </div>
                        <select
                            value={form.status || 'active'}
                            onChange={(e) => handleChange('status', e.target.value)}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white font-medium text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        >
                            <option value="active" className="bg-[#0f172a] text-emerald-400">Activo (Habilitado)</option>
                            <option value="pending" className="bg-[#0f172a] text-amber-400">Pendiente</option>
                            <option value="rejected" className="bg-[#0f172a] text-rose-400">Rechazado / Pausado</option>
                        </select>
                        <p className="text-[10px] text-gray-400">Controla si el partner puede registrar y ver órdenes.</p>
                    </div>
                </div>

                {/* Botones de acción */}
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-indigo-900/30"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </Modal>
    );
}
