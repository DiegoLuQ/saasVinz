"use client";

import React, { useState, useEffect } from 'react';
import {
    User,
    Dog,
    Eye,
    Trash2,
    CheckCircle,
    Loader2,
    X,
    Phone,
    Mail,
    MapPin,
    Package,
    Shield,
    Store
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardSummary, useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { PlanLimitModal } from '../PlanLimitModal';
import Modal from '../Modal';

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

interface SubmissionDetailModalProps {
    isOpen: boolean;
    submissionId: number | null;
    onClose: () => void;
    onProcessed?: () => void;
    onDeleted?: (id: number) => void;
}

export default function SubmissionDetailModal({
    isOpen,
    submissionId,
    onClose,
    onProcessed,
    onDeleted
}: SubmissionDetailModalProps) {
    const [submission, setSubmission] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [workflowStep, setWorkflowStep] = useState<{
        customer_id?: number,
        pet_id?: number,
        cremation_id?: number
    }>({});
    const [userRole, setUserRole] = useState<string | null>(null);
    const { showToast } = useToast();
    const dashboardData = useDashboardSummary();
    const tenant = useCurrentTenant();
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');

    const [showLimitModal, setShowLimitModal] = useState(false);
    const [modalResource, setModalResource] = useState('');

    const limits = dashboardData?.limits;

    const isCustomerLimitReached = limits?.customers ? (limits.customers.max > 0 && limits.customers.usage >= limits.customers.max) : false;
    const isPetLimitReached = limits?.pets ? (limits.pets.max > 0 && limits.pets.usage >= limits.pets.max) : false;
    const isOrderLimitReached = limits?.orders ? (limits.orders.max > 0 && limits.orders.usage >= limits.orders.max) : false;

    useEffect(() => {
        const storedUser = localStorage.getItem('saasc_user');
        if (storedUser) {
            setUserRole(JSON.parse(storedUser).role);
        }
    }, []);

    useEffect(() => {
        if (isOpen && submissionId) {
            fetchDetail();
            setWorkflowStep({}); // Reset workflow on open
        } else {
            setSubmission(null);
        }
    }, [isOpen, submissionId]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/api/internal/submissions/${submissionId}`);
            setSubmission(data);

            // Restore workflow state if already processed
            if (data.customer_id || data.pet_id) {
                setWorkflowStep({
                    customer_id: data.customer_id,
                    pet_id: data.pet_id
                });
            }
        } catch (err: any) {
            showToast('Error al cargar detalles', 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!submission) return;
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;

        try {
            await apiRequest(`/api/internal/submissions/${submission.id}`, { method: 'DELETE' });
            showToast('Registro eliminado', 'success');
            if (onDeleted) onDeleted(submission.id);
            onClose();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleAddCustomer = async () => {
        if (!submission) return;
        if (isCustomerLimitReached) {
            setModalResource('Clientes');
            setShowLimitModal(true);
            return;
        }
        setProcessingAction('customer');
        try {
            const res = await apiRequest(`/api/internal/submissions/${submission.id}/create-customer`, { method: 'POST' });
            setWorkflowStep(prev => ({ ...prev, customer_id: res.customer_id }));
            showToast(res.message || 'Cliente procesado correctamente', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleAddPet = async () => {
        if (!submission || !workflowStep.customer_id) return;
        if (isPetLimitReached) {
            setModalResource('Mascotas');
            setShowLimitModal(true);
            return;
        }
        setProcessingAction('pet');
        try {
            const res = await apiRequest(`/api/internal/submissions/${submission.id}/create-pet?customer_id=${workflowStep.customer_id}`, { method: 'POST' });
            setWorkflowStep(prev => ({ ...prev, pet_id: res.pet_id }));
            showToast('Mascota registrada y fotos migradas', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleAddServices = async () => {
        if (!submission || !workflowStep.pet_id) return;
        if (isOrderLimitReached) {
            setModalResource('Recursos');
            setShowLimitModal(true);
            return;
        }
        setProcessingAction('services');
        try {
            const res = await apiRequest(`/api/internal/submissions/${submission.id}/create-services?pet_id=${workflowStep.pet_id}`, { method: 'POST' });
            setWorkflowStep(prev => ({ ...prev, cremation_id: res.cremation_id }));
            showToast('OEC y servicios generados correctamente', 'success');

            // Archive notification
            try {
                await apiRequest(`/api/internal/notifications/archive-by-submission/${submission.id}`, { method: 'POST' });
            } catch (err) {
                console.error('Error archiving notification:', err);
            }

            if (onProcessed) onProcessed();
            onClose();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setProcessingAction(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <AnimatePresence mode="wait">
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass-card bg-background border border-foreground/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {loading ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-primary" size={40} />
                                <p className="text-sm font-bold animate-pulse uppercase tracking-widest opacity-50 text-muted-foreground">Cargando detalles...</p>
                            </div>
                        ) : submission ? (
                            <>
                                {/* Modal Header */}
                                <div className="p-6 border-b border-foreground/5 flex items-center justify-between bg-primary/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                            <Eye size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">Detalle del Registro</h3>
                                            <p className="text-xs text-muted-foreground">Enviado el {submission.created_at}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-xl hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                                    {/* Owner & Pet Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Owner Data */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-primary/70 flex items-center gap-2">
                                                <User size={14} /> Información del Dueño
                                            </h4>
                                            <div className="bg-foreground/5 rounded-2xl p-4 border border-foreground/5 space-y-3">
                                                {submission.partner && (
                                                    <div className="mb-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                                        <p className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                                                            <Store size={12} /> Partner Referido
                                                        </p>
                                                        <p className="text-sm font-bold text-foreground mt-1">{submission.partner.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {submission.partner.slug}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Nombre Completo</p>
                                                    <p className="text-sm font-medium text-foreground">{submission.owner_data?.fullName}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">RUT</p>
                                                        <p className="text-sm font-medium text-foreground">{submission.owner_data?.rut || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Teléfono</p>
                                                        <p className="text-sm font-medium flex items-center gap-1 whitespace-nowrap text-foreground"><Phone size={10} className="text-primary" /> {submission.owner_data?.phone}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                                                    <p className="text-sm font-medium flex items-center gap-1 text-foreground"><Mail size={10} className="text-primary" /> {submission.owner_data?.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Ubicación</p>
                                                    <p className="text-sm font-medium flex items-center gap-1 text-foreground">
                                                        <MapPin size={10} className="text-primary" />
                                                        {submission.owner_data?.commune}, {submission.owner_data?.region}
                                                    </p>
                                                </div>

                                                {submission.owner_data?.phone && (
                                                    <button
                                                        onClick={() => {
                                                            const defaultMsg = `Hola ${submission.owner_data.fullName}, te contactamos de ${tenant?.name || 'Vincer'}.`;
                                                            setWhatsAppMessage(defaultMsg);
                                                            setIsWhatsAppModalOpen(true);
                                                        }}
                                                        className="mt-2 w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
                                                    >
                                                        <WhatsAppIcon className="w-5 h-5" />
                                                        <span className="text-[8px] uppercase tracking-widest">Contactar por WhatsApp</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Pet Data */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400/70 flex items-center gap-2">
                                                <Dog size={14} /> Detalles de la Mascota
                                            </h4>
                                            <div className="bg-foreground/5 rounded-2xl p-4 border border-foreground/5 space-y-3">
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Nombre Mascota</p>
                                                    <p className="text-sm font-medium text-foreground">{submission.pet_data?.name}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Tipo</p>
                                                        <p className="text-sm font-medium capitalize text-foreground">{submission.pet_data?.type}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Raza</p>
                                                        <p className="text-sm font-medium text-foreground">{submission.pet_data?.breed}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Tamaño</p>
                                                    <p className="text-sm font-medium capitalize text-foreground">{submission.pet_data?.size || 'N/A'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Edad</p>
                                                        <p className="text-sm font-medium text-foreground">{submission.pet_data?.age} años</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Nacimiento</p>
                                                        <p className="text-sm font-medium text-foreground">{submission.pet_data?.birthDate || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Fallecimiento</p>
                                                    <p className="text-sm font-medium text-foreground">{submission.pet_data?.deathDate || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selected Services */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-orange-400/70 flex items-center gap-2">
                                            <Package size={14} /> Servicios Seleccionados
                                        </h4>
                                        <div className="bg-foreground/5 rounded-2xl overflow-hidden border border-foreground/5">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-foreground/5 bg-foreground/5">
                                                        <th className="px-4 py-2 font-bold uppercase text-[9px] text-muted-foreground">Concepto</th>
                                                        <th className="px-4 py-2 font-bold uppercase text-[9px] text-muted-foreground text-right">Precio</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-foreground/5">
                                                    {(submission.selected_services || submission.resolved_services) && (submission.selected_services || submission.resolved_services).length > 0 ? (
                                                        (submission.selected_services || submission.resolved_services).map((item: any, idx: number) => {
                                                            // Handle Plan with nested items
                                                            if (item.type === 'plan' && item.items && item.items.length > 0) {
                                                                return (
                                                                    <React.Fragment key={idx}>
                                                                        {/* Plan Header */}
                                                                        <tr className="hover:bg-foreground/5 transition-colors bg-foreground/[0.02]">
                                                                            <td className="px-4 py-2.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <p className="font-bold text-foreground/90">{item.name}</p>
                                                                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-yellow-500/10 text-yellow-500 font-bold uppercase border border-yellow-500/20">PLAN</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-2.5 text-right font-medium text-orange-400">
                                                                                ${(item.price || 0).toLocaleString()}
                                                                            </td>
                                                                        </tr>
                                                                        {/* Nested Items */}
                                                                        {item.items.map((sub: any, sIdx: number) => (
                                                                            <tr key={`${idx}-${sIdx}`} className="hover:bg-foreground/5 transition-colors">
                                                                                <td className="px-4 py-1.5 pl-8 border-l-2 border-foreground/5">
                                                                                    <p className="text-foreground/70 text-[11px]">{sub.name}</p>
                                                                                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{sub.type}</p>
                                                                                </td>
                                                                                <td className="px-4 py-1.5 text-right font-medium text-muted-foreground text-[10px]">
                                                                                    INCLUIDO
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </React.Fragment>
                                                                );
                                                            }

                                                            // Standard Items (Service/Product)
                                                            return (
                                                                <tr key={idx} className="hover:bg-foreground/5 transition-colors">
                                                                    <td className="px-4 py-2.5">
                                                                        <p className="font-bold text-foreground/90">{item.name}</p>
                                                                        <p className="text-[9px] text-muted-foreground uppercase">{item.type || 'Servicio'}</p>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right font-medium text-orange-400">
                                                                        ${(item.price || 0).toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground italic text-[10px]">
                                                                Ningún servicio adicional seleccionado.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                {submission.total > 0 && (
                                                    <tfoot>
                                                        <tr className="bg-orange-500/10 font-black border-t-2 border-orange-500/20">
                                                            <td className="px-4 py-3 text-orange-400 uppercase tracking-tighter">Total a Pagar</td>
                                                            <td className="px-4 py-3 text-right text-orange-400 text-sm">
                                                                ${submission.total.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>

                                    {/* Additional Details (Veterinary & Comments) */}
                                    {(submission.owner_data?.veterinary || submission.owner_data?.comments) && (
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400/70 flex items-center gap-2">
                                                <Store size={14} /> Información Adicional
                                            </h4>
                                            <div className="bg-foreground/5 rounded-2xl p-4 border border-foreground/5 space-y-4">
                                                {submission.owner_data?.veterinary && (
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Clínica Veterinaria</p>
                                                        <p className="text-sm font-medium text-foreground">{submission.owner_data.veterinary}</p>
                                                    </div>
                                                )}
                                                {submission.owner_data?.comments && (
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Comentarios / Referencias</p>
                                                        <p className="text-sm font-medium whitespace-pre-wrap text-foreground">{submission.owner_data.comments}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Images */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-400/70 flex items-center gap-2">
                                            📸 Fotos de Recuerdo
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            {submission.images && submission.images.length > 0 ? (
                                                submission.images.map((img: string, idx: number) => (
                                                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-foreground/10 ring-4 ring-foreground/5">
                                                        <img
                                                            src={img}
                                                            className="w-full h-full object-cover transition-transform hover:scale-110 duration-500"
                                                            alt={`Mascota ${idx + 1}`}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none'; // Hide broken images
                                                            }}
                                                        />
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic col-span-3 py-4 text-center bg-foreground/5 rounded-2xl border border-dashed border-foreground/10">No se adjuntaron fotos.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-6 border-t border-foreground/5 bg-foreground/5">
                                    {(userRole === 'admin' || userRole === 'recepcion' || userRole === 'creator') ? (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                <button
                                                    onClick={handleAddCustomer}
                                                    disabled={!!workflowStep.customer_id || processingAction === 'customer' || isCustomerLimitReached}
                                                    className={`py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider ${workflowStep.customer_id
                                                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                                        : isCustomerLimitReached ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-foreground/5 border-foreground/10 hover:bg-primary/20 hover:border-primary/30 text-foreground'
                                                        } disabled:opacity-70`}
                                                >
                                                    {processingAction === 'customer' ? <Loader2 className="animate-spin" size={14} /> : workflowStep.customer_id ? <CheckCircle size={14} /> : <User size={14} className={isCustomerLimitReached ? "text-red-400" : "text-primary"} />}
                                                    {isCustomerLimitReached && !workflowStep.customer_id ? 'Límite Clientes' : workflowStep.customer_id ? 'Cliente Registrado' : 'Agregar Cliente'}
                                                </button>
                                                <button
                                                    onClick={handleAddPet}
                                                    disabled={!workflowStep.customer_id || !!workflowStep.pet_id || processingAction === 'pet' || isPetLimitReached}
                                                    className={`py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider ${workflowStep.pet_id
                                                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                                        : isPetLimitReached && workflowStep.customer_id ? 'bg-red-500/10 border-red-500/20 text-red-400' : !workflowStep.customer_id ? 'opacity-30 cursor-not-allowed bg-foreground/5 border-foreground/10 text-foreground' : 'bg-foreground/5 border-foreground/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-foreground'
                                                        } disabled:grayscale-[0.5]`}
                                                >
                                                    {processingAction === 'pet' ? <Loader2 className="animate-spin" size={14} /> : workflowStep.pet_id ? <CheckCircle size={14} /> : <Dog size={14} className={isPetLimitReached && workflowStep.customer_id ? "text-red-400" : "text-emerald-400"} />}
                                                    {isPetLimitReached && workflowStep.customer_id && !workflowStep.pet_id ? 'Límite Mascotas' : workflowStep.pet_id ? 'Mascota Registrada' : 'Agregar Mascota'}
                                                </button>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handleAddServices}
                                                    disabled={!workflowStep.pet_id || processingAction === 'services' || (isOrderLimitReached && !workflowStep.pet_id)}
                                                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${!workflowStep.pet_id
                                                        ? 'bg-foreground/5 text-muted-foreground cursor-not-allowed'
                                                        : isOrderLimitReached ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] shadow-primary/20'
                                                        }`}
                                                >
                                                    {processingAction === 'services' ? <Loader2 className="animate-spin" size={16} /> : <Package size={16} />}
                                                    {isOrderLimitReached && workflowStep.pet_id ? 'Límite Pedidos Alcanzado' : 'Agregar Servicios y Finalizar'}
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    className="px-6 py-4 rounded-2xl bg-red-500/10 text-red-400 font-bold text-xs uppercase hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-4 px-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                                            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center justify-center gap-2">
                                                <Shield size={14} /> Solo Administrador o Recepción pueden procesar registros
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Modal de Límite */}
            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName={modalResource}
            />
            <Modal
                isOpen={isWhatsAppModalOpen}
                onClose={() => setIsWhatsAppModalOpen(false)}
                title="Mensaje de WhatsApp"
                maxWidth="max-w-md"
            >
                <div className="p-5 space-y-4">
                    <p className="text-muted-foreground text-xs leading-relaxed font-medium">
                        Puedes personalizar el mensaje antes de abrir WhatsApp. El nombre del cliente y el de tu empresa ya están incluidos por defecto.
                    </p>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Mensaje</label>
                        <textarea
                            value={whatsAppMessage}
                            onChange={(e) => setWhatsAppMessage(e.target.value)}
                            rows={4}
                            className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none font-medium leading-relaxed"
                            placeholder="Escribe tu mensaje aquí..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsWhatsAppModalOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-semibold text-xs uppercase tracking-wider"
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (submission?.owner_data?.phone) {
                                    const phone = submission.owner_data.phone.slice(-8);
                                    window.open(`https://wa.me/569${phone}?text=${encodeURIComponent(whatsAppMessage)}`, '_blank');
                                    setIsWhatsAppModalOpen(false);
                                }
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 transition-all text-xs uppercase tracking-wider flex justify-center items-center gap-1.5 cursor-pointer"
                            type="button"
                        >
                            <WhatsAppIcon className="w-4 h-4" />
                            Enviar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

