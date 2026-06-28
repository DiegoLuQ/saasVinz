import React from 'react';
import {
    Shield,
    AlertTriangle,
    Settings,
    Calendar,
    Mail,
    Phone,
    Building2,
    Globe,
    MapPin,
    ChevronDown
} from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import type { TenantFormData } from './types';

const planColors: Record<string, string> = {
    FREE: 'text-yellow-400',
    NORMAL: 'text-blue-400',
    PRO: 'text-orange-500',
    ULTRA: 'text-emerald-400',
};

const planNames: Record<string, string> = {
    FREE: 'Free',
    NORMAL: 'Normal',
    PRO: 'Pro',
    ULTRA: 'Ultra',
};

const STATUS_REASONS: Record<string, string> = {
    pending: 'Falta de información, pago inicial pendiente o proceso de validación en curso.',
    suspended: 'Falta de pago de cuotas mensuales o sospecha de actividad inusual/fraude.',
    inactive: 'Cuenta inactivada por falta de pago prolongada o solicitud del cliente.'
};

interface TenantGeneralTabProps {
    formData: TenantFormData;
    onChange: (next: TenantFormData) => void;
    tenantBillingEndDate?: string;
    polarSubscriptionId?: string;
    onOpenBilling: () => void;
}

export default function TenantGeneralTab({
    formData,
    onChange,
    tenantBillingEndDate,
    polarSubscriptionId,
    onOpenBilling
}: TenantGeneralTabProps) {
    const update = (patch: Partial<TenantFormData>) => onChange({ ...formData, ...patch });

    const countryIso = Country.getAllCountries().find(c => c.name === formData.country)?.isoCode || '';
    const states = countryIso ? State.getStatesOfCountry(countryIso) : [];
    const stateIso = states.find(s => s.name === formData.region)?.isoCode || '';
    const cities = countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso) : [];

    return (
        <div className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <Shield size={24} className="text-primary animate-pulse" />
                        Información de la Empresa
                    </h2>
                    <p className="text-white/40 text-xs mt-1 font-medium italic">Datos legales y configuración de plataforma</p>
                </div>
            </div>

            <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="group">
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em] group-focus-within:text-primary transition-colors">
                                Razón Social / Nombre
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => update({ name: e.target.value })}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                placeholder="Nombre comercial"
                            />
                        </div>

                        <div className="group">
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                                Slug Identificador
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-mono text-sm">/</span>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-8 text-white outline-none focus:border-primary transition-all font-mono font-bold"
                                />
                            </div>
                        </div>

                        <div className="group border-t border-white/5 pt-6">
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                                RUT Empresa
                            </label>
                            <input
                                type="text"
                                value={formData.rut}
                                onChange={(e) => update({ rut: e.target.value })}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 text-white font-mono outline-none focus:border-primary transition-all"
                                placeholder="12.345.678-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                                Estado de Cuenta
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    onChange({
                                        ...formData,
                                        status: newStatus,
                                        pending_reason: (newStatus !== 'active' && !formData.pending_reason)
                                            ? STATUS_REASONS[newStatus] || ''
                                            : formData.pending_reason
                                    });
                                }}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-primary transition-all font-black"
                            >
                                <option value="active" className="bg-[#0a192f]">Activo ✅</option>
                                <option value="pending" className="bg-[#0a192f]">Pendiente ⏳</option>
                                <option value="inactive" className="bg-[#0a192f]">Inactivo ❌</option>
                                <option value="suspended" className="bg-[#0a192f]">Suspendido ⚠️</option>
                            </select>
                        </div>

                        {formData.status !== 'active' && (
                            <div className="animate-fade-in border-t border-white/5 pt-6">
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                                    Motivo de Estado ({formData.status.toUpperCase()})
                                </label>
                                <textarea
                                    value={formData.pending_reason || ''}
                                    onChange={(e) => update({ pending_reason: e.target.value })}
                                    className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-primary transition-all min-h-[100px]"
                                    placeholder={`Indica el motivo por el cual la cuenta está ${formData.status}...`}
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                                Plan Actual
                            </label>
                            <div className="flex flex-col gap-3">
                                <div className="bg-[#0f2642] border border-white/10 rounded-2xl p-4 flex justify-between items-center group hover:border-white/20 transition-all">
                                    <div>
                                        <span className={`text-lg font-black uppercase ${planColors[formData.plan] || 'text-white'}`}>
                                            {planNames[formData.plan] || formData.plan || 'Free'}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${formData.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-[10px] font-medium text-white/40 uppercase">
                                                Suscripción {formData.status === 'active' ? 'Activa' : 'Inactiva'}
                                            </span>
                                            {tenantBillingEndDate && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                                    <span className="text-[10px] font-bold text-primary/70 uppercase">
                                                        Vence: {new Date(tenantBillingEndDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onOpenBilling}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/5 flex items-center gap-2"
                                    >
                                        <Settings size={14} />
                                        GESTIONAR
                                    </button>
                                </div>
                                <p className="text-[10px] text-white/20 italic pl-1">
                                    Para cambiar el plan o métodos de pago, ve a la sección de Facturación.
                                </p>

                                {polarSubscriptionId && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 mt-4">
                                        <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                Atención: Suscripción de Polar Activa
                                            </p>
                                            <p className="text-[10px] text-white/40 italic leading-relaxed">
                                                Los cambios manuales en el plan o precio pueden ser sobrescritos automáticamente por Polar.sh en el próximo ciclo de cobro. Se recomienda gestionar cambios desde el portal de facturación.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="group pt-6 border-t border-white/5">
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                                    Precio Mensual Personalizado (MRR)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
                                    <input
                                        type="number"
                                        value={formData.monthly_price}
                                        onChange={(e) => update({ monthly_price: parseFloat(e.target.value) })}
                                        className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-8 text-white font-bold outline-none focus:border-primary transition-all"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                                <p className="text-[10px] text-white/20 mt-2 italic">
                                    Este precio prevalece sobre el costo base del plan. Úsalo para descuentos o acuerdos especiales.
                                </p>
                            </div>

                            <div className="group pt-6 border-t border-white/5">
                                <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em]">
                                    Próximo Vencimiento
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                                    <input
                                        type="date"
                                        value={formData.billing_end_date}
                                        onChange={(e) => update({ billing_end_date: e.target.value })}
                                        className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-mono font-bold outline-none focus:border-primary transition-all color-scheme-dark"
                                    />
                                </div>
                                <p className="text-[10px] text-white/20 mt-2 italic">
                                    Al cambiar esta fecha se actualizarán todos los registros de facturación sincronizados.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="group">
                        <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em] group-focus-within:text-primary">
                            Email Corporativo
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => update({ email: e.target.value })}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-primary transition-all"
                                placeholder="admin@empresa.com"
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em] group-focus-within:text-primary">
                            Teléfono de Soporte
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => update({ phone: e.target.value })}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-primary transition-all"
                                placeholder="+56 9 1234 5678"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="group md:col-span-1">
                        <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em] group-focus-within:text-primary">
                            Dirección
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => update({ address: e.target.value })}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-primary transition-all"
                                placeholder="Calle, Número, Oficina"
                            />
                        </div>
                    </div>

                    <div className="group md:col-span-1">
                        <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em] group-focus-within:text-primary">
                            País
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                            <select
                                value={formData.country}
                                onChange={(e) => onChange({ ...formData, country: e.target.value, region: '', city: '' })}
                                className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Selecciona País</option>
                                {Country.getAllCountries().map(c => (
                                    <option key={c.isoCode} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={20} />
                        </div>
                    </div>

                    <div className="group md:col-span-1">
                        <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em] group-focus-within:text-primary">
                            Región / Estado
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                            <select
                                value={formData.region}
                                onChange={(e) => onChange({ ...formData, region: e.target.value, city: '' })}
                                disabled={!formData.country}
                                className={`w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer ${!formData.country ? 'opacity-50' : ''}`}
                            >
                                <option value="">Selecciona Región</option>
                                {states.map(s => (
                                    <option key={s.isoCode} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={20} />
                        </div>
                    </div>

                    <div className="group md:col-span-1">
                        <label className="text-[10px] uppercase font-black text-white/30 mb-2 block tracking-[0.15em] group-focus-within:text-primary">
                            Ciudad / Comuna
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                            <select
                                value={formData.city}
                                onChange={(e) => update({ city: e.target.value })}
                                disabled={!formData.region}
                                className={`w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer ${!formData.region ? 'opacity-50' : ''}`}
                            >
                                <option value="">Selecciona Ciudad</option>
                                {cities.map(city => (
                                    <option key={city.name} value={city.name}>{city.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { planColors, planNames };
