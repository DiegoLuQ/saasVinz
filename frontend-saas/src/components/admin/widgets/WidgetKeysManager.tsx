"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    Code2, Plus, Copy, Check, Trash2, RefreshCw, Globe, ShieldCheck,
    Power, KeyRound, AlertTriangle, Loader2, Info, Link2, FileCode,
    Eye, Heart, PawPrint, Sparkles, Clock, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/admin/api';
import {
    getWidgetBaseUrl,
    getWidgetEndpoints,
    buildHostedSnippet,
    buildStandaloneTemplate,
    buildRecentPetsSnippet,
    buildRecentPetsStandaloneTemplate,
    buildFormEmbedSnippet,
    buildFormEmbedFullPage,
} from '@/lib/widget/embedTemplates';

interface ApiKey {
    id: number;
    name: string;
    api_key: string;
    allowed_domains: string[];
    is_active: boolean;
    last_used_at?: string | null;
    created_at: string;
}

interface WidgetInfo {
    tenant: { id: number; name: string; slug: string };
    can_use: boolean;
    plan_name: string | null;
    allowed_plans: string[];
    can_use_form_embed?: boolean;
    form_embed_allowed_plans?: string[];
}

interface PreviewPet {
    id: number;
    nombre: string;
    especie?: string | null;
    raza?: string | null;
    imagen?: string | null;
    fecha_fallecimiento?: string | null;
    memorial_url?: string | null;
}

interface PreviewCatalogItem {
    id: number;
    nombre: string;
    descripcion?: string | null;
    precio?: number | null;
    imagen?: string | null;
    servicios?: string[];
}

interface WidgetPreviewData {
    catalog: {
        tenant: { name?: string | null; slug?: string | null; phone?: string | null; form_url?: string | null };
        plans: PreviewCatalogItem[];
        services: PreviewCatalogItem[];
        products: PreviewCatalogItem[];
    };
    recent_pets: {
        total: number;
        mascotas: PreviewPet[];
    };
}

function formatRelativeTime(iso?: string | null): string {
    if (!iso) return 'Sin tráfico registrado aún';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Sin tráfico registrado aún';
    const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (diffSec < 60) return 'Hace unos segundos';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `Hace ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatShortDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { /* cae al fallback */ }

    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

function CopyButton({
    value, label = 'Copiar', variant = 'default',
}: { value: string; label?: string; variant?: 'default' | 'brand' }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        const ok = await copyToClipboard(value);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };
    const cls = variant === 'brand'
        ? 'bg-gradient-to-r from-[#19B5FE] to-[#E0B84D] text-[#020210] shadow-lg shadow-[#19B5FE]/20 hover:brightness-110'
        : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10';
    return (
        <button
            type="button"
            onClick={copy}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${cls}`}
        >
            {copied ? <Check size={14} className={variant === 'brand' ? '' : 'text-emerald-400'} /> : <Copy size={14} />}
            {copied ? 'Copiado' : label}
        </button>
    );
}

export default function WidgetKeysManager({ tenantIdentifier }: { tenantIdentifier: string }) {
    const { showToast } = useToast();
    const [info, setInfo] = useState<WidgetInfo | null>(null);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [preview, setPreview] = useState<WidgetPreviewData | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewTab, setPreviewTab] = useState<'pets' | 'catalog'>('pets');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('Sitio web');
    const [newDomains, setNewDomains] = useState('');

    const base = `/api/internal/creator/widgets/tenants/${encodeURIComponent(tenantIdentifier)}`;
    const widgetBase = getWidgetBaseUrl();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [infoRes, keysRes, previewRes] = await Promise.all([
                apiRequest(`${base}/widget-info`),
                apiRequest(`${base}/api-keys`),
                apiRequest(`${base}/preview`).catch(() => null),
            ]);
            setInfo(infoRes);
            setKeys(Array.isArray(keysRes) ? keysRes : []);
            setPreview(previewRes);
        } catch (err: any) {
            showToast(err?.message || 'No se pudo cargar el widget del tenant', 'error');
        } finally {
            setLoading(false);
        }
    }, [base, showToast]);

    useEffect(() => { load(); }, [load]);

    const parseDomains = (raw: string) => raw.split(/[\n,]/).map((d) => d.trim()).filter(Boolean);

    const handleCreate = async () => {
        const domains = parseDomains(newDomains);
        if (domains.length === 0) {
            showToast('Agrega al menos un dominio autorizado', 'error');
            return;
        }
        setCreating(true);
        try {
            const created = await apiRequest(`${base}/api-keys`, {
                method: 'POST',
                body: { name: newName.trim() || 'Widget Web', allowed_domains: domains },
            });
            setKeys((prev) => [created, ...prev]);
            setShowForm(false);
            setNewName('Sitio web');
            setNewDomains('');
            showToast('API key generada', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudo generar la API key', 'error');
        } finally {
            setCreating(false);
        }
    };

    const updateKey = async (id: number, patch: Partial<ApiKey>) => {
        try {
            const updated = await apiRequest(`${base}/api-keys/${id}`, { method: 'PATCH', body: patch });
            setKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));
            showToast('Cambios guardados', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudo actualizar', 'error');
        }
    };

    const rotateKey = async (id: number) => {
        try {
            const updated = await apiRequest(`${base}/api-keys/${id}/rotate`, { method: 'POST' });
            setKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));
            showToast('Clave regenerada. Hay que actualizar el código embebido del sitio.', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudo regenerar la clave', 'error');
        }
    };

    const deleteKey = async (id: number) => {
        try {
            await apiRequest(`${base}/api-keys/${id}`, { method: 'DELETE' });
            setKeys((prev) => prev.filter((k) => k.id !== id));
            showToast('API key eliminada', 'success');
        } catch (err: any) {
            showToast(err?.message || 'No se pudo eliminar', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-white/50 gap-2">
                <Loader2 size={18} className="animate-spin" /> Cargando…
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Aviso de plan (override de SuperAdmin) */}
            {info && !info.can_use && (
                <div className="flex items-start gap-2.5 text-[13px] text-amber-200/90 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                    <Info size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <span>
                        El plan actual de este tenant{info.plan_name ? ` (${info.plan_name})` : ''} no incluye el widget
                        (es feature de {info.allowed_plans.join(' / ')}). Puedes crear claves, pero no funcionarán en el sitio
                        hasta que el tenant tenga uno de esos planes (o un acceso demo vigente).
                    </span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Code2 size={18} className="text-primary" /> API Keys del Widget</h3>
                    <p className="text-sm text-white/50 mt-1">
                        Claves públicas para embeber catálogo, seguimiento en vivo y homenaje de últimas mascotas.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setShowPreview((v) => !v)}
                        className={`inline-flex items-center gap-2 px-4 min-h-[44px] rounded-2xl font-bold text-sm border transition-all ${
                            showPreview
                                ? 'bg-[#19B5FE]/15 border-[#19B5FE]/40 text-[#38BDF8]'
                                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                        }`}
                    >
                        <Eye size={17} /> {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa en Vivo'}
                    </button>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                        >
                            <Plus size={18} /> Nueva API Key
                        </button>
                    )}
                </div>
            </div>

            {/* Vista Previa en Vivo de los Widgets */}
            {showPreview && preview && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-[#19B5FE]/25 bg-[#070b12] p-5 sm:p-6 space-y-5 overflow-hidden"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#38BDF8]">
                                Simulador de Widget Embebible
                            </span>
                            <h4 className="text-base font-extrabold text-white mt-0.5">
                                Así se verá en el sitio web de {info?.tenant.name}
                            </h4>
                        </div>
                        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 w-fit">
                            <button
                                type="button"
                                onClick={() => setPreviewTab('pets')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                                    previewTab === 'pets'
                                        ? 'bg-[#19B5FE] text-[#020210]'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                <Heart size={13} /> Últimas Mascotas ({preview.recent_pets.total})
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('catalog')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                                    previewTab === 'catalog'
                                        ? 'bg-[#E0B84D] text-[#020210]'
                                        : 'text-white/60 hover:text-white'
                                }`}
                            >
                                <Sparkles size={13} /> Catálogo y Seguimiento
                            </button>
                        </div>
                    </div>

                    {/* Lienzo claro simulando el sitio web del crematorio */}
                    <div className="rounded-2xl bg-[#f8fafc] text-slate-900 p-5 sm:p-6 border border-slate-200 shadow-inner">
                        {previewTab === 'pets' ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/15 text-[#0284C7]">
                                        <Heart size={17} fill="currentColor" />
                                    </div>
                                    <div>
                                        <h5 className="font-extrabold text-lg text-slate-900 leading-tight">En Memoria</h5>
                                        <p className="text-xs text-slate-500 font-medium">Últimas mascotas acompañadas</p>
                                    </div>
                                    <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                                        {preview.recent_pets.mascotas.length}
                                    </span>
                                </div>

                                {preview.recent_pets.mascotas.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-8 text-center">
                                        Este crematorio aún no tiene mascotas registradas para mostrar.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                                        {preview.recent_pets.mascotas.map((pet) => (
                                            <div
                                                key={pet.id}
                                                className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 p-4 flex flex-col items-center text-center gap-2 shadow-xs hover:shadow-md hover:border-sky-400/50 transition-all overflow-hidden"
                                            >
                                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#19B5FE] to-[#E0B84D]" />
                                                <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-[#19B5FE]/50 to-[#E0B84D]/60 shadow-sm mt-1">
                                                    <div className="w-full h-full rounded-full overflow-hidden bg-sky-50 flex items-center justify-center border-2 border-white text-[#0284C7]">
                                                        {pet.imagen ? (
                                                            <img src={pet.imagen} alt={pet.nombre} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <PawPrint size={28} />
                                                        )}
                                                    </div>
                                                </div>
                                                <h6 className="font-extrabold text-sm text-slate-900 leading-tight">{pet.nombre}</h6>
                                                {(pet.especie || pet.raza) && (
                                                    <p className="text-[11px] text-slate-500 font-medium capitalize">
                                                        {[pet.especie, pet.raza].filter(Boolean).join(' · ')}
                                                    </p>
                                                )}
                                                {pet.fecha_fallecimiento && (
                                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600 mt-0.5">
                                                        <span className="text-amber-500">✦</span> {pet.fecha_fallecimiento}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-3 text-center text-[11px] font-bold text-slate-400 tracking-wider">
                                    CON TECNOLOGÍA DE <span className="text-[#0284C7] font-black">Vinzer.</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {(preview.catalog.plans.length + preview.catalog.services.length + preview.catalog.products.length) === 0 ? (
                                    <p className="text-sm text-slate-400 py-6 text-center">
                                        Este crematorio aún no tiene planes, servicios ni productos activos en su catálogo.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                                        {[...preview.catalog.plans.slice(0, 3), ...preview.catalog.services.slice(0, 3)].slice(0, 6).map((it, idx) => (
                                            <div
                                                key={`${it.id}-${idx}`}
                                                className="rounded-2xl border border-sky-200/80 bg-gradient-to-b from-white to-sky-50/40 p-4 flex flex-col justify-between gap-2 shadow-xs"
                                            >
                                                <div>
                                                    <h6 className="font-extrabold text-sm text-slate-900">{it.nombre}</h6>
                                                    {it.descripcion && (
                                                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{it.descripcion}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                                    <span className="font-extrabold text-sm text-slate-900">
                                                        {it.precio != null ? `$${Number(it.precio).toLocaleString('es-CL')}` : 'Consultar'}
                                                    </span>
                                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-[#0284C7]">
                                                        Solicitar →
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="rounded-2xl bg-[#0b1220] text-white p-5 border border-[#19B5FE]/30">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E0B84D]">
                                        Seguimiento en tiempo real
                                    </span>
                                    <h6 className="text-base font-extrabold mt-0.5">Sigue el proceso de tu mascota</h6>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Al buscar el código, la familia ve la foto de su mascota, etapa, barra de progreso y el botón hacia el portal ceremonial en vivo.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {showForm && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl p-6 border border-primary/20 space-y-4"
                >
                    <h4 className="font-bold flex items-center gap-2"><KeyRound size={16} className="text-primary" /> Generar nueva API Key</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/50">Nombre interno</label>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ej: Sitio web principal"
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-primary/50 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-white/50">Dominios autorizados (uno por línea)</label>
                            <textarea
                                value={newDomains}
                                onChange={(e) => setNewDomains(e.target.value)}
                                placeholder={'mi-crematorio.cl\nwww.mi-crematorio.cl'}
                                rows={2}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                            />
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-[12px] text-amber-300/80 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                        <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                        La clave solo funcionará en los dominios registrados. Sin dominios queda inactiva por seguridad.
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white transition-all">Cancelar</button>
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 hover:brightness-110 transition-all"
                        >
                            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Generar
                        </button>
                    </div>
                </motion.div>
            )}

            {keys.length === 0 && !showForm ? (
                <div className="glass-card rounded-[2.5rem] p-12 text-center border-white/5">
                    <Code2 size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/50 font-medium">Este tenant aún no tiene API keys.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {keys.map((k) => (
                        <KeyCard
                            key={k.id}
                            apiKey={k}
                            widgetBase={widgetBase}
                            canUseFormEmbed={!!info?.can_use_form_embed}
                            tenantName={info?.tenant.name || ''}
                            onToggle={() => updateKey(k.id, { is_active: !k.is_active })}
                            onSaveDomains={(domains) => updateKey(k.id, { allowed_domains: domains })}
                            onRotate={() => rotateKey(k.id)}
                            onDelete={() => deleteKey(k.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function KeyCard({
    apiKey, widgetBase, canUseFormEmbed, tenantName, onToggle, onSaveDomains, onRotate, onDelete,
}: {
    apiKey: ApiKey;
    widgetBase: string;
    canUseFormEmbed: boolean;
    tenantName: string;
    onToggle: () => void;
    onSaveDomains: (domains: string[]) => void;
    onRotate: () => void;
    onDelete: () => void;
}) {
    const [domainsText, setDomainsText] = useState((apiKey.allowed_domains || []).join('\n'));
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const [embedTab, setEmbedTab] = useState<'hosted' | 'pets' | 'full' | 'form'>('hosted');
    const [petsVariant, setPetsVariant] = useState<'hosted' | 'full'>('hosted');
    const [petsLimit, setPetsLimit] = useState<number>(8);
    const [formTheme, setFormTheme] = useState<'light' | 'dark'>('light');
    const [formVariant, setFormVariant] = useState<'snippet' | 'page'>('snippet');

    useEffect(() => {
        setDomainsText((apiKey.allowed_domains || []).join('\n'));
    }, [apiKey.allowed_domains]);

    const parsedDomains = domainsText.split(/[\n,]/).map((d) => d.trim()).filter(Boolean);
    const domainsChanged = parsedDomains.join(',') !== (apiKey.allowed_domains || []).join(',');

    const endpoints = getWidgetEndpoints(apiKey.api_key, widgetBase);
    const hostedSnippet = buildHostedSnippet(apiKey.api_key, widgetBase);
    const fullTemplate = buildStandaloneTemplate(apiKey.api_key, widgetBase);
    const petsSnippet = petsVariant === 'hosted'
        ? buildRecentPetsSnippet(apiKey.api_key, widgetBase, petsLimit)
        : buildRecentPetsStandaloneTemplate(apiKey.api_key, widgetBase, petsLimit);
    const formSnippet = formVariant === 'snippet'
        ? buildFormEmbedSnippet(apiKey.api_key, widgetBase, formTheme)
        : buildFormEmbedFullPage(apiKey.api_key, widgetBase, formTheme, tenantName);

    const embedCode =
        embedTab === 'hosted'
            ? hostedSnippet
            : embedTab === 'pets'
                ? petsSnippet
                : embedTab === 'full'
                    ? fullTemplate
                    : formSnippet;

    const hasTraffic = Boolean(apiKey.last_used_at);

    return (
        <div className={`glass-card rounded-3xl p-6 border space-y-5 min-w-0 ${apiKey.is_active ? 'border-white/5' : 'border-white/5 opacity-60'}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${apiKey.is_active ? 'bg-primary/15 text-primary' : 'bg-white/5 text-white/40'}`}>
                        <KeyRound size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white">{apiKey.name}</h4>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                apiKey.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/40'
                            }`}>
                                {apiKey.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/45 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                                <Activity size={12} className={hasTraffic ? 'text-emerald-400' : 'text-white/30'} />
                                <strong className={hasTraffic ? 'text-emerald-300 font-semibold' : 'text-white/40 font-medium'}>
                                    {formatRelativeTime(apiKey.last_used_at)}
                                </strong>
                            </span>
                            {apiKey.created_at && (
                                <span className="inline-flex items-center gap-1 text-white/35">
                                    <Clock size={11} /> Creada el {formatShortDate(apiKey.created_at)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggle} title={apiKey.is_active ? 'Desactivar' : 'Activar'}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all">
                        <Power size={16} />
                    </button>
                    <button onClick={() => { setConfirmDelete(false); setConfirmRotate(true); }} title="Regenerar clave"
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={() => { setConfirmRotate(false); setConfirmDelete(true); }} title="Eliminar"
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {confirmRotate && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <span className="text-sm text-amber-200 flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        ¿Regenerar la clave? La actual dejará de funcionar de inmediato y habrá que actualizar el código embebido en el sitio.
                    </span>
                    <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                        <button onClick={() => setConfirmRotate(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/60 hover:text-white">Cancelar</button>
                        <button onClick={() => { setConfirmRotate(false); onRotate(); }} className="px-3 py-1.5 rounded-lg bg-amber-500 text-[#020210] text-xs font-bold hover:brightness-110">Regenerar</button>
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/50">Clave pública</label>
                <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white/80 font-mono break-all">
                        {apiKey.api_key}
                    </code>
                    <CopyButton value={apiKey.api_key} />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <Globe size={13} /> Dominios autorizados
                </label>
                <textarea
                    value={domainsText}
                    onChange={(e) => setDomainsText(e.target.value)}
                    rows={2}
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                />
                {domainsChanged && (
                    <div className="flex items-center justify-end gap-3">
                        {parsedDomains.length === 0 && (
                            <span className="text-[11px] text-amber-300/80">Debe quedar al menos un dominio.</span>
                        )}
                        <button
                            onClick={() => onSaveDomains(parsedDomains)}
                            disabled={parsedDomains.length === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/90 text-white text-xs font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <Check size={14} /> Guardar dominios
                        </button>
                    </div>
                )}
            </div>

            {/* Endpoints consumibles por el tenant */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <Link2 size={13} /> Endpoints disponibles
                </label>
                <div className="space-y-2">
                    {endpoints.map((ep) => (
                        <div key={ep.label} className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#19B5FE]/15 text-[#19B5FE]">{ep.method}</span>
                                    <span className="text-xs font-bold text-white">{ep.label}</span>
                                </div>
                                <CopyButton value={ep.url} />
                            </div>
                            <code className="block text-[11px] text-white/60 font-mono break-all">{ep.url}</code>
                            <p className="text-[11px] text-white/40">{ep.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Código embebible: script ligero, últimas mascotas, plantilla completa o formulario */}
            <div className="rounded-2xl p-px bg-gradient-to-br from-[#19B5FE]/40 via-white/5 to-[#E0B84D]/40">
                <div className="rounded-2xl bg-[#070b12] p-4 sm:p-5 space-y-3 min-w-0">
                    {/* Encabezado */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#19B5FE]/20 to-[#E0B84D]/20 border border-white/10">
                                <FileCode size={15} className="text-[#19B5FE]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white leading-none">Código para el sitio</h4>
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-[#19B5FE] to-[#E0B84D] bg-clip-text text-transparent">
                                    Vinzer Widget
                                </span>
                            </div>
                        </div>
                        <CopyButton value={embedCode} label="Copiar código" variant="brand" />
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 w-max max-w-full overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setEmbedTab('hosted')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                                embedTab === 'hosted'
                                    ? 'bg-[#19B5FE] text-[#020210] shadow-md shadow-[#19B5FE]/30'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Catálogo + Seguimiento
                        </button>
                        <button
                            onClick={() => setEmbedTab('pets')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                                embedTab === 'pets'
                                    ? 'bg-sky-400 text-[#020210] shadow-md shadow-sky-400/30'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            <Heart size={12} /> Últimas Mascotas
                        </button>
                        <button
                            onClick={() => setEmbedTab('full')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                                embedTab === 'full'
                                    ? 'bg-[#E0B84D] text-[#020210] shadow-md shadow-[#E0B84D]/30'
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Plantilla completa (HTML/CSS/JS)
                        </button>
                        <button
                            onClick={() => canUseFormEmbed && setEmbedTab('form')}
                            disabled={!canUseFormEmbed}
                            title={canUseFormEmbed ? undefined : 'Exclusivo del plan ULTRA'}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                                embedTab === 'form'
                                    ? 'bg-emerald-400 text-[#020210] shadow-md shadow-emerald-400/30'
                                    : canUseFormEmbed
                                        ? 'text-white/50 hover:text-white'
                                        : 'text-white/25 cursor-not-allowed'
                            }`}
                        >
                            Formulario (iframe)
                            {!canUseFormEmbed && (
                                <span className="text-[9px] font-black px-1 py-px rounded bg-white/10 text-white/50">ULTRA</span>
                            )}
                        </button>
                    </div>

                    <p className="text-[11px] text-white/40">
                        {embedTab === 'hosted'
                            ? 'Recomendado: muestra Planes, Servicios, Productos y Seguimiento en vivo cargando desde Vinzer.'
                            : embedTab === 'pets'
                                ? 'Galería "En Memoria": muestra las últimas mascotas acompañadas con su foto, nombre y fecha de fallecimiento (si la tiene).'
                                : embedTab === 'full'
                                    ? 'Autocontenida: pega todo el bloque (productos, servicios y seguimiento) sin dependencias externas.'
                                    : formVariant === 'snippet'
                                        ? 'Fragmento para pegar dentro de una página existente del sitio. Solo carga en los dominios autorizados y ajusta su alto automáticamente.'
                                        : 'Página HTML completa, lista para publicar tal cual (ej. form.mi-crematorio.cl). Ese dominio debe estar en los dominios autorizados.'}
                    </p>

                    {embedTab === 'pets' && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="text-white/40 font-bold uppercase tracking-wider">Modo</span>
                                {([['hosted', 'Script ligero'], ['full', 'HTML/CSS/JS completo']] as const).map(([v, label]) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setPetsVariant(v)}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                            petsVariant === v ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white/40 font-bold uppercase tracking-wider">Cantidad</span>
                                {([4, 8, 12] as const).map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setPetsLimit(n)}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                            petsLimit === n ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {n} mascotas
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {embedTab === 'form' && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="text-white/40 font-bold uppercase tracking-wider">Formato</span>
                                {([['snippet', 'Fragmento'], ['page', 'HTML completo']] as const).map(([v, label]) => (
                                    <button
                                        key={v}
                                        onClick={() => setFormVariant(v)}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                            formVariant === v ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white/40 font-bold uppercase tracking-wider">Tema</span>
                                {(['light', 'dark'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setFormTheme(t)}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                            formTheme === t ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                                        }`}
                                    >
                                        {t === 'light' ? 'Claro' : 'Oscuro'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bloque de código estilo terminal */}
                    <div className="rounded-xl border border-white/10 overflow-hidden min-w-0 bg-[#020308]">
                        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#E0B84D]/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-[#19B5FE]/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                <span className="ml-2 text-[10px] font-mono text-white/40">
                                    {embedTab === 'hosted'
                                        ? 'vinzer-widget.html'
                                        : embedTab === 'pets'
                                            ? 'vinzer-ultimas-mascotas.html'
                                            : embedTab === 'full'
                                                ? 'vinzer-widget-full.html'
                                                : formVariant === 'snippet'
                                                    ? 'vinzer-formulario.html'
                                                    : 'index.html'}
                                </span>
                            </div>
                            <CopyButton value={embedCode} label="Copiar" />
                        </div>
                        <pre className="p-4 text-[11px] text-[#7fd4ff] font-mono overflow-auto max-h-80 max-w-full whitespace-pre">
{embedCode}
                        </pre>
                    </div>
                </div>
            </div>

            {confirmDelete && (
                <div className="flex items-center justify-between gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                    <span className="text-sm text-red-300 flex items-center gap-2"><AlertTriangle size={16} /> ¿Eliminar esta API key? El widget dejará de funcionar.</span>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/60 hover:text-white">Cancelar</button>
                        <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:brightness-110">Eliminar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
