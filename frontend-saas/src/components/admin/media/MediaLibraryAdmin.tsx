"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Upload,
    Image as ImageIcon,
    Film,
    Search,
    Filter,
    MoreVertical,
    X,
    Check,
    Link as LinkIcon,
    Trash2,
    Crop,
    Edit2,
    Play,
    ChevronLeft,
    ChevronRight,
    Inbox
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { authHeader } from '@/lib/auth/token';
import MediaFilterSelect, { type FilterOption } from './MediaFilterSelect';
import { Building2, FolderTree } from 'lucide-react';

interface MediaItem {
    id: number;
    tenant_id?: number | null;
    tenant_name?: string | null;
    url: string;
    media_type: 'image' | 'video';
    category: string;
    ratio: string;
    description: string;
    alt_text: string;
    file_size: number;
    width: number;
    height: number;
    duration?: number;
    thumbnail_url?: string;
    created_at: string;
}

const PAGE_SIZE = 24;

interface MediaFacets {
    total: number;
    global_count: number;
    tenants: { id: number; name: string; count: number }[];
    categories: { value: string; count: number }[];
}

export default function MediaLibraryAdmin() {
    const { showToast } = useToast();
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
    const [selectedTenant, setSelectedTenant] = useState<string>('all'); // 'all' | 'global' | id
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Paginación (servidor)
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [facets, setFacets] = useState<MediaFacets>({ total: 0, global_count: 0, tenants: [], categories: [] });

    // Upload State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadForm, setUploadForm] = useState({
        category: 'gallery',
        ratio: 'original',
        description: '',
        alt_text: '',
        processing_mode: 'optimized'
    });

    // Edit/Delete State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const apiBase = () => (typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '');

    // Carga inicial: facets (para los filtros) + primera página
    useEffect(() => {
        fetchFacets();
        fetchMedia(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Al cambiar un filtro, volver a la página 1 y recargar desde el servidor
    useEffect(() => {
        fetchMedia(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedTenant, selectedCategory]);

    const fetchFacets = async () => {
        try {
            const res = await fetch(`${apiBase()}/api/internal/media/facets`, { headers: { ...authHeader() } });
            if (res.ok) setFacets(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const fetchMedia = async (targetPage = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(targetPage));
            params.set('page_size', String(PAGE_SIZE));
            if (activeTab !== 'all') params.set('media_type', activeTab);
            if (selectedCategory !== 'all') params.set('category', selectedCategory);
            if (selectedTenant === 'global') params.set('global_only', 'true');
            else if (selectedTenant !== 'all') params.set('tenant_id', selectedTenant);

            const res = await fetch(`${apiBase()}/api/internal/media/?${params.toString()}`, {
                headers: { ...authHeader() }
            });
            if (res.ok) {
                const data = await res.json();
                setMediaItems(data.items);
                setPage(data.page);
                setTotalPages(data.total_pages);
                setTotal(data.total);
            }
        } catch (error) {
            console.error(error);
            showToast("No se pudo cargar la biblioteca de medios", "error");
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (p: number) => {
        const clamped = Math.min(Math.max(1, p), Math.max(1, totalPages));
        if (clamped !== page) fetchMedia(clamped);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setUploadModalOpen(true);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('category', uploadForm.category);
        formData.append('ratio', uploadForm.ratio);
        formData.append('description', uploadForm.description);
        formData.append('alt_text', uploadForm.alt_text);
        formData.append('processing_mode', uploadForm.processing_mode);

        try {
            const isServer = typeof window === 'undefined';
            const API_URL = !isServer ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
            const res = await fetch(`${API_URL}/api/internal/media/upload`, {
                method: 'POST',
                headers: { ...authHeader() },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            await res.json();
            setUploadModalOpen(false);
            setSelectedFile(null);
            setPreviewUrl(null);
            setUploadForm(prev => ({ ...prev, description: '', alt_text: '' }));
            showToast("Archivo subido correctamente", "success");
            // Recargar facets (contadores) y volver a la primera página
            fetchFacets();
            fetchMedia(1);
        } catch (error) {
            console.error(error);
            showToast("No se pudo subir el archivo", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingItem) return;

        try {
            const formData = new FormData();
            formData.append('category', editingItem.category);
            formData.append('description', editingItem.description);
            formData.append('alt_text', editingItem.alt_text);

            const isServer = typeof window === 'undefined';
            const API_URL = !isServer ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
            const res = await fetch(`${API_URL}/api/internal/media/${editingItem.id}`, {
                method: 'PUT',
                headers: { ...authHeader() },
                body: formData
            });

            if (!res.ok) throw new Error('Update failed');

            const updatedItem = await res.json();
            setMediaItems(mediaItems.map(item => item.id === updatedItem.id ? updatedItem : item));
            setEditModalOpen(false);
            setEditingItem(null);
            showToast("Archivo actualizado", "success");
        } catch (error) {
            console.error(error);
            showToast("No se pudo actualizar el archivo", "error");
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;

        try {
            const isServer = typeof window === 'undefined';
            const API_URL = !isServer ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
            const res = await fetch(`${API_URL}/api/internal/media/${itemToDelete.id}`, {
                method: 'DELETE',
                headers: { ...authHeader() }
            });

            // 404 = el archivo ya no existe en el servidor (lista desactualizada):
            // lo tratamos como eliminado para no dejar al usuario atascado.
            if (!res.ok && res.status !== 404) {
                let detail = '';
                try {
                    const body = await res.json();
                    detail = body?.detail || body?.message || '';
                } catch {
                    try { detail = await res.text(); } catch { /* ignore */ }
                }
                throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
            }

            setDeleteModalOpen(false);
            setItemToDelete(null);
            showToast(res.status === 404 ? "El archivo ya no existía; se quitó de la lista" : "Archivo eliminado", "success");
            // Si era el último item de una página > 1, retroceder una página
            const nextPage = (mediaItems.length === 1 && page > 1) ? page - 1 : page;
            fetchFacets();
            fetchMedia(nextPage);
        } catch (error: any) {
            console.error('Error al eliminar media:', error);
            showToast(`No se pudo eliminar el archivo: ${error?.message || error}`, "error");
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                showToast("URL copiada al portapapeles", "success");
            } else {
                // Fallback for non-secure contexts or when navigator.clipboard is unavailable
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast("URL copiada al portapapeles", "success");
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                    showToast("No se pudo copiar la URL", "error");
                }
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error(error);
            showToast("No se pudo copiar la URL", "error");
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    // Etiquetas amigables para las categorías técnicas
    const CATEGORY_LABELS: Record<string, string> = {
        pets: 'Mascotas', plans: 'Planes', products: 'Productos', recuerdos: 'Recuerdos',
        memorials: 'Memoriales', logos: 'Logos', tenants: 'Logos de empresa',
        cremations: 'Cremaciones', signatures: 'Firmas', logistics: 'Logística',
        technical_evidence: 'Evidencia técnica', workflow_evidence: 'Evidencia de proceso',
        submissions: 'Formularios', template_assets: 'Plantillas', backgrounds: 'Fondos',
        saas: 'SaaS (global)', disenos: 'Diseños', gallery: 'Galería', receipts: 'Recibos',
    };
    const catLabel = (c: string) => CATEGORY_LABELS[c] || c;

    // Opciones de los dropdowns: vienen de /facets (toda la biblioteca, no la página)
    const tenantSelectOptions = useMemo<FilterOption[]>(() => {
        const opts: FilterOption[] = [{ value: 'all', label: 'Todas las empresas', count: facets.total ?? undefined }];
        if (facets.global_count > 0) opts.push({ value: 'global', label: 'Global (SuperAdmin)', count: facets.global_count });
        facets.tenants.forEach(t => opts.push({ value: String(t.id), label: t.name, count: t.count }));
        return opts;
    }, [facets]);

    const categorySelectOptions = useMemo<FilterOption[]>(() => {
        const opts: FilterOption[] = [{ value: 'all', label: 'Todas las categorías', count: facets.total ?? undefined }];
        facets.categories.forEach(c => opts.push({ value: c.value, label: catLabel(c.value), count: c.count }));
        return opts;
    }, [facets]);

    // El servidor ya devuelve la página filtrada; renderizamos tal cual.
    const filteredItems = mediaItems;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Biblioteca de Medios</h2>
                    <p className="text-muted-foreground">Gestiona imágenes y videos de la plataforma.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-primary text-black font-bold py-2 px-4 rounded-xl flex items-center gap-2 
               transition-all duration-200
               hover:brightness-110 
               active:brightness-90 
               active:text-black/70"
                    >
                        <Upload size={18} />
                        Subir Archivo
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,video/*"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'all' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
                >
                    Todos
                    {activeTab === 'all' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('image')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'image' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
                >
                    Imágenes
                    {activeTab === 'image' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('video')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'video' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
                >
                    Videos
                    {activeTab === 'video' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />}
                </button>
            </div>

            {/* Filtros por empresa y categoría */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 sm:max-w-xs">
                    <MediaFilterSelect
                        label="Empresa (tenant)"
                        value={selectedTenant}
                        onChange={setSelectedTenant}
                        options={tenantSelectOptions}
                        icon={<Building2 size={15} />}
                        searchable
                    />
                </div>
                <div className="flex-1 sm:max-w-xs">
                    <MediaFilterSelect
                        label="Categoría"
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={categorySelectOptions}
                        icon={<FolderTree size={15} />}
                    />
                </div>
                {(selectedTenant !== 'all' || selectedCategory !== 'all' || activeTab !== 'all') && (
                    <button
                        onClick={() => { setSelectedTenant('all'); setSelectedCategory('all'); setActiveTab('all'); }}
                        className="text-xs font-bold text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-2xl py-2.5 px-4 transition-colors whitespace-nowrap"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            <p className="text-xs text-muted-foreground/60">
                {total} archivo{total === 1 ? '' : 's'}
                {selectedTenant !== 'all' || selectedCategory !== 'all' || activeTab !== 'all' ? ' (filtrado)' : ''}
                {totalPages > 1 && <> · Página {page} de {totalPages}</>}
            </p>

            {/* Gallery Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-square bg-white/5 rounded-xl"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="group relative aspect-square bg-black/40 rounded-xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all">
                            {item.media_type === 'image' ? (
                                <img src={getImageUrl(item.url)} alt={item.alt_text} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
                                    {item.thumbnail_url ? (
                                        <img src={getImageUrl(item.thumbnail_url)} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                    ) : (
                                        <video src={getImageUrl(item.url)} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                            <Play className="text-white ml-1" size={20} fill="white" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Overlay Info */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
                                <p className="text-xs text-white truncate font-medium">{item.description || "Sin descripción"}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[10px] text-white/60">{item.ratio}</span>
                                    <span className="text-[10px] text-white/60">{formatBytes(item.file_size)}</span>
                                </div>
                            </div>

                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(getImageUrl(item.url));
                                    }}
                                    className="p-1.5 bg-black/60 hover:bg-white text-white hover:text-black rounded-lg backdrop-blur-sm"
                                    title="Copiar URL"
                                >
                                    <LinkIcon size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingItem(item);
                                        setEditModalOpen(true);
                                    }}
                                    className="p-1.5 bg-black/60 hover:bg-blue-500 text-white rounded-lg backdrop-blur-sm"
                                    title="Editar"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setItemToDelete(item);
                                        setDeleteModalOpen(true);
                                    }}
                                    className="p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && mediaItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-4">
                        <Inbox size={28} />
                    </div>
                    <p className="text-white/70 font-bold mb-1">Sin archivos</p>
                    <p className="text-white/40 text-sm max-w-sm">
                        {selectedTenant !== 'all' || selectedCategory !== 'all' || activeTab !== 'all'
                            ? 'No hay archivos que coincidan con los filtros seleccionados.'
                            : 'Aún no hay archivos en la biblioteca.'}
                    </p>
                </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        onClick={() => goToPage(page - 1)}
                        disabled={page <= 1 || loading}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-bold text-white/80 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={16} /> Anterior
                    </button>

                    {/* Números de página (ventana alrededor de la actual) */}
                    <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                            .map((p, idx, arr) => (
                                <React.Fragment key={p}>
                                    {idx > 0 && p - arr[idx - 1] > 1 && (
                                        <span className="px-1.5 text-white/30">…</span>
                                    )}
                                    <button
                                        onClick={() => goToPage(p)}
                                        disabled={loading}
                                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                                            p === page
                                                ? 'bg-primary text-black'
                                                : 'border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}
                    </div>

                    <span className="sm:hidden text-sm font-bold text-white/60 px-2">{page} / {totalPages}</span>

                    <button
                        onClick={() => goToPage(page + 1)}
                        disabled={page >= totalPages || loading}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-bold text-white/80 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        Siguiente <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Upload Modal */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl">
                        {/* Preview Section */}
                        <div className="w-full md:w-1/2 bg-black/50 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-white/10">
                            {uploadForm.ratio !== 'original' && selectedFile?.type.startsWith('image/') && (
                                <div className="absolute top-4 left-4 z-10 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <Crop size={12} />
                                    Recorte Automático {uploadForm.ratio}
                                </div>
                            )}

                            {previewUrl ? (
                                selectedFile?.type.startsWith('image/') ? (
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-h-[300px] md:max-h-[400px] object-contain rounded-lg shadow-lg"
                                        style={{
                                            aspectRatio: uploadForm.ratio === 'original' ? 'auto' : uploadForm.ratio.replace(':', '/')
                                        }}
                                    />
                                ) : (
                                    <video src={previewUrl} controls className="max-h-[400px] w-full rounded-lg" />
                                )
                            ) : (
                                <div className="text-white/20">Preview no disponible</div>
                            )}
                            <p className="mt-4 text-xs text-center text-white/40">
                                {selectedFile?.name} - {formatBytes(selectedFile?.size || 0)}
                            </p>
                        </div>

                        {/* Form Section */}
                        <div className="w-full md:w-1/2 p-6 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Subir Archivo</h3>
                                <button onClick={() => setUploadModalOpen(false)} className="text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-white/60 uppercase mb-2">Categoría</label>
                                    <select
                                        value={uploadForm.category}
                                        onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                                    >
                                        <option value="gallery" className="text-black">Galería General</option>
                                        <option value="altars" className="text-black">Fondos de Altar</option>
                                        <option value="logos" className="text-black">Logos/Marcas</option>
                                        <option value="objects" className="text-black">Objetos (3D/2D)</option>
                                        <option value="memories" className="text-black">Recuerdos/Fotos</option>
                                        <option value="music" className="text-black">Música/Audio</option>
                                        <option value="videos" className="text-black">Videos</option>
                                        <option value="ui" className="text-black">Interfaz (UI)</option>
                                        <option value="backgrounds" className="text-black">Fondos Web</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/60 uppercase mb-2">Modo de Procesamiento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setUploadForm({ ...uploadForm, processing_mode: 'optimized' })}
                                            className={`py-3 rounded-xl text-sm font-bold border transition-all ${uploadForm.processing_mode === 'optimized'
                                                ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20'
                                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
                                        >
                                            Optimizado
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadForm({ ...uploadForm, processing_mode: 'original' })}
                                            className={`py-3 rounded-xl text-sm font-bold border transition-all ${uploadForm.processing_mode === 'original'
                                                ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20'
                                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
                                        >
                                            Original
                                        </button>
                                    </div>
                                    {uploadForm.processing_mode === 'original' && (
                                        <p className="text-xs text-white/40 mt-2">El archivo se guardará sin optimización. Tamaño y formato originales.</p>
                                    )}
                                </div>

                                {selectedFile?.type.startsWith('image/') && (
                                    <div>
                                        <label className="block text-xs font-bold text-white/60 uppercase mb-2">Aspect Ratio (Recorte)</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['original', '1:1', '16:9', '9:16'].map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setUploadForm({ ...uploadForm, ratio: r })}
                                                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${uploadForm.ratio === r
                                                        ? 'bg-primary text-black border-primary'
                                                        : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'}`}
                                                >
                                                    {r.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-white/60 uppercase mb-2">Descripción</label>
                                    <input
                                        type="text"
                                        value={uploadForm.description}
                                        onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                        placeholder="Ej: Fondo de atardecer..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/60 uppercase mb-2">Texto Alternativo (SEO)</label>
                                    <input
                                        type="text"
                                        value={uploadForm.alt_text}
                                        onChange={(e) => setUploadForm({ ...uploadForm, alt_text: e.target.value })}
                                        placeholder="Descripción para lectores de pantalla..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-3">
                                <button
                                    onClick={() => setUploadModalOpen(false)}
                                    className="px-6 py-3 rounded-xl hover:bg-white/5 text-white/60 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="bg-primary hover:bg-primary/90 text-black font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? 'Procesando...' : 'Subir y Optimizar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModalOpen && editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Editar Archivo</h3>
                            <button onClick={() => setEditModalOpen(false)} className="text-white/40 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/60 uppercase mb-2">Categoría</label>
                                <select
                                    value={editingItem.category}
                                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                                >
                                    <option value="gallery" className="text-black">Galería General</option>
                                    <option value="altars" className="text-black">Fondos de Altar</option>
                                    <option value="logos" className="text-black">Logos/Marcas</option>
                                    <option value="objects" className="text-black">Objetos (3D/2D)</option>
                                    <option value="memories" className="text-black">Recuerdos/Fotos</option>
                                    <option value="music" className="text-black">Música/Audio</option>
                                    <option value="videos" className="text-black">Videos</option>
                                    <option value="ui" className="text-black">Interfaz (UI)</option>
                                    <option value="backgrounds" className="text-black">Fondos Web</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 uppercase mb-2">Descripción</label>
                                <input
                                    type="text"
                                    value={editingItem.description}
                                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 uppercase mb-2">Texto Alternativo (SEO)</label>
                                <input
                                    type="text"
                                    value={editingItem.alt_text}
                                    onChange={(e) => setEditingItem({ ...editingItem, alt_text: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="px-6 py-3 rounded-xl hover:bg-white/5 text-white/60 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdate}
                                className="bg-primary hover:bg-primary/90 text-black font-bold px-8 py-3 rounded-xl shadow-lg transition-all"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">¿Eliminar archivo?</h3>
                        <p className="text-white/60 text-sm mb-6">
                            Estás a punto de eliminar permanentemente este archivo. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-4 py-2 rounded-lg hover:bg-white/5 text-white/60 text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2 rounded-lg text-sm shadow-lg transition-all"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
