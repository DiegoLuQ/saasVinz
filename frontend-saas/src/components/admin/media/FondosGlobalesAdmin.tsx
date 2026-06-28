"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Upload,
    Image as ImageIcon,
    X,
    Check,
    Trash2,
    Settings2,
    Loader2,
    Eye,
    Palette
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface ThemeConfig {
    mode: 'light' | 'dark' | 'custom';
    title_color: string;
    subtitle_color: string;
    text_color: string;
    accent_color: string;
}

interface MediaItem {
    id: number;
    url: string;
    media_type: 'image' | 'video';
    category: string;
    ratio: string;
    description: string;
    alt_text: string;
    file_size: number;
    width: number;
    height: number;
    theme_config?: ThemeConfig | null;
    created_at: string;
}

export default function FondosGlobalesAdmin() {
    const { showToast } = useToast();
    const [backgrounds, setBackgrounds] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Modales
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Selección
    const [selectedBg, setSelectedBg] = useState<MediaItem | null>(null);
    const [bgToDelete, setBgToDelete] = useState<MediaItem | null>(null);

    // Configuración del Tema
    const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
        mode: 'dark',
        title_color: '#ffffff',
        subtitle_color: '#e2e8f0',
        text_color: '#cbd5e1',
        accent_color: '#c3b091'
    });

    // Subida de Archivo
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBackgrounds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchBackgrounds = async () => {
        setLoading(true);
        try {
            // Buscamos con category 'ui' (los fondos globales para el Hero/Sección del memorial)
            const data = await apiRequest('/api/internal/media?category=ui&page_size=100');
            setBackgrounds(data.items || []);
        } catch (error) {
            console.error(error);
            showToast("Error al cargar los fondos de pantalla", "error");
        } finally {
            setLoading(false);
        }
    };

    // Control de Temas predefinidos
    const applyPredefinedTheme = (mode: 'light' | 'dark') => {
        if (mode === 'dark') {
            // Fondo oscuro: letras claras / blancas
            setThemeConfig({
                mode: 'dark',
                title_color: '#ffffff',
                subtitle_color: '#f1f5f9',
                text_color: '#cbd5e1',
                accent_color: '#e2e8f0'
            });
        } else {
            // Fondo claro: letras oscuras
            setThemeConfig({
                mode: 'light',
                title_color: '#0f172a',
                subtitle_color: '#334155',
                text_color: '#475569',
                accent_color: '#0f172a'
            });
        }
    };

    const handleOpenThemeModal = (bg: MediaItem) => {
        setSelectedBg(bg);
        if (bg.theme_config) {
            setThemeConfig({
                mode: bg.theme_config.mode || 'dark',
                title_color: bg.theme_config.title_color || '#ffffff',
                subtitle_color: bg.theme_config.subtitle_color || '#e2e8f0',
                text_color: bg.theme_config.text_color || '#cbd5e1',
                accent_color: bg.theme_config.accent_color || '#c3b091'
            });
        } else {
            // Valor por defecto (modo oscuro, letras blancas ya que la mayoría de los fondos de memorial son atardeceres o solemnes)
            setThemeConfig({
                mode: 'dark',
                title_color: '#ffffff',
                subtitle_color: '#f1f5f9',
                text_color: '#cbd5e1',
                accent_color: '#e2e8f0'
            });
        }
        setThemeModalOpen(true);
    };

    const handleSaveTheme = async () => {
        if (!selectedBg) return;

        try {
            await apiRequest(`/api/internal/media/${selectedBg.id}/theme`, {
                method: 'PUT',
                body: themeConfig
            });
            showToast("Configuración de tema guardada correctamente", "success");
            setThemeModalOpen(false);
            fetchBackgrounds();
        } catch (error) {
            console.error(error);
            showToast("No se pudo guardar la configuración de tema", "error");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('category', 'ui'); // Guardado automático en 'ui'
        formData.append('ratio', 'original');
        formData.append('processing_mode', 'optimized');

        try {
            const res = await apiRequest('/api/internal/media/upload', {
                method: 'POST',
                body: formData
            });
            showToast("Fondo subido correctamente", "success");
            setUploadModalOpen(false);
            setSelectedFile(null);
            setPreviewUrl(null);
            fetchBackgrounds();
        } catch (error) {
            console.error(error);
            showToast("Error al subir el archivo", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!bgToDelete) return;

        try {
            await apiRequest(`/api/internal/media/${bgToDelete.id}`, {
                method: 'DELETE'
            });
            showToast("Fondo eliminado correctamente", "success");
            setDeleteModalOpen(false);
            setBgToDelete(null);
            fetchBackgrounds();
        } catch (error) {
            console.error(error);
            showToast("Error al eliminar el fondo", "error");
        }
    };

    return (
        <div className="space-y-6 text-slate-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0d1e3d]/60 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Palette className="text-primary h-6 w-6" />
                        Biblioteca de Fondos y Temas Globales
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                        Gestiona las imágenes de fondo globales utilizadas en la portada del memorial y configura sus temas de color (letras claras u oscuras) para asegurar una legibilidad impecable en todas las plantillas.
                    </p>
                </div>
                <button
                    onClick={() => setUploadModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/95 active:scale-95 transition-all shadow-lg shadow-primary/20 shrink-0"
                >
                    <Upload size={16} />
                    Subir Nuevo Fondo
                </button>
            </div>

            {/* Grid de Fondos */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-primary h-8 w-8" />
                    <p className="text-xs text-slate-400 font-medium">Cargando fondos globales...</p>
                </div>
            ) : backgrounds.length === 0 ? (
                <div className="bg-[#0d1e3d]/40 border border-dashed border-white/10 rounded-2xl p-16 text-center">
                    <ImageIcon className="mx-auto text-slate-500 mb-4 h-12 w-12" />
                    <h3 className="font-semibold text-white">No hay fondos configurados</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Sube imágenes de fondos globales que los tenants y clientes puedan utilizar para sus memoriales.
                    </p>
                    <button
                        onClick={() => setUploadModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
                    >
                        <Upload size={12} />
                        Subir Fondo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {backgrounds.map((bg) => {
                        const hasTheme = !!bg.theme_config;
                        const themeMode = bg.theme_config?.mode || 'Sin definir';

                        return (
                            <div
                                key={bg.id}
                                className="group bg-[#0d1e3d]/40 border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all flex flex-col shadow-lg"
                            >
                                {/* Thumbnail */}
                                <div className="aspect-[16/9] relative bg-slate-950 overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={getImageUrl(bg.url)}
                                        alt={bg.alt_text || 'Fondo global'}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-2 left-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-md backdrop-blur-md uppercase ${
                                            hasTheme
                                                ? themeMode === 'dark'
                                                    ? 'bg-slate-900/80 border border-white/10 text-slate-300'
                                                    : themeMode === 'light'
                                                    ? 'bg-white/80 border border-black/10 text-slate-900'
                                                    : 'bg-primary/80 border border-primary/20 text-white'
                                                : 'bg-red-950/80 border border-red-500/20 text-red-400'
                                        }`}>
                                            {hasTheme ? `Tema: ${themeMode}` : 'Sin Configurar'}
                                        </span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-slate-400 truncate max-w-full">
                                            {bg.url.split('/').pop()}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                            <span>{bg.width}x{bg.height} px</span>
                                            <span>•</span>
                                            <span>{(bg.file_size / 1024).toFixed(0)} KB</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-white/5">
                                        <button
                                            onClick={() => handleOpenThemeModal(bg)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-xl transition-all"
                                        >
                                            <Settings2 size={13} />
                                            Configurar Tema
                                        </button>
                                        <button
                                            onClick={() => {
                                                setBgToDelete(bg);
                                                setDeleteModalOpen(true);
                                            }}
                                            className="p-2 bg-red-950/20 border border-red-500/10 hover:border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                            title="Eliminar Fondo"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Subida de Fondo */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0b172a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Upload className="text-primary h-5 w-5" />
                                Subir Fondo Global
                            </h3>
                            <button
                                onClick={() => {
                                    setUploadModalOpen(false);
                                    setSelectedFile(null);
                                    setPreviewUrl(null);
                                }}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-5 space-y-4">
                            {/* File Upload Zone */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-300">Archivo de Imagen</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/10 hover:border-primary/40 rounded-xl p-8 text-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-2 group"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    {previewUrl ? (
                                        <div className="relative aspect-[16/9] w-full max-w-[200px] overflow-hidden rounded-lg border border-white/10">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="text-slate-500 group-hover:text-primary transition-colors h-8 w-8" />
                                            <span className="text-xs text-slate-300 font-medium">Haz click para seleccionar una imagen</span>
                                            <span className="text-[10px] text-slate-500">JPG, PNG o WEBP</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUploadModalOpen(false);
                                        setSelectedFile(null);
                                        setPreviewUrl(null);
                                    }}
                                    className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || uploading}
                                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="animate-spin h-3.5 w-3.5" />
                                            Subiendo...
                                        </>
                                    ) : (
                                        'Subir e Incorporar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Configuración de Tema (LETRAS / CONTRASTE) */}
            {themeModalOpen && selectedBg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="bg-[#0b172a] border border-white/10 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[650px] animate-in fade-in zoom-in duration-200">
                        {/* PANEL IZQUIERDO: CONFIGURADOR */}
                        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 overflow-y-auto">
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                                        <Settings2 className="text-primary h-5 w-5" />
                                        Configurar Tema de Fondo
                                    </h3>
                                    <button
                                        onClick={() => setThemeModalOpen(false)}
                                        className="text-slate-400 hover:text-white transition-colors md:hidden"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Selección de Plantilla de contraste rápida */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-slate-300">Contraste Predeterminado</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setThemeConfig(prev => ({ ...prev, mode: 'dark' }));
                                                applyPredefinedTheme('dark');
                                            }}
                                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                                themeConfig.mode === 'dark'
                                                    ? 'bg-slate-900 border-primary text-white shadow-md'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            Tema Claro (White)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setThemeConfig(prev => ({ ...prev, mode: 'light' }));
                                                applyPredefinedTheme('light');
                                            }}
                                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                                themeConfig.mode === 'light'
                                                    ? 'bg-slate-900 border-primary text-white shadow-md'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            Tema Oscuro (Dark)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setThemeConfig(prev => ({ ...prev, mode: 'custom' }))}
                                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                                themeConfig.mode === 'custom'
                                                    ? 'bg-slate-900 border-primary text-white shadow-md'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            Personalizado
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                        Selecciona el modo según el fondo: si el fondo es oscuro, elige el tema de letras claras (White) para asegurar contraste.
                                    </p>
                                </div>

                                {/* Inputs detallados de color pickers */}
                                <div className="space-y-4 pt-2 border-t border-white/5">
                                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Paleta de Colores del Memorial</h4>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Color de Título */}
                                        <div className="space-y-1">
                                            <label className="block text-[11px] font-semibold text-slate-300">Color de Títulos</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={themeConfig.title_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, title_color: e.target.value, mode: 'custom' }))}
                                                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0 shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={themeConfig.title_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, title_color: e.target.value, mode: 'custom' }))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Color de Subtítulo */}
                                        <div className="space-y-1">
                                            <label className="block text-[11px] font-semibold text-slate-300">Color de Subtítulos</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={themeConfig.subtitle_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, subtitle_color: e.target.value, mode: 'custom' }))}
                                                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0 shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={themeConfig.subtitle_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, subtitle_color: e.target.value, mode: 'custom' }))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Color de Textos */}
                                        <div className="space-y-1">
                                            <label className="block text-[11px] font-semibold text-slate-300">Color de Textos / Frases</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={themeConfig.text_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, text_color: e.target.value, mode: 'custom' }))}
                                                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0 shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={themeConfig.text_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, text_color: e.target.value, mode: 'custom' }))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Color de Acento / Botones */}
                                        <div className="space-y-1">
                                            <label className="block text-[11px] font-semibold text-slate-300">Color de Acento / Botones</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={themeConfig.accent_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, accent_color: e.target.value, mode: 'custom' }))}
                                                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0 shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={themeConfig.accent_color}
                                                    onChange={(e) => setThemeConfig(prev => ({ ...prev, accent_color: e.target.value, mode: 'custom' }))}
                                                    className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-3 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setThemeModalOpen(false)}
                                    className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTheme}
                                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    <Check size={14} />
                                    Guardar Tema
                                </button>
                            </div>
                        </div>

                        {/* PANEL DERECHO: PREVISUALIZACIÓN EN TIEMPO REAL */}
                        <div className="hidden md:flex md:w-1/2 bg-slate-950 p-6 flex-col justify-between relative overflow-hidden group">
                            {/* Imagen de fondo */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getImageUrl(selectedBg.url)}
                                alt="Vista previa de fondo"
                                className="absolute inset-0 w-full h-full object-cover opacity-80"
                            />
                            
                            {/* Capa de degrade (mimetizando el diseño celestial) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />

                            {/* Header del preview */}
                            <div className="relative z-10 flex justify-between items-center bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10">
                                <div className="flex items-center gap-2">
                                    <Eye className="text-primary h-4 w-4" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Previsualización del Memorial</span>
                                </div>
                                <button
                                    onClick={() => setThemeModalOpen(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Simulación del Memorial Hero */}
                            <div className="relative z-10 text-center my-auto px-4 py-8 space-y-4">
                                <div className="space-y-1">
                                    {/* Fecha / Subtítulo */}
                                    <span
                                        className="text-xs font-bold uppercase tracking-widest transition-colors duration-200"
                                        style={{ color: themeConfig.subtitle_color }}
                                    >
                                        2014 — 2026
                                    </span>
                                    {/* Nombre de la mascota / Título */}
                                    <h2
                                        className="text-3xl font-bold font-serif transition-colors duration-200"
                                        style={{ color: themeConfig.title_color }}
                                    >
                                        Tulioca
                                    </h2>
                                </div>

                                {/* Mensaje de despedida / Párrafo */}
                                <p
                                    className="text-sm italic font-light max-w-sm mx-auto leading-relaxed transition-colors duration-200"
                                    style={{ color: themeConfig.text_color }}
                                >
                                    "Gracias por enseñarme el verdadero significado del amor incondicional. Correrás libre para siempre en mi corazón..."
                                </p>

                                {/* Botón simulado */}
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        className="px-5 py-2 rounded-full text-xs font-bold shadow-md transition-all active:scale-95"
                                        style={{
                                            backgroundColor: themeConfig.accent_color,
                                            // Dinámicamente decidir color de texto del botón basado en el brillo del acento
                                            color: themeConfig.accent_color.toLowerCase() === '#ffffff' || themeConfig.accent_color.toLowerCase() === '#e2e8f0' || themeConfig.accent_color.toLowerCase() === '#f1f5f9' ? '#0f172a' : '#ffffff'
                                        }}
                                    >
                                        Encender una Vela
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10 text-center text-[10px] text-white/40 bg-black/30 backdrop-blur-sm py-1 rounded">
                                Los cambios de color se reflejarán instantáneamente al seleccionar este fondo.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Confirmar Eliminación */}
            {deleteModalOpen && bgToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0b172a] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">¿Eliminar Fondo de Pantalla?</h3>
                                <p className="text-xs text-slate-400 mt-2">
                                    Esta acción eliminará el archivo de forma permanente de la biblioteca de medios. Los memoriales que usen este fondo podrían perder la portada.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setDeleteModalOpen(false);
                                        setBgToDelete(null);
                                    }}
                                    className="flex-1 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-red-600/20"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
