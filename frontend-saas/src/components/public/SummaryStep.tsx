"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { User, PawPrint, Package, Heart, Pencil, ImageIcon, Check, Sparkles, Gem, ChevronDown, Camera, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';

interface OwnerData {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    commune: string;
    region?: string;
    pickupRegion?: string;
    pickupCommune?: string;
    rut?: string;
    comments?: string;
    veterinary?: string;
    contactPreference?: string;
}

interface PetData {
    name: string;
    nickname?: string;
    type: string;
    breed: string;
    age: string;
    birthDate?: string;
    deathDate?: string;
    weightRange?: string;
    weightKg?: string;
    dedication?: string;
    species?: string;
}

interface SubItem {
    id: string;
    name: string;
    type?: 'servicio' | 'producto';
    image_url?: string | null;
}

interface ServiceItem {
    id: string;
    name: string;
    description?: string;
    price?: number;
    category?: string;
    sub_items?: SubItem[] | null;
}

interface Props {
    ownerData: OwnerData;
    petData: PetData;
    selectedServices: string[];
    services: ServiceItem[];
    images: File[];
    onEditStep: (step: number) => void;
    farewellTemplate?: any;
}

const WEIGHT_LABELS: Record<string, string> = {
    small: 'Pequeño (0–10 kg)',
    medium: 'Mediano (10–25 kg)',
    large: 'Grande (25–45 kg)',
    giant: 'Gigante (45+ kg)',
};

const CONTACT_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp',
    phone: 'Llamada telefónica',
    any: 'WhatsApp o Llamada',
};

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function SectionCard({
    icon: Icon,
    title,
    step,
    onEdit,
    children,
}: {
    icon: React.ElementType;
    title: string;
    step: number;
    onEdit: (step: number) => void;
    children: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: step * 0.08, duration: 0.4 }}
            className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden"
        >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <Icon size={16} />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {title}
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={() => onEdit(step)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors px-3 py-1.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer"
                >
                    <Pencil size={11} />
                    Editar
                </button>
            </div>
            <div className="px-6 pb-5">
                {children}
            </div>
        </motion.div>
    );
}

function DataRow({ label, value }: { label: string; value?: string }) {
    if (!value || value === '—') return null;
    return (
        <div className="flex items-start gap-2 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-32 sm:w-36 shrink-0 pt-0.5">
                {label}
            </span>
            <span className="text-sm text-slate-700 dark:text-slate-200 font-normal leading-relaxed">
                {value}
            </span>
        </div>
    );
}

function PlanAccordionItem({ item }: { item: ServiceItem }) {
    const isPlan = (item.category || '').toLowerCase() === 'plan';
    const hasSubItems = item.sub_items && item.sub_items.length > 0;
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50/50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950/40 border border-emerald-200/60 dark:border-emerald-900/30 overflow-hidden transition-all">
            {/* Header / Clickable Toggle */}
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-colors"
                onClick={() => (hasSubItems || item.description) && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {isPlan ? <Sparkles size={14} /> : <Check size={14} />}
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {item.name}
                    </span>
                </div>

                {(hasSubItems || item.description) && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-white/80 dark:bg-slate-950/80 px-2.5 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-2xs"
                    >
                        <span>{isOpen ? 'Ocultar' : 'Ver detalle'}</span>
                        <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown size={12} />
                        </motion.div>
                    </button>
                )}
            </div>

            {/* Desplegable animado */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="border-t border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/30 px-5 py-4 space-y-3"
                    >
                        {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                                {item.description}
                            </p>
                        )}

                        {hasSubItems && (
                            <div className="space-y-2 pt-1">
                                <div className="text-[11px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                    <Gem size={10} className="text-amber-500" />
                                    Incluye ({item.sub_items!.length})
                                </div>
                                <div className="space-y-1.5">
                                    {item.sub_items!.map((sub, sIdx) => (
                                        <div key={sIdx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-normal">
                                            <Check size={12} className="text-emerald-500 shrink-0" strokeWidth={3} />
                                            <span>{sub.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SummaryStep({ ownerData, petData, selectedServices, services, images, onEditStep, farewellTemplate }: Props) {
    const selectedItems = services.filter(s => selectedServices.includes(s.id));
    const [showFarewellModal, setShowFarewellModal] = useState(false);

    const primaryImageBlobUrl = useMemo(() => {
        if (images.length > 0 && typeof window !== 'undefined') {
            return URL.createObjectURL(images[0]);
        }
        return null;
    }, [images]);

    const farewellConfig = useMemo(() => {
        const base = farewellTemplate?.config || {
            format: '1:1',
            theme: 'warm',
            styles: { font: 'serif', color: '#1e293b', background: '#FDFBF7' },
            frame: { enabled: true, color: '#d4af37', width: 6, margin: 10 },
            petNameFormatting: { bold: true, fontSize: 38, fontFamily: 'Playfair Display', textAlign: 'center', letterSpacing: 2 },
            subtitleFormatting: { bold: false, italic: true, fontSize: 14, textAlign: 'center', width: 420 },
            textFormatting: { bold: false, italic: true, fontSize: 15, textAlign: 'center', width: 440, lineHeight: 1.6 },
            imageSettings: {
                image2: { shape: 'circle', size: 180, borderColor: '#d4af37', borderWidth: 4, glow: { enabled: true, color: 'rgba(212, 175, 55, 0.5)', size: 24 } }
            },
            backgroundImage: { url: null, opacity: 0 }
        };

        return {
            ...base,
            elements: {
                ...(base.elements || {}),
                petName: petData.name || 'Tu Angelito',
                subtitle: '',
                farewellText: petData.dedication || 'Gracias por cada instante de ternura y amor incondicional. Tu recuerdo vivirá por siempre en nuestra memoria.',
                image2Url: primaryImageBlobUrl,
            },
        };
    }, [farewellTemplate, petData, primaryImageBlobUrl]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-1.5">
                    Revisa tu solicitud
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal tracking-wide">
                    Confirma que todo esté correcto antes de enviar
                </p>
            </div>

            {/* 1. Datos de la Familia */}
            <SectionCard icon={User} title="Datos de la Familia" step={1} onEdit={onEditStep}>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    <DataRow label="Nombre" value={ownerData.fullName} />
                    <DataRow label="Email" value={ownerData.email} />
                    <DataRow label="Teléfono" value={ownerData.phone} />
                    {ownerData.rut && <DataRow label="RUT" value={ownerData.rut} />}
                    {ownerData.veterinary && (
                        <DataRow 
                            label="Lugar de Retiro" 
                            value={`${ownerData.veterinary}${ownerData.pickupCommune ? `, ${ownerData.pickupCommune}` : ''}${ownerData.pickupRegion ? `, ${ownerData.pickupRegion}` : ''}`} 
                        />
                    )}
                    <DataRow label="Dirección Entrega" value={ownerData.address} />
                    <DataRow label="Comuna Entrega" value={ownerData.commune} />
                    {ownerData.region && <DataRow label="Región Entrega" value={ownerData.region} />}
                    {ownerData.contactPreference && (
                        <DataRow label="Contacto" value={CONTACT_LABELS[ownerData.contactPreference] || ownerData.contactPreference} />
                    )}
                    {ownerData.comments && <DataRow label="Comentarios" value={ownerData.comments} />}
                </div>
            </SectionCard>

            {/* 2. Datos del Angelito */}
            <SectionCard icon={PawPrint} title="Tu Angelito" step={2} onEdit={onEditStep}>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    <DataRow label="Nombre" value={petData.name} />
                    {petData.nickname && <DataRow label="Apodo" value={petData.nickname} />}
                    <DataRow label="Especie" value={petData.type} />
                    {petData.breed && <DataRow label="Raza" value={petData.breed} />}
                    <DataRow label="Edad" value={petData.age ? `${petData.age} años` : undefined} />
                    {petData.weightRange && <DataRow label="Peso" value={WEIGHT_LABELS[petData.weightRange]} />}
                    {petData.weightKg && <DataRow label="Peso exacto" value={`${petData.weightKg} kg`} />}
                    {petData.birthDate && <DataRow label="Nacimiento" value={formatDate(petData.birthDate)} />}
                    {petData.deathDate && <DataRow label="Fallecimiento" value={formatDate(petData.deathDate)} />}
                </div>
            </SectionCard>

            {/* 3. El Camino Elegido */}
            <SectionCard icon={Package} title="El Camino Elegido" step={3} onEdit={onEditStep}>
                {selectedItems.length > 0 ? (
                    <div className="space-y-3">
                        {selectedItems.map(item => (
                            <PlanAccordionItem key={item.id} item={item} />
                        ))}
                    </div>
                ) : (
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 italic font-medium py-2">
                        No seleccionaste servicios — el crematorio te asesorará.
                    </p>
                )}
            </SectionCard>

            {/* 4. Fotos y Dedicatoria */}
            <SectionCard icon={Heart} title="Recuerdos" step={4} onEdit={onEditStep}>
                <div className="space-y-4">
                    {images.length > 0 ? (
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Camera size={13} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    {images.length} {images.length === 1 ? 'foto enmarcada' : 'fotos enmarcadas'}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                                {images.map((file, idx) => {
                                    const previewUrl = URL.createObjectURL(file);
                                    return (
                                        <div
                                            key={idx}
                                            className="relative aspect-square rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                                        >
                                            <Image
                                                src={previewUrl}
                                                alt={`Recuerdo ${idx + 1}`}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                            {idx === 0 && (
                                                <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shadow-sm">
                                                    Principal
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-[12px] text-slate-400 dark:text-slate-500 italic font-medium">
                            Sin fotos adjuntas
                        </p>
                    )}

                    {petData.dedication ? (
                        <div className="bg-rose-50/80 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 dark:text-rose-500 mb-2">
                                Dedicatoria
                            </p>
                            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed italic font-medium">
                                &ldquo;{petData.dedication}&rdquo;
                            </p>
                        </div>
                    ) : (
                        <p className="text-[12px] text-slate-400 dark:text-slate-500 italic font-medium">
                            Sin dedicatoria
                        </p>
                    )}
                </div>
            </SectionCard>

            {/* Nota de privacidad */}
            <div className="text-center pt-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                    🔒 Tu información se transmitirá de forma segura y será tratada con absoluta confidencialidad y respeto.
                </p>
            </div>
        </div>
    );
}
