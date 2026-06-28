"use client";

import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { regions } from '@/lib/tenant/chile-data';
import type { Cremation } from '@/lib/tenant/orders/types';

interface LogisticsCardProps {
    currentCremation: Partial<Cremation>;
    setCurrentCremation: React.Dispatch<React.SetStateAction<Partial<Cremation>>>;
    onWeightChange: (value: string) => void;
    onSyncAddress: () => void;
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

const inputClass =
    "w-full h-12 bg-black/20 border border-white/10 rounded-2xl px-5 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 text-sm font-medium text-white transition-all";

export default function LogisticsCard({
    currentCremation,
    setCurrentCremation,
    onWeightChange,
    onSyncAddress,
}: LogisticsCardProps) {
    return (
        <div className="bg-white/[0.015] rounded-3xl border border-white/[0.07] transition-colors duration-300 hover:border-white/[0.12]">
            <div className="p-6 sm:p-10 lg:p-12 relative">
                {/* Header */}
                <div className="flex items-center gap-5 mb-12">
                    <div className="p-4 bg-blue-500/10 rounded-2xl" aria-hidden="true">
                        <Calendar className="text-blue-400" size={28} />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-light text-white tracking-tight" id="section-logistics">
                        Logística
                    </h2>
                </div>

                {/* Schedule + Weight Sub-Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-white/[0.06]" role="group" aria-labelledby="section-logistics">
                    <div className="space-y-3">
                        <label htmlFor="input-schedule" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                            Programación Retiro <span className="text-red-400">*</span>
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
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label htmlFor="input-weight" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                                Peso Estimado (kg)
                            </label>
                            {currentCremation?.weight_price && currentCremation.weight_price > 0 && (
                                <span
                                    className="bg-[#00C985]/10 border border-[#00C985]/20 text-[#00C985] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter font-mono"
                                    aria-label={`Cargo adicional por peso: ${CLP.format(currentCremation.weight_price)}`}
                                >
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

                {/* Dirección de Entrega (devolución de cenizas) */}
                <div className="mt-10">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.18em]">Dirección de Entrega <span className="text-muted-foreground/50 font-medium normal-case tracking-normal">· devolución de cenizas</span></span>
                        <button
                            type="button"
                            onClick={onSyncAddress}
                            className="text-[10px] font-black text-primary uppercase flex items-center gap-1.5 hover:opacity-80 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg"
                            aria-label="Sincronizar dirección de entrega desde datos del cliente"
                        >
                            <RefreshCw size={11} aria-hidden="true" />
                            Desde Cliente
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label htmlFor="select-region" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                                Región
                            </label>
                            <SearchableSelect
                                options={regions.map(r => ({ value: r.label, label: r.label }))}
                                value={currentCremation?.region || ''}
                                onChange={(val) => {
                                    setCurrentCremation(prev => ({
                                        ...prev,
                                        region: String(val),
                                        city: '',
                                    }));
                                }}
                                placeholder="Región..."
                            />
                        </div>
                        <div className="space-y-3">
                            <label htmlFor="select-city" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
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
                        <div className="space-y-3 md:col-span-2">
                            <label htmlFor="input-address" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                                Dirección Exacta <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="input-address"
                                value={currentCremation?.address || ''}
                                onChange={(e) => setCurrentCremation(prev => ({ ...prev, address: e.target.value }))}
                                className={inputClass}
                                placeholder="Calle, número, departamento..."
                                aria-label="Dirección de entrega"
                            />
                        </div>
                    </div>
                </div>

                {/* Dirección de Retiro (dónde se recoge la mascota) */}
                <div className="mt-10 pt-10 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.18em]">Dirección de Retiro <span className="text-muted-foreground/50 font-medium normal-case tracking-normal">· dónde se recoge la mascota</span></span>
                        <button
                            type="button"
                            onClick={() => setCurrentCremation(prev => ({ ...prev, pickup_region: prev.region, pickup_city: prev.city, pickup_address: prev.address }))}
                            className="text-[10px] font-black text-primary uppercase flex items-center gap-1.5 hover:opacity-80 transition-opacity bg-primary/10 px-3 py-1.5 rounded-lg"
                            aria-label="Copiar la dirección de entrega como dirección de retiro"
                        >
                            <RefreshCw size={11} aria-hidden="true" />
                            Igual a Entrega
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label htmlFor="select-pickup-region" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                                Región
                            </label>
                            <SearchableSelect
                                options={regions.map(r => ({ value: r.label, label: r.label }))}
                                value={currentCremation?.pickup_region || ''}
                                onChange={(val) => {
                                    setCurrentCremation(prev => ({
                                        ...prev,
                                        pickup_region: String(val),
                                        pickup_city: '',
                                    }));
                                }}
                                placeholder="Región..."
                            />
                        </div>
                        <div className="space-y-3">
                            <label htmlFor="select-pickup-city" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
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
                        <div className="space-y-3 md:col-span-2">
                            <label htmlFor="input-pickup-address" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                                Dirección Exacta
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
            </div>
        </div>
    );
}
