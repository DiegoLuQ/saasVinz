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
    RefreshCw,
    X,
    CheckCircle2,
    Folder,
    BadgePercent,
    Pencil,
    Play,
    Eye,
    Video,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { buildCatalogUrl } from '@/lib/publicUrls';
import { copyToClipboard } from '@/lib/clipboard';
import FormVideoPlayer from '@/components/public/FormVideoPlayer';

interface CatalogLink {
    id: number;
    tenant_id: number;
    token: string;
    name?: string | null;
    message?: string | null;
    /** Catálogo de planes: grupos que muestra (null = todos; '' = «Sin grupo») */
    plan_groups?: string[] | null;
    /** Catálogo de planes: tabla de precios (null = General) */
    price_list_id?: number | null;
    price_list_name?: string | null;
    price_list_status?: 'activa' | 'programada' | 'vencida' | 'pausada' | null;
    show_video?: boolean;
    expires_at?: string | null;
    is_active: boolean;
    views_count: number;
    last_viewed_at?: string | null;
    // Embudo del catálogo de planes (desde que se mide)
    visitors?: number;
    plan_requests?: number;
    whatsapp_clicks?: number;
    forms_submitted?: number;
    orders?: number;
    delivered?: number;
    created_at: string;
    is_expired: boolean;
}

export type CatalogType = 'products' | 'plans';

const COPY: Record<CatalogType, { title: string; expiredHint: string; empty: string; defaultName: string; whatsapp: string }> = {
    products: {
        title: 'Compartir Catálogo Online',
        expiredHint: 'Los enlaces expirados no permitirán ver productos',
        empty: 'Aún no has generado enlaces de catálogo.',
        defaultName: 'Catálogo General',
        whatsapp: 'el catálogo conmemorativo',
    },
    plans: {
        title: 'Compartir Catálogo de Planes',
        expiredHint: 'Los enlaces expirados no permitirán ver los planes',
        empty: 'Aún no has generado enlaces del catálogo de planes.',
        defaultName: 'Catálogo de Planes',
        whatsapp: 'nuestros planes de cremación',
    },
};

interface ShareCatalogModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantSlug: string;
    tenantName: string;
    zIndex?: string;
    /** Qué catálogo comparte el enlace: productos (Inventario) o planes (Gestión de Servicios). */
    catalogType?: CatalogType;
    /** Catálogo de planes: grupos de planes existentes, para elegir cuáles muestra cada enlace. */
    planGroups?: string[];
}

const groupLabel = (g: string) => g || 'Sin grupo';

/** Chips para elegir uno o varios grupos de planes (obligatorio elegir al menos uno). */
function GroupPicker({ groups, value, onChange }: { groups: string[]; value: string[]; onChange: (v: string[]) => void }) {
    const options = [...groups, ''];
    const toggle = (g: string) => {
        const has = value.some(v => v.toLowerCase() === g.toLowerCase());
        onChange(has ? value.filter(v => v.toLowerCase() !== g.toLowerCase()) : [...value, g]);
    };
    const chip = (active: boolean) => `px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
        active
            ? 'bg-amber-500 border-amber-500 text-white'
            : 'bg-white border-slate-300 text-slate-600 hover:border-amber-400 dark:bg-slate-950/60 dark:border-white/15 dark:text-slate-300'
    }`;
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map(g => (
                <button key={g || '__none__'} type="button" onClick={() => toggle(g)}
                    className={chip(value.some(v => v.toLowerCase() === g.toLowerCase()))}>
                    {groupLabel(g)}
                </button>
            ))}
        </div>
    );
}

type ExpirationOption = { label: string; value: number | null; badge: string | null };

const EXPIRATION_OPTIONS: Record<CatalogType, ExpirationOption[]> = {
    products: [
        { label: '24 Horas', value: 24, badge: 'Recomendado' },
        { label: '48 Horas', value: 48, badge: null },
        { label: '7 Días', value: 168, badge: null },
        { label: '30 Días', value: 720, badge: null },
        { label: 'Permanente', value: null, badge: 'Sin vencimiento' },
    ],
    // El catálogo de planes solo se comparte por 10 días, 1 año o sin vencimiento (el backend lo exige)
    plans: [
        { label: '10 Días', value: 240, badge: 'Recomendado' },
        { label: '1 Año', value: 8760, badge: null },
        { label: 'Permanente', value: null, badge: 'Sin vencimiento' },
    ],
};

// Mensaje del crematorio en el catálogo de planes (backend: CATALOG_MESSAGE_MAX)
const MESSAGE_MAX = 300;

/** Edición de un enlace existente (PATCH /api/internal/catalog/links/{id}); la URL no cambia. */
interface LinkEdit {
    id: number;
    name: string;
    message: string;
    groups: string[];
    priceList: number | null;
    showVideo: boolean;
    /** null = mantener la vigencia actual; si no, horas desde ahora (0 = permanente) */
    renewHours: number | null;
}

const editInputCls = 'w-full bg-white border border-slate-300 dark:bg-slate-950/60 dark:border-white/15 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 outline-none focus:border-amber-500';

export default function ShareCatalogModal({
    isOpen,
    onClose,
    tenantSlug,
    tenantName,
    zIndex = 'z-[400]',
    catalogType = 'products',
    planGroups = [],
}: ShareCatalogModalProps) {
    const copy = COPY[catalogType];
    const expirationOptions = EXPIRATION_OPTIONS[catalogType];
    const isPlans = catalogType === 'plans';
    const { showToast } = useToast();
    const [selectedHours, setSelectedHours] = useState<number | null>(expirationOptions[0].value);
    const [linkLabel, setLinkLabel] = useState('');
    const [linkMessage, setLinkMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUpdatingAll, setIsUpdatingAll] = useState(false);
    const [links, setLinks] = useState<CatalogLink[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [recentCreatedUrl, setRecentCreatedUrl] = useState<string | null>(null);
    // Video de bienvenida configurado por el SuperAdmin para este tenant
    const [tenantVideo, setTenantVideo] = useState<{ has_video: boolean; video?: any } | null>(null);
    const [newShowVideo, setNewShowVideo] = useState(true);
    const [previewVideoOpen, setPreviewVideoOpen] = useState(false);
    // Grupos de planes del enlace nuevo ([] = todos) y edición de los de un enlace existente
    const [newGroups, setNewGroups] = useState<string[]>([]);
    const [editingGroups, setEditingGroups] = useState<{ id: number; value: string[] } | null>(null);
    const [savingGroups, setSavingGroups] = useState(false);
    const showGroups = isPlans && planGroups.length > 0;
    // Tablas de precios (promociones): la del enlace nuevo y la edición de uno existente
    const [priceLists, setPriceLists] = useState<{ id: number; name: string; status: string }[]>([]);
    const [newPriceList, setNewPriceList] = useState<number | null>(null);
    const [savingPriceList, setSavingPriceList] = useState<number | null>(null);
    const [editing, setEditing] = useState<LinkEdit | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const fetchLinks = async () => {
        try {
            setLoadingLinks(true);
            const res = await apiRequest(`/api/internal/catalog/links?type=${catalogType}`);
            if (Array.isArray(res)) {
                setLinks(res);
            }
            if (catalogType === 'plans') {
                const pls = await apiRequest('/api/internal/price-lists').catch(() => []);
                setPriceLists(Array.isArray(pls) ? pls : []);
            }
            const vInfo = await apiRequest('/api/internal/catalog/links/video-info').catch(() => null);
            if (vInfo && typeof vInfo.has_video === 'boolean') {
                setTenantVideo(vInfo);
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
            setLinkMessage('');
            setNewGroups([]);
            setNewPriceList(null);
            setEditingGroups(null);
            setEditing(null);
            setNewShowVideo(true);
            setPreviewVideoOpen(false);
            setSelectedHours(EXPIRATION_OPTIONS[catalogType][0].value);
        }
    }, [isOpen, catalogType]);

    if (!isOpen) return null;

    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (showGroups && newGroups.length === 0) {
            showToast('Elige el grupo de planes que mostrará este catálogo', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            const res = await apiRequest('/api/internal/catalog/links', {
                method: 'POST',
                body: JSON.stringify({
                    name: linkLabel.trim() || undefined,
                    expires_in_hours: selectedHours,
                    catalog_type: catalogType,
                    message: isPlans ? linkMessage.trim() || undefined : undefined,
                    plan_groups: isPlans && newGroups.length ? newGroups : undefined,
                    price_list_id: isPlans && newPriceList ? newPriceList : undefined,
                    show_video: newShowVideo,
                }),
            });

            const fullUrl = buildCatalogUrl(tenantSlug, res.token);
            setRecentCreatedUrl(fullUrl);
            showToast('Enlace de catálogo generado exitosamente', 'success');
            setLinkLabel('');
            setLinkMessage('');
            fetchLinks();
        } catch (err: any) {
            console.error('Error creating catalog link:', err);
            showToast(err.message || 'Error al generar el enlace', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleToggleVideo = async (link: CatalogLink) => {
        const nextVal = link.show_video === false;
        try {
            const res = await apiRequest(`/api/internal/catalog/links/${link.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ show_video: nextVal }),
            });
            setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, show_video: res.show_video } : l)));
            showToast(nextVal ? 'Video de bienvenida activado para este enlace' : 'Video de bienvenida oculto para este enlace', 'info');
        } catch (err: any) {
            showToast(err?.message || 'Error al actualizar video del enlace', 'error');
        }
    };

    const handleSaveGroups = async () => {
        if (!editingGroups) return;
        setSavingGroups(true);
        try {
            const res = await apiRequest(`/api/internal/catalog/links/${editingGroups.id}/plan-groups`, {
                method: 'PATCH',
                body: JSON.stringify({ plan_groups: editingGroups.value.length ? editingGroups.value : null }),
            });
            setLinks(prev => prev.map(l => (l.id === res.id ? { ...l, plan_groups: res.plan_groups } : l)));
            setEditingGroups(null);
            showToast('Grupos del enlace actualizados', 'success');
        } catch (err) {
            showToast((err as { message?: string })?.message || 'No se pudieron guardar los grupos', 'error');
        } finally {
            setSavingGroups(false);
        }
    };

    const handleChangePriceList = async (linkId: number, value: number | null) => {
        setSavingPriceList(linkId);
        try {
            const res = await apiRequest(`/api/internal/catalog/links/${linkId}/price-list`, {
                method: 'PATCH',
                body: JSON.stringify({ price_list_id: value }),
            });
            setLinks(prev => prev.map(l => (l.id === res.id ? {
                ...l, price_list_id: res.price_list_id, price_list_name: res.price_list_name, price_list_status: res.price_list_status,
            } : l)));
            showToast('Tabla de precios del enlace actualizada', 'success');
        } catch (err) {
            showToast((err as { message?: string })?.message || 'No se pudo cambiar la tabla de precios', 'error');
        } finally {
            setSavingPriceList(null);
        }
    };

    const startEdit = (link: CatalogLink) => {
        setEditingGroups(null);
        setEditing({
            id: link.id,
            name: link.name || '',
            message: link.message || '',
            groups: link.plan_groups || [],
            priceList: link.price_list_id ?? null,
            showVideo: link.show_video !== false,
            renewHours: null,
        });
    };

    const handleSaveEdit = async () => {
        if (!editing) return;
        if (showGroups && editing.groups.length === 0) {
            showToast('Elige el grupo de planes que mostrará este catálogo', 'error');
            return;
        }
        setSavingEdit(true);
        try {
            const body: Record<string, unknown> = {
                name: editing.name.trim() || null,
                show_video: editing.showVideo,
            };
            if (isPlans) {
                body.message = editing.message.trim() || null;
                body.price_list_id = editing.priceList;
                if (showGroups) body.plan_groups = editing.groups;
            }
            if (editing.renewHours !== null) {
                body.renew_expiration = true;
                body.expires_in_hours = editing.renewHours || null;
            }
            const res = await apiRequest(`/api/internal/catalog/links/${editing.id}`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            setLinks(prev => prev.map(l => (l.id === res.id ? { ...l, ...res } : l)));
            setEditing(null);
            showToast('Enlace actualizado', 'success');
        } catch (err) {
            showToast((err as { message?: string })?.message || 'No se pudo actualizar el enlace', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    // Aplica la etiqueta (y el mensaje, en planes) del formulario a todos los enlaces existentes
    const handleUpdateAll = async () => {
        if (links.length === 0) return;
        const fields = isPlans ? 'la etiqueta y el mensaje' : 'la etiqueta';
        if (!confirm(`¿Aplicar ${fields} a los ${links.length} enlaces generados? Los campos vacíos se quitarán de todos.`)) return;
        setIsUpdatingAll(true);
        try {
            const res = await apiRequest('/api/internal/catalog/links/bulk', {
                method: 'PUT',
                body: JSON.stringify({
                    catalog_type: catalogType,
                    name: linkLabel.trim() || null,
                    message: isPlans ? linkMessage.trim() || null : undefined,
                }),
            });
            if (Array.isArray(res)) setLinks(res);
            showToast(`Se actualizaron ${links.length} enlaces`, 'success');
        } catch (err: any) {
            console.error('Error updating catalog links:', err);
            showToast(err.message || 'Error al actualizar los enlaces', 'error');
        } finally {
            setIsUpdatingAll(false);
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
        <div
            className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight">
                                {copy.title}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                Genera enlaces privados con fecha de vencimiento y botón de WhatsApp
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:text-slate-50 dark:hover:bg-white/10 rounded-xl transition-colors" aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Generador de enlace nuevo */}
                    <form onSubmit={handleCreateLink} className="space-y-4 bg-slate-50 border border-slate-200 dark:bg-white/[0.04] dark:border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                Vigencia del Enlace
                            </label>
                            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                {copy.expiredHint}
                            </span>
                        </div>

                        {/* Opciones de expiración */}
                        <div className={`grid gap-2.5 ${isPlans ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
                            {expirationOptions.map((opt) => {
                                const isSelected = selectedHours === opt.value;
                                return (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => setSelectedHours(opt.value)}
                                        className={`py-3 px-3 rounded-xl text-left border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm dark:bg-amber-500/15 dark:border-amber-400/60 dark:text-amber-200'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:bg-white/[0.04] dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold">{opt.label}</span>
                                            {opt.badge && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-black uppercase whitespace-nowrap">
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
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 ml-1">
                                Etiqueta de referencia (opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Familia Rodríguez / Atención WhatsApp"
                                value={linkLabel}
                                onChange={(e) => setLinkLabel(e.target.value)}
                                className="w-full bg-white border border-slate-300 dark:bg-slate-950/60 dark:border-white/15 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 transition-all"
                            />
                        </div>

                        {/* Mensaje para la familia (solo catálogo de planes) */}
                        {isPlans && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label htmlFor="catalog-message" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        Mensaje para la familia (opcional)
                                    </label>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        {linkMessage.length}/{MESSAGE_MAX}
                                    </span>
                                </div>
                                <textarea
                                    id="catalog-message"
                                    rows={3}
                                    maxLength={MESSAGE_MAX}
                                    placeholder="Ej: Te acompañamos en este momento. Escríbenos y te ayudamos a elegir el plan adecuado."
                                    value={linkMessage}
                                    onChange={(e) => setLinkMessage(e.target.value.slice(0, MESSAGE_MAX))}
                                    className="w-full resize-none bg-white border border-slate-300 dark:bg-slate-950/60 dark:border-white/15 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-500 transition-all"
                                />
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                                    Aparece en negrita en el catálogo, entre &quot;¿Cuál es el peso aproximado de tu mascota?&quot;y los planes.
                                </p>
                            </div>
                        )}

                        {/* Grupos de planes que muestra el enlace */}
                        {showGroups && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 ml-1">
                                    Grupo de planes que muestra este catálogo *
                                </label>
                                <GroupPicker groups={planGroups} value={newGroups} onChange={setNewGroups} />
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                                    Elige uno o varios grupos. La familia solo verá los planes activos de esos grupos.
                                </p>
                            </div>
                        )}

                        {/* Tabla de precios (promoción) del enlace */}
                        {isPlans && priceLists.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 ml-1" htmlFor="new-price-list">
                                    Tabla de precios
                                </label>
                                <select
                                    id="new-price-list"
                                    value={newPriceList ?? ''}
                                    onChange={e => setNewPriceList(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                                >
                                    <option value="">General</option>
                                    {priceLists.map(pl => (
                                        <option key={pl.id} value={pl.id}>{pl.name}{pl.status !== 'activa' ? ` (${pl.status})` : ''}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                                    Las tablas se crean en Configuración → Formulario y Pesos → Pesos y precios. Fuera de su vigencia el enlace usa la General.
                                </p>
                            </div>
                        )}

                        {/* Opción de Video de Bienvenida */}
                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        tenantVideo?.has_video
                                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                            : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                                    }`}>
                                        <Play size={14} className="fill-current ml-0.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                                Video de bienvenida
                                            </span>
                                            {tenantVideo?.has_video ? (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold uppercase tracking-wider">
                                                    Configurado {tenantVideo.video?.duration ? `(${Math.round(tenantVideo.video.duration)}s)` : ''}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400 font-medium">
                                                    No configurado en SaaS
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {tenantVideo?.has_video
                                                ? 'Muestra el botón para ver el video de bienvenida en este catálogo.'
                                                : 'El video se configura desde el panel administrador (admin.vinzer.cl).'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {tenantVideo?.has_video && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewVideoOpen(true)}
                                            className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                            title="Previsualizar video de bienvenida"
                                        >
                                            <Eye size={13} />
                                            <span>Visualizar</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={newShowVideo}
                                        disabled={!tenantVideo?.has_video}
                                        onClick={() => setNewShowVideo(!newShowVideo)}
                                        title={tenantVideo?.has_video ? (newShowVideo ? 'Video visible en este enlace' : 'Video oculto en este enlace') : 'No hay video cargado'}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                                            newShowVideo && tenantVideo?.has_video ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                newShowVideo && tenantVideo?.has_video ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isGenerating || (showGroups && newGroups.length === 0)}
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

                        {links.length > 0 && (
                            <button
                                type="button"
                                onClick={handleUpdateAll}
                                disabled={isUpdatingAll || isGenerating}
                                className="w-full py-2.5 px-4 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                                title={isPlans ? 'Aplica la etiqueta y el mensaje a todos los enlaces generados' : 'Aplica la etiqueta a todos los enlaces generados'}
                            >
                                {isUpdatingAll ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Actualizando enlaces...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={15} />
                                        <span>Actualizar todos los enlaces ({links.length})</span>
                                    </>
                                )}
                            </button>
                        )}
                    </form>

                    {/* Enlace recién generado */}
                    {recentCreatedUrl && (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                <Sparkles size={16} />
                                <span className="text-xs font-black uppercase tracking-wider">
                                    ¡Enlace Generado y Listo para Compartir!
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/25">
                                <input
                                    readOnly
                                    value={recentCreatedUrl}
                                    className="bg-transparent text-xs text-emerald-800 dark:text-emerald-200 font-mono flex-1 outline-none truncate select-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopy(recentCreatedUrl, 'recent')}
                                    className="p-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-200 transition-colors shrink-0 cursor-pointer"
                                    title="Copiar enlace"
                                >
                                    {copiedToken === 'recent' ? <Check size={15} /> : <Copy size={15} />}
                                </button>
                                <a
                                    href={recentCreatedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-200 transition-colors shrink-0 cursor-pointer"
                                    title="Abrir en pestaña nueva"
                                >
                                    <ExternalLink size={15} />
                                </a>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`Hola, te comparto ${copy.whatsapp} de ${tenantName}: ${recentCreatedUrl}`)}`}
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
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                Enlaces Generados ({links.length})
                            </h4>
                            <button
                                type="button"
                                onClick={fetchLinks}
                                className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-medium cursor-pointer"
                            >
                                Actualizar lista
                            </button>
                        </div>

                        {loadingLinks ? (
                            <div className="py-8 flex justify-center text-muted-foreground">
                                <Loader2 size={24} className="animate-spin text-amber-500" />
                            </div>
                        ) : links.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
                                {copy.empty}
                            </div>
                        ) : (
                            <div className={`space-y-2 overflow-y-auto pr-1 ${editing ? 'max-h-[28rem]' : 'max-h-60'}`}>
                                {links.map((link) => {
                                    const fullUrl = buildCatalogUrl(tenantSlug, link.token);
                                    const isCopied = copiedToken === link.token;

                                    return (
                                        <div
                                            key={link.id}
                                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                                                link.is_expired
                                                    ? 'bg-rose-50 border-rose-200 opacity-80 dark:bg-rose-500/[0.06] dark:border-rose-500/25'
                                                    : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-white/[0.04] dark:border-white/10 dark:hover:border-white/20'
                                            }`}
                                        >
                                            {editing?.id === link.id ? (
                                            <div className="min-w-0 flex-1 space-y-2.5">
                                                <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Editar enlace</p>
                                                <label className="block space-y-1">
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Etiqueta de referencia</span>
                                                    <input value={editing.name} maxLength={100} placeholder={copy.defaultName}
                                                        onChange={e => setEditing({ ...editing, name: e.target.value })} className={editInputCls} />
                                                </label>
                                                {isPlans && (
                                                    <label className="block space-y-1">
                                                        <span className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                            Mensaje para la familia
                                                            <span className="font-mono font-normal text-slate-500">{editing.message.length}/{MESSAGE_MAX}</span>
                                                        </span>
                                                        <textarea rows={2} value={editing.message} maxLength={MESSAGE_MAX}
                                                            onChange={e => setEditing({ ...editing, message: e.target.value.slice(0, MESSAGE_MAX) })}
                                                            className={`${editInputCls} resize-none`} />
                                                    </label>
                                                )}
                                                {showGroups && (
                                                    <div className="space-y-1">
                                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Grupo de planes *</span>
                                                        <GroupPicker groups={planGroups} value={editing.groups} onChange={v => setEditing({ ...editing, groups: v })} />
                                                    </div>
                                                )}
                                                {isPlans && (priceLists.length > 0 || editing.priceList !== null) && (
                                                    <label className="block space-y-1">
                                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Tabla de precios</span>
                                                        <select value={editing.priceList ?? ''} className={editInputCls}
                                                            onChange={e => setEditing({ ...editing, priceList: e.target.value ? Number(e.target.value) : null })}>
                                                            <option value="">General</option>
                                                            {priceLists.map(pl => (
                                                                <option key={pl.id} value={pl.id}>{pl.name}{pl.status !== 'activa' ? ` (${pl.status})` : ''}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                )}
                                                <label className="block space-y-1">
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Vigencia</span>
                                                    <select value={editing.renewHours === null ? 'keep' : String(editing.renewHours)} className={editInputCls}
                                                        onChange={e => setEditing({ ...editing, renewHours: e.target.value === 'keep' ? null : Number(e.target.value) })}>
                                                        <option value="keep">
                                                            Mantener ({link.expires_at
                                                                ? `${link.is_expired ? 'venció' : 'vence'} ${new Date(link.expires_at).toLocaleDateString('es-CL')}`
                                                                : 'sin vencimiento'})
                                                        </option>
                                                        {expirationOptions.map(opt => (
                                                            <option key={opt.label} value={opt.value ?? 0}>
                                                                {opt.value ? `Renovar: ${opt.label} desde hoy` : 'Permanente'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                                                    <div className="flex items-center gap-2">
                                                        <Play size={13} className="text-amber-500 fill-current" />
                                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                            Video de bienvenida
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={editing.showVideo}
                                                        disabled={!tenantVideo?.has_video}
                                                        onClick={() => setEditing({ ...editing, showVideo: !editing.showVideo })}
                                                        title={tenantVideo?.has_video ? (editing.showVideo ? 'Video activo' : 'Video oculto') : 'Sin video cargado'}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                                                            editing.showVideo && tenantVideo?.has_video ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                editing.showVideo && tenantVideo?.has_video ? 'translate-x-4' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 pt-0.5">
                                                    <button type="button" onClick={handleSaveEdit}
                                                        disabled={savingEdit || (showGroups && editing.groups.length === 0)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60">
                                                        {savingEdit && <Loader2 size={12} className="animate-spin" />} Guardar cambios
                                                    </button>
                                                    <button type="button" onClick={() => setEditing(null)} disabled={savingEdit}
                                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer">
                                                        Cancelar
                                                    </button>
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">La URL no cambia.</span>
                                                </div>
                                            </div>
                                            ) : (
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-50 truncate">
                                                        {link.name || copy.defaultName}
                                                    </span>
                                                    {link.is_expired ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30">
                                                            Expirado
                                                        </span>
                                                    ) : link.expires_at ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                                                            Vigente
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                                                            Permanente
                                                        </span>
                                                    )}
                                                    {tenantVideo?.has_video && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleVideo(link)}
                                                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                                                link.show_video !== false
                                                                    ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:border-amber-400/40 dark:text-amber-300'
                                                                    : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 hover:text-slate-700'
                                                            }`}
                                                            title={link.show_video !== false ? 'Video visible en este catálogo (clic para ocultar)' : 'Video oculto en este catálogo (clic para mostrar)'}
                                                        >
                                                            <Play size={8} className={link.show_video !== false ? 'fill-current' : ''} />
                                                            <span>{link.show_video !== false ? 'Video activo' : 'Video oculto'}</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {link.message && (
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic truncate" title={link.message}>
                                                        “{link.message}”
                                                    </p>
                                                )}

                                                {isPlans && (showGroups || (link.plan_groups?.length ?? 0) > 0) && (
                                                    editingGroups?.id === link.id ? (
                                                        <div className="space-y-2 pt-1">
                                                            <GroupPicker
                                                                groups={planGroups}
                                                                value={editingGroups.value}
                                                                onChange={(v) => setEditingGroups({ id: link.id, value: v })}
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <button type="button" onClick={handleSaveGroups} disabled={savingGroups || editingGroups.value.length === 0}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60">
                                                                    {savingGroups && <Loader2 size={12} className="animate-spin" />} Guardar
                                                                </button>
                                                                <button type="button" onClick={() => setEditingGroups(null)} disabled={savingGroups}
                                                                    className="px-3 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer">
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingGroups({ id: link.id, value: link.plan_groups || [] })}
                                                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-300 cursor-pointer"
                                                            title="Cambiar los grupos de planes que muestra este enlace"
                                                        >
                                                            <Folder size={12} className="text-amber-600 dark:text-amber-400" />
                                                            {link.plan_groups?.length
                                                                ? `Muestra: ${link.plan_groups.map(groupLabel).join(', ')}`
                                                                : 'Muestra: todos los planes'}
                                                        </button>
                                                    )
                                                )}

                                                {isPlans && (priceLists.length > 0 || !!link.price_list_id) && (
                                                    <label className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                                        <BadgePercent size={12} className="text-fuchsia-600 dark:text-fuchsia-400" />
                                                        Precios:
                                                        <select
                                                            value={link.price_list_id ?? ''}
                                                            disabled={savingPriceList === link.id}
                                                            onChange={e => handleChangePriceList(link.id, e.target.value ? Number(e.target.value) : null)}
                                                            className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-60"
                                                            title="Tabla de precios que usa este enlace"
                                                        >
                                                            <option value="">General</option>
                                                            {priceLists.map(pl => (
                                                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                                                            ))}
                                                        </select>
                                                        {link.price_list_status && link.price_list_status !== 'activa' && (
                                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400" title="Mientras tanto el enlace usa la General">
                                                                {link.price_list_status} · usa la General
                                                            </span>
                                                        )}
                                                        {savingPriceList === link.id && <Loader2 size={12} className="animate-spin" />}
                                                    </label>
                                                )}

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                                    <span>
                                                        {link.expires_at ? (
                                                            <>Vence: {new Date(link.expires_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</>
                                                        ) : (
                                                            'Sin vencimiento'
                                                        )}
                                                    </span>
                                                    <span>·</span>
                                                    {isPlans ? (
                                                        // Misma métrica que el admin (KPIs del catálogo): personas distintas, no recargas
                                                        <span title={`${link.views_count} aperturas en total (incluye recargas y visitas antes de medir)`}>
                                                            {link.visitors ?? 0} visitante{(link.visitors ?? 0) !== 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span>{link.views_count} vista{link.views_count !== 1 ? 's' : ''}</span>
                                                    )}
                                                    {isPlans && (
                                                        <>
                                                            <span>·</span>
                                                            <span title="Personas que tocaron «Solicitar este plan»">
                                                                {link.plan_requests ?? 0} solicitud{(link.plan_requests ?? 0) !== 1 ? 'es' : ''}
                                                            </span>
                                                            <span>·</span>
                                                            <span title="Formularios enviados desde este enlace">
                                                                {link.forms_submitted ?? 0} formulario{(link.forms_submitted ?? 0) !== 1 ? 's' : ''} enviado{(link.forms_submitted ?? 0) !== 1 ? 's' : ''}
                                                            </span>
                                                            {(link.orders ?? 0) > 0 && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span title="Formularios de este enlace que ya tienen una orden de cremación">
                                                                        {link.orders} con orden
                                                                    </span>
                                                                </>
                                                            )}
                                                            {(link.delivered ?? 0) > 0 && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400"
                                                                        title="Servicios completados: la orden llegó a «Entregado»">
                                                                        <CheckCircle2 size={12} /> {link.delivered} completado{link.delivered !== 1 ? 's' : ''}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            )}

                                            <div className={`flex items-center gap-1.5 shrink-0 ${editing?.id === link.id ? 'self-start' : ''}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => (editing?.id === link.id ? setEditing(null) : startEdit(link))}
                                                    className={`p-2 rounded-xl transition-colors cursor-pointer ${editing?.id === link.id
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                        : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 dark:bg-white/10 dark:hover:bg-amber-500/20 dark:text-slate-200 dark:hover:text-amber-300'}`}
                                                    title="Editar enlace"
                                                    aria-label="Editar enlace"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(fullUrl, link.token)}
                                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 dark:hover:text-slate-50 transition-colors cursor-pointer"
                                                    title="Copiar enlace"
                                                >
                                                    {isCopied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
                                                </button>
                                                <a
                                                    href={fullUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 dark:hover:text-slate-50 transition-colors cursor-pointer"
                                                    title="Ver catálogo"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLink(link.id)}
                                                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 dark:bg-white/10 dark:hover:bg-rose-500/20 dark:text-slate-200 dark:hover:text-rose-300 transition-colors cursor-pointer"
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
                <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end bg-slate-50 dark:bg-white/[0.03]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2.5 px-5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>

                {/* Modal de previsualización del video de bienvenida */}
                {previewVideoOpen && tenantVideo?.video && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white">
                                    <Play size={16} className="text-amber-500 fill-current" />
                                    <h3 className="text-sm font-bold">Vista previa del video de bienvenida</h3>
                                    {tenantVideo.video.duration ? (
                                        <span className="text-xs text-amber-400 font-mono">({Math.round(tenantVideo.video.duration)}s)</span>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewVideoOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                    aria-label="Cerrar video"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="rounded-xl overflow-hidden bg-black border border-white/10">
                                <FormVideoPlayer video={tenantVideo.video} autoPlay={true} />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Botón en catálogo: <b className="text-white">{tenantVideo.video.button_text || 'Ver video de bienvenida'}</b></span>
                                <button
                                    type="button"
                                    onClick={() => setPreviewVideoOpen(false)}
                                    className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
