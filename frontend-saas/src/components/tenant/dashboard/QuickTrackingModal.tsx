"use client";

import React, { useEffect, useRef, useState } from 'react';
import Modal from '@/components/tenant/Modal';
import { Search, Loader2, Share2, MessageCircle, ExternalLink, AlertCircle, CheckCircle2, Clock, User, X } from 'lucide-react';
import { searchOpsOrders, type OpsOrder } from '@/hooks/useOperations';
import { copyToClipboard } from '@/lib/clipboard';
import { buildTrackingUrl } from '@/lib/publicUrls';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { useOperationSteps } from '@/hooks/useSessionBootstrap';

interface QuickTrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function QuickTrackingModal({ isOpen, onClose }: QuickTrackingModalProps) {
    const { showToast } = useToast();
    const { tenantData } = useTenant();
    const steps = useOperationSteps() as { id: number; name: string }[];
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<OpsOrder[]>([]);
    // Id de la última búsqueda: descarta respuestas que llegan tarde
    const reqRef = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const term = searchTerm.trim();
    const isRecent = term.length < 2;

    // Autocompletado: busca mientras se escribe (300 ms de pausa, desde 2
    // caracteres). Con el campo vacío muestra las órdenes más recientes.
    useEffect(() => {
        if (!isOpen) return;
        const reqId = ++reqRef.current;
        const q = term.length >= 2 ? term : '';
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchOpsOrders(q, 6);
                if (reqId === reqRef.current) setResults(data.items);
            } catch (err: unknown) {
                if (reqId === reqRef.current) {
                    setResults([]);
                    showToast(err instanceof Error ? err.message : 'Error al buscar seguimiento', 'error');
                }
            } finally {
                if (reqId === reqRef.current) setLoading(false);
            }
        }, q ? 300 : 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, isOpen]);

    // Al cerrar se limpia para que la próxima vez parta desde las recientes
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setResults([]);
        }
    }, [isOpen]);

    const handleCopyUrl = async (order: OpsOrder) => {
        const code = order.verification_code;
        if (!code) {
            showToast('Esta orden no posee código de seguimiento', 'info');
            return;
        }
        const slug = tenantData?.slug || order.tenant_slug || 'crematorio';
        const url = buildTrackingUrl(slug, order.pet_name || 'mascota', code);
        if (await copyToClipboard(url)) {
            showToast('Enlace de tracking copiado al portapapeles', 'success');
        }
    };

    const handleWhatsApp = (order: OpsOrder) => {
        const code = order.verification_code;
        if (!code) {
            showToast('Esta orden no posee código de seguimiento', 'info');
            return;
        }
        const slug = tenantData?.slug || order.tenant_slug || 'crematorio';
        const url = buildTrackingUrl(slug, order.pet_name || 'mascota', code);
        const phone = (order.customer_phone || '').replace(/\D/g, '');
        const text = encodeURIComponent(`Hola ${order.customer_name || ''}, te compartimos el enlace oficial para seguir el proceso de ${order.pet_name || 'tu mascota'}: ${url}`);
        window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Consultar y Compartir Tracking"
            maxWidth="max-w-xl"
        >
            <div className="space-y-5">
                <p className="text-xs text-muted-foreground">
                    Escribe el código de seguimiento (ej: <strong className="text-slate-900 dark:text-white font-mono">TAGOM13R</strong>), el nombre de la mascota o del tutor. Los resultados aparecen mientras escribes.
                </p>

                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        ref={inputRef}
                        type="text"
                        autoFocus
                        role="combobox"
                        aria-expanded={results.length > 0}
                        aria-autocomplete="list"
                        aria-controls="tracking-results"
                        placeholder="Buscar por código, mascota o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl py-3 pl-10 pr-10 text-sm placeholder:text-slate-400 dark:placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                    />
                    {loading ? (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary" size={16} />
                    ) : searchTerm && (
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); inputRef.current?.focus(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            aria-label="Limpiar búsqueda"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Resultados */}
                <div className="space-y-2.5">
                    {results.length > 0 && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {isRecent ? 'Órdenes recientes' : `Coincidencias con «${term}»`}
                        </p>
                    )}
                    {loading && results.length === 0 ? (
                        <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                            <Loader2 className="animate-spin text-primary" size={24} />
                            <p className="text-xs text-muted-foreground">Buscando seguimiento...</p>
                        </div>
                    ) : !loading && !isRecent && results.length === 0 ? (
                        <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-300 dark:bg-white/[0.02] dark:border-white/10 rounded-2xl">
                            <AlertCircle size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-bold text-slate-900 dark:text-white">No se encontró ninguna orden</p>
                            <p className="text-xs text-muted-foreground mt-1">Verifica el código o intenta con el nombre de la mascota.</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div id="tracking-results" role="listbox" className={`space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar transition-opacity ${loading ? 'opacity-60' : ''}`}>
                            {results.map((order) => {
                                const isConcluded = ['completed', 'delivered', 'completado', 'entregado'].includes((order.status || '').toLowerCase());
                                return (
                                    <div
                                        key={order.id}
                                        className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm dark:shadow-none dark:bg-white/[0.03] dark:border-white/10 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{order.pet_name || 'Sin Nombre'}</h4>
                                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-muted-foreground dark:border-white/5 px-2 py-0.5 rounded border">
                                                    SVC-{order.id}
                                                </span>
                                                {order.verification_code && (
                                                    <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-primary/10 dark:text-primary dark:border-primary/20 px-2 py-0.5 rounded border">
                                                        {order.verification_code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1 truncate">
                                                    <User size={11} className="text-primary/70 shrink-0" />
                                                    {order.customer_name || 'Sin cliente'}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isConcluded ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                                    {isConcluded ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                                    {isConcluded ? 'Concluido' : (steps.find(st => st.id === order.current_step_id)?.name || order.status || 'En Proceso')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Botones de acción rápida */}
                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyUrl(order)}
                                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-white text-xs font-bold transition flex items-center gap-1.5"
                                                title="Copiar enlace público"
                                            >
                                                <Share2 size={13} className="text-primary" />
                                                <span>Link</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleWhatsApp(order)}
                                                className="px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C4B] dark:text-[#25D366] text-xs font-bold transition flex items-center gap-1.5"
                                                title="Enviar por WhatsApp"
                                            >
                                                <MessageCircle size={13} />
                                                <span>WhatsApp</span>
                                            </button>

                                            {order.verification_code && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const slug = tenantData?.slug || order.tenant_slug || 'crematorio';
                                                        const url = buildTrackingUrl(slug, order.pet_name || 'mascota', order.verification_code as string);
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-muted-foreground dark:hover:text-white transition"
                                                    title="Abrir página de tracking en nueva pestaña"
                                                >
                                                    <ExternalLink size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}
