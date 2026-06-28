"use client";

import React from 'react';
import { Calendar, MapPin, FileText, Camera, Trash2, RefreshCw, Scale } from 'lucide-react';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { regions } from '@/lib/tenant/chile-data';
import { API_URL } from '@/lib/tenant/api';
import type { Cremation } from '@/lib/tenant/orders/types';

interface LogisticsEvidenceCardProps {
    currentCremation: Partial<Cremation>;
    setCurrentCremation: React.Dispatch<React.SetStateAction<Partial<Cremation>>>;
    localPreviews: string[];
    onWeightChange: (value: string) => void;
    onSyncAddress: () => void;
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveLocalImage: (index: number) => void;
    onRemoveRemoteImage: (imagePath: string) => void;
    onSyncImages: () => void;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

// Borderless input — focuses border only when active
const inputClass =
    "w-full h-12 bg-transparent border border-transparent hover:border-white/[0.08] focus:border-primary/40 focus:bg-black/20 rounded-xl px-3 outline-none focus:ring-2 focus:ring-primary/10 text-sm font-bold text-white transition-all";

// Section sub-heading
function SubHead({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground" aria-hidden="true">
                {icon}
            </div>
            <div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.18em]">{title}</h3>
                {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
            </div>
        </div>
    );
}

export default function LogisticsEvidenceCard({
    currentCremation,
    setCurrentCremation,
    localPreviews,
    onWeightChange,
    onSyncAddress,
    onImageSelect,
    onRemoveLocalImage,
    onRemoveRemoteImage,
    onSyncImages,
}: LogisticsEvidenceCardProps) {
    const totalImages = (currentCremation?.images?.length || 0) + localPreviews.length;

    return (
        <section className="bg-white/[0.02] rounded-3xl border border-white/[0.06] overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 space-y-12">

                {/* —— Subsection: Schedule & Weight —— */}
                <div>
                    <SubHead icon={<Calendar size={15} />} title="Programación" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-1">
                        <div className="space-y-1.5">
                            <label htmlFor="input-schedule" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Fecha y hora de retiro <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="input-schedule"
                                type="datetime-local"
                                required
                                value={currentCremation?.scheduled_at || ''}
                                onChange={(e) => setCurrentCremation(prev => ({ ...prev, scheduled_at: e.target.value }))}
                                className={inputClass}
                                aria-label="Fecha y hora de retiro programado"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="input-weight" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                                    <Scale size={10} aria-hidden="true" />
                                    Peso estimado (kg)
                                </label>
                                {currentCremation?.weight_price && currentCremation.weight_price > 0 && (
                                    <span className="text-[10px] text-[#00C985] font-mono font-bold">
                                        +{CLP.format(currentCremation.weight_price)}
                                    </span>
                                )}
                            </div>
                            <input
                                id="input-weight"
                                type="number"
                                step="0.1"
                                min="0"
                                value={currentCremation?.weight || ''}
                                onChange={(e) => onWeightChange(e.target.value)}
                                className={inputClass}
                                placeholder="Ej: 8.5"
                                aria-label="Peso estimado de la mascota en kilogramos"
                            />
                        </div>
                    </div>
                </div>

                {/* —— Subsection: Dirección de Entrega (devolución de cenizas) —— */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground" aria-hidden="true">
                                <MapPin size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.18em]">Dirección de Entrega</h3>
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Dónde se devuelven las cenizas</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onSyncAddress}
                            className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5 hover:opacity-80 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg"
                            aria-label="Sincronizar dirección de entrega desde datos del cliente"
                        >
                            <RefreshCw size={11} aria-hidden="true" />
                            Desde Cliente
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-1">
                        <div className="space-y-1.5">
                            <label htmlFor="select-region" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Región
                            </label>
                            <SearchableSelect
                                options={regions.map(r => ({ value: r.label, label: r.label }))}
                                value={currentCremation?.region || ''}
                                onChange={(val) => {
                                    setCurrentCremation(prev => ({ ...prev, region: String(val), city: '' }));
                                }}
                                placeholder="Región..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="select-city" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Comuna / Ciudad
                            </label>
                            <SearchableSelect
                                options={
                                    regions.find(r => r.label === currentCremation?.region)?.communes.map(c => ({ value: c, label: c })) || []
                                }
                                value={currentCremation?.city || ''}
                                onChange={(val) => setCurrentCremation(prev => ({ ...prev, city: String(val) }))}
                                placeholder={currentCremation?.region ? 'Comuna...' : 'Sin selección'}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label htmlFor="input-address" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Calle, número, departamento <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="input-address"
                                value={currentCremation?.address || ''}
                                onChange={(e) => setCurrentCremation(prev => ({ ...prev, address: e.target.value }))}
                                className={inputClass}
                                placeholder="Av. Providencia 1234, Depto 502"
                                aria-label="Dirección de entrega"
                            />
                        </div>
                    </div>
                </div>

                {/* —— Subsection: Dirección de Retiro (dónde se recoge la mascota) —— */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground" aria-hidden="true">
                                <MapPin size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.18em]">Dirección de Retiro</h3>
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Dónde se recoge la mascota</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCurrentCremation(prev => ({ ...prev, pickup_region: prev.region, pickup_city: prev.city, pickup_address: prev.address }))}
                            className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5 hover:opacity-80 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg"
                            aria-label="Copiar la dirección de entrega como dirección de retiro"
                        >
                            <RefreshCw size={11} aria-hidden="true" />
                            Igual a Entrega
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-1">
                        <div className="space-y-1.5">
                            <label htmlFor="select-pickup-region" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Región
                            </label>
                            <SearchableSelect
                                options={regions.map(r => ({ value: r.label, label: r.label }))}
                                value={currentCremation?.pickup_region || ''}
                                onChange={(val) => {
                                    setCurrentCremation(prev => ({ ...prev, pickup_region: String(val), pickup_city: '' }));
                                }}
                                placeholder="Región..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="select-pickup-city" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Comuna / Ciudad
                            </label>
                            <SearchableSelect
                                options={
                                    regions.find(r => r.label === currentCremation?.pickup_region)?.communes.map(c => ({ value: c, label: c })) || []
                                }
                                value={currentCremation?.pickup_city || ''}
                                onChange={(val) => setCurrentCremation(prev => ({ ...prev, pickup_city: String(val) }))}
                                placeholder={currentCremation?.pickup_region ? 'Comuna...' : 'Sin selección'}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label htmlFor="input-pickup-address" className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                Calle, número, departamento
                            </label>
                            <input
                                id="input-pickup-address"
                                value={currentCremation?.pickup_address || ''}
                                onChange={(e) => setCurrentCremation(prev => ({ ...prev, pickup_address: e.target.value }))}
                                className={inputClass}
                                placeholder="Ej: Clínica Veterinaria Andes, Av. Las Condes 567"
                                aria-label="Dirección de retiro"
                            />
                        </div>
                    </div>
                </div>

                {/* —— Subsection: Notes —— */}
                <div>
                    <SubHead icon={<FileText size={15} />} title="Notas Operativas" hint="Observaciones internas o instrucciones para el equipo" />
                    <textarea
                        id="input-notes"
                        value={currentCremation?.notes || ''}
                        onChange={(e) => setCurrentCremation(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-black/20 border border-white/[0.06] rounded-2xl py-4 px-5 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 min-h-[120px] text-sm text-white font-medium resize-y transition-all"
                        placeholder="Detalles técnicos o logísticos relevantes..."
                        aria-label="Notas internas sobre la orden"
                    />
                </div>

                {/* —— Subsection: Evidence Gallery —— */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground" aria-hidden="true">
                                <Camera size={15} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.18em]">
                                    Evidencia Fotográfica
                                    <span className="text-red-400 ml-1">*</span>
                                </h3>
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">{totalImages}/3 fotos</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onSyncImages}
                            className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5 hover:opacity-80 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg"
                            aria-label="Cargar fotos desde el perfil de la mascota"
                        >
                            <RefreshCw size={11} aria-hidden="true" />
                            Desde Mascota
                        </button>
                    </div>

                    {/* Gallery Grid — bigger thumbnails, more space */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" role="list" aria-label={`Galería: ${totalImages} de 3 fotos`}>
                        {currentCremation?.images?.map((img, index) => (
                            <div
                                key={`remote-${index}`}
                                className="relative aspect-square rounded-2xl overflow-hidden group border border-white/[0.06] bg-black/20"
                                role="listitem"
                            >
                                <img
                                    src={img.startsWith('http') ? img : `${API_URL}${img}`}
                                    alt={`Evidencia fotográfica ${index + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                                    <button
                                        type="button"
                                        onClick={() => onRemoveRemoteImage(img)}
                                        className="p-2 bg-red-500 rounded-full hover:scale-110 transition-transform shadow-lg"
                                        aria-label={`Eliminar foto ${index + 1}`}
                                    >
                                        <Trash2 size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {localPreviews.map((preview, index) => (
                            <div
                                key={`local-${index}`}
                                className="relative aspect-square rounded-2xl overflow-hidden group border border-primary/20 bg-black/20 ring-2 ring-primary/10"
                                role="listitem"
                            >
                                <img src={preview} alt={`Nueva foto ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <span className="absolute top-2 left-2 text-[9px] font-black text-primary bg-black/60 px-2 py-0.5 rounded-md uppercase tracking-wider">Nueva</span>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
                                    <button
                                        type="button"
                                        onClick={() => onRemoveLocalImage(index)}
                                        className="p-2 bg-red-500 rounded-full hover:scale-110 transition-transform shadow-lg"
                                        aria-label={`Eliminar nueva foto ${index + 1}`}
                                    >
                                        <Trash2 size={14} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {totalImages < 3 && (
                            <label
                                className="aspect-square rounded-2xl border-2 border-dashed border-white/[0.08] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03] transition-all group active:scale-95"
                                role="listitem"
                                tabIndex={0}
                                aria-label="Añadir nueva foto"
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') (e.target as HTMLElement).click(); }}
                            >
                                <Camera size={26} className="text-muted-foreground/60 group-hover:text-primary mb-2 transition-colors" aria-hidden="true" />
                                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.18em] group-hover:text-primary transition-colors">Añadir foto</span>
                                <input type="file" accept="image/*" className="hidden" onChange={onImageSelect} aria-hidden="true" />
                            </label>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
