import React, { useState } from 'react';
import {
    Activity,
    Building2,
    Upload,
    Lock,
    Shield,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { apiRequest, API_URL, getImageUrl } from '@/lib/admin/api';
import { authHeader } from '@/lib/auth/token';
import AnnouncementSection from '@/components/admin/AnnouncementSection';

interface TenantBrandingTabProps {
    tenantSlug: string | string[] | undefined;
    tenantId?: number;
    logoUrl: string;
    onLogoUpdated: (url: string) => void;
    onShowToast: (text: string, type?: 'success' | 'error') => void;
}

export default function TenantBrandingTab({
    tenantSlug,
    tenantId,
    logoUrl,
    onLogoUpdated,
    onShowToast
}: TenantBrandingTabProps) {
    const [uploading, setUploading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantSlug) return;

        setUploading(true);
        const formDataToUpload = new FormData();
        formDataToUpload.append('file', file);

        try {
            const response = await fetch(`${API_URL}/api/internal/creator/tenants/${tenantSlug}/logo`, {
                method: 'POST',
                headers: { ...authHeader() },
                body: formDataToUpload
            });

            if (!response.ok) throw new Error('Error al subir el logo');

            const data = await response.json();
            onLogoUpdated(data.logo_url);
            onShowToast('Logo actualizado');
        } catch (err: any) {
            onShowToast(err.message || 'Error al subir el logo', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setPasswordError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setResettingPassword(true);
        setPasswordError('');
        setPasswordSuccess(false);

        try {
            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/reset-password`, {
                method: 'POST',
                body: { new_password: newPassword }
            });

            setPasswordSuccess(true);
            setNewPassword('');
            setTimeout(() => setPasswordSuccess(false), 5000);
        } catch (err: any) {
            setPasswordError(err.message || 'Error al restablecer la contraseña');
        } finally {
            setResettingPassword(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <Activity size={18} className="text-primary" />
                        Logo e Identidad
                    </h2>
                </div>
                <div className="p-8 flex flex-col items-center gap-6">
                    <div className="relative group">
                        <div className="h-48 w-48 rounded-3xl bg-gradient-to-br from-[#0f2642] to-[#0a192f] border border-white/10 flex items-center justify-center p-6 overflow-hidden shadow-inner group-hover:border-primary/50 transition-all">
                            {logoUrl ? (
                                <img
                                    src={getImageUrl(logoUrl)}
                                    alt="Tenant Logo"
                                    className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                                />
                            ) : (
                                <Building2 size={80} className="text-white/[0.03]" />
                            )}

                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <Upload size={32} className="text-white animate-bounce" />
                            </div>
                        </div>
                        <label className="absolute inset-0 cursor-pointer">
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                        </label>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Branding Corporativo</p>
                        <p className="text-[9px] text-white/20 italic">Click en la imagen para actualizar</p>
                    </div>

                    {uploading && (
                        <div className="flex items-center gap-2 text-primary font-black animate-pulse bg-primary/5 px-4 py-2 rounded-full border border-primary/20">
                            <Activity size={14} className="animate-spin" />
                            <span className="text-[10px] tracking-widest">PROCESANDO LOGO...</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/10 bg-gradient-to-br from-red-500/5 to-transparent">
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            <Lock size={18} className="text-red-500" />
                            Control Maestro
                        </h2>
                    </div>
                    <div className="p-8 space-y-5">
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
                            <p className="text-[10px] text-red-100/40 leading-relaxed font-medium uppercase tracking-tighter">
                                RESTABLECER CONTRASEÑA DEL ADMINISTRADOR PRINCIPAL DEL TENANT.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 pl-12 text-white outline-none focus:border-red-500/50 transition-all text-sm font-bold"
                                    placeholder="Nueva clave..."
                                />
                            </div>

                            <button
                                onClick={handleResetPassword}
                                disabled={resettingPassword || !newPassword}
                                className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-20 active:scale-[0.98]"
                            >
                                {resettingPassword ? <Activity className="animate-spin" size={16} /> : <Shield size={16} />}
                                EJECUTAR RESET
                            </button>
                        </div>

                        {passwordError && (
                            <div className="flex items-center gap-2 text-red-400 text-[10px] font-black bg-red-400/5 p-2 rounded-lg border border-red-400/20">
                                <AlertCircle size={14} /> {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="flex items-center gap-2 text-green-400 text-[10px] font-black bg-green-400/5 p-2 rounded-lg border border-green-400/20">
                                <CheckCircle size={14} /> CLAVE ACTUALIZADA
                            </div>
                        )}
                    </div>
                </div>

                {tenantId && <AnnouncementSection tenantId={tenantId} />}
            </div>
        </div>
    );
}
