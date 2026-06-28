"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { apiRequest } from '@/lib/admin/api';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Layout, Type, Search, CreditCard, Palette, ArrowUp, ArrowDown, HelpCircle, Building2, Globe, Mail, Phone, MapPin, Instagram, Facebook, Twitter, Youtube, Upload, ImageIcon, Database } from 'lucide-react';
import ImageCropper from '@/components/tenant/ImageCropper';
import BackupSettings from './BackupSettings';

export default function LandingConfigPage() {
    const [config, setConfig] = useState<any>({
        seo: { title: '', description: '' },
        hero: { h1: '', h2: '', subtitle: '' },
        theme: 'emerald',
        plans: [],
        features: [],
        whatsapp: { show: false, phone: '56998239540', message: 'Hola, me gustaría más información.', color: '#25D366' }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saasConfig, setSaasConfig] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('general'); // general, plans, features, style, whatsapp, institucional

    // Logo Upload State
    const [showCropper, setShowCropper] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Unsaved changes tracking
    const baseConfigRef = useRef<string>('');
    const baseSaasRef = useRef<string>('');

    useEffect(() => {
        fetchConfig();
    }, []);

    // Capture baseline after initial load
    useEffect(() => {
        if (!loading) {
            baseConfigRef.current = JSON.stringify(config);
            baseSaasRef.current = JSON.stringify(saasConfig);
        }
    }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

    const isDirty = !loading && (
        JSON.stringify(config) !== baseConfigRef.current ||
        JSON.stringify(saasConfig) !== baseSaasRef.current
    );

    // Block browser navigation when there are unsaved changes
    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);


    const fetchConfig = async () => {
        try {
            const data = await apiRequest('/api/public/landing-config');
            if (data && data.config) {
                // Merge with defaults to ensure all keys exist
                setConfig((prev: any) => ({
                    ...prev,
                    ...data.config,
                    seo: { ...prev.seo, ...(data.config.seo || {}), keywords: '', ogImage: '', ...(data.config.seo || {}) },
                    hero: {
                        h1: '', h2: '', subtitle: '',
                        badge: '✨ La plataforma #1 para la industria funeraria pet',
                        backgroundImage: '',
                        bgOpacity: 0.5,
                        bgCenter: true,
                        bgStretch: true,
                        button1Text: 'Crear mi Sede Virtual',
                        button1Url: '/register',
                        button2Text: 'Ver Cotización',
                        button2Url: '#pricing',
                        ...(data.config.hero || {})
                    },
                    carousel: {
                        images: [],
                        transition: 'fade', // fade, slide, zoom
                        ctaText: 'Solicitar Demo por WhatsApp',
                        ctaUrl: 'https://wa.me/56998239540',
                        borderRadius: '2rem',
                        ...(data.config.carousel || {})
                    },
                    whatsapp: { ...prev.whatsapp, ...(data.config.whatsapp || {}) }
                }));
            }

            // Fetch SaaS Global Config
            const saasData = await apiRequest('/api/internal/creator/config');
            if (saasData) {
                setSaasConfig(saasData);
            }
        } catch (error) {
            console.error('Error fetching config, using defaults:', error);
            // Config is already initialized with defaults, so we just stop loading
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiRequest('/api/internal/landing/landing-config', {
                method: 'PUT',
                body: {
                    key: "main_landing",
                    config: config
                }
            });
            baseConfigRef.current = JSON.stringify(config);
            
            // Revalidate landing page cache
            await fetch('/api/revalidate-landing', { method: 'POST' }).catch(() => {});

            setFeedbackModal({
                isOpen: true,
                title: 'Éxito',
                message: 'Configuración guardada exitosamente',
                variant: 'success'
            });
        } catch (error) {
            setFeedbackModal({
                isOpen: true,
                title: 'Error',
                message: 'Error al guardar configuración',
                variant: 'danger'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSaas = async () => {
        setSaving(true);
        try {
            const data = await apiRequest('/api/internal/creator/config', {
                method: 'PUT',
                body: saasConfig
            });
            setSaasConfig(data);
            baseSaasRef.current = JSON.stringify(data);

            // Revalidate landing page cache
            await fetch('/api/revalidate-landing', { method: 'POST' }).catch(() => {});

            setFeedbackModal({
                isOpen: true,
                title: 'Éxito',
                message: 'Datos institucionales guardados',
                variant: 'success'
            });
        } catch (error) {
            setFeedbackModal({
                isOpen: true,
                title: 'Error',
                message: 'Error al guardar datos institucionales',
                variant: 'danger'
            });
        } finally {
            setSaving(false);
        }
    };

    const updateNestedStart = (path: string, value: any) => {
        setConfig((prev: any) => {
            const newConfig = { ...prev };
            const keys = path.split('.');
            let current = newConfig;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newConfig;
        });
    };

    const updateSaasField = (field: string, value: any) => {
        setSaasConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    // Helper to add item to list
    const addListItem = (listName: string, template: any) => {
        setConfig((prev: any) => ({
            ...prev,
            [listName]: [...(prev[listName] || []), template]
        }));
    };

    // Helper to remove item
    const removeListItem = (listName: string, index: number) => {
        setConfig((prev: any) => ({
            ...prev,
            [listName]: prev[listName].filter((_: any, i: number) => i !== index)
        }));
    };

    // Feedback Modal State
    const [feedbackModal, setFeedbackModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'success' | 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'success'
    });

    const closeFeedback = () => setFeedbackModal(prev => ({ ...prev, isOpen: false }));

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setSelectedImage(reader.result as string);
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
            // Reset input
            e.target.value = '';
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setShowCropper(false);
        setUploadingLogo(true);

        const formData = new FormData();
        formData.append('file', croppedBlob);

        try {
            const response = await apiRequest('/api/internal/creator/config/logo', {
                method: 'POST',
                body: formData, // apiRequest handles headers for FormData if not set manually often, but let's check lib
            });

            if (response && response.logo_url) {
                setSaasConfig((prev: any) => ({ ...prev, logo: response.logo_url }));
                setFeedbackModal({
                    isOpen: true,
                    title: 'Éxito',
                    message: 'Logo actualizado correctamente',
                    variant: 'success'
                });
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
            setFeedbackModal({
                isOpen: true,
                title: 'Error',
                message: 'Error al subir el logo',
                variant: 'danger'
            });
        } finally {
            setUploadingLogo(false);
            setSelectedImage(null);
        }
    };

    if (loading) return <div className="p-8 text-white">Cargando configuración...</div>;

    return (
        <div className="min-h-screen bg-[#0a192f] text-white p-8 pb-32">
            {/* Unsaved changes banner */}
            {isDirty && (
                <div className="sticky top-0 z-30 -mx-8 -mt-8 mb-4 px-8 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300 text-sm font-bold flex-1">Tienes cambios sin guardar</span>
                    <button
                        onClick={activeTab === 'institucional' ? handleSaveSaas : handleSave}
                        disabled={saving}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar ahora'}
                    </button>
                </div>
            )}

            <header className="flex justify-between items-center mb-10 sticky top-0 bg-[#0a192f]/90 backdrop-blur-md z-20 py-4 border-b border-white/10">
                <div>
                    <h1 className="text-3xl font-black mb-1">Configuración Landing</h1>
                    <p className="text-white/40">Personaliza la experiencia pública de SaaS Crematorio.</p>
                </div>
                <button
                    onClick={activeTab === 'institucional' ? handleSaveSaas : handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </header>

            <div className="flex gap-6">
                {/* Sidebar Navigation */}
                <div className="w-64 space-y-2 sticky top-32 h-fit">
                    {[
                        { id: 'general', label: 'General & SEO', icon: Search },
                        { id: 'style', label: 'Estilo & Tema', icon: Palette },
                        { id: 'hero', label: 'Hero Section', icon: Layout },
                        { id: 'carousel', label: 'Galería Fotos', icon: Layout },
                        { id: 'features', label: 'Características', icon: Layout },
                        { id: 'plans', label: 'Planes', icon: CreditCard },
                        { id: 'whatsapp', label: 'WhatsApp / Contacto', icon: ArrowDown },
                        { id: 'institucional', label: 'Datos del SaaS', icon: Building2 },
                        { id: 'backups', label: 'Respaldos', icon: Database },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                }`}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-8 max-w-4xl">

                    {/* Backups Section */}
                    {activeTab === 'backups' && (
                        <BackupSettings />
                    )}

                    {/* General & SEO */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* SEO Metadata - Main */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Search className="text-primary" size={20} /> SEO Metadata</h3>
                                <div className="space-y-4">
                                    {/* Meta Title */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs uppercase font-bold text-white/40">Meta Title</label>
                                                <div className="group relative">
                                                    <HelpCircle size={14} className="text-white/30 hover:text-primary cursor-help" />
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-[#0a192f] border border-white/20 rounded-lg text-xs text-white/80 z-50 shadow-xl">
                                                        Título que aparece en pestañas del navegador y resultados de Google. Debe ser descriptivo y contener palabras clave principales (máx. 60 caracteres).
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-xs font-mono ${(config.seo?.title?.length || 0) > 60 ? 'text-red-400' : (config.seo?.title?.length || 0) > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                {config.seo?.title?.length || 0}/60
                                            </span>
                                        </div>
                                        <input
                                            value={config.seo?.title || ''}
                                            onChange={(e) => updateNestedStart('seo.title', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                            placeholder="SaaS Crematorio - Gestión Profesional para Crematorios"
                                        />
                                        {(config.seo?.title?.length || 0) > 60 && (
                                            <p className="text-xs text-red-400 mt-1">⚠️ El título es demasiado largo, puede aparecer cortado en Google</p>
                                        )}
                                    </div>

                                    {/* Meta Description */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs uppercase font-bold text-white/40">Meta Description</label>
                                                <div className="group relative">
                                                    <HelpCircle size={14} className="text-white/30 hover:text-primary cursor-help" />
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-[#0a192f] border border-white/20 rounded-lg text-xs text-white/80 z-50 shadow-xl">
                                                        Resumen que aparece bajo el título en Google. Debe ser atractivo para generar clics (CTR). Máximo 155-160 caracteres.
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-xs font-mono ${(config.seo?.description?.length || 0) > 160 ? 'text-red-400' : (config.seo?.description?.length || 0) > 145 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                {config.seo?.description?.length || 0}/160
                                            </span>
                                        </div>
                                        <textarea
                                            value={config.seo?.description || ''}
                                            onChange={(e) => updateNestedStart('seo.description', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary min-h-[100px]"
                                            placeholder="Sistema completo para gestionar cremaciones, clientes, inventarios y más. Optimiza tu crematorio con tecnología moderna."
                                        />
                                        {(config.seo?.description?.length || 0) > 160 && (
                                            <p className="text-xs text-red-400 mt-1">⚠️ La descripción puede aparecer cortada en los resultados de búsqueda</p>
                                        )}
                                    </div>

                                    {/* Keywords */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <label className="text-xs uppercase font-bold text-white/40">Meta Keywords (Opcional)</label>
                                            <div className="group relative">
                                                <HelpCircle size={14} className="text-white/30 hover:text-primary cursor-help" />
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-[#0a192f] border border-white/20 rounded-lg text-xs text-white/80 z-50 shadow-xl">
                                                    Palabras clave separadas por comas. Aunque Google ya no las usa mucho, algunos buscadores sí. Ej: "crematorio, mascotas, servicios".
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            value={config.seo?.keywords || ''}
                                            onChange={(e) => updateNestedStart('seo.keywords', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm"
                                            placeholder="crematorio, mascotas, servicios funerarios, gestión"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Google Snippet Preview */}
                            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-white/60 mb-3">📊 Vista Previa en Google</h3>
                                <div className="bg-white rounded-lg p-4 font-sans">
                                    <div className="text-[#1a0dab] text-xl hover:underline cursor-pointer leading-tight mb-1">
                                        {config.seo?.title || "SaaS Crematorio - Título de Ejemplo"}
                                    </div>
                                    <div className="text-[#006621] text-sm mb-1">
                                        https://www.saascrematorio.cl › landing
                                    </div>
                                    <div className="text-[#4d5156] text-sm leading-relaxed">
                                        {config.seo?.description || "Descripción de ejemplo para tu sitio. Explica de forma clara y atractiva lo que ofreces para aumentar el CTR."}
                                    </div>
                                </div>
                            </div>

                            {/* Advanced SEO */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Type className="text-primary" size={20} /> Configuración Avanzada</h3>
                                <div className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <label className="text-xs uppercase font-bold text-white/40">Canonical URL</label>
                                                <div className="group relative">
                                                    <HelpCircle size={12} className="text-white/30 hover:text-primary cursor-help" />
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-[#0a192f] border border-white/20 rounded-lg text-[10px] text-white/80 z-50 shadow-xl">
                                                        URL oficial de esta página. Evita contenido duplicado en Google.
                                                    </div>
                                                </div>
                                            </div>
                                            <input
                                                value={config.seo?.canonical || ''}
                                                onChange={(e) => updateNestedStart('seo.canonical', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-xs font-mono"
                                                placeholder="https://www.saascrematorio.cl"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <label className="text-xs uppercase font-bold text-white/40">Robots</label>
                                                <div className="group relative">
                                                    <HelpCircle size={12} className="text-white/30 hover:text-primary cursor-help" />
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-[#0a192f] border border-white/20 rounded-lg text-[10px] text-white/80 z-50 shadow-xl">
                                                        Controla si Google indexa tu página. "Index" = visible en búsquedas.
                                                    </div>
                                                </div>
                                            </div>
                                            <select
                                                value={config.seo?.robots || 'index, follow'}
                                                onChange={(e) => updateNestedStart('seo.robots', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm"
                                            >
                                                <option value="index, follow">Index, Follow (Público)</option>
                                                <option value="noindex, nofollow">NoIndex, NoFollow (Privado)</option>
                                                <option value="index, nofollow">Index, NoFollow</option>
                                                <option value="noindex, follow">NoIndex, Follow</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <h4 className="text-sm font-bold text-white/60">Open Graph (Redes Sociales)</h4>
                                            <div className="group relative">
                                                <HelpCircle size={14} className="text-white/30 hover:text-primary cursor-help" />
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-[#0a192f] border border-white/20 rounded-lg text-xs text-white/80 z-50 shadow-xl">
                                                    Controla cómo se ve tu enlace cuando se comparte en Facebook, WhatsApp, LinkedIn, etc.
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-white/40 mb-1 block">OG Title</label>
                                                <input
                                                    value={config.seo?.ogTitle || ''}
                                                    onChange={(e) => updateNestedStart('seo.ogTitle', e.target.value)}
                                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-2 outline-none focus:border-primary text-sm"
                                                    placeholder={config.seo?.title || "Usa el meta title si está vacío"}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-white/40 mb-1 block">OG Description</label>
                                                <textarea
                                                    value={config.seo?.ogDescription || ''}
                                                    onChange={(e) => updateNestedStart('seo.ogDescription', e.target.value)}
                                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-2 outline-none focus:border-primary text-sm min-h-[60px]"
                                                    placeholder={config.seo?.description || "Usa la meta description si está vacío"}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-white/40 mb-1 block">OG Image (URL)</label>
                                                <input
                                                    value={config.seo?.ogImage || ''}
                                                    onChange={(e) => updateNestedStart('seo.ogImage', e.target.value)}
                                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-2 outline-none focus:border-primary font-mono text-xs"
                                                    placeholder="https://ejemplo.com/imagen-social.jpg"
                                                />
                                                <p className="text-[10px] text-white/30 mt-1">Recomendado: 1200x630px</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Style & Theme */}
                    {activeTab === 'style' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Palette className="text-primary" size={20} /> Tema Visual</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'default', name: 'Azul Original', color: '#00a3ff' },
                                    { id: 'warm', name: 'Lino Cálido', color: '#c5a059' },
                                ].map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => updateNestedStart('theme', theme.id)}
                                        className={`relative p-4 rounded-2xl border-2 transition-all text-left group overflow-hidden ${config.theme === theme.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full mb-3 shadow-lg" style={{ backgroundColor: theme.color }} />
                                        <div className="font-bold">{theme.name}</div>
                                        {config.theme === theme.id && <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Carousel Section */}
                    {activeTab === 'carousel' && (
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Layout className="text-primary" size={20} /> Configuración de Galería</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-8">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Efecto de Transición</label>
                                            <div className="flex gap-2">
                                                {['fade', 'slide', 'zoom'].map((effect) => (
                                                    <button
                                                        key={effect}
                                                        onClick={() => updateNestedStart('carousel.transition', effect)}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-bold capitalize ${config.carousel?.transition === effect
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {effect}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Bordes Redondeados</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { label: 'Cuadrado', value: '0px' },
                                                    { label: 'Sutil', value: '0.5rem' },
                                                    { label: 'Normal', value: '1rem' },
                                                    { label: 'Redondo', value: '2rem' },
                                                ].map((radius) => (
                                                    <button
                                                        key={radius.value}
                                                        onClick={() => updateNestedStart('carousel.borderRadius', radius.value)}
                                                        className={`px-3 py-2 rounded-lg border text-xs font-bold ${config.carousel?.borderRadius === radius.value
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {radius.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Texto Botón WhatsApp</label>
                                            <input
                                                value={config.carousel?.ctaText || ''}
                                                onChange={(e) => updateNestedStart('carousel.ctaText', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                                placeholder="Solicitar Demo..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">URL WhatsApp (ctaUrl)</label>
                                            <input
                                                value={config.carousel?.ctaUrl || ''}
                                                onChange={(e) => updateNestedStart('carousel.ctaUrl', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary font-mono text-xs"
                                                placeholder="https://wa.me/..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold">Imágenes del Carrusel ({config.carousel?.images?.length || 0}/10)</h3>
                                        <p className="text-xs text-white/40 mt-1">Tamaño sugerido: <span className="text-primary font-mono">1920x1080 (16:9)</span> para mejor visualización.</p>
                                    </div>
                                    {(!config.carousel?.images || config.carousel.images.length < 10) && (
                                        <button
                                            onClick={() => {
                                                const newImages = [...(config.carousel?.images || []), ''];
                                                updateNestedStart('carousel.images', newImages);
                                            }}
                                            className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <Plus size={16} /> Agregar Foto
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {config.carousel?.images?.map((url: string, idx: number) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <span className="text-white/30 font-mono text-xs w-6">{idx + 1}.</span>
                                            <input
                                                value={url}
                                                onChange={(e) => {
                                                    const newImages = [...config.carousel.images];
                                                    newImages[idx] = e.target.value;
                                                    updateNestedStart('carousel.images', newImages);
                                                }}
                                                className="flex-1 bg-[#0a192f] border border-white/10 rounded-lg p-3 outline-none focus:border-primary font-mono text-xs"
                                                placeholder="https://ejemplo.com/foto.jpg"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newImages = config.carousel.images.filter((_: any, i: number) => i !== idx);
                                                    updateNestedStart('carousel.images', newImages);
                                                }}
                                                className="p-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!config.carousel?.images || config.carousel.images.length === 0) && (
                                        <div className="text-center py-8 text-white/20 italic border border-dashed border-white/10 rounded-xl">
                                            No hay imágenes en el carrusel.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hero Section */}
                    {activeTab === 'hero' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Layout className="text-primary" size={20} /> Hero Section</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Título Principal (H1)</label>
                                    <input
                                        value={config.hero?.h1 || ''}
                                        onChange={(e) => updateNestedStart('hero.h1', e.target.value)}
                                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-lg font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Badge Superior (Opcional)</label>
                                    <input
                                        value={config.hero?.badge || ''}
                                        onChange={(e) => updateNestedStart('hero.badge', e.target.value)}
                                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm font-mono text-primary"
                                        placeholder="✨ La plataforma #1..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Subtítulo (Highlight)</label>
                                    <input
                                        value={config.hero?.h2 || ''}
                                        onChange={(e) => updateNestedStart('hero.h2', e.target.value)}
                                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Texto Descriptivo</label>
                                    <textarea
                                        value={config.hero?.subtitle || ''}
                                        onChange={(e) => updateNestedStart('hero.subtitle', e.target.value)}
                                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary min-h-[80px]"
                                    />
                                </div>

                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                                    <h4 className="font-bold text-sm text-white/60 mb-2">Imagen de Fondo</h4>
                                    <div>
                                        <label className="text-xs uppercase font-bold text-white/40 mb-1 block">URL de Imagen</label>
                                        <input
                                            value={config.hero?.backgroundImage || ''}
                                            onChange={(e) => updateNestedStart('hero.backgroundImage', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-xs font-mono"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Opacidad ({config.hero?.bgOpacity || 0.5})</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={config.hero?.bgOpacity || 0.5}
                                                onChange={(e) => updateNestedStart('hero.bgOpacity', parseFloat(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={config.hero?.bgCenter !== false}
                                                onChange={(e) => updateNestedStart('hero.bgCenter', e.target.checked)}
                                            />
                                            <label className="text-xs">Centrar</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={config.hero?.bgStretch !== false}
                                                onChange={(e) => updateNestedStart('hero.bgStretch', e.target.checked)}
                                            />
                                            <label className="text-xs">Estirar (Cover)</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                        <h4 className="font-bold text-sm text-white/60">Botón Principal</h4>
                                        <input
                                            value={config.hero?.button1Text || ''}
                                            onChange={(e) => updateNestedStart('hero.button1Text', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary"
                                            placeholder="Texto Botón"
                                        />
                                        <input
                                            value={config.hero?.button1Url || ''}
                                            onChange={(e) => updateNestedStart('hero.button1Url', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary font-mono"
                                            placeholder="URL"
                                        />
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                        <h4 className="font-bold text-sm text-white/60">Botón Secundario</h4>
                                        <input
                                            value={config.hero?.button2Text || ''}
                                            onChange={(e) => updateNestedStart('hero.button2Text', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary"
                                            placeholder="Texto Botón"
                                        />
                                        <input
                                            value={config.hero?.button2Url || ''}
                                            onChange={(e) => updateNestedStart('hero.button2Url', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary font-mono"
                                            placeholder="URL"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Features Cards */}
                    {activeTab === 'features' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Tarjetas "Lo que necesitas"</h3>
                                <button
                                    onClick={() => addListItem('features', { title: 'Nueva Característica', desc: 'Descripción aquí...', icon: 'Star' })}
                                    className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                                >
                                    <Plus size={16} /> Agregar
                                </button>
                            </div>

                            <div className="grid gap-4">
                                {config.features?.map((feature: any, i: number) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 group">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                value={feature.title}
                                                onChange={(e) => {
                                                    const newFeatures = [...config.features];
                                                    newFeatures[i].title = e.target.value;
                                                    updateNestedStart('features', newFeatures);
                                                }}
                                                className="w-full bg-transparent font-bold outline-none border-b border-white/10 focus:border-primary"
                                                placeholder="Título"
                                            />
                                            <textarea
                                                value={feature.desc}
                                                onChange={(e) => {
                                                    const newFeatures = [...config.features];
                                                    newFeatures[i].desc = e.target.value;
                                                    updateNestedStart('features', newFeatures);
                                                }}
                                                className="w-full bg-transparent text-sm text-white/60 outline-none resize-none"
                                                placeholder="Descripción"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => removeListItem('features', i)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(!config.features || config.features.length === 0) && (
                                    <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-white/30">
                                        No hay características definidas.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Plans */}
                    {activeTab === 'plans' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold">Planes de Suscripción</h3>
                                <button
                                    onClick={() => addListItem('plans', { name: 'Nuevo Plan', price: '0', period: '/mes', features: ['Feature 1'] })}
                                    className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                                >
                                    <Plus size={16} /> Agregar Plan
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {config.plans?.map((plan: any, i: number) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                                        <button
                                            onClick={() => removeListItem('plans', i)}
                                            className="absolute top-4 right-4 text-white/20 hover:text-red-400"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        <div className="space-y-4">
                                            <input
                                                value={plan.name}
                                                onChange={(e) => {
                                                    const newPlans = [...config.plans];
                                                    newPlans[i].name = e.target.value;
                                                    updateNestedStart('plans', newPlans);
                                                }}
                                                className="w-full bg-transparent text-xl font-black outline-none border-b border-white/10 focus:border-primary"
                                            />
                                        </div>

                                        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={plan.isPopular || false}
                                                    onChange={(e) => {
                                                        const newPlans = [...config.plans];
                                                        newPlans[i].isPopular = e.target.checked;
                                                        updateNestedStart('plans', newPlans);
                                                    }}
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                                                />
                                                <label className="text-xs font-bold uppercase">Es Popular</label>
                                            </div>

                                            {plan.isPopular && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="color"
                                                        value={plan.popularColor || '#10b981'}
                                                        onChange={(e) => {
                                                            const newPlans = [...config.plans];
                                                            newPlans[i].popularColor = e.target.value;
                                                            updateNestedStart('plans', newPlans);
                                                        }}
                                                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                                                    />
                                                    <label className="text-[10px] text-white/50">Color Badge</label>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-[10px] uppercase font-bold text-white/30">Precio</label>
                                                <input
                                                    type="number"
                                                    value={plan.price}
                                                    onChange={(e) => {
                                                        const newPlans = [...config.plans];
                                                        newPlans[i].price = e.target.value;
                                                        updateNestedStart('plans', newPlans);
                                                    }}
                                                    className="w-full bg-transparent text-2xl font-black outline-none border-b border-white/10 focus:border-green-400 appearance-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] uppercase font-bold text-white/30">Divisa</label>
                                                <input
                                                    value={plan.currency || 'CLP'}
                                                    onChange={(e) => {
                                                        const newPlans = [...config.plans];
                                                        newPlans[i].currency = e.target.value;
                                                        updateNestedStart('plans', newPlans);
                                                    }}
                                                    className="w-full bg-transparent text-lg font-bold outline-none border-b border-white/10 focus:border-white/50 text-right uppercase"
                                                    placeholder="CLP"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] uppercase font-bold text-white/30">Descuento (%)</label>
                                                {plan.discountPercent > 0 && (
                                                    <span className="text-[10px] text-green-400 font-bold">
                                                        Precio Final: ${Number(plan.price * (1 - plan.discountPercent / 100)).toLocaleString()} {plan.currency || 'CLP'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 bg-[#0a192f] border border-white/10 rounded-xl p-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={plan.discountPercent || 0}
                                                    onChange={(e) => {
                                                        const newPlans = [...config.plans];
                                                        newPlans[i].discountPercent = Number(e.target.value);
                                                        updateNestedStart('plans', newPlans);
                                                    }}
                                                    className="flex-1 accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <div className="w-12 text-right font-bold text-white/80">
                                                    {plan.discountPercent || 0}%
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] uppercase font-bold text-white/30">Características ({plan.features?.length || 0}/8)</label>
                                                {plan.features?.length < 8 && (
                                                    <button
                                                        onClick={() => {
                                                            const newPlans = [...config.plans];
                                                            if (!newPlans[i].features) newPlans[i].features = [];
                                                            newPlans[i].features.push('Nueva característica');
                                                            updateNestedStart('plans', newPlans);
                                                        }}
                                                        className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1"
                                                    >
                                                        <Plus size={12} /> Agregar
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                {plan.features?.map((feature: string, fIdx: number) => (
                                                    <div key={fIdx} className="flex gap-2">
                                                        <input
                                                            value={feature}
                                                            onChange={(e) => {
                                                                const newPlans = [...config.plans];
                                                                newPlans[i].features[fIdx] = e.target.value;
                                                                updateNestedStart('plans', newPlans);
                                                            }}
                                                            className="flex-1 bg-[#0a192f] border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newPlans = [...config.plans];
                                                                newPlans[i].features = newPlans[i].features.filter((_: any, idx: number) => idx !== fIdx);
                                                                updateNestedStart('plans', newPlans);
                                                            }}
                                                            className="w-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!plan.features || plan.features.length === 0) && (
                                                    <div className="text-center py-4 text-xs text-white/20 border border-dashed border-white/10 rounded-lg">
                                                        Sin características
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* WhatsApp Configuration */}
                    {activeTab === 'whatsapp' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">Configuración de WhatsApp</h3>

                            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <input
                                    type="checkbox"
                                    checked={config.whatsapp?.show || false}
                                    onChange={(e) => updateNestedStart('whatsapp.show', e.target.checked)}
                                    className="w-5 h-5 rounded border-green-500/50 text-green-500 focus:ring-green-500"
                                />
                                <div>
                                    <div className="font-bold text-green-400">Habilitar Botón Flotante</div>
                                    <div className="text-xs text-green-400/60">Muestra un botón de WhatsApp fijo en la esquina inferior derecha.</div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Número (con código país)</label>
                                    <input
                                        value={config.whatsapp?.phone || ''}
                                        onChange={(e) => updateNestedStart('whatsapp.phone', e.target.value)}
                                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-green-500 placeholder:text-white/10"
                                        placeholder="56998239540"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Color del Botón</label>
                                    <div className="flex items-center gap-3 bg-[#0a192f] border border-white/10 rounded-xl p-2 px-3">
                                        <input
                                            type="color"
                                            value={config.whatsapp?.color || '#25D366'}
                                            onChange={(e) => updateNestedStart('whatsapp.color', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-sm font-mono text-white/60">{config.whatsapp?.color || '#25D366'}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Mensaje Predefinido</label>
                                <textarea
                                    value={config.whatsapp?.message || ''}
                                    onChange={(e) => updateNestedStart('whatsapp.message', e.target.value)}
                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-green-500 min-h-[80px]"
                                    placeholder="Hola, me gustaría más información."
                                />
                            </div>
                        </div>
                    )}

                    {/* SaaS Institutional Data */}
                    {activeTab === 'institucional' && saasConfig && (
                        <div className="space-y-8 pb-20">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Building2 className="text-primary" size={20} /> Información General</h3>

                                <div className="mb-8 p-6 bg-black/20 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center gap-8">
                                    <div className="relative group w-32 h-32 bg-black/40 rounded-full border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                        {saasConfig.logo ? (
                                            <img
                                                src={`/${saasConfig.logo}`}
                                                alt="Logo SaaS"
                                                className="w-full h-full object-contain p-4"
                                            />
                                        ) : (
                                            <ImageIcon size={40} className="text-white/20" />
                                        )}
                                        {uploadingLogo && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-3">
                                        <div>
                                            <h4 className="font-bold text-lg text-white">Logo del SaaS</h4>
                                            <p className="text-xs text-white/40">Este logo se mostrará en la cabecera del sitio público y en documentos.</p>
                                        </div>
                                        <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-transition-all ${uploadingLogo ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer'}`}>
                                            <Upload size={16} />
                                            {uploadingLogo ? 'Subiendo...' : 'Subir Nuevo Logo'}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                disabled={uploadingLogo}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Nombre del SaaS</label>
                                            <input
                                                value={saasConfig.name || ''}
                                                onChange={(e) => updateSaasField('name', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary placeholder:text-white/10"
                                                placeholder="SaaS Crematorio"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">RUT / ID Fiscal</label>
                                            <input
                                                value={saasConfig.rut || ''}
                                                onChange={(e) => updateSaasField('rut', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary placeholder:text-white/10"
                                                placeholder="76.123.456-7"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Slug (URL)</label>
                                            <input
                                                value={saasConfig.slug || ''}
                                                onChange={(e) => updateSaasField('slug', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary font-mono text-xs placeholder:text-white/10"
                                                placeholder="saas-crematorio"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Eslogan</label>
                                            <input
                                                value={saasConfig.eslogan || ''}
                                                onChange={(e) => updateSaasField('eslogan', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary placeholder:text-white/10"
                                                placeholder="Gestión profesional para crematorios"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><MapPin className="text-primary" size={20} /> Ubicación y Contacto</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Dirección</label>
                                            <input
                                                value={saasConfig.direccion || ''}
                                                onChange={(e) => updateSaasField('direccion', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary placeholder:text-white/10"
                                                placeholder="Av. Principal 123"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Ciudad</label>
                                                <input
                                                    value={saasConfig.ciudad || ''}
                                                    onChange={(e) => updateSaasField('ciudad', e.target.value)}
                                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase font-bold text-white/40 mb-1 block">País</label>
                                                <input
                                                    value={saasConfig.pais || ''}
                                                    onChange={(e) => updateSaasField('pais', e.target.value)}
                                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Correo Electrónico</label>
                                            <input
                                                value={saasConfig.correo || ''}
                                                onChange={(e) => updateSaasField('correo', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">WhatsApp Corporativo</label>
                                            <input
                                                value={saasConfig.whatsapp || ''}
                                                onChange={(e) => updateSaasField('whatsapp', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Globe className="text-primary" size={20} /> Identidad Institucional</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Descripción Breve</label>
                                        <textarea
                                            value={saasConfig.descripcion || ''}
                                            onChange={(e) => updateSaasField('descripcion', e.target.value)}
                                            className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary min-h-[80px]"
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Misión</label>
                                            <textarea
                                                value={saasConfig.mision || ''}
                                                onChange={(e) => updateSaasField('mision', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary min-h-[100px]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase font-bold text-white/40 mb-1 block">Visión</label>
                                            <textarea
                                                value={saasConfig.vision || ''}
                                                onChange={(e) => updateSaasField('vision', e.target.value)}
                                                className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><Globe className="text-primary" size={20} /> Redes Sociales</h3>
                                    <button
                                        onClick={() => {
                                            const newSocial = [...(saasConfig.redes_sociales || []), { name: '', link: '' }];
                                            updateSaasField('redes_sociales', newSocial);
                                        }}
                                        className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                                    >
                                        <Plus size={16} /> Agregar Red
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {(saasConfig.redes_sociales || []).map((social: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 items-end">
                                            <div className="flex-1">
                                                <label className="text-[10px] uppercase font-bold text-white/30">Nombre (ej: Instagram)</label>
                                                <input
                                                    value={social.name}
                                                    onChange={(e) => {
                                                        const newSocial = [...saasConfig.redes_sociales];
                                                        newSocial[idx].name = e.target.value;
                                                        updateSaasField('redes_sociales', newSocial);
                                                    }}
                                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                                                />
                                            </div>
                                            <div className="flex-[2]">
                                                <label className="text-[10px] uppercase font-bold text-white/30">Link / URL</label>
                                                <input
                                                    value={social.link}
                                                    onChange={(e) => {
                                                        const newSocial = [...saasConfig.redes_sociales];
                                                        newSocial[idx].link = e.target.value;
                                                        updateSaasField('redes_sociales', newSocial);
                                                    }}
                                                    className="w-full bg-[#0a192f] border border-white/10 rounded-xl p-3 outline-none focus:border-primary font-mono text-xs"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newSocial = saasConfig.redes_sociales.filter((_: any, i: number) => i !== idx);
                                                    updateSaasField('redes_sociales', newSocial);
                                                }}
                                                className="p-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {showCropper && selectedImage && (
                <ImageCropper
                    image={selectedImage!}
                    aspect={4 / 3}
                    onCropComplete={handleCropComplete}
                    onCancel={() => { setShowCropper(false); setSelectedImage(null); }}
                    title="Recortar Logo SaaS"
                    cropShape="rect"
                />
            )}

            <ConfirmModal
                isOpen={feedbackModal.isOpen}
                onClose={closeFeedback}
                onConfirm={closeFeedback}
                title={feedbackModal.title}
                message={feedbackModal.message}
                variant={feedbackModal.variant}
                confirmText="Aceptar"
                cancelText="Cerrar" // Not used often in single button mode, but required prop? Let's check ConfirmModal source
            />
        </div>
    );
}

