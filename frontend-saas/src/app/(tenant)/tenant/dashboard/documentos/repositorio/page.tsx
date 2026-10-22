"use client";

import React, { useState, useMemo } from 'react';
import {
    FileText,
    Search,
    Download,
    Trash2,
    Loader2,
    Filter,
    FileCheck,
    FileBadge,
    AlertCircle,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/tenant/Modal';
import { useDocuments, useDeleteDocument, fetchDocumentContent, DocumentItem } from '@/hooks/useDocuments';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { downloadHtmlAsPdf, pdfFileName } from '@/lib/certPdf';

type FilterKey = 'certificados' | 'recibos' | 'autorizaciones' | 'otros';
type Tone = 'blue' | 'emerald' | 'purple' | 'orange';

// Colores por tipo de documento, legibles en modo claro y oscuro.
const TONES: Record<Tone, { icon: string; iconActive: string; active: string; count: string; dot: string; badge: string }> = {
    blue: {
        icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
        iconActive: 'bg-blue-600 text-white',
        active: 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 dark:bg-blue-500/10 dark:border-blue-500/40 dark:ring-blue-500/20',
        count: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500',
        badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25',
    },
    emerald: {
        icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        iconActive: 'bg-emerald-600 text-white',
        active: 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:ring-emerald-500/20',
        count: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25',
    },
    purple: {
        icon: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
        iconActive: 'bg-purple-600 text-white',
        active: 'bg-purple-50 border-purple-300 ring-2 ring-purple-200 dark:bg-purple-500/10 dark:border-purple-500/40 dark:ring-purple-500/20',
        count: 'text-purple-700 dark:text-purple-300',
        dot: 'bg-purple-500',
        badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/25',
    },
    orange: {
        icon: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
        iconActive: 'bg-orange-600 text-white',
        active: 'bg-orange-50 border-orange-300 ring-2 ring-orange-200 dark:bg-orange-500/10 dark:border-orange-500/40 dark:ring-orange-500/20',
        count: 'text-orange-700 dark:text-orange-300',
        dot: 'bg-orange-500',
        badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/25',
    },
};

const FILTERS: { key: FilterKey; label: string; icon: typeof FileText; tone: Tone }[] = [
    { key: 'certificados', label: 'Certificados', icon: FileText, tone: 'blue' },
    { key: 'recibos', label: 'Recibos', icon: FileBadge, tone: 'emerald' },
    { key: 'autorizaciones', label: 'Autorizaciones', icon: FileCheck, tone: 'purple' },
    { key: 'otros', label: 'Otros', icon: Filter, tone: 'orange' },
];

export default function DocumentsPage() {
    // Queries & Mutations
    const { data, isLoading } = useDocuments();
    const deleteMutation = useDeleteDocument();
    const { showToast } = useToast();
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const documents = data?.documents || [];
    const stats = data?.stats || { certificados: 0, recibos: 0, autorizaciones: 0, otros: 0 };

    // States
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: number; isGenerated: boolean } | null>(null);

    // Filter logic
    const filteredDocuments = useMemo(() => {
        let filtered = documents;

        // 1. Filter by category
        if (activeFilter) {
            filtered = filtered.filter(doc => {
                const t = doc.type.toLowerCase();
                if (activeFilter === 'certificados') return t.includes('certificad') || doc.is_generated;
                if (activeFilter === 'recibos') return t.includes('recibo');
                if (activeFilter === 'autorizaciones') return t.includes('autoriza');
                if (activeFilter === 'otros') return !t.includes('certificad') && !doc.is_generated && !t.includes('recibo') && !t.includes('autoriza');
                return true;
            });
        }

        // 2. Filter by search term
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(doc => 
                doc.pet_name?.toLowerCase().includes(lowerSearch) ||
                doc.number?.toLowerCase().includes(lowerSearch) ||
                doc.cremation_id?.toString().includes(lowerSearch)
            );
        }

        return filtered;
    }, [documents, activeFilter, searchTerm]);

    // Handlers
    const toggleFilter = (filter: FilterKey) => {
        setActiveFilter(prev => prev === filter ? null : filter);
    };

    const handleDeleteClick = (id: number, isGenerated: boolean) => {
        setDocToDelete({ id, isGenerated });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!docToDelete) return;
        try {
            await deleteMutation.mutateAsync({ id: docToDelete.id, isGenerated: docToDelete.isGenerated });
            setIsDeleteModalOpen(false);
            setDocToDelete(null);
        } catch (err) {
            // Error is handled in the mutation with toast
        }
    };

    // Descarga el documento como PDF (sin diálogo de impresión) a partir del HTML
    // almacenado.
    const handleDownloadPdf = async (doc: DocumentItem) => {
        if (downloadingId) return;
        setDownloadingId(doc.id);
        try {
            let html = doc.html_content;
            if (!html && doc.is_generated) {
                html = await fetchDocumentContent(doc.id);
            }
            if (!html) {
                showToast('El contenido del documento no está disponible.', 'error');
                return;
            }
            await downloadHtmlAsPdf(html, pdfFileName(doc.number || doc.pet_name || 'documento'));
        } catch (error) {
            console.error('Error al generar PDF:', error);
            showToast('Error al generar el PDF: ' + ((error as Error)?.message || ''), 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    // UI Helpers: clases completas (no armadas con `${color}`) para que Tailwind las genere.
    const getBadgeStyle = (type: string, isGenerated: boolean) => {
        const t = type.toLowerCase();
        if (t.includes('certificad') || isGenerated) return TONES.blue.badge;
        if (t.includes('recibo')) return TONES.emerald.badge;
        if (t.includes('autoriza')) return TONES.purple.badge;
        return TONES.orange.badge;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Repositorio de Documentos</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Certificados, recibos y autorizaciones emitidos por tu crematorio.</p>
                </div>
            </div>

            {/* Interactive Filters (Stats) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-5">
                {FILTERS.map((item) => {
                    const isActive = activeFilter === item.key;
                    const Icon = item.icon;
                    const tone = TONES[item.tone];
                    return (
                        <button
                            key={item.key}
                            onClick={() => toggleFilter(item.key)}
                            aria-pressed={isActive}
                            className={`relative p-4 rounded-3xl flex items-center justify-between text-left border transition-all duration-200 ${isActive
                                ? tone.active
                                : 'bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md dark:bg-slate-900/40 dark:border-white/10 dark:hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-3 rounded-2xl shrink-0 transition-colors ${isActive ? tone.iconActive : tone.icon}`}>
                                    <Icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.label}</p>
                                    <p className={`text-xs font-semibold ${isActive ? tone.count : 'text-slate-500 dark:text-slate-400'}`}>
                                        {stats[item.key]} {stats[item.key] === 1 ? 'archivo' : 'archivos'}
                                    </p>
                                </div>
                            </div>
                            {isActive && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tone.dot}`} />}
                        </button>
                    );
                })}
            </div>

            {/* List Control & Repository */}
            <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-5 lg:p-8 dark:bg-slate-950/40 dark:border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documentos Generados</h2>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{filteredDocuments.length} de {documents.length}</span>
                        {activeFilter && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                                {FILTERS.find(f => f.key === activeFilter)?.label}
                                <button onClick={() => setActiveFilter(null)} aria-label="Quitar filtro" className="hover:opacity-70"><X size={12} /></button>
                            </span>
                        )}
                    </div>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar mascota, ID o folio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all font-medium dark:bg-black/30 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-4 uppercase tracking-widest font-bold">Cargando documentos...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredDocuments.length > 0 ? (
                            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredDocuments.map((doc) => {
                                    const badge = getBadgeStyle(doc.type, doc.is_generated);
                                    return (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.97 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.97 }}
                                            key={doc.id}
                                            className="group p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between h-full dark:bg-slate-900/50 dark:border-white/10 dark:shadow-none"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-wider border ${badge}`}>
                                                        {doc.type}
                                                    </span>
                                                    <div className="flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleDownloadPdf(doc)}
                                                            disabled={downloadingId === doc.id}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 dark:bg-white/5 dark:text-slate-300"
                                                            title="Descargar PDF"
                                                            aria-label="Descargar PDF"
                                                        >
                                                            {downloadingId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(doc.id, doc.is_generated)}
                                                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors dark:bg-white/5 dark:text-slate-300 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                                                            title="Eliminar del repositorio"
                                                            aria-label="Eliminar del repositorio"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <h4 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight mb-1 truncate">{doc.pet_name}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 flex-wrap">
                                                    {doc.service_type}
                                                    {doc.number && <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />}
                                                    <span className="font-mono">{doc.number}</span>
                                                </p>
                                            </div>

                                            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg dark:bg-white/5">
                                                    <FileBadge size={12} className="text-primary" />
                                                    Orden #{doc.cremation_id}
                                                </span>
                                                <span>{new Date(doc.issue_date || doc.created_at).toLocaleDateString('es-CL')}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-16 flex flex-col items-center justify-center text-center px-4"
                            >
                                <div className="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-5 shadow-sm dark:bg-white/5 dark:border-white/10">
                                    <Search size={30} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No se encontraron documentos</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
                                    {activeFilter || searchTerm
                                        ? 'Intenta ajustar los filtros o el término de búsqueda.'
                                        : 'El repositorio está vacío. Los documentos aparecerán aquí cuando se emitan.'}
                                </p>
                                {(activeFilter || searchTerm) && (
                                    <button
                                        onClick={() => { setActiveFilter(null); setSearchTerm(''); }}
                                        className="mt-5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors text-xs font-bold uppercase tracking-wider dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => !deleteMutation.isPending && setIsDeleteModalOpen(false)}
                title="Eliminar Documento"
                maxWidth="max-w-md"
            >
                <div className="p-2 sm:p-4 text-center">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <Trash2 size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">¿Eliminar permanentemente?</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                        Esta acción borrará el documento del servidor. Perderás el acceso al archivo y no podrás recuperarlo.
                    </p>
                    <div className="flex gap-3">
                        <button
                            disabled={deleteMutation.isPending}
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-3.5 px-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-bold text-xs uppercase tracking-widest disabled:opacity-50 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={deleteMutation.isPending}
                            onClick={confirmDelete}
                            className="flex-1 py-3.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center justify-center disabled:opacity-50"
                        >
                            {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Sí, Eliminar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
