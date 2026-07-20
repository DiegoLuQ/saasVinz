"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    Code2, Plus, Copy, Check, Trash2, RefreshCw, Globe, ShieldCheck,
    Power, KeyRound, AlertTriangle, Loader2, Info, Link2, FileCode
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { apiRequest } from '@/lib/admin/api';
import {
    getWidgetBaseUrl, getWidgetEndpoints, buildHostedSnippet, buildStandaloneTemplate,
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
}

async function copyToClipboard(text: string): Promise<boolean> {
    // navigator.clipboard solo existe en contextos seguros (HTTPS o localhost).
    // En http://*.lvh.me no está disponible, por eso usamos un fallback.
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
            const [infoRes, keysRes] = await Promise.all([
                apiRequest(`${base}/widget-info`),
                apiRequest(`${base}/api-keys`),
            ]);
            setInfo(infoRes);
            setKeys(Array.isArray(keysRes) ? keysRes : []);
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
                        (es feature de {info.allowed_plans.join(' / ')}). Como SuperAdmin puedes aprovisionarlo igualmente.
                    </span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Code2 size={18} className="text-primary" /> API Keys del Widget</h3>
                    <p className="text-sm text-white/50 mt-1">Claves públicas para embeber servicios y seguimiento en el sitio del tenant.</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                    >
                        <Plus size={18} /> Nueva API Key
                    </button>
                )}
            </div>

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
    apiKey, widgetBase, onToggle, onSaveDomains, onRotate, onDelete,
}: {
    apiKey: ApiKey;
    widgetBase: string;
    onToggle: () => void;
    onSaveDomains: (domains: string[]) => void;
    onRotate: () => void;
    onDelete: () => void;
}) {
    const [domainsText, setDomainsText] = useState((apiKey.allowed_domains || []).join('\n'));
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [embedTab, setEmbedTab] = useState<'hosted' | 'full'>('hosted');

    useEffect(() => {
        setDomainsText((apiKey.allowed_domains || []).join('\n'));
    }, [apiKey.allowed_domains]);

    const domainsChanged =
        domainsText.split(/[\n,]/).map((d) => d.trim()).filter(Boolean).join(',') !==
        (apiKey.allowed_domains || []).join(',');

    const endpoints = getWidgetEndpoints(apiKey.api_key, widgetBase);
    const hostedSnippet = buildHostedSnippet(apiKey.api_key, widgetBase);
    const fullTemplate = buildStandaloneTemplate(apiKey.api_key, widgetBase);
    const embedCode = embedTab === 'hosted' ? hostedSnippet : fullTemplate;

    return (
        <div className={`glass-card rounded-3xl p-6 border space-y-5 min-w-0 ${apiKey.is_active ? 'border-white/5' : 'border-white/5 opacity-60'}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${apiKey.is_active ? 'bg-primary/15 text-primary' : 'bg-white/5 text-white/40'}`}>
                        <KeyRound size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-white">{apiKey.name}</h4>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${apiKey.is_active ? 'text-emerald-400' : 'text-white/40'}`}>
                            {apiKey.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggle} title={apiKey.is_active ? 'Desactivar' : 'Activar'}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all">
                        <Power size={16} />
                    </button>
                    <button onClick={onRotate} title="Regenerar clave"
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={() => setConfirmDelete(true)} title="Eliminar"
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

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
                    <div className="flex justify-end">
                        <button
                            onClick={() => onSaveDomains(domainsText.split(/[\n,]/).map((d) => d.trim()).filter(Boolean))}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/90 text-white text-xs font-bold hover:brightness-110 transition-all"
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

            {/* Código embebible: script ligero o plantilla completa (marca Vinzer) */}
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
                            Script ligero
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
                    </div>

                    <p className="text-[11px] text-white/40">
                        {embedTab === 'hosted'
                            ? 'Recomendado: carga el widget desde Vinzer y se actualiza automáticamente.'
                            : 'Autocontenida: pega todo el bloque (productos, servicios y seguimiento) sin dependencias externas.'}
                    </p>

                    {/* Bloque de código estilo terminal */}
                    <div className="rounded-xl border border-white/10 overflow-hidden min-w-0 bg-[#020308]">
                        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#E0B84D]/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-[#19B5FE]/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                <span className="ml-2 text-[10px] font-mono text-white/40">
                                    {embedTab === 'hosted' ? 'vinzer-widget.html' : 'vinzer-widget-full.html'}
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
