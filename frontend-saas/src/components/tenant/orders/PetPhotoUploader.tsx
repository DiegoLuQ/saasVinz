"use client";

import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import ImageCropper from '@/components/tenant/ImageCropper';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface Props {
    petName?: string | null;
    /** Hay foto guardada: el botón es "Cambiar foto"; si no, "Subir foto" */
    hasPhoto: boolean;
    /** Hay una foto recortada esperando a que se guarde la orden */
    pending: boolean;
    /** Foto recortada (1:1). NO se sube aquí: se sube al guardar la orden. */
    onPicked: (blob: Blob) => void;
    onDiscard: () => void;
}

const MAX_MB = 10;

/**
 * Elegir y recortar (1:1) la foto de la mascota desde la orden. La subida a
 * Cloudflare (optimizada a WebP en el backend) ocurre recién al Actualizar /
 * Confirmar la orden, para no dejar archivos si hay un error o se descarta.
 */
export default function PetPhotoUploader({ petName, hasPhoto, pending, onPicked, onDiscard }: Props) {
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [cropSource, setCropSource] = useState<string | null>(null);

    const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Selecciona una imagen (JPG, PNG o WebP)', 'error');
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            showToast(`La imagen supera ${MAX_MB} MB`, 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setCropSource(reader.result as string);
        reader.readAsDataURL(file);
    };

    return (
        <>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />

            {pending ? (
                <div className="mt-2 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/25 px-2 py-0.5 rounded-md">
                        Se guarda al actualizar la orden
                    </span>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => inputRef.current?.click()} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white inline-flex items-center gap-1">
                            <Camera size={12} /> Otra
                        </button>
                        <button type="button" onClick={onDiscard} className="text-[11px] font-bold text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1">
                            <X size={12} /> Quitar
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={hasPhoto
                        ? 'mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white transition'
                        : 'mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:opacity-90 shadow-sm transition'}
                >
                    {hasPhoto ? <Camera size={13} /> : <Upload size={13} />}
                    {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
                </button>
            )}

            {cropSource && (
                <ImageCropper
                    image={cropSource}
                    aspect={1}
                    onCropComplete={(blob) => { setCropSource(null); onPicked(blob); }}
                    onCancel={() => setCropSource(null)}
                    title={`Recortar foto de ${petName || 'la mascota'} (1:1)`}
                />
            )}
        </>
    );
}
