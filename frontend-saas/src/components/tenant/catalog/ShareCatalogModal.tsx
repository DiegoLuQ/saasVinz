"use client";

import React, { useState, useEffect } from 'react';
import {
    Share2,
    Copy,
    Check,
    Calendar,
    Clock,
    Trash2,
    ExternalLink,
    Loader2,
    ShieldAlert,
    Sparkles,
    MessageCircle,
    Plus,
    X,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { buildCatalogUrl } from '@/lib/publicUrls';
import { copyToClipboard } from '@/lib/clipboard';

interface CatalogLink {
    id: number;
    tenant_id: number;
    token: string;
    name?: string | null;
    expires_at?: string | null;
    is_active: boolean;
    views_count: number;
    last_viewed_at?: string | null;
    created_at: string;
    is_expired: boolean;
}

interface ShareCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantSlug: string;
    tenantName: string;
}

const EXPIRATION_OPTIONS = [
    { label: '24 Horas', value: 24, badge: 'Recomendado' },
    { label: '48 Horas', value: 48, badge: null },
    { label: '7 Días', value: 168, badge: null },
    { label: '30 Días', value: 720, badge: null },
    { label: 'Permanente', value: null, badge: 'Sin vencimiento' },
];

export default function ShareCatalogModal({
    isOpen,
    onClose,
    tenantSlug,
    tenantName,
}: ShareCatalogModalProps) {
    const { showToast } = useToast();
    const [selectedHours, setSelectedHours] = useState<number | null>(24);
    const [linkLabel, setLinkLabel] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [links, setLinks] = useState<CatalogLink[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [recentCreatedUrl, setRecentCreatedUrl] = useState<string | null>(null);

    const fetchLinks = async () => {
        try {
            setLoadingLinks(true);
            const res = await apiRequest('/api/internal/catalog/links');
            if (Array.isArray(res)) {
                setLinks(res);
            }
        } catch (err: any) {
            console.error('Error fetching catalog links:', err);
        } finally {
            setLoadingLinks(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLinks();
            setRecentCreatedUrl(null);
            setLinkLabel('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            const res = await apiRequest('/api/internal/catalog/links', {
                method: 'POST',
                body: JSON.stringify({
                    name: linkLabel.trim() || undefined,
                    expires_in_hours: selectedHours,
                }),
            });

            const fullUrl = buildCatalogUrl(tenantSlug, res.token);
            setRecentCreatedUrl(fullUrl);
            showToast('Enlace de catálogo generado exitosamente', 'success');
            setLinkLabel('');
            fetchLinks();
        } catch (err: any) {
            console.error('Error creating catalog link:', err);
            showToast(err.message || 'Error al generar el enlace', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async (url: string, token: string) => {
        const success = await copyToClipboard(url);
        if (success) {
            setCopiedToken(token);
            showToast('Enlace copiado al portapapeles', 'success');
            setTimeout(() => setCopiedToken(null), 2500);
        } else {
            showToast('No se pudo copiar el enlace automáticamente', 'error');
        }
    };

    const handleDeleteLink = async (linkId: number) => {
        if (!confirm('¿Estás seguro de que deseas revocar este enlace?')) return;
        try {
            await apiRequest(`/api/internal/catalog/links/${linkId}`, {
                method: 'DELETE',
            });
            showToast('Enlace revocado', 'info');
            setLinks(prev => prev.filter(l => l.id !== linkId));
            if (recentCreatedUrl?.includes(links.find(l => l.id === linkId)?.token || '')) {
                setRecentCreatedUrl(null);
            }
        } catch (err: any) {
            showToast('Error al revocar enlace', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#12151d] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">
                                Compartir Catálogo Online
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Genera enlaces privados con fecha de vencimiento y botón de WhatsApp
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Generador de enlace nuevo */}
                    <form onSubmit={handleCreateLink} className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Vigencia del Enlace
                            </label>
                            <span className="text-[11px] text-amber-400 font-medium">
                                Los enlaces expirados no permitirán ver productos
                            </span>
                        </div>

                        {/* Opciones de expiración */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {EXPIRATION_OPTIONS.map((opt) => {
                                const isSelected = selectedHours === opt.value;
                                return (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => setSelectedHours(opt.value)}
                                        className={`py-3 px-3 rounded-xl text-left border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                                                : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold">{opt.label}</span>
                                            {opt.badge && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black uppercase">
                                                    {opt.badge}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Etiqueta opcional del cliente */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-bold text-muted-foreground ml-1">
                                Etiqueta de referencia (opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Familia Rodríguez / Atención WhatsApp"
                                value={linkLabel}
                                onChange={(e) => setLinkLabel(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-muted-foreground/40 outline-none focus:border-amber-500/40 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Generando enlace seguro...</span>
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    <span>Generar Enlace de Catálogo</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Enlace recién generado */}
                    {recentCreatedUrl && (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <Sparkles size={16} />
                                <span className="text-xs font-black uppercase tracking-wider">
                                    ¡Enlace Generado y Listo para Compartir!
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-emerald-500/20">
                                <input
                                    readOnly
                                    value={recentCreatedUrl}
                                    className="bg-transparent text-xs text-emerald-200 font-mono flex-1 outline-none truncate select-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopy(recentCreatedUrl, 'recent')}
                                    className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors shrink-0 cursor-pointer"
                                    title="Copiar enlace"
                                >
                                    {copiedToken === 'recent' ? <Check size={15} /> : <Copy size={15} />}
                                </button>
                                <a
                                    href={recentCreatedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors shrink-0 cursor-pointer"
                                    title="Abrir en pestaña nueva"
                                >
                                    <ExternalLink size={15} />
                                </a>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`Hola, te comparto el catálogo conmemorativo de ${tenantName}: ${recentCreatedUrl}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                                >
                                    <MessageCircle size={15} />
                                    <span>Compartir por WhatsApp</span>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Historial de enlaces activos */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Enlaces Generados ({links.length})
                            </h4>
                            <button
                                type="button"
                                onClick={fetchLinks}
                                className="text-[11px] text-amber-400 hover:underline font-medium cursor-pointer"
                            >
                                Actualizar lista
                            </button>
                        </div>

                        {loadingLinks ? (
                            <div className="py-8 flex justify-center text-muted-foreground">
                                <Loader2 size={24} className="animate-spin text-amber-500" />
                            </div>
                        ) : links.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground bg-white/[0.01] rounded-2xl border border-white/5">
                                Aún no has generado enlaces de catálogo.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {links.map((link) => {
                                    const fullUrl = buildCatalogUrl(tenantSlug, link.token);
                                    const isCopied = copiedToken === link.token;

                                    return (
                                        <div
                                            key={link.id}
                                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                                                link.is_expired
                                                    ? 'bg-rose-500/[0.03] border-rose-500/20 opacity-70'
                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-white truncate">
                                                        {link.name || 'Catálogo General'}
                                                    </span>
                                                    {link.is_expired ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                            Expirado
                                                        </span>
                                                    ) : link.expires_at ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            Vigente
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                            Permanente
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                                                    <span>
                                                        {link.expires_at ? (
                                                            <>Vence: {new Date(link.expires_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</>
                                                        ) : (
                                                            'Sin vencimiento'
                                                        )}
                                                    </span>
                                                    <span>·</span>
                                                    <span>{link.views_count} vista{link.views_count !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(fullUrl, link.token)}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                                                    title="Copiar enlace"
                                                >
                                                    {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                </button>
                                                <a
                                                    href={fullUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                                                    title="Ver catálogo"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLink(link.id)}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                                                    title="Eliminar enlace"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end bg-white/[0.01]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2.5 px-5 rounded-xl border border-white/10 text-xs font-bold text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
