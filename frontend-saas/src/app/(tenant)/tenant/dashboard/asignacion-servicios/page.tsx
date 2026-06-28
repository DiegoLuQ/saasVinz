"use client";

import React, { useMemo, useState } from 'react';
import {
    Plus,
    AlertCircle,
    Loader2,
    Activity,
    Search,
    LayoutGrid,
    List as ListIcon,
    ArrowRight,
    CheckCircle2,
    Clock,
    PlayCircle,
    Lock,
    Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/tenant/Modal';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import CancellationModal from '@/components/tenant/CancellationModal';
import { useCremations, useUpdateCremationStatus, useDeleteCremation, type Cremation } from '@/hooks/useCremations';
import OperationsStatsCards, { type OpsFilter } from '@/components/tenant/operations/OperationsStatsCards';
import OperationsToolbar, { type StatusPillFilter } from '@/components/tenant/operations/OperationsToolbar';
import OperationRow from '@/components/tenant/operations/OperationRow';
import { getImageUrl } from '@/lib/tenant/api';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';

// ==========================================
// Status normalization
// ==========================================
const normalizeStatus = (raw: string): string => {
    const v = raw.trim().toLowerCase();
    if (['pending', 'received'].includes(v)) return 'pendiente';
    // 'ready' (técnica terminada en Operaciones) se considera aún en proceso hasta la entrega
    if (['processing', 'ready'].includes(v)) return 'en_proceso';
    // Estado final único = entregado. 'completado'/'completed' quedan retirados → entregado
    if (['delivered', 'completed', 'completado'].includes(v)) return 'entregado';
    if (['canceled'].includes(v)) return 'cancelado';
    return v;
};

const isToday = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
};

export default function CremationsPage() {
    const { tenantData, formatLimit } = useTenant();
    const router = useRouter();

    // ==========================================
    // Data
    // ==========================================
    const { data: cremations = [], isLoading: loadingCremations } = useCremations();
    const updateStatusMutation = useUpdateCremationStatus();
    const deleteCremationMutation = useDeleteCremation();

    // ==========================================
    // Local state
    // ==========================================
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
    const [opsFilter, setOpsFilter] = useState<OpsFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusPillFilter>('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Deletion + cancellation modals
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [idToCancel, setIdToCancel] = useState<number | null>(null);
    const [showLimitModal, setShowLimitModal] = useState(false);

    // El registro de órdenes ya no se bloquea por tener pocos servicios en el catálogo (ej: plan Track tiene 1 servicio y 35 órdenes)
    const isRegistrarBloqueado = false;

    const ordersThisMonth = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return cremations.filter(c => {
            if (!c.created_at) return false;
            const d = new Date(c.created_at);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }).length;
    }, [cremations]);

    // ==========================================
    // Counts
    // ==========================================
    const counts = useMemo(() => {
        const base = {
            all: cremations.length,
            pendiente: 0,
            en_proceso: 0,
            coordinado: 0,
            completado: 0,
            cancelado: 0,
            today: 0,
        };
        cremations.forEach(c => {
            const s = normalizeStatus(c.status);
            if (s in base) (base as any)[s]++;
            if (s === 'entregado') base.completado++; 
            if (isToday(c.scheduled_at)) base.today++;
        });
        return base;
    }, [cremations]);

    // ==========================================
    // Filtering pipeline
    // ==========================================
    const filteredCremations = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return cremations.filter(c => {
            const status = normalizeStatus(c.status);

            // Stat card filter
            if (opsFilter === 'pendiente' && status !== 'pendiente') return false;
            if (opsFilter === 'en_proceso' && status !== 'en_proceso') return false;
            if (opsFilter === 'today' && !isToday(c.scheduled_at)) return false;

            // Pill filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'completado' && !['completado', 'entregado'].includes(status)) return false;
                else if (statusFilter !== 'completado' && status !== statusFilter) return false;
            }

            // Search
            if (search) {
                const haystack = [
                    String(c.id),
                    `svc-${c.id}`,
                    c.pet?.name || '',
                    c.pet?.customer?.name || '',
                    c.city || '',
                    c.region || '',
                    c.address || '',
                ].join(' ').toLowerCase();
                if (!haystack.includes(search)) return false;
            }

            return true;
        });
    }, [cremations, opsFilter, statusFilter, searchTerm]);

    // Kanban Columns separation
    const kanbanColumns = useMemo(() => {
        const cols = {
            pendiente: [] as Cremation[],
            en_proceso: [] as Cremation[],
            completado: [] as Cremation[]
        };

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        filteredCremations.forEach(c => {
            const s = normalizeStatus(c.status);
            if (s === 'pendiente' || s === 'coordinado') cols.pendiente.push(c);
            else if (s === 'en_proceso') cols.en_proceso.push(c);
            else if (s === 'completado' || s === 'entregado') {
                cols.completado.push(c);
            }
        });

        return cols;
    }, [filteredCremations]);

    // ==========================================
    // Handlers
    // ==========================================
    const handleNewService = () => {
        if (isRegistrarBloqueado) {
            setShowLimitModal(true);
            return;
        }
        router.push('/dashboard/asignacion-servicios/registro');
    };
    const handleOpen = (id: number) => router.push(`/dashboard/asignacion-servicios/registro?id=${id}`);

    const handleDeleteCremation = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await deleteCremationMutation.mutateAsync(itemToDelete);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch {
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateStatus = async (cremationId: number, newStatus: string) => {
        if (newStatus === 'cancelado') {
            setIdToCancel(cremationId);
            setCancelModalOpen(true);
            return;
        }
        setUpdatingStatusId(cremationId);
        try {
            await updateStatusMutation.mutateAsync({ id: cremationId, status: newStatus });
        } catch {
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const confirmCancellation = async () => {
        if (!idToCancel) return;
        try {
            await updateStatusMutation.mutateAsync({ id: idToCancel, status: 'cancelado' });
        } catch {} finally {
            setIdToCancel(null);
            setCancelModalOpen(false);
        }
    };

    const isFilterActive = opsFilter !== 'all' || statusFilter !== 'all' || searchTerm.trim() !== '';

    const clearAllFilters = () => {
        setOpsFilter('all');
        setStatusFilter('all');
        setSearchTerm('');
    };

    // Kanban Card Component
    const KanbanCard = ({ item, nextStatus, nextLabel, icon: Icon, colorClass, glowColor, isSelected, onSelect }: any) => (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onSelect}
            className={`cursor-pointer border-2 rounded-2xl p-4 shadow-xl transition-all group flex flex-col gap-4 relative overflow-hidden ${
                isSelected 
                ? `border-primary bg-[#1e293b] shadow-primary/20 ring-4 ring-primary/10` 
                : `bg-[#0f172a] border-white/5 hover:border-${glowColor}/40 hover:shadow-${glowColor}/10 hover:shadow-2xl`
            }`}
            style={{ 
                // Using inline styles for dynamic glow to ensure they match the theme colors perfectly
                boxShadow: isSelected ? '0 0 20px rgba(16, 185, 129, 0.15)' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
        >
            {/* Glow effect on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br from-${glowColor}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            {updatingStatusId === item.id && (
                <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-white" size={24} />
                </div>
            )}

            {(normalizeStatus(item.status) === 'en_proceso' || item.status.trim().toLowerCase() === 'processing' || normalizeStatus(item.status) === 'pendiente') && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item.id);
                        setIsDeleteModalOpen(true);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-red-500/20 hover:text-red-400 border border-white/5 hover:border-red-500/30 text-muted-foreground transition-all z-20 active:scale-90"
                    title="Eliminar"
                >
                    <Trash2 size={13} />
                </button>
            )}
            
            <div className="flex gap-3 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow-inner group-hover:border-white/20 transition-colors">
                    {item.pet?.image_url ? (
                        <img src={getImageUrl(item.pet.image_url)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex justify-center items-center opacity-30 text-xs font-bold uppercase">{item.pet?.name?.substring(0,2) || 'PT'}</div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm truncate cursor-pointer hover:text-primary transition-colors" onClick={() => handleOpen(item.id)}>
                        {item.pet?.name || 'Sin Nombre'}
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate">{item.pet?.customer?.name || 'Cliente no asignado'}</p>
                    {item.created_at && (
                        <p className="text-[9px] text-muted-foreground/60 mt-1 font-semibold">
                            Creación: {new Date(item.created_at).toLocaleDateString('es-CL')} {new Date(item.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-white/5 text-muted-foreground px-2 py-0.5 rounded-md border border-white/5">
                            SVC-{item.id}
                        </span>
                        {item.verification_code && (
                            <span className="text-[9px] uppercase tracking-wider font-bold bg-white/5 text-muted-foreground px-2 py-0.5 rounded-md border border-white/5" title="Código de Seguimiento">
                                {item.verification_code}
                            </span>
                        )}
                        {item.cremation_type && (
                            <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                                nextStatus === 'en_proceso' ? 'bg-orange-500/10 text-orange-400' : 
                                nextStatus === 'completado' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-emerald-500/10 text-emerald-400'
                            }`}>
                                {item.cremation_type}
                            </span>
                        )}
                        {normalizeStatus(item.status) === 'coordinado' && (
                            <span className="text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                                Coordinado
                            </span>
                        )}
                        {normalizeStatus(item.status) === 'entregado' && (
                            <span className="text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md bg-gray-500/15 text-gray-400 border border-white/5">
                                Entregado
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {nextStatus && (
                <button
                    onClick={() => handleUpdateStatus(item.id, nextStatus)}
                    disabled={updatingStatusId === item.id}
                    className={`w-full py-2.5 rounded-xl border border-transparent hover:border-white/10 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 relative z-10 ${colorClass}`}
                >
                    {nextLabel}
                    <Icon size={14} />
                </button>
            )}
        </motion.div>
    );

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-3">
                        <Activity className="text-primary" size={11} />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.22em]">Operations Hub</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">Cola de Pedidos<span className="text-primary ml-1">.</span></h1>
                    </div>
                    <p className="text-muted-foreground mt-1.5 text-sm max-w-xl">
                        Gestiona el flujo operativo. Usa el Tablero Kanban para control rápido o la Lista para detalles.
                    </p>
                    {tenantData?.subscription_plan && (
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1 rounded-xl text-xs text-muted-foreground font-medium">
                                Plan: <strong className="text-primary font-bold uppercase">{tenantData.subscription_plan.name}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1 rounded-xl text-xs text-muted-foreground font-medium">
                                Pedidos este Mes: <strong className="text-white font-bold">{ordersThisMonth} / {formatLimit(tenantData.subscription_plan.max_orders)}</strong>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* View Toggle */}
                    <div className="bg-black/40 p-1 rounded-xl border border-white/5 flex">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutGrid size={14} /> Kanban
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                            <ListIcon size={14} /> Lista
                        </button>
                    </div>

                    <button
                        onClick={handleNewService}
                        className={`min-h-[44px] font-black py-3 px-6 rounded-xl flex items-center justify-center shadow-xl transition-all text-xs uppercase tracking-[0.18em] ${
                            isRegistrarBloqueado
                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 hover:-translate-y-0.5 active:scale-95 cursor-pointer'
                                : 'bg-primary text-primary-foreground shadow-primary/20 hover:-translate-y-0.5 active:scale-95'
                        }`}
                    >
                        {isRegistrarBloqueado ? <Lock className="mr-2" size={15} /> : <Plus className="mr-2" size={16} />}
                        Registrar Servicio
                    </button>
                </div>
            </header>

            {/* Stats & Filters (Only show in List Mode or specific cases, but keeping Toolbar is good for search) */}
            <OperationsToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={(next) => { setStatusFilter(next); setOpsFilter('all'); }}
                counts={counts}
                visibleCount={filteredCremations.length}
                totalCount={counts.all}
            />

            {/* Main Content Area */}
            {loadingCremations ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs font-bold">Cargando Tablero...</p>
                </div>
            ) : filteredCremations.length === 0 ? (
                <div className="bg-white/[0.02] rounded-3xl border-2 border-dashed border-white/[0.06] p-16 flex flex-col items-center justify-center text-center">
                    <Search className="text-muted-foreground/30 mb-4" size={48} />
                    <p className="text-lg font-black text-white mb-2">No se encontraron servicios</p>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md">El tablero está limpio. Registra un nuevo servicio o ajusta tus filtros de búsqueda.</p>
                    {isFilterActive && (
                        <button onClick={clearAllFilters} className="px-6 py-3 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                            Limpiar Filtros
                        </button>
                    )}
                </div>
            ) : viewMode === 'kanban' ? (
                /* KANBAN BOARD */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-start">
                    {/* Columna Pendientes */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                                Recibidos
                            </h3>
                            <span className="text-xs font-black text-muted-foreground bg-white/5 px-2.5 py-1 rounded-lg">{kanbanColumns.pendiente.length}</span>
                        </div>
                        <div className="flex flex-col gap-3 min-h-[150px]">
                            <AnimatePresence>
                                {kanbanColumns.pendiente.map(c => (
                                    <KanbanCard 
                                        key={c.id} item={c} 
                                        isSelected={selectedId === c.id}
                                        onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)}
                                        nextStatus="en_proceso" nextLabel="Iniciar Proceso" icon={PlayCircle} 
                                        colorClass="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white"
                                        glowColor="orange-400"
                                    />
                                ))}
                            </AnimatePresence>
                            {kanbanColumns.pendiente.length === 0 && (
                                <div className="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center p-6 text-muted-foreground/30 text-sm font-medium">Sin pendientes</div>
                            )}
                        </div>
                    </div>

                    {/* Columna En Proceso */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-4 flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />
                        <div className="flex items-center justify-between px-2 relative z-10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                En Proceso
                            </h3>
                            <span className="text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">{kanbanColumns.en_proceso.length}</span>
                        </div>
                        <div className="flex flex-col gap-3 min-h-[150px] relative z-10">
                            <AnimatePresence>
                                {kanbanColumns.en_proceso.map(c => (
                                    <KanbanCard 
                                        key={c.id} item={c} 
                                        isSelected={selectedId === c.id}
                                        onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)}
                                        nextStatus="entregado" nextLabel="Marcar Entregado" icon={CheckCircle2}
                                        colorClass="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                        glowColor="blue-500"
                                    />
                                ))}
                            </AnimatePresence>
                            {kanbanColumns.en_proceso.length === 0 && (
                                <div className="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center p-6 text-muted-foreground/30 text-sm font-medium">Hornos vacíos</div>
                            )}
                        </div>
                    </div>

                    {/* Columna Entregados */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                Entregados
                            </h3>
                            <span className="text-xs font-black text-muted-foreground bg-white/5 px-2.5 py-1 rounded-lg">{kanbanColumns.completado.length}</span>
                        </div>
                        <div className="flex flex-col gap-3 min-h-[150px]">
                            <AnimatePresence>
                                {kanbanColumns.completado.map(c => (
                                    <KanbanCard 
                                        key={c.id} item={c} 
                                        isSelected={selectedId === c.id}
                                        onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)}
                                        nextStatus={normalizeStatus(c.status) === 'completado' ? 'entregado' : null} 
                                        nextLabel="Entregado al Dueño" icon={ArrowRight} 
                                        colorClass="bg-white/5 text-white hover:bg-white hover:text-black"
                                        glowColor="emerald-400"
                                    />
                                ))}
                            </AnimatePresence>
                            {kanbanColumns.completado.length === 0 && (
                                <div className="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center p-6 text-muted-foreground/30 text-sm font-medium">Sin entregas pendientes</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* LIST VIEW */
                <div className="space-y-3">
                    {filteredCremations.map((item: Cremation) => (
                        <OperationRow
                            key={item.id}
                            item={item}
                            isUpdatingStatus={updatingStatusId === item.id}
                            onChangeStatus={handleUpdateStatus}
                            onOpen={handleOpen}
                            onDelete={(id) => {
                                setItemToDelete(id);
                                setIsDeleteModalOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
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
                        Esta acción no se puede deshacer.
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
                            onClick={handleDeleteCremation}
                            className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all text-sm flex justify-center"
                        >
                            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </Modal>

            <CancellationModal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={confirmCancellation}
                orderId={idToCancel || ''}
            />

            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName="Servicios y Productos"
            />
        </div>
    );
}
