"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    Download,
    Loader2,
    Heart,
    Sparkles,
    CheckCircle2,
    Camera,
    Upload,
    AlertCircle,
    X,
    Search,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import FarewellPreview from './components/FarewellPreview';
import TemplateCanvas from '@/components/admin/imageTemplates/TemplateCanvas';
import { ASPECT_RATIOS } from '@/lib/admin/imageTemplates/constants';
import type { AspectRatio } from '@/lib/admin/imageTemplates/types';

// Emojis de respaldo para plantillas sin logo/imagen de previsualización.
const FAREWELL_EMOJIS = ['🕊️', '🌸', '🌿', '💐', '🌟', '🐾'];

interface UnifiedTemplate {
    id: number;
    name: string;
    description: string | null;
    type: 'legacy' | 'canvas';
    previewUrl: string | null;
    isDefault?: boolean;
    isGlobal?: boolean;
    raw: any;
}

interface Pet {
    id: number;
    name: string;
    species: string;
    breed: string;
    size?: string;
    birth_date: string;
    death_date?: string;
    age: number;
    status: string;
    customer_id: number;
    image_url?: string;
    images?: string[];
}

const MAX_FAREWELL_LENGTH = 300;
const STAGE_BASE = 520;

export default function FarewellPickerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cremationId = searchParams.get('cremation_id');
    const templateId = searchParams.get('id');

    // ==========================================
    // Unified gallery & editor states
    // ==========================================
    const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selected, setSelected] = useState<UnifiedTemplate | null>(null);

    // Pet selection modal states
    const [pendingTemplate, setPendingTemplate] = useState<UnifiedTemplate | null>(null);
    const [isPetModalOpen, setIsPetModalOpen] = useState(false);
    const [allPets, setAllPets] = useState<Pet[]>([]);
    const [loadingPets, setLoadingPets] = useState(false);
    const [petSearchQuery, setPetSearchQuery] = useState('');

    // Pet customization fields
    const [petName, setPetName] = useState('');
    const [farewellText, setFarewellText] = useState('');
    const [petPhotoUrl, setPetPhotoUrl] = useState<string | null>(null);
    const [petPhotoFile, setPetPhotoFile] = useState<File | null>(null);

    // Subtitle (eslogan / fecha de fallecimiento / nada). El admin define
    // el default en la plantilla; aquí el tenant puede elegir cambiarlo.
    type SubtitleMode = 'template' | 'eslogan' | 'fecha' | 'rango' | 'none';
    const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('template');
    const [subtitleCustom, setSubtitleCustom] = useState<string>('');
    // Datos auto-rellenados desde la cremación. Read-only para el tenant.
    const [prefilledName, setPrefilledName] = useState<string | null>(null);
    const [deathDateISO, setDeathDateISO] = useState<string | null>(null);
    const [birthDateISO, setBirthDateISO] = useState<string | null>(null);



    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    const exportRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<any>(null);

    // Canvas template aspect ratio preview state
    const [canvasRatio, setCanvasRatio] = useState<AspectRatio>('1:1');

    const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Inject Google Fonts once.
    useEffect(() => {
        const id = 'image-templates-google-fonts';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Cormorant+Garamond:ital,wght@0,400..700;1,400..700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap';
        document.head.appendChild(link);
    }, []);

    // ==========================================
    // Fetch templates (Only Legacy / Farewell templates)
    // ==========================================
    useEffect(() => {
        const fetch = async () => {
            try {
                const legacyData = await apiRequest('/api/internal/farewell-templates/');

                const legacyMapped: UnifiedTemplate[] = (Array.isArray(legacyData) ? legacyData : []).map(t => ({
                    id: t.id,
                    name: t.name,
                    description: t.description,
                    type: 'legacy',
                    previewUrl: t.preview_url ? getImageUrl(t.preview_url) : null,
                    isDefault: t.is_default,
                    isGlobal: t.tenant_id === null,
                    raw: t
                }));

                setTemplates(legacyMapped);
            } catch (err) {
                console.error('Error fetching templates:', err);
                showToast('Error al cargar las plantillas', 'error');
            } finally {
                setLoadingTemplates(false);
            }
        };
        fetch();
    }, []);

    // ==========================================
    // Fetch all pets for the selection modal
    // ==========================================
    useEffect(() => {
        const fetchPets = async () => {
            setLoadingPets(true);
            try {
                const petsData = await apiRequest('/api/internal/pets/');
                if (Array.isArray(petsData)) {
                    setAllPets(petsData);
                }
            } catch (err) {
                console.error('Error fetching pets:', err);
            } finally {
                setLoadingPets(false);
            }
        };
        fetchPets();
    }, []);

    const deathDateFormatted = useMemo(() => {
        if (!deathDateISO) return null;
        try {
            return new Date(deathDateISO).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return null;
        }
    }, [deathDateISO]);

    // Auto-select template from `id` search parameter
    useEffect(() => {
        if (templates.length > 0 && templateId) {
            const found = templates.find(t => String(t.id) === templateId);
            if (found) {
                setSelected(found);
            }
        }
    }, [templates, templateId]);

    // Prefill details from cremation_id
    useEffect(() => {
        if (!cremationId) return;
        const fetchPrefill = async () => {
            try {
                const cremation = await apiRequest(`/api/internal/cremations/${cremationId}`);
                if (cremation) {
                    setDeathDateISO(cremation.scheduled_at || null);
                    const pets = await apiRequest('/api/internal/pets/');
                    const pet = Array.isArray(pets) ? pets.find((p: any) => p.id === cremation.pet_id) : null;
                    if (pet) {
                        setPrefilledName(pet.name);
                        setPetName(pet.name);
                        if (pet.birth_date) {
                            setBirthDateISO(pet.birth_date);
                        }
                        if (pet.image_url) {
                            setPetPhotoUrl(getImageUrl(pet.image_url));
                        } else if (pet.images && pet.images.length > 0) {
                            setPetPhotoUrl(getImageUrl(pet.images[0]));
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching cremation data for prefill:', err);
            }
        };
        fetchPrefill();
    }, [cremationId]);

    // Rango de fechas de vida (Nacimiento - Fallecimiento)
    const lifeRangeFormatted = useMemo(() => {
        if (!birthDateISO && !deathDateISO) return null;
        try {
            const birthYear = birthDateISO ? new Date(birthDateISO).getFullYear() : '...';
            const deathYear = deathDateISO ? new Date(deathDateISO).getFullYear() : '...';
            if (birthYear === '...' && deathYear === '...') return null;
            return `${birthYear} — ${deathYear}`;
        } catch {
            return null;
        }
    }, [birthDateISO, deathDateISO]);

    // Valor efectivo del subtítulo según el modo elegido por el tenant
    const effectiveSubtitle = useMemo(() => {
        if (!selected || selected.type !== 'legacy') return '';
        const tplDefault = selected.raw.config?.elements?.subtitle || '';
        switch (subtitleMode) {
            case 'none': return '';
            case 'fecha': return deathDateFormatted || tplDefault;
            case 'rango': return lifeRangeFormatted || tplDefault;
            case 'eslogan': return subtitleCustom || tplDefault;
            case 'template':
            default: return tplDefault;
        }
    }, [subtitleMode, subtitleCustom, deathDateFormatted, lifeRangeFormatted, selected]);

    // Set first aspect ratio for Canvas template upon selection
    useEffect(() => {
        if (selected && selected.type === 'canvas') {
            const ratios = selected.raw.supported_ratios || ['1:1'];
            setCanvasRatio(ratios[0]);
        }
    }, [selected]);

    // ==========================================
    // Compose runtime configs
    // ==========================================
    const previewConfig = useMemo(() => {
        if (!selected || selected.type !== 'legacy') return null;
        const base = selected.raw.config || {};
        return {
            ...base,
            elements: {
                ...(base.elements || {}),
                petName: petName || base.elements?.petName || 'Nombre de la Mascota',
                subtitle: effectiveSubtitle,
                farewellText: farewellText || base.elements?.farewellText || '',
                image2Url: petPhotoUrl || base.elements?.image2Url || null,
            },
        };
    }, [
        selected,
        petName,
        farewellText,
        petPhotoUrl,
        effectiveSubtitle,
    ]);

    const canvasBindings = useMemo(() => {
        if (!selected || selected.type !== 'canvas') return { pet_name: '', date: '', phrase: '', static: '' };
        return {
            pet_name: petName || 'Nombre de la Mascota',
            date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
            phrase: farewellText || selected.raw.default_phrase || 'Gracias por tantos momentos de felicidad y amor incondicional.',
            static: '',
        };
    }, [selected, petName, farewellText]);

    const ratioDef = useMemo(() => {
        if (!selected || selected.type !== 'canvas') return null;
        return ASPECT_RATIOS.find((r) => r.value === canvasRatio) || ASPECT_RATIOS[0];
    }, [selected, canvasRatio]);

    const stageSize = useMemo(() => {
        if (!ratioDef) return { width: 0, height: 0 };
        const { w, h } = ratioDef;
        if (w >= h) {
            return { width: STAGE_BASE, height: Math.round((STAGE_BASE * h) / w) };
        }
        return { width: Math.round((STAGE_BASE * w) / h), height: STAGE_BASE };
    }, [ratioDef]);

    // ==========================================
    // Photo handlers
    // ==========================================
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Selecciona un archivo de imagen', 'error');
            return;
        }
        const localUrl = URL.createObjectURL(file);
        if (petPhotoUrl?.startsWith('blob:')) URL.revokeObjectURL(petPhotoUrl);
        setPetPhotoUrl(localUrl);
        setPetPhotoFile(file);
        e.target.value = '';
    };

    const handleClearPhoto = () => {
        if (petPhotoUrl?.startsWith('blob:')) URL.revokeObjectURL(petPhotoUrl);
        setPetPhotoUrl(null);
        setPetPhotoFile(null);
    };

    // ==========================================
    // Export High Quality image
    // ==========================================
    const handleExport = async () => {
        if (!selected) return;
        setExporting(true);
        try {
            if (selected.type === 'canvas') {
                const stage = stageRef.current;
                if (!stage) throw new Error('Stage not found');
                
                // Export using Konva stage with high definition 2x pixel ratio
                const dataUrl = stage.toDataURL({
                    pixelRatio: 2.0,
                    mimeType: 'image/png',
                });
                
                // Increment template usage count asynchronously
                apiRequest(`/api/internal/farewell-templates/image-templates/${selected.id}/use`, {
                    method: 'POST'
                }).catch(err => console.warn('Increment usage count failed:', err));

                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `despedida-${(petName || 'mascota').replace(/\s+/g, '-').toLowerCase()}.png`;
                link.click();
                showToast('Imagen generada correctamente', 'success');
            } else {
                if (!exportRef.current || !previewConfig) return;
                const canvas = await html2canvas(exportRef.current, {
                    useCORS: true,
                    scale: 2,
                    backgroundColor: null,
                });
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `despedida-${(petName || 'mascota').replace(/\s+/g, '-').toLowerCase()}.png`;
                link.click();
                showToast('Imagen generada correctamente', 'success');
            }
        } catch (err) {
            console.error('Export error:', err);
            showToast('No se pudo generar la imagen. Reintenta.', 'error');
        } finally {
            setExporting(false);
        }
    };

    const handleBackToGallery = () => {
        if (petPhotoUrl?.startsWith('blob:')) URL.revokeObjectURL(petPhotoUrl);
        setSelected(null);
        setPetName('');
        setFarewellText('');
        setPetPhotoUrl(null);
        setPetPhotoFile(null);
        
        // Remove `id` from URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete('id');
        router.replace(`/dashboard/documentos/disenos?${params.toString()}`);
    };

    const handleSelectPet = (pet: Pet | null) => {
        if (pet) {
            setPetName(pet.name);
            setBirthDateISO(pet.birth_date);
            setDeathDateISO(pet.death_date || null);
            if (pet.image_url) {
                setPetPhotoUrl(getImageUrl(pet.image_url));
            } else if (pet.images && pet.images.length > 0) {
                setPetPhotoUrl(getImageUrl(pet.images[0]));
            } else {
                setPetPhotoUrl(null);
            }
            setPetPhotoFile(null);
            setPrefilledName(null); // Leave it editable for customization flexibility
        } else {
            // Create template with empty / blank pet profile
            setPetName('');
            setBirthDateISO(null);
            setDeathDateISO(null);
            setPetPhotoUrl(null);
            setPetPhotoFile(null);
            setPrefilledName(null);
        }

        if (pendingTemplate) {
            setSelected(pendingTemplate);
        }
        setIsPetModalOpen(false);
        setPendingTemplate(null);
    };

    // ==========================================
    // Render HTML
    // ==========================================
    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16 relative z-10">
            {/* Background ambient decorative blurs */}
            <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0 animate-pulse" />
            <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.95 }}
                        className={`fixed top-6 right-6 z-[100] flex items-center gap-3.5 px-6 py-4 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border backdrop-blur-xl ${
                            toast.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : toast.type === 'error'
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : 'bg-primary/10 border-primary/20 text-primary'
                        }`}
                    >
                        {toast.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
                        {toast.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
                        <span className="text-xs font-black uppercase tracking-wider">{toast.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {!selected ? (
                /* ============== STEP 1 — GALLERY ============== */
                <>
                    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 relative z-10">
                        <div>
                            {cremationId && (
                                <button
                                    onClick={() => router.push('/dashboard/asignacion-servicios')}
                                    className="group inline-flex items-center text-slate-400 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest bg-white/[0.03] border border-white/5 hover:border-white/20 px-4 py-2 rounded-xl backdrop-blur-md"
                                >
                                    <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                                    Volver a Servicios
                                </button>
                            )}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/25 rounded-full mb-4 shadow-sm backdrop-blur-md">
                                <Sparkles className="text-primary animate-pulse" size={13} aria-hidden="true" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Catálogo de Plantillas</span>
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-none">
                                Elige una plantilla
                                <span className="text-primary bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">.</span>
                            </h1>
                            <p className="text-slate-400 mt-3 text-sm max-w-2xl font-medium leading-relaxed">
                                Selecciona el diseño que mejor honre la memoria de tu mascota. Luego podrás personalizar cada detalle con su foto, nombre y mensaje de despedida.
                            </p>
                        </div>
                    </header>

                    {loadingTemplates ? (
                        <div className="h-96 flex flex-col items-center justify-center gap-4 relative z-10">
                            <Loader2 className="animate-spin text-primary" size={44} />
                            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.25em] animate-pulse">Cargando plantillas de despedida…</span>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="bg-slate-900/20 backdrop-blur-md rounded-[2rem] border-2 border-dashed border-white/10 p-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto shadow-2xl relative z-10">
                            <div className="w-16 h-16 rounded-full bg-slate-950/60 border border-white/5 flex items-center justify-center mb-5 text-slate-500">
                                <Heart className="text-slate-400/80 animate-pulse" size={24} />
                            </div>
                            <h3 className="text-lg font-black text-white mb-2">Aún no hay plantillas</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                El administrador del sistema todavía no ha publicado plantillas de despedida. Vuelve más tarde.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                            {templates.map((template, index) => {
                                const previewUrl = template.previewUrl;
                                const isGlobal = template.isGlobal;

                                return (
                                    <div
                                        key={`${template.type}-${template.id}`}
                                        onClick={() => {
                                            setPendingTemplate(template);
                                            setIsPetModalOpen(true);
                                        }}
                                        className="group text-left bg-slate-900/30 backdrop-blur-xl border border-white/[0.05] hover:border-primary/50 transition-all duration-500 rounded-[2rem] overflow-hidden flex flex-col hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)] hover:-translate-y-1.5 shadow-2xl relative cursor-pointer"
                                    >
                                        <div className="aspect-square relative overflow-hidden border-b border-white/[0.05] bg-[#0c101b]">
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl.startsWith('data:') ? previewUrl : getImageUrl(previewUrl)}
                                                    alt={template.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-950/50">
                                                    <span
                                                        className="text-6xl mb-3 drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
                                                        role="img"
                                                        aria-label="Plantilla sin imagen"
                                                    >
                                                        {FAREWELL_EMOJIS[index % FAREWELL_EMOJIS.length]}
                                                    </span>
                                                    <p className="text-lg font-bold tracking-tight mb-1">
                                                        {template.name}
                                                    </p>
                                                    <p className="text-xs italic opacity-75 line-clamp-2">
                                                        {template.description || 'Plantilla de despedida'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Gradient vignette overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                                            {/* Absolute badges */}
                                            {template.isDefault && (
                                                <span className="absolute top-4 right-4 text-[9px] bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-[0.16em] shadow-lg">
                                                    Default
                                                </span>
                                            )}
                                            {isGlobal && (
                                                <span className="absolute top-4 left-4 text-[9px] bg-indigo-500/15 backdrop-blur-md border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full font-black uppercase tracking-[0.16em] shadow-lg">
                                                    Oficial
                                                </span>
                                            )}
                                            {template.type === 'canvas' && (
                                                <span className="absolute bottom-4 left-4 text-[9px] bg-sky-500/15 backdrop-blur-md border border-sky-500/30 text-sky-300 px-2.5 py-1 rounded-lg font-black uppercase tracking-[0.12em] shadow-lg">
                                                    Editor 2.0
                                                </span>
                                            )}

                                            {/* Hover overlay hint */}
                                            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[3px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-3">
                                                <span className="text-[10px] font-black text-slate-900 bg-white hover:bg-slate-100 px-5 py-2.5 rounded-full uppercase tracking-[0.2em] shadow-[0_10px_25px_-5px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300">
                                                    Usar Plantilla
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-white tracking-tight truncate group-hover:text-primary transition-colors duration-300 mb-1.5">
                                                    {template.name}
                                                </h3>
                                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                    {template.description || 'Sin descripción'}
                                                </p>
                                            </div>
                                            <div className="mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {template.type === 'canvas' ? 'Multi-Formato' : 'Formato Fijo'}
                                                </span>
                                                <span className="text-[10px] text-primary font-mono font-bold">
                                                    {template.type === 'canvas' ? 'Canvas 2.0' : 'Legacy 1.0'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* ============== STEP 2 — GENERATE ============== */
                <>
                    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 relative z-10">
                        <div>
                            <button
                                onClick={handleBackToGallery}
                                className="group inline-flex items-center text-slate-400 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest bg-white/[0.03] border border-white/5 hover:border-white/20 px-4 py-2.5 rounded-xl backdrop-blur-md"
                            >
                                <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                                Volver al Catálogo
                            </button>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/25 rounded-full mb-4 shadow-sm backdrop-blur-md">
                                <Sparkles className="text-primary animate-pulse" size={13} aria-hidden="true" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">{selected.name}</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white leading-none">
                                Personaliza tu despedida
                                <span className="text-primary">.</span>
                            </h1>
                            <p className="text-slate-400 mt-3 text-sm max-w-xl font-medium leading-relaxed">
                                Ingresa la información y la foto de la mascota. El diseño final se previsualizará de forma interactiva y en tiempo real.
                            </p>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={exporting || !petName.trim()}
                            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-primary to-emerald-500 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/10 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                            {exporting ? 'Generando diseño…' : 'Descargar Diseño'}
                        </button>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                        {/* Form column */}
                        <aside className="lg:col-span-4 space-y-6">
                            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/[0.08] p-7 shadow-2xl relative overflow-hidden space-y-6">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                                <div>
                                    <label htmlFor="pet-name" className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5">
                                        Nombre de la Mascota {!prefilledName && <span className="text-red-400">*</span>}
                                        {prefilledName && (
                                            <span className="ml-2 text-primary normal-case tracking-normal text-[10px] font-medium bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                                                auto desde cremación
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        id="pet-name"
                                        type="text"
                                        value={petName}
                                        onChange={(e) => prefilledName ? undefined : setPetName(e.target.value)}
                                        readOnly={!!prefilledName}
                                        placeholder="Ej. Bruno"
                                        maxLength={60}
                                        className={`w-full h-13 border rounded-2xl px-4 text-sm font-medium outline-none transition-all duration-300 ${
                                            prefilledName
                                                ? 'bg-slate-950/50 border-white/5 text-slate-400/80 cursor-not-allowed shadow-inner'
                                                : 'bg-slate-950/30 border-white/10 text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 shadow-lg shadow-black/10'
                                        }`}
                                    />
                                </div>

                                {/* Subtitle selector: eslogan | fecha | rango | nada | default de la plantilla */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                        Eslogan o Fecha
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-950/40 p-1.5 rounded-2xl border border-white/5">
                                        {([
                                            { value: 'template', label: 'Por defecto' },
                                            { value: 'eslogan', label: 'Mi eslogan' },
                                            { value: 'fecha', label: 'Fallecimiento' },
                                            { value: 'rango', label: 'Rango de años' },
                                            { value: 'none', label: 'Sin texto' },
                                        ] as { value: SubtitleMode; label: string }[]).map((opt) => {
                                            const disabled = (opt.value === 'fecha' && !deathDateFormatted) || (opt.value === 'rango' && !lifeRangeFormatted);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => !disabled && setSubtitleMode(opt.value)}
                                                    disabled={disabled}
                                                    className={`py-2.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                                                        subtitleMode === opt.value
                                                            ? 'bg-primary text-white shadow-md shadow-primary/20 border border-primary/20'
                                                            : disabled
                                                                ? 'bg-transparent text-slate-600/40 cursor-not-allowed'
                                                                : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
                                                    } ${opt.value === 'none' ? 'col-span-2' : ''}`}
                                                    title={disabled ? 'Datos de fecha no registrados' : undefined}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {subtitleMode === 'eslogan' && (
                                        <input
                                            type="text"
                                            value={subtitleCustom}
                                            onChange={(e) => setSubtitleCustom(e.target.value)}
                                            placeholder='Ej. "Por siempre en nuestro corazón"'
                                            maxLength={80}
                                            className="w-full h-11 bg-slate-950/30 border border-white/10 rounded-xl px-4 text-white text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-600 shadow-lg shadow-black/10"
                                        />
                                    )}
                                    {(subtitleMode === 'fecha' || subtitleMode === 'rango') && (
                                        <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                            <span>{subtitleMode === 'fecha' ? deathDateFormatted : lifeRangeFormatted}</span>
                                        </div>
                                    )}
                                    {subtitleMode === 'none' && (
                                        <p className="text-[11px] text-slate-500 italic px-1">Se omitirá el subtítulo o fecha en el diseño final.</p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <label htmlFor="farewell-text" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            Mensaje de Despedida
                                        </label>
                                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950/30 px-2 py-0.5 rounded-full border border-white/5">
                                            {farewellText.length}/{MAX_FAREWELL_LENGTH}
                                        </span>
                                    </div>
                                    <textarea
                                        id="farewell-text"
                                        value={farewellText}
                                        onChange={(e) => setFarewellText(e.target.value.slice(0, MAX_FAREWELL_LENGTH))}
                                        maxLength={MAX_FAREWELL_LENGTH}
                                        placeholder="Escribe unas palabras en su honor…"
                                        rows={4}
                                        className="w-full bg-slate-950/30 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm font-medium placeholder:text-slate-600 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all resize-none min-h-[110px] shadow-lg shadow-black/10"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-2 italic leading-relaxed">
                                        Si lo dejas vacío, se usará el mensaje por defecto del diseño.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5">
                                        Foto de la Mascota
                                    </label>
                                    {petPhotoUrl ? (
                                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl group/photo">
                                            <img
                                                src={petPhotoUrl}
                                                alt="Foto de la mascota"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity duration-300" />
                                            <button
                                                type="button"
                                                onClick={handleClearPhoto}
                                                className="absolute bottom-3 right-3 px-4 py-2 bg-red-500/90 hover:bg-red-600 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-red-400/25"
                                            >
                                                Quitar Foto
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="block w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-slate-950/20 hover:bg-primary/[0.02] cursor-pointer transition-all duration-300 group/upload relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover/upload:from-primary/[0.02] group-hover/upload:to-transparent transition-all duration-500" />
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-primary transition-colors duration-300 p-6 text-center relative z-10">
                                                <div className="w-12 h-12 rounded-full bg-slate-900/60 border border-white/5 flex items-center justify-center mb-3 group-hover/upload:border-primary/20 group-hover/upload:bg-primary/5 transition-all duration-300">
                                                    <Upload size={20} className="group-hover/upload:translate-y-[-2px] transition-transform duration-300" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover/upload:text-primary transition-colors duration-300">Subir foto</span>
                                                <span className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">PNG, JPG o JPEG<br />Recomendado cuadrado · Máx 5MB</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoSelect}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex items-start gap-3.5 relative overflow-hidden shadow-md">
                                <div className="absolute top-[-20%] right-[-10%] w-16 h-16 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                                <Heart size={16} className="text-primary mt-0.5 shrink-0 animate-pulse" />
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Las fuentes, colores de fondo y elementos florales están pre-diseñados. Tú aportas el alma del recuerdo: el nombre, la foto y tus palabras.
                                </p>
                            </div>
                        </aside>

                        {/* Preview column */}
                        <section className="lg:col-span-8">
                            <div className="sticky top-6 bg-slate-950 rounded-[2.5rem] border border-white/[0.08] p-6 lg:p-10 flex flex-col items-center justify-center overflow-hidden relative min-h-[640px] shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]">
                                {/* Ambient spotlight glowing background */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none z-0" />
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay rounded-[2.5rem]" />

                                {selected?.type === 'canvas' && selected.raw.supported_ratios?.length > 1 && (
                                    /* Ratio switcher */
                                    <div className="relative z-10 mb-8 flex gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
                                        {selected.raw.supported_ratios.map((r: AspectRatio) => (
                                            <button
                                                key={r}
                                                onClick={() => setCanvasRatio(r)}
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                                                    canvasRatio === r
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 border border-primary/20'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                                                }`}
                                            >
                                                {r === '1:1' ? '1:1 Cuadrado' : r === '9:16' ? '9:16 Vertical' : r === '4:3' ? '4:3 Horizontal' : r === '3:4' ? '3:4 Vertical' : r}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {selected?.type === 'canvas' ? (
                                    <div className="relative z-10 bg-slate-900/80 p-4 rounded-[2rem] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/5 transition-all duration-500 hover:shadow-[0_30px_70px_-10px_rgba(16,185,129,0.1)] hover:border-primary/20">
                                        <TemplateCanvas
                                            ref={stageRef}
                                            width={stageSize.width}
                                            height={stageSize.height}
                                            definition={selected.raw.definition}
                                            bindings={canvasBindings}
                                            photoUrl={petPhotoUrl}
                                        />
                                    </div>
                                ) : previewConfig ? (
                                    <div className="relative z-10 bg-slate-900/80 p-4 rounded-[2rem] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/5 transition-all duration-500 hover:shadow-[0_30px_70px_-10px_rgba(16,185,129,0.1)] hover:border-primary/20">
                                        <FarewellPreview ref={exportRef} config={previewConfig} />
                                    </div>
                                ) : (
                                    <div className="py-24 text-center relative z-10">
                                        <Camera size={32} className="text-slate-600 mx-auto mb-3 animate-pulse" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando previsualización…</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </>
            )}
            {/* Modal de Selección de Mascota */}
            <AnimatePresence>
                {isPetModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                            className="relative w-full max-w-2xl bg-slate-900/90 border border-white/10 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-2xl"
                        >
                            {/* Decorative glowing gradient circle */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

                            {/* Header */}
                            <div className="p-6 md:p-8 border-b border-white/[0.08] flex items-start justify-between relative z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                        Selecciona una Mascota
                                        <span className="text-primary font-bold">.</span>
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        Elige la mascota de la cual deseas generar el diseño de despedida. Cargaremos sus datos automáticamente.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPetModalOpen(false);
                                        setPendingTemplate(null);
                                    }}
                                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 text-slate-400 hover:text-white transition-all cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="px-6 md:px-8 py-4 border-b border-white/[0.05] relative z-10">
                                <div className="relative">
                                    <Search className="absolute left-4 top-3 text-slate-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar mascota por nombre o especie..."
                                        value={petSearchQuery}
                                        onChange={(e) => setPetSearchQuery(e.target.value)}
                                        className="w-full h-11 bg-slate-950/40 border border-white/10 rounded-xl pl-11 pr-4 text-white text-sm placeholder:text-slate-600 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                                    />
                                    {petSearchQuery && (
                                        <button
                                            onClick={() => setPetSearchQuery('')}
                                            className="absolute right-3.5 top-3 text-xs text-slate-500 hover:text-white font-bold"
                                        >
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Pet List Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 relative z-10 min-h-[250px] max-h-[45vh]">
                                {loadingPets ? (
                                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="animate-spin text-primary" size={28} />
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Cargando tus mascotas...</span>
                                    </div>
                                ) : (
                                    (() => {
                                        const filtered = allPets.filter(pet => {
                                            const query = petSearchQuery.toLowerCase();
                                            return (
                                                (pet.name || '').toLowerCase().includes(query) ||
                                                (pet.species || '').toLowerCase().includes(query) ||
                                                (pet.breed || '').toLowerCase().includes(query)
                                            );
                                        });

                                        if (filtered.length === 0) {
                                            return (
                                                <div className="py-12 text-center text-slate-500">
                                                    <p className="text-sm font-semibold">No se encontraron mascotas</p>
                                                    <p className="text-xs text-slate-600 mt-1">Intenta con otra búsqueda o continúa con un diseño vacío.</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {filtered.map((pet) => {
                                                    const photo = pet.image_url || (pet.images && pet.images.length > 0 ? pet.images[0] : null);
                                                    const years = pet.birth_date ? (
                                                        `${new Date(pet.birth_date).getFullYear()} — ${pet.death_date ? new Date(pet.death_date).getFullYear() : 'Presente'}`
                                                    ) : null;

                                                    return (
                                                        <div
                                                            key={pet.id}
                                                            onClick={() => handleSelectPet(pet)}
                                                            className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-950/20 border border-white/[0.04] hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                                                        >
                                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                                                                {photo ? (
                                                                    <img
                                                                        src={getImageUrl(photo)}
                                                                        alt={pet.name}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                    />
                                                                ) : (
                                                                    <Heart size={20} className="text-slate-600 group-hover:text-primary transition-colors" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                                                                    {pet.name}
                                                                </h4>
                                                                <p className="text-xs text-slate-400 truncate">
                                                                    {pet.species} {pet.breed ? `· ${pet.breed}` : ''}
                                                                </p>
                                                                {years && (
                                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                                        {years}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            {/* Footer actions */}
                            <div className="p-6 md:p-8 border-t border-white/[0.08] flex items-center justify-between bg-slate-950/20 relative z-10">
                                <button
                                    onClick={() => handleSelectPet(null)}
                                    className="text-xs font-bold text-slate-400 hover:text-white hover:underline transition-all cursor-pointer"
                                >
                                    Continuar sin mascota (Diseño en blanco)
                                </button>
                                <button
                                    onClick={() => {
                                        setIsPetModalOpen(false);
                                        setPendingTemplate(null);
                                    }}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-transparent text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.02] transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
