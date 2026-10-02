"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Heart,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle,
    X,
    Sparkles,
    Pencil,
    Upload,
    Star,
    ImageOff,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Plus,
    Building2,
    Lock,
    Copy,
    Link2,
    ChevronDown,
    Check,
    Search,
    Globe,
    Instagram,
    Facebook,
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';
import { motion, AnimatePresence } from 'framer-motion';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';

const TikTokIcon = ({ size = 13, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

const SOCIAL_TAGS = [
    { tag: '{sitio_web}', label: 'Sitio Web', icon: Globe, badgeClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20' },
    { tag: '{instagram}', label: 'Instagram', icon: Instagram, badgeClass: 'text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20' },
    { tag: '{tiktok}', label: 'TikTok', icon: TikTokIcon, badgeClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20' },
    { tag: '{facebook}', label: 'Facebook', icon: Facebook, badgeClass: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' },
];

const TENANT_LOGO_PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <circle cx="80" cy="80" r="74" fill="#0f172a" stroke="#d4af37" stroke-width="4"/>
  <path d="M80 32 L88 54 L112 54 L93 69 L100 91 L80 77 L60 91 L67 69 L48 54 L72 54 Z" fill="#d4af37"/>
  <text x="80" y="116" font-size="12" font-weight="900" font-family="sans-serif" fill="#f8fafc" text-anchor="middle" letter-spacing="1.5">LOGO EMPRESA</text>
  <text x="80" y="132" font-size="8.5" font-weight="700" font-family="sans-serif" fill="#94a3b8" text-anchor="middle" letter-spacing="1">CREMATORIO</text>
</svg>
`);

const LOGO_POSITIONS = [
    { value: 'top-left', label: 'Sup. Izquierda' },
    { value: 'top-center', label: 'Sup. Centro' },
    { value: 'top-right', label: 'Sup. Derecha' },
    { value: 'bottom-left', label: 'Inf. Izquierda' },
    { value: 'bottom-center', label: 'Inf. Centro' },
    { value: 'bottom-right', label: 'Inf. Derecha' },
];

interface FarewellTemplate {
    id: number;
    tenant_id: number | null;
    name: string;
    description: string | null;
    config: any;
    preview_url: string | null;
    is_default: boolean;
    is_locked?: boolean;
    created_at: string;
    /** Nombre del crematorio dueño (solo exclusivas) */
    tenant_name?: string | null;
    /** Crematorios cuyo formulario usa esta tarjeta */
    form_tenants?: { id: number; name: string; explicit: boolean }[];
    /** Es la global que usan los crematorios sin tarjeta asignada */
    is_form_fallback?: boolean;
}

type TenantLite = { id: number; name: string; slug: string };

const DEFAULT_NEW_TEMPLATE: FarewellTemplate = {
    id: 0,
    tenant_id: null,
    name: 'Nueva Plantilla de Despedida',
    description: 'Diseño conmemorativo personalizado',
    is_default: false,
    preview_url: null,
    created_at: new Date().toISOString(),
    config: {
        format: '1:1',
        theme: 'calm',
        elements: {
            petName: 'Nombre de Mascota',
            petNameX: 0,
            petNameY: -10,
            subtitle: 'Siempre en nuestros corazones',
            subtitleX: 0,
            subtitleY: 50,
            farewellText: 'Gracias por cada instante de ternura y lealtad. Tu recuerdo vivirá por siempre en nuestra memoria.',
            farewellTextX: 0,
            farewellTextY: 95,
            image2Url: null,
            image2X: 0,
            image2Y: -140,
            tenantName: '',
            tenantNameX: 0,
            tenantNameY: 200,
            tenantWebsite: '',
            tenantWebsiteX: 0,
            tenantWebsiteY: 222,
        },
        styles: {
            background: '#FDFBF7',
            color: '#2D3748',
            font: 'serif',
        },
        petNameFormatting: {
            fontSize: 36,
            fontFamily: 'Playfair Display',
        },
        subtitleFormatting: {
            fontSize: 16,
        },
        textFormatting: {
            fontSize: 14,
            width: 480,
        },
        frame: {
            enabled: true,
            color: '#d4af37',
            width: 6,
            margin: 8,
        },
        imageSettings: {
            image1: {
                shape: 'circle',
                borderColor: '#d4af37',
                borderWidth: 3,
                glow: { enabled: true, color: 'rgba(212,175,55,0.65)', size: 24 },
                size: 160,
            },
            image2: {
                shape: 'circle',
                borderColor: '#d4af37',
                borderWidth: 3,
                glow: { enabled: true, color: 'rgba(212,175,55,0.65)', size: 24 },
                size: 160,
            },
        },
        backgroundImage: {
            url: null,
            opacity: 0,
        },
        tenantLogo: {
            enabled: true,
            position: 'bottom-center',
            size: 65,
            x: 0,
            y: 0,
            opacity: 0.95,
        },
        tenantNameFormatting: {
            enabled: true,
            fontSize: 14,
            bold: true,
            uppercase: true,
            letterSpacing: 1.2,
        },
        tenantWebsiteFormatting: {
            enabled: true,
            fontSize: 11,
            bold: false,
            letterSpacing: 0.5,
        },
    },
};

const API = '/api/internal/creator/farewell-templates';

export default function FarewellTemplatesAdminPage() {
    const [templates, setTemplates] = useState<FarewellTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
    const [editing, setEditing] = useState<FarewellTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    // "Formulario de un crematorio": copia exclusiva o usar tal cual
    const [assigning, setAssigning] = useState<FarewellTemplate | null>(null);
    // Confirmación en la propia tarjeta: "t:<id>" = retirar exclusiva, "a:<tplId>:<tenantId>" = quitar asignación
    const [confirmRetire, setConfirmRetire] = useState<string | null>(null);
    const [retiring, setRetiring] = useState<string | null>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3500);
    };

    const fetchTemplates = async (): Promise<FarewellTemplate[]> => {
        try {
            setLoading(true);
            const data: FarewellTemplate[] = (await apiRequest(API)) || [];
            setTemplates(data);
            return data;
        } catch (err: any) {
            showToast(err.message || 'Error al cargar plantillas', 'error');
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleSetDefault = async (template: FarewellTemplate, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (template.is_default) return;
        setSettingDefaultId(template.id);
        try {
            await apiRequest(`${API}/${template.id}`, {
                method: 'PATCH',
                body: { is_default: true }
            });
            showToast(`"${template.name}" ahora es la plantilla predeterminada`, 'success');
            fetchTemplates();
        } catch (err: any) {
            showToast(err.message || 'Error al establecer plantilla predeterminada', 'error');
        } finally {
            setSettingDefaultId(null);
        }
    };

    const handleCustomize = async (template: FarewellTemplate, tenantId: number) => {
        const copy: FarewellTemplate = await apiRequest(`${API}/${template.id}/customize`, {
            method: 'POST',
            body: { tenant_id: tenantId },
        });
        setAssigning(null);
        const fresh = await fetchTemplates();
        showToast('Copia exclusiva creada y asignada a su formulario', 'success');
        setEditing(fresh.find((t) => t.id === copy.id) || copy); // abrir el editor para personalizarla
    };

    const handleAssign = async (templateId: number | null, tenantId: number) => {
        await apiRequest(`${API}/form-assignment`, {
            method: 'PUT',
            body: { tenant_id: tenantId, template_id: templateId },
        });
        setAssigning(null);
        await fetchTemplates();
        showToast(templateId ? 'Tarjeta asignada al formulario' : 'El formulario vuelve a la tarjeta predeterminada', 'success');
    };

    // Exclusiva: se elimina la copia y el formulario del crematorio vuelve a la predeterminada
    const handleRetireExclusive = async (template: FarewellTemplate) => {
        const key = `t:${template.id}`;
        setRetiring(key);
        try {
            await apiRequest(`${API}/${template.id}`, { method: 'DELETE' });
            showToast(`Tarjeta retirada de ${template.tenant_name || 'el crematorio'}`, 'success');
            setConfirmRetire(null);
            fetchTemplates();
        } catch (err: any) {
            showToast(err.message || 'Error al retirar', 'error');
        } finally {
            setRetiring(null);
        }
    };

    // Global asignada: se quita solo de ese formulario
    const handleUnassign = async (template: FarewellTemplate, tenant: { id: number; name: string }) => {
        const key = `a:${template.id}:${tenant.id}`;
        setRetiring(key);
        try {
            await handleAssign(null, tenant.id);
            showToast(`"${template.name}" retirada del formulario de ${tenant.name}`, 'success');
            setConfirmRetire(null);
        } catch (err: any) {
            showToast(err.message || 'Error al retirar', 'error');
        } finally {
            setRetiring(null);
        }
    };

    const handleDelete = async (template: FarewellTemplate) => {
        if (!confirm(`¿Eliminar la plantilla "${template.name}"? Esta acción no se puede deshacer.`)) return;
        setDeletingId(template.id);
        try {
            await apiRequest(`${API}/${template.id}`, { method: 'DELETE' });
            showToast('Plantilla eliminada correctamente', 'success');
            fetchTemplates();
        } catch (err: any) {
            showToast(err.message || 'Error al eliminar', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
                            message.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                    >
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-bold text-sm">{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70 transition-opacity">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-3">
                        <Sparkles className="text-primary" size={11} aria-hidden="true" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.22em]">Uso en Tenant: Formulario Web de Clientes y Módulo Homenajes</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Tarjetas de Homenaje</h1>
                    <p className="text-white/40 mt-2 font-medium max-w-2xl">
                        Crea y personaliza las tarjetas conmemorativas que eligen los familiares al registrar a su mascota o desde el portal de despedidas.
                    </p>
                </div>

                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-black py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all self-start md:self-center cursor-pointer"
                >
                    <Plus size={16} />
                    Nueva Plantilla
                </button>
            </header>

            {/* Content */}
            <div className="bg-[#0a192f] border border-white/5 rounded-[2.5rem] p-8 min-h-[400px]">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-4 text-white/20">
                        <Loader2 className="animate-spin text-primary" size={48} aria-hidden="true" />
                        <span className="font-bold uppercase tracking-widest text-xs">Cargando plantillas…</span>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5 text-primary">
                            <Heart size={36} />
                        </div>
                        <p className="text-lg font-black text-white mb-2">Esperando sincronización del sistema</p>
                        <p className="text-sm text-white/40 max-w-md">
                            Las plantillas de despedida se registran por código. Ejecuta el script de sembrado en el backend para publicarlas.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => {
                            const isExclusive = template.tenant_id != null;
                            const formTenants = template.form_tenants || [];
                            const cfg = template.config || {};
                            const bg = cfg.styles?.background || '#1a1a1a';
                            const color = cfg.styles?.color || '#fff';
                            const bgImage = cfg.backgroundImage?.url ? getImageUrl(cfg.backgroundImage.url) : null;
                            const bgOpacity = cfg.backgroundImage?.opacity ?? 0;
                            const previewUrl = template.preview_url ? getImageUrl(template.preview_url) : null;

                            return (
                                <article
                                    key={template.id}
                                    className="group relative bg-white/[0.02] rounded-3xl border border-white/[0.06] hover:border-primary/30 transition-all overflow-hidden flex flex-col hover:shadow-xl hover:shadow-primary/5"
                                >
                                    <div
                                        className="aspect-square relative overflow-hidden border-b border-white/[0.06]"
                                        style={{ backgroundColor: bg }}
                                    >
                                        {bgImage && (
                                            <div
                                                className="absolute inset-0 bg-center bg-cover"
                                                style={{ backgroundImage: `url(${bgImage})`, opacity: bgOpacity }}
                                            />
                                        )}
                                        {previewUrl ? (
                                            <img src={previewUrl} alt={template.name} className="relative w-full h-full object-cover" />
                                        ) : (
                                            <div
                                                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                                                style={{ color }}
                                            >
                                                <p
                                                    className="text-2xl font-bold tracking-tight mb-2"
                                                    style={{ fontFamily: cfg.styles?.font === 'serif' ? 'serif' : 'sans-serif' }}
                                                >
                                                    {cfg.elements?.petName || 'Mascota'}
                                                </p>
                                                <p
                                                    className="text-xs italic opacity-80 line-clamp-3"
                                                    style={{ fontFamily: cfg.styles?.font === 'serif' ? 'serif' : 'sans-serif' }}
                                                >
                                                    {cfg.elements?.farewellText || 'Mensaje de despedida'}
                                                </p>
                                            </div>
                                        )}
                                        {isExclusive ? (
                                            <span className="absolute top-3 right-3 text-[9px] bg-amber-400/90 text-slate-950 px-2.5 py-1 rounded-full font-black uppercase tracking-[0.12em] shadow-lg flex items-center gap-1 max-w-[70%] truncate" title={`Exclusiva de ${template.tenant_name || 'un crematorio'}`}>
                                                <Lock size={10} /> {template.tenant_name || 'Exclusiva'}
                                            </span>
                                        ) : template.is_default ? (
                                            <span className="absolute top-3 right-3 text-[9px] bg-amber-500 text-slate-950 px-2.5 py-1 rounded-full font-black uppercase tracking-[0.16em] shadow-lg flex items-center gap-1">
                                                <Star size={10} className="fill-slate-950" /> Predeterminada
                                            </span>
                                        ) : (
                                            <button
                                                onClick={(e) => handleSetDefault(template, e)}
                                                disabled={settingDefaultId === template.id}
                                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] bg-black/60 hover:bg-black/90 text-white/80 hover:text-amber-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-[0.12em] backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-lg"
                                                title="Hacer predeterminada"
                                            >
                                                {settingDefaultId === template.id ? (
                                                    <Loader2 size={10} className="animate-spin" />
                                                ) : (
                                                    <Star size={10} />
                                                )}
                                                Hacer Default
                                            </button>
                                        )}
                                        {formTenants.length > 0 && (
                                            <span className="absolute top-3 left-3 text-[9px] bg-primary text-white px-2.5 py-1 rounded-full font-black uppercase tracking-[0.14em] shadow-lg flex items-center gap-1">
                                                <Sparkles size={9} /> Formulario Web
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className="text-base font-black text-white tracking-tight truncate flex-1">
                                                {template.name}
                                            </h4>
                                        </div>
                                        <p className="text-xs text-white/50 line-clamp-2 mb-4 flex-1">
                                            {template.description || 'Sin descripción'}
                                        </p>

                                        {formTenants.length > 0 && (
                                            <div className="mb-3 rounded-xl bg-primary/[0.06] border border-primary/15 px-3 py-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-primary/80 mb-1">
                                                    Formulario de {template.is_form_fallback && !isExclusive ? '(predeterminada)' : ''}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {formTenants.map((t) => {
                                                        const key = `a:${template.id}:${t.id}`;
                                                        const canRemove = !isExclusive && t.explicit;
                                                        if (confirmRetire === key) {
                                                            return (
                                                                <span key={t.id} className="inline-flex items-center gap-1.5 text-[11px] bg-red-500/10 border border-red-500/25 rounded-md pl-2 pr-1 py-0.5 text-red-200">
                                                                    ¿Quitar de {t.name}?
                                                                    <button onClick={() => handleUnassign(template, t)} disabled={retiring === key} className="font-black text-red-300 hover:text-white px-1">
                                                                        {retiring === key ? <Loader2 size={11} className="animate-spin" /> : 'Sí'}
                                                                    </button>
                                                                    <button onClick={() => setConfirmRetire(null)} className="text-white/40 hover:text-white px-1">No</button>
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span key={t.id} className="inline-flex items-center gap-1 text-[11px] text-white/75 bg-white/5 border border-white/10 rounded-md pl-2 pr-1 py-0.5">
                                                                {t.name}
                                                                {canRemove ? (
                                                                    <button
                                                                        onClick={() => setConfirmRetire(key)}
                                                                        className="text-white/30 hover:text-red-400 p-0.5"
                                                                        title={`Retirar del formulario de ${t.name}`}
                                                                        aria-label={`Retirar del formulario de ${t.name}`}
                                                                    >
                                                                        <X size={11} />
                                                                    </button>
                                                                ) : <span className="w-1" />}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 flex-wrap mb-4">
                                            {template.is_default && (
                                                <span className="text-[9px] bg-amber-500/15 text-amber-300 px-2 py-1 rounded-md font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
                                                    <Star size={9} className="fill-amber-300" /> Default del sistema
                                                </span>
                                            )}
                                            <span className="text-[9px] bg-white/5 text-white/60 px-2 py-1 rounded-md font-black uppercase tracking-wider border border-white/[0.06]">
                                                {cfg.format || '1:1'}
                                            </span>
                                            {cfg.theme && (
                                                <span className="text-[9px] bg-white/5 text-white/60 px-2 py-1 rounded-md font-black uppercase tracking-wider border border-white/[0.06]">
                                                    {cfg.theme}
                                                </span>
                                            )}
                                            {cfg.frame?.enabled && (
                                                <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded-md font-black uppercase tracking-wider border border-amber-500/15">
                                                    Marco
                                                </span>
                                            )}
                                            {bgImage && (
                                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md font-black uppercase tracking-wider border border-emerald-500/15">
                                                    Fondo
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <button
                                                onClick={() => setAssigning(template)}
                                                className="w-full flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                title={isExclusive ? 'Asignar al formulario de su crematorio' : 'Personalizar o asignar a un crematorio'}
                                            >
                                                <Building2 size={13} /> {isExclusive ? 'Asignar a su formulario' : 'Personalizar para un crematorio'}
                                            </button>
                                            {!template.is_default && !isExclusive && (
                                                <button
                                                    onClick={(e) => handleSetDefault(template, e)}
                                                    disabled={settingDefaultId === template.id}
                                                    className="flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                                                    title="Establecer como predeterminada"
                                                >
                                                    {settingDefaultId === template.id ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <Star size={13} />
                                                    )}
                                                    Default
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setEditing(template)}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                                            >
                                                <Pencil size={13} /> Editar
                                            </button>
                                            {isExclusive ? (
                                                confirmRetire === `t:${template.id}` ? (
                                                    <div className="w-full flex items-center justify-between gap-2 rounded-xl bg-red-500/10 border border-red-500/25 px-3 py-2">
                                                        <span className="text-[11px] text-red-200">
                                                            ¿Retirar de {template.tenant_name || 'este crematorio'}? Su formulario usará otra de sus tarjetas o la predeterminada.
                                                        </span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button onClick={() => setConfirmRetire(null)} className="text-[11px] font-bold text-white/50 hover:text-white px-2 py-1">No</button>
                                                            <button
                                                                onClick={() => handleRetireExclusive(template)}
                                                                disabled={retiring === `t:${template.id}`}
                                                                className="text-[11px] font-black text-white bg-red-500 hover:bg-red-400 rounded-lg px-2.5 py-1 flex items-center gap-1"
                                                            >
                                                                {retiring === `t:${template.id}` && <Loader2 size={11} className="animate-spin" />} Retirar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmRetire(`t:${template.id}`)}
                                                        className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                        title={`Retirar la tarjeta de ${template.tenant_name || 'este crematorio'}`}
                                                    >
                                                        <Trash2 size={13} /> Retirar
                                                    </button>
                                                )
                                            ) : (
                                            <button
                                                onClick={() => handleDelete(template)}
                                                disabled={deletingId === template.id}
                                                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 transition-all active:scale-90 disabled:opacity-50"
                                                title="Eliminar"
                                            >
                                                {deletingId === template.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {assigning && (
                    <AssignModal
                        template={assigning}
                        onClose={() => setAssigning(null)}
                        onCustomize={handleCustomize}
                        onAssign={handleAssign}
                        onError={(msg) => showToast(msg, 'error')}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {(editing || isCreating) && (
                    <EditModal
                        template={editing || DEFAULT_NEW_TEMPLATE}
                        isNew={isCreating}
                        onClose={() => {
                            setEditing(null);
                            setIsCreating(false);
                        }}
                        onSaved={() => {
                            const wasCreating = isCreating;
                            setEditing(null);
                            setIsCreating(false);
                            fetchTemplates();
                            showToast(wasCreating ? 'Plantilla creada correctamente' : 'Plantilla actualizada', 'success');
                        }}
                        onError={(msg) => showToast(msg, 'error')}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


type Ratio = '1:1' | '9:16' | '3:4' | '4:3';
type Shape = 'circle' | 'square' | 'rounded';
type FontKey = 'serif' | 'sans-serif';

const RATIOS: { value: Ratio; label: string }[] = [
    { value: '1:1', label: 'Cuadrado' },
    { value: '9:16', label: 'Vertical' },
    { value: '3:4', label: 'Retrato' },
    { value: '4:3', label: 'Apaisado' },
];

const FONT_OPTIONS: { value: FontKey; label: string; sample: string }[] = [
    { value: 'serif', label: 'Serif clásica', sample: 'Aa' },
    { value: 'sans-serif', label: 'Sans moderna', sample: 'Aa' },
];

const SHAPE_OPTIONS: { value: Shape; label: string }[] = [
    { value: 'circle', label: 'Circular' },
    { value: 'square', label: 'Cuadrado' },
    { value: 'rounded', label: 'Redondeado' },
];

const PET_NAME_FONTS = [
    { value: '', label: 'Predeterminada (General del diseño)' },
    { value: 'Playfair Display', label: 'Playfair Display (Serif Elegante)' },
    { value: 'Cormorant Garamond', label: 'Cormorant Garamond (Serif Premium)' },
    { value: 'Lora', label: 'Lora (Serif Clásica)' },
    { value: 'Cinzel', label: 'Cinzel (Serif Imperial)' },
    { value: 'Great Vibes', label: 'Great Vibes (Caligrafía)' },
    { value: 'Dancing Script', label: 'Dancing Script (Cursiva Casual)' },
    { value: 'Montserrat', label: 'Montserrat (Sans Moderna)' },
];

const FRAME_STYLES = [
    { value: 'solid', label: 'Continua' },
    { value: 'double', label: 'Doble' },
    { value: 'dashed', label: 'Guiones' },
    { value: 'dotted', label: 'Puntos' },
];

const WEBSITE_WEIGHTS = [
    { value: 300, label: 'Delgada' },
    { value: 400, label: 'Normal' },
    { value: 600, label: 'Semi negrita' },
    { value: 700, label: 'Negrita' },
    { value: 800, label: 'Extra negrita' },
];

const PRESET_COLORS = [
    '#FDFBF7', '#F5F5F0', '#FFFFFF',
    '#1a2332', '#121212', '#0f172a',
    '#2D3748', '#3d4a5c', '#7c8896',
    '#d4af37', '#c9a96e', '#b87333',
    '#eef2f7', '#e5e7eb', '#cbd5e1',
];

// Silueta inline (SVG) que marca dónde aparecerá la foto real de la mascota
// cuando el tenant la suba. Solo se inyecta en el preview del admin.
const PET_PLACEHOLDER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#cbd5e1"/>
        <circle cx="100" cy="80" r="32" fill="#94a3b8"/>
        <path d="M40 180 Q40 120 100 120 Q160 120 160 180 Z" fill="#94a3b8"/>
        <text x="100" y="195" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#475569" font-weight="bold">FOTO MASCOTA</text>
    </svg>`,
)}`;

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 bg-transparent rounded-lg border border-white/10 cursor-pointer p-0"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 h-10 bg-black/30 border border-white/10 rounded-lg px-3 text-white text-xs font-mono outline-none focus:border-primary/40"
                />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_COLORS.map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => onChange(c)}
                        className="w-5 h-5 rounded border border-white/15 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))}
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 pb-5 border-b border-white/[0.06] last:border-b-0">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.22em]">{title}</h3>
            {children}
        </section>
    );
}

const getDimensions = (formatValue: Ratio) => {
    const baseHeight = 550;
    switch (formatValue) {
        case '1:1': return { width: baseHeight, height: baseHeight };
        case '9:16': return { width: baseHeight * (9 / 16), height: baseHeight };
        case '3:4': return { width: baseHeight * (3 / 4), height: baseHeight };
        case '4:3': return { width: baseHeight, height: baseHeight * (3 / 4) };
        default: return { width: baseHeight, height: baseHeight };
    }
};

function EditModal({
    template,
    isNew = false,
    onClose,
    onSaved,
    onError,
}: {
    template: FarewellTemplate;
    isNew?: boolean;
    onClose: () => void;
    onSaved: () => void;
    onError: (msg: string) => void;
}) {
    const baseConfig = template.config || {};

    const [name, setName] = useState(template.name);
    const [description, setDescription] = useState(template.description || '');
    const [isDefault, setIsDefault] = useState(template.is_default);

    const [petNamePlaceholder, setPetNamePlaceholder] = useState<string>(baseConfig.elements?.petName || 'Nombre de Mascota');
    const [subtitleText, setSubtitleText] = useState<string>(baseConfig.elements?.subtitle || '');
    const [farewellDefault, setFarewellDefault] = useState<string>(baseConfig.elements?.farewellText || '');

    const [format, setFormat] = useState<Ratio>((baseConfig.format as Ratio) || '1:1');
    const [bgColor, setBgColor] = useState<string>(baseConfig.styles?.background || '#FDFBF7');
    const [textColor, setTextColor] = useState<string>(baseConfig.styles?.color || '#2D3748');
    const [font, setFont] = useState<FontKey>((baseConfig.styles?.font as FontKey) || 'serif');

    const [bgUrl, setBgUrl] = useState<string | null>(baseConfig.backgroundImage?.url || null);
    const [bgOpacity, setBgOpacity] = useState<number>(
        typeof baseConfig.backgroundImage?.opacity === 'number' ? baseConfig.backgroundImage.opacity : 0.4,
    );

    const [photoShape, setPhotoShape] = useState<Shape>((baseConfig.imageSettings?.image2?.shape as Shape) || (baseConfig.imageSettings?.image1?.shape as Shape) || 'circle');
    const [photoBorderColor, setPhotoBorderColor] = useState<string>(baseConfig.imageSettings?.image2?.borderColor || baseConfig.imageSettings?.image1?.borderColor || '#d4af37');
    const [photoBorderWidth, setPhotoBorderWidth] = useState<number>(baseConfig.imageSettings?.image2?.borderWidth ?? baseConfig.imageSettings?.image1?.borderWidth ?? 3);
    const [glowEnabled, setGlowEnabled] = useState<boolean>(!!(baseConfig.imageSettings?.image2?.glow?.enabled || baseConfig.imageSettings?.image1?.glow?.enabled));
    const [glowColor, setGlowColor] = useState<string>(baseConfig.imageSettings?.image2?.glow?.color || baseConfig.imageSettings?.image1?.glow?.color || 'rgba(212,175,55,0.65)');
    const [glowSize, setGlowSize] = useState<number>(baseConfig.imageSettings?.image2?.glow?.size ?? baseConfig.imageSettings?.image1?.glow?.size ?? 24);

    const [photoSize, setPhotoSize] = useState<number>(baseConfig.imageSettings?.image2?.size ?? baseConfig.imageSettings?.image1?.size ?? 160);
    const [photoX, setPhotoX] = useState<number>(baseConfig.elements?.image2X ?? 0);
    const [photoY, setPhotoY] = useState<number>(baseConfig.elements?.image2Y ?? 0);

    const [frameEnabled, setFrameEnabled] = useState<boolean>(!!baseConfig.frame?.enabled);
    const [frameColor, setFrameColor] = useState<string>(baseConfig.frame?.color || '#d4af37');
    const [frameWidth, setFrameWidth] = useState<number>(baseConfig.frame?.width ?? 8);
    const [frameMargin, setFrameMargin] = useState<number>(baseConfig.frame?.margin ?? 8);
    const [frameRadius, setFrameRadius] = useState<number>(baseConfig.frame?.radius ?? 0);
    const [frameOpacity, setFrameOpacity] = useState<number>(
        typeof baseConfig.frame?.opacity === 'number' ? baseConfig.frame.opacity : 1
    );
    const [frameStyle, setFrameStyle] = useState<string>(baseConfig.frame?.style || 'solid');

    const [petNameFontSize, setPetNameFontSize] = useState<number>(baseConfig.petNameFormatting?.fontSize ?? 36);
    const [petNameX, setPetNameX] = useState<number>(baseConfig.elements?.petNameX ?? 0);
    const [petNameY, setPetNameY] = useState<number>(baseConfig.elements?.petNameY ?? 0);
    const [petNameFontFamily, setPetNameFontFamily] = useState<string>(baseConfig.petNameFormatting?.fontFamily || '');

    const [subtitleFontSize, setSubtitleFontSize] = useState<number>(baseConfig.subtitleFormatting?.fontSize ?? 18);
    const [subtitleX, setSubtitleX] = useState<number>(baseConfig.elements?.subtitleX ?? 0);
    const [subtitleY, setSubtitleY] = useState<number>(baseConfig.elements?.subtitleY ?? 40);

    const [farewellFontSize, setFarewellFontSize] = useState<number>(baseConfig.textFormatting?.fontSize ?? 14);
    const [farewellX, setFarewellX] = useState<number>(baseConfig.elements?.farewellTextX ?? 0);
    const [farewellY, setFarewellY] = useState<number>(baseConfig.elements?.farewellTextY ?? 0);
    const [farewellWidth, setFarewellWidth] = useState<number>(baseConfig.textFormatting?.width ?? 480);

    const [logoEnabled, setLogoEnabled] = useState<boolean>(baseConfig.tenantLogo?.enabled !== undefined ? !!baseConfig.tenantLogo.enabled : true);
    const [logoPosition, setLogoPosition] = useState<string>(baseConfig.tenantLogo?.position || 'bottom-center');
    const [logoSize, setLogoSize] = useState<number>(baseConfig.tenantLogo?.size ?? 65);
    const [logoX, setLogoX] = useState<number>(baseConfig.tenantLogo?.x ?? 0);
    const [logoY, setLogoY] = useState<number>(baseConfig.tenantLogo?.y ?? 0);
    const [logoOpacity, setLogoOpacity] = useState<number>(
        typeof baseConfig.tenantLogo?.opacity === 'number' ? baseConfig.tenantLogo.opacity : 0.95
    );

    // Nombre del Crematorio
    const [tenantNameEnabled, setTenantNameEnabled] = useState<boolean>(
        baseConfig.tenantNameFormatting?.enabled !== undefined
            ? !!baseConfig.tenantNameFormatting.enabled
            : !!(baseConfig.elements?.tenantName || template.tenant_name)
    );
    const [tenantNameText, setTenantNameText] = useState<string>(
        baseConfig.elements?.tenantName ?? (template.tenant_name || '')
    );
    const [tenantNameFontSize, setTenantNameFontSize] = useState<number>(
        baseConfig.tenantNameFormatting?.fontSize ?? 14
    );
    const [tenantNameX, setTenantNameX] = useState<number>(baseConfig.elements?.tenantNameX ?? 0);
    const [tenantNameY, setTenantNameY] = useState<number>(baseConfig.elements?.tenantNameY ?? 200);
    const [tenantNameBold, setTenantNameBold] = useState<boolean>(
        baseConfig.tenantNameFormatting?.bold ?? true
    );
    const [tenantNameUppercase, setTenantNameUppercase] = useState<boolean>(
        baseConfig.tenantNameFormatting?.uppercase ?? true
    );

    // Sitio Web o Red Social
    const [tenantWebsiteEnabled, setTenantWebsiteEnabled] = useState<boolean>(
        baseConfig.tenantWebsiteFormatting?.enabled !== undefined
            ? !!baseConfig.tenantWebsiteFormatting.enabled
            : !!baseConfig.elements?.tenantWebsite
    );
    const [tenantWebsiteText, setTenantWebsiteText] = useState<string>(
        baseConfig.elements?.tenantWebsite || (baseConfig.tenantWebsiteFormatting?.enabled ? '{sitio_web}' : '')
    );
    const [tenantWebsiteFontSize, setTenantWebsiteFontSize] = useState<number>(
        baseConfig.tenantWebsiteFormatting?.fontSize ?? 11
    );
    const [tenantWebsiteX, setTenantWebsiteX] = useState<number>(baseConfig.elements?.tenantWebsiteX ?? 0);
    const [tenantWebsiteY, setTenantWebsiteY] = useState<number>(baseConfig.elements?.tenantWebsiteY ?? 222);
    const [tenantWebsiteWeight, setTenantWebsiteWeight] = useState<number>(
        baseConfig.tenantWebsiteFormatting?.fontWeight ?? (baseConfig.tenantWebsiteFormatting?.bold ? 700 : 400)
    );
    const [tenantWebsiteFontFamily, setTenantWebsiteFontFamily] = useState<string>(
        baseConfig.tenantWebsiteFormatting?.fontFamily || ''
    );
    // '' = color general del diseño
    const [tenantWebsiteColor, setTenantWebsiteColor] = useState<string>(
        baseConfig.tenantWebsiteFormatting?.color || ''
    );
    // '' = sin fondo
    const [tenantWebsiteBg, setTenantWebsiteBg] = useState<string>(
        baseConfig.tenantWebsiteFormatting?.backgroundColor || ''
    );

    const [previewZoom, setPreviewZoom] = useState<number>(0.55);

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            onError('Selecciona un archivo de imagen');
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await apiRequest(`${API}/upload-background`, { method: 'POST', body: fd });
            if (!res?.url) throw new Error('Respuesta inválida del servidor');
            setBgUrl(res.url);
            if (bgOpacity === 0) setBgOpacity(0.4);
        } catch (err: any) {
            onError(err.message || 'Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const buildNextConfig = () => {
        const prev = baseConfig;
        const imageSettingsBase = prev.imageSettings || {};
        const glow = { enabled: glowEnabled, color: glowColor, size: glowSize };
        return {
            ...prev,
            format,
            elements: {
                ...(prev.elements || {}),
                petName: petNamePlaceholder,
                subtitle: subtitleText,
                farewellText: farewellDefault,
                image2X: photoX,
                image2Y: photoY,
                petNameX,
                petNameY,
                subtitleX,
                subtitleY,
                farewellTextX: farewellX,
                farewellTextY: farewellY,
                tenantName: tenantNameEnabled ? (tenantNameText.trim() || (template.tenant_name || '')) : '',
                tenantNameX,
                tenantNameY,
                tenantWebsite: tenantWebsiteEnabled ? (tenantWebsiteText.trim() || '{sitio_web}') : '',
                tenantWebsiteX,
                tenantWebsiteY,
            },
            styles: {
                ...(prev.styles || {}),
                font,
                background: bgColor,
                color: textColor,
            },
            petNameFormatting: {
                ...(prev.petNameFormatting || {}),
                fontSize: petNameFontSize,
                fontFamily: petNameFontFamily || undefined,
            },
            subtitleFormatting: {
                ...(prev.subtitleFormatting || {}),
                fontSize: subtitleFontSize,
            },
            textFormatting: {
                ...(prev.textFormatting || {}),
                fontSize: farewellFontSize,
                width: farewellWidth,
            },
            frame: {
                ...(prev.frame || {}),
                enabled: frameEnabled,
                color: frameColor,
                width: frameWidth,
                margin: frameMargin,
                radius: frameRadius,
                opacity: frameOpacity,
                style: frameStyle,
            },
            tenantLogo: {
                ...(prev.tenantLogo || {}),
                enabled: logoEnabled,
                position: logoPosition,
                size: logoSize,
                x: logoX,
                y: logoY,
                opacity: logoOpacity,
            },
            tenantNameFormatting: {
                ...(prev.tenantNameFormatting || {}),
                enabled: tenantNameEnabled,
                fontSize: tenantNameFontSize,
                bold: tenantNameBold,
                uppercase: tenantNameUppercase,
            },
            tenantWebsiteFormatting: {
                ...(prev.tenantWebsiteFormatting || {}),
                enabled: tenantWebsiteEnabled,
                fontSize: tenantWebsiteFontSize,
                fontWeight: tenantWebsiteWeight,
                bold: tenantWebsiteWeight >= 600,
                fontFamily: tenantWebsiteFontFamily || undefined,
                color: tenantWebsiteColor || undefined,
                backgroundColor: tenantWebsiteBg || undefined,
            },
            imageSettings: {
                ...imageSettingsBase,
                image1: {
                    ...(imageSettingsBase.image1 || {}),
                    shape: photoShape,
                    borderColor: photoBorderColor,
                    borderWidth: photoBorderWidth,
                    glow,
                    size: photoSize,
                },
                image2: {
                    ...(imageSettingsBase.image2 || {}),
                    shape: photoShape,
                    borderColor: photoBorderColor,
                    borderWidth: photoBorderWidth,
                    glow,
                    size: photoSize,
                    width: undefined,
                    height: undefined,
                },
            },
            backgroundImage: {
                ...(prev.backgroundImage || { size: 'cover', filter: 'none' }),
                url: bgUrl,
                opacity: bgUrl ? bgOpacity : 0,
            },
        };
    };

    const previewConfig = useMemo(() => {
        const c = buildNextConfig();
        return {
            ...c,
            elements: {
                ...(c.elements || {}),
                petName: petNamePlaceholder || 'Luna',
                subtitle: subtitleText || '— · —',
                farewellText: farewellDefault || 'Aquí va la frase que el tenant podrá editar para cada despedida.',
                // Inyectamos la silueta solo para que el SuperAdmin vea dónde
                // aparecerá la foto real del tenant. No se persiste.
                image2Url: PET_PLACEHOLDER_SVG,
                tenantName: tenantNameEnabled
                    ? (tenantNameText || (template.tenant_name || 'Nombre del Crematorio'))
                    : '',
                tenantWebsite: tenantWebsiteEnabled
                    ? (tenantWebsiteText || '{sitio_web}')
                    : '',
            },
            tenantLogo: {
                ...c.tenantLogo,
                enabled: logoEnabled,
                position: logoPosition,
                size: logoSize,
                x: logoX,
                y: logoY,
                opacity: logoOpacity,
                sampleUrl: TENANT_LOGO_PLACEHOLDER_SVG,
            },
            tenantNameFormatting: {
                ...(c.tenantNameFormatting || {}),
                enabled: tenantNameEnabled,
                fontSize: tenantNameFontSize,
                bold: tenantNameBold,
                uppercase: tenantNameUppercase,
            },
            tenantWebsiteFormatting: {
                ...(c.tenantWebsiteFormatting || {}),
                enabled: tenantWebsiteEnabled,
                fontSize: tenantWebsiteFontSize,
                fontWeight: tenantWebsiteWeight,
                bold: tenantWebsiteWeight >= 600,
                fontFamily: tenantWebsiteFontFamily || undefined,
                color: tenantWebsiteColor || undefined,
                backgroundColor: tenantWebsiteBg || undefined,
            },
            imageSettings: {
                ...c.imageSettings,
                image2: {
                    ...c.imageSettings.image2,
                    size: photoSize,
                },
            },
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [format, bgColor, textColor, font, bgUrl, bgOpacity, photoShape, photoBorderColor, photoBorderWidth, glowEnabled, glowColor, glowSize, frameEnabled, frameColor, frameWidth, frameMargin, frameRadius, frameOpacity, frameStyle, petNamePlaceholder, subtitleText, farewellDefault, photoSize, photoX, photoY, petNameFontSize, petNameX, petNameY, subtitleFontSize, subtitleX, subtitleY, farewellFontSize, farewellX, farewellY, farewellWidth, petNameFontFamily, logoEnabled, logoPosition, logoSize, logoX, logoY, logoOpacity, tenantNameEnabled, tenantNameText, tenantNameFontSize, tenantNameX, tenantNameY, tenantNameBold, tenantNameUppercase, tenantWebsiteEnabled, tenantWebsiteText, tenantWebsiteFontSize, tenantWebsiteX, tenantWebsiteY, tenantWebsiteWeight, tenantWebsiteFontFamily, tenantWebsiteColor, tenantWebsiteBg]);

    const handleSave = async () => {
        if (!name.trim()) {
            onError('El nombre no puede estar vacío');
            return;
        }
        setSaving(true);
        try {
            if (isNew || template.id === 0) {
                await apiRequest(API, {
                    method: 'POST',
                    body: {
                        name: name.trim(),
                        description: description.trim() || null,
                        is_default: isDefault,
                        config: buildNextConfig(),
                    },
                });
            } else {
                await apiRequest(`${API}/${template.id}`, {
                    method: 'PATCH',
                    body: {
                        name: name.trim(),
                        description: description.trim() || null,
                        is_default: isDefault,
                        config: buildNextConfig(),
                    },
                });
            }
            onSaved();
        } catch (err: any) {
            onError(err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const previewBg = bgUrl ? getImageUrl(bgUrl) : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="bg-[#0a192f] border border-white/10 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">
                            {isNew ? 'Nueva Plantilla Global' : 'Editar Plantilla'}
                        </h2>
                        <p className="text-[11px] text-white/40 mt-0.5">
                            {isNew ? 'Diseña y previsualiza en tiempo real el nuevo formato de despedida' : 'Los cambios se reflejan en el preview de la derecha en tiempo real.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
                    {/* Controls */}
                    <div className="lg:col-span-3 overflow-y-auto p-6 space-y-6 border-r border-white/[0.06]">
                        {/* Identity */}
                        <Section title="Identidad">
                            <div>
                                <label htmlFor="tpl-name" className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">Nombre</label>
                                <input
                                    id="tpl-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={80}
                                    className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-3 text-white text-sm font-medium outline-none focus:border-primary/40"
                                />
                            </div>
                            <div>
                                <label htmlFor="tpl-desc" className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">Descripción</label>
                                <textarea
                                    id="tpl-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    maxLength={240}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-medium outline-none focus:border-primary/40 resize-y"
                                />
                            </div>
                            {template.tenant_id != null ? (
                            <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-2.5">
                                <Lock size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-[11px] text-amber-200/80">
                                    Exclusiva de <strong>{template.tenant_name || 'un crematorio'}</strong>: el crematorio la usa en su formulario pero no puede modificarla.
                                </p>
                            </div>
                            ) : (
                            <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-1">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDefault}
                                        onChange={(e) => setIsDefault(e.target.checked)}
                                        className="w-5 h-5 accent-primary cursor-pointer"
                                    />
                                    <span className="text-sm font-bold text-white flex items-center gap-2">
                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                        Marcar como predeterminada (Default del sistema)
                                    </span>
                                </label>
                                <p className="text-[11px] text-white/40 pl-8">
                                    La usan los formularios de los crematorios que no tienen una tarjeta asignada.
                                </p>
                            </div>
                            )}
                        </Section>

                        {/* Ratio */}
                        <Section title="Formato">
                            <div className="grid grid-cols-4 gap-2">
                                {RATIOS.map((r) => (
                                    <button
                                        key={r.value}
                                        onClick={() => setFormat(r.value)}
                                        className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                                            format === r.value
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                : 'bg-white/[0.03] text-white/60 border-white/10 hover:border-primary/30'
                                        }`}
                                    >
                                        <div>{r.value}</div>
                                        <div className="text-[9px] opacity-70 mt-0.5">{r.label}</div>
                                    </button>
                                ))}
                            </div>
                        </Section>

                        {/* Textos — los 3 mensajes que el diseño puede mostrar */}
                        <Section title="Textos">
                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">
                                    1 · Nombre de la mascota
                                    <span className="ml-2 text-emerald-400 text-[9px] tracking-normal normal-case">El tenant lo reemplazará con el nombre real</span>
                                </label>
                                <input
                                    type="text"
                                    value={petNamePlaceholder}
                                    onChange={(e) => setPetNamePlaceholder(e.target.value)}
                                    placeholder="Ej: Luna"
                                    maxLength={60}
                                    className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-3 text-white text-sm font-medium outline-none focus:border-primary/40"
                                />
                                <p className="text-[10px] text-white/30 mt-1">Lo que escribas aquí se usa como muestra en el preview.</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">
                                    2 · Eslogan o fecha
                                    <span className="ml-2 text-white/40 text-[9px] tracking-normal normal-case">Fijo · el tenant no lo edita</span>
                                </label>
                                <input
                                    type="text"
                                    value={subtitleText}
                                    onChange={(e) => setSubtitleText(e.target.value)}
                                    placeholder='Ej: "Tu luz nunca se apaga" o "2018 — 2026"'
                                    maxLength={80}
                                    className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-3 text-white text-sm font-medium outline-none focus:border-primary/40"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">
                                    3 · Frase de despedida (por defecto)
                                    <span className="ml-2 text-emerald-400 text-[9px] tracking-normal normal-case">El tenant puede sobreescribirla</span>
                                </label>
                                <textarea
                                    value={farewellDefault}
                                    onChange={(e) => setFarewellDefault(e.target.value)}
                                    rows={3}
                                    maxLength={300}
                                    placeholder="Texto sugerido que verá el tenant. Podrá dejarlo tal cual o cambiarlo por algo más personal."
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-medium outline-none focus:border-primary/40 resize-y"
                                />
                            </div>
                        </Section>

                        <Section title="Ajustar letras y posición">
                            {/* NOMBRE DE LA MASCOTA */}
                            <div className="space-y-3 pb-4 border-b border-white/5">
                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest block">
                                    1 · Nombre de la mascota
                                </span>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Tamaño</span>
                                            <span className="font-mono text-white/85">{petNameFontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="12"
                                            max="80"
                                            value={petNameFontSize}
                                            onChange={(e) => setPetNameFontSize(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Posición X</span>
                                            <span className="font-mono text-white/85">{petNameX > 0 ? `+${petNameX}` : petNameX}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-250"
                                            max="250"
                                            value={petNameX}
                                            onChange={(e) => setPetNameX(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Posición Y</span>
                                            <span className="font-mono text-white/85">{petNameY > 0 ? `+${petNameY}` : petNameY}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-250"
                                            max="250"
                                            value={petNameY}
                                            onChange={(e) => setPetNameY(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label htmlFor="pet-name-font" className="block text-[10px] text-white/50 mb-1.5 uppercase tracking-[0.16em]">
                                        Tipografía del Nombre
                                    </label>
                                    <select
                                        id="pet-name-font"
                                        value={petNameFontFamily}
                                        onChange={(e) => setPetNameFontFamily(e.target.value)}
                                        className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-white text-xs outline-none focus:border-primary/40 cursor-pointer"
                                        style={{ fontFamily: petNameFontFamily || undefined }}
                                    >
                                        {PET_NAME_FONTS.map((f) => (
                                            <option
                                                key={f.value}
                                                value={f.value}
                                                className="bg-[#0a192f] text-white"
                                                style={{ fontFamily: f.value || undefined }}
                                            >
                                                {f.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* ESLOGAN O FECHA */}
                            <div className="space-y-3 pb-4 border-b border-white/5">
                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest block">
                                    2 · Eslogan o fecha
                                </span>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Tamaño</span>
                                            <span className="font-mono text-white/85">{subtitleFontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="50"
                                            value={subtitleFontSize}
                                            onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Posición X</span>
                                            <span className="font-mono text-white/85">{subtitleX > 0 ? `+${subtitleX}` : subtitleX}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-250"
                                            max="250"
                                            value={subtitleX}
                                            onChange={(e) => setSubtitleX(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Posición Y</span>
                                            <span className="font-mono text-white/85">{subtitleY > 0 ? `+${subtitleY}` : subtitleY}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-250"
                                            max="250"
                                            value={subtitleY}
                                            onChange={(e) => setSubtitleY(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FRASE DE DESPEDIDA */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest block">
                                    3 · Frase de despedida
                                </span>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Tamaño</span>
                                            <span className="font-mono text-white/85">{farewellFontSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="50"
                                            value={farewellFontSize}
                                            onChange={(e) => setFarewellFontSize(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Ancho</span>
                                            <span className="font-mono text-white/85">{farewellWidth}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="150"
                                            max="550"
                                            value={farewellWidth}
                                            onChange={(e) => setFarewellWidth(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Posición X</span>
                                            <span className="font-mono text-white/85">{farewellX > 0 ? `+${farewellX}` : farewellX}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-250"
                                            max="250"
                                            value={farewellX}
                                            onChange={(e) => setFarewellX(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                            <span>Posición Y</span>
                                            <span className="font-mono text-white/85">{farewellY > 0 ? `+${farewellY}` : farewellY}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-250"
                                            max="250"
                                            value={farewellY}
                                            onChange={(e) => setFarewellY(Number(e.target.value))}
                                            className="w-full accent-primary bg-black/40 h-1 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Section>

                        {/* Colors + Font */}
                        <Section title="Colores y tipografía">
                            <div className="grid grid-cols-2 gap-4">
                                <ColorField label="Fondo" value={bgColor} onChange={setBgColor} />
                                <ColorField label="Texto" value={textColor} onChange={setTextColor} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">Tipo de letra</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {FONT_OPTIONS.map((f) => (
                                        <button
                                            key={f.value}
                                            onClick={() => setFont(f.value)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                                                font === f.value
                                                    ? 'bg-primary/15 border-primary/40 text-white'
                                                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:border-primary/30'
                                            }`}
                                        >
                                            <span className="text-xs font-bold">{f.label}</span>
                                            <span
                                                className="text-2xl font-bold"
                                                style={{ fontFamily: f.value === 'serif' ? 'serif' : 'sans-serif' }}
                                            >
                                                {f.sample}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Section>

                        {/* Photo */}
                        <Section title="Foto de la mascota">
                            <div>
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">Forma</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SHAPE_OPTIONS.map((s) => (
                                        <button
                                            key={s.value}
                                            onClick={() => setPhotoShape(s.value)}
                                            className={`py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                                                photoShape === s.value
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-white/[0.03] text-white/60 border-white/10 hover:border-primary/30'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Tamaño</label>
                                        <span className="text-[10px] font-mono text-white/50">{photoSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={50}
                                        max={600}
                                        step={5}
                                        value={photoSize}
                                        onChange={(e) => setPhotoSize(Number(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Posición X</label>
                                        <span className="text-[10px] font-mono text-white/50">{photoX}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-400}
                                        max={400}
                                        step={5}
                                        value={photoX}
                                        onChange={(e) => setPhotoX(Number(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Posición Y</label>
                                        <span className="text-[10px] font-mono text-white/50">{photoY}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-600}
                                        max={600}
                                        step={5}
                                        value={photoY}
                                        onChange={(e) => setPhotoY(Number(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <ColorField label="Borde foto" value={photoBorderColor} onChange={setPhotoBorderColor} />
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Grosor borde</label>
                                        <span className="text-[10px] font-mono text-white/50">{photoBorderWidth}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={12}
                                        step={1}
                                        value={photoBorderWidth}
                                        onChange={(e) => setPhotoBorderWidth(Number(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={glowEnabled}
                                    onChange={(e) => setGlowEnabled(e.target.checked)}
                                    className="w-5 h-5 accent-primary cursor-pointer"
                                />
                                <span className="text-sm font-bold text-white">Degradado alrededor (glow)</span>
                            </label>
                            {glowEnabled && (
                                <div className="grid grid-cols-2 gap-4 pl-8">
                                    <ColorField label="Color del glow" value={glowColor} onChange={setGlowColor} />
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Intensidad</label>
                                            <span className="text-[10px] font-mono text-white/50">{glowSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={80}
                                            step={2}
                                            value={glowSize}
                                            onChange={(e) => setGlowSize(Number(e.target.value))}
                                            className="w-full accent-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* Frame */}
                        <Section title="Marco perimetral">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={frameEnabled}
                                    onChange={(e) => setFrameEnabled(e.target.checked)}
                                    className="w-5 h-5 accent-primary cursor-pointer"
                                />
                                <span className="text-sm font-bold text-white">Marco visible</span>
                            </label>
                            {frameEnabled && (
                                <div className="space-y-4 pl-8">
                                    <ColorField label="Color del marco" value={frameColor} onChange={setFrameColor} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Grosor</label>
                                                <span className="text-[10px] font-mono text-white/50">{frameWidth}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={30}
                                                step={1}
                                                value={frameWidth}
                                                onChange={(e) => setFrameWidth(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Margen interno</label>
                                                <span className="text-[10px] font-mono text-white/50">{frameMargin}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={40}
                                                step={1}
                                                value={frameMargin}
                                                onChange={(e) => setFrameMargin(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Esquinas redondeadas</label>
                                                <span className="text-[10px] font-mono text-white/50">{frameRadius}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={60}
                                                step={1}
                                                value={frameRadius}
                                                onChange={(e) => setFrameRadius(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Opacidad</label>
                                                <span className="text-[10px] font-mono text-white/50">{Math.round(frameOpacity * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0.1}
                                                max={1}
                                                step={0.05}
                                                value={frameOpacity}
                                                onChange={(e) => setFrameOpacity(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">Tipo de línea</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {FRAME_STYLES.map((fs) => (
                                                <button
                                                    key={fs.value}
                                                    type="button"
                                                    onClick={() => setFrameStyle(fs.value)}
                                                    className={`h-12 rounded-lg border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition ${
                                                        frameStyle === fs.value
                                                            ? 'border-primary/60 bg-primary/10 text-white'
                                                            : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <span className="w-8 h-0" style={{ borderTop: `${fs.value === 'double' ? 4 : 2}px ${fs.value} currentColor` }} />
                                                    {fs.label}
                                                </button>
                                            ))}
                                        </div>
                                        {frameStyle === 'double' && frameWidth < 3 && (
                                            <p className="text-[10px] text-white/40 mt-1.5">La línea doble necesita un grosor de 3px o más.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* Tenant Logo */}
                        <Section title="Logo de la Empresa / Tenant">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={logoEnabled}
                                    onChange={(e) => setLogoEnabled(e.target.checked)}
                                    className="w-5 h-5 accent-primary cursor-pointer"
                                />
                                <div>
                                    <span className="text-sm font-bold text-white block">Incluir Logo del Crematorio</span>
                                    <span className="text-[11px] text-white/50 block">Inyecta el logo configurado por el tenant en la tarjeta conmemorativa</span>
                                </div>
                            </label>

                            {logoEnabled && (
                                <div className="space-y-4 pl-8 border-l border-white/10 mt-2">
                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-2">
                                            Ubicación en la tarjeta
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {LOGO_POSITIONS.map((pos) => (
                                                <button
                                                    key={pos.value}
                                                    type="button"
                                                    onClick={() => setLogoPosition(pos.value)}
                                                    className={`py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                        logoPosition === pos.value
                                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                            : 'bg-white/[0.03] text-white/60 border-white/10 hover:border-primary/30'
                                                    }`}
                                                >
                                                    {pos.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Tamaño del logo</label>
                                                <span className="text-[10px] font-mono text-white/50">{logoSize}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={30}
                                                max={160}
                                                step={5}
                                                value={logoSize}
                                                onChange={(e) => setLogoSize(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Opacidad</label>
                                                <span className="text-[10px] font-mono text-white/50">{Math.round(logoOpacity * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0.2}
                                                max={1.0}
                                                step={0.05}
                                                value={logoOpacity}
                                                onChange={(e) => setLogoOpacity(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Ajuste fino X</label>
                                                <span className="text-[10px] font-mono text-white/50">{logoX > 0 ? `+${logoX}` : logoX}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={-200}
                                                max={200}
                                                step={2}
                                                value={logoX}
                                                onChange={(e) => setLogoX(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Ajuste fino Y</label>
                                                <span className="text-[10px] font-mono text-white/50">{logoY > 0 ? `+${logoY}` : logoY}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={-200}
                                                max={200}
                                                step={2}
                                                value={logoY}
                                                onChange={(e) => setLogoY(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* Nombre del Crematorio */}
                        <Section title="Nombre del Crematorio">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={tenantNameEnabled}
                                    onChange={(e) => setTenantNameEnabled(e.target.checked)}
                                    className="w-5 h-5 accent-primary cursor-pointer"
                                />
                                <div>
                                    <span className="text-sm font-bold text-white block">Mostrar Nombre del Crematorio</span>
                                    <span className="text-[11px] text-white/50 block">Incluye el nombre de la empresa/crematorio en la tarjeta</span>
                                </div>
                            </label>

                            {tenantNameEnabled && (
                                <div className="space-y-4 pl-8 border-l border-white/10 mt-2">
                                    <div>
                                        <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">
                                            Texto del Nombre
                                            <span className="ml-2 text-white/40 text-[9px] tracking-normal normal-case">
                                                {template.tenant_id != null ? 'Fijo para este crematorio' : 'Si se deja vacío, tomará el nombre de cada crematorio'}
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={tenantNameText}
                                            onChange={(e) => setTenantNameText(e.target.value)}
                                            placeholder={template.tenant_name || 'Ej: Crematorio San Roque'}
                                            maxLength={80}
                                            className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-3 text-white text-sm font-medium outline-none focus:border-primary/40"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Tamaño</label>
                                                <span className="text-[10px] font-mono text-white/50">{tenantNameFontSize}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={10}
                                                max={36}
                                                step={1}
                                                value={tenantNameFontSize}
                                                onChange={(e) => setTenantNameFontSize(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Posición X</label>
                                                <span className="text-[10px] font-mono text-white/50">{tenantNameX > 0 ? `+${tenantNameX}` : tenantNameX}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={-250}
                                                max={250}
                                                step={2}
                                                value={tenantNameX}
                                                onChange={(e) => setTenantNameX(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Posición Y</label>
                                                <span className="text-[10px] font-mono text-white/50">{tenantNameY > 0 ? `+${tenantNameY}` : tenantNameY}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={-350}
                                                max={350}
                                                step={2}
                                                value={tenantNameY}
                                                onChange={(e) => setTenantNameY(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                                            <input
                                                type="checkbox"
                                                checked={tenantNameBold}
                                                onChange={(e) => setTenantNameBold(e.target.checked)}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            Negrita (Bold)
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                                            <input
                                                type="checkbox"
                                                checked={tenantNameUppercase}
                                                onChange={(e) => setTenantNameUppercase(e.target.checked)}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            MAYÚSCULAS
                                        </label>
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* Sitio Web o Red Social */}
                        <Section title="Sitio Web o Red Social">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={tenantWebsiteEnabled}
                                    onChange={(e) => setTenantWebsiteEnabled(e.target.checked)}
                                    className="w-5 h-5 accent-primary cursor-pointer"
                                />
                                <div>
                                    <span className="text-sm font-bold text-white block">Mostrar Sitio Web o Red Social</span>
                                    <span className="text-[11px] text-white/50 block">Muestra el dominio web, Instagram o contacto del crematorio</span>
                                </div>
                            </label>

                            {tenantWebsiteEnabled && (
                                <div className="space-y-4 pl-8 border-l border-white/10 mt-2">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">
                                                Sitio Web o Red Social
                                            </label>
                                            <span className="text-[10px] text-white/40">
                                                Haz clic para usar una variable
                                            </span>
                                        </div>

                                        {/* Chips / Variables dinámicas */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                            {SOCIAL_TAGS.map((item) => {
                                                const Icon = item.icon;
                                                const isSelected = tenantWebsiteText.includes(item.tag);
                                                return (
                                                    <button
                                                        key={item.tag}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!tenantWebsiteText.trim() || tenantWebsiteText === 'www.crematorio.com' || tenantWebsiteText === '@crematorio_pet') {
                                                                setTenantWebsiteText(item.tag);
                                                            } else if (tenantWebsiteText.includes(item.tag)) {
                                                                const next = tenantWebsiteText.replace(item.tag, '').replace(/\s+/g, ' ').trim();
                                                                setTenantWebsiteText(next);
                                                            } else {
                                                                setTenantWebsiteText(`${tenantWebsiteText} ${item.tag}`.trim());
                                                            }
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer active:scale-95 ${
                                                            isSelected
                                                                ? `${item.badgeClass} ring-1 ring-primary/40 shadow-sm`
                                                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20'
                                                        }`}
                                                        title={`Usar ${item.tag} (${item.label})`}
                                                    >
                                                        <Icon size={12} className="shrink-0" />
                                                        <span>{item.tag}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <input
                                            type="text"
                                            value={tenantWebsiteText}
                                            onChange={(e) => setTenantWebsiteText(e.target.value)}
                                            placeholder="{sitio_web}"
                                            maxLength={80}
                                            className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-3 text-white text-xs font-mono outline-none focus:border-primary/40"
                                        />
                                        <p className="text-[10px] text-white/40 mt-1.5">
                                            Se reemplazará automáticamente con los datos configurados en las redes sociales del crematorio.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Tamaño</label>
                                                <span className="text-[10px] font-mono text-white/50">{tenantWebsiteFontSize}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={8}
                                                max={24}
                                                step={1}
                                                value={tenantWebsiteFontSize}
                                                onChange={(e) => setTenantWebsiteFontSize(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Posición X</label>
                                                <span className="text-[10px] font-mono text-white/50">{tenantWebsiteX > 0 ? `+${tenantWebsiteX}` : tenantWebsiteX}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={-250}
                                                max={250}
                                                step={2}
                                                value={tenantWebsiteX}
                                                onChange={(e) => setTenantWebsiteX(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Posición Y</label>
                                                <span className="text-[10px] font-mono text-white/50">{tenantWebsiteY > 0 ? `+${tenantWebsiteY}` : tenantWebsiteY}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={-350}
                                                max={350}
                                                step={2}
                                                value={tenantWebsiteY}
                                                onChange={(e) => setTenantWebsiteY(Number(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="website-weight" className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">Grosor</label>
                                            <select
                                                id="website-weight"
                                                value={tenantWebsiteWeight}
                                                onChange={(e) => setTenantWebsiteWeight(Number(e.target.value))}
                                                className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-white text-xs outline-none focus:border-primary/40 cursor-pointer"
                                            >
                                                {WEBSITE_WEIGHTS.map((w) => (
                                                    <option key={w.value} value={w.value} className="bg-[#0a192f] text-white">{w.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="website-font" className="block text-[10px] font-black text-white/60 uppercase tracking-[0.16em] mb-1.5">Tipo de letra</label>
                                            <select
                                                id="website-font"
                                                value={tenantWebsiteFontFamily}
                                                onChange={(e) => setTenantWebsiteFontFamily(e.target.value)}
                                                className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-white text-xs outline-none focus:border-primary/40 cursor-pointer"
                                                style={{ fontFamily: tenantWebsiteFontFamily || undefined }}
                                            >
                                                {PET_NAME_FONTS.map((f) => (
                                                    <option key={f.value} value={f.value} className="bg-[#0a192f] text-white" style={{ fontFamily: f.value || undefined }}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                                                <input
                                                    type="checkbox"
                                                    checked={!!tenantWebsiteColor}
                                                    onChange={(e) => setTenantWebsiteColor(e.target.checked ? (textColor || '#2D3748') : '')}
                                                    className="w-4 h-4 accent-primary"
                                                />
                                                Color de texto propio
                                            </label>
                                            {tenantWebsiteColor
                                                ? <ColorField label="Color de texto" value={tenantWebsiteColor} onChange={setTenantWebsiteColor} />
                                                : <p className="text-[10px] text-white/40">Usa el color general del diseño.</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                                                <input
                                                    type="checkbox"
                                                    checked={!!tenantWebsiteBg}
                                                    onChange={(e) => setTenantWebsiteBg(e.target.checked ? '#FFFFFF' : '')}
                                                    className="w-4 h-4 accent-primary"
                                                />
                                                Con color de fondo
                                            </label>
                                            {tenantWebsiteBg
                                                ? <ColorField label="Color de fondo" value={tenantWebsiteBg} onChange={setTenantWebsiteBg} />
                                                : <p className="text-[10px] text-white/40">Sin fondo (texto sobre el diseño).</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Section>

                        {/* Background image */}
                        <Section title="Imagen de fondo">
                            {!previewBg && (
                                <div className="text-white/40 text-xs flex items-center gap-2">
                                    <ImageOff size={14} /> Sin imagen de fondo
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    {uploading ? 'Subiendo…' : previewBg ? 'Reemplazar' : 'Subir imagen'}
                                </button>
                                {previewBg && (
                                    <button
                                        onClick={() => { setBgUrl(null); setBgOpacity(0); }}
                                        className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                                    >
                                        Quitar
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUpload(f);
                                    e.target.value = '';
                                }}
                            />
                            {previewBg && (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.16em]">Opacidad</label>
                                        <span className="text-[10px] font-mono text-white/50">{Math.round(bgOpacity * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={Math.round(bgOpacity * 100)}
                                        onChange={(e) => setBgOpacity(Number(e.target.value) / 100)}
                                        className="w-full accent-primary"
                                    />
                                </div>
                            )}
                        </Section>
                    </div>

                    {/* Live preview */}
                    <aside className="lg:col-span-2 bg-[#020617] flex flex-col items-center justify-between p-6 overflow-hidden relative">
                        {/* Header/Zoom Toolbar */}
                        <div className="w-full flex items-center justify-between mb-4 z-10">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.22em]">
                                Preview en vivo
                            </span>
                            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-1 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={() => setPreviewZoom(prev => Math.max(0.2, Number((prev - 0.05).toFixed(2))))}
                                    className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                                    title="Alejar"
                                >
                                    <ZoomOut size={14} />
                                </button>
                                <span className="text-[10px] font-mono text-white/80 px-1 min-w-[36px] text-center select-none">
                                    {Math.round(previewZoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPreviewZoom(prev => Math.min(1.5, Number((prev + 0.05).toFixed(2))))}
                                    className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                                    title="Acercar"
                                >
                                    <ZoomIn size={14} />
                                </button>
                                <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
                                <button
                                    type="button"
                                    onClick={() => setPreviewZoom(0.55)}
                                    className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                                    title="Restablecer"
                                >
                                    <RotateCcw size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Preview Scrollable Area */}
                        <div className="flex-1 w-full overflow-auto flex items-center justify-center min-h-0 custom-scrollbar">
                            {(() => {
                                const dims = getDimensions(format);
                                return (
                                    <div 
                                        style={{ 
                                            width: `${dims.width * previewZoom}px`, 
                                            height: `${dims.height * previewZoom}px`,
                                        }}
                                        className="relative flex-shrink-0 transition-all duration-100 ease-out"
                                    >
                                        <div
                                            style={{
                                                transform: `scale(${previewZoom})`,
                                                transformOrigin: 'top left',
                                                width: `${dims.width}px`,
                                                height: `${dims.height}px`,
                                            }}
                                            className="absolute inset-0"
                                        >
                                            <FarewellPreview config={previewConfig} />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </aside>
                </div>

                <footer className="border-t border-white/[0.06] px-6 py-4 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-white/60 hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {saving ? 'Guardando…' : isNew ? 'Crear Plantilla' : 'Guardar cambios'}
                    </button>
                </footer>
            </motion.div>
        </motion.div>
    );
}

/** Formulario de un crematorio: crear una copia exclusiva (recomendado, se
 *  personaliza con su logo y textos) o usar esta tarjeta tal cual. */
function AssignModal({
    template,
    onClose,
    onCustomize,
    onAssign,
    onError,
}: {
    template: FarewellTemplate;
    onClose: () => void;
    onCustomize: (template: FarewellTemplate, tenantId: number) => Promise<void>;
    onAssign: (templateId: number | null, tenantId: number) => Promise<void>;
    onError: (msg: string) => void;
}) {
    const isExclusive = template.tenant_id != null;
    const [tenants, setTenants] = useState<TenantLite[]>([]);
    const [tenantId, setTenantId] = useState<number | ''>(isExclusive ? (template.tenant_id as number) : '');
    const [busy, setBusy] = useState<'copy' | 'assign' | 'reset' | null>(null);

    useEffect(() => {
        apiRequest('/api/internal/creator/tenants')
            .then((d: TenantLite[]) => setTenants(d || []))
            .catch(() => onError('No se pudieron cargar los crematorios'));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const current = (template.form_tenants || []).map((t) => t.id);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        }
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDropdownOpen]);

    const selectedTenant = tenants.find((t) => t.id === tenantId);
    const displayName = selectedTenant?.name || (isExclusive ? (template.tenant_name || `Crematorio #${tenantId}`) : null);

    const filteredTenants = useMemo(() => {
        if (!searchFilter.trim()) return tenants;
        return tenants.filter((t) => t.name.toLowerCase().includes(searchFilter.toLowerCase()));
    }, [tenants, searchFilter]);

    const run = async (kind: 'copy' | 'assign' | 'reset') => {
        if (!tenantId) return;
        setBusy(kind);
        try {
            if (kind === 'copy') await onCustomize(template, tenantId);
            else if (kind === 'assign') await onAssign(template.id, tenantId);
            else await onAssign(null, tenantId);
        } catch (err: unknown) {
            onError(err instanceof Error ? err.message : 'Error');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-md bg-[#0a192f] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-black text-white">Tarjeta del formulario</h3>
                        <p className="text-xs text-white/40 mt-0.5">{template.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <div className="space-y-1.5" ref={dropdownRef}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Crematorio</label>
                    <div className="relative">
                        <button
                            type="button"
                            disabled={isExclusive}
                            onClick={() => {
                                setIsDropdownOpen((prev) => !prev);
                                setSearchFilter('');
                            }}
                            className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-sm border transition-all text-left outline-none ${
                                isExclusive
                                    ? 'bg-white/5 border-white/10 text-white/70 cursor-not-allowed'
                                    : isDropdownOpen
                                    ? 'bg-[#122543] border-primary/60 ring-2 ring-primary/20 text-white shadow-lg'
                                    : 'bg-[#0e213b] hover:bg-[#142947] border-white/15 hover:border-white/25 text-white'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
                                    selectedTenant ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/40'
                                }`}>
                                    <Building2 size={16} />
                                </div>
                                <span className={`truncate font-semibold ${displayName ? 'text-white' : 'text-white/40'}`}>
                                    {displayName || 'Selecciona un crematorio…'}
                                </span>
                                {selectedTenant && current.includes(selectedTenant.id) && (
                                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Ya la usa
                                    </span>
                                )}
                            </div>
                            {isExclusive ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                    <Lock size={11} /> Exclusiva
                                </span>
                            ) : (
                                <ChevronDown
                                    size={16}
                                    className={`text-white/40 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`}
                                />
                            )}
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && !isExclusive && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0c1e38] border border-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
                                >
                                    {tenants.length > 4 && (
                                        <div className="p-2 border-b border-white/10 bg-white/[0.03]">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar crematorio..."
                                                    value={searchFilter}
                                                    onChange={(e) => setSearchFilter(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                                        {filteredTenants.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-white/40">
                                                {tenants.length === 0 ? 'Cargando crematorios...' : 'No se encontraron resultados'}
                                            </div>
                                        ) : (
                                            filteredTenants.map((t) => {
                                                const isSelected = tenantId === t.id;
                                                const isCurrentlyUsing = current.includes(t.id);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setTenantId(t.id);
                                                            setIsDropdownOpen(false);
                                                            setSearchFilter('');
                                                        }}
                                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-all ${
                                                            isSelected
                                                                ? 'bg-primary/20 text-white font-semibold border border-primary/30'
                                                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`p-1 rounded-md shrink-0 ${isSelected ? 'bg-primary/30 text-primary' : 'bg-white/5 text-white/40'}`}>
                                                                <Building2 size={13} />
                                                            </div>
                                                            <span className="truncate">{t.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {isCurrentlyUsing && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                                                    Ya la usa
                                                                </span>
                                                            )}
                                                            {isSelected && (
                                                                <Check size={15} className="text-primary stroke-[2.5]" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="space-y-2">
                    {!isExclusive && (
                        <button
                            onClick={() => run('copy')}
                            disabled={!tenantId || !!busy}
                            className="w-full flex items-start gap-3 text-left rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/15 p-3.5 transition-all disabled:opacity-40"
                        >
                            {busy === 'copy' ? <Loader2 size={16} className="animate-spin text-primary mt-0.5" /> : <Copy size={16} className="text-primary mt-0.5" />}
                            <span>
                                <span className="block text-sm font-black text-white">Crear copia personalizada</span>
                                <span className="block text-[11px] text-white/50">Exclusiva de ese crematorio (su logo, colores y textos). Solo tú la editas.</span>
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => run('assign')}
                        disabled={!tenantId || !!busy}
                        className="w-full flex items-start gap-3 text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-3.5 transition-all disabled:opacity-40"
                    >
                        {busy === 'assign' ? <Loader2 size={16} className="animate-spin text-white mt-0.5" /> : <Link2 size={16} className="text-white/70 mt-0.5" />}
                        <span>
                            <span className="block text-sm font-black text-white">{isExclusive ? 'Usar en su formulario' : 'Usar esta tarjeta tal cual'}</span>
                            <span className="block text-[11px] text-white/50">
                                {isExclusive ? 'Su formulario mostrará esta tarjeta.' : 'Compartida: los cambios a esta tarjeta afectan a todos los que la usan.'}
                            </span>
                        </span>
                    </button>
                    {tenantId !== '' && current.includes(Number(tenantId)) && (
                        <button
                            onClick={() => run('reset')}
                            disabled={!!busy}
                            className="w-full text-[11px] font-bold text-white/40 hover:text-white py-1.5"
                        >
                            {busy === 'reset' ? 'Restableciendo…' : 'Volver a la tarjeta predeterminada'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
