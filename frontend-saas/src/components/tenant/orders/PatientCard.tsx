"use client";

import React from 'react';
import { CheckCircle2, Camera, AlertTriangle, Hospital, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '@/lib/tenant/api';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { statusLabels, statusColors } from '@/lib/tenant/orders/types';
import type { Cremation, Pet, Customer, Partner } from '@/lib/tenant/orders/types';

interface PatientCardProps {
    currentCremation: Partial<Cremation>;
    petOptions: { value: number; label: string }[];
    selectedPet?: Pet;
    relatedCustomer?: Customer;
    selectedPartner?: Partner;
    onPetChange: (val: string | number) => void;
    onStatusChange: (val: string | number) => void;
}

export default function PatientCard({
    currentCremation,
    petOptions,
    selectedPet,
    relatedCustomer,
    selectedPartner,
    onPetChange,
    onStatusChange,
}: PatientCardProps) {
    return (
        <div className="relative bg-white/[0.015] rounded-3xl border border-white/[0.07] transition-colors duration-300 hover:border-white/[0.12] overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className="absolute top-0 right-0 w-56 h-56 bg-primary/5 blur-[100px] rounded-full -mr-28 -mt-28" aria-hidden="true" />
            </div>

            <div className="p-6 sm:p-10 lg:p-12 relative z-10">
                {/* Header */}
                <div className="flex items-center gap-5 mb-12">
                    <div className="p-4 bg-primary/10 rounded-2xl" aria-hidden="true">
                        <CheckCircle2 className="text-primary" size={28} />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-light text-white tracking-tight" id="section-patient">
                        Información del angelito
                    </h2>
                </div>

                {/* Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8" role="group" aria-labelledby="section-patient">
                    <div className="space-y-3">
                        <label htmlFor="select-pet" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                            Mascota Seleccionada <span className="text-red-400">*</span>
                        </label>
                        <SearchableSelect
                            options={petOptions}
                            value={currentCremation?.pet_id || 0}
                            placeholder="Buscar mascota..."
                            onChange={onPetChange}
                        />
                    </div>

                    <div className="space-y-3">
                        <label htmlFor="select-status" className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] ml-1">
                            Estado Operativo
                        </label>
                        <SearchableSelect
                            options={Object.entries(statusLabels).map(([key, label]) => ({
                                value: key,
                                label: label,
                            }))}
                            value={currentCremation?.status || 'pendiente'}
                            onChange={onStatusChange}
                            placeholder="Seleccionar estado..."
                            triggerClassName={`${statusColors[currentCremation?.status || 'pendiente'] || ''} font-bold`}
                        />
                    </div>
                </div>

                {/* Partner Section — Distinct Panel */}
                <div className="mt-10 p-6 bg-black/20 rounded-2xl border border-white/[0.05]">
                    <label className="text-[11px] font-bold text-primary/60 uppercase tracking-[0.18em] mb-4 block">
                        Afiliado / Partner Vinculado
                    </label>
                    {selectedPartner ? (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-5 transition-all hover:bg-primary/10">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0" aria-hidden="true">
                                <Hospital size={22} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-black text-sm uppercase tracking-tight truncate">
                                    {selectedPartner.nombre_clinica || selectedPartner.nombre || 'Partner sin nombre'}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium truncate flex items-center gap-2 mt-1.5">
                                    <span className="flex items-center gap-1"><MapPin size={10} aria-hidden="true" /> {selectedPartner.direccion || 'Sin dirección'}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/10" aria-hidden="true" />
                                    <span className="flex items-center gap-1 text-primary/80"><Phone size={10} aria-hidden="true" /> {selectedPartner.celular || selectedPartner.telefono || 'Sin celular'}</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted-foreground italic text-sm py-1 flex items-center gap-3 opacity-60">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" aria-hidden="true" />
                            Venta Directa / Sin Afiliado
                        </div>
                    )}
                </div>

                {/* Pet Mini Info */}
                {currentCremation?.pet_id && selectedPet ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-10 p-6 bg-white/[0.04] rounded-2xl border border-white/[0.06] flex items-center gap-6"
                        role="region"
                        aria-label={`Información de ${selectedPet.name}`}
                    >
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black/20 border border-white/10 shrink-0">
                            {selectedPet.images && selectedPet.images.length > 0 ? (
                                <img
                                    src={selectedPet.images[0].startsWith('http') ? selectedPet.images[0] : `${API_URL}${selectedPet.images[0]}`}
                                    alt={`Foto de ${selectedPet.name}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground" aria-hidden="true">
                                    <Camera size={26} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-black text-white truncate mb-1">{selectedPet.name}</h4>
                            <p className="text-xs text-muted-foreground">
                                Propietario: <span className="text-primary/80 font-bold">{relatedCustomer?.name || 'Cargando...'}</span>
                            </p>
                            <div className="flex gap-5 mt-3">
                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase font-black tracking-wider">
                                    <div className="w-1 h-1 rounded-full bg-primary" aria-hidden="true" />
                                    Nac: <span className="text-white font-mono">{selectedPet.birth_date?.split('T')[0] || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase font-black tracking-wider">
                                    <div className="w-1 h-1 rounded-full bg-red-400" aria-hidden="true" />
                                    Fall: <span className="text-white font-mono">{selectedPet.death_date?.split('T')[0] || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="mt-10 p-8 border-2 border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-center" role="status">
                        <AlertTriangle className="text-muted-foreground/30 mb-3" size={36} aria-hidden="true" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.18em]">Selecciona una mascota para continuar</p>
                    </div>
                )}
            </div>
        </div>
    );
}
