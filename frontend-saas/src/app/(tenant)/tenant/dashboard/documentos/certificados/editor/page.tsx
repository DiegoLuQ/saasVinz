"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Plus,
    FileText,
    Layout,
    Type,
    Save,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    ChevronDown,
    MousePointer2,
    Upload,
    Image as ImageIcon,
    Settings2,
    AlignLeft,
    ArrowLeft,
    Smartphone,
    Eye,
    EyeOff,
    GripVertical
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { API_URL, apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import ImageCropper from '@/components/tenant/ImageCropper';

interface Template {
    id: number;
    name: string;
    category: string;
    paper_format: string;
    theme: string;
    title: string | null;
    subtitle: string | null;
    declaration_text: string | null;
    signature_text: string | null;
    memorial_message: string | null;
    memorial_title: string | null;
    header_logo_url: string | null;
    header_logo_x: string;
    header_logo_y: string;
    background_logo_url: string | null;
    background_logo_x: string;
    background_logo_y: string;
    background_logo_opacity: number;
    background_logo_rotation: number;
    header_logo_shape: string;
    background_logo_shape: string;
    farewell_text: string | null;
    sections_config: Record<string, { show: boolean, label?: string }>;
    sections_order: string[] | null;
    is_default: boolean;
    created_at: string;
}

const defaultSectionsConfig = {
    header: { show: true, label: "CERTIFICADO DE CREMACIÓN" },
    subtitle: { show: true, label: "HOMENAJE A UNA VIDA DE COMPAÑÍA" },
    meta: { show: true, label: "REGISTRO" },
    pet_info: { show: true },
    memorial_title: { show: true, label: "En Memoria a:" },
    family_info: { show: true, label: "Familia:" },
    owner_email: { show: true },
    owner_phone: { show: true },
    pet_type: { show: true },
    pet_breed: { show: true },
    declaration: { show: true },
    farewell: { show: true },
    service_info: { show: true, label: "INFORMACIÓN DEL SERVICIO" },
    memorial_message: { show: true },
    signature: { show: true, label: "Firma Autorizada" }
};

function CertificateEditorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showToast } = useToast();
    const templateId = searchParams.get('id');

    const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
    const [loading, setLoading] = useState(!!templateId);
    const [isSaving, setIsSaving] = useState(false);

    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropAspect, setCropAspect] = useState(1);
    const [cropTarget, setCropTarget] = useState<'header' | 'background' | null>(null);
    const [pendingHeaderLogo, setPendingHeaderLogo] = useState<Blob | null>(null);
    const [pendingBackgroundLogo, setPendingBackgroundLogo] = useState<Blob | null>(null);

    // Accordion state
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        basics: true,
        logos: false,
        texts: false,
        sections: false
    });

    const [showLivePreview, setShowLivePreview] = useState(true);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewZoom, setPreviewZoom] = useState(0.75);
    const [dynamicScale, setDynamicScale] = useState(0.5);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const basicsRef = useRef<HTMLDivElement>(null);
    const logosRef = useRef<HTMLDivElement>(null);
    const sectionsRef = useRef<HTMLDivElement>(null);
    const textsRef = useRef<HTMLDivElement>(null);

    const sectionRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
        basics: basicsRef,
        logos: logosRef,
        sections: sectionsRef,
        texts: textsRef
    };

    const getImageUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http')) return url;
        return `${API_URL}${url}`;
    };

    useEffect(() => {
        const fetchTemplate = async () => {
            if (!templateId) {
                // Initialize default for new template
                setEditingTemplate({
                    name: '',
                    category: 'para mascotas',
                    paper_format: 'Carta',
                    theme: 'Clásico',
                    title: 'Certificado de Cremación',
                    subtitle: 'Homenaje a una Vida de Compañía',
                    memorial_title: 'In Memoria a:',
                    declaration_text: 'Certificamos la autenticidad y el respeto absoluto en el tratamiento de los restos depositados en nuestras instalaciones.',
                    signature_text: 'Administración del Crematorio',
                    header_logo_x: 'center',
                    header_logo_y: '0',
                    background_logo_x: '50%',
                    background_logo_y: '50%',
                    background_logo_opacity: 0.05,
                    background_logo_rotation: -15,
                    header_logo_shape: 'square',
                    background_logo_shape: 'square',
                    farewell_text: '',
                    sections_config: defaultSectionsConfig,
                    sections_order: Object.keys(defaultSectionsConfig),
                    is_default: false
                });
                return;
            }

            try {
                const template: Template = await apiRequest(`/api/internal/ops-records/templates/${templateId}`);

                // Merge with default config for compatibility
                const mergedConfig = { ...defaultSectionsConfig } as any;
                if (template.sections_config) {
                    Object.keys(template.sections_config).forEach(key => {
                        // Solo aceptamos secciones válidas para certificados
                        if (key in defaultSectionsConfig) {
                            mergedConfig[key] = {
                                ...mergedConfig[key],
                                ...template.sections_config[key]
                            };
                        }
                    });
                }

                if (!mergedConfig.farewell) mergedConfig.farewell = { show: true };

                const finalOrder = template.sections_order ? [...template.sections_order] : Object.keys(mergedConfig);
                Object.keys(mergedConfig).forEach(key => {
                    if (!finalOrder.includes(key)) finalOrder.push(key);
                });

                setEditingTemplate({
                    ...template,
                    sections_config: mergedConfig,
                    sections_order: finalOrder,
                    header_logo_shape: template.header_logo_shape || 'square',
                    background_logo_shape: template.background_logo_shape || 'square',
                    background_logo_rotation: template.background_logo_rotation ?? -15,
                    farewell_text: template.farewell_text || ''
                });
            } catch (err: any) {
                showToast('Error al cargar la plantilla: ' + err.message, 'error');
                router.push('/dashboard/documentos/certificados');
            } finally {
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [templateId]);

    // Dynamic scale calculation based on container size
    useEffect(() => {
        const calculateScale = () => {
            if (!previewContainerRef.current || !showLivePreview) return;
            
            const container = previewContainerRef.current;
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            
            // Paper dimensions (pixels at 96 DPI)
            const paperWidth = editingTemplate?.paper_format === 'Oficio' ? 816 : 816;
            const paperHeight = editingTemplate?.paper_format === 'Oficio' ? 1344 : 1056;
            
            // Calculate available space (subtract padding)
            const availableWidth = containerWidth - 32; // p-4 = 16px each side
            const availableHeight = containerHeight - 32;
            
            // Calculate scales for width and height
            const scaleX = availableWidth / paperWidth;
            const scaleY = availableHeight / paperHeight;
            
            // Use the smaller scale to fit within container
            const newScale = Math.min(scaleX, scaleY);
            setDynamicScale(Math.max(newScale, 0.25));
        };

        calculateScale();

        const resizeObserver = new ResizeObserver(() => {
            calculateScale();
        });

        if (previewContainerRef.current) {
            resizeObserver.observe(previewContainerRef.current);
        }

        window.addEventListener('resize', calculateScale);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', calculateScale);
        };
    }, [showLivePreview, editingTemplate?.paper_format]);

    // Live Preview Logic with Debounce
    useEffect(() => {
        if (!showLivePreview || !editingTemplate) return;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            setIsPreviewLoading(true);
            try {
                const response = await apiRequest('/api/internal/ops-records/templates/preview-test', {
                    method: 'POST',
                    body: JSON.stringify(editingTemplate)
                });
                if (response && response.html_content) {
                    setPreviewHtml(response.html_content);
                }
            } catch (err) {
                console.error("Error fetching live preview:", err);
            } finally {
                setIsPreviewLoading(false);
            }
        }, 800); // 800ms debounce

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [editingTemplate, showLivePreview]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let finalTemplate = { ...editingTemplate };

            if (pendingHeaderLogo) {
                const url = await uploadImage(pendingHeaderLogo);
                finalTemplate.header_logo_url = url;
            }
            if (pendingBackgroundLogo) {
                const url = await uploadImage(pendingBackgroundLogo);
                finalTemplate.background_logo_url = url;
            }

            const method = finalTemplate.id ? 'PUT' : 'POST';
            const endpoint = finalTemplate.id
                ? `/api/internal/ops-records/templates/${finalTemplate.id}`
                : '/api/internal/ops-records/templates';

            await apiRequest(endpoint, {
                method,
                body: JSON.stringify(finalTemplate)
            });

            showToast('Plantilla guardada exitosamente', 'success');
            router.push('/dashboard/documentos/certificados');
        } catch (err: any) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const uploadImage = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'cropped.png');
        const response = await apiRequest('/api/internal/ops-records/upload-template-asset', {
            method: 'POST',
            body: formData
        });
        return response.url;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'header' | 'background') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropImage(reader.result as string);
                const shape = target === 'header' ? editingTemplate?.header_logo_shape : editingTemplate?.background_logo_shape;
                if (shape === 'circle' || shape === 'square') {
                    setCropAspect(1);
                } else if (shape === 'rectangle') {
                    setCropAspect(0 as any);
                } else {
                    setCropAspect(target === 'header' ? 16 / 9 : 1);
                }
                setCropTarget(target);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (blob: Blob) => {
        const localUrl = URL.createObjectURL(blob);
        if (cropTarget === 'header') {
            setPendingHeaderLogo(blob);
            setEditingTemplate(prev => ({ ...prev, header_logo_url: localUrl }));
        } else if (cropTarget === 'background') {
            setPendingBackgroundLogo(blob);
            setEditingTemplate(prev => ({ ...prev, background_logo_url: localUrl }));
        }
        setCropImage(null);
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => {
            const isOpening = !prev[section];
            if (isOpening) {
                return {
                    basics: false,
                    logos: false,
                    texts: false,
                    sections: false,
                    [section]: true
                };
            }
            return { ...prev, [section]: false };
        });
    };

    useEffect(() => {
        const activeSection = Object.entries(openSections).find(([_, isOpen]) => isOpen)?.[0];
        if (activeSection && sectionRefs[activeSection]?.current) {
            setTimeout(() => {
                sectionRefs[activeSection].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [openSections]);

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-primary mb-4" size={48} />
                <p className="text-muted-foreground animate-pulse">Cargando editor de plantillas...</p>
            </div>
        );
    }

    return (
        <div className={`pb-20 transition-all duration-500 h-full overflow-hidden w-full ${showLivePreview ? 'px-2 md:px-4' : 'max-w-5xl mx-auto px-4'}`}>
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/documentos/certificados')}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {editingTemplate?.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Personaliza el diseño y estructura del documento oficial.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowLivePreview(!showLivePreview)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all border ${showLivePreview
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-white/5 border-white/5 text-slate-400'
                            }`}
                    >
                        {showLivePreview ? <Eye size={18} /> : <EyeOff size={18} />}
                        {showLivePreview ? 'Vista en Vivo: ON' : 'Vista en Vivo: OFF'}
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/documentos/certificados')}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-foreground font-bold rounded-2xl transition-all text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                        {editingTemplate?.id ? 'Guardar Cambios' : 'Crear Plantilla'}
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${showLivePreview ? '2xl:grid-cols-[60%_40%] xl:grid-cols-[60%_40%] lg:grid-cols-[60%_40%]' : ''} gap-4 lg:gap-6 h-full items-start transition-all duration-500`}>
                <div className="space-y-4 lg:space-y-6 max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-hidden pr-2 lg:pr-4 scrollbar-thin scrollbar-thumb-white/10">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* 1. Información Básica */}
                        <div ref={basicsRef} className={`bg-white/2 rounded-3xl border border-white/5 transition-all duration-300 relative ${openSections.basics ? 'z-50 shadow-2xl' : 'z-10'}`}>
                            <button type="button" onClick={() => toggleSection('basics')} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Type className="text-primary" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Información Básica</h3>
                                </div>
                                <ChevronDown className={`text-primary transition-transform ${openSections.basics ? 'rotate-180' : ''}`} size={20} />
                            </button>

                            {openSections.basics && (
                                <div className="px-6 pb-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Nombre de Plantilla</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingTemplate?.name || ''}
                                                onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                                placeholder="Ej: Certificado Oro"
                                                className="w-full bg-black/20 border border-white/5 rounded-2xl py-3 px-4 text-sm outline-none focus:border-primary/50 transition-all font-medium"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Categoría</label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'para mascotas', label: 'Para Mascotas' },
                                                    { value: 'para clientes', label: 'Para Clientes' },
                                                    { value: 'para empresa', label: 'Para Empresa' }
                                                ]}
                                                value={editingTemplate?.category || 'para mascotas'}
                                                onChange={val => setEditingTemplate({ ...editingTemplate, category: String(val) })}
                                                placeholder="Tipo..."
                                                icon={<FileText size={16} />}
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Formato</label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'Carta', label: 'Carta (Letter)' },
                                                    { value: 'Oficio', label: 'Oficio (Legal)' }
                                                ]}
                                                value={editingTemplate?.paper_format || 'Carta'}
                                                onChange={val => setEditingTemplate({ ...editingTemplate, paper_format: String(val) })}
                                                placeholder="Formato..."
                                                icon={<Layout size={16} />}
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tema Visual</label>
                                            <SearchableSelect
                                                options={[
                                                    { value: 'Clásico', label: 'Clásico / Dorado' },
                                                    { value: 'Moderno', label: 'Moderno / Azul' },
                                                    { value: 'Ecológico', label: 'Ecológico / Verde' },
                                                    { value: 'Premium', label: 'Premium / Elegante' }
                                                ]}
                                                value={editingTemplate?.theme || 'Clásico'}
                                                onChange={val => setEditingTemplate({ ...editingTemplate, theme: String(val) })}
                                                placeholder="Tema..."
                                                icon={<Settings2 size={16} />}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Logos y Marca de Agua */}
                        <div ref={logosRef} className={`bg-white/2 rounded-3xl border border-white/5 transition-all duration-300 relative ${openSections.logos ? 'z-50 shadow-2xl' : 'z-10'}`}>
                            <button type="button" onClick={() => toggleSection('logos')} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <ImageIcon className="text-primary" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Logos y Marca de Agua</h3>
                                </div>
                                <ChevronDown className={`text-primary transition-transform ${openSections.logos ? 'rotate-180' : ''}`} size={20} />
                            </button>

                            {openSections.logos && (
                                <div className="px-6 pb-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4 p-6 bg-black/10 rounded-2xl border border-white/5">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-primary mb-4 italic">Logo Secundario (Cabecera)</label>
                                            <div className="flex items-center gap-6">
                                                <div className="relative group w-32 h-24 bg-black/40 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
                                                    {editingTemplate?.header_logo_url ? (
                                                        <img src={getImageUrl(editingTemplate.header_logo_url) || ''} className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <ImageIcon size={32} className="text-white/5" />
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="cursor-pointer bg-primary text-primary-foreground text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 hover:opacity-90">
                                                        <Upload size={14} /> Subir Imagen
                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileSelect(e, 'header')} />
                                                    </label>
                                                    <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, header_logo_url: null })} className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all border border-red-500/20">
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 pt-4">
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Ajuste</label>
                                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, header_logo_shape: 'square' })} className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition-all ${editingTemplate?.header_logo_shape === 'square' ? 'bg-primary text-white' : 'text-slate-500'}`}>CUA</button>
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, header_logo_shape: 'circle' })} className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition-all ${editingTemplate?.header_logo_shape === 'circle' ? 'bg-primary text-white' : 'text-slate-500'}`}>CIR</button>
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, header_logo_shape: 'rectangle' })} className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition-all ${editingTemplate?.header_logo_shape === 'rectangle' ? 'bg-primary text-white' : 'text-slate-500'}`}>REC</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Pos X</label>
                                                    <input type="text" value={editingTemplate?.header_logo_x || ''} onChange={e => setEditingTemplate({ ...editingTemplate, header_logo_x: e.target.value })} placeholder="center" className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary/50 transition-all font-bold" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Pos Y</label>
                                                    <input type="text" value={editingTemplate?.header_logo_y || ''} onChange={e => setEditingTemplate({ ...editingTemplate, header_logo_y: e.target.value })} placeholder="0" className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary/50 transition-all font-bold" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-6 bg-black/10 rounded-2xl border border-white/5">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-primary mb-4 italic">Marca de Agua (Fondo)</label>
                                            <div className="flex items-center gap-6">
                                                <div className="relative group w-24 h-24 bg-black/40 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
                                                    {editingTemplate?.background_logo_url ? (
                                                        <img src={getImageUrl(editingTemplate.background_logo_url) || ''} className="w-full h-full object-contain p-2 opacity-50" />
                                                    ) : (
                                                        <Layout size={32} className="text-white/5" />
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="cursor-pointer bg-primary text-primary-foreground text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 hover:opacity-90">
                                                        <Upload size={14} /> Subir Imagen
                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileSelect(e, 'background')} />
                                                    </label>
                                                    <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, background_logo_url: null })} className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all border border-red-500/20">
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 pt-4">
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5 text-center">Forma</label>
                                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, background_logo_shape: 'square' })} className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition-all ${(!editingTemplate?.background_logo_shape || editingTemplate?.background_logo_shape === 'square') ? 'bg-primary text-white' : 'text-slate-500'}`}>CUA</button>
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, background_logo_shape: 'circle' })} className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition-all ${editingTemplate?.background_logo_shape === 'circle' ? 'bg-primary text-white' : 'text-slate-500'}`}>CIR</button>
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, background_logo_shape: 'rectangle' })} className={`flex-1 py-1 text-[9px] font-bold rounded-lg transition-all ${editingTemplate?.background_logo_shape === 'rectangle' ? 'bg-primary text-white' : 'text-slate-500'}`}>REC</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5 text-center">Opacidad</label>
                                                    <input type="range" min="0" max="1" step="0.01" value={editingTemplate?.background_logo_opacity || 0.05} onChange={e => setEditingTemplate({ ...editingTemplate, background_logo_opacity: parseFloat(e.target.value) })} className="w-full accent-primary mt-2" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5 text-center">Rotación ({editingTemplate?.background_logo_rotation}°)</label>
                                                    <input type="range" min="-180" max="180" step="1" value={editingTemplate?.background_logo_rotation || -15} onChange={e => setEditingTemplate({ ...editingTemplate, background_logo_rotation: parseFloat(e.target.value) })} className="w-full accent-primary" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Visibilidad y Orden de Secciones */}
                        <div ref={sectionsRef} className={`bg-white/2 rounded-3xl border border-white/5 transition-all duration-300 relative ${openSections.sections ? 'z-50 shadow-2xl' : 'z-10'}`}>
                            <button type="button" onClick={() => toggleSection('sections')} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <FileText className="text-primary" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Estructura y Etiquetas</h3>
                                </div>
                                <ChevronDown className={`text-primary transition-transform ${openSections.sections ? 'rotate-180' : ''}`} size={20} />
                            </button>

                            {openSections.sections && (
                                <div className="px-6 pb-6">
                                    <div className="mt-2">
                                        {(() => {
                                            const labelMap: Record<string, { label: string, category: string, color: string }> = {
                                                header: { label: "Título Principal", category: "CABECERA", color: "bg-emerald-500/20 text-emerald-400" },
                                                subtitle: { label: "Subtítulo / Lema", category: "CABECERA", color: "bg-emerald-500/20 text-emerald-400" },
                                                meta: { label: "Folio y Fecha", category: "CABECERA", color: "bg-emerald-500/20 text-emerald-400" },
                                                pet_info: { label: "Nombre Mascota", category: "IDENTIDAD", color: "bg-blue-500/20 text-blue-400" },
                                                pet_type: { label: "Especie", category: "IDENTIDAD", color: "bg-blue-500/20 text-blue-400" },
                                                pet_breed: { label: "Raza", category: "IDENTIDAD", color: "bg-blue-500/20 text-blue-400" },
                                                memorial_title: { label: "Prefijo (En memoria a:)", category: "IDENTIDAD", color: "bg-blue-500/20 text-blue-400" },
                                                family_info: { label: "Nombre Cliente", category: "IDENTIDAD", color: "bg-blue-500/20 text-blue-400" },
                                                farewell: { label: "Tributo Central", category: "CUERPO", color: "bg-purple-500/20 text-purple-400" },
                                                declaration: { label: "Certificación", category: "CUERPO", color: "bg-purple-500/20 text-purple-400" },
                                                memorial_message: { label: "Mensaje Final", category: "CUERPO", color: "bg-purple-500/20 text-purple-400" },
                                                owner_email: { label: "Email Contacto", category: "EXTRAS", color: "bg-slate-500/20 text-slate-400" },
                                                owner_phone: { label: "Teléfono Contacto", category: "EXTRAS", color: "bg-slate-500/20 text-slate-400" },
                                                service_info: { label: "Info Servicio", category: "EXTRAS", color: "bg-slate-500/20 text-slate-400" }
                                            };

                                            const order = editingTemplate?.sections_order || Object.keys(editingTemplate?.sections_config || {});
                                            
                                            return (
                                                <Reorder.Group 
                                                    axis="y" 
                                                    values={order} 
                                                    onReorder={(newOrder) => setEditingTemplate({ ...editingTemplate, sections_order: newOrder })}
                                                    className="space-y-2"
                                                >
                                                    {order.map((key) => {
                                                        const section = editingTemplate?.sections_config?.[key];
                                                        if (!section) return null;
                                                        const info = labelMap[key] || { label: key, category: "OTRO", color: "bg-white/10 text-white/40" };

                                                        return (
                                                            <Reorder.Item 
                                                                key={key} 
                                                                value={key}
                                                                className={`p-3 bg-white/2 hover:bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 transition-all group cursor-grab active:cursor-grabbing ${!section.show ? 'opacity-50 grayscale' : ''}`}
                                                                whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.4)", zIndex: 100 }}
                                                            >
                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <GripVertical className="text-white/20 group-hover:text-primary transition-colors" size={18} />
                                                                    <div className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter w-14 text-center ${info.color}`}>
                                                                        {info.category}
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1 flex flex-col gap-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[11px] font-bold text-white/80">{info.label}</span>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={section.show || false} 
                                                                            onChange={e => {
                                                                                const newConfig = { ...editingTemplate?.sections_config };
                                                                                newConfig[key] = { ...newConfig[key], show: e.target.checked };
                                                                                setEditingTemplate({ ...editingTemplate, sections_config: newConfig });
                                                                            }} 
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-4 h-4 accent-primary cursor-pointer" 
                                                                        />
                                                                    </div>
                                                                    {section.label !== undefined && section.show && (
                                                                        <input
                                                                            type="text"
                                                                            value={section.label}
                                                                            onChange={e => {
                                                                                const newConfig = { ...editingTemplate?.sections_config };
                                                                                newConfig[key] = { ...newConfig[key], label: e.target.value };
                                                                                setEditingTemplate({ ...editingTemplate, sections_config: newConfig });
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-full bg-black/40 border border-white/5 rounded-lg py-1 px-2 text-[10px] font-medium outline-none focus:border-primary/50 text-white/60"
                                                                            placeholder="Etiqueta personalizada..."
                                                                        />
                                                                    )}
                                                                </div>
                                                            </Reorder.Item>
                                                        );
                                                    })}
                                                </Reorder.Group>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Textos Largos */}
                        <div ref={textsRef} className={`bg-white/2 rounded-3xl border border-white/5 transition-all duration-300 relative ${openSections.texts ? 'z-50 shadow-2xl' : 'z-10'}`}>
                            <button type="button" onClick={() => toggleSection('texts')} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <AlignLeft className="text-primary" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Textos de Certificación</h3>
                                </div>
                                <ChevronDown className={`text-primary transition-transform ${openSections.texts ? 'rotate-180' : ''}`} size={20} />
                            </button>

                            {openSections.texts && (
                                <div className="px-6 pb-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Declaración Oficial</label>
                                                <span className="text-[9px] font-bold text-primary">{editingTemplate?.declaration_text?.length || 0}/121</span>
                                            </div>
                                            <textarea maxLength={121} rows={4} value={editingTemplate?.declaration_text || ''} onChange={e => setEditingTemplate({ ...editingTemplate, declaration_text: e.target.value })} className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary/50 resize-none shadow-inner" placeholder="Escribe el texto de certificación..." />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Palabras Finales (Opcional)</label>
                                                <span className="text-[9px] font-bold text-primary">{editingTemplate?.farewell_text?.length || 0}/438</span>
                                            </div>
                                            <textarea maxLength={438} rows={4} value={editingTemplate?.farewell_text || ''} onChange={e => setEditingTemplate({ ...editingTemplate, farewell_text: e.target.value })} className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary/50 resize-none shadow-inner" placeholder="Escribe palabras de despedida adicional..." />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-2">Firmado por</label>
                                            <input type="text" value={editingTemplate?.signature_text || ''} onChange={e => setEditingTemplate({ ...editingTemplate, signature_text: e.target.value })} className="w-full bg-black/20 border border-white/5 rounded-2xl py-3 px-4 text-sm font-bold shadow-inner" placeholder="Ej: Dirección General" />
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 cursor-pointer select-none" onClick={() => setEditingTemplate(prev => ({ ...prev, is_default: !prev?.is_default }))}>
                                            <div className={`w-10 h-5 rounded-full transition-all relative ${editingTemplate?.is_default ? 'bg-primary' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${editingTemplate?.is_default ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-wider">Marcar como predeterminada</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground font-bold py-4 px-12 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 hover:opacity-90 active:scale-95 transition-all text-base disabled:opacity-50 w-full md:w-auto"
                        >
                            {isSaving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                            {editingTemplate?.id ? 'Guardar Cambios' : 'Crear Plantilla'}
                        </button>
                    </div>
                </div>

                {/* Panel de Previsualización en Vivo - Premium Redesign */}
                {showLivePreview && (
                    <div className="hidden lg:block lg:top-24 sticky top-20 h-[calc(100vh-160px)] min-h-[550px]">
                        <div className="bg-slate-950/80 backdrop-blur-xl rounded-3xl border border-white/10 h-full overflow-hidden flex flex-col shadow-2xl relative group">
                            {/* Header con Controles */}
                            <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-start shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Vista Previa</span>
                            </div>

                            {/* Area de Trabajo (Canvas) */}
                            <div ref={previewContainerRef} className="flex-1 bg-slate-900/80 overflow-auto p-4">
                                {previewHtml ? (
                                    <div className="flex justify-center items-start w-full">
                                        <div
                                            className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                                            style={{
                                                width: editingTemplate?.paper_format === 'Oficio' ? '816px' : '816px',
                                                height: editingTemplate?.paper_format === 'Oficio' ? '1344px' : '1056px',
                                                transform: `scale(${dynamicScale})`,
                                                transformOrigin: 'top center',
                                                flexShrink: 0
                                            }}
                                        >
                                            <iframe
                                                srcDoc={previewHtml}
                                                className="w-full border-none"
                                                style={{ 
                                                    pointerEvents: 'none',
                                                    height: editingTemplate?.paper_format === 'Oficio' ? '1344px' : '1056px'
                                                }}
                                                title="Live Preview"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center animate-pulse border border-white/10">
                                            <Eye className="text-white/20" size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Generando Documento...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-2 bg-black/40 border-t border-white/10 flex items-center justify-between shrink-0 px-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-[8px] text-slate-500 uppercase font-black tracking-[0.2em]">
                                        {editingTemplate?.paper_format || 'CARTA'} • {editingTemplate?.theme || 'CLÁSICO'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {cropImage && (
                    <ImageCropper
                        image={cropImage}
                        aspect={cropAspect}
                        cropShape={(cropTarget === 'header' ? (editingTemplate?.header_logo_shape || 'square') : (editingTemplate?.background_logo_shape || 'square')) === 'circle' ? 'round' : 'rect'}
                        onCancel={() => setCropImage(null)}
                        onCropComplete={handleCropComplete}
                        title={cropTarget === 'header' ? 'Ajustar Logo de Cabecera' : 'Ajustar Marca de Agua'}
                    />
                )}
            </div>
        </div>
    );
}

export default function CertificateEditorPage() {
    return (
        <Suspense fallback={
            <div className="h-96 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-primary mb-4" size={48} />
                <p className="text-muted-foreground animate-pulse">Cargando...</p>
            </div>
        }>
            <CertificateEditorContent />
        </Suspense>
    );
}
