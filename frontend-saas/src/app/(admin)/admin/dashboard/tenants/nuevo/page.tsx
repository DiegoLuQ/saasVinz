"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    ArrowLeft,
    CheckCircle,
    Loader2,
    Globe,
    Mail,
    Lock,
    Briefcase,
    Zap,
    ShieldCheck,
    Phone,
    MapPin,
    Image,
    X,
    AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { SOUTH_AMERICA_COUNTRIES, SOUTH_AMERICA_CITIES, CHILE_REGIONS_COMUNAS } from '@/lib/geo-data';

export default function NewTenantPage() {
    const router = useRouter();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingPlans, setFetchingPlans] = useState(true);
    const [error, setError] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [success, setSuccess] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);

    const LS_KEY = 'new_tenant_draft';

    const defaultForm = {
        name: '',
        slug: '',
        rut: '',
        email: '',
        admin_password: '',
        phone: '',
        address: '',
        city: '',
        region: '',
        country: 'Chile',
        logo_url: '',
        plan: 'FREE',
        subscription_plan_id: '',
        status: 'active',
        pending_reason: ''
    };

    const [formData, setFormData] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm;
        } catch {
            return defaultForm;
        }
    });

    // Detect initial draft
    useEffect(() => {
        setHasDraft(!!localStorage.getItem(LS_KEY));
    }, []);

    // Persist draft on every change
    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(formData));
        setHasDraft(true);
    }, [formData]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setFetchingPlans(true);
                const data = await apiRequest('/api/internal/creator/plans');
                setPlans(data);
                if (data.length > 0 && !formData.subscription_plan_id) {
                    const freePlan = data.find((p: any) => p.name === 'FREE');
                    if (freePlan) {
                        setFormData((prev: any) => ({ ...prev, subscription_plan_id: freePlan.id }));
                    }
                }
            } catch (err) {
                console.error('Error fetching plans:', err);
            } finally {
                setFetchingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const handleSlugChange = (name: string) => {
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setFormData((prev: any) => ({ ...prev, name, slug }));
    };

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setFormData((prev: any) => ({ ...prev, [field]: e.target.value }));

    const isChile = formData.country === 'Chile';
    const availableComunas = isChile && formData.region ? CHILE_REGIONS_COMUNAS[formData.region] ?? [] : [];
    const availableCities = !isChile && formData.country ? SOUTH_AMERICA_CITIES[formData.country] ?? [] : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const payload = {
                ...formData,
                subscription_plan_id: formData.subscription_plan_id ? parseInt(formData.subscription_plan_id.toString()) : null
            };

            await apiRequest('/api/internal/creator/tenants', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            localStorage.removeItem(LS_KEY);
            setHasDraft(false);
            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al crear la empresa');
            setShowErrorModal(true);
            setLoading(false);
        }
    };

    const inputCls = "w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-bold";
    const inputPlCls = "w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-bold";

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group mb-4"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold uppercase tracking-widest">Volver al Dashboard</span>
            </button>

            <header className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/20">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight">Nueva Empresa</h1>
                            <p className="text-white/40 font-medium">Configura una nueva instancia de negocio en la plataforma.</p>
                        </div>
                    </div>
                    {hasDraft && (
                        <button
                            type="button"
                            onClick={() => { localStorage.removeItem(LS_KEY); setFormData(defaultForm); setHasDraft(false); }}
                            className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors"
                        >
                            Limpiar borrador
                        </button>
                    )}
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Identidad del Negocio */}
                <section className="glass-card rounded-[2.5rem] border border-white/5 p-10 space-y-8">
                    <div className="flex items-center gap-3 text-primary">
                        <Globe size={20} />
                        <h2 className="text-lg font-black uppercase tracking-widest italic">Identidad del Negocio</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nombre Comercial</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej: Crematorio San José"
                                value={formData.name}
                                onChange={(e) => handleSlugChange(e.target.value)}
                                className={inputCls}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Slug / URL Personalizada</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-mono text-sm">/</span>
                                <input
                                    required
                                    type="text"
                                    placeholder="mi-crematorio"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">RUT Empresa</label>
                            <input
                                type="text"
                                placeholder="Ej: 18.899.479-2"
                                value={formData.rut}
                                onChange={(e) => {
                                    let value = e.target.value.replace(/[.-]/g, '');
                                    value = value.replace(/[^0-9kK]/g, '');
                                    if (value.length > 0) {
                                        const dv = value.slice(-1);
                                        let cuerpo = value.slice(0, -1);
                                        let result = '';
                                        while (cuerpo.length > 3) {
                                            result = '.' + cuerpo.slice(-3) + result;
                                            cuerpo = cuerpo.slice(0, -3);
                                        }
                                        result = cuerpo + result;
                                        value = result + (result ? '-' : '') + dv;
                                    }
                                    setFormData({ ...formData, rut: value.toUpperCase() });
                                }}
                                className={inputCls}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">URL Logo (opcional)</label>
                            <div className="relative">
                                <Image className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={formData.logo_url}
                                    onChange={set('logo_url')}
                                    className={inputPlCls}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Ubicación y Contacto */}
                <section className="glass-card rounded-[2.5rem] border border-white/5 p-10 space-y-8">
                    <div className="flex items-center gap-3 text-sky-400">
                        <MapPin size={20} />
                        <h2 className="text-lg font-black uppercase tracking-widest italic">Ubicación y Contacto</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Teléfono */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    type="tel"
                                    placeholder="+56 9 1234 5678"
                                    value={formData.phone}
                                    onChange={set('phone')}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* País */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">País</label>
                            <select
                                value={formData.country}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, country: e.target.value, region: '', city: '' }))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-bold appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-[#0a0f18]">Seleccionar País</option>
                                {SOUTH_AMERICA_COUNTRIES.map(c => (
                                    <option key={c} value={c} className="bg-[#0a0f18]">{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Región (solo Chile) */}
                        {isChile && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Región</label>
                                <select
                                    value={formData.region}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, region: e.target.value, city: '' }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-[#0a0f18]">Seleccionar Región</option>
                                    {Object.keys(CHILE_REGIONS_COMUNAS).map(r => (
                                        <option key={r} value={r} className="bg-[#0a0f18]">{r}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Comuna (Chile) o Ciudad (otro país) */}
                        {isChile ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                                    Comuna {!formData.region && <span className="text-white/20 normal-case">(selecciona región primero)</span>}
                                </label>
                                <select
                                    value={formData.city}
                                    onChange={set('city')}
                                    disabled={!formData.region}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-bold appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <option value="" className="bg-[#0a0f18]">Seleccionar Comuna</option>
                                    {availableComunas.map((c, i) => (
                                        <option key={`${i}-${c}`} value={c} className="bg-[#0a0f18]">{c}</option>
                                    ))}
                                </select>
                            </div>
                        ) : formData.country ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Ciudad</label>
                                <select
                                    value={formData.city}
                                    onChange={set('city')}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-[#0a0f18]">Seleccionar Ciudad</option>
                                    {availableCities.map((c, i) => (
                                        <option key={`${i}-${c}`} value={c} className="bg-[#0a0f18]">{c}</option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        {/* Dirección */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Dirección</label>
                            <input
                                type="text"
                                placeholder="Ej: Av. Libertador Bernardo O'Higgins 1234"
                                value={formData.address}
                                onChange={set('address')}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-bold"
                            />
                        </div>
                    </div>
                </section>

                {/* Admin User Provisioning */}
                <section className="glass-card rounded-[2.5rem] border border-white/5 p-10 space-y-8">
                    <div className="flex items-center gap-3 text-emerald-400">
                        <ShieldCheck size={20} />
                        <h2 className="text-lg font-black uppercase tracking-widest italic">Acceso Administrador</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Email Principal (Login)</label>
                            <div className="relative">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    required
                                    type="email"
                                    placeholder="admin@empresa.com"
                                    value={formData.email}
                                    onChange={set('email')}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Contraseña Inicial</label>
                            <div className="relative">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="admin123"
                                    value={formData.admin_password}
                                    onChange={set('admin_password')}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-bold"
                                />
                            </div>
                            <p className="text-[10px] text-white/30 ml-1 italic">El usuario podrá cambiarla tras el primer inicio de sesión.</p>
                        </div>
                    </div>
                </section>

                {/* Plan & Status */}
                <section className="glass-card rounded-[2.5rem] border border-white/5 p-10 space-y-8">
                    <div className="flex items-center gap-3 text-amber-400">
                        <Zap size={20} />
                        <h2 className="text-lg font-black uppercase tracking-widest italic">Plan y Estado</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Plan de Suscripción</label>
                            <div className="relative">
                                <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                <select
                                    required
                                    value={formData.subscription_plan_id}
                                    onChange={set('subscription_plan_id')}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 px-6 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all font-black appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-[#0a0f18]">Seleccionar Plan</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id} className="bg-[#0a0f18]">
                                            {p.name} — ${p.price.toLocaleString()} /mes
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Estado de Activación</label>
                            <select
                                value={formData.status}
                                onChange={set('status')}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all font-black appearance-none cursor-pointer"
                            >
                                <option value="active" className="bg-[#0a0f18]">ACTIVO ✅</option>
                                <option value="pending" className="bg-[#0a0f18]">PENDIENTE ⏳</option>
                                <option value="suspended" className="bg-[#0a0f18]">SUSPENDIDO ⚠️</option>
                                <option value="inactive" className="bg-[#0a0f18]">INACTIVO ❌</option>
                            </select>
                        </div>
                    </div>

                    {formData.status !== 'active' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Razón del Estado (Interno)</label>
                            <textarea
                                placeholder="Indica por qué la cuenta está en este estado..."
                                value={formData.pending_reason}
                                onChange={set('pending_reason')}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all font-medium min-h-[100px]"
                            />
                        </div>
                    )}
                </section>

                {success && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                        <CheckCircle size={20} />
                        <span className="text-sm font-bold uppercase tracking-tight">Empresa creada con éxito. Redirigiendo...</span>
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-bold rounded-2xl transition-all uppercase tracking-widest text-xs"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={loading || fetchingPlans}
                        type="submit"
                        className="px-10 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-xs"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Building2 size={20} />}
                        {loading ? 'Creando...' : 'Finalizar Registro'}
                    </button>
                </div>
            </form>

            {/* Modal de Error */}
            {showErrorModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setShowErrorModal(false)}
                >
                    <div
                        className="glass-card relative w-full max-w-md rounded-[2rem] border border-red-500/20 bg-[#0a0f18] p-8 space-y-6 shadow-2xl animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setShowErrorModal(false)}
                            className="absolute right-5 top-5 text-white/30 hover:text-white transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-red-500/10 rounded-full text-red-400 border border-red-500/20">
                                <AlertTriangle size={36} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white tracking-tight">No se pudo crear la empresa</h3>
                                <p className="text-sm text-white/60 font-medium leading-relaxed">
                                    {error || 'Ocurrió un error inesperado. Inténtalo nuevamente.'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowErrorModal(false)}
                            className="w-full px-8 py-4 bg-red-500/90 hover:bg-red-500 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
