"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock,
    User,
    Dog,
    Eye,
    Trash2,
    CheckCircle,
    Loader2,
    Calendar,
    ArrowRight,
    Store,
    Globe,
    RotateCcw,
    Archive,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useInitialSubmissions, useIsOwner } from '@/hooks/useSessionBootstrap';
import { useQuery, useQueryClient } from '@tanstack/react-query';


interface SubmissionListItem {
    id: number;
    owner_name: string;
    pet_name: string;
    pet_type: string;
    region?: string;
    city?: string;
    status: string;
    created_at: string;
    origin?: string;
    partner_name?: string;
    deleted_at?: string | null;
    deleted_by_name?: string | null;
}

type Tab = 'pending' | 'deleted';

export const DELETED_SUBMISSIONS_KEY = ['submissions', 'deleted'];

export default function SubmissionsTable() {
    const router = useRouter();
    const bootstrapSubmissions = useInitialSubmissions();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<Tab>('pending');
    const [busyId, setBusyId] = useState<number | null>(null);

    const { showToast } = useToast();
    const { canDelete } = usePermissions();
    const isOwner = useIsOwner();
    const canManage = canDelete('ordenes');

    const pending = (bootstrapSubmissions || []) as SubmissionListItem[];
    // La papelera se pide solo al abrir la pestaña
    const { data: deleted = [], isLoading: loadingDeleted } = useQuery<SubmissionListItem[]>({
        queryKey: DELETED_SUBMISSIONS_KEY,
        queryFn: () => apiRequest('/api/internal/submissions?status=deleted'),
        enabled: tab === 'deleted' && canManage,
    });
    const submissions = tab === 'pending' ? pending : deleted;

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        queryClient.invalidateQueries({ queryKey: DELETED_SUBMISSIONS_KEY });
    };

    const run = async (id: number, action: () => Promise<unknown>, ok: string) => {
        setBusyId(id);
        try {
            await action();
            showToast(ok, 'success');
            refresh();
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'No se pudo completar la acción', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleView = (id: number) => router.push(`/dashboard/registros/${id}`);

    const handleDelete = (id: number) => {
        if (!confirm('¿Enviar este registro a Eliminados? Se conservan sus datos y fotos, y podrás restaurarlo.')) return;
        run(id, () => apiRequest(`/api/internal/submissions/${id}`, { method: 'DELETE' }), 'Registro enviado a Eliminados');
    };
    const handleRestore = (id: number) =>
        run(id, () => apiRequest(`/api/internal/submissions/${id}/restore`, { method: 'POST' }), 'Registro restaurado');
    const handlePurge = (id: number) => {
        if (!confirm('¿Eliminar definitivamente? Se borrarán sus datos y fotos. No se puede deshacer.')) return;
        run(id, () => apiRequest(`/api/internal/submissions/${id}?permanent=true`, { method: 'DELETE' }), 'Registro eliminado definitivamente');
    };

    const tabBtn = (t: Tab, label: string) => (
        <button
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${tab === t
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'}`}
        >
            {label}
        </button>
    );

    const actionBtn = 'p-2 sm:p-1.5 rounded-lg bg-foreground/5 text-muted-foreground transition-all flex-1 sm:flex-none flex justify-center disabled:opacity-50';

    return (
        <div className="glass-card rounded-3xl p-8 h-full flex flex-col relative">
            <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
                <h2 className="text-xl font-bold flex items-center">
                    <Clock className="mr-3 text-primary" size={22} />
                    Registros Formulario
                </h2>
                {canManage ? (
                    <div className="inline-flex rounded-xl p-0.5 border border-foreground/10 bg-foreground/5">
                        {tabBtn('pending', `${pending.length} Pendientes`)}
                        {tabBtn('deleted', tab === 'deleted' && !loadingDeleted ? `Eliminados (${deleted.length})` : 'Eliminados')}
                    </div>
                ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                        {pending.length} Pendientes
                    </span>
                )}
            </div>

            {tab === 'deleted' && (
                <p className="text-[11px] text-muted-foreground -mt-5 mb-4">
                    Registros eliminados con sus datos y fotos. «Restaurar» los devuelve a pendientes.
                </p>
            )}

            <div className="flex-1 overflow-auto -mx-2 px-2 scrollbar-hide">
                {tab === 'deleted' && loadingDeleted ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="animate-spin text-primary" size={28} />
                    </div>
                ) : submissions.length > 0 ? (
                    <div className="space-y-3">
                        {submissions.map((sub) => (
                            <div
                                key={sub.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-3 rounded-2xl border transition-all group gap-4 sm:gap-0 ${tab === 'deleted'
                                    ? 'bg-foreground/[0.03] border-dashed border-foreground/10'
                                    : 'bg-foreground/5 border-foreground/5 hover:border-primary/20'}`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <User size={18} />
                                    </div>
                                    <div className="truncate">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm truncate text-foreground">{sub.owner_name}</p>
                                            {tab === 'deleted' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/30 shrink-0">
                                                    <Archive size={10} className="shrink-0" /> Eliminado
                                                </span>
                                            ) : sub.origin === 'veterinaria' || sub.partner_name ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shrink-0">
                                                    <Store size={10} className="shrink-0" />
                                                    <span className="truncate max-w-[120px]">{sub.partner_name ? sub.partner_name : 'Veterinaria'}</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                                                    <Globe size={10} className="shrink-0" />
                                                    <span>Web Crematorio</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                                            <Calendar size={8} />
                                            {tab === 'deleted' && sub.deleted_at
                                                ? `Eliminado ${sub.deleted_at}${sub.deleted_by_name ? ` · ${sub.deleted_by_name}` : ''}`
                                                : sub.created_at}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-1 sm:px-3 sm:border-l border-foreground/5 min-w-0">
                                    <div className="w-7 h-7 flex-shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                        <Dog size={14} />
                                    </div>
                                    <div className="truncate">
                                        <p className="font-bold text-xs truncate text-foreground">{sub.pet_name}</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-[10px] text-muted-foreground uppercase">{sub.pet_type}</p>
                                            {(sub.city || sub.region) && (
                                                <>
                                                    <span className="text-muted-foreground/30 text-[8px]">•</span>
                                                    <p className="text-[9px] font-bold text-primary/80 uppercase truncate max-w-[120px]">
                                                        {sub.city || 'S/C'}, {sub.region || 'S/R'}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1.5 pt-3 sm:pt-0 sm:ml-2 border-t sm:border-0 border-foreground/5">
                                    <button onClick={() => handleView(sub.id)} title="Ver" aria-label="Ver registro"
                                        className={`${actionBtn} hover:bg-primary/20 hover:text-primary`}>
                                        <Eye size={18} className="sm:w-4 sm:h-4" />
                                    </button>
                                    {tab === 'pending' && canManage && (
                                        <button onClick={() => handleDelete(sub.id)} disabled={busyId === sub.id} title="Eliminar" aria-label="Eliminar registro"
                                            className={`${actionBtn} hover:bg-red-500/20 hover:text-red-400`}>
                                            {busyId === sub.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} className="sm:w-4 sm:h-4" />}
                                        </button>
                                    )}
                                    {tab === 'deleted' && (
                                        <>
                                            <button onClick={() => handleRestore(sub.id)} disabled={busyId === sub.id} title="Restaurar a pendiente"
                                                className={`${actionBtn} gap-1 px-2.5 hover:bg-emerald-500/20 hover:text-emerald-500 text-[10px] font-bold uppercase items-center`}>
                                                {busyId === sub.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                                <span>Restaurar</span>
                                            </button>
                                            {isOwner && (
                                                <button onClick={() => handlePurge(sub.id)} disabled={busyId === sub.id} title="Eliminar definitivamente" aria-label="Eliminar definitivamente"
                                                    className={`${actionBtn} hover:bg-red-500/20 hover:text-red-400`}>
                                                    <Trash2 size={18} className="sm:w-4 sm:h-4" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
                        {tab === 'deleted'
                            ? <Archive size={40} className="mb-3 text-muted-foreground" />
                            : <CheckCircle size={40} className="mb-3 text-emerald-500" />}
                        <p className="text-xs font-medium text-muted-foreground">
                            {tab === 'deleted' ? 'No hay registros eliminados' : 'Bandeja de entrada vacía'}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-foreground/5">
                <button
                    onClick={() => showToast('Módulo de gestión masiva próximamente', 'info')}
                    className="w-full py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-[10px] font-bold uppercase tracking-widest hover:bg-foreground/10 transition-all flex items-center justify-center gap-2 text-foreground"
                >
                    Ver historial completo
                    <ArrowRight size={12} />
                </button>
            </div>
        </div>
    );
}
