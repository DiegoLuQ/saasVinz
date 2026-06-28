"use client";

import React from 'react';
import { FileText, Camera, Trash2, RefreshCw } from 'lucide-react';
import { API_URL } from '@/lib/tenant/api';
import type { Cremation } from '@/lib/tenant/orders/types';

interface EvidenceCardProps {
    currentCremation: Partial<Cremation>;
    setCurrentCremation: React.Dispatch<React.SetStateAction<Partial<Cremation>>>;
    localPreviews: string[];
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveLocalImage: (index: number) => void;
    onRemoveRemoteImage: (imagePath: string) => void;
    onSyncImages: () => void;
}

export default function EvidenceCard({
    currentCremation,
    setCurrentCremation,
    localPreviews,
    onImageSelect,
    onRemoveLocalImage,
    onRemoveRemoteImage,
    onSyncImages,
}: EvidenceCardProps) {
    const totalImages = (currentCremation?.images?.length || 0) + localPreviews.length;

    return (
        <div className="bg-white/[0.015] rounded-3xl border border-white/[0.07] p-6 sm:p-10 lg:p-12 transition-colors duration-300 hover:border-white/[0.12]">
            {/* Header */}
            <div className="flex items-center gap-5 mb-12">
                <div className="p-4 bg-white/10 rounded-2xl text-muted-foreground" aria-hidden="true">
                    <FileText size={28} />
                </div>
                <h2 className="text-2xl lg:text-3xl font-light text-white tracking-tight" id="section-evidence">
                    Observaciones y Evidencia
                </h2>
            </div>

            <div className="space-y-10" role="group" aria-labelledby="section-evidence">
                {/* Notes */}
                <div className="space-y-3">
                    <label htmlFor="input-notes" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                        Notas Internas
                    </label>
                    <textarea
                        id="input-notes"
                        value={currentCremation?.notes || ''}
                        onChange={(e) => setCurrentCremation(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-5 px-6 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 min-h-[140px] text-sm text-white font-medium resize-y transition-all"
                        placeholder="Detalles técnicos o logísticos relevantes..."
                        aria-label="Notas internas sobre la orden"
                    />
                </div>

                {/* Photo Evidence */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em]">
                            Evidencia Fotográfica
                            <span className="ml-2 font-mono text-white/60">({totalImages}/3)</span>
                            <span className="text-red-400 ml-1">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={onSyncImages}
                            className="text-[10px] font-black text-primary uppercase flex items-center gap-1.5 hover:opacity-80 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg"
                            aria-label="Cargar fotos desde el perfil de la mascota"
                        >
                            <RefreshCw size={11} aria-hidden="true" />
                            Cargar desde Mascota
                        </button>
                    </div>
                    <div
                        className="border-2 border-dashed border-white/[0.08] rounded-3xl p-6 sm:p-10 lg:p-12 hover:bg-white/[0.02] transition-all min-h-[200px] flex gap-5 overflow-x-auto items-center scrollbar-hide"
                        role="list"
                        aria-label={`Fotos adjuntas: ${totalImages} de 3`}
                    >
                        {/* Remote Images */}
                        {currentCremation?.images?.map((img, index) => (
                            <div
                                key={`remote-${index}`}
                                className="relative w-36 h-36 shrink-0 rounded-2xl overflow-hidden group border border-white/[0.08] shadow-xl shadow-black/20 ring-1 ring-white/[0.03]"
                                role="listitem"
                            >
                                <img
                                    src={img.startsWith('http') ? img : `${API_URL}${img}`}
                                    alt={`Evidencia fotográfica ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => onRemoveRemoteImage(img)}
                                        className="p-2.5 bg-red-500 rounded-full hover:scale-110 transition-transform"
                                        aria-label={`Eliminar foto ${index + 1}`}
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Local Previews */}
                        {localPreviews.map((preview, index) => (
                            <div
                                key={`local-${index}`}
                                className="relative w-36 h-36 shrink-0 rounded-2xl overflow-hidden group border border-white/[0.08] shadow-xl shadow-black/20 ring-1 ring-white/[0.03]"
                                role="listitem"
                            >
                                <img src={preview} alt={`Nueva foto ${index + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => onRemoveLocalImage(index)}
                                        className="p-2.5 bg-red-500 rounded-full hover:scale-110 transition-transform"
                                        aria-label={`Eliminar nueva foto ${index + 1}`}
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Image Button */}
                        {totalImages < 3 && (
                            <label
                                className="w-36 h-36 shrink-0 rounded-2xl border-2 border-dashed border-white/[0.08] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group active:scale-95"
                                role="listitem"
                                tabIndex={0}
                                aria-label="Añadir nueva foto"
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') (e.target as HTMLElement).click(); }}
                            >
                                <Camera size={28} className="text-muted-foreground group-hover:text-primary mb-2 transition-colors" aria-hidden="true" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em] group-hover:text-primary transition-colors">Añadir</span>
                                <input type="file" accept="image/*" className="hidden" onChange={onImageSelect} aria-hidden="true" />
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
