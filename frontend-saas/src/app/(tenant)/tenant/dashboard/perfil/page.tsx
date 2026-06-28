"use client";

import React, { useEffect, useState } from 'react';
import {
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
    Linkedin,
    Upload,
    Phone,
    Globe
} from 'lucide-react';
import { apiRequest, API_URL, getImageUrl } from '@/lib/tenant/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useQueryClient } from '@tanstack/react-query';
import ImageCropper from '@/components/tenant/ImageCropper';

const formatRUT = (rut: string) => {
    // Remove dots and hyphen
    let value = rut.replace(/\./g, '').replace(/-/g, '');

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

export default function ProfilePage() {
    const [user, setUser] = useState<{ name: string, email: string, role: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Estado del Tenant
    const [tenant, setTenant] = useState<any>(null);
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
    const { data: bootstrapData, isLoading: bootstrapLoading } = useSessionBootstrap();

    const [initialSlug, setInitialSlug] = useState('');

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
            let updatedTenant = { ...tenant };
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

            // 2. Actualizar datos del tenant
            const data = await apiRequest('/api/internal/tenants/me', {
                method: 'PATCH',
                body: JSON.stringify(updatedTenant),
            });

            setTenant(data);
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

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                <p className="text-muted-foreground mt-1">Gestiona tu información personal y seguridad de la cuenta.</p>
            </div>

            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center"
                    >
                        <CheckCircle2 size={18} className="mr-3" />
                        <span className="text-sm font-medium">{success}</span>
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center"
                    >
                        <AlertCircle size={18} className="mr-3" />
                        <span className="text-sm font-medium">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Información General */}
                <div className="glass-card rounded-[2.5rem] p-8 space-y-8">
                    <div className="flex items-center space-x-4 border-b border-white/5 pb-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <User size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Datos Personales</h3>
                            <p className="text-xs text-muted-foreground">Información básica de tu cuenta</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Nombre Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    value={user?.name || ''}
                                    onChange={(e) => setUser(u => u ? { ...u, name: e.target.value } : null)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none opacity-50 cursor-not-allowed text-muted-foreground font-medium"
                                />
                            </div>
                        </div>
                        <button
                            disabled={saving}
                            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
                        >
                            {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                            Guardar Cambios
                        </button>
                    </form>
                </div>

                {/* Datos de Empresa (Solo Admin) */}
                {(user?.role === 'admin' || user?.role === 'creator') && (
                    <div className="glass-card rounded-[2.5rem] p-8 space-y-8">
                        <div className="flex items-center space-x-4 border-b border-white/5 pb-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                <Building2 size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Perfil de Empresa</h3>
                                <p className="text-[10px] text-muted-foreground italic font-mono">ID: {tenant?.slug}</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateTenant} className="space-y-6">
                            {/* Logo Upload */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                                    <div className="w-32 h-32 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                                        {logoPreview ? (
                                            <img src={getImageUrl(logoPreview)} className="w-full h-full object-cover" alt="Logo" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <Upload className="mx-auto text-muted-foreground mb-2" size={24} />
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Subir Logo</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        id="logo-upload"
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Nombre Empresa</label>
                                    <input
                                        value={tenant?.name || ''}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            const newSlug = slugify(newName);
                                            setTenant({
                                                ...tenant,
                                                name: newName,
                                                slug: newSlug || tenant.slug
                                            });
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Nombre Corto (10 car.)</label>
                                    <input
                                        maxLength={10}
                                        value={tenant?.short_name || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const newSlug = slugify(val);
                                            setTenant({
                                                ...tenant,
                                                short_name: val,
                                                slug: newSlug || tenant.slug
                                            });
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">URL Personalizada / Slug</label>
                                <div className="space-y-2">
                                    <input
                                        value={tenant?.slug || ''}
                                        onChange={(e) => {
                                            if (error) setError(''); // Clear error on change
                                            setTenant({ ...tenant, slug: slugify(e.target.value) })
                                        }}
                                        onBlur={(e) => {
                                            if (!e.target.value || !slugify(e.target.value)) {
                                                setTenant({ ...tenant, slug: initialSlug });
                                            }
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono text-primary"
                                        placeholder="ej: mi-crematorio"
                                    />
                                    <p className="text-[10px] text-muted-foreground ml-1">
                                        Tu formulario será: <span className="text-primary font-bold">saascrematorio.cl/form/{tenant?.slug || '...'}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">RUT Empresa</label>
                                <input
                                    value={tenant?.rut || ''}
                                    onChange={(e) => setTenant({ ...tenant, rut: formatRUT(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm"
                                    placeholder="12.345.678-9"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Rep. Legal</label>
                                    <input
                                        value={tenant?.legal_rep_name || ''}
                                        onChange={(e) => setTenant({ ...tenant, legal_rep_name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">RUT Rep.</label>
                                    <input
                                        value={tenant?.legal_rep_rut || ''}
                                        onChange={(e) => setTenant({ ...tenant, legal_rep_rut: formatRUT(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm"
                                        placeholder="12.345.678-9"
                                    />
                                </div>
                            </div>

                            {/* Redes Sociales */}
                            <div className="pt-4 border-t border-white/5">
                                <h4 className="text-sm font-bold mb-4">Redes Sociales</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center text-xs text-muted-foreground mb-1"><Instagram size={12} className="mr-1" /> Instagram</div>
                                        <input
                                            value={tenant?.social_media?.instagram || ''}
                                            onChange={(e) => setTenant({ ...tenant, social_media: { ...tenant.social_media, instagram: e.target.value } })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs"
                                            placeholder="@usuario"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center text-xs text-muted-foreground mb-1"><Facebook size={12} className="mr-1" /> Facebook</div>
                                        <input
                                            value={tenant?.social_media?.facebook || ''}
                                            onChange={(e) => setTenant({ ...tenant, social_media: { ...tenant.social_media, facebook: e.target.value } })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs"
                                            placeholder="fb.com/pagina"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center text-xs text-muted-foreground mb-1"><Globe size={12} className="mr-1" /> Página Web</div>
                                        <input
                                            value={tenant?.social_media?.website || ''}
                                            onChange={(e) => setTenant({ ...tenant, social_media: { ...tenant.social_media, website: e.target.value } })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center text-xs text-muted-foreground mb-1 text-xs font-bold"> Tiktok</div>
                                        <input
                                            value={tenant?.social_media?.tiktok || ''}
                                            onChange={(e) => setTenant({ ...tenant, social_media: { ...tenant.social_media, tiktok: e.target.value } })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs"
                                            placeholder="@tiktok"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center mb-4"
                                >
                                    <AlertCircle size={18} className="mr-3 shrink-0" />
                                    <span className="text-sm font-medium">{error}</span>
                                </motion.div>
                            )}

                            <button
                                disabled={tenantSaving}
                                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
                            >
                                {tenantSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                                Guardar Datos Empresa
                            </button>
                        </form>
                    </div>
                )}

                {/* Seguridad */}
                <div className="glass-card rounded-[2.5rem] p-8 space-y-8">
                    <div className="flex items-center space-x-4 border-b border-white/5 pb-6">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Seguridad</h3>
                            <p className="text-xs text-muted-foreground">Actualiza tu contraseña de acceso</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Contraseña Actual</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Nueva Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wider">Confirmar Nueva Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <button
                            disabled={changingPass}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 font-bold py-4 rounded-2xl transition-all flex items-center justify-center"
                        >
                            {changingPass ? <Loader2 className="animate-spin mr-2" size={18} /> : <Shield className="mr-2" size={18} />}
                            Actualizar Contraseña
                        </button>
                    </form>
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
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Actualizando configuración</h3>
                            <p className="text-sm text-muted-foreground">
                                Los datos de la empresa han sido guardados. La página se recargará automáticamente en:
                            </p>
                        </div>
                        <div className="text-4xl font-extrabold text-indigo-400 font-mono">
                            {countdown}s
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

