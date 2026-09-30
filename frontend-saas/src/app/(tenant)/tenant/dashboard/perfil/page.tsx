"use client";

import React, { useEffect, useState } from 'react';
import {
    Star,
    User,
    Mail,
    Shield,
    Key,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    Facebook,
    Instagram,
    Upload,
    Phone,
    Globe,
    MessageCircle,
    Store,
    MapPin,
    Share2,
    ChevronRight,
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { DEFAULT_CATALOG_INTRO } from '@/lib/catalogDefaults';
import { getMainRootUrl } from '@/lib/publicUrls';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useQueryClient } from '@tanstack/react-query';
import ImageCropper from '@/components/tenant/ImageCropper';

const formatRUT = (rut: string) => {
    // Remove dots and hyphen
    const value = rut.replace(/\./g, '').replace(/-/g, '');

    if (value.length <= 1) return value;

    // Extract DV
    const dv = value.slice(-1);
    let body = value.slice(0, -1);

    // Format body with dots
    let formattedBody = '';
    while (body.length > 3) {
        formattedBody = '.' + body.slice(-3) + formattedBody;
        body = body.slice(0, -3);
    }
    formattedBody = body + formattedBody;

    return `${formattedBody}-${dv}`;
};

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-');  // Replace multiple - with single -
};

// Secciones del perfil. Las de empresa comparten un mismo formulario/guardado.
type SectionKey = 'cuenta' | 'empresa' | 'contacto' | 'redes' | 'catalogo' | 'seguridad';

interface SectionDef {
    key: SectionKey;
    label: string;
    hint: string;
    icon: React.ElementType;
    adminOnly?: boolean;
}

const SECTIONS: SectionDef[] = [
    { key: 'cuenta', label: 'Mi cuenta', hint: 'Tus datos personales', icon: User },
    { key: 'empresa', label: 'Empresa', hint: 'Logo, nombre y datos legales', icon: Building2, adminOnly: true },
    { key: 'contacto', label: 'Contacto', hint: 'Teléfono, correo y dirección', icon: MapPin, adminOnly: true },
    { key: 'redes', label: 'Redes y reseñas', hint: 'Instagram, Facebook, Google', icon: Share2, adminOnly: true },
    { key: 'catalogo', label: 'Catálogo online', hint: 'Lo que ven las familias', icon: Store, adminOnly: true },
    { key: 'seguridad', label: 'Seguridad', hint: 'Contraseña de acceso', icon: Shield },
];

const TENANT_SECTIONS: SectionKey[] = ['empresa', 'contacto', 'redes', 'catalogo'];

// Estilos compartidos de formulario
const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-muted-foreground';
const inputCls = 'w-full bg-black/20 border border-white/10 rounded-2xl py-3 px-4 text-sm outline-none focus:border-primary/50 transition-colors';
const hintCls = 'text-[11px] text-muted-foreground/70';

function Field({ label, htmlFor, hint, counter, children }: {
    label: React.ReactNode;
    htmlFor?: string;
    hint?: React.ReactNode;
    counter?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={htmlFor} className={`${labelCls} flex items-center gap-1.5`}>{label}</label>
                {counter && <span className="text-[10px] text-muted-foreground/50 tabular-nums">{counter}</span>}
            </div>
            {children}
            {hint && <p className={hintCls}>{hint}</p>}
        </div>
    );
}

function SectionCard({ icon: Icon, title, description, children, footer }: {
    icon: React.ElementType;
    title: string;
    description: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className="glass-card rounded-[2rem] overflow-hidden">
            <div className="flex items-center gap-4 px-6 sm:px-8 py-6 border-b border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={22} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="px-6 sm:px-8 py-6 space-y-6">{children}</div>
            {footer && <div className="px-6 sm:px-8 py-5 border-t border-white/5 bg-black/10">{footer}</div>}
        </div>
    );
}

export default function ProfilePage() {
    const [user, setUser] = useState<{ name: string, email: string, role: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Sección activa (se recuerda en el hash: /dashboard/perfil#catalogo)
    const [active, setActive] = useState<SectionKey>('cuenta');

    // Estado del Tenant
    const [tenant, setTenant] = useState<any>(null);
    const [tenantDirty, setTenantDirty] = useState(false);
    const [tenantSaving, setTenantSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);

    // Image Cropper State
    const [showCropper, setShowCropper] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Estados para cambio de contraseña
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPass, setChangingPass] = useState(false);

    const [showRefreshModal, setShowRefreshModal] = useState(false);
    const [countdown, setCountdown] = useState(3);

    const queryClient = useQueryClient();
    const { data: bootstrapData } = useSessionBootstrap();

    const [initialSlug, setInitialSlug] = useState('');

    const isAdmin = user?.role === 'admin' || user?.role === 'creator';
    const visibleSections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

    useEffect(() => {
        if (bootstrapData) {
            if (!user) {
                setUser(bootstrapData.user);
            }
            if (!tenant) {
                const tenantData = bootstrapData.tenant;
                const defaultSocial = { facebook: '', instagram: '', tiktok: '', whatsapp: '' };

                setTenant({
                    ...tenantData,
                    social_media: {
                        ...defaultSocial,
                        ...(tenantData.social_media || {})
                    }
                });
                setLogoPreview(tenantData.logo_url || null);
                setInitialSlug(tenantData.slug || '');
            }
            setLoading(false);
        }
    }, [bootstrapData]);

    // Sección inicial desde el hash
    useEffect(() => {
        try {
            const hash = window.location.hash.replace('#', '') as SectionKey;
            if (SECTIONS.some(s => s.key === hash)) setActive(hash);
        } catch { /* sin hash */ }
    }, []);

    // Si el rol no puede ver la sección del hash, volver a "Mi cuenta"
    useEffect(() => {
        if (user && !visibleSections.some(s => s.key === active)) setActive('cuenta');
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const goTo = (key: SectionKey) => {
        setActive(key);
        setSuccess('');
        setError('');
        try { window.history.replaceState(null, '', `#${key}`); } catch { /* noop */ }
    };

    const updateTenant = (patch: Record<string, unknown>) => {
        setTenant((t: typeof tenant) => ({ ...t, ...patch }));
        setTenantDirty(true);
    };

    const updateSocial = (patch: Record<string, string>) => {
        setTenant((t: typeof tenant) => ({ ...t, social_media: { ...t.social_media, ...patch } }));
        setTenantDirty(true);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess('');
        setError('');

        try {
            const data = await apiRequest('/api/internal/auth/me', {
                method: 'PATCH',
                body: JSON.stringify({ name: user?.name, email: user?.email }),
            });
            setUser(data);
            localStorage.setItem('saasc_user', JSON.stringify(data));
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            setSuccess('Perfil actualizado correctamente');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setTenantSaving(true);
        setSuccess('');
        setError('');

        try {
            // 1. Subir logo si se seleccionó uno nuevo
            const updatedTenant = { ...tenant };
            if (selectedLogoFile) {
                const formData = new FormData();
                formData.append('file', selectedLogoFile);
                const res = await apiRequest('/api/internal/tenants/upload-logo', {
                    method: 'POST',
                    body: formData
                });
                updatedTenant.logo_url = res.logo_url;
                setSelectedLogoFile(null); // Limpiar después de subir
            }

            // El correo vacío se envía como null: "" no es un email válido para la API
            if (!updatedTenant.email) updatedTenant.email = null;

            // 2. Actualizar datos del tenant
            const data = await apiRequest('/api/internal/tenants/me', {
                method: 'PATCH',
                body: JSON.stringify(updatedTenant),
            });

            setTenant(data);
            setTenantDirty(false);
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            setSuccess('Datos de empresa actualizados');

            // Activar modal de recarga y iniciar cuenta regresiva de 3 segundos
            setShowRefreshModal(true);
            let count = 3;
            setCountdown(count);
            const interval = setInterval(() => {
                count -= 1;
                setCountdown(count);
                if (count <= 0) {
                    clearInterval(interval);
                    window.location.reload();
                }
            }, 1000);
        } catch (err: any) {
            setError(err.detail || err.message || 'Error al actualizar');
        } finally {
            setTenantSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            setError('Por favor selecciona una imagen válida');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        // Create a File from the Blob
        const file = new File([croppedBlob], "logo.jpg", { type: "image/jpeg" });

        // Cleanup old preview
        if (logoPreview && logoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(logoPreview);
        }

        const previewUrl = URL.createObjectURL(croppedBlob);
        setLogoPreview(previewUrl);
        setSelectedLogoFile(file);
        setTenantDirty(true);

        setShowCropper(false);
        setCropSource(null);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setChangingPass(true);
        setSuccess('');
        setError('');

        try {
            await apiRequest('/api/internal/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
            });
            setSuccess('Contraseña actualizada correctamente');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setChangingPass(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    const isTenantSection = TENANT_SECTIONS.includes(active);
    const formHost = getMainRootUrl().replace(/^https?:\/\//, '');

    // Pie común de las secciones de empresa: un solo guardado para todas
    const tenantFooter = (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
                {tenantDirty
                    ? 'Tienes cambios sin guardar. Se guardan juntos los datos de todas las secciones de empresa.'
                    : 'Los cambios de Empresa, Contacto, Redes y Catálogo se guardan juntos.'}
            </p>
            <button
                type="submit"
                disabled={tenantSaving}
                className="shrink-0 bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center"
            >
                {tenantSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                Guardar datos de empresa
            </button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                <p className="text-muted-foreground mt-1">
                    {isAdmin ? 'Tu cuenta, los datos de tu empresa y lo que ven las familias.' : 'Gestiona tu información personal y la seguridad de tu cuenta.'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
                {/* Navegación por secciones: lista lateral en escritorio, fila deslizable en móvil */}
                <nav aria-label="Secciones del perfil" className="lg:sticky lg:top-6">
                    <ul className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 lg:pb-0">
                        {visibleSections.map(section => {
                            const Icon = section.icon;
                            const isActive = section.key === active;
                            const showDirty = tenantDirty && TENANT_SECTIONS.includes(section.key);
                            return (
                                <li key={section.key} className="shrink-0 lg:shrink">
                                    <button
                                        type="button"
                                        onClick={() => goTo(section.key)}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left border transition-all ${
                                            isActive
                                                ? 'bg-primary/10 border-primary/30 text-foreground'
                                                : 'border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                        }`}
                                    >
                                        <Icon size={18} className={isActive ? 'text-primary' : ''} />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
                                                {section.label}
                                                {showDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Cambios sin guardar" />}
                                            </span>
                                            <span className="hidden lg:block text-[11px] text-muted-foreground/70 truncate">{section.hint}</span>
                                        </span>
                                        <ChevronRight size={16} className={`hidden lg:block transition-opacity ${isActive ? 'opacity-60' : 'opacity-0'}`} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="min-w-0 space-y-4">
                    <AnimatePresence>
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center"
                            >
                                <CheckCircle2 size={18} className="mr-3 shrink-0" />
                                <span className="text-sm font-medium">{success}</span>
                            </motion.div>
                        )}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center"
                            >
                                <AlertCircle size={18} className="mr-3 shrink-0" />
                                <span className="text-sm font-medium">{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ---------- Mi cuenta ---------- */}
                    {active === 'cuenta' && (
                        <form onSubmit={handleUpdateProfile}>
                            <SectionCard
                                icon={User}
                                title="Mi cuenta"
                                description="Información básica de tu usuario"
                                footer={
                                    <div className="flex justify-end">
                                        <button
                                            disabled={saving}
                                            className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center"
                                        >
                                            {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                                            Guardar cambios
                                        </button>
                                    </div>
                                }
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Nombre completo" htmlFor="user-name">
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                            <input
                                                id="user-name"
                                                type="text"
                                                value={user?.name || ''}
                                                onChange={(e) => setUser(u => u ? { ...u, name: e.target.value } : null)}
                                                className={`${inputCls} pl-11 font-medium`}
                                            />
                                        </div>
                                    </Field>
                                    <Field label="Correo electrónico" htmlFor="user-email" hint="El correo de acceso no se puede cambiar.">
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                            <input
                                                id="user-email"
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                                className={`${inputCls} pl-11 opacity-50 cursor-not-allowed text-muted-foreground`}
                                            />
                                        </div>
                                    </Field>
                                </div>
                            </SectionCard>
                        </form>
                    )}

                    {/* ---------- Secciones de empresa (un solo formulario) ---------- */}
                    {isAdmin && isTenantSection && (
                        <form onSubmit={handleUpdateTenant}>
                            {active === 'empresa' && (
                                <SectionCard icon={Building2} title="Empresa" description={`Identidad y datos legales · ID: ${tenant?.slug || '—'}`} footer={tenantFooter}>
                                    <div className="flex flex-col sm:flex-row items-center gap-5">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="group relative w-28 h-28 shrink-0 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 hover:border-primary/50 flex items-center justify-center overflow-hidden transition-all"
                                            title="Cambiar logo"
                                        >
                                            {logoPreview ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={getImageUrl(logoPreview)} className="w-full h-full object-cover" alt="Logo" />
                                            ) : (
                                                <span className="text-center p-3">
                                                    <Upload className="mx-auto text-muted-foreground mb-1.5" size={22} />
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Subir logo</span>
                                                </span>
                                            )}
                                            <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] font-bold uppercase py-1 opacity-0 group-hover:opacity-100 transition-opacity">Cambiar</span>
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                        <div className="text-center sm:text-left">
                                            <p className="text-sm font-semibold">Logo de la empresa</p>
                                            <p className={hintCls}>Formato cuadrado. Se usa en el panel, los certificados, el catálogo y la vista previa al compartir por WhatsApp.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="md:col-span-2">
                                            <Field label="Nombre de la empresa" htmlFor="t-name">
                                                <input
                                                    id="t-name"
                                                    value={tenant?.name || ''}
                                                    onChange={(e) => {
                                                        const newName = e.target.value;
                                                        updateTenant({ name: newName, slug: slugify(newName) || tenant.slug });
                                                    }}
                                                    className={inputCls}
                                                />
                                            </Field>
                                        </div>
                                        <Field label="Nombre corto" htmlFor="t-short" counter={`${(tenant?.short_name || '').length}/10`}>
                                            <input
                                                id="t-short"
                                                maxLength={10}
                                                value={tenant?.short_name || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateTenant({ short_name: val, slug: slugify(val) || tenant.slug });
                                                }}
                                                className={inputCls}
                                            />
                                        </Field>
                                    </div>

                                    <Field
                                        label="URL personalizada (slug)"
                                        htmlFor="t-slug"
                                        hint={<>Tu formulario público: <span className="text-primary font-semibold">{formHost}/{tenant?.slug || '…'}/form</span></>}
                                    >
                                        <input
                                            id="t-slug"
                                            value={tenant?.slug || ''}
                                            onChange={(e) => {
                                                if (error) setError('');
                                                updateTenant({ slug: slugify(e.target.value) });
                                            }}
                                            onBlur={(e) => {
                                                if (!e.target.value || !slugify(e.target.value)) {
                                                    setTenant({ ...tenant, slug: initialSlug });
                                                }
                                            }}
                                            className={`${inputCls} font-mono text-primary`}
                                            placeholder="ej: mi-crematorio"
                                        />
                                    </Field>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <Field label="RUT empresa" htmlFor="t-rut">
                                            <input
                                                id="t-rut"
                                                value={tenant?.rut || ''}
                                                onChange={(e) => updateTenant({ rut: formatRUT(e.target.value) })}
                                                className={inputCls}
                                                placeholder="12.345.678-9"
                                            />
                                        </Field>
                                        <Field label="Representante legal" htmlFor="t-rep">
                                            <input
                                                id="t-rep"
                                                value={tenant?.legal_rep_name || ''}
                                                onChange={(e) => updateTenant({ legal_rep_name: e.target.value })}
                                                className={inputCls}
                                            />
                                        </Field>
                                        <Field label="RUT representante" htmlFor="t-reprut">
                                            <input
                                                id="t-reprut"
                                                value={tenant?.legal_rep_rut || ''}
                                                onChange={(e) => updateTenant({ legal_rep_rut: formatRUT(e.target.value) })}
                                                className={inputCls}
                                                placeholder="12.345.678-9"
                                            />
                                        </Field>
                                    </div>
                                </SectionCard>
                            )}

                            {active === 'contacto' && (
                                <SectionCard icon={MapPin} title="Contacto" description="Se muestran en el pie del catálogo y en los documentos" footer={tenantFooter}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label={<><Phone size={12} /> Teléfono</>} htmlFor="t-phone">
                                            <input
                                                id="t-phone"
                                                type="tel"
                                                autoComplete="tel"
                                                value={tenant?.phone || ''}
                                                onChange={(e) => updateTenant({ phone: e.target.value })}
                                                className={inputCls}
                                                placeholder="+56 9 1234 5678"
                                            />
                                        </Field>
                                        <Field label={<><Mail size={12} /> Correo de contacto</>} htmlFor="t-email">
                                            <input
                                                id="t-email"
                                                type="email"
                                                autoComplete="email"
                                                value={tenant?.email || ''}
                                                onChange={(e) => updateTenant({ email: e.target.value })}
                                                className={inputCls}
                                                placeholder="contacto@tucrematorio.cl"
                                            />
                                        </Field>
                                    </div>
                                    <Field label={<><MapPin size={12} /> Dirección</>} htmlFor="t-address">
                                        <input
                                            id="t-address"
                                            autoComplete="street-address"
                                            value={tenant?.address || ''}
                                            onChange={(e) => updateTenant({ address: e.target.value })}
                                            className={inputCls}
                                            placeholder="Ej: Balmaceda 3726"
                                        />
                                    </Field>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label="Ciudad" htmlFor="t-city">
                                            <input
                                                id="t-city"
                                                value={tenant?.city || ''}
                                                onChange={(e) => updateTenant({ city: e.target.value })}
                                                className={inputCls}
                                                placeholder="Ej: Calama"
                                            />
                                        </Field>
                                        <Field label="Región" htmlFor="t-region">
                                            <input
                                                id="t-region"
                                                value={tenant?.region || ''}
                                                onChange={(e) => updateTenant({ region: e.target.value })}
                                                className={inputCls}
                                                placeholder="Ej: Antofagasta"
                                            />
                                        </Field>
                                    </div>
                                </SectionCard>
                            )}

                            {active === 'redes' && (
                                <SectionCard icon={Share2} title="Redes y reseñas" description="Enlaces que se muestran a las familias" footer={tenantFooter}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label={<><Instagram size={12} /> Instagram</>} htmlFor="s-ig">
                                            <input
                                                id="s-ig"
                                                value={tenant?.social_media?.instagram || ''}
                                                onChange={(e) => updateSocial({ instagram: e.target.value })}
                                                className={inputCls}
                                                placeholder="@usuario"
                                            />
                                        </Field>
                                        <Field label={<><Facebook size={12} /> Facebook</>} htmlFor="s-fb">
                                            <input
                                                id="s-fb"
                                                value={tenant?.social_media?.facebook || ''}
                                                onChange={(e) => updateSocial({ facebook: e.target.value })}
                                                className={inputCls}
                                                placeholder="fb.com/pagina"
                                            />
                                        </Field>
                                        <Field label="TikTok" htmlFor="s-tt">
                                            <input
                                                id="s-tt"
                                                value={tenant?.social_media?.tiktok || ''}
                                                onChange={(e) => updateSocial({ tiktok: e.target.value })}
                                                className={inputCls}
                                                placeholder="@usuario"
                                            />
                                        </Field>
                                        <Field label={<><Globe size={12} /> Página web</>} htmlFor="s-web">
                                            <input
                                                id="s-web"
                                                value={tenant?.social_media?.website || ''}
                                                onChange={(e) => updateSocial({ website: e.target.value })}
                                                className={inputCls}
                                                placeholder="https://…"
                                            />
                                        </Field>
                                    </div>

                                    {/* Reseñas de Google: se ofrece a la familia al entregar las cenizas */}
                                    <div className="rounded-2xl border border-white/5 bg-black/10 p-4 sm:p-5">
                                        <Field
                                            label={<><Star size={12} /> Enlace de reseñas de Google</>}
                                            htmlFor="s-review"
                                            hint={<>Lo encuentras en tu Perfil de Empresa de Google → &quot;Pedir reseñas&quot;. Se muestra a la familia al entregar las cenizas (seguimiento y WhatsApp). Déjalo vacío para no mostrarlo.</>}
                                        >
                                            <input
                                                id="s-review"
                                                type="url"
                                                value={tenant?.social_media?.google_review || ''}
                                                onChange={(e) => updateSocial({ google_review: e.target.value })}
                                                className={inputCls}
                                                placeholder="https://g.page/r/XXXXXXXX/review"
                                            />
                                        </Field>
                                    </div>
                                </SectionCard>
                            )}

                            {active === 'catalogo' && (
                                <SectionCard icon={Store} title="Catálogo online" description="Lo que ven las familias en el catálogo de planes que compartes" footer={tenantFooter}>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <div className="space-y-5">
                                            <Field
                                                label={<><MessageCircle size={12} /> WhatsApp de consultas</>}
                                                htmlFor="catalog-whatsapp"
                                                hint="Solo números, con código de país (56). Si lo dejas vacío se usa el teléfono de la empresa."
                                            >
                                                <input
                                                    id="catalog-whatsapp"
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="tel"
                                                    maxLength={15}
                                                    value={(tenant?.social_media?.whatsapp || '').replace(/\D/g, '')}
                                                    onChange={(e) => updateSocial({ whatsapp: e.target.value.replace(/\D/g, '') })}
                                                    className={`${inputCls} font-medium tracking-wide tabular-nums`}
                                                    placeholder="56912345678"
                                                />
                                            </Field>

                                            <Field label="Lema" htmlFor="catalog-tagline" counter={`${(tenant?.catalog_tagline || '').length}/120`}>
                                                <input
                                                    id="catalog-tagline"
                                                    maxLength={120}
                                                    value={tenant?.catalog_tagline || ''}
                                                    onChange={(e) => updateTenant({ catalog_tagline: e.target.value })}
                                                    className={`${inputCls} italic`}
                                                    placeholder="Ej: Honramos su amor, cuidamos su recuerdo"
                                                />
                                            </Field>

                                            <Field
                                                label="Introducción"
                                                htmlFor="catalog-intro"
                                                counter={`${(tenant?.catalog_intro || '').length}/600`}
                                                hint="Si la dejas vacía se muestra el texto de ejemplo."
                                            >
                                                <textarea
                                                    id="catalog-intro"
                                                    maxLength={600}
                                                    rows={5}
                                                    value={tenant?.catalog_intro || ''}
                                                    onChange={(e) => updateTenant({ catalog_intro: e.target.value })}
                                                    className={`${inputCls} leading-relaxed resize-none`}
                                                    placeholder={DEFAULT_CATALOG_INTRO}
                                                />
                                            </Field>
                                        </div>

                                        {/* Vista previa del encabezado del catálogo (misma paleta que el catálogo público) */}
                                        <div className="rounded-2xl bg-[#fbf9f6] px-6 py-8 text-center self-start">
                                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a6428]">Vista previa</p>
                                            {logoPreview && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={getImageUrl(logoPreview)}
                                                    alt=""
                                                    className="mx-auto mt-4 w-16 h-16 rounded-full object-contain bg-white border border-[#ebe3d6] p-2"
                                                />
                                            )}
                                            <p className="mt-3 font-serif text-2xl font-semibold text-[#2b2724]">{tenant?.name || 'Tu crematorio'}</p>
                                            {tenant?.catalog_tagline && (
                                                <p className="mt-1 font-serif italic text-[15px] text-[#8a6428]">{tenant.catalog_tagline}</p>
                                            )}
                                            <div className="mx-auto my-4 h-px w-10 bg-[#a67c37]/50" />
                                            <p className="text-[12px] leading-relaxed text-[#6f665e] whitespace-pre-line">
                                                {tenant?.catalog_intro || DEFAULT_CATALOG_INTRO}
                                            </p>
                                        </div>
                                    </div>
                                </SectionCard>
                            )}
                        </form>
                    )}

                    {/* ---------- Seguridad ---------- */}
                    {active === 'seguridad' && (
                        <form onSubmit={handleChangePassword}>
                            <SectionCard
                                icon={Shield}
                                title="Seguridad"
                                description="Actualiza tu contraseña de acceso"
                                footer={
                                    <div className="flex justify-end">
                                        <button
                                            disabled={changingPass}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 font-bold py-3 px-6 rounded-2xl disabled:opacity-60 transition-all flex items-center justify-center"
                                        >
                                            {changingPass ? <Loader2 className="animate-spin mr-2" size={18} /> : <Shield className="mr-2" size={18} />}
                                            Actualizar contraseña
                                        </button>
                                    </div>
                                }
                            >
                                <div className="max-w-md space-y-5">
                                    {[
                                        { id: 'pw-old', label: 'Contraseña actual', value: oldPassword, set: setOldPassword, auto: 'current-password' },
                                        { id: 'pw-new', label: 'Nueva contraseña', value: newPassword, set: setNewPassword, auto: 'new-password' },
                                        { id: 'pw-confirm', label: 'Confirmar nueva contraseña', value: confirmPassword, set: setConfirmPassword, auto: 'new-password' },
                                    ].map(f => (
                                        <Field key={f.id} label={f.label} htmlFor={f.id}>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                                <input
                                                    id={f.id}
                                                    type="password"
                                                    autoComplete={f.auto}
                                                    value={f.value}
                                                    onChange={(e) => f.set(e.target.value)}
                                                    className={`${inputCls} pl-11 font-medium`}
                                                />
                                            </div>
                                        </Field>
                                    ))}
                                </div>
                            </SectionCard>
                        </form>
                    )}
                </div>
            </div>

            {/* Image Cropper Modal */}
            {showCropper && cropSource && (
                <ImageCropper
                    image={cropSource}
                    aspect={1} // Force 1:1 for Logos
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(false);
                        setCropSource(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title="Recortar Logo (Cuadrado)"
                />
            )}

            {/* Modal de Recarga en Cuenta Regresiva */}
            {showRefreshModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-neutral-900 border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl"
                    >
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Actualizando configuración</h3>
                            <p className="text-sm text-muted-foreground">
                                Los datos de la empresa han sido guardados. La página se recargará automáticamente en:
                            </p>
                        </div>
                        <div className="text-4xl font-extrabold text-primary font-mono">
                            {countdown}s
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
