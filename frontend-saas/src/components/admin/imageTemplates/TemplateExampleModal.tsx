"use client";

import React, { useState } from 'react';
import { X, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { getImageUrl } from '@/lib/admin/api';
import { setTemplateExample, uploadTemplateAsset } from '@/lib/admin/imageTemplates/api';
import type { ImageTemplate } from '@/lib/admin/imageTemplates/types';
import LibraryPickerModal from './LibraryPickerModal';

/**
 * Imagen de ejemplo de una plantilla: un resultado real o un montaje que muestra
 * a los crematorios cómo queda. Se puede cambiar aunque la plantilla esté en uso.
 */
export default function TemplateExampleModal({ template, onClose, onSaved }: {
    template: ImageTemplate;
    onClose: () => void;
    onSaved: (t: ImageTemplate) => void;
}) {
    const [current, setCurrent] = useState<string | null>(template.thumbnail_url);
    const [picking, setPicking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apply = async (url: string | null) => {
        setBusy(true);
        setError(null);
        try {
            const t = await setTemplateExample(template.id, url);
            setCurrent(t.thumbnail_url);
            onSaved(t);
        } catch (e) {
            setError((e as Error).message || 'No se pudo guardar');
        } finally {
            setBusy(false);
        }
    };

    // Archivo del equipo: se optimiza a WebP en el servidor y se asigna.
    const uploadAndApply = async (file: File) => {
        setBusy(true);
        setError(null);
        try {
            const res = await uploadTemplateAsset(file);
            await apply(res.url);
        } catch (e) {
            setError((e as Error).message || 'No se pudo subir la imagen');
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0a192f] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-white font-bold text-lg">Imagen de ejemplo</h3>
                        <p className="text-white/40 text-xs mt-0.5">
                            «{template.name}»: los crematorios la ven al elegir la plantilla, para tener una noción del resultado.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-1"><X size={20} /></button>
                </div>

                <div className="aspect-[4/5] max-h-[50vh] mx-auto rounded-xl overflow-hidden bg-black/30 ring-1 ring-white/10 flex items-center justify-center">
                    {current ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getImageUrl(current)} alt="Ejemplo" className="w-full h-full object-contain" />
                    ) : (
                        <p className="text-white/40 text-sm px-6 text-center">Sin imagen de ejemplo: los crematorios ven la vista previa con datos de ejemplo.</p>
                    )}
                </div>

                {error && <p className="text-red-300 text-sm">{error}</p>}

                <div className="flex gap-2">
                    {current && (
                        <button onClick={() => apply(null)} disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-white/70 text-sm font-bold disabled:opacity-50">
                            <Trash2 size={15} /> Quitar
                        </button>
                    )}
                    <button onClick={() => setPicking(true)} disabled={busy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold disabled:opacity-50">
                        {busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                        {current ? 'Cambiar imagen' : 'Elegir imagen'}
                    </button>
                </div>
            </div>

            {picking && (
                <div onClick={(e) => e.stopPropagation()}>
                    <LibraryPickerModal
                        isOpen
                        title="Imagen de ejemplo"
                        onClose={() => setPicking(false)}
                        onSelect={(item) => apply(item.url)}
                        onPickFile={uploadAndApply}
                        uploadHint="Se optimiza a WebP y se sube ahora"
                    />
                </div>
            )}
        </div>
    );
}
