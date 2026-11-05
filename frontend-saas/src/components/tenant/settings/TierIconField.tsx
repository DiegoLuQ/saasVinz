'use client';

/**
 * Ícono de un rango de peso (tarjetas de tamaño del catálogo de planes): imagen subida por el
 * crematorio, no emojis. Se sube al elegirla (POST /api/internal/maintenance/weight-icon) y la URL
 * queda en el rango al guardar los rangos (General o tabla de precios).
 */
import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, PawPrint, X } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

export default function TierIconField({ value, onChange, label }: {
    value?: string | null;
    onChange: (url: string) => void;
    /** Nombre del rango, para los textos accesibles */
    label: string;
}) {
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

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
        } catch (err) {
            showToast((err as { message?: string })?.message || 'No se pudo subir el ícono', 'error');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                title={value ? 'Cambiar ícono' : 'Subir ícono (PNG, JPG o WebP)'}
                aria-label={`${label}: ${value ? 'cambiar' : 'subir'} ícono`}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-foreground/20 bg-background hover:border-primary cursor-pointer disabled:opacity-60"
            >
                {uploading ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                ) : value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={value} alt="" className="h-full w-full object-contain p-1" />
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
        </div>
    );
}
