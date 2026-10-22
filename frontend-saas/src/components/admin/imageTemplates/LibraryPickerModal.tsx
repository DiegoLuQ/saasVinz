"use client";

import React, { useEffect, useState } from 'react';
import { Search, Upload, X, Loader2, ImageIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';

export interface LibraryItem {
    id: number;
    url: string;
    category: string;
    description: string | null;
    tenant_id: number | null;
    tenant_name: string | null;
    width: number | null;
    height: number | null;
}

interface Facets {
    tenants: { id: number; name: string; count: number }[];
    categories: { value: string; count: number }[];
}

interface Props {
    isOpen: boolean;
    title: string;
    /** Categoría con la que abre (ej. 'pets' para fotos de mascotas). Vacío = todas. */
    defaultCategory?: string;
    onClose: () => void;
    onSelect: (item: LibraryItem) => void;
    /** Si se define, muestra "Subir desde mi equipo". El archivo NO se sube aquí: decide quien llama. */
    onPickFile?: (file: File) => void;
    uploadHint?: string;
}

const PAGE_SIZE = 30;

/**
 * Modal para elegir una imagen ya existente en la Biblioteca de Medios, así no
 * se sube dos veces el mismo archivo. Filtra por categoría, origen (global /
 * crematorio) y texto.
 */
export default function LibraryPickerModal({
    isOpen, title, defaultCategory = '', onClose, onSelect, onPickFile, uploadHint,
}: Props) {
    const [facets, setFacets] = useState<Facets | null>(null);
    const [category, setCategory] = useState(defaultCategory);
    const [origin, setOrigin] = useState<string>('all'); // 'all' | 'global' | tenant id
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setCategory(defaultCategory);
        setPage(1);
        if (!facets) apiRequest('/api/internal/media/facets').then(setFacets).catch(() => setFacets({ tenants: [], categories: [] }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, defaultCategory]);

    useEffect(() => {
        const t = setTimeout(() => { setDebounced(query); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        if (!isOpen) return;
        const params = new URLSearchParams({ media_type: 'image', page: String(page), page_size: String(PAGE_SIZE) });
        if (category) params.set('category', category);
        if (origin === 'global') params.set('global_only', 'true');
        else if (origin !== 'all') params.set('tenant_id', origin);
        if (debounced.trim()) params.set('q', debounced.trim());

        let cancelled = false;
        setLoading(true);
        setError(null);
        apiRequest(`/api/internal/media?${params.toString()}`)
            .then((data) => {
                if (cancelled) return;
                setItems(data?.items || []);
                setTotalPages(data?.total_pages || 0);
            })
            .catch((e) => { if (!cancelled) setError((e as Error).message || 'No se pudo cargar la biblioteca'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, category, origin, debounced, page]);

    if (!isOpen) return null;

    const selectCls = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/60';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
                    <div>
                        <h3 className="text-white font-bold">{title}</h3>
                        <p className="text-white/40 text-xs">Reutiliza una imagen de la Biblioteca de Medios: no se vuelve a subir.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10"><X size={18} /></button>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-white/10">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o descripción…"
                            className={`${selectCls} w-full pl-8`} />
                    </div>
                    <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={selectCls}>
                        <option value="" className="bg-slate-900">Todas las categorías</option>
                        {(facets?.categories || []).map(c => (
                            <option key={c.value} value={c.value} className="bg-slate-900">{c.value} ({c.count})</option>
                        ))}
                    </select>
                    <select value={origin} onChange={(e) => { setOrigin(e.target.value); setPage(1); }} className={selectCls}>
                        <option value="all" className="bg-slate-900">Todo origen</option>
                        <option value="global" className="bg-slate-900">Solo globales</option>
                        {(facets?.tenants || []).map(t => (
                            <option key={t.id} value={String(t.id)} className="bg-slate-900">{t.name} ({t.count})</option>
                        ))}
                    </select>
                    {onPickFile && (
                        <label className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-lg text-sm font-bold cursor-pointer"
                            title={uploadHint}>
                            <Upload size={14} /> Subir desde mi equipo
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { onPickFile(f); onClose(); } }} />
                        </label>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>
                    ) : error ? (
                        <p className="text-red-300 text-sm text-center py-10">{error}</p>
                    ) : items.length === 0 ? (
                        <div className="text-center text-white/40 py-16">
                            <ImageIcon className="mx-auto mb-3 opacity-40" size={40} />
                            No hay imágenes con estos filtros.
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {items.map(it => (
                                <button key={it.id} onClick={() => { onSelect(it); onClose(); }} title={it.description || it.url}
                                    className="group relative aspect-square rounded-xl overflow-hidden bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:16px_16px] ring-1 ring-white/10 hover:ring-2 hover:ring-primary">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={getImageUrl(it.url)} alt={it.description || ''} loading="lazy" className="w-full h-full object-contain" />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-[9px] text-white/80 truncate text-left">
                                        {it.tenant_name || 'Global'} · {it.category}
                                    </div>
                                    <div className="absolute inset-0 bg-primary/30 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                        <Check className="text-white" size={22} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-white/10 text-sm text-white/60">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
                        Página {page} de {totalPages}
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
                    </div>
                )}
            </div>
        </div>
    );
}
