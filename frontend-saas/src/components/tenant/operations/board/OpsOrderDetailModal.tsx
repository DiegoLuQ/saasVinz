"use client";

import React, { useEffect, useState } from 'react';
import {
    X,
    PawPrint,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    Truck,
    Package,
    MessageCircle,
    ExternalLink,
    Building2,
    Scale,
    FileText,
    Navigation,
    Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { formatChileDateTime } from '@/lib/dates';
import type { OpsOrder } from '@/hooks/useOperations';

interface OpsOrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OpsOrder;
}

export default function OpsOrderDetailModal({
    isOpen,
    onClose,
    order,
}: OpsOrderDetailModalProps) {
    const [fullOrder, setFullOrder] = useState<any>(null);
    const [loadingExtra, setLoadingExtra] = useState(false);

    // Cargar datos completos de la orden si faltan detalles
    useEffect(() => {
        if (!isOpen || !order?.id) return;
        let active = true;
        setLoadingExtra(true);
        apiRequest(`/api/internal/cremations/${order.id}`)
            .then(data => {
                if (active) setFullOrder(data);
            })
            .catch(() => {
                // Silencioso: se muestra con la información ya disponible en order
            })
            .finally(() => {
                if (active) setLoadingExtra(false);
            });

        return () => {
            active = false;
        };
    }, [isOpen, order?.id]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Datos combinados (preferencia lo más específico)
    const petPhoto = order.pet_image_url || fullOrder?.pet_image_url || fullOrder?.pet?.image_url;
    const phone = order.customer_phone || fullOrder?.customer_phone || fullOrder?.pet?.customer?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    const email = order.customer_email || fullOrder?.customer_email || fullOrder?.pet?.customer?.email;
    const customerAddress = order.customer_address || fullOrder?.customer_address || fullOrder?.pet?.customer?.address;

    // Logística de retiro
    const pickupAddress = order.pickup_address || fullOrder?.pickup_address || fullOrder?.logistics?.pickup_address;
    const pickupCity = order.pickup_city || fullOrder?.pickup_city || fullOrder?.logistics?.pickup_city;
    const pickupRegion = order.pickup_region || fullOrder?.pickup_region || fullOrder?.logistics?.pickup_region;
    const pickupFullLocation = [pickupAddress, pickupCity, pickupRegion].filter(Boolean).join(', ');

    // Logística de entrega (cenizas)
    const deliveryAddress = order.delivery_address || fullOrder?.address || fullOrder?.logistics?.address;
    const deliveryCity = order.delivery_city || fullOrder?.city || fullOrder?.logistics?.city;
    const deliveryRegion = order.delivery_region || fullOrder?.region || fullOrder?.logistics?.region;
    const deliveryFullLocation = [deliveryAddress, deliveryCity, deliveryRegion].filter(Boolean).join(', ');

    // Horario programado
    const scheduledRaw = order.scheduled_at || fullOrder?.scheduled_at || fullOrder?.scheduling?.scheduled_at;
    const scheduledFormatted = scheduledRaw ? formatChileDateTime(scheduledRaw) : null;

    // Notas
    const notes = order.notes || fullOrder?.notes || fullOrder?.details?.notes;

    // Partner / Veterinaria
    const partnerName = order.partner_name || fullOrder?.partner_name || fullOrder?.partner_link?.veterinary?.name;
    const partnerPhone = order.partner_phone || fullOrder?.partner_phone || fullOrder?.partner_link?.veterinary?.phone;
    const partnerAddress = order.partner_address || fullOrder?.partner_address || fullOrder?.partner_link?.veterinary?.address;

    const mapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
                role="dialog"
                aria-modal="true"
                aria-label={`Ficha de ${order.pet_name}`}
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/75 backdrop-blur-md"
                />

                {/* Modal Box */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-white/[0.02]">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                                {petPhoto ? (
                                    <img
                                        src={getImageUrl(petPhoto)}
                                        alt={order.pet_name}
                                        className="w-full h-full object-cover"
                                        onError={e => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <PawPrint size={26} className="text-primary opacity-80" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-xl sm:text-2xl font-black text-foreground truncate">
                                        {order.pet_name}
                                    </h3>
                                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-white/10 text-foreground border border-white/10">
                                        #OC-{order.oc_number ?? order.id}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                                    {[order.pet_species, order.pet_breed].filter(Boolean).join(' · ') || 'Mascota'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0"
                            aria-label="Cerrar modal"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body scrollable */}
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
                        {/* 1. SECCIÓN LOGÍSTICA (Destacada) */}
                        <div className="rounded-2xl bg-white/[0.03] border border-primary/20 p-4 sm:p-5 space-y-4">
                            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                                <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                                    <Truck size={17} />
                                    <span>Datos de Logística y Traslados</span>
                                </div>
                                {scheduledFormatted && (
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                                        <Clock size={13} />
                                        {scheduledFormatted}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Retiro */}
                                <div className="p-3.5 rounded-xl bg-background/60 border border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                            <Package size={13} /> Retiro de Mascota
                                        </span>
                                        {pickupFullLocation && (
                                            <a
                                                href={mapsUrl(pickupFullLocation)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                                title="Abrir en Maps"
                                            >
                                                <Navigation size={11} /> Maps
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-xs font-semibold text-foreground break-words leading-relaxed">
                                        {pickupAddress || 'Dirección de retiro no especificada'}
                                    </p>
                                    {(pickupCity || pickupRegion) && (
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <MapPin size={11} className="shrink-0" />
                                            {[pickupCity, pickupRegion].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>

                                {/* Entrega */}
                                <div className="p-3.5 rounded-xl bg-background/60 border border-white/5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                            <Truck size={13} /> Entrega de Cenizas
                                        </span>
                                        {deliveryFullLocation && (
                                            <a
                                                href={mapsUrl(deliveryFullLocation)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                                title="Abrir en Maps"
                                            >
                                                <Navigation size={11} /> Maps
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-xs font-semibold text-foreground break-words leading-relaxed">
                                        {deliveryAddress || 'Mismo domicilio del cliente o retiro en clínica'}
                                    </p>
                                    {(deliveryCity || deliveryRegion) && (
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <MapPin size={11} className="shrink-0" />
                                            {[deliveryCity, deliveryRegion].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. SECCIÓN DUEÑO / CONTACTO */}
                        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                                    <User size={15} className="text-primary" />
                                    <span>Tutor / Dueño de la Mascota</span>
                                </div>
                                {waUrl && (
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-black transition-all text-xs font-bold"
                                    >
                                        <MessageCircle size={14} /> Chatear por WhatsApp
                                    </a>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Nombre</span>
                                    <p className="font-bold text-foreground mt-0.5 text-sm">{order.customer_name || 'Sin nombre registrado'}</p>
                                </div>

                                <div>
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Teléfono</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {phone ? (
                                            <>
                                                <a href={`tel:${cleanPhone}`} className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1">
                                                    <Phone size={13} className="text-muted-foreground" />
                                                    {phone}
                                                </a>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground italic">Sin teléfono</span>
                                        )}
                                    </div>
                                </div>

                                {email && (
                                    <div>
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Email</span>
                                        <p className="font-medium text-foreground mt-0.5 flex items-center gap-1 truncate">
                                            <Mail size={13} className="text-muted-foreground shrink-0" />
                                            {email}
                                        </p>
                                    </div>
                                )}

                                {customerAddress && (
                                    <div>
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Dirección Registrada</span>
                                        <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                                            <MapPin size={13} className="text-muted-foreground shrink-0" />
                                            {customerAddress}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. SECCIÓN VETERINARIA / CLÍNICA (Si aplica) */}
                        {partnerName && (
                            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 space-y-2.5">
                                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-2">
                                    <Building2 size={15} className="text-primary" />
                                    <span>Clínica / Veterinaria de Origen</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Veterinaria</span>
                                        <p className="font-bold text-foreground mt-0.5 text-sm">{partnerName}</p>
                                    </div>
                                    {partnerPhone && (
                                        <div>
                                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Teléfono de la Clínica</span>
                                            <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                                                <Phone size={13} className="text-muted-foreground" />
                                                {partnerPhone}
                                            </p>
                                        </div>
                                    )}
                                    {partnerAddress && (
                                        <div className="sm:col-span-2">
                                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Dirección de la Clínica</span>
                                            <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                                                <MapPin size={13} className="text-muted-foreground shrink-0" />
                                                {partnerAddress}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. DETALLES DE LA ORDEN (Servicio, Peso, Notas) */}
                        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 space-y-3">
                            <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-2">
                                <FileText size={15} className="text-primary" />
                                <span>Detalles del Servicio y Notas</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Tipo de Servicio</span>
                                    <p className="font-bold text-foreground mt-0.5 capitalize">
                                        {order.cremation_type || fullOrder?.cremation_type || 'Cremación'}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Peso Registrado</span>
                                    <p className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                                        <Scale size={13} className="text-primary" />
                                        {order.weight ? `${order.weight} kg` : 'Sin registrar'}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Ingresado</span>
                                    <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                                        <Calendar size={13} className="text-muted-foreground" />
                                        {formatChileDateTime(order.created_at)}
                                    </p>
                                </div>
                            </div>

                            {notes && (
                                <div className="pt-2 border-t border-white/5">
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Observaciones / Notas</span>
                                    <p className="text-xs text-foreground bg-white/5 p-3 rounded-xl mt-1 leading-relaxed border border-white/5">
                                        {notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
                        <div className="text-xs text-muted-foreground">
                            {order.verification_code && (
                                <span>Código: <strong className="text-foreground font-mono">{order.verification_code}</strong></span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all"
                        >
                            Cerrar ficha
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
