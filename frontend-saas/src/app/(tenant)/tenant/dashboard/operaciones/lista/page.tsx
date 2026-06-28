"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOperationSteps, useCurrentTenant } from '@/hooks/useSessionBootstrap';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useOperations } from '@/hooks/useOperations';
import { API_URL } from '@/lib/tenant/api';
import {
    LayoutDashboard,
    Search,
    Filter,
    Camera,
    ChevronRight,
    MapPin,
    Calendar,
    User,
    Dog,
    CheckCircle2,
    Clock,
    Upload,
    X as XIcon,
    AlertCircle,
    ArrowRight,
    ArrowUpDown,
    MoreVertical,
    FileText,
    Activity,
    Share2,
    Mail,
    Link as LinkIcon,
    MessageCircle,
    Play,
    RotateCcw,
    ChevronDown,
    FilterX,
    Eye,
    Phone,
    Hospital,
    Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import ImageCropper from '@/components/tenant/ImageCropper';
import CameraModal from '@/components/tenant/CameraModal';
import EditDateModal from '@/components/tenant/EditDateModal';
import EditWeightModal from '@/components/tenant/EditWeightModal';
import { copyToClipboard } from '@/lib/clipboard';
import { Scale } from 'lucide-react';

export default function OperationsPanelPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const bootstrapSteps = useOperationSteps();
    const currentTenant = useCurrentTenant();

    const steps = bootstrapSteps;
    const tenantTimezone = currentTenant?.timezone || 'America/Santiago';

    // State Variables
    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [specificStatus, setSpecificStatus] = useState('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const [editDateModal, setEditDateModal] = useState({
        isOpen: false,
        orderId: null as number | null,
        stepId: null as number | null,
        initialDate: ''
    });

    const [editWeightModal, setEditWeightModal] = useState({
        isOpen: false,
        orderId: null as number | null,
        petName: '',
        currentWeight: 0
    });

    const [showCamera, setShowCamera] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // useOperations Hook
    const {
        orders,
        ordersLoading: loading,
        serverTime,
        fetchServerTime,
        evidenceStepId,
        evidenceComments,
        evidencePhoto,
        setEvidencePhoto,
        setEvidenceComments,
        isSubmitting,
        handleAdvanceStep,
        handleFinalizeOrder,
        handleRevertStep,
        handleUpdateStepTime,
        handleStartOrder,
        handleOpenEvidence,
        handleUploadEvidence,
        handleDeleteEvidence
    } = useOperations({
        showCompleted,
        startDate,
        endDate,
        specificStatus,
        sortOrder,
        showToast,
        setConfirmModal,
        setSelectedOrder,
        selectedOrder
    });


    const statusLabels: Record<string, string> = {
        'pending': 'Pendiente',
        'approved': 'Aprobado',
        'received': 'Recibido en Planta',
        'processing': 'En Proceso',
        'ready': 'Listo para Entrega',
        'completed': 'Completado',
        'delivered': 'Entregado',
        'rejected': 'Rechazado',
        'en_proceso': 'En Proceso',
        'entregado': 'Entregado',
        'completado': 'Completado',
        'pendiente': 'Pendiente',
        'coordinado': 'Coordinado'
    };

    const statusColors: Record<string, string> = {
        'pendiente': 'text-orange-400',
        'pending': 'text-orange-400',
        'received': 'text-orange-400 border-orange-400',
        'recibido': 'text-orange-400 border-orange-400',
        'en_proceso': 'text-blue-400 border-blue-400',
        'processing': 'text-blue-400 border-blue-400',
        'completado': 'text-emerald-400 border-emerald-400',
        'listo': 'text-emerald-400 border-emerald-400',
        'entregado': 'text-[#FFD700] border-[#FFD700]',
        'delivered': 'text-[#FFD700] border-[#FFD700]',
        'cancelado': 'text-red-400 border-red-400',
        'canceled': 'text-red-400 border-red-400',
        'coordinado': 'text-indigo-400 border-indigo-400'
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropSource(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        const file = new File([croppedBlob], "evidence.png", { type: "image/png" });
        setEvidencePhoto(file);
        setShowCropper(false);
        setCropSource(null);
    };

    const filteredOrders = orders.filter(order => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                order.oc_number?.toString().includes(term) ||
                order.id.toString().includes(term) ||
                (order.pet_name && order.pet_name.toLowerCase().includes(term)) ||
                (order.pet_breed && order.pet_breed.toLowerCase().includes(term)) ||
                (order.customer_name && order.customer_name.toLowerCase().includes(term))
            );
        }
        return true;
    });

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, showCompleted]);

    const getStatusColor = (status: string) => {
        const key = status.toLowerCase();
        return statusColors[key] || 'text-white border-white/20';
    };


    return (
        <div className="min-h-screen bg-[#0f1115] p-3 sm:p-4 pb-20 md:p-8">
            {/* Título del módulo */}
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
                    <Activity className="text-primary" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Panel de Trabajo</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Seguimiento de órdenes de cremación en proceso y entregadas.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Vista</label>
                        <div className="flex items-center justify-between gap-2 bg-black/20 border border-white/10 px-4 py-2 rounded-xl h-[50px]">
                            <span className={`text-[10px] font-bold transition-colors ${!showCompleted ? 'text-primary' : 'text-muted-foreground'}`}>Proceso</span>
                            <div
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${showCompleted ? 'bg-emerald-500' : 'bg-primary/20'}`}
                                onClick={() => setShowCompleted(!showCompleted)}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showCompleted ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className={`text-[10px] font-bold transition-colors ${showCompleted ? 'text-emerald-400' : 'text-muted-foreground'}`}>Final</span>
                        </div>
                    </div>

                    <div className="xl:col-span-1 space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Búsqueda</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Mascota, cliente..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-primary/50 transition-all text-xs h-[50px] text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 lg:col-span-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Fechas</label>
                        <div className="flex items-center gap-2 h-[50px] bg-black/20 border border-white/10 rounded-xl px-3 outline-none focus-within:border-primary/50 transition-all">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-[10px] text-white outline-none w-full cursor-pointer"
                            />
                            <span className="text-muted-foreground/30">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-[10px] text-white outline-none w-full cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Estado</label>
                        <SearchableSelect
                            options={[
                                { value: "all", label: "Todos los estados" },
                                { value: "pendiente", label: "Pendiente" },
                                { value: "coordinado", label: "Coordinado" },
                                { value: "en_proceso", label: "En proceso" },
                                { value: "entregado", label: "Entregado" },
                                { value: "cancelado", label: "Cancelado" }
                            ]}
                            value={specificStatus}
                            onChange={setSpecificStatus}
                            placeholder="Estado..."
                        />
                    </div>

                    <div className="flex items-center gap-2 h-[50px]">
                        <button
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="w-full flex items-center justify-center gap-2 px-3 bg-black/20 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all h-full"
                        >
                            <ArrowUpDown size={16} />
                            <span className="text-[10px] font-bold uppercase">{sortOrder}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid de Tarjetas (OperationCard) */}
            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10">
                    <p className="text-muted-foreground">No hay órdenes {showCompleted ? 'completadas' : 'activas'}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedOrders.map(order => {
                        const currentStep = steps.find(s => s.id === order.current_step_id);
                        const isCoordinado = order.status.toLowerCase() === 'coordinado';
                        const colorStyles = getStatusColor(order.status);
                        
                        return (
                            <motion.div
                                layoutId={`card-${order.id}`}
                                key={order.id}
                                onClick={() => {
                                    if (isCoordinado) return;
                                    setSelectedOrder(order);
                                    setShowModal(true);
                                    fetchServerTime();
                                }}
                                className={`bg-[#161a22] p-5 rounded-2xl hover:shadow-xl hover:shadow-primary/5 transition-all group border-l-4 relative overflow-hidden shadow-sm flex flex-col gap-3 ${colorStyles.split(' ')[1]} ${isCoordinado ? 'cursor-default opacity-80 grayscale-[50%]' : 'cursor-pointer hover:-translate-y-1'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-black text-white leading-tight flex items-center gap-2">
                                            {order.pet_name || 'Sin Nombre'}
                                        </h3>
                                        <span className="text-xs font-medium text-muted-foreground mt-0.5">
                                            {order.pet_species || 'Mascota'} {order.pet_breed ? `• ${order.pet_breed}` : ''} {order.weight ? `• ${order.weight} kg` : ''}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-mono font-bold bg-white/5 text-muted-foreground px-2 py-1 rounded-md border border-white/10">
                                            SVC-{order.id}
                                        </span>
                                        {order.verification_code && (
                                            <span className="text-[10px] font-mono font-bold bg-white/5 text-muted-foreground px-2 py-1 rounded-md border border-white/10" title="Código de Seguimiento">
                                                {order.verification_code}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 mt-1">
                                    <p className="text-xs text-gray-400 flex items-center gap-2">
                                        <User size={12} className="text-primary/70 shrink-0" /> 
                                        <span className="truncate">{order.customer_name || 'Sin cliente'}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 flex items-center gap-2">
                                        <MapPin size={12} className="text-primary/70 shrink-0" />
                                        <span className="truncate">{order.customer_address || 'Sin dirección'}</span>
                                    </p>
                                </div>

                                <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                    <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${colorStyles.split(' ')[0]}`}>
                                        <Activity size={12} className={['processing', 'en_proceso'].includes(order.status.toLowerCase()) ? "animate-pulse" : ""} />
                                        {currentStep?.name || statusLabels[order.status.toLowerCase()] || order.status}
                                    </div>

                                    {/* Action Buttons inside Card */}
                                    {['received', 'recibido', 'coordinado'].includes(order.status.toLowerCase()) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartOrder(order.id);
                                            }}
                                            className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                                            title="Iniciar Proceso"
                                        >
                                            <Play size={14} fill="currentColor" className="ml-0.5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                        <ChevronRight className="rotate-180" size={20} />
                    </button>
                    <span className="text-sm text-muted-foreground font-medium">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* OperationDetailModal (Smart Ops Control) */}
            <AnimatePresence>
                {showModal && selectedOrder && (
                    <div className="fixed inset-0 z-[50] flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(false)}>
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0f1115] w-full max-w-2xl rounded-2xl sm:rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative max-h-[95dvh] md:max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-4 sm:p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative shrink-0">
                                <button onClick={() => setShowModal(false)} className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors z-10">
                                    <XIcon size={20} />
                                </button>

                                <div className="pr-12">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                                        <h2 className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">{selectedOrder.pet_name}</h2>
                                        <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono font-bold">
                                            SVC-{selectedOrder.id}
                                        </div>
                                        {selectedOrder.verification_code && (
                                            <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono font-bold" title="Código de Seguimiento">
                                                {selectedOrder.verification_code}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-md border border-white/5"><User size={12}/> {selectedOrder.customer_name}</span>
                                        <span className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-md border border-white/5"><Scale size={12} className="text-primary"/> {selectedOrder.weight ? `${selectedOrder.weight} kg` : 'Sin peso'}</span>
                                        <span className="flex items-center gap-1.5"><Clock size={12} className="text-primary"/> {serverTime || 'Cargando...'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Bar */}
                            <div className="px-4 sm:px-6 py-3 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                                {selectedOrder.customer_phone && (
                                    <button onClick={() => window.open(`https://wa.me/${selectedOrder.customer_phone}`, '_blank')} className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366]/20 whitespace-nowrap">
                                        <MessageCircle size={14} /> WhatsApp
                                    </button>
                                )}
                                <button onClick={async () => {
                                    const baseUrl = process.env.NEXT_PUBLIC_TRACKING_BASE_URL || `http://pm.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}`;
                                    const token = selectedOrder.verification_code || selectedOrder.tracking_token;
                                    const url = `${baseUrl}/${selectedOrder.tenant_slug}/track/${encodeURIComponent(selectedOrder.pet_name)}/${token}`;
                                    if(await copyToClipboard(url)) showToast('Enlace copiado', 'success');
                                }} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 whitespace-nowrap">
                                    <LinkIcon size={14} /> Tracking
                                </button>
                                <button onClick={() => setEditWeightModal({ isOpen: true, orderId: selectedOrder.id, petName: selectedOrder.pet_name, currentWeight: selectedOrder.weight || 0 })} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 whitespace-nowrap">
                                    <Scale size={14} /> Peso
                                </button>
                            </div>

                            {/* Timeline Body */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black/20 min-h-0 custom-scrollbar">
                                <div className="space-y-0 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute top-4 bottom-4 left-[19px] w-0.5 bg-white/5 z-0" />

                                    {steps.map((step, idx) => {
                                        const currentIndex = steps.findIndex(s => s.id === selectedOrder.current_step_id);
                                        const isCompleted = idx < currentIndex;
                                        const isCurrent = idx === currentIndex;
                                        const isPending = idx > currentIndex;
                                        const isLastStep = idx === steps.length - 1;

                                        return (
                                            <div key={step.id} className="relative z-10 flex gap-4 sm:gap-6 pb-6 sm:pb-8 last:pb-0">
                                                {/* Dot Indicator */}
                                                <div className="flex flex-col items-center pt-1">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                                        isCompleted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                                        isCurrent ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' :
                                                        'bg-[#0f1115] border-white/10 text-muted-foreground/30'
                                                    }`}>
                                                        {isCompleted ? <CheckCircle2 size={20} /> : <span className="text-sm font-black">{idx + 1}</span>}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className={`flex-1 min-w-0 rounded-2xl border transition-all ${
                                                    isCurrent ? 'bg-primary/5 border-primary/30 p-4 sm:p-5 shadow-lg' :
                                                    'bg-transparent border-transparent py-2'
                                                }`}>
                                                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                                        <div className="min-w-0">
                                                            <h4 className={`text-base sm:text-lg font-black tracking-tight ${isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-muted-foreground'}`}>
                                                                {step.name}
                                                            </h4>
                                                            {isCurrent && <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70 flex items-center gap-1.5 mt-1"><Activity size={12} className="animate-pulse"/> En Ejecución</p>}
                                                            {isCompleted && (
                                                                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-1">
                                                                    <CheckCircle2 size={10} className="text-emerald-500"/>
                                                                    {selectedOrder.timeline_metadata?.[step.id]?.completed_at_formatted || 'Completado'}
                                                                    <button onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditDateModal({ isOpen: true, orderId: selectedOrder.id, stepId: step.id, initialDate: selectedOrder.timeline_metadata?.[step.id]?.completed_at || new Date().toISOString()});
                                                                    }} className="ml-2 hover:text-primary transition-colors"><RotateCcw size={10}/></button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            {selectedOrder.evidence?.some((e: any) => e.step_id === step.id) && (
                                                                <button onClick={() => handleOpenEvidence(step.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${isCurrent ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                                                                    Ver Evidencia
                                                                </button>
                                                            )}
                                                            {isCurrent && (
                                                                <button onClick={() => handleOpenEvidence(step.id)} className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all">
                                                                    <Camera size={14} /> Subir
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Evidence Dropdown (Tap-First UI) */}
                                                    <AnimatePresence>
                                                        {evidenceStepId === step.id && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
                                                                <div className="bg-[#0f1115] p-4 rounded-xl border border-white/10 shadow-inner">
                                                                    {/* Existing Evidence */}
                                                                    {(() => {
                                                                        const existing = selectedOrder.evidence?.find((e: any) => e.step_id === step.id);
                                                                        if (existing) {
                                                                            return (
                                                                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl mb-4 flex items-center justify-between gap-4">
                                                                                    <div className="flex items-center gap-3">
                                                                                        {existing.photo_url && (
                                                                                            <a href={existing.photo_url.startsWith('http') ? existing.photo_url : `${API_URL}${existing.photo_url}`} target="_blank" rel="noopener noreferrer">
                                                                                                <img src={existing.photo_url.startsWith('http') ? existing.photo_url : `${API_URL}${existing.photo_url}`} className="w-12 h-12 rounded-lg object-cover border border-white/10" alt="Evidencia" />
                                                                                            </a>
                                                                                        )}
                                                                                        <div>
                                                                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Evidencia Guardada</p>
                                                                                            <div className="flex flex-col mt-1">
                                                                                                {existing.comments?.map((c: string, i: number) => <p key={i} className="text-xs text-muted-foreground">"{c}"</p>)}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button onClick={() => handleDeleteEvidence(existing.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"><XIcon size={16} /></button>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}

                                                                    {/* Tap-First Form */}
                                                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                                                        <button onClick={() => setShowCamera(true)} className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${evidencePhoto ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                                                                            <Camera size={24} />
                                                                            <span className="text-[10px] font-black uppercase tracking-wider">Tomar Foto</span>
                                                                        </button>
                                                                        <button onClick={() => galleryInputRef.current?.click()} className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${evidencePhoto ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                                                                            <ImageIcon size={24} />
                                                                            <span className="text-[10px] font-black uppercase tracking-wider">Galería</span>
                                                                        </button>
                                                                        <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                                                    </div>

                                                                    {/* Preview */}
                                                                    {evidencePhoto && (
                                                                        <div className="mb-4 relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary">
                                                                            <img src={URL.createObjectURL(evidencePhoto)} className="w-full h-full object-cover" alt="Preview" />
                                                                            <button onClick={() => setEvidencePhoto(null)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"><XIcon size={12}/></button>
                                                                        </div>
                                                                    )}

                                                                    <div className="space-y-2 mb-4">
                                                                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Notas Rápidas (Opcional)</label>
                                                                        {evidenceComments.map((comment, i) => (
                                                                            <input key={i} type="text" placeholder={`Nota ${i + 1}...`} value={comment} onChange={e => {
                                                                                const newComments = [...evidenceComments];
                                                                                newComments[i] = e.target.value;
                                                                                setEvidenceComments(newComments);
                                                                            }} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-primary/50 transition-all" />
                                                                        ))}
                                                                    </div>

                                                                    <button onClick={handleUploadEvidence} disabled={isSubmitting} className="w-full py-4 bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                                                        {isSubmitting ? 'Guardando...' : 'Confirmar Evidencia'}
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer Main Action */}
                            <div className="p-3 sm:p-4 bg-[#0f1115] border-t border-white/10 shrink-0">
                                {(() => {
                                    const currentIndex = steps.findIndex(s => s.id === selectedOrder.current_step_id);
                                    const isLastStep = currentIndex === steps.length - 1;
                                    
                                    if (isLastStep) {
                                        return (
                                            <button onClick={() => handleFinalizeOrder(selectedOrder.id)} className="w-full py-5 bg-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all flex justify-center items-center gap-2">
                                                <CheckCircle2 size={20}/> Concluir Proceso y Notificar
                                            </button>
                                        );
                                    }

                                    return (
                                        <div className="flex gap-2">
                                            {currentIndex > 0 && (
                                                <button onClick={() => handleRevertStep(selectedOrder.id)} className="w-16 flex items-center justify-center bg-white/5 text-muted-foreground rounded-2xl hover:bg-white/10 transition-colors">
                                                    <RotateCcw size={20}/>
                                                </button>
                                            )}
                                            <button onClick={() => handleAdvanceStep(selectedOrder.id)} className="flex-1 py-5 bg-primary text-primary-foreground rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:opacity-90 transition-all flex justify-center items-center gap-2">
                                                Completar Fase Actual <ArrowRight size={20}/>
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f1115] border border-white/10 p-6 rounded-2xl shadow-xl w-full max-w-sm text-center">
                            <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-sm text-muted-foreground mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2 rounded-xl text-sm font-bold border border-white/10 text-muted-foreground hover:bg-white/5">Cancelar</button>
                                <button onClick={() => confirmModal.onConfirm()} className="px-6 py-2 rounded-xl text-sm font-bold bg-[#cdffce] text-emerald-900 border border-emerald-500/20 hover:bg-[#b0f5b1]">Aceptar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <EditDateModal isOpen={editDateModal.isOpen} onClose={() => setEditDateModal(prev => ({ ...prev, isOpen: false }))} onSave={(newDate) => { if (editDateModal.orderId && editDateModal.stepId) { handleUpdateStepTime(editDateModal.orderId, editDateModal.stepId, newDate); } }} initialDate={editDateModal.initialDate} timezone={tenantTimezone} />
            <EditWeightModal isOpen={editWeightModal.isOpen} onClose={() => setEditWeightModal(prev => ({ ...prev, isOpen: false }))} orderId={editWeightModal.orderId} petName={editWeightModal.petName} currentWeight={editWeightModal.currentWeight} onSave={(newWeight) => { if (selectedOrder && selectedOrder.id === editWeightModal.orderId) { setSelectedOrder((prev: any) => ({ ...prev, weight: newWeight })); } queryClient.invalidateQueries({ queryKey: ['daily-orders'] }); }} />
            
            {showCamera && (
                <CameraModal onCapture={(file) => { setEvidencePhoto(file); setShowCamera(false); const reader = new FileReader(); reader.onload = () => { setCropSource(reader.result as string); setShowCropper(true); }; reader.readAsDataURL(file); }} onClose={() => setShowCamera(false)} />
            )}
            
            {showCropper && cropSource && (
                <ImageCropper image={cropSource} aspect={1} showAspectSelector={true} onCropComplete={handleCropComplete} onCancel={() => { setShowCropper(false); setCropSource(null); if (fileInputRef.current) fileInputRef.current.value = ''; if (galleryInputRef.current) galleryInputRef.current.value = ''; }} title="Recortar Evidencia" />
            )}
        </div>
    );
}
