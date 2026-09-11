"use client";

import React, { useState, useRef } from 'react';
import {
    Upload,
    Film,
    Image as ImageIcon,
    Sparkles,
    Link as LinkIcon,
    Trash2,
    Check,
    Loader2,
    Eye,
    Sliders
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import MediaSelector from '@/components/admin/media/MediaSelector';

export interface HeroMediaConfig {
    mediaType?: 'image' | 'video';
    backgroundImage?: string;
    bgOpacity?: number;
    bgCenter?: boolean;
    bgStretch?: boolean;
    videoPosterUrl?: string;
}

interface HeroAssetSelectorProps {
    value: HeroMediaConfig;
    onChange: (updated: Partial<HeroMediaConfig>) => void;
}

// Presets curados de alta calidad para la industria funeraria y crematorios de mascotas
const HERO_PRESETS = [
    {
        id: 'preset-default',
        title: 'Original Vinzer Portada',
        type: 'image' as const,
        url: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        thumbnail: 'https://i.postimg.cc/mD9jZNX2/portada-1.webp',
        tag: 'Predeterminado'
    },
    {
        id: 'preset-memorial-soft',
        title: 'Santuario Celestial',
        type: 'image' as const,
        url: 'https://i.postimg.cc/W3XkPmLR/Image_fx_2.webp',
        thumbnail: 'https://i.postimg.cc/W3XkPmLR/Image_fx_2.webp',
        tag: 'Cálido'
    },
    {
        id: 'preset-legacy-light',
        title: 'Sendero de Paz',
        type: 'image' as const,
        url: 'https://i.postimg.cc/25Nvd8Fw/Image_fx_6.webp',
        thumbnail: 'https://i.postimg.cc/25Nvd8Fw/Image_fx_6.webp',
        tag: 'Sereno'
    },
    {
        id: 'preset-sunset-clouds',
        title: 'Atardecer Dorado',
        type: 'image' as const,
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
        thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
        tag: 'Naturaleza'
    },
    {
        id: 'preset-video-particles',
        title: 'Video Partículas de Luz',
        type: 'video' as const,
        url: 'https://assets.mixkit.co/videos/preview/mixkit-ethereal-light-particles-floating-slowly-42526-large.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80',
        tag: 'Video Loop'
    },
    {
        id: 'preset-video-clouds',
        title: 'Video Nubes Suaves',
        type: 'video' as const,
        url: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=300&q=80',
        tag: 'Video Loop'
    }
];

export default function HeroAssetSelector({ value, onChange }: HeroAssetSelectorProps) {
    const { showToast } = useToast();
    const [activeSourceTab, setActiveSourceTab] = useState<'upload' | 'presets' | 'library' | 'manual'>('upload');
    const [uploading, setUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentUrl = value.backgroundImage || '';
    const isVideo = value.mediaType === 'video' || (!!currentUrl && /\.(mp4|webm|mov)(\?.*)?$/i.test(currentUrl));
    const opacity = typeof value.bgOpacity === 'number' ? value.bgOpacity : 0.8;

    // Detectar tipo de archivo y subir al backend
    const handleFileUpload = async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
        const isVid = ['mp4', 'webm', 'mov'].includes(ext);

        if (!isImage && !isVid) {
            showToast("Formato no soportado. Usa JPG, PNG, WEBP, MP4 o WEBM.", "error");
            return;
        }

        // Validación de tamaño (30MB máximo para video, 10MB imagen)
        const maxBytes = isVid ? 35 * 1024 * 1024 : 12 * 1024 * 1024;
        if (file.size > maxBytes) {
            showToast(`El archivo excede el límite recomendado (${isVid ? '35MB' : '12MB'}).`, "error");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'hero');
        formData.append('ratio', '16:9');
        formData.append('description', `Fondo Hero Landing: ${file.name}`);

        setUploading(true);
        try {
            const res = await apiRequest('/api/internal/media/upload', {
                method: 'POST',
                body: formData
            });

            if (res && res.url) {
                const detectedType: 'image' | 'video' = isVid ? 'video' : 'image';
                onChange({
                    backgroundImage: res.url,
                    mediaType: detectedType
                });
                showToast(`${detectedType === 'video' ? 'Video' : 'Imagen'} subido exitosamente.`, "success");
            }
        } catch (error: unknown) {
            console.error('Error uploading hero asset:', error);
            showToast((error as Error)?.message || "Error al subir el archivo multimedia.", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="bg-[#0b1329] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-sky-400" size={18} />
                        Fondo del Hero (Imagen o Video)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Configura el asset visual principal para la portada de la landing page.
                    </p>
                </div>
                {currentUrl && (
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            isVideo
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}>
                            {isVideo ? <Film size={12} /> : <ImageIcon size={12} />}
                            {isVideo ? 'Video en Loop' : 'Imagen'}
                        </span>
                        <button
                            type="button"
                            onClick={() => onChange({ backgroundImage: '', mediaType: 'image' })}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors text-xs"
                            title="Quitar fondo actual"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* Pestañas de Selección */}
            <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveSourceTab('upload')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        activeSourceTab === 'upload'
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                >
                    <Upload size={14} />
                    Subir Archivo (Imagen / Video)
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSourceTab('presets')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        activeSourceTab === 'presets'
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                >
                    <Sparkles size={14} />
                    Presets Preconfigurados
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setActiveSourceTab('library');
                        setIsMediaLibraryOpen(true);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        activeSourceTab === 'library'
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                >
                    <Film size={14} />
                    Biblioteca del Sistema
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSourceTab('manual')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        activeSourceTab === 'manual'
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                >
                    <LinkIcon size={14} />
                    URL Manual
                </button>
            </div>

            {/* Contenido según pestaña */}
            {activeSourceTab === 'upload' && (
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp, video/mp4, video/webm, video/quicktime"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handleFileUpload(e.target.files[0]);
                            }
                        }}
                    />
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                            isDragOver
                                ? 'border-sky-400 bg-sky-500/10'
                                : 'border-white/10 bg-white/5 hover:border-sky-500/50 hover:bg-white/[0.07]'
                        }`}
                    >
                        {uploading ? (
                            <div className="flex flex-col items-center gap-2 py-4">
                                <Loader2 className="animate-spin text-sky-400" size={32} />
                                <span className="text-xs text-sky-300 font-semibold">Subiendo y optimizando asset...</span>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-sky-500/10 text-sky-400 rounded-full">
                                    <Upload size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">
                                        Arrastra aquí una imagen o video, o haz clic para seleccionar
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Formatos soportados: WEBP, JPG, PNG, MP4 o WEBM (hasta 35MB).
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeSourceTab === 'presets' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {HERO_PRESETS.map((preset) => {
                        const isSelected = currentUrl === preset.url;
                        return (
                            <div
                                key={preset.id}
                                onClick={() => {
                                    onChange({
                                        backgroundImage: preset.url,
                                        mediaType: preset.type
                                    });
                                    showToast(`Preset "${preset.title}" aplicado.`, "info");
                                }}
                                className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 aspect-video bg-black/40 flex flex-col justify-end p-2.5 ${
                                    isSelected
                                        ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-lg shadow-sky-500/20'
                                        : 'border-white/10 hover:border-white/30'
                                }`}
                            >
                                <img
                                    src={preset.thumbnail}
                                    alt={preset.title}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                
                                {isSelected && (
                                    <div className="absolute top-2 right-2 p-1 bg-sky-500 text-white rounded-full">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                )}

                                <div className="relative z-10 space-y-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-sky-300 backdrop-blur-xs inline-block">
                                        {preset.tag}
                                    </span>
                                    <p className="text-xs font-bold text-white truncate drop-shadow-sm">
                                        {preset.title}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeSourceTab === 'manual' && (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs uppercase font-bold text-white/50 mb-1 block">URL directa del Archivo</label>
                        <input
                            type="text"
                            value={currentUrl}
                            onChange={(e) => {
                                const val = e.target.value;
                                const isVid = /\.(mp4|webm|mov)(\?.*)?$/i.test(val);
                                onChange({
                                    backgroundImage: val,
                                    mediaType: isVid ? 'video' : 'image'
                                });
                            }}
                            className="w-full bg-[#070d1d] border border-white/10 rounded-xl p-3 outline-none focus:border-sky-500 text-xs font-mono text-white placeholder:text-slate-600"
                            placeholder="https://i.postimg.cc/... o https://tuservidor.com/video.mp4"
                        />
                    </div>

                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                            <input
                                type="radio"
                                name="mediaTypeOption"
                                checked={!isVideo}
                                onChange={() => onChange({ mediaType: 'image' })}
                                className="accent-sky-500"
                            />
                            Es una Imagen
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                            <input
                                type="radio"
                                name="mediaTypeOption"
                                checked={isVideo}
                                onChange={() => onChange({ mediaType: 'video' })}
                                className="accent-sky-500"
                            />
                            Es un Video en Loop (.mp4/.webm)
                        </label>
                    </div>
                </div>
            )}

            {/* Previsualización en Vivo */}
            {currentUrl && (
                <div className="space-y-4 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                            <Eye size={14} className="text-sky-400" />
                            Previsualización en Pantalla
                        </span>
                        <span className="text-xs text-slate-400">
                            Opacidad: <strong className="text-sky-300">{Math.round(opacity * 100)}%</strong>
                        </span>
                    </div>

                    <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden border border-white/15 bg-[#020210] flex items-center justify-center shadow-inner">
                        {isVideo ? (
                            <video
                                src={getImageUrl(currentUrl)}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ opacity }}
                            />
                        ) : (
                            <img
                                src={getImageUrl(currentUrl)}
                                alt="Previsualización Hero"
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ opacity }}
                            />
                        )}

                        {/* Overlay simulador de gradiente oscuro/claro */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />

                        {/* Texto simulado de Hero para verificar legibilidad */}
                        <div className="relative z-10 max-w-sm p-6 text-left space-y-2 pointer-events-none">
                            <div className="inline-block px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-sky-500/30">
                                ✨ Simulación de Texto
                            </div>
                            <h5 className="text-lg font-black text-white leading-tight">
                                Software de control y <span className="text-sky-400">trazabilidad total</span>
                            </h5>
                            <p className="text-[11px] text-slate-300 line-clamp-2">
                                Así lucirá tu texto sobre este fondo en la portada principal.
                            </p>
                        </div>
                    </div>

                    {/* Control de Opacidad del Fondo */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
                            <Sliders size={15} className="text-sky-400" />
                            Ajustar Opacidad del Fondo:
                        </div>
                        <div className="flex-1 w-full flex items-center gap-3">
                            <span className="text-xs text-slate-500">10%</span>
                            <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={opacity}
                                onChange={(e) => onChange({ bgOpacity: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <span className="text-xs text-slate-500">100%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Biblioteca de Medios */}
            {isMediaLibraryOpen && (
                <MediaSelector
                    isOpen={isMediaLibraryOpen}
                    onClose={() => setIsMediaLibraryOpen(false)}
                    categoryFilter=""
                    onSelect={(url, type) => {
                        onChange({
                            backgroundImage: url,
                            mediaType: type
                        });
                        setIsMediaLibraryOpen(false);
                        showToast(`Asset de la biblioteca aplicado (${type}).`, "success");
                    }}
                />
            )}
        </div>
    );
}
