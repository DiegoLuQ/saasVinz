"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Activity,
    User,
    Dog,
    Calendar,
    Compass,
    Copy,
    Check,
    FileText,
    ExternalLink,
    Clock,
    ArrowRight,
    Loader2,
    Edit
} from 'lucide-react';
import SlideOver from '@/components/tenant/SlideOver';
import type { Cremation } from '@/hooks/useCremations';
import { getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';

interface OrderSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    cremation: Cremation | null;
    onUpdateStatus?: (id: number, newStatus: string) => Promise<void>;
    isUpdatingStatus?: boolean;
}

export default function OrderSlideOver({
    isOpen,
    onClose,
    cremation,
    onUpdateStatus,
    isUpdatingStatus,
}: OrderSlideOverProps) {
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);

    if (!cremation) return null;

    const handleCopyCode = () => {
        if (!cremation.verification_code) return;
        navigator.clipboard.writeText(cremation.verification_code);
        setCopied(true);
        showToast('Código de seguimiento copiado al portapapeles', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const pet = cremation.pet;
    const customer = pet?.customer;
    const isCompleted = ['delivered', 'completed', 'completado', 'entregado'].includes(
        (cremation.status || '').toLowerCase()
    );

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={`Orden #${cremation.id}`}
            subtitle={cremation.cremation_type || 'Servicio de Cremación'}
            icon={<Activity size={20} />}
            width="max-w-lg"
        >
            <div className="p-6 space-y-6">
                {/* Status Header Banner */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                            Estado Actual
                        </p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : cremation.status === 'en_proceso' || cremation.status === 'processing'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                            {cremation.status || 'pendiente'}
                        </span>
                    </div>

                    <Link
                        href={`/dashboard/recepcion-pedidos/registro?id=${cremation.id}`}
                        className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition flex items-center gap-1.5"
                    >
                        <Edit size={14} />
                        Editar Orden
                    </Link>
                </div>

                {/* Mascota & Tutor Card */}
                <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                            {pet?.image_url ? (
                                <img
                                    src={getImageUrl(pet.image_url)}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                                    <Dog size={24} />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-white truncate">{pet?.name || 'Mascota no especificada'}</h3>
                            <p className="text-xs text-muted-foreground capitalize">
                                {pet?.species || 'Mascota'} • {pet?.breed || 'Sin Raza'} {pet?.size ? `(${pet.size})` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 space-y-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                            <User size={14} className="mr-2 text-primary/70 shrink-0" />
                            <span className="font-semibold text-white mr-1">Tutor:</span>
                            <span className="truncate">{customer?.name || 'No asignado'}</span>
                        </div>
                        {customer?.phone && (
                            <p className="text-xs text-muted-foreground pl-6">📞 {customer.phone}</p>
                        )}
                        {customer?.email && (
                            <p className="text-xs text-muted-foreground pl-6 truncate">✉️ {customer.email}</p>
                        )}
                    </div>
                </div>

                {/* Tracking & Certificate Links */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Seguimiento y Certificación
                    </h4>

                    {cremation.verification_code && (
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Compass size={16} className="text-primary" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Código Tracking</p>
                                    <p className="text-sm font-mono font-bold text-white">{cremation.verification_code}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5"
                            >
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                {copied ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    )}

                    {isCompleted && (
                        <Link
                            href="/dashboard/documentos"
                            className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between hover:bg-emerald-500/15 transition group"
                        >
                            <div className="flex items-center gap-2.5">
                                <FileText size={18} className="text-emerald-400" />
                                <div>
                                    <p className="text-xs font-bold text-emerald-300">Certificado de Cremación Disponible</p>
                                    <p className="text-[10px] text-emerald-400/70">Descargar o imprimir PDF oficial</p>
                                </div>
                            </div>
                            <ExternalLink size={14} className="text-emerald-400 group-hover:translate-x-0.5 transition" />
                        </Link>
                    )}
                </div>

                {/* Fechas */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-primary/70" /> Fecha Creación:
                        </span>
                        <span className="font-semibold text-white">
                            {cremation.created_at ? new Date(cremation.created_at).toLocaleString('es-CL') : 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Quick Status Action Buttons */}
                {onUpdateStatus && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Cambiar Estado Rápidamente
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {cremation.status !== 'en_proceso' && !isCompleted && (
                                <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => onUpdateStatus(cremation.id, 'en_proceso')}
                                    className="py-2.5 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                                >
                                    {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : null}
                                    Mover a En Proceso
                                </button>
                            )}

                            {!isCompleted && (
                                <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => onUpdateStatus(cremation.id, 'entregado')}
                                    className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                                >
                                    {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : null}
                                    Marcar Entregado
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </SlideOver>
    );
}
