"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    User,
    Dog,
    Eye,
    Trash2,
    CheckCircle,
    Loader2,
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    Package,
    Shield,
    Store,
    Calendar,
    MessageSquare,
    AlertCircle
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useDashboardSummary, useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { useQueryClient } from '@tanstack/react-query';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';
import Modal from '@/components/tenant/Modal';

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

export default function SubmissionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const dashboardData = useDashboardSummary();
    const tenant = useCurrentTenant();

    const submissionId = params?.id ? Number(params.id) : null;

    const [submission, setSubmission] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [workflowStep, setWorkflowStep] = useState<{
        customer_id?: number,
        pet_id?: number,
        cremation_id?: number
    }>({});
    const [userRole, setUserRole] = useState<string | null>(null);

    const [showLimitModal, setShowLimitModal] = useState(false);
    const [modalResource, setModalResource] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');

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
        if (submissionId) {
            fetchDetail();
            setWorkflowStep({});
        }
    }, [submissionId]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const data = await apiRequest(`/api/internal/submissions/${submissionId}`);
            setSubmission(data);

            if (data.customer_id || data.pet_id) {
                setWorkflowStep({
                    customer_id: data.customer_id,
                    pet_id: data.pet_id
                });
            }
        } catch (err: any) {
            showToast('Error al cargar detalles', 'error');
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!submission) return;
        setIsDeleting(true);
        try {
            await apiRequest(`/api/internal/submissions/${submission.id}`, { method: 'DELETE' });
            showToast('Registro eliminado', 'success');
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            router.push('/dashboard');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
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

            try {
                await apiRequest(`/api/internal/notifications/archive-by-submission/${submission.id}`, { method: 'POST' });
            } catch (err) {
                console.error('Error archiving notification:', err);
            }

            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
            router.push('/dashboard');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setProcessingAction(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-sm font-bold animate-pulse uppercase tracking-widest opacity-50 text-muted-foreground">Cargando detalles del registro...</p>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/10">
                <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
                <h3 className="text-lg font-bold mb-2">No se encontró el registro</h3>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft size={16} /> Volver al Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white transition-all active:scale-95"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Detalle del Registro</h1>
                            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">Pendiente</span>
                            {submission.code && (
                                <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
                                    Cód: {submission.code}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">Enviado el {submission.created_at}</p>
                    </div>
                </div>
                {(userRole === 'admin' || userRole === 'recepcion' || userRole === 'creator') && (
                    <button
                        onClick={handleDeleteClick}
                        className="py-3 px-5 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-red-500/20 flex items-center justify-center gap-2 active:scale-95 self-start sm:self-auto"
                    >
                        <Trash2 size={16} /> Eliminar Registro
                    </button>
                )}
            </div>

            {/* Main grid info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Columns - Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Owner & Pet Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Owner Card */}
                        <div className="bg-[#0b1329] border border-white/5 rounded-3xl p-6 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-primary/70 flex items-center gap-2">
                                <User size={16} /> Información del Dueño
                            </h3>
                            <div className="space-y-4">
                                {submission.partner && (
                                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                        <p className="text-[10px] text-emerald-400 uppercase font-black flex items-center gap-1">
                                            <Store size={14} /> Partner Referido
                                        </p>
                                        <p className="text-base font-bold text-foreground mt-1">{submission.partner.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {submission.partner.slug}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Nombre Completo</p>
                                    <p className="text-base font-bold text-white mt-1">{submission.owner_data?.fullName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">RUT</p>
                                        <p className="text-sm font-semibold text-white/90 mt-1">{submission.owner_data?.rut || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Teléfono</p>
                                        <p className="text-sm font-semibold text-white/90 mt-1 flex items-center gap-1.5">
                                            <Phone size={12} className="text-primary" />
                                            {submission.owner_data?.phone}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Email</p>
                                    <p className="text-sm font-semibold text-white/90 mt-1 flex items-center gap-1.5">
                                        <Mail size={12} className="text-primary" />
                                        {submission.owner_data?.email}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Dirección de Entrega Cenizas</p>
                                    <p className="text-sm font-semibold text-white/90 mt-1 flex items-start gap-1.5">
                                        <MapPin size={12} className="text-primary mt-1 shrink-0" />
                                        <span>
                                            {submission.owner_data?.address ? `${submission.owner_data.address}, ` : ''}
                                            {submission.owner_data?.commune}, {submission.owner_data?.region}
                                        </span>
                                    </p>
                                </div>
                                {submission.owner_data?.phone && (
                                    <button
                                        onClick={() => {
                                            const defaultMsg = `Hola ${submission.owner_data.fullName}, te contactamos de ${tenant?.name || 'Vinzer'}.`;
                                            setWhatsAppMessage(defaultMsg);
                                            setIsWhatsAppModalOpen(true);
                                        }}
                                        className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
                                    >
                                        <WhatsAppIcon className="w-5 h-5" />
                                        <span className="text-[10px] uppercase tracking-widest">Contactar por WhatsApp</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Pet Card */}
                        <div className="bg-[#0b1329] border border-white/5 rounded-3xl p-6 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400/70 flex items-center gap-2">
                                <Dog size={16} /> Detalles de la Mascota
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Nombre Mascota</p>
                                    <p className="text-base font-bold text-white mt-1">{submission.pet_data?.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Tipo</p>
                                        <p className="text-sm font-semibold text-white/90 mt-1 capitalize">{submission.pet_data?.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Raza</p>
                                        <p className="text-sm font-semibold text-white/90 mt-1">{submission.pet_data?.breed || 'N/A'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Tamaño</p>
                                    <p className="text-sm font-semibold text-white/90 mt-1 capitalize">{submission.pet_data?.size || 'N/A'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Edad</p>
                                        <p className="text-sm font-semibold text-white/90 mt-1">{submission.pet_data?.age} años</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Nacimiento</p>
                                        <p className="text-sm font-semibold text-white/90 mt-1">{submission.pet_data?.birthDate || 'N/A'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Fallecimiento</p>
                                    <p className="text-sm font-semibold text-white/90 mt-1">{submission.pet_data?.deathDate || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selected Services */}
                    <div className="bg-[#0b1329] border border-white/5 rounded-3xl p-6 space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-orange-400/70 flex items-center gap-2">
                            <Package size={16} /> Servicios Seleccionados
                        </h3>
                        <div className="border border-white/5 rounded-2xl overflow-x-auto bg-white/[0.01]">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5 text-muted-foreground">
                                        <th className="px-5 py-3 font-black uppercase text-[10px] tracking-wider">Concepto</th>
                                        <th className="px-5 py-3 font-black uppercase text-[10px] tracking-wider text-right">Precio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(submission.selected_services || submission.resolved_services) && (submission.selected_services || submission.resolved_services).length > 0 ? (
                                        (submission.selected_services || submission.resolved_services).map((item: any, idx: number) => {
                                            if (item.type === 'plan' && item.items && item.items.length > 0) {
                                                return (
                                                    <React.Fragment key={idx}>
                                                        <tr className="bg-white/[0.02]">
                                                            <td className="px-5 py-3.5">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-white">{item.name}</p>
                                                                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-yellow-500/10 text-yellow-500 font-bold uppercase border border-yellow-500/20">PLAN</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right font-black text-orange-400 text-sm">
                                                                ${(item.price || 0).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                        {item.items.map((sub: any, sIdx: number) => (
                                                            <tr key={`${idx}-${sIdx}`} className="hover:bg-white/[0.02] transition-colors">
                                                                <td className="px-5 py-2 pl-10 border-l-2 border-primary/20">
                                                                    <p className="text-white/70 text-xs font-semibold">{sub.name}</p>
                                                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{sub.type}</p>
                                                                </td>
                                                                <td className="px-5 py-2 text-right font-bold text-muted-foreground/60 text-[10px]">
                                                                    INCLUIDO
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            }

                                            return (
                                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-bold text-white">{item.name}</p>
                                                        <p className="text-[9px] text-muted-foreground uppercase">{item.type || 'Servicio'}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-black text-orange-400 text-sm">
                                                        ${(item.price || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-5 py-12 text-center text-muted-foreground/40 italic text-sm">
                                                Ningún servicio adicional seleccionado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {submission.total > 0 && (
                                    <tfoot>
                                        <tr className="bg-orange-500/10 font-black border-t-2 border-orange-500/20">
                                            <td className="px-5 py-4 text-orange-400 uppercase tracking-wider text-xs">Total a Pagar</td>
                                            <td className="px-5 py-4 text-right text-orange-400 text-base">
                                                ${submission.total.toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column - Actions & Details */}
                <div className="space-y-8">
                    {/* Workflow Actions Card */}
                    <div className="bg-[#0b1329] border border-white/5 rounded-3xl p-6 space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                            <CheckCircle size={16} className="text-primary" /> Procesar Registro
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Sigue el flujo de trabajo para migrar los datos a tu base de datos de Clientes, Mascotas y generar el Pedido Operativo correspondiente.
                        </p>

                        {(userRole === 'admin' || userRole === 'recepcion' || userRole === 'creator') ? (
                            <div className="flex flex-col gap-4">
                                {/* Step 1: Client */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Paso 1: Cliente</span>
                                        {workflowStep.customer_id && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Completado</span>}
                                    </div>
                                    <button
                                        onClick={handleAddCustomer}
                                        disabled={!!workflowStep.customer_id || processingAction === 'customer' || isCustomerLimitReached}
                                        className={`w-full py-3.5 px-4 rounded-2xl border transition-all flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-wider ${
                                            workflowStep.customer_id
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-not-allowed'
                                                : isCustomerLimitReached 
                                                    ? 'bg-red-500/10 border-red-500/25 text-red-400 cursor-not-allowed' 
                                                    : 'bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/30 text-white active:scale-98'
                                        }`}
                                    >
                                        {processingAction === 'customer' ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : workflowStep.customer_id ? (
                                            <CheckCircle size={14} />
                                        ) : (
                                            <User size={14} className={isCustomerLimitReached ? "text-red-400" : "text-primary"} />
                                        )}
                                        {isCustomerLimitReached && !workflowStep.customer_id ? 'Límite Clientes Superado' : workflowStep.customer_id ? 'Cliente Creado' : 'Registrar Cliente'}
                                    </button>
                                </div>

                                {/* Step 2: Pet */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Paso 2: Mascota</span>
                                        {workflowStep.pet_id && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Completado</span>}
                                    </div>
                                    <button
                                        onClick={handleAddPet}
                                        disabled={!workflowStep.customer_id || !!workflowStep.pet_id || processingAction === 'pet' || isPetLimitReached}
                                        className={`w-full py-3.5 px-4 rounded-2xl border transition-all flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-wider ${
                                            workflowStep.pet_id
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-not-allowed'
                                                : isPetLimitReached && workflowStep.customer_id 
                                                    ? 'bg-red-500/10 border-red-500/25 text-red-400 cursor-not-allowed' 
                                                    : !workflowStep.customer_id 
                                                        ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/5 text-muted-foreground' 
                                                        : 'bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-white active:scale-98'
                                        }`}
                                    >
                                        {processingAction === 'pet' ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : workflowStep.pet_id ? (
                                            <CheckCircle size={14} />
                                        ) : (
                                            <Dog size={14} className={isPetLimitReached && workflowStep.customer_id ? "text-red-400" : "text-emerald-400"} />
                                        )}
                                        {isPetLimitReached && workflowStep.customer_id && !workflowStep.pet_id ? 'Límite Mascotas Superado' : workflowStep.pet_id ? 'Mascota Creada' : 'Registrar Mascota'}
                                    </button>
                                </div>

                                {/* Step 3: Services & Finalize */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Paso 3: Finalizar</span>
                                    <button
                                        onClick={handleAddServices}
                                        disabled={!workflowStep.pet_id || processingAction === 'services' || (isOrderLimitReached && !workflowStep.pet_id)}
                                        className={`w-full py-4 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2.5 ${
                                            !workflowStep.pet_id
                                                ? 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5'
                                                : isOrderLimitReached 
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed' 
                                                    : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] shadow-primary/20'
                                        }`}
                                    >
                                        {processingAction === 'services' ? (
                                            <Loader2 className="animate-spin" size={16} />
                                        ) : (
                                            <Package size={16} />
                                        )}
                                        {isOrderLimitReached && workflowStep.pet_id ? 'Límite Pedidos Superado' : 'Generar Pedido y Finalizar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 px-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Shield size={14} /> Solo Administrador o Recepción pueden procesar registros
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Additional Details (Veterinary & Comments) */}
                    {(submission.owner_data?.veterinary || submission.owner_data?.comments) && (
                        <div className="bg-[#0b1329] border border-white/5 rounded-3xl p-6 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400/70 flex items-center gap-2">
                                <MessageSquare size={16} /> Detalles Adicionales
                            </h3>
                            <div className="space-y-4">
                                {submission.owner_data?.veterinary && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Lugar de Retiro</p>
                                        <p className="text-sm font-semibold text-white/95 mt-1">{submission.owner_data.veterinary}</p>
                                    </div>
                                )}
                                {submission.owner_data?.comments && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black">Comentarios / Referencias</p>
                                        <p className="text-sm font-semibold text-white/90 mt-1 whitespace-pre-wrap leading-relaxed">{submission.owner_data.comments}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Images Card */}
                    <div className="bg-[#0b1329] border border-white/5 rounded-3xl p-6 space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-blue-400/70 flex items-center gap-2">
                            📸 Fotos de Recuerdo
                        </h3>
                        {submission.images && submission.images.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {submission.images.map((img: string, idx: number) => (
                                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-white/10 ring-4 ring-white/5 relative group">
                                        <img
                                            src={img}
                                            className="w-full h-full object-cover transition-transform hover:scale-110 duration-500"
                                            alt={`Mascota ${idx + 1}`}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic py-4 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/10">No se adjuntaron fotos.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Limit Modal */}
            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName={modalResource}
            />

            {/* Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
                title="Eliminar Registro"
                maxWidth="max-w-md"
            >
                <div className="p-4 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">¿Confirmar eliminación permanente?</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                        Esta acción no se puede deshacer. Se eliminarán de forma permanente los datos de este registro y sus fotos asociadas en Cloudflare.
                    </p>
                    <div className="flex gap-3">
                        <button
                            disabled={isDeleting}
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-semibold text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isDeleting}
                            onClick={handleDeleteConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all text-sm flex justify-center"
                        >
                            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </Modal>

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
                            className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white focus:outline-none focus:border-primary/50 resize-none font-medium leading-relaxed"
                            placeholder="Escribe tu mensaje aquí..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsWhatsAppModalOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-semibold text-xs uppercase tracking-wider"
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
