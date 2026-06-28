"use client";

import React, { useEffect, useState, Suspense, useRef } from 'react';
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
    ChevronDown,
    Upload,
    Image as ImageIcon,
    AlignLeft,
    ArrowLeft,
    X,
    CheckCircle,
    Palette,
    Eye,
    PlusCircle
} from 'lucide-react';
import { API_URL, apiRequest } from '@/lib/admin/api';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import ImageCropper from '@/components/tenant/ImageCropper';
import { motion, AnimatePresence } from 'framer-motion';
import ReceiptTemplate from '@/components/admin/receipts/ReceiptTemplate';

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
    sections_config: Record<string, { show: boolean, label?: string, type?: string }>;
    sections_order: string[] | null;
    is_default: boolean;
    created_at: string;
    advantages_list?: string[];
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
    memorial_message: { show: true }
};

const receiptSectionsConfig = {
    header: { show: true, label: "SAASCREMATORIO" },
    subtitle: { show: true, label: "Software Líder en Gestión Funeraria y Crematorios" },
    issuer_details: { show: true, label: "RUT: 77.777.777-7\nAv. Providencia 1234, Santiago\ncontacto@saascrematorio.com", type: "textarea" },
    meta: { show: true, label: "RECIBO" },
    tenant_info: { show: true, label: "Datos del Cliente" },
    plan_info: { show: true, label: "Resumen de Suscripción" },
    amount_info: { show: true, label: "Total Pagado" },
    date_info: { show: true, label: "Desde" },
    period_info: { show: true, label: "Hasta" },
    farewell: { show: true, label: "Ventajas de tu Plan" },
    service_info: { show: true, label: "Descripción del Servicio" },
    declaration: { show: true, label: "Acceso completo a la plataforma durante el periodo comprendido. Incluye actualizaciones automáticas y soporte técnico especializado.", type: "textarea" },
    memorial_title: { show: true, label: "Nuestro Compromiso" },
    memorial_message: { show: true, label: "Excelencia y dignidad en cada detalle de tu servicio" },
    signature: { show: true, label: "Generado por", sublabel: "SaaS Crematorio v1.0" }
};

function AdminDocumentEditorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const templateId = searchParams.get('id');

    const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
    const [loading, setLoading] = useState(!!templateId);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropAspect, setCropAspect] = useState(1);
    const [cropTarget, setCropTarget] = useState<'header' | 'background' | null>(null);
    const [pendingHeaderLogo, setPendingHeaderLogo] = useState<Blob | null>(null);
    const [pendingBackgroundLogo, setPendingBackgroundLogo] = useState<Blob | null>(null);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        basics: true,
        logos: false,
        texts: false,
        sections: false,
        advantages: false
    });

    // Preview Resizing Logic
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [dynamicScale, setDynamicScale] = useState(0.5);
    const [isZoom100, setIsZoom100] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Dynamic scale calculation based on container size
    useEffect(() => {
        const calculateScale = () => {
            if (!previewContainerRef.current) return;
            
            const container = previewContainerRef.current;
            const containerWidth = container.offsetWidth;
            
            // Paper dimensions (pixels at 96 DPI)
            const paperWidth = 816;
            
            // Calculate available space (subtract padding)
            const availableWidth = containerWidth - 32; // p-4 = 16px each side
            
            // Calculate scale
            const newScale = availableWidth / paperWidth;
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
    }, [editingTemplate?.paper_format]);

    // Live Preview Logic with Debounce
    useEffect(() => {
        if (!editingTemplate) return;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            setIsPreviewLoading(true);
            try {
                const response = await apiRequest('/api/internal/creator/document-templates/templates/preview-test', {
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
    }, [editingTemplate]);

    const paperHeight = editingTemplate?.paper_format === 'Oficio' ? 1344 : 1056;
    const containerHeight = Math.max(600, (paperHeight * dynamicScale) + 120);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const getImageUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http')) return url;
        return `${API_URL}${url}`;
    };

    useEffect(() => {
        const fetchTemplate = async () => {
            if (!templateId) {
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
                    is_default: false,
                    advantages_list: [
                        "Acceso ilimitado a todas las funciones del plan",
                        "Soporte técnico prioritario 24/7",
                        "Copias de seguridad automáticas diarias",
                        "Panel de administración avanzado",
                        "Métricas y reportes en tiempo real"
                    ]
                });
                return;
            }

            try {
                const template: Template = await apiRequest(`/api/internal/creator/document-templates/templates/${templateId}`);

                const baseConfig = template.category === 'recibo_suscripcion' ? receiptSectionsConfig : defaultSectionsConfig;
                const mergedConfig = { ...baseConfig } as any;
                if (template.sections_config) {
                    Object.keys(template.sections_config).forEach(key => {
                        mergedConfig[key] = {
                            ...mergedConfig[key],
                            ...template.sections_config[key]
                        };
                    });
                }

                const finalOrder = template.sections_order ? [...template.sections_order] : Object.keys(mergedConfig);
                Object.keys(mergedConfig).forEach(key => {
                    if (!finalOrder.includes(key)) finalOrder.push(key);
                });

                setEditingTemplate({
                    ...template,
                    sections_config: mergedConfig,
                    sections_order: finalOrder,
                    advantages_list: template.advantages_list || [
                        "Acceso ilimitado a todas las funciones del plan",
                        "Soporte técnico prioritario 24/7",
                        "Copias de seguridad automáticas diarias",
                        "Panel de administración avanzado",
                        "Métricas y reportes en tiempo real"
                    ]
                });
            } catch (err: any) {
                showToast('Error al cargar la plantilla: ' + err.message, 'error');
                router.push('/dashboard/disenos');
            } finally {
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [templateId]);

    const handleSave = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
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
                ? `/api/internal/creator/document-templates/templates/${finalTemplate.id}`
                : '/api/internal/creator/document-templates/templates';

            console.log('[TEMPLATE SAVE] Sending payload:', JSON.stringify(finalTemplate, null, 2));

            const response = await apiRequest(endpoint, {
                method,
                body: JSON.stringify(finalTemplate)
            });

            console.log('[TEMPLATE SAVE] Response:', response);

            showToast('Plantilla guardada exitosamente', 'success');
            setTimeout(() => {
                router.push('/dashboard/disenos');
            }, 1000);
        } catch (err: any) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const uploadImage = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'cropped.webp');
        const response = await apiRequest('/api/internal/creator/document-templates/upload-template-asset', {
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
                setCropAspect(shape === 'circle' ? 1 : (target === 'header' ? 16 / 9 : 1));
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
            const newState: Record<string, boolean> = {};
            Object.keys(prev).forEach(key => {
                newState[key] = key === section ? !prev[key] : false;
            });
            return newState;
        });
    };

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-white/20">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="font-black uppercase tracking-widest text-xs">Cargando Editor...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 pb-32">
            {/* Toast Notification */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-8 right-8 z-200 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${message.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            } backdrop-blur-md`}
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
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/dashboard/disenos')}
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] transition-all text-white/40 hover:text-white border border-white/5"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            {editingTemplate?.id ? 'Editar Diseño' : 'Nuevo Diseño Global'}
                        </h1>
                        <p className="text-white/40 text-sm font-medium mt-1">
                            Define la estética y estructura de los documentos del sistema.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handleSave(null as any)}
                        disabled={isSaving}
                        className="bg-primary text-white font-black py-4 px-10 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                        Guardar Diseño
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Form Column */}
                <form className="flex-1 space-y-8 min-w-0">
                    {/* 1. Información Básica */}
                    <div className={`bg-white/[0.02] rounded-[2.5rem] border border-white/5 transition-all ${openSections.basics ? 'ring-1 ring-primary/20 shadow-2xl' : ''}`}>
                        <button type="button" onClick={() => toggleSection('basics')} className="w-full p-8 flex items-center justify-between hover:bg-white/5 transition-colors rounded-[2.5rem]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Type size={24} /></div>
                                <div className="text-left">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">01. Configuración Base</h3>
                                    <p className="text-[10px] text-white/20 font-bold uppercase mt-0.5">Nombre, Categoría y Formato de Papel</p>
                                </div>
                            </div>
                            <ChevronDown className={`text-primary transition-transform duration-500 ${openSections.basics ? 'rotate-180' : ''}`} size={24} />
                        </button>

                        {openSections.basics && (
                            <div className="px-8 pb-10 space-y-8 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Nombre Descriptivo</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingTemplate?.name || ''}
                                            onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-sm outline-none focus:border-primary/50 transition-all font-bold text-white shadow-inner"
                                            placeholder="Ej: Plantilla Corporativa"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Categoría Documento</label>
                                        <SearchableSelect
                                            options={[
                                                { value: 'para mascotas', label: 'CERTIFICADO MASCOTA' },
                                                { value: 'recibo_suscripcion', label: 'RECIBO SUSCRIPCIÓN SAAS' }
                                            ]}
                                            value={editingTemplate?.category || 'para mascotas'}
                                            onChange={val => {
                                                const newCategory = String(val);
                                                const newConfig = newCategory === 'recibo_suscripcion' ? receiptSectionsConfig : defaultSectionsConfig;
                                                setEditingTemplate({
                                                    ...editingTemplate,
                                                    category: newCategory,
                                                    sections_config: newConfig,
                                                    sections_order: Object.keys(newConfig)
                                                });
                                            }}
                                            icon={<FileText size={16} />}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Formato de Impresión</label>
                                        <SearchableSelect
                                            options={[
                                                { value: 'Carta', label: 'CARTA (8.5" X 11")' },
                                                { value: 'Oficio', label: 'OFICIO (8.5" X 13")' }
                                            ]}
                                            value={editingTemplate?.paper_format || 'Carta'}
                                            onChange={val => setEditingTemplate({ ...editingTemplate, paper_format: String(val) })}
                                            icon={<Layout size={16} />}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 ml-1">Estilo Visual</label>
                                        <SearchableSelect
                                            options={[
                                                { value: 'Clásico', label: 'CLÁSICO DORADO' },
                                                { value: 'Moderno', label: 'MODERNO AZUL' },
                                                { value: 'Premium', label: 'PREMIUM ELEGANTE' }
                                            ]}
                                            value={editingTemplate?.theme || 'Clásico'}
                                            onChange={val => setEditingTemplate({ ...editingTemplate, theme: String(val) })}
                                            icon={<Palette size={16} />}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Logos */}
                    <div className={`bg-white/[0.02] rounded-[2.5rem] border border-white/5 transition-all ${openSections.logos ? 'ring-1 ring-primary/20 shadow-2xl' : ''}`}>
                        <button type="button" onClick={() => toggleSection('logos')} className="w-full p-8 flex items-center justify-between hover:bg-white/5 transition-colors rounded-[2.5rem]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><ImageIcon size={24} /></div>
                                <div className="text-left">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">02. Identidad Visual</h3>
                                    <p className="text-[10px] text-white/20 font-bold uppercase mt-0.5">Logo Superior y Marca de Agua</p>
                                </div>
                            </div>
                            <ChevronDown className={`text-primary transition-transform duration-500 ${openSections.logos ? 'rotate-180' : ''}`} size={24} />
                        </button>

                        {openSections.logos && (
                            <div className="px-8 pb-10 space-y-10 animate-fade-in">
                                <div className="grid grid-cols-1 gap-12">
                                    {/* Logo de Cabecera */}
                                    <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Layout size={14} /> Logo de Cabecera
                                            </h4>
                                            <div className="flex gap-2">
                                                <label className="cursor-pointer bg-primary hover:bg-primary/90 text-white text-[10px] font-black uppercase py-2 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                                                    <Upload size={14} />
                                                    <span>Subir</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileSelect(e, 'header')} />
                                                </label>
                                                <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, header_logo_url: null })} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                            <div className="relative group w-40 h-40 bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                                                {editingTemplate?.header_logo_url ? (
                                                    <img src={getImageUrl(editingTemplate.header_logo_url) || ''} className="w-full h-full object-contain p-4 bg-[url('/transparent-bg.png')]" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-white/10">
                                                        <ImageIcon size={32} />
                                                        <span className="text-[9px] font-bold uppercase">Sin Logo</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 w-full">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-white/30 block ml-1">Forma</label>
                                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, header_logo_shape: 'square' })} className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${editingTemplate?.header_logo_shape === 'square' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/60'}`}>RECT</button>
                                                        <button type="button" onClick={() => setEditingTemplate({ ...editingTemplate, header_logo_shape: 'circle' })} className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${editingTemplate?.header_logo_shape === 'circle' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/60'}`}>CIRC</button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-white/30 block ml-1">Posición X</label>
                                                    <div className="relative">
                                                        <AlignLeft size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                                        <select
                                                            value={editingTemplate?.header_logo_x || 'center'}
                                                            onChange={e => setEditingTemplate({ ...editingTemplate, header_logo_x: e.target.value })}
                                                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-8 pr-3 text-[10px] font-black text-white outline-none appearance-none cursor-pointer hover:border-white/10"
                                                        >
                                                            <option value="center">CENTRO</option>
                                                            <option value="left">IZQUIERDA</option>
                                                            <option value="right">DERECHA</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 col-span-2">
                                                    <label className="text-[9px] font-black uppercase text-white/30 block ml-1">Previsualización URL</label>
                                                    <div className="text-[9px] text-white/30 truncate bg-black/20 p-2 rounded-lg border border-white/5 font-mono">
                                                        {editingTemplate?.header_logo_url || 'No seleccionado'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Marca de Agua */}
                                    <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                <ImageIcon size={14} /> Marca de Agua (Fondo)
                                            </h4>
                                            <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase py-2 px-4 rounded-xl transition-all flex items-center gap-2 border border-white/5">
                                                <Upload size={14} />
                                                <span>Subir Imagen</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileSelect(e, 'background')} />
                                            </label>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                            <div className="relative group w-32 h-32 bg-black/40 rounded-full border border-white/5 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                                                {editingTemplate?.background_logo_url ? (
                                                    <img src={getImageUrl(editingTemplate.background_logo_url) || ''} className="w-full h-full object-contain p-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <ImageIcon size={32} className="text-white/5" />
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-6 w-full">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[9px] font-black uppercase text-white/30">Opacidad</span>
                                                        <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{(editingTemplate?.background_logo_opacity || 0.05) * 100}%</span>
                                                    </div>
                                                    <div className="relative w-full h-6 flex items-center">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="0.3"
                                                            step="0.01"
                                                            value={editingTemplate?.background_logo_opacity || 0.05}
                                                            onChange={e => setEditingTemplate({ ...editingTemplate, background_logo_opacity: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer z-10"
                                                        />
                                                        <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent to-primary/20 rounded-lg pointer-events-none" />
                                                    </div>
                                                    <p className="text-[9px] text-white/20 font-medium px-1">
                                                        Ajusta la visibilidad del logo de fondo para no interferir con la lectura.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Estructura */}
                    <div className={`bg-white/[0.02] rounded-[2.5rem] border border-white/5 transition-all ${openSections.sections ? 'ring-1 ring-primary/20 shadow-2xl' : ''}`}>
                        <button type="button" onClick={() => toggleSection('sections')} className="w-full p-8 flex items-center justify-between hover:bg-white/5 transition-colors rounded-[2.5rem]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Layout size={24} /></div>
                                <div className="text-left">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">03. Estructura y Etiquetas</h3>
                                    <p className="text-[10px] text-white/20 font-bold uppercase mt-0.5">Visibilidad de Campos y Nombres Personalizados</p>
                                </div>
                            </div>
                            <ChevronDown className={`text-primary transition-transform duration-500 ${openSections.sections ? 'rotate-180' : ''}`} size={24} />
                        </button>

                        {openSections.sections && (
                            <div className="px-8 pb-10 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(() => {
                                        const labelMap: Record<string, string> = {
                                            header: "TÍTULO PRINCIPAL",
                                            subtitle: "SUBTÍTULO / LEMA",
                                            meta: "DATOS REGISTRO",
                                            pet_info: "NOMBRE MASCOTA",
                                            memorial_title: "TÍTULO MEMORIAL",
                                            family_info: "NOMBRE CLIENTE",
                                            tenant_info: "NOMBRE EMPRESA",
                                            plan_info: "PLAN SUSCRIPCIÓN",
                                            amount_info: "MONTO PAGO",
                                            date_info: "FECHA PAGO",
                                            period_info: "PERÍODO CUBIERTO",
                                            farewell: "TÍTULO VENTAJAS",
                                            declaration: "CERTIFICACIÓN",
                                            signature: "FIRMA / SOPORTE",
                                            issuer_details: "DATOS EMPRESA (EMISOR)"
                                        };

                                        const order = editingTemplate?.sections_order || Object.keys(editingTemplate?.sections_config || {});

                                        return order.map((key) => {
                                            const section = editingTemplate?.sections_config?.[key];
                                            if (!section) return null;

                                            return (
                                                <div key={key} className={`p-6 bg-black/20 rounded-3xl border transition-all ${section.show ? 'border-primary/20 shadow-lg shadow-primary/5' : 'border-white/5 opacity-50'}`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${section.show ? 'text-primary' : 'text-white/20'}`}>{labelMap[key] || key}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newConfig = { ...editingTemplate?.sections_config };
                                                                newConfig[key] = { ...newConfig[key], show: !section.show };
                                                                setEditingTemplate({ ...editingTemplate, sections_config: newConfig });
                                                            }}
                                                            className={`w-10 h-5 rounded-full relative transition-all ${section.show ? 'bg-primary' : 'bg-white/10'}`}
                                                        >
                                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${section.show ? 'translate-x-5' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>
                                                    {section.label !== undefined && (
                                                        section.type === 'textarea' ? (
                                                            <textarea
                                                                value={section.label}
                                                                disabled={!section.show}
                                                                onChange={e => {
                                                                    const newConfig = { ...editingTemplate?.sections_config };
                                                                    newConfig[key] = { ...newConfig[key], label: e.target.value };
                                                                    setEditingTemplate({ ...editingTemplate, sections_config: newConfig });
                                                                }}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-[11px] font-bold outline-none focus:border-primary/50 disabled:opacity-20 text-white resize-none h-24"
                                                                placeholder="Texto del bloque..."
                                                            />
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={section.label}
                                                                disabled={!section.show}
                                                                onChange={e => {
                                                                    const newConfig = { ...editingTemplate?.sections_config };
                                                                    newConfig[key] = { ...newConfig[key], label: e.target.value };
                                                                    setEditingTemplate({ ...editingTemplate, sections_config: newConfig });
                                                                }}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-[11px] font-bold outline-none focus:border-primary/50 disabled:opacity-20 text-white"
                                                                placeholder="Etiqueta..."
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. Ventajas del Plan (Solo Recibos) */}
                    {editingTemplate?.category === 'recibo_suscripcion' && (
                        <div className={`bg-white/[0.02] rounded-[2.5rem] border border-white/5 transition-all ${openSections.advantages ? 'ring-1 ring-primary/20 shadow-2xl' : ''}`}>
                            <button type="button" onClick={() => toggleSection('advantages')} className="w-full p-8 flex items-center justify-between hover:bg-white/5 transition-colors rounded-[2.5rem]">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><PlusCircle size={24} /></div>
                                    <div className="text-left">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">04. Ventajas del Plan</h3>
                                        <p className="text-[10px] text-white/20 font-bold uppercase mt-0.5">Lista de Beneficios Incluidos en el Recibo</p>
                                    </div>
                                </div>
                                <ChevronDown className={`text-primary transition-transform duration-500 ${openSections.advantages ? 'rotate-180' : ''}`} size={24} />
                            </button>

                            {openSections.advantages && (
                                <div className="px-8 pb-10 space-y-6 animate-fade-in">
                                    <div className="space-y-4">
                                        {editingTemplate?.advantages_list?.map((adv, idx) => (
                                            <div key={idx} className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={adv}
                                                    onChange={e => {
                                                        const newList = [...(editingTemplate.advantages_list || [])];
                                                        newList[idx] = e.target.value;
                                                        setEditingTemplate({ ...editingTemplate, advantages_list: newList });
                                                    }}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-primary/50 text-white"
                                                    placeholder="Ej: Acceso a reportes..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newList = editingTemplate.advantages_list?.filter((_, i) => i !== idx);
                                                        setEditingTemplate({ ...editingTemplate, advantages_list: newList });
                                                    }}
                                                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))}
                                        {(!editingTemplate?.advantages_list || editingTemplate.advantages_list.length < 6) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newList = [...(editingTemplate.advantages_list || []), ""];
                                                    setEditingTemplate({ ...editingTemplate, advantages_list: newList });
                                                }}
                                                className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> Agregar Ventaja
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5. Textos Largos */}
                    <div className={`bg-white/[0.02] rounded-[2.5rem] border border-white/5 transition-all ${openSections.texts ? 'ring-1 ring-primary/20 shadow-2xl' : ''}`}>
                        <button type="button" onClick={() => toggleSection('texts')} className="w-full p-8 flex items-center justify-between hover:bg-white/5 transition-colors rounded-[2.5rem]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary"><AlignLeft size={24} /></div>
                                <div className="text-left">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">{editingTemplate?.category === 'recibo_suscripcion' ? '05. Contenido del Recibo' : '04. Contenido Legal'}</h3>
                                    <p className="text-[10px] text-white/20 font-bold uppercase mt-0.5">Declaración, Firma y Estado de Plantilla</p>
                                </div>
                            </div>
                            <ChevronDown className={`text-primary transition-transform duration-500 ${openSections.texts ? 'rotate-180' : ''}`} size={24} />
                        </button>

                        {openSections.texts && (
                            <div className="px-8 pb-10 space-y-10 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                                                {editingTemplate?.category === 'recibo_suscripcion' ? 'Descripción del Servicio' : 'Certificación / Declaración'}
                                            </label>
                                            <span className={`text-[10px] font-black ${editingTemplate?.declaration_text?.length && editingTemplate.declaration_text.length > 150 ? 'text-orange-500' : 'text-primary'}`}>{editingTemplate?.declaration_text?.length || 0}/200</span>
                                        </div>
                                        <textarea maxLength={200} rows={4} value={editingTemplate?.declaration_text || ''} onChange={e => setEditingTemplate({ ...editingTemplate, declaration_text: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] p-5 text-sm font-bold outline-none focus:border-primary/50 resize-none shadow-inner text-white leading-relaxed" placeholder="Escribe el párrafo principal..." />
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-1">Firma / Pie de Página</label>
                                            <input type="text" value={editingTemplate?.signature_text || ''} onChange={e => setEditingTemplate({ ...editingTemplate, signature_text: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-sm font-black text-white shadow-inner outline-none focus:border-primary/50" placeholder="Ej: Gerencia de Operaciones" />
                                        </div>
                                        <div
                                            onClick={() => setEditingTemplate(prev => ({ ...prev, is_default: !prev?.is_default }))}
                                            className={`p-6 rounded-[1.5rem] border transition-all cursor-pointer flex items-center justify-between group ${editingTemplate?.is_default ? 'bg-primary/10 border-primary/20 shadow-lg shadow-primary/5' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${editingTemplate?.is_default ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/20'}`}>
                                                    <CheckCircle2 size={20} />
                                                </div>
                                                <div>
                                                    <span className={`text-xs font-black uppercase tracking-wider block ${editingTemplate?.is_default ? 'text-white' : 'text-white/40'}`}>Plantilla Predeterminada</span>
                                                    <p className="text-[10px] text-white/20 font-bold uppercase mt-0.5">Se usará como base para nuevos procesos</p>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-6 rounded-full relative transition-all ${editingTemplate?.is_default ? 'bg-primary' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${editingTemplate?.is_default ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </form>

                {/* Preview Column */}
                <div className="w-full lg:w-[450px] xl:w-[550px] shrink-0 sticky top-8 z-10 transition-all duration-300 ease-out h-fit">
                    <div
                        style={{ height: containerHeight }}
                        className="bg-[#0a0f18] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0f18] to-[#0a0f18] rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col backdrop-blur-sm transition-[height] duration-300 ease-out"
                    >
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary"><Eye size={18} /></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Previsualización en Vivo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsZoom100(!isZoom100)}
                                    className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                        isZoom100 
                                            ? 'bg-primary border-primary text-white' 
                                            : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {isZoom100 ? 'Ajustar' : '100%'}
                                </button>
                                <span className="text-[10px] bg-white/5 text-white/40 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{editingTemplate?.category === 'recibo_suscripcion' ? 'Recibo' : 'Certificado'}</span>
                            </div>
                        </div>

                        <div ref={previewContainerRef} className="flex-1 p-4 flex justify-center bg-black/40 overflow-auto relative">
                            {isPreviewLoading && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Actualizando vista previa...</span>
                                    </div>
                                </div>
                            )}
                            
                            {previewHtml ? (
                                <div className="flex justify-center items-start w-full">
                                    <div
                                        style={{
                                            width: `${816 * (isZoom100 ? 1 : dynamicScale)}px`,
                                            height: `${paperHeight * (isZoom100 ? 1 : dynamicScale)}px`,
                                            overflow: 'hidden',
                                            flexShrink: 0
                                        }}
                                    >
                                        <div
                                            className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-300"
                                            style={{
                                                width: '816px',
                                                height: `${paperHeight}px`,
                                                transform: `scale(${isZoom100 ? 1 : dynamicScale})`,
                                                transformOrigin: 'top left',
                                                flexShrink: 0
                                            }}
                                        >
                                            <iframe
                                                srcDoc={previewHtml}
                                                className="w-full border-none"
                                                scrolling="no"
                                                style={{ 
                                                    pointerEvents: 'none',
                                                    height: `${paperHeight}px`,
                                                    overflow: 'hidden'
                                                }}
                                                title="Live Preview"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 text-white/20 h-full">
                                    <Loader2 className="animate-spin mb-4" size={32} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Generando vista previa...</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white/5 text-[10px] text-white/20 font-bold uppercase tracking-widest text-center italic border-t border-white/5">
                            Esta es una representación visual del diseño final
                        </div>
                    </div>
                </div>
            </div>

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
    );
}

export default function AdminDocumentEditorPage() {
    return (
        <Suspense fallback={
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-white/20">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="font-black uppercase tracking-widest text-xs">Iniciando Editor...</p>
            </div>
        }>
            <AdminDocumentEditorContent />
        </Suspense>
    );
}
