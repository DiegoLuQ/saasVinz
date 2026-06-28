"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock,
    User,
    Dog,
    Eye,
    Trash2,
    CheckCircle,
    XCircle,
    Loader2,
    Calendar,
    ChevronRight,
    ArrowRight,
    X,
    Phone,
    Mail,
    MapPin,
    Package,
    Flame,
    Star,
    Shield
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';

import SubmissionDetailModal from './modals/SubmissionDetailModal';

interface SubmissionListItem {
    id: number;
    owner_name: string;
    pet_name: string;
    pet_type: string;
    region?: string;
    city?: string;
    status: string;
    created_at: string;
}

import { useInitialSubmissions } from '@/hooks/useSessionBootstrap';
import { useQueryClient } from '@tanstack/react-query';

export default function SubmissionsTable() {
    const router = useRouter();
    const bootstrapSubmissions = useInitialSubmissions();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { showToast } = useToast();
    const { canDelete } = usePermissions();

    const submissions = bootstrapSubmissions as SubmissionListItem[];

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            // This is now optional as we use query invalidation, but good to keep for manual refresh logic if needed
            await queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        } catch (err) {
            console.error('Error fetching submissions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (id: number) => {
        router.push(`/dashboard/registros/${id}`);
    };

    const handleDeleteFromList = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        try {
            await apiRequest(`/api/internal/submissions/${id}`, { method: 'DELETE' });
            showToast('Registro eliminado', 'success');
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="glass-card rounded-3xl p-8 h-full flex flex-col relative">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center">
                    <Clock className="mr-3 text-primary" size={22} />
                    Registros Formulario
                </h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                        {submissions.length} Pendientes
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-auto -mx-2 px-2 scrollbar-hide">
                {submissions.length > 0 ? (
                    <div className="space-y-3">
                        {submissions.map((sub) => (
                            <div
                                key={sub.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-3 rounded-2xl bg-foreground/5 border border-foreground/5 hover:border-primary/20 transition-all group gap-4 sm:gap-0"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <User size={18} />
                                    </div>
                                    <div className="truncate">
                                        <p className="font-bold text-sm truncate text-foreground">{sub.owner_name}</p>
                                        <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                                            <Calendar size={8} />
                                            {sub.created_at}
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
                                    <button
                                        onClick={() => handleView(sub.id)}
                                        className="p-2 sm:p-1.5 rounded-lg bg-foreground/5 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all flex-1 sm:flex-none flex justify-center"
                                    >
                                        <Eye size={18} className="sm:w-4 sm:h-4" />
                                    </button>
                                    {canDelete('ordenes') && (
                                        <button
                                            onClick={() => handleDeleteFromList(sub.id)}
                                            className="p-2 sm:p-1.5 rounded-lg bg-foreground/5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-all flex-1 sm:flex-none flex justify-center"
                                        >
                                            <Trash2 size={18} className="sm:w-4 sm:h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
                        <CheckCircle size={40} className="mb-3 text-emerald-500" />
                        <p className="text-xs font-medium text-muted-foreground">Bandeja de entrada vacía</p>
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

            <SubmissionDetailModal
                isOpen={isModalOpen}
                submissionId={selectedSubmissionId}
                onClose={() => setIsModalOpen(false)}
                onProcessed={() => {
                    queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
                    setIsModalOpen(false);
                }}
                onDeleted={(id) => {
                    queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
                    setIsModalOpen(false);
                }}
            />
        </div>
    );
}

