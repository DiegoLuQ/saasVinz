"use client";

import React, { useState } from 'react';
import { Loader2, Plus, Users, ChevronDown } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { useSaveCustomer, Customer } from '@/hooks/useCustomers';
import { regions } from '@/lib/tenant/chile-data';
import SearchableSelect from '@/components/tenant/SearchableSelect';

const COUNTRY_CODES = [
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+34', country: 'España', flag: '🇪🇸' },
    { code: '+1', country: 'USA', flag: '🇺🇸' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
];

interface QuickCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerCreated?: (customer: Customer) => void;
}

export default function QuickCustomerModal({
    isOpen,
    onClose,
    onCustomerCreated,
}: QuickCustomerModalProps) {
    const saveCustomerMutation = useSaveCustomer();
    const [isSaving, setIsSaving] = useState(false);

    const [countryCode, setCountryCode] = useState('+56');
    const [localPhone, setLocalPhone] = useState('');

    const [formData, setFormData] = useState<Partial<Customer>>({
        rut: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        region: '',
        city: '',
        country: 'Chile',
    });

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        setLocalPhone(raw);
        setFormData(prev => ({
            ...prev,
            phone: raw ? `${countryCode} ${raw}` : '',
        }));
    };

    const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        setCountryCode(code);
        setFormData(prev => ({
            ...prev,
            phone: localPhone ? `${code} ${localPhone}` : '',
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim()) return;

        setIsSaving(true);
        try {
            const res = await saveCustomerMutation.mutateAsync({
                customer: formData,
                isEdit: false,
            });
            setIsSaving(false);
            if (onCustomerCreated && res) {
                onCustomerCreated(res);
            }
            // Reset form
            setFormData({
                rut: '',
                name: '',
                email: '',
                phone: '',
                address: '',
                region: '',
                city: '',
                country: 'Chile',
            });
            setLocalPhone('');
            onClose();
        } catch (error) {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nuevo Cliente Rápido"
            maxWidth="max-w-xl"
            zIndex="z-[350]"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-2">
                    <Users className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">
                        Registra los datos del nuevo tutor/propietario. Al guardar, quedará asignado de inmediato.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            RUT / DNI
                        </label>
                        <input
                            type="text"
                            placeholder="12.345.678-9"
                            value={formData.rut || ''}
                            onChange={e => setFormData({ ...formData, rut: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Nombre Completo <span className="text-primary">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: María González"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            placeholder="ejemplo@correo.com"
                            value={formData.email || ''}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Teléfono
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={countryCode}
                                onChange={handleCountryCodeChange}
                                className="px-2 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary outline-none text-xs"
                            >
                                {COUNTRY_CODES.map(c => (
                                    <option key={c.code + c.country} value={c.code}>
                                        {c.flag} {c.code}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                placeholder="9 1234 5678"
                                value={localPhone}
                                onChange={handlePhoneChange}
                                className="flex-1 px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Dirección
                    </label>
                    <input
                        type="text"
                        placeholder="Av. Providencia 123, Depto 45"
                        value={formData.address || ''}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Región
                        </label>
                        <select
                            value={formData.region || ''}
                            onChange={e => {
                                setFormData({
                                    ...formData,
                                    region: e.target.value,
                                    city: '',
                                });
                            }}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary outline-none text-sm"
                        >
                            <option value="">Selecciona una región</option>
                            {regions.map(r => (
                                <option key={r.value} value={r.label}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Comuna / Ciudad
                        </label>
                        <select
                            value={formData.city || ''}
                            disabled={!formData.region}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl focus:border-primary outline-none text-sm disabled:opacity-50"
                        >
                            <option value="">Selecciona una comuna</option>
                            {regions
                                .find(r => r.label === formData.region)
                                ?.communes.map((c: string) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-medium transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || !formData.name?.trim()}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Guardar Cliente
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
