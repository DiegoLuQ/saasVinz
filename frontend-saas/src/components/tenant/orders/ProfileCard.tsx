"use client";

import React from 'react';
import { Camera, AlertTriangle, Hospital, MapPin, Phone, Mail, IdCard, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '@/lib/tenant/api';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { statusLabels, statusColors } from '@/lib/tenant/orders/types';
import type { Cremation, Pet, Customer, Partner } from '@/lib/tenant/orders/types';

interface ProfileCardProps {
    currentCremation: Partial<Cremation>;
    petOptions: { value: number; label: string }[];
    selectedPet?: Pet;
    relatedCustomer?: Customer;
    selectedPartner?: Partner;
    onPetChange: (val: string | number) => void;
    onStatusChange: (val: string | number) => void;
}

export default function ProfileCard({
    currentCremation,
    petOptions,
    selectedPet,
    relatedCustomer,
    selectedPartner,
    onPetChange,
    onStatusChange,
}: ProfileCardProps) {
    const hasPet = !!currentCremation?.pet_id && !!selectedPet;

    return (
        <section className="bg-white/[0.02] rounded-3xl border border-white/[0.06] overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 space-y-10">
                {/* Selectors row — minimal, no decorative chrome */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                        <label htmlFor="select-pet" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                            Mascota <span className="text-red-400">*</span>
                        </label>
                        <SearchableSelect
                            options={petOptions}
                            value={currentCremation?.pet_id || 0}
                            placeholder="Buscar mascota..."
                            onChange={onPetChange}
                        />
                    </div>
                    <div className="space-y-2.5">
                        <label htmlFor="select-status" className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
                            Estado Operativo
                        </label>
                        <SearchableSelect
                            options={Object.entries(statusLabels).map(([key, label]) => ({ value: key, label }))}
                            value={currentCremation?.status || 'pendiente'}
                            onChange={onStatusChange}
                            placeholder="Seleccionar estado..."
                            triggerClassName={`${statusColors[currentCremation?.status || 'pendiente'] || ''} font-bold`}
                        />
                    </div>
                </div>

                {/* Contact-Card Layout */}
                {hasPet ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pet Profile Card */}
                        <motion.article
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-black/20 rounded-2xl p-6 border border-white/[0.05] flex flex-col items-center text-center"
                            aria-label={`Perfil de ${selectedPet.name}`}
                        >
                            {/* Round Avatar */}
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-black/30 border-2 border-primary/20 ring-4 ring-primary/[0.05] mb-4 shrink-0">
                                {selectedPet.images && selectedPet.images.length > 0 ? (
                                    <img
                                        src={selectedPet.images[0].startsWith('http') ? selectedPet.images[0] : `${API_URL}${selectedPet.images[0]}`}
                                        alt={`Foto de ${selectedPet.name}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40" aria-hidden="true">
                                        <Camera size={28} />
                                    </div>
                                )}
                            </div>

                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.22em] mb-1">Mascota</p>
                            <h3 className="text-xl font-black text-white tracking-tight mb-3 truncate max-w-full">{selectedPet.name}</h3>

                            <dl className="grid grid-cols-2 gap-3 w-full text-left">
                                <div>
                                    <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Nacimiento</dt>
                                    <dd className="text-[11px] font-mono text-white mt-0.5">{selectedPet.birth_date?.split('T')[0] || '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Fallecimiento</dt>
                                    <dd className="text-[11px] font-mono text-red-400/80 mt-0.5">{selectedPet.death_date?.split('T')[0] || '—'}</dd>
                                </div>
                                {currentCremation?.weight ? (
                                    <div className="col-span-2 pt-2 border-t border-white/[0.05]">
                                        <dt className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Peso</dt>
                                        <dd className="text-sm font-black text-white mt-0.5 font-mono">{currentCremation.weight} kg</dd>
                                    </div>
                                ) : null}
                            </dl>
                        </motion.article>

                        {/* Customer Profile Card */}
                        <motion.article
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="bg-black/20 rounded-2xl p-6 border border-white/[0.05]"
                            aria-label={`Información del cliente ${relatedCustomer?.name || ''}`}
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0" aria-hidden="true">
                                    <User size={24} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.22em] mb-1">Cliente</p>
                                    <h3 className="text-base font-black text-white tracking-tight truncate">
                                        {relatedCustomer?.name || 'Cargando…'}
                                    </h3>
                                    {relatedCustomer?.rut && (
                                        <p className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1.5">
                                            <IdCard size={11} aria-hidden="true" />
                                            {relatedCustomer.rut}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <ul className="space-y-2.5 text-xs">
                                {relatedCustomer?.phone && (
                                    <li className="flex items-center gap-3 text-white/80">
                                        <span className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground shrink-0" aria-hidden="true">
                                            <Phone size={12} />
                                        </span>
                                        <a href={`tel:${relatedCustomer.phone}`} className="font-mono hover:text-primary transition-colors truncate">
                                            {relatedCustomer.phone}
                                        </a>
                                    </li>
                                )}
                                {relatedCustomer?.email && (
                                    <li className="flex items-center gap-3 text-white/80">
                                        <span className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground shrink-0" aria-hidden="true">
                                            <Mail size={12} />
                                        </span>
                                        <a href={`mailto:${relatedCustomer.email}`} className="hover:text-primary transition-colors truncate">
                                            {relatedCustomer.email}
                                        </a>
                                    </li>
                                )}
                                {relatedCustomer?.address && (
                                    <li className="flex items-start gap-3 text-white/70">
                                        <span className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground shrink-0 mt-0.5" aria-hidden="true">
                                            <MapPin size={12} />
                                        </span>
                                        <span className="truncate">
                                            {relatedCustomer.address}
                                            {relatedCustomer.city && <span className="text-muted-foreground"> · {relatedCustomer.city}</span>}
                                        </span>
                                    </li>
                                )}
                                {!relatedCustomer?.phone && !relatedCustomer?.email && !relatedCustomer?.address && (
                                    <li className="text-muted-foreground/60 italic text-[11px]">Sin datos de contacto registrados</li>
                                )}
                            </ul>
                        </motion.article>
                    </div>
                ) : (
                    <div className="p-12 border-2 border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-center" role="status">
                        <AlertTriangle className="text-muted-foreground/30 mb-3" size={32} aria-hidden="true" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.18em]">
                            Selecciona una mascota para mostrar el perfil
                        </p>
                    </div>
                )}

                {/* Partner — Inline tag, not its own panel */}
                {selectedPartner && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/15 rounded-2xl">
                        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0" aria-hidden="true">
                            <Hospital size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold text-primary/70 uppercase tracking-[0.18em] mb-0.5">Afiliado</p>
                            <p className="text-xs font-black text-white truncate">
                                {selectedPartner.nombre_clinica || selectedPartner.nombre || 'Partner sin nombre'}
                            </p>
                        </div>
                        {(selectedPartner.celular || selectedPartner.telefono) && (
                            <a
                                href={`tel:${selectedPartner.celular || selectedPartner.telefono}`}
                                className="text-[10px] font-mono text-primary/80 hover:text-primary flex items-center gap-1.5 shrink-0"
                            >
                                <Phone size={11} aria-hidden="true" />
                                {selectedPartner.celular || selectedPartner.telefono}
                            </a>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
