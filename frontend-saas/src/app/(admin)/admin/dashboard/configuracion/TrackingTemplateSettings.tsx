'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    CheckCircle2,
    Loader2,
    Palette,
    Save,
    Sparkles,
    Plus,
    Edit3,
    Trash2,
    Upload,
    X,
    Eye,
    Layers,
    ShieldCheck,
    Check,
    AlertCircle,
    Sun,
    Moon,
    Image as ImageIcon
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import { TRACKING_TEMPLATES, normalizeTrackingTemplate, type TrackingTemplateId } from '@/lib/trackingTemplates';

interface TemplateItem {
    id: number | null;
    slug: string;
    name: string;
    description: string | null;
    is_active: boolean;
    is_built_in: boolean;
    allowed_plans: string[];
    background_mobile_url: string | null;
    background_desktop_url: string | null;
    element_url: string | null;
    preview_image_url: string | null;
    theme_config: {
        accent_color?: string;
        title_color_light?: string;
        title_color_dark?: string;
        subtitle_color_light?: string;
        subtitle_color_dark?: string;
    };
    created_at?: string;
}

const AVAILABLE_PLANS = [
    { id: 'Track', label: 'Track (Seguimiento)', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
    { id: 'NORMAL', label: 'Normal (Base)', color: 'border-gray-500/30 text-gray-300 bg-gray-500/10' },
    { id: 'PRO', label: 'Pro (Avanzado)', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
    { id: 'ULTRA', label: 'Ultra (Exclusivo)', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
];

export default function TrackingTemplateSettings() {
    // Global default template states
    const [selected, setSelected] = useState<TrackingTemplateId>('classic');
    const [initial, setInitial] = useState<TrackingTemplateId>('classic');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // Template catalog builder states
    const [catalog, setCatalog] = useState<TemplateItem[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);

    // Form states
    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formAllowedPlans, setFormAllowedPlans] = useState<string[]>(['PRO', 'ULTRA']);
    const [formIsActive, setFormIsActive] = useState(true);
    const [formElementUrl, setFormElementUrl] = useState('');
    const [formMobileBgUrl, setFormMobileBgUrl] = useState('');
    const [formDesktopBgUrl, setFormDesktopBgUrl] = useState('');
    const [formAccentColor, setFormAccentColor] = useState('#D97706');
    const [formTitleLight, setFormTitleLight] = useState('#3E2723');
    const [formTitleDark, setFormTitleDark] = useState('#FDF6E2');
    const [formSubtitleLight, setFormSubtitleLight] = useState('#78350F');
    const [formSubtitleDark, setFormSubtitleDark] = useState('#FDE68A');

    // Live preview states
    const [previewDarkMode, setPreviewDarkMode] = useState(false);
    const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const fileInputRefElement = useRef<HTMLInputElement>(null);
    const fileInputRefMobile = useRef<HTMLInputElement>(null);
    const fileInputRefDesktop = useRef<HTMLInputElement>(null);

    // Load initial global config
    useEffect(() => {
        let active = true;
        apiRequest('/api/internal/creator/config')
            .then((data) => {
                if (!active) return;
                const tpl = normalizeTrackingTemplate(data?.default_tracking_template, 'classic');
                setSelected(tpl);
                setInitial(tpl);
            })
            .catch(() => {
                if (active) setFeedback({ type: 'err', text: 'No se pudo cargar la configuración actual.' });
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    // Load template catalog
    const fetchCatalog = async () => {
        setLoadingCatalog(true);
        try {
            const data = await apiRequest('/api/internal/creator/tracking-templates');
            if (data?.templates) {
                setCatalog(data.templates);
            }
        } catch (err: any) {
            console.error('Error fetching template catalog:', err);
        } finally {
            setLoadingCatalog(false);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    // Save global default
    const handleSaveDefault = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            await apiRequest('/api/internal/creator/config', {
                method: 'PUT',
                body: JSON.stringify({ default_tracking_template: selected }),
            });
            setInitial(selected);
            setFeedback({ type: 'ok', text: 'Plantilla predeterminada global actualizada.' });
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Error al guardar la plantilla.' });
        } finally {
            setSaving(false);
        }
    };

    // Toggle template active
    const handleToggleActive = async (tpl: TemplateItem) => {
        if (tpl.is_built_in || !tpl.id) return;
        try {
            await apiRequest(`/api/internal/creator/tracking-templates/${tpl.id}/toggle-active`, {
                method: 'PATCH',
            });
            setCatalog(prev => prev.map(item => item.id === tpl.id ? { ...item, is_active: !item.is_active } : item));
        } catch (err: any) {
            alert('Error al cambiar estado de la plantilla: ' + (err?.message || 'Error'));
        }
    };

    // Delete custom template
    const handleDeleteTemplate = async (tpl: TemplateItem) => {
        if (tpl.is_built_in || !tpl.id) return;
        if (!confirm(`¿Estás seguro de eliminar la plantilla personalizada "${tpl.name}"? Los crematorios que la usen volverán a la plantilla base.`)) {
            return;
        }
        try {
            await apiRequest(`/api/internal/creator/tracking-templates/${tpl.id}`, {
                method: 'DELETE',
            });
            setCatalog(prev => prev.filter(item => item.id !== tpl.id));
        } catch (err: any) {
            alert('Error al eliminar: ' + (err?.message || 'Error'));
        }
    };

    // Open modal to create new
    const handleOpenCreateModal = () => {
        setEditingTemplate(null);
        setFormName('');
        setFormSlug('');
        setFormDescription('');
        setFormAllowedPlans(['PRO', 'ULTRA']);
        setFormIsActive(true);
        setFormElementUrl('/tracking/elementos/alas_elemento.webp');
        setFormMobileBgUrl('/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp');
        setFormDesktopBgUrl('/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp');
        setFormAccentColor('#D97706');
        setFormTitleLight('#3E2723');
        setFormTitleDark('#FDF6E2');
        setFormSubtitleLight('#78350F');
        setFormSubtitleDark('#FDE68A');
        setFormError(null);
        setModalOpen(true);
    };

    // Open modal to edit existing
    const handleOpenEditModal = (tpl: TemplateItem) => {
        setEditingTemplate(tpl);
        setFormName(tpl.name);
        setFormSlug(tpl.slug);
        setFormDescription(tpl.description || '');
        setFormAllowedPlans(tpl.allowed_plans || ['PRO', 'ULTRA']);
        setFormIsActive(tpl.is_active);
        setFormElementUrl(tpl.element_url || '/tracking/elementos/alas_elemento.webp');
        setFormMobileBgUrl(tpl.background_mobile_url || '/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp');
        setFormDesktopBgUrl(tpl.background_desktop_url || '/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp');
        setFormAccentColor(tpl.theme_config?.accent_color || '#D97706');
        setFormTitleLight(tpl.theme_config?.title_color_light || '#3E2723');
        setFormTitleDark(tpl.theme_config?.title_color_dark || '#FDF6E2');
        setFormSubtitleLight(tpl.theme_config?.subtitle_color_light || '#78350F');
        setFormSubtitleDark(tpl.theme_config?.subtitle_color_dark || '#FDE68A');
        setFormError(null);
        setModalOpen(true);
    };

    // File upload handler
    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, assetType: 'element' | 'mobile_bg' | 'desktop_bg') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAsset(assetType);
        setFormError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('asset_type', assetType);

            const res = await apiRequest('/api/internal/creator/tracking-templates/upload-asset', {
                method: 'POST',
                body: formData,
            });

            if (res?.url) {
                if (assetType === 'element') setFormElementUrl(res.url);
                if (assetType === 'mobile_bg') setFormMobileBgUrl(res.url);
                if (assetType === 'desktop_bg') setFormDesktopBgUrl(res.url);
            }
        } catch (err: any) {
            setFormError(`Error al subir imagen: ${err?.message || 'Fallo de subida'}`);
        } finally {
            setUploadingAsset(null);
            if (e.target) e.target.value = '';
        }
    };

    // Toggle plan in form
    const togglePlan = (planId: string) => {
        setFormAllowedPlans(prev =>
            prev.includes(planId)
                ? prev.filter(p => p !== planId)
                : [...prev, planId]
        );
    };

    // Save template (Create or Update)
    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) {
            setFormError('El nombre de la plantilla es obligatorio.');
            return;
        }

        setSavingTemplate(true);
        setFormError(null);

        const payload = {
            name: formName.trim(),
            slug: formSlug.trim() || undefined,
            description: formDescription.trim(),
            is_active: formIsActive,
            allowed_plans: formAllowedPlans.length > 0 ? formAllowedPlans : ['PRO', 'ULTRA'],
            background_mobile_url: formMobileBgUrl.trim() || null,
            background_desktop_url: formDesktopBgUrl.trim() || null,
            element_url: formElementUrl.trim() || null,
            theme_config: {
                accent_color: formAccentColor,
                title_color_light: formTitleLight,
                title_color_dark: formTitleDark,
                subtitle_color_light: formSubtitleLight,
                subtitle_color_dark: formSubtitleDark,
            },
        };

        try {
            if (editingTemplate && editingTemplate.id) {
                await apiRequest(`/api/internal/creator/tracking-templates/${editingTemplate.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiRequest('/api/internal/creator/tracking-templates', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
            setModalOpen(false);
            await fetchCatalog();
        } catch (err: any) {
            setFormError(err?.message || 'Error al guardar la plantilla.');
        } finally {
            setSavingTemplate(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-3 text-white/60 text-sm">
                <Loader2 size={18} className="animate-spin" /> Cargando configuraciones de seguimiento...
            </div>
        );
    }

    const dirty = selected !== initial;

    return (
        <div className="space-y-8">
            {/* SECCIÓN 1: Plantilla Predeterminada Global */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Palette className="text-primary" size={20} />
                            Plantilla Predeterminada Global
                        </h3>
                        <p className="text-sm text-white/50 mt-1">
                            Elige cuál plantilla se usará por defecto para los crematorios en planes base o que aún no hayan seleccionado una plantilla propia.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveDefault}
                        disabled={saving || !dirty}
                        className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                            dirty
                                ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
                                : 'bg-white/10 text-white/40 cursor-not-allowed'
                        }`}
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? 'Guardando...' : 'Guardar Predeterminada'}
                    </button>
                </div>

                {feedback && (
                    <div
                        className={`p-3.5 rounded-xl border text-xs font-semibold ${
                            feedback.type === 'ok'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }`}
                    >
                        {feedback.text}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TRACKING_TEMPLATES.map((tpl) => {
                        const isSelected = selected === tpl.id;
                        return (
                            <button
                                key={tpl.id}
                                type="button"
                                onClick={() => setSelected(tpl.id)}
                                className={`text-left rounded-2xl border p-4 transition-all flex flex-col justify-between gap-4 ${
                                    isSelected
                                        ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                                }`}
                            >
                                <div className="space-y-3 w-full">
                                    <div className={`h-28 rounded-xl border p-3 flex flex-col justify-between ${tpl.bgPreview} ${tpl.cardPreview}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="w-6 h-6 rounded-full" style={{ backgroundColor: tpl.accentColor }} />
                                            <span
                                                className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                                                style={{ backgroundColor: tpl.accentColor }}
                                            >
                                                {tpl.id}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="h-2 w-2/3 rounded-full opacity-35" style={{ backgroundColor: tpl.accentColor }} />
                                            <div className="h-2 w-1/2 rounded-full opacity-20" style={{ backgroundColor: tpl.accentColor }} />
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-bold text-sm text-white">{tpl.name}</div>
                                            <div className="text-[11px] text-white/50">{tpl.subtitle}</div>
                                        </div>
                                        {isSelected && <CheckCircle2 size={18} className="text-primary shrink-0" />}
                                    </div>

                                    <p className="text-xs text-white/60 leading-relaxed">{tpl.description}</p>
                                </div>

                                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-white/40">{tpl.badge}</span>
                                    <span className={isSelected ? 'text-primary flex items-center gap-1' : 'text-white/40'}>
                                        {isSelected ? <><Sparkles size={12} /> Por defecto</> : 'Seleccionar'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SECCIÓN 2: Catálogo y Constructor de Plantillas Visuales */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Layers className="text-amber-400" size={22} />
                            <h3 className="text-xl font-bold text-white">Constructor de Plantillas de Seguimiento</h3>
                        </div>
                        <p className="text-sm text-white/50 mt-1 max-w-2xl">
                            Crea y edita plantillas visuales con fondos personalizados (Móvil 9:16 y Desktop 16:9), elementos centrales decorativos (.webp transparente como alas o coronas), y asígnalas a los planes que desees.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={16} />
                        Nueva Plantilla
                    </button>
                </div>

                {loadingCatalog ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/50 text-sm">
                        <Loader2 size={24} className="animate-spin text-amber-400" />
                        Cargando catálogo de plantillas...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {catalog.map((tpl) => {
                            const isBuiltIn = tpl.is_built_in;
                            const hasCustomBg = Boolean(tpl.background_mobile_url || tpl.background_desktop_url);

                            return (
                                <div
                                    key={tpl.slug}
                                    className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative group ${
                                        tpl.is_active
                                            ? 'bg-white/[0.03] border-white/10 hover:border-amber-500/40'
                                            : 'bg-white/[0.01] border-white/5 opacity-60'
                                    }`}
                                >
                                    {/* Preview Header / Banner */}
                                    <div className="h-44 relative overflow-hidden bg-black/40 flex items-center justify-center p-4 border-b border-white/10">
                                        {/* Background Preview */}
                                        {tpl.background_mobile_url || tpl.background_desktop_url ? (
                                            <img
                                                src={tpl.background_desktop_url || tpl.background_mobile_url || ''}
                                                alt={tpl.name}
                                                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div
                                                className="absolute inset-0 opacity-40"
                                                style={{
                                                    background: tpl.slug === 'warm'
                                                        ? 'linear-gradient(135deg, #78350F 0%, #171311 100%)'
                                                        : tpl.slug === 'modern'
                                                            ? 'linear-gradient(135deg, #065F46 0%, #090D16 100%)'
                                                            : 'linear-gradient(135deg, #0369A1 0%, #082F49 100%)'
                                                }}
                                            />
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

                                        {/* Central Avatar Simulation */}
                                        <div className="relative z-10 flex flex-col items-center">
                                            {/* Decorative Element if present */}
                                            {tpl.element_url && (
                                                <img
                                                    src={tpl.element_url}
                                                    alt="Elemento"
                                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-auto pointer-events-none drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                                                />
                                            )}

                                            {/* Halo & Ring */}
                                            <div className="relative w-16 h-16 rounded-full p-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 shadow-lg">
                                                <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center overflow-hidden">
                                                    <span className="text-xl">🐾</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="absolute top-3 left-3 z-10 flex gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md border ${
                                                isBuiltIn
                                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            }`}>
                                                {isBuiltIn ? 'Sistema' : 'Personalizada'}
                                            </span>
                                            {!tpl.is_active && (
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                                    Desactivada
                                                </span>
                                            )}
                                        </div>

                                        {/* Toggle switch for custom templates */}
                                        {!isBuiltIn && (
                                            <div className="absolute top-3 right-3 z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(tpl)}
                                                    title={tpl.is_active ? 'Desactivar plantilla' : 'Activar plantilla'}
                                                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                                                        tpl.is_active ? 'bg-emerald-500' : 'bg-white/20'
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                                                        tpl.is_active ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Template Body */}
                                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                                                    {tpl.name}
                                                </h4>
                                                <span className="text-[11px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">
                                                    {tpl.slug}
                                                </span>
                                            </div>

                                            <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                                                {tpl.description || 'Sin descripción.'}
                                            </p>
                                        </div>

                                        {/* Plans pills */}
                                        <div className="space-y-2 pt-2 border-t border-white/10">
                                            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                                                Planes con Acceso
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tpl.allowed_plans?.map((plan) => {
                                                    const planMeta = AVAILABLE_PLANS.find(p => p.id === plan);
                                                    return (
                                                        <span
                                                            key={plan}
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                                planMeta?.color || 'bg-white/5 text-white/60 border-white/10'
                                                            }`}
                                                        >
                                                            {plan}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Actions footer */}
                                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                            {!isBuiltIn ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(tpl)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Edit3 size={13} /> Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteTemplate(tpl)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-300 flex items-center gap-1.5 transition-colors"
                                                        title="Eliminar plantilla"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-[11px] text-white/40 italic flex items-center gap-1">
                                                    <ShieldCheck size={13} /> Predefinida de fábrica
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL / DRAWER: CONSTRUCTOR Y EDITOR DE PLANTILLAS */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#12141a] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto">
                        {/* Modal Header */}
                        <div className="shrink-0 p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Sparkles className="text-amber-400" size={20} />
                                    {editingTemplate ? `Editar Plantilla: ${editingTemplate.name}` : 'Crear Nueva Plantilla de Seguimiento'}
                                </h3>
                                <p className="text-xs text-white/50 mt-1">
                                    Personaliza los fondos, elemento decorativo, paleta de colores y asignación por planes.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body: Two Columns (Form + Live Preview) with Scrollable Content & Sticky Footer */}
                        <form onSubmit={handleSaveTemplate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                                {formError && (
                                    <div className="p-3.5 rounded-xl border bg-red-500/10 border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        {formError}
                                    </div>
                                )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left Column: Form Controls (7 cols) */}
                                <div className="lg:col-span-7 space-y-5">
                                    {/* Name & Slug */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                                                Nombre de la Plantilla *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                                placeholder="Ej: Jardín Celestial, Alas de Luz..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                                                Identificador / Slug
                                            </label>
                                            <input
                                                type="text"
                                                value={formSlug}
                                                onChange={(e) => setFormSlug(e.target.value)}
                                                placeholder="ej: jardin-celestial"
                                                disabled={Boolean(editingTemplate?.id)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400 disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                                            Descripción
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formDescription}
                                            onChange={(e) => setFormDescription(e.target.value)}
                                            placeholder="Breve reseña sobre la estética y propósito conmemorativo de esta plantilla."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400"
                                        />
                                    </div>

                                    {/* Allowed Plans */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                                            Planes con Acceso a esta Plantilla
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {AVAILABLE_PLANS.map((plan) => {
                                                const checked = formAllowedPlans.includes(plan.id);
                                                return (
                                                    <button
                                                        key={plan.id}
                                                        type="button"
                                                        onClick={() => togglePlan(plan.id)}
                                                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                                                            checked
                                                                ? `${plan.color} ring-1 ring-amber-400/40`
                                                                : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/70'
                                                        }`}
                                                    >
                                                        <span>{plan.label}</span>
                                                        {checked && <Check size={14} className="text-amber-400" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Asset Uploads */}
                                    <div className="space-y-4 pt-2 border-t border-white/10">
                                        <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                                            Recursos Visuales (.webp)
                                        </div>

                                        {/* 1. Elemento Decorativo */}
                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-amber-400" />
                                                    Elemento Decorativo Central (.webp transparente)
                                                </div>
                                                <span className="text-[10px] text-white/40">Alas, Coronas, Flores</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={formElementUrl}
                                                    onChange={(e) => setFormElementUrl(e.target.value)}
                                                    placeholder="/tracking/elementos/alas_elemento.webp"
                                                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRefElement.current?.click()}
                                                    disabled={uploadingAsset === 'element'}
                                                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30 flex items-center gap-1 transition-colors"
                                                >
                                                    {uploadingAsset === 'element' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                    Subir
                                                </button>
                                                <input
                                                    ref={fileInputRefElement}
                                                    type="file"
                                                    accept="image/webp,image/png"
                                                    className="hidden"
                                                    onChange={(e) => handleUploadFile(e, 'element')}
                                                />
                                            </div>
                                        </div>

                                        {/* 2. Fondo Móvil (9:16) */}
                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                    <ImageIcon size={14} className="text-sky-400" />
                                                    Fondo Vertical Móvil (9:16 en .webp)
                                                </div>
                                                <span className="text-[10px] text-white/40">1080x1920 px</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={formMobileBgUrl}
                                                    onChange={(e) => setFormMobileBgUrl(e.target.value)}
                                                    placeholder="/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp"
                                                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRefMobile.current?.click()}
                                                    disabled={uploadingAsset === 'mobile_bg'}
                                                    className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold rounded-lg border border-sky-500/30 flex items-center gap-1 transition-colors"
                                                >
                                                    {uploadingAsset === 'mobile_bg' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                    Subir
                                                </button>
                                                <input
                                                    ref={fileInputRefMobile}
                                                    type="file"
                                                    accept="image/webp,image/png,image/jpeg"
                                                    className="hidden"
                                                    onChange={(e) => handleUploadFile(e, 'mobile_bg')}
                                                />
                                            </div>
                                        </div>

                                        {/* 3. Fondo Desktop (16:9) */}
                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                    <ImageIcon size={14} className="text-purple-400" />
                                                    Fondo Panorámico Desktop (16:9 en .webp)
                                                </div>
                                                <span className="text-[10px] text-white/40">1920x1080 px</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={formDesktopBgUrl}
                                                    onChange={(e) => setFormDesktopBgUrl(e.target.value)}
                                                    placeholder="/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp"
                                                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRefDesktop.current?.click()}
                                                    disabled={uploadingAsset === 'desktop_bg'}
                                                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold rounded-lg border border-purple-500/30 flex items-center gap-1 transition-colors"
                                                >
                                                    {uploadingAsset === 'desktop_bg' ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                                    Subir
                                                </button>
                                                <input
                                                    ref={fileInputRefDesktop}
                                                    type="file"
                                                    accept="image/webp,image/png,image/jpeg"
                                                    className="hidden"
                                                    onChange={(e) => handleUploadFile(e, 'desktop_bg')}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Colors */}
                                    <div className="space-y-3 pt-2 border-t border-white/10">
                                        <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                                            Colores del Tema
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1">Color Acento</label>
                                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1.5">
                                                    <input
                                                        type="color"
                                                        value={formAccentColor}
                                                        onChange={(e) => setFormAccentColor(e.target.value)}
                                                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                                                    />
                                                    <span className="text-xs font-mono text-white/80">{formAccentColor}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1">Título (Día)</label>
                                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1.5">
                                                    <input
                                                        type="color"
                                                        value={formTitleLight}
                                                        onChange={(e) => setFormTitleLight(e.target.value)}
                                                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                                                    />
                                                    <span className="text-xs font-mono text-white/80">{formTitleLight}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1">Título (Noche)</label>
                                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1.5">
                                                    <input
                                                        type="color"
                                                        value={formTitleDark}
                                                        onChange={(e) => setFormTitleDark(e.target.value)}
                                                        className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                                                    />
                                                    <span className="text-xs font-mono text-white/80">{formTitleDark}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Live Interactive Simulation Preview (5 cols) */}
                                <div className="lg:col-span-5 flex flex-col space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                            <Eye size={14} /> Vista Previa en Vivo
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDarkMode(!previewDarkMode)}
                                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80 flex items-center gap-1.5 transition-colors"
                                        >
                                            {previewDarkMode ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-sky-300" />}
                                            {previewDarkMode ? 'Día' : 'Noche'}
                                        </button>
                                    </div>

                                    {/* Mockup Frame (Mobile aspect ratio preview) */}
                                    <div
                                        className={`w-full h-[470px] rounded-2xl border border-white/20 overflow-hidden relative shadow-2xl flex flex-col justify-between p-4 transition-colors duration-500 ${
                                            previewDarkMode ? 'bg-[#120d09]' : 'bg-[#FFFDF7]'
                                        }`}
                                    >
                                        {/* Background Layer */}
                                        {formMobileBgUrl && (
                                            <img
                                                src={formMobileBgUrl}
                                                alt="Fondo preview"
                                                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                                            />
                                        )}

                                        {/* Dark Mode Overlay */}
                                        {previewDarkMode && (
                                            <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] pointer-events-none" />
                                        )}

                                        {/* Mock Header */}
                                        <div className="relative z-10 flex items-center justify-between px-2 py-1 border-b border-white/20 backdrop-blur-md rounded-xl bg-black/20 text-[10px] text-white/80 font-bold uppercase tracking-widest">
                                            <span>Crematorio Demo</span>
                                            <span>{previewDarkMode ? '🌙' : '☀️'}</span>
                                        </div>

                                        {/* Mock Avatar with Aureola, Stars, Rings & Wings */}
                                        <div className="relative z-10 flex flex-col items-center my-auto">
                                            <div className="relative inline-block">
                                                {/* Ambient Glow */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 rounded-full bg-amber-300/30 blur-2xl pointer-events-none" />

                                                {/* Central Element (.webp) */}
                                                {formElementUrl && (
                                                    <img
                                                        src={formElementUrl}
                                                        alt="Elemento Decorativo"
                                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 max-w-none pointer-events-none z-0 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                                    />
                                                )}

                                                {/* Aureola / Halo Luminous */}
                                                <div className="absolute -top-5 left-0 right-0 flex justify-center z-20 pointer-events-none">
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-8 rounded-full bg-amber-300/35 blur-sm pointer-events-none" />
                                                    <svg
                                                        viewBox="0 0 160 44"
                                                        className="w-24 h-auto overflow-visible relative"
                                                        style={{
                                                            filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.95)) drop-shadow(0 0 16px rgba(245, 158, 11, 0.7))'
                                                        }}
                                                    >
                                                        <ellipse
                                                            cx="80"
                                                            cy="22"
                                                            rx="62"
                                                            ry="14"
                                                            fill="none"
                                                            stroke="#FBBF24"
                                                            strokeWidth="4.5"
                                                        />
                                                    </svg>
                                                </div>

                                                {/* Outer dashed ring with sparkles */}
                                                <div className="absolute -inset-3 rounded-full border border-dashed border-amber-300/70 pointer-events-none z-10">
                                                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-amber-400 text-[10px]">✦</span>
                                                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-amber-400 text-[10px]">✦</span>
                                                    <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 text-amber-400 text-[10px]">✦</span>
                                                    <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 text-amber-400 text-[10px]">✦</span>
                                                </div>

                                                {/* Portrait circular ring */}
                                                <div
                                                    className="w-28 h-28 rounded-full p-1.5 relative z-10 shadow-xl"
                                                    style={{
                                                        background: 'linear-gradient(180deg, #FDE68A 0%, #FBBF24 20%, #F59E0B 50%, #D97706 80%, #B45309 100%)',
                                                    }}
                                                >
                                                    <div className="w-full h-full rounded-full ring-2 ring-white overflow-hidden relative bg-white flex items-center justify-center">
                                                        <span className="text-3xl">🐱</span>
                                                    </div>
                                                </div>

                                                {/* Crematorio badge without border */}
                                                <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full bg-white shadow-lg p-1 flex items-center justify-center">
                                                    <span className="text-[11px] font-black text-amber-600">∞</span>
                                                </div>
                                            </div>

                                            {/* Typography simulation */}
                                            <div className="mt-3 text-center space-y-0.5">
                                                <p
                                                    className="text-[9px] font-bold tracking-widest uppercase"
                                                    style={{ color: previewDarkMode ? formSubtitleDark : formSubtitleLight }}
                                                >
                                                    ♥ Acompañando el Proceso ♥
                                                </p>
                                                <h4
                                                    className="text-2xl font-bold tracking-wide"
                                                    style={{
                                                        color: previewDarkMode ? formTitleDark : formTitleLight,
                                                        fontFamily: 'serif'
                                                    }}
                                                >
                                                    {formName || 'Sufia'}
                                                </h4>
                                            </div>
                                        </div>

                                        {/* Mock Timeline step */}
                                        <div className="relative z-10 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl p-3 border border-amber-300/40 shadow-md">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-3 h-3 rounded-full animate-pulse"
                                                        style={{ backgroundColor: formAccentColor }}
                                                    />
                                                    <span className="font-bold text-gray-800 dark:text-gray-100">En proceso de cremación</span>
                                                </div>
                                                <span
                                                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                                                    style={{ backgroundColor: formAccentColor }}
                                                >
                                                    En curso
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer (Fijo al fondo) */}
                            <div className="shrink-0 p-4 sm:px-6 border-t border-white/10 bg-[#12141a] flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={savingTemplate}
                                    className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {savingTemplate ? 'Guardando...' : editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
