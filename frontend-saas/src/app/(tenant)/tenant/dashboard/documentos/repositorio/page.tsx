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
import { extractCertSpec, renderCertSpecToCanvas } from '@/lib/certImageDraw';

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
    const [activeFilter, setActiveFilter] = useState<'certificados' | 'recibos' | 'autorizaciones' | 'otros' | null>(null);
    
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
    const toggleFilter = (filter: 'certificados' | 'recibos' | 'autorizaciones' | 'otros') => {
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

    const blobToDataURL = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = reject;
            fr.readAsDataURL(blob);
        });

    // Reemplaza los src de <img> por dataURL (descargando vía fetch->blob) para
    // que html2canvas pueda capturarlas aunque vengan de R2 (cross-origin).
    const inlineImages = async (html: string): Promise<string> => {
        const urls = new Set<string>();
        const re = /<img\b[^>]*?\bsrc="([^"]+)"/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null) {
            const u = m[1];
            if (u && !u.startsWith('data:')) urls.add(u);
        }
        const entries = await Promise.all([...urls].map(async (u) => {
            try {
                const resp = await fetch(u, { mode: 'cors', cache: 'no-cache' });
                if (!resp.ok) return null;
                const blob = await resp.blob();
                return [u, await blobToDataURL(blob)] as const;
            } catch {
                return null;
            }
        }));
        for (const e of entries) {
            if (!e) continue;
            html = html.split(`src="${e[0]}"`).join(`src="${e[1]}"`);
        }
        return html;
    };

    // Descarga el documento como PDF (sin diálogo de impresión). Renderiza el HTML
    // guardado en un iframe oculto y lo captura con html2canvas -> jsPDF. Misma
    // idea que "Descargar PDF" de la emisión, pero a partir del HTML almacenado.
    const handleDownloadPdf = async (doc: DocumentItem) => {
        if (downloadingId) return;
        setDownloadingId(doc.id);
        let iframe: HTMLIFrameElement | null = null;
        try {
            let html = doc.html_content;
            if (!html && doc.is_generated) {
                html = await fetchDocumentContent(doc.id);
            }
            if (!html) {
                showToast('El contenido del documento no está disponible.', 'error');
                return;
            }

            // Camino preferido: si el HTML trae el spec estructurado (certificadoImg),
            // redibujamos en canvas con TODOS los efectos (borde/halo/feather), que
            // html2canvas no soporta.
            const spec = extractCertSpec(html);
            if (spec) {
                const canvas = await renderCertSpecToCanvas(spec, 816, 3);
                const { default: JsPDF } = await import('jspdf');
                const w = canvas.width, h = canvas.height;
                const pdf = new JsPDF({ unit: 'px', format: [w, h], orientation: w >= h ? 'landscape' : 'portrait' });
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
                pdf.save(`${(doc.number || doc.pet_name || 'documento').replace(/[^\w-]/g, '_')}.pdf`);
                return;
            }

            // Fallback (certificados HTML por secciones / recibos): capturar el HTML.
            // Hacer relativas las URLs de /storage y /static para same-origin (proxy).
            html = html.replace(/https?:\/\/[^/"')\s]+(\/(?:storage|static)\/)/g, '$1');

            // Incrustar las imágenes (<img src>) como dataURL. Las imágenes del
            // fondo/fotos viven en R2 (cross-origin); si no se incrustan, el canvas
            // queda "tainted" y salen en blanco. Mismo enfoque fetch->blob que la
            // emisión.
            html = await inlineImages(html);

            iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.left = '-10000px';
            iframe.style.top = '0';
            iframe.style.width = '816px'; // ancho base ~A4 a 96dpi
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const idoc = iframe.contentWindow!.document;
            idoc.open();
            idoc.write(html);
            idoc.close();

            // Esperar carga del documento
            await new Promise<void>((resolve) => {
                if (idoc.readyState === 'complete') resolve();
                else iframe!.contentWindow!.addEventListener('load', () => resolve());
            });
            // Esperar fuentes
            try { await (idoc as any).fonts?.ready; } catch { /* noop */ }
            // Esperar imágenes
            const imgs = Array.from(idoc.images);
            await Promise.all(imgs.map((im) => im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); })));

            const target = (idoc.querySelector('.cert-canvas') as HTMLElement) || idoc.body;
            iframe.style.height = `${Math.max(target.scrollHeight, 200)}px`;

            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(target, {
                useCORS: true,
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
            });

            const { default: JsPDF } = await import('jspdf');
            const w = canvas.width, h = canvas.height;
            const pdf = new JsPDF({ unit: 'px', format: [w, h], orientation: w >= h ? 'landscape' : 'portrait' });
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            const fileName = `${(doc.number || doc.pet_name || 'documento').replace(/[^\w-]/g, '_')}.pdf`;
            pdf.save(fileName);
        } catch (error: any) {
            console.error('Error al generar PDF:', error);
            showToast('Error al generar el PDF: ' + (error?.message || ''), 'error');
        } finally {
            if (iframe) document.body.removeChild(iframe);
            setDownloadingId(null);
        }
    };

    // UI Helpers
    const getBadgeStyle = (type: string, isGenerated: boolean) => {
        const t = type.toLowerCase();
        if (t.includes('certificad') || isGenerated) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
        if (t.includes('recibo')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
        if (t.includes('autoriza')) return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
        return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Repositorio de Documentos</h1>
                    <p className="text-muted-foreground mt-1">Gestor documental enterprise para certificados, recibos y autorizaciones.</p>
                </div>
                {/* Opcional: Podríamos poner aquí un botón "Nuevo Documento" o "Exportar" en el futuro */}
            </div>

            {/* Interactive Filters (Stats) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { key: 'certificados', label: 'Certificados', count: stats.certificados, icon: FileText, color: 'blue' },
                    { key: 'recibos', label: 'Recibos', count: stats.recibos, icon: FileBadge, color: 'emerald' },
                    { key: 'autorizaciones', label: 'Autorizaciones', count: stats.autorizaciones, icon: FileCheck, color: 'purple' },
                    { key: 'otros', label: 'Otros', count: stats.otros, icon: Filter, color: 'orange' },
                ].map((item) => {
                    const isActive = activeFilter === item.key;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.key}
                            onClick={() => toggleFilter(item.key as any)}
                            className={`
                                relative p-4 rounded-3xl flex items-center justify-between text-left transition-all duration-300
                                ${isActive 
                                    ? `bg-${item.color}-500/10 border border-${item.color}-500/30 ring-1 ring-${item.color}-500/20 shadow-lg shadow-${item.color}-500/10` 
                                    : 'bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                }
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-all ${isActive ? `bg-${item.color}-500 text-white` : `bg-${item.color}-500/10 text-${item.color}-400`}`}>
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-foreground'}`}>{item.label}</p>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? `text-${item.color}-400/80` : 'text-muted-foreground'}`}>
                                        {item.count} archivos
                                    </p>
                                </div>
                            </div>
                            {/* Active dot indicator */}
                            {isActive && (
                                <div className={`w-2 h-2 rounded-full bg-${item.color}-400 shadow-[0_0_8px_rgba(var(--${item.color}-500),0.8)]`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* List Control & Repository */}
            <div className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-6 lg:p-8 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold">Documentos Generados</h2>
                        {activeFilter && (
                            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-primary/20 text-primary flex items-center gap-1.5">
                                Filtrando: {activeFilter}
                                <button onClick={() => setActiveFilter(null)} className="hover:text-white transition-colors"><X size={12}/></button>
                            </span>
                        )}
                    </div>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar mascota, ID o folio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-primary/50 transition-all font-medium text-white"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center relative z-10">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-muted-foreground text-xs mt-4 uppercase tracking-widest font-bold">Accediendo al repositorio...</p>
                    </div>
                ) : (
                    <div className="relative z-10">
                        <AnimatePresence mode="popLayout">
                            {filteredDocuments.length > 0 ? (
                                <motion.div 
                                    layout
                                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                                >
                                    {filteredDocuments.map((doc) => {
                                        const badge = getBadgeStyle(doc.type, doc.is_generated);
                                        return (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                key={doc.id}
                                                className="group relative p-6 bg-white/[0.02] rounded-[2rem] border border-white/10 hover:border-primary/40 hover:bg-white/[0.04] transition-all flex flex-col justify-between h-full overflow-hidden"
                                            >
                                                {/* Top edge highlight */}
                                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                <div>
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className={`px-2.5 py-1 rounded-md text-[9px] uppercase font-black tracking-widest border ${badge.bg} ${badge.text} ${badge.border}`}>
                                                            {doc.type}
                                                        </div>
                                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                                            <button
                                                                onClick={() => handleDownloadPdf(doc)}
                                                                disabled={downloadingId === doc.id}
                                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all shadow-sm disabled:opacity-50"
                                                                title="Descargar PDF"
                                                            >
                                                                {downloadingId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(doc.id, doc.is_generated)}
                                                                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all shadow-sm"
                                                                title="Eliminar del repositorio"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg tracking-tight mb-1">{doc.pet_name}</h4>
                                                        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1.5">
                                                            {doc.service_type} 
                                                            <span className="w-1 h-1 rounded-full bg-white/20" /> 
                                                            {doc.number}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-black/30 rounded-md">
                                                        <FileBadge size={12} className="text-primary/70" />
                                                        Orden #{doc.cremation_id}
                                                    </span>
                                                    <span>{new Date(doc.issue_date || doc.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-full py-20 flex flex-col items-center justify-center text-center px-4"
                                >
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                                        <Search size={32} className="text-muted-foreground/40" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">No se encontraron documentos</h3>
                                    <p className="text-muted-foreground text-sm max-w-md">
                                        {activeFilter || searchTerm 
                                            ? 'Intenta ajustar los filtros o el término de búsqueda para encontrar lo que necesitas.'
                                            : 'El repositorio está vacío. Los documentos aparecerán aquí una vez que se completen los servicios.'}
                                    </p>
                                    {(activeFilter || searchTerm) && (
                                        <button 
                                            onClick={() => { setActiveFilter(null); setSearchTerm(''); }}
                                            className="mt-6 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-widest"
                                        >
                                            Limpiar Filtros
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">¿Eliminar permanentemente?</h3>
                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                        Esta acción borrará el documento del servidor. Perderás el acceso al archivo y no podrás recuperarlo.
                    </p>
                    <div className="flex gap-3">
                        <button
                            disabled={deleteMutation.isPending}
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-bold text-xs uppercase tracking-widest disabled:opacity-50"
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
