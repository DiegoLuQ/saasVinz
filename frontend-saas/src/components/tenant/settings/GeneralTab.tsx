import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Globe, Building2, Phone, Mail, MapPin, Camera, Image as ImageIcon, Palette, Settings, RefreshCcw, Save, FileCheck } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTheme } from '@/app/(tenant)/tenant/context/ThemeContext';
import { apiRequest } from '@/lib/tenant/api';
import { authHeader } from '@/lib/auth/token';
import { useQueryClient } from '@tanstack/react-query';
import { usePolar } from '@/hooks/usePolar';
import { FormInput, FormSelect, SelectOption } from './FormField';

interface GeneralTabProps {
    bootstrapTenant: any;
    billingInfo: any;
    onNavigateToBilling: () => void;
    setDeactivateModalOpen: (open: boolean) => void;
}

export function GeneralTab({ bootstrapTenant, billingInfo, onNavigateToBilling, setDeactivateModalOpen }: GeneralTabProps) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { themeMode, setThemeMode, colorScheme, setColorScheme } = useTheme();
    const { openPortal } = usePolar();

    const [generalInfo, setGeneralInfo] = useState({
        name: '',
        rut: '',
        website: '',
        email: '',
        phone: '',
        address: '',
        region: '',
        city: '',
        country: 'Chile',
        slug: '',
        status: 'active',
        monthly_price: 0,
        timezone: 'America/Santiago',
        logo_url: '',
        subscription_status: 'active',
        polar_customer_id: '',
        polar_cancel_at_period_end: false
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (bootstrapTenant) {
            setGeneralInfo({
                name: bootstrapTenant.name || '',
                rut: (bootstrapTenant as any).rut || '',
                website: (bootstrapTenant as any).social_media?.website || '',
                email: (bootstrapTenant as any).email || '',
                phone: (bootstrapTenant as any).phone || '',
                address: (bootstrapTenant as any).address || '',
                region: (bootstrapTenant as any).region || '',
                city: (bootstrapTenant as any).city || '',
                country: (bootstrapTenant as any).country || 'Chile',
                slug: bootstrapTenant.slug || '',
                status: bootstrapTenant.status || 'active',
                monthly_price: (bootstrapTenant as any).monthly_price || 0,
                timezone: bootstrapTenant.timezone || 'America/Santiago',
                logo_url: bootstrapTenant.logo_url || '',
                subscription_status: bootstrapTenant.subscription_status || 'active',
                polar_customer_id: (bootstrapTenant as any).polar_customer_id || '',
                polar_cancel_at_period_end: (bootstrapTenant as any).polar_cancel_at_period_end || false
            });
        }
    }, [bootstrapTenant]);

    const countryIso = useMemo(
        () => Country.getAllCountries().find(c => c.name === generalInfo.country)?.isoCode || '',
        [generalInfo.country]
    );
    const stateIso = useMemo(
        () => (countryIso ? State.getStatesOfCountry(countryIso).find(s => s.name === generalInfo.region)?.isoCode || '' : ''),
        [countryIso, generalInfo.region]
    );

    const countryOptions: SelectOption[] = useMemo(
        () => Country.getAllCountries().map(c => ({ value: c.name, label: c.name })),
        []
    );
    const regionOptions: SelectOption[] = useMemo(
        () => (countryIso ? State.getStatesOfCountry(countryIso).map(s => ({ value: s.name, label: s.name })) : []),
        [countryIso]
    );
    const cityOptions: SelectOption[] = useMemo(
        () => (countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso).map(c => ({ value: c.name, label: c.name })) : []),
        [countryIso, stateIso]
    );
    const timezoneOptions: SelectOption[] = useMemo(
        () => Intl.supportedValuesOf('timeZone').map(tz => ({ value: tz, label: tz })),
        []
    );

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formDataToUpload = new FormData();
        formDataToUpload.append('file', file);

        try {
            const isServer = typeof window === 'undefined';
            const API_URL = !isServer ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
            const response = await fetch(`${API_URL}/api/internal/tenants/upload-logo`, {
                method: 'POST',
                headers: { ...authHeader() },
                body: formDataToUpload
            });

            if (!response.ok) throw new Error('Error al subir el logo');
            const data = await response.json();

            setGeneralInfo(prev => ({ ...prev, logo_url: data.logo_url }));
            showToast('Logo actualizado correctamente', 'success');
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        } catch (err: any) {
            showToast(err.message || 'Error al subir el logo', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveGeneral = async () => {
        try {
            await apiRequest('/api/internal/tenants/me', {
                method: 'PATCH',
                body: JSON.stringify({
                    name: generalInfo.name,
                    email: generalInfo.email,
                    phone: generalInfo.phone,
                    address: generalInfo.address,
                    region: generalInfo.region,
                    city: generalInfo.city,
                    country: generalInfo.country,
                    timezone: generalInfo.timezone,
                    social_media: { website: generalInfo.website }
                })
            });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            showToast('Configuración guardada exitosamente', 'success');
        } catch (err: any) {
            showToast('Error al guardar configuración', 'error');
        }
    };

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="flex justify-end">
                <button
                    onClick={handleSaveGeneral}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-95">
                    <Save size={20} />
                    GUARDAR CAMBIOS
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
                <div className="space-y-8">
                    <div className="border-b border-white/5 pb-4 mb-2">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Shield className="text-primary" size={24} />
                            Información de la Empresa
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Datos básicos e identificación del sistema</p>
                    </div>

                    <FormInput
                        label="Razón Social / Nombre"
                        value={generalInfo.name}
                        onChange={(name) => setGeneralInfo({ ...generalInfo, name })}
                    />

                    <FormInput
                        label="Slug Identificador"
                        value={generalInfo.slug}
                        readOnly
                        prefix="/"
                    />

                    <p className="text-[11px] text-muted-foreground ml-1 flex items-center gap-1.5">
                        <FileCheck size={12} className="text-primary/60" />
                        El RUT y los datos para el certificado se editan en la pestaña <strong className="text-white/70">Certificados</strong>.
                    </p>
                </div>

                <div className="space-y-8">
                    <div className="border-b border-white/5 pb-4 mb-2">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Globe className="text-primary" size={24} />
                            Suscripción y Estado
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Visualización de plan y facturación</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em] ml-1">Estado de Cuenta</label>
                        <div className="flex items-center">
                            <div className={`px-6 py-4 rounded-2xl border font-bold text-lg w-full bg-[#0a192f]/50 border-white/5 flex items-center justify-between shadow-inner ${generalInfo.status === 'active' ? 'text-emerald-400 border-emerald-500/20' :
                                generalInfo.status === 'pending' ? 'text-yellow-400 border-yellow-500/20' :
                                    generalInfo.status === 'suspended' ? 'text-red-400 border-red-500/20' :
                                        'text-white/40 border-white/10'
                                }`}>
                                <span>
                                    {generalInfo.status === 'active' ? 'Activo ✅' :
                                        generalInfo.status === 'pending' ? 'Pendiente ⏳' :
                                            generalInfo.status === 'suspended' ? 'Suspendido ⚠️' :
                                                'Inactivo ❌'}
                                </span>
                                <span className="text-[10px] uppercase tracking-widest opacity-40 font-black">Sólo Lectura</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em] ml-1">Plan Actual</label>
                        <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all">
                            <div className="flex flex-col">
                                <span className={`text-2xl font-black tracking-tighter ${(() => {
                                    const plan = billingInfo?.subscription_plan?.name?.toUpperCase() || 'FREE';
                                    if (plan.includes('FREE')) return 'text-yellow-400';
                                    if (plan.includes('NORMAL')) return 'text-blue-400';
                                    if (plan.includes('PRO')) return 'text-orange-400';
                                    if (plan.includes('ULTRA')) return 'text-emerald-400';
                                    return 'text-white';
                                })()}`}>
                                    {billingInfo?.subscription_plan?.name || 'FREE'}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Suscripción Activa</span>
                                </div>
                            </div>
                            <button
                                onClick={onNavigateToBilling}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group-hover:bg-primary group-hover:border-primary"
                            >
                                <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500 text-white" />
                                <span className="text-xs font-black uppercase tracking-wider text-white">Gestionar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-10 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormInput
                        label="Email Corporativo"
                        icon={Mail}
                        type="email"
                        value={generalInfo.email}
                        onChange={(email) => setGeneralInfo({ ...generalInfo, email })}
                    />

                    <FormInput
                        label="Teléfono Soporte"
                        icon={Phone}
                        value={generalInfo.phone}
                        placeholder="+56 9 1234 5678"
                        onChange={(phone) => setGeneralInfo({ ...generalInfo, phone })}
                    />

                    <FormInput
                        label="Dirección Física"
                        icon={Building2}
                        value={generalInfo.address}
                        placeholder="Calle, Número, Oficina"
                        onChange={(address) => setGeneralInfo({ ...generalInfo, address })}
                    />

                    <FormSelect
                        label="País"
                        icon={Globe}
                        value={generalInfo.country}
                        placeholder="Selecciona País"
                        options={countryOptions}
                        onChange={(country) => setGeneralInfo({ ...generalInfo, country, region: '', city: '' })}
                    />

                    <FormSelect
                        label="Región / Estado"
                        icon={MapPin}
                        value={generalInfo.region}
                        placeholder="Selecciona Región"
                        options={regionOptions}
                        disabled={!generalInfo.country}
                        onChange={(region) => setGeneralInfo({ ...generalInfo, region, city: '' })}
                    />

                    <FormSelect
                        label="Ciudad / Comuna"
                        icon={MapPin}
                        value={generalInfo.city}
                        placeholder="Selecciona Ciudad"
                        options={cityOptions}
                        disabled={!generalInfo.region}
                        onChange={(city) => setGeneralInfo({ ...generalInfo, city })}
                    />
                </div>
            </div>

            <div className="pt-6">
                <FormSelect
                    label="Zona Horaria"
                    icon={Globe}
                    value={generalInfo.timezone}
                    options={timezoneOptions}
                    onChange={(timezone) => setGeneralInfo({ ...generalInfo, timezone })}
                />
            </div>

            <div className="pt-10 border-t border-white/5">
                <div className="flex items-center gap-3 mb-8">
                    <ImageIcon className="text-primary" size={24} />
                    <h3 className="text-xl font-bold">Identidad Visual</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="glass-card p-8 rounded-[2rem] border-white/5 flex flex-col items-center justify-center gap-6 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative">
                            {generalInfo.logo_url ? (
                                <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary/20 bg-white/5 p-2 shadow-2xl">
                                    <img
                                        src={generalInfo.logo_url}
                                        alt="Logo"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-32 h-32 rounded-3xl bg-white/5 flex items-center justify-center border-2 border-dashed border-white/10">
                                    <ImageIcon size={40} className="text-white/10" />
                                </div>
                            )}

                            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all z-10">
                                <Camera size={20} />
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>

                        <div className="text-center">
                            <p className="font-bold text-white mb-1">Logo Corporativo</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Fondo transparente recomendado</p>
                        </div>

                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-bold text-white uppercase tracking-widest">Subiendo...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card p-6 rounded-2xl border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Palette size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Tema Visual</p>
                                    <p className="text-[10px] text-white/40">Personaliza la interfaz</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1">Modo de Pantalla</label>
                                <div className="grid grid-cols-3 gap-2 p-1 bg-black/20 rounded-xl font-bold">
                                    <button
                                        onClick={() => setThemeMode('auto')}
                                        className={`py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer ${themeMode === 'auto' ? 'bg-primary text-white font-black' : 'text-white/40 hover:bg-white/5'}`}
                                    >
                                        AUTO
                                    </button>
                                    <button
                                        onClick={() => setThemeMode('light')}
                                        className={`py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer ${themeMode === 'light' ? 'bg-primary text-white font-black' : 'text-white/40 hover:bg-white/5'}`}
                                    >
                                        CLARO
                                    </button>
                                    <button
                                        onClick={() => setThemeMode('dark')}
                                        className={`py-2 px-3 rounded-lg text-[10px] transition-all cursor-pointer ${themeMode === 'dark' ? 'bg-primary text-white font-black' : 'text-white/40 hover:bg-white/5'}`}
                                    >
                                        OSCURO
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-white/5">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1">Esquema de Color</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'esmeralda', name: 'Esmeralda', color: '#10b981' },
                                        { id: 'oceano', name: 'Océano', color: '#0ea5e9' },
                                        { id: 'atardecer', name: 'Atardecer', color: '#fb923c' },
                                        { id: 'oro', name: 'Oro', color: '#facc15' },
                                        { id: 'monocromo', name: 'Monocromo', color: '#ffffff' },
                                        { id: 'turquesa', name: 'Turquesa', color: '#14b8a6' }
                                    ].map((scheme) => (
                                        <button
                                            key={scheme.id}
                                            onClick={() => setColorScheme(scheme.id as any)}
                                            className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer text-center ${
                                                colorScheme === scheme.id
                                                    ? 'bg-primary/10 border-primary text-white'
                                                    : 'bg-black/10 border-white/5 text-white/40 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <div
                                                className="w-4.5 h-4.5 rounded-full border border-white/10 shadow-sm"
                                                style={{ backgroundColor: scheme.color }}
                                            />
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider">{scheme.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div className={`glass-card rounded-[2.5rem] p-10 mt-10 border-red-500/20 ${generalInfo.polar_cancel_at_period_end ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5'}`}>
                <h3 className={`text-xl font-bold ${generalInfo.polar_cancel_at_period_end ? 'text-emerald-400' : 'text-red-400'}`}>
                    {generalInfo.polar_cancel_at_period_end ? 'Resumen de Suscripción' : 'Zona Peligrosa'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    {generalInfo.polar_cancel_at_period_end
                        ? 'Tu renovación está desactivada pero aún tienes acceso.'
                        : 'Acciones que no pueden deshacerse fácilmente.'}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="font-bold">
                            {generalInfo.polar_cancel_at_period_end ? 'Reactivar Suscripción' : 'Desactivar Renovación'}
                        </p>
                        <p className="text-[11px] text-muted-foreground sm:pr-4">
                            {generalInfo.polar_cancel_at_period_end
                                ? 'Anula la cancelación y mantén tu plan sin interrupciones.'
                                : 'Oculta tu marca en memoriales y cancela cobros futuros de Polar.sh.'}
                        </p>
                    </div>
                    {generalInfo.polar_cancel_at_period_end ? (
                        <button
                            onClick={() => {
                                if (generalInfo.polar_customer_id) {
                                    openPortal(generalInfo.polar_customer_id);
                                } else {
                                    onNavigateToBilling();
                                }
                            }}
                            className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-bold text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap">
                            <RefreshCcw size={14} />
                            GESTIONAR / REACTIVAR
                        </button>
                    ) : (
                        <button
                            onClick={() => setDeactivateModalOpen(true)}
                            className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all whitespace-nowrap">
                            DESACTIVAR MI CUENTA
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
