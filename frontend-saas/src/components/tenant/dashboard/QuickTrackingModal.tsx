"use client";

import React, { useState } from 'react';
import Modal from '@/components/tenant/Modal';
import { Search, Loader2, Compass, Copy, Share2, MessageCircle, ExternalLink, AlertCircle, CheckCircle2, Clock, User, Dog } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { copyToClipboard } from '@/lib/clipboard';
import { buildTrackingUrl } from '@/lib/publicUrls';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';

interface QuickTrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function QuickTrackingModal({ isOpen, onClose }: QuickTrackingModalProps) {
    const { showToast } = useToast();
    const { tenantData } = useTenant();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const term = searchTerm.trim();
        if (!term) return;

        setLoading(true);
        setSearched(true);
        try {
            // Buscamos órdenes por término (código, mascota o cliente)
            const data = await apiRequest(`/api/internal/operations/ops/daily-orders?status=all&scope=all`);
            const termLower = term.toLowerCase();
            const filtered = (Array.isArray(data) ? data : []).filter((o: any) => {
                const code = (o.verification_code || '').toLowerCase();
                const pet = (o.pet_name || '').toLowerCase();
                const customer = (o.customer_name || '').toLowerCase();
                const oc = (o.oc_number || '').toString();
                const id = (o.id || '').toString();
                return code.includes(termLower) || pet.includes(termLower) || customer.includes(termLower) || oc.includes(termLower) || id.includes(termLower);
            });
            setResults(filtered.slice(0, 6));
        } catch (err: any) {
            showToast(err.message || 'Error al buscar seguimiento', 'error');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyUrl = async (order: any) => {
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

    const handleWhatsApp = (order: any) => {
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
                    Ingresa el código de seguimiento (ej: <strong className="text-white font-mono">TAGOM13R</strong>), el nombre de la mascota o el tutor para consultar el estado en vivo o enviar el link a la familia.
                </p>

                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Buscar por código, mascota o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !searchTerm.trim()}
                        className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Compass size={16} />}
                        <span>Buscar</span>
                    </button>
                </form>

                {/* Resultados */}
                <div className="space-y-3 pt-2">
                    {loading ? (
                        <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                            <Loader2 className="animate-spin text-primary" size={24} />
                            <p className="text-xs text-muted-foreground">Buscando seguimiento...</p>
                        </div>
                    ) : searched && results.length === 0 ? (
                        <div className="py-10 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                            <AlertCircle size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                            <p className="text-sm font-bold text-white">No se encontró ninguna orden</p>
                            <p className="text-xs text-muted-foreground mt-1">Verifica el código o intenta con el nombre de la mascota.</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {results.map((order) => {
                                const isConcluded = ['completed', 'delivered', 'completado', 'entregado'].includes((order.status || '').toLowerCase());
                                return (
                                    <div
                                        key={order.id}
                                        className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black text-white truncate">{order.pet_name || 'Sin Nombre'}</h4>
                                                <span className="text-[10px] font-mono font-bold bg-white/5 text-muted-foreground px-2 py-0.5 rounded border border-white/5">
                                                    SVC-{order.id}
                                                </span>
                                                {order.verification_code && (
                                                    <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                                                        {order.verification_code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1 truncate">
                                                    <User size={11} className="text-primary/70 shrink-0" />
                                                    {order.customer_name || 'Sin cliente'}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isConcluded ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                    {isConcluded ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                                    {isConcluded ? 'Concluido' : (order.current_step_name || order.status || 'En Proceso')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Botones de acción rápida */}
                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyUrl(order)}
                                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition flex items-center gap-1.5"
                                                title="Copiar enlace público"
                                            >
                                                <Share2 size={13} className="text-primary" />
                                                <span>Link</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleWhatsApp(order)}
                                                className="px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-bold transition flex items-center gap-1.5"
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
                                                        const url = buildTrackingUrl(slug, order.pet_name || 'mascota', order.verification_code);
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition"
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
