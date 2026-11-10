import React, { useState, useEffect } from 'react';
import {
    Activity,
    Building2,
    Upload,
    Lock,
    Shield,
    AlertCircle,
    CheckCircle,
    Film,
    Link2,
    Play,
    Trash2,
    Sparkles,
    Clock,
    RotateCcw
} from 'lucide-react';
import { apiRequest, API_URL, getImageUrl } from '@/lib/admin/api';
import { authHeader } from '@/lib/auth/token';
import AnnouncementSection from '@/components/admin/AnnouncementSection';
import FormVideoPlayer from '@/components/public/FormVideoPlayer';

interface TenantBrandingTabProps {
    tenantSlug: string | string[] | undefined;
    tenantId?: number;
    logoUrl: string;
    catalogVideo?: {
        source: 'upload' | 'vimeo' | 'cloudflare';
        url: string;
        duration?: number;
        button_text?: string;
    } | null;
    onLogoUpdated: (url: string) => void;
    onVideoUpdated?: () => void;
    onShowToast: (text: string, type?: 'success' | 'error') => void;
}

export default function TenantBrandingTab({
    tenantSlug,
    tenantId,
    logoUrl,
    catalogVideo,
    onLogoUpdated,
    onVideoUpdated,
    onShowToast
}: TenantBrandingTabProps) {
    const [uploading, setUploading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Video del catálogo público
    const [videoMode, setVideoMode] = useState<'upload' | 'link'>('upload');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoLink, setVideoLink] = useState('');
    const [buttonText, setButtonText] = useState(catalogVideo?.button_text || 'Ver video de bienvenida');
    const [savingVideo, setSavingVideo] = useState(false);
    const [deletingVideo, setDeletingVideo] = useState(false);
    const [showVideoForm, setShowVideoForm] = useState(false);

    useEffect(() => {
        if (catalogVideo?.button_text) {
            setButtonText(catalogVideo.button_text);
        }
    }, [catalogVideo]);

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

    const handleSaveVideo = async () => {
        if (!tenantSlug) return;
        if (videoMode === 'upload' && !videoFile) {
            onShowToast('Selecciona un archivo de video (máx 30s)', 'error');
            return;
        }
        if (videoMode === 'link' && !videoLink.trim()) {
            onShowToast('Pega un enlace de Vimeo o Cloudflare Stream', 'error');
            return;
        }

        setSavingVideo(true);
        try {
            const formData = new FormData();
            if (videoMode === 'upload' && videoFile) {
                formData.append('file', videoFile);
            } else if (videoMode === 'link' && videoLink.trim()) {
                formData.append('video_url', videoLink.trim());
            }
            formData.append('button_text', buttonText.trim() || 'Ver video de bienvenida');

            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/catalog-video`, {
                method: 'POST',
                body: formData,
            });

            onShowToast('Video de catálogo procesado y guardado correctamente');
            setVideoFile(null);
            setVideoLink('');
            setShowVideoForm(false);
            onVideoUpdated?.();
        } catch (err: any) {
            onShowToast(err.message || 'Error al procesar el video', 'error');
        } finally {
            setSavingVideo(false);
        }
    };

    const handleDeleteVideo = async () => {
        if (!tenantSlug) return;
        if (!window.confirm('¿Seguro que deseas eliminar el video de bienvenida del catálogo de este crematorio?')) return;

        setDeletingVideo(true);
        try {
            await apiRequest(`/api/internal/creator/tenants/${tenantSlug}/catalog-video`, {
                method: 'DELETE',
            });
            onShowToast('Video de catálogo eliminado');
            setShowVideoForm(false);
            onVideoUpdated?.();
        } catch (err: any) {
            onShowToast(err.message || 'Error al eliminar el video', 'error');
        } finally {
            setDeletingVideo(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Logo e Identidad */}
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

                {/* Control Maestro y Comunicados */}
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

            {/* Video de Bienvenida · Catálogo Público (Add-on SaaS SuperAdmin) */}
            <div className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Film size={20} />
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                Video de Bienvenida · Catálogo Público
                            </h2>
                            <p className="text-[11px] text-white/40 mt-0.5">
                                Video cálido de presentación que la familia puede ver con un clic en el catálogo (máx. 30s).
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Add-on SaaS · Solo Administrador
                    </span>
                </div>

                <div className="p-8 space-y-6">
                    {catalogVideo && !showVideoForm ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            {/* Preview */}
                            <div className="space-y-3">
                                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                                    Vista previa actual
                                </p>
                                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                    <FormVideoPlayer video={catalogVideo as any} autoPlay={false} />
                                </div>
                            </div>

                            {/* Info & Actions */}
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/40 font-medium">Origen:</span>
                                        <span className="font-bold text-white uppercase">
                                            {catalogVideo.source === 'upload' ? 'Archivo optimizado (R2)' : catalogVideo.source}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/40 font-medium">Duración:</span>
                                        <span className="font-bold text-amber-400">
                                            {catalogVideo.duration ? `${Math.round(catalogVideo.duration)} s` : '≤ 30 s'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-white/40 font-medium">Texto del botón:</span>
                                        <span className="font-bold text-white">
                                            "{catalogVideo.button_text || 'Ver video de bienvenida'}"
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-white/5 text-[11px] text-emerald-400 flex items-center gap-1.5">
                                        <CheckCircle size={14} />
                                        <span>Activo y visible en el enlace del catálogo de este crematorio.</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowVideoForm(true)}
                                        className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                    >
                                        <RotateCcw size={14} />
                                        <span>Reemplazar video</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteVideo}
                                        disabled={deletingVideo}
                                        className="py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 active:scale-95"
                                    >
                                        {deletingVideo ? <Activity size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        <span>Eliminar video</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-3xl">
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200/80 leading-relaxed flex items-start gap-3">
                                <Sparkles size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-300 mb-0.5">Optimización automática al subir:</p>
                                    Al subir un archivo de video (máx. 30 s), el servidor lo analiza y recompone automáticamente en <b>720p H.264 + AAC</b> con la bandera <code>+faststart</code>, garantizando carga instantánea sin cortes en móviles y navegadores familiares.
                                </div>
                            </div>

                            {/* Selector de modo */}
                            <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 w-fit">
                                <button
                                    type="button"
                                    onClick={() => setVideoMode('upload')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                        videoMode === 'upload' ? 'bg-primary text-white shadow-md' : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    <Upload size={14} />
                                    Subir archivo (MP4 / MOV)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVideoMode('link')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                        videoMode === 'link' ? 'bg-primary text-white shadow-md' : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    <Link2 size={14} />
                                    Pegar enlace (Vimeo / Stream)
                                </button>
                            </div>

                            {/* Input según modo */}
                            {videoMode === 'upload' ? (
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-white/70">
                                        Archivo de video (máximo 60 segundos / 1 min, hasta 80 MB)
                                    </label>
                                    <div className="border-2 border-dashed border-white/10 hover:border-amber-400/40 rounded-2xl p-6 text-center transition-colors bg-white/[0.02]">
                                        <input
                                            type="file"
                                            id="catalog-video-input"
                                            accept="video/mp4,video/quicktime,video/webm"
                                            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                        <label htmlFor="catalog-video-input" className="cursor-pointer space-y-2 block">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                                                <Upload size={22} />
                                            </div>
                                            {videoFile ? (
                                                <div className="text-white text-xs font-bold">
                                                    <span>{videoFile.name}</span>
                                                    <span className="text-white/40 block text-[10px] mt-0.5">
                                                        ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-white/50">
                                                    <span className="text-amber-400 font-bold underline">Haz clic para elegir</span> o arrastra tu archivo aquí
                                                    <p className="text-[10px] text-white/30 mt-1">MP4, MOV o WebM · Máximo 60 segundos</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-white/70">
                                        Enlace de Vimeo o Cloudflare Stream (máx. 60 segundos)
                                    </label>
                                    <input
                                        type="url"
                                        value={videoLink}
                                        onChange={(e) => setVideoLink(e.target.value)}
                                        placeholder="https://vimeo.com/123456789 o https://iframe.videodelivery.net/..."
                                        className="w-full bg-[#0f2642] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-400/50 text-xs font-medium placeholder:text-white/30"
                                    />
                                </div>
                            )}

                            {/* Texto del botón */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-white/70">
                                    Texto del botón en el catálogo (CTA)
                                </label>
                                <input
                                    type="text"
                                    value={buttonText}
                                    onChange={(e) => setButtonText(e.target.value)}
                                    placeholder="Ej: Ver video de bienvenida"
                                    maxLength={40}
                                    className="w-full max-w-md bg-[#0f2642] border border-white/10 rounded-2xl p-3 text-white outline-none focus:border-amber-400/50 text-xs font-medium placeholder:text-white/30"
                                />
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleSaveVideo}
                                    disabled={savingVideo}
                                    className="py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-40 active:scale-95"
                                >
                                    {savingVideo ? (
                                        <>
                                            <Activity size={16} className="animate-spin" />
                                            <span>Procesando y optimizando video (FFmpeg 720p)...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play size={14} className="fill-current" />
                                            <span>Procesar y Guardar Video</span>
                                        </>
                                    )}
                                </button>
                                {catalogVideo && (
                                    <button
                                        type="button"
                                        onClick={() => setShowVideoForm(false)}
                                        disabled={savingVideo}
                                        className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
