import React, { useState, useEffect, useMemo } from 'react';
import { formatRut } from '@/lib/formatters';
import { ChevronDown, MessageCircle, Phone, Sparkles, MapPin } from 'lucide-react';
import { Country, State, City } from 'country-state-city';

export interface OwnerData {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    /** Comuna opcional (solo este nivel de localidad pide al cliente) */
    commune: string;
    /** País del crematorio, no se muestra al cliente — se inyecta en submit */
    country?: string;
    /** Región/ciudad del crematorio, no se muestra al cliente — se inyecta en submit */
    region?: string;
    rut?: string;
    comments?: string;
    veterinary?: string;
    service_code?: string;
    contactPreference?: 'whatsapp' | 'phone' | 'any' | '';
}

interface Props {
    data: OwnerData;
    updateData: (data: Partial<OwnerData>) => void;
    errors: Record<string, string>;
    tenantSlug: string;
    /** Si el formulario viene desde una veterinaria, ocultamos código de servicio */
    hideServiceCode?: boolean;
    /** País del crematorio (para filtrar comunas) */
    tenantCountry?: string;
    /** Región del crematorio (para filtrar comunas) */
    tenantRegion?: string;
}

const COUNTRY_CODES = [
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+53', country: 'Cuba', flag: '🇨🇺' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
    { code: '+34', country: 'España', flag: '🇪🇸' },
    { code: '+1', country: 'USA/Canadá', flag: '🇺🇸' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
    { code: '+507', country: 'Panamá', flag: '🇵🇦' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+1', country: 'Puerto Rico', flag: '🇵🇷' },
    { code: '+1', country: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
];

const CONTACT_OPTIONS = [
    { value: 'whatsapp' as const, label: 'WhatsApp', Icon: MessageCircle },
    { value: 'phone' as const, label: 'Llamada', Icon: Phone },
    { value: 'any' as const, label: 'Cualquiera', Icon: Sparkles },
];

// Feature flag: pausar campo "Código de Servicio" hasta que vuelva a ser necesario.
// Cambiar a `true` para reactivarlo en el formulario público.
const SHOW_SERVICE_CODE = false;

export default function OwnerInfoStep({ data, updateData, errors, tenantSlug, hideServiceCode, tenantCountry, tenantRegion }: Props) {
    const [countryCode, setCountryCode] = useState('+56');
    const [localPhone, setLocalPhone] = useState('');
    const [partners, setPartners] = useState<{ id: number; name: string; slug: string }[]>([]);

    const countryIso = useMemo(() => {
        const country = Country.getAllCountries().find(c => c.name === (tenantCountry || 'Chile'));
        return country ? country.isoCode : 'CL';
    }, [tenantCountry]);

    const availableRegions = useMemo(() => {
        return State.getStatesOfCountry(countryIso);
    }, [countryIso]);

    // Comunas filtradas por la región seleccionada
    const availableCommunes = useMemo(() => {
        const selectedRegion = data.region || tenantRegion;
        if (!selectedRegion) return [];
        const state = State.getStatesOfCountry(countryIso).find(
            s => s.name === selectedRegion || s.isoCode === selectedRegion
        );
        if (!state) return [];
        return City.getCitiesOfState(countryIso, state.isoCode);
    }, [countryIso, data.region, tenantRegion]);

    // Inicializar región por defecto si está vacía
    useEffect(() => {
        if (!data.region && tenantRegion) {
            updateData({ region: tenantRegion });
        }
    }, [tenantRegion, data.region, updateData]);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const response = await fetch(`/api/public/partners/${tenantSlug}`);
                if (response.ok) {
                    const result = await response.json();
                    setPartners(result);
                }
            } catch (err) {
                console.error('Error fetching partners:', err);
            }
        };
        if (tenantSlug) fetchPartners();
    }, [tenantSlug]);

    // Parse el teléfono inicial al montar
    useEffect(() => {
        if (data.phone) {
            const matchingCode = COUNTRY_CODES.find(c => data.phone.startsWith(c.code));
            if (matchingCode) {
                setCountryCode(matchingCode.code);
                setLocalPhone(data.phone.replace(matchingCode.code, '').trim());
            } else if (!localPhone) {
                setLocalPhone(data.phone);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateData({ rut: formatRut(e.target.value) });
    };

    const handleLocalPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
        setLocalPhone(value);
        updateData({ phone: `${countryCode} ${value}` });
    };

    const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCode = e.target.value;
        setCountryCode(newCode);
        updateData({ phone: `${newCode} ${localPhone}` });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-3">Información de contacto</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">Estamos aquí para acompañarte y coordinar cada detalle.</p>
            </div>

            <div className="form-card space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Nombre Completo *</label>
                    <input
                        type="text"
                        value={data.fullName}
                        onChange={(e) => updateData({ fullName: e.target.value.slice(0, 50) })}
                        className={`input-emotional ${errors.fullName ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                        placeholder="Ingresa tu nombre"
                        maxLength={50}
                    />
                    {errors.fullName && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.fullName}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">RUT (Opcional)</label>
                    <input
                        type="text"
                        value={data.rut || ''}
                        onChange={handleRutChange}
                        className="input-emotional"
                        placeholder="Ej: 12.345.678-9"
                        maxLength={13}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Email *</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => updateData({ email: e.target.value.slice(0, 50) })}
                            className={`input-emotional ${errors.email ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                            placeholder="tu@email.com"
                            maxLength={50}
                        />
                        {errors.email && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Teléfono *</label>
                        <div className="flex gap-2">
                            <div className="relative w-28 shrink-0">
                                <select
                                    value={countryCode}
                                    onChange={handleCountryCodeChange}
                                    className="w-full input-emotional appearance-none pr-8 cursor-pointer text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950"
                                    style={{ paddingRight: '1.5rem' }}
                                >
                                    {COUNTRY_CODES.map((c) => (
                                        <option key={c.country} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <input
                                type="tel"
                                value={localPhone}
                                onChange={handleLocalPhoneChange}
                                className={`flex-1 input-emotional ${errors.phone ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                                placeholder="9 1234 5678"
                                maxLength={9}
                            />
                        </div>
                        {errors.phone && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.phone}</p>}
                    </div>
                </div>

                {/* Preferencia de contacto */}
                <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1 mb-3">¿Cómo prefieres que te contactemos?</label>
                    <div className="grid grid-cols-3 gap-3">
                        {CONTACT_OPTIONS.map(opt => {
                            const isSelected = data.contactPreference === opt.value;
                            const Icon = opt.Icon;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateData({ contactPreference: opt.value })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${isSelected
                                            ? 'border-sky-500/50 bg-sky-50/50 shadow-sm dark:bg-sky-950/20 dark:border-sky-500/30'
                                            : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900/10 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <Icon size={18} className={isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'} />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-sky-700 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="form-card">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                        <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Lugar de Retiro</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">¿Dónde se encuentra ahora tu mascota?</p>
                    </div>
                </div>
                
                <input
                    type="text"
                    value={data.veterinary || ''}
                    onChange={(e) => updateData({ veterinary: e.target.value.slice(0, 100) })}
                    className="input-emotional"
                    placeholder="Ej: Mi domicilio, Clínica Veterinaria Andes, etc."
                    maxLength={100}
                />
            </div>

            <div className="form-card space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                            <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Dirección de Entrega</h3>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">¿Dónde llevaremos las cenizas?</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Calle y Número *</label>
                            <input
                                type="text"
                                value={data.address}
                                onChange={(e) => updateData({ address: e.target.value.slice(0, 70) })}
                                className={`input-emotional ${errors.address ? 'border-red-500/50 focus:ring-red-500/10' : ''}`}
                                placeholder="Ej: Av. Providencia 1234"
                                maxLength={70}
                            />
                            {errors.address && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-tight ml-2">! {errors.address}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Región *</label>
                            <div className="relative">
                                <select
                                    value={data.region || ''}
                                    onChange={(e) => {
                                        updateData({ region: e.target.value, commune: '' });
                                    }}
                                    className="input-emotional appearance-none cursor-pointer text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 pr-9"
                                >
                                    <option value="">Selecciona...</option>
                                    {availableRegions.map((r: any) => (
                                        <option key={r.isoCode} value={r.name}>{r.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Comuna (Opcional)</label>
                            {availableCommunes.length > 0 ? (
                                <div className="relative">
                                    <select
                                        value={data.commune || ''}
                                        onChange={(e) => updateData({ commune: e.target.value })}
                                        className="input-emotional appearance-none cursor-pointer text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 pr-9"
                                    >
                                        <option value="">Selecciona...</option>
                                        {availableCommunes.map((c: any) => (
                                            <option key={c.name} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={data.commune || ''}
                                    onChange={(e) => updateData({ commune: e.target.value.slice(0, 50) })}
                                    className="input-emotional"
                                    placeholder="Ej: Providencia"
                                    maxLength={50}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {SHOW_SERVICE_CODE && !hideServiceCode && (
                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800/50">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Código de Servicio (Opcional)</label>
                        <input
                            type="text"
                            value={data.service_code || ''}
                            onChange={(e) => updateData({ service_code: e.target.value.toUpperCase() })}
                            className="input-emotional text-center tracking-widest font-mono uppercase border-dashed"
                            placeholder="PLAN-123"
                            maxLength={20}
                        />
                    </div>
                )}

                <div className="pt-4 border-t border-slate-50 dark:border-slate-800/50">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 mb-2">Comentarios / Referencias (Opcional)</label>
                    <textarea
                        value={data.comments || ''}
                        onChange={(e) => updateData({ comments: e.target.value.slice(0, 250) })}
                        className="input-emotional min-h-[120px] py-4"
                        placeholder="Ej: Referencias para llegar, torre, departamento o timbre."
                        maxLength={250}
                    />
                </div>
            </div>
        </div>
    );
}
