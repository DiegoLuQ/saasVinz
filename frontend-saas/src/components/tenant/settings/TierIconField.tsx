'use client';

/**
 * Ícono de un rango de peso (tarjetas de tamaño del catálogo de planes): imagen, no emojis.
 * Tres formas de elegirlo:
 *  - Biblioteca: íconos estándar que sube el SuperAdmin en Biblioteca → categoría «Íconos de tamaños»
 *    (`tamanos`, globales; GET /api/internal/media?category=tamanos devuelve solo globales al tenant).
 *  - Subir: imagen propia del crematorio (POST /api/internal/maintenance/weight-icon → R2).
 *  - Pegar URL: cualquier imagen https (p. ej. una de R2).
 * La URL queda en el rango al guardar los rangos (General o tabla de precios).
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Library, Link2, Loader2, PawPrint, Upload, X } from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

type LibraryItem = { id: number; url: string; description?: string | null; alt_text?: string | null };

const URL_MAX = 500;

export default function TierIconField({ value, onChange, label }: {
    value?: string | null;
    onChange: (url: string) => void;
    /** Nombre del rango, para los textos accesibles */
    label: string;
}) {
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'library' | 'url'>('library');
    const [items, setItems] = useState<LibraryItem[] | null>(null);
    const [loadingLib, setLoadingLib] = useState(false);
    const [urlText, setUrlText] = useState('');

    useEffect(() => {
        if (!open || mode !== 'library' || items !== null) return;
        let alive = true;
        setLoadingLib(true);
        apiRequest('/api/internal/media?category=tamanos&media_type=image&page_size=100')
            .then((res: { items?: LibraryItem[] } | LibraryItem[]) => {
                if (alive) setItems(Array.isArray(res) ? res : res.items || []);
            })
            .catch(() => alive && setItems([]))
            .finally(() => alive && setLoadingLib(false));
        return () => { alive = false; };
    }, [open, mode, items]);

    const upload = async (file: File) => {
        if (file.size > 2 * 1024 * 1024) {
            showToast('La imagen supera 2 MB', 'error');
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await apiRequest('/api/internal/maintenance/weight-icon', { method: 'POST', body: form });
            onChange(res.url);
            setOpen(false);
        } catch (err) {
            showToast((err as { message?: string })?.message || 'No se pudo subir el ícono', 'error');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const applyUrl = () => {
        const v = urlText.trim();
        if (!/^https?:\/\/\S+$/i.test(v)) {
            showToast('Pega una URL que empiece con https://', 'error');
            return;
        }
        if (v.length > URL_MAX) {
            showToast(`La URL no puede superar ${URL_MAX} caracteres`, 'error');
            return;
        }
        onChange(v);
        setOpen(false);
    };

    const openPicker = () => {
        setUrlText(value && /^https?:/i.test(value) ? value : '');
        setOpen(true);
    };

    const tabCls = (active: boolean) => `flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold cursor-pointer ${
        active ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`;

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={openPicker}
                disabled={uploading}
                title={value ? 'Cambiar ícono' : 'Elegir ícono'}
                aria-label={`${label}: ${value ? 'cambiar' : 'elegir'} ícono`}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-foreground/20 bg-background hover:border-primary cursor-pointer disabled:opacity-60"
            >
                {uploading ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                ) : value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getImageUrl(value)} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                    <ImagePlus size={16} className="text-muted-foreground" />
                )}
            </button>
            {value ? (
                <button type="button" onClick={() => onChange('')} aria-label={`${label}: quitar ícono`}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 cursor-pointer">
                    <X size={13} />
                </button>
            ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <PawPrint size={11} /> sin ícono
                </span>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}
            />

            {open && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Ícono de ${label}`}>
                    <div className="absolute inset-0 bg-black/50" onClick={() => !uploading && setOpen(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border border-foreground/10 bg-card p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-foreground">Ícono de {label}</h3>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
                                className="rounded-lg p-1 text-muted-foreground hover:bg-foreground/5 cursor-pointer"><X size={16} /></button>
                        </div>

                        <div className="flex gap-1 rounded-xl bg-foreground/5 p-1">
                            <button type="button" className={tabCls(mode === 'library')} onClick={() => setMode('library')}><Library size={13} /> Biblioteca</button>
                            <button type="button" className={tabCls(false)} onClick={() => inputRef.current?.click()} disabled={uploading}>
                                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Subir
                            </button>
                            <button type="button" className={tabCls(mode === 'url')} onClick={() => setMode('url')}><Link2 size={13} /> Pegar URL</button>
                        </div>

                        {mode === 'library' ? (
                            loadingLib ? (
                                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
                            ) : items && items.length > 0 ? (
                                <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                                    {items.map(it => {
                                        const active = value === it.url;
                                        return (
                                            <button key={it.id} type="button" title={it.description || it.alt_text || ''}
                                                onClick={() => { onChange(it.url); setOpen(false); }}
                                                className={`aspect-square rounded-xl border p-1.5 bg-background cursor-pointer hover:border-primary ${active ? 'border-primary ring-2 ring-primary/30' : 'border-foreground/10'}`}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={getImageUrl(it.url)} alt={it.alt_text || ''} loading="lazy" className="h-full w-full object-contain" />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="py-6 text-center text-xs text-muted-foreground">
                                    Aún no hay íconos en la biblioteca. Puedes subir uno propio o pegar una URL.
                                </p>
                            )
                        ) : (
                            <div className="space-y-2">
                                <input
                                    value={urlText}
                                    onChange={e => setUrlText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
                                    placeholder="https://…/icono.webp"
                                    maxLength={URL_MAX}
                                    autoFocus
                                    className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">PNG, JPG o WebP · máx. {URL_MAX} caracteres</span>
                                    <button type="button" onClick={applyUrl}
                                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground cursor-pointer">Usar URL</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
