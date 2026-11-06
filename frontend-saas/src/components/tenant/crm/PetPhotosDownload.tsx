"use client";

import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, Images, Loader2, Search } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { authHeader } from '@/lib/auth/token';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface PhotoItem {
    pet_id: number;
    pet_name: string;
    customer_name: string | null;
    index: number;
    url: string;
    filename: string;
}

interface PhotosPage {
    total: number;
    pets: number;
    page: number;
    page_size: number;
    zip_max: number;
    items: PhotoItem[];
}

const PAGE_SIZE = 10;

async function downloadFile(path: string, fallbackName: string) {
    const res = await fetch(path, { headers: authHeader(), credentials: 'same-origin' });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || 'No se pudo descargar');
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/** Mascotas → «Fotos de mascotas»: buscar por mascota o dueño, 10 por página, descarga individual o ZIP. */
export default function PetPhotosDownload() {
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [busy, setBusy] = useState<string | null>(null);

    // Espera a que se deje de escribir
    useEffect(() => {
        const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const { data, isLoading, isFetching } = useQuery<PhotosPage>({
        queryKey: ['tenant', 'pet-photos', q, page],
        queryFn: () => apiRequest(`/api/internal/pets/photos?page=${page}&page_size=${PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
        placeholderData: keepPreviousData,
    });
    const total = data?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const tooMany = !!data && total > data.zip_max;

    const downloadOne = async (it: PhotoItem) => {
        const key = `${it.pet_id}-${it.index}`;
        setBusy(key);
        try {
            await downloadFile(`/api/internal/pets/${it.pet_id}/photos/${it.index}/download`, it.filename);
        } catch (e) {
            showToast((e as Error).message, 'error');
        } finally {
            setBusy(null);
        }
    };

    const downloadAll = async () => {
        setBusy('all');
        try {
            const name = q ? `fotos-${q.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.zip` : 'fotos-mascotas.zip';
            await downloadFile(`/api/internal/pets/photos/download${q ? `?q=${encodeURIComponent(q)}` : ''}`, name);
        } catch (e) {
            showToast((e as Error).message, 'error');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary"><Images size={18} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Fotos de mascotas</h3>
                        <p className="text-xs text-muted-foreground">
                            {data ? `${total} foto${total === 1 ? '' : 's'} de ${data.pets} mascota${data.pets === 1 ? '' : 's'}` : 'Descarga las fotos de tus mascotas'}
                        </p>
                    </div>
                </div>
                <button type="button" onClick={downloadAll} disabled={!total || tooMany || busy === 'all'}
                    title={tooMany ? `Filtra para descargar hasta ${data?.zip_max} fotos a la vez` : 'Descargar todas las fotos del filtro en un ZIP'}
                    className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed">
                    {busy === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {busy === 'all' ? 'Preparando ZIP…' : q ? `Descargar ${total} (ZIP)` : 'Descargar todas (ZIP)'}
                </button>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre de mascota o dueño…"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-10 outline-none focus:border-primary/50 text-sm" />
                {isFetching && !isLoading && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            {tooMany && (
                <p className="text-xs text-amber-500">Son {total} fotos: filtra por mascota o dueño para descargar hasta {data?.zip_max} a la vez.</p>
            )}

            {isLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : !data?.items.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{q ? 'Sin fotos para esa búsqueda.' : 'Aún no hay fotos de mascotas.'}</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {data.items.map((it) => {
                        const key = `${it.pet_id}-${it.index}`;
                        return (
                            <div key={key} className="group relative rounded-2xl overflow-hidden bg-black/20 border border-white/5">
                                <div className="aspect-square">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={getImageUrl(it.url) || ''} alt={it.pet_name} loading="lazy" className="w-full h-full object-cover" />
                                </div>
                                <div className="p-2.5 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{it.pet_name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{it.customer_name || 'Sin dueño'}</p>
                                    </div>
                                    <button type="button" onClick={() => downloadOne(it)} disabled={busy === key}
                                        title="Descargar esta foto" aria-label={`Descargar foto de ${it.pet_name}`}
                                        className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition disabled:opacity-50">
                                        {busy === key ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-3 text-xs">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                        className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Página anterior">
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-muted-foreground tabular-nums">Página {page} de {pages}</span>
                    <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
                        className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Página siguiente">
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
