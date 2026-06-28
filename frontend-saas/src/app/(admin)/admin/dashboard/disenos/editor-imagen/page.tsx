"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Loader2,
    Upload,
    Trash2,
    X,
    CheckCircle,
    AlertCircle,
    CheckCircle2,
    Type,
    Calendar,
    Image as ImageIcon,
    Plus,
    Bold,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Building2,
    Sticker,
    Layers,
    Library,
    User,
    Phone,
    MapPin,
    Fingerprint,
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/admin/api';
import ImageCropper from '@/components/tenant/ImageCropper';
import { motion, AnimatePresence } from 'framer-motion';
import { CertFrame, FRAME_COLOR_LIST, frameActive, frameWrapperStyle, frameInnerInsetPct, frameImageMaskStyle } from '@/lib/certFrame';

// Generador de id robusto: crypto.randomUUID solo existe en contexto seguro
// (HTTPS o localhost). En admin.lvh.me sobre HTTP no está disponible.
function uid(): string {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
    } catch { /* noop */ }
    return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- Tipos -----------------------------------------------------------------
type FieldType =
    | 'nombre_mascota'
    | 'fecha_nacimiento'
    | 'fecha_fallecimiento'
    | 'fecha_actual'
    | 'imagen_mascota'
    | 'logo_tenant'
    | 'rut_tenant'
    | 'encargado_tenant'
    | 'rut_encargado'
    | 'celular_tenant'
    | 'direccion_tenant';

interface DesignField {
    id: string;
    type: FieldType;
    x: number; // % (centro)
    y: number; // %
    // texto
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    format?: 'short' | 'long' | 'year' | 'month_year';
    // imagen
    slot?: number;
    w?: number; // % ancho
    shape?: 'circle' | 'rect';
    frame?: CertFrame; // marco decorativo (solo foto de mascota)
}

// Elemento decorativo (imagen subida/biblioteca). z nunca por debajo del fondo (>=1).
interface DesignElement {
    id: string;
    url: string;
    x: number; // % centro
    y: number; // %
    w: number; // % ancho
    z: number; // z-index (>=1)
    rotation?: number;
    optional?: boolean;   // el tenant puede activarlo/desactivarlo al emitir
    default_on?: boolean; // visibilidad por defecto cuando es opcional
}

// Nivel z de los campos (texto/foto/logo). Los elementos con z menor quedan
// detrás del texto; con z mayor, por delante. El fondo siempre es 0.
const FIELD_Z = 50;

// --- Constantes ------------------------------------------------------------
const ASPECT_PADDING: Record<string, number> = {
    '16:9': 56.25,
    '4:3': 75,
    '3:4': 133.333,
};
const ASPECT_NUM: Record<string, number> = {
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
};

const FONT_OPTIONS = [
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: "'Cinzel', serif", label: 'Cinzel' },
    { value: "'Playfair Display', serif", label: 'Playfair Display' },
    { value: "'Montserrat', sans-serif", label: 'Montserrat' },
    { value: "'Great Vibes', cursive", label: 'Great Vibes' },
    { value: 'Arial, sans-serif', label: 'Arial' },
];

const FIELD_META: Record<FieldType, { label: string; icon: any; isImage?: boolean; isDate?: boolean }> = {
    nombre_mascota: { label: 'Nombre Mascota', icon: Type },
    fecha_nacimiento: { label: 'Fecha Nacimiento', icon: Calendar, isDate: true },
    fecha_fallecimiento: { label: 'Fecha Fallecimiento', icon: Calendar, isDate: true },
    fecha_actual: { label: 'Fecha Actual', icon: Calendar, isDate: true },
    imagen_mascota: { label: 'Foto Mascota', icon: ImageIcon, isImage: true },
    logo_tenant: { label: 'Logo Empresa', icon: Building2, isImage: true },
    rut_tenant: { label: 'RUT Empresa', icon: Fingerprint },
    encargado_tenant: { label: 'Encargado', icon: User },
    rut_encargado: { label: 'RUT Encargado', icon: Fingerprint },
    celular_tenant: { label: 'Celular', icon: Phone },
    direccion_tenant: { label: 'Dirección', icon: MapPin },
};

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDemoDate(d: Date, fmt?: string): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    if (fmt === 'long') return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    if (fmt === 'year') return `${d.getFullYear()}`;
    if (fmt === 'month_year') return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    return `${dd}/${mm}/${d.getFullYear()}`;
}

const DEMO = {
    nombre_mascota: 'Firulais',
    fecha_nacimiento: new Date(2015, 5, 12),
    fecha_fallecimiento: new Date(2026, 5, 1),
    fecha_actual: new Date(),
};

function fieldDemoValue(f: DesignField): string {
    if (f.type === 'nombre_mascota') return DEMO.nombre_mascota;
    if (f.type === 'fecha_nacimiento') return formatDemoDate(DEMO.fecha_nacimiento, f.format);
    if (f.type === 'fecha_fallecimiento') return formatDemoDate(DEMO.fecha_fallecimiento, f.format);
    if (f.type === 'fecha_actual') return formatDemoDate(DEMO.fecha_actual, f.format);
    if (f.type === 'rut_tenant') return '76.543.210-K';
    if (f.type === 'encargado_tenant') return 'María González';
    if (f.type === 'rut_encargado') return '12.345.678-9';
    if (f.type === 'celular_tenant') return '+56 9 1234 5678';
    if (f.type === 'direccion_tenant') return 'Av. Siempre Viva 742, Santiago';
    return '';
}

// --- Componente ------------------------------------------------------------
function EditorImagenContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const templateId = searchParams.get('id');

    const [name, setName] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '3:4'>('16:9');
    const [fields, setFields] = useState<DesignField[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [elements, setElements] = useState<DesignElement[]>([]);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [showElementPicker, setShowElementPicker] = useState(false);
    const [library, setLibrary] = useState<{ id: number; url: string }[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [uploadingEl, setUploadingEl] = useState(false);

    const [savedBgUrl, setSavedBgUrl] = useState<string | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);
    const [pendingBgBlob, setPendingBgBlob] = useState<Blob | null>(null);
    const [cropImage, setCropImage] = useState<string | null>(null);

    const [loading, setLoading] = useState(!!templateId);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const selectedField = fields.find((f) => f.id === selectedId) || null;
    const selectedElement = elements.find((e) => e.id === selectedElementId) || null;
    const bgUrlToShow = bgPreview || (savedBgUrl ? getImageUrl(savedBgUrl) : null);

    // --- Carga de plantilla existente -------------------------------------
    useEffect(() => {
        if (!templateId) return;
        (async () => {
            try {
                const t = await apiRequest(`/api/internal/creator/document-templates/templates/${templateId}`);
                setName(t.name || '');
                setIsDefault(!!t.is_default);
                setSavedBgUrl(t.background_logo_url || null);
                const sc = t.sections_config || {};
                setAspectRatio((sc.aspect_ratio as any) || '16:9');
                setFields(Array.isArray(sc.fields) ? sc.fields : []);
                setElements(Array.isArray(sc.elements) ? sc.elements : []);
            } catch (err: any) {
                showToast('Error al cargar el diseño: ' + err.message, 'error');
                router.push('/dashboard/disenos');
            } finally {
                setLoading(false);
            }
        })();
    }, [templateId]);

    // --- Drag & drop ------------------------------------------------------
    const startDrag = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(id);
        const move = (ev: PointerEvent) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            let x = ((ev.clientX - rect.left) / rect.width) * 100;
            let y = ((ev.clientY - rect.top) / rect.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            const rx = Math.round(x * 10) / 10;
            const ry = Math.round(y * 10) / 10;
            setFields((prev) => prev.map((f) => (f.id === id ? { ...f, x: rx, y: ry } : f)));
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // Drag para elementos decorativos
    const startDragElement = (e: React.PointerEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedElementId(id);
        setSelectedId(null);
        const move = (ev: PointerEvent) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            let x = ((ev.clientX - rect.left) / rect.width) * 100;
            let y = ((ev.clientY - rect.top) / rect.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            const rx = Math.round(x * 10) / 10;
            const ry = Math.round(y * 10) / 10;
            setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x: rx, y: ry } : el)));
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // --- Gestión de elementos decorativos ---------------------------------
    const addElement = (url: string) => {
        const maxZ = elements.reduce((m, e) => Math.max(m, e.z || 1), 0);
        const ne: DesignElement = {
            id: uid(),
            url,
            x: 50,
            y: 50,
            w: 20,
            z: Math.max(1, maxZ + 1),
            rotation: 0,
            optional: false,
            default_on: true,
        };
        setElements((prev) => [...prev, ne]);
        setSelectedElementId(ne.id);
        setSelectedId(null);
        setShowElementPicker(false);
    };

    const updateElement = (id: string, patch: Partial<DesignElement>) => {
        setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    };

    const deleteElement = (id: string) => {
        setElements((prev) => prev.filter((e) => e.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const openElementPicker = async () => {
        setShowElementPicker(true);
        setLibraryLoading(true);
        try {
            const data = await apiRequest('/api/internal/creator/document-templates/design-elements');
            setLibrary(data || []);
        } catch {
            showToast('No se pudo cargar la biblioteca de elementos', 'error');
        } finally {
            setLibraryLoading(false);
        }
    };

    const handleElementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setUploadingEl(true);
        try {
            const fd = new FormData();
            fd.append('file', file, file.name);
            const res = await apiRequest('/api/internal/creator/document-templates/upload-design-element', {
                method: 'POST',
                body: fd,
            });
            if (res?.url) {
                setLibrary((prev) => [{ id: Date.now(), url: res.url }, ...prev]);
                addElement(res.url);
            }
        } catch (err: any) {
            showToast('Error al subir elemento: ' + (err.message || ''), 'error');
        } finally {
            setUploadingEl(false);
        }
    };

    // --- Gestión de campos ------------------------------------------------
    const addField = (type: FieldType) => {
        if (type === 'imagen_mascota') {
            const imgCount = fields.filter((f) => f.type === 'imagen_mascota').length;
            if (imgCount >= 3) {
                showToast('Máximo 3 fotos de mascota por diseño', 'error');
                return;
            }
            const nf: DesignField = {
                id: uid(),
                type,
                x: 50,
                y: 50,
                slot: imgCount,
                w: 18,
                shape: 'circle',
                frame: { color: 'gold', border: false, glow: false, gradient: false },
            };
            setFields((prev) => [...prev, nf]);
            setSelectedId(nf.id);
            return;
        }
        if (type === 'logo_tenant') {
            const nf: DesignField = {
                id: uid(),
                type,
                x: 50,
                y: 12,
                w: 15,
                shape: 'rect',
            };
            setFields((prev) => [...prev, nf]);
            setSelectedId(nf.id);
            return;
        }
        const meta = FIELD_META[type];
        const nf: DesignField = {
            id: uid(),
            type,
            x: 50,
            y: 50,
            fontSize: 32,
            fontFamily: 'Georgia, serif',
            color: '#1a1a1a',
            align: 'center',
            bold: false,
            ...(meta.isDate ? { format: 'short' as const } : {}),
        };
        setFields((prev) => [...prev, nf]);
        setSelectedId(nf.id);
    };

    const updateField = (id: string, patch: Partial<DesignField>) => {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    };

    const deleteField = (id: string) => {
        setFields((prev) => {
            const next = prev.filter((f) => f.id !== id);
            // Reindexar slots de las fotos para que no queden huecos
            let slot = 0;
            return next.map((f) => (f.type === 'imagen_mascota' ? { ...f, slot: slot++ } : f));
        });
        if (selectedId === id) setSelectedId(null);
    };

    // --- Imagen de fondo --------------------------------------------------
    const handleBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setCropImage(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = (blob: Blob) => {
        setPendingBgBlob(blob);
        setBgPreview(URL.createObjectURL(blob));
        setCropImage(null);
    };

    const uploadBackground = async (blob: Blob): Promise<string> => {
        const fd = new FormData();
        fd.append('file', blob, 'cert_bg.webp');
        const res = await apiRequest('/api/internal/creator/document-templates/upload-certificate-image', {
            method: 'POST',
            body: fd,
        });
        return res.url;
    };

    // --- Guardar ----------------------------------------------------------
    const handleSave = async () => {
        if (!name.trim()) {
            showToast('Ponle un nombre al diseño', 'error');
            return;
        }
        setSaving(true);
        try {
            let bgUrl = savedBgUrl;
            if (pendingBgBlob) {
                bgUrl = await uploadBackground(pendingBgBlob);
            }
            if (!bgUrl) {
                showToast('Sube una imagen de fondo', 'error');
                setSaving(false);
                return;
            }

            const payload = {
                name: name.trim(),
                category: 'certificadoImg',
                paper_format: 'Carta',
                theme: 'Clásico',
                background_logo_url: bgUrl,
                sections_config: { aspect_ratio: aspectRatio, fields, elements },
                is_default: isDefault,
            };

            const method = templateId ? 'PUT' : 'POST';
            const endpoint = templateId
                ? `/api/internal/creator/document-templates/templates/${templateId}`
                : '/api/internal/creator/document-templates/templates';

            await apiRequest(endpoint, { method, body: JSON.stringify(payload) });
            showToast('Diseño guardado exitosamente', 'success');
            setTimeout(() => router.push('/dashboard/disenos'), 900);
        } catch (err: any) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
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
            {/* Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-8 right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${message.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            } backdrop-blur-md`}
                    >
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-bold text-sm">{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/dashboard/disenos')}
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] transition-all text-white/40 hover:text-white border border-white/5"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            {templateId ? 'Editar Certificado con Imagen' : 'Nuevo Certificado con Imagen'}
                        </h1>
                        <p className="text-white/40 text-sm font-medium mt-1">
                            Sube una imagen y arrastra los campos dinámicos encima.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-white font-black py-4 px-10 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                    Guardar Diseño
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Canvas Column */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Toolbar añadir campos */}
                    <div className="bg-white/[0.02] rounded-[2rem] border border-white/5 p-5 flex flex-wrap gap-3">
                        {(Object.keys(FIELD_META) as FieldType[]).map((type) => {
                            const Icon = FIELD_META[type].icon;
                            return (
                                <button
                                    key={type}
                                    onClick={() => addField(type)}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-primary/20 hover:text-primary text-white/70 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border border-white/5 transition-all"
                                >
                                    <Plus size={14} />
                                    <Icon size={14} />
                                    {FIELD_META[type].label}
                                </button>
                            );
                        })}
                        <button
                            onClick={openElementPicker}
                            className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border border-purple-500/20 transition-all"
                        >
                            <Plus size={14} />
                            <Sticker size={14} />
                            Elemento
                        </button>
                    </div>

                    {/* Canvas */}
                    <div className="bg-[#0a0f18] rounded-[2rem] border border-white/10 p-6 overflow-hidden">
                        {bgUrlToShow ? (
                            <div
                                ref={canvasRef}
                                className="relative w-full select-none shadow-2xl rounded-lg overflow-hidden"
                                style={{
                                    paddingBottom: `${ASPECT_PADDING[aspectRatio]}%`,
                                    backgroundImage: `url('${bgUrlToShow}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                                onPointerDown={() => { setSelectedId(null); setSelectedElementId(null); }}
                            >
                                {/* Elementos decorativos (z-index propio) */}
                                {elements.map((el) => {
                                    const isSel = el.id === selectedElementId;
                                    return (
                                        <img
                                            key={el.id}
                                            src={getImageUrl(el.url)}
                                            alt=""
                                            draggable={false}
                                            onPointerDown={(e) => startDragElement(e, el.id)}
                                            style={{
                                                position: 'absolute',
                                                left: `${el.x}%`,
                                                top: `${el.y}%`,
                                                width: `${el.w}%`,
                                                transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                                                zIndex: Math.max(1, el.z || 1),
                                                cursor: 'move',
                                                touchAction: 'none',
                                                objectFit: 'contain',
                                                opacity: el.optional && !el.default_on ? 0.5 : 1,
                                                outline: isSel ? '2px solid #a855f7' : 'none',
                                            }}
                                        />
                                    );
                                })}
                                {fields.map((f) => {
                                    const isSel = f.id === selectedId;
                                    const common: React.CSSProperties = {
                                        position: 'absolute',
                                        left: `${f.x}%`,
                                        top: `${f.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: FIELD_Z,
                                        cursor: 'move',
                                        touchAction: 'none',
                                    };
                                    if (FIELD_META[f.type].isImage) {
                                        const isLogo = f.type === 'logo_tenant';
                                        const radius = f.shape === 'circle' ? '50%' : '8px';
                                        const isCircle = f.shape === 'circle';
                                        const hasFrame = f.type === 'imagen_mascota' && frameActive(f.frame);
                                        const wrapStyle = hasFrame ? frameWrapperStyle(f.frame as CertFrame, radius) : {};
                                        const insetPct = hasFrame ? frameInnerInsetPct(f.frame as CertFrame) : 0;
                                        const maskStyle = hasFrame ? frameImageMaskStyle(f.frame, isCircle) : {};
                                        return (
                                            <div
                                                key={f.id}
                                                onPointerDown={(e) => startDrag(e, f.id)}
                                                style={{
                                                    ...common,
                                                    width: `${f.w || 18}%`,
                                                    aspectRatio: '1 / 1',
                                                    borderRadius: radius,
                                                    outline: isSel ? '2px solid #6366f1' : (hasFrame ? 'none' : '1px dashed rgba(255,255,255,0.5)'),
                                                    ...wrapStyle,
                                                }}
                                            >
                                                <div
                                                    className="bg-black/30 backdrop-blur-[1px] flex items-center justify-center text-white/60 overflow-hidden"
                                                    style={{ position: 'absolute', inset: `${insetPct}%`, borderRadius: radius, ...maskStyle }}
                                                >
                                                    {isLogo ? <Building2 size={20} /> : <ImageIcon size={20} />}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={f.id}
                                            onPointerDown={(e) => startDrag(e, f.id)}
                                            style={{
                                                ...common,
                                                fontSize: `${f.fontSize}px`,
                                                fontFamily: f.fontFamily,
                                                color: f.color,
                                                textAlign: f.align,
                                                fontWeight: f.bold ? 700 : 400,
                                                whiteSpace: 'nowrap',
                                                lineHeight: 1.1,
                                                padding: '2px 6px',
                                                outline: isSel ? '2px solid #6366f1' : '1px dashed rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            {fieldDemoValue(f)}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-2xl">
                                <ImageIcon size={48} className="text-white/10 mb-4" />
                                <h3 className="text-white font-black mb-2">Sube una imagen de fondo</h3>
                                <p className="text-white/30 text-sm mb-6 max-w-sm">Elige una imagen en proporción {aspectRatio}. Luego podrás arrastrar los campos encima.</p>
                                <label className="cursor-pointer bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase py-3 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                                    <Upload size={16} /> Subir Imagen
                                    <input type="file" className="hidden" accept="image/*" onChange={handleBgSelect} />
                                </label>
                            </div>
                        )}
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center italic mt-4">
                            Vista con datos de ejemplo · arrastra los campos para posicionarlos
                        </p>
                    </div>
                </div>

                {/* Properties Column */}
                <div className="w-full lg:w-[400px] shrink-0 space-y-6">
                    {/* Configuración base */}
                    <div className="bg-white/[0.02] rounded-[2rem] border border-white/5 p-6 space-y-5">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Configuración</h3>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Nombre del diseño</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm outline-none focus:border-primary/50 transition-all font-bold text-white"
                                placeholder="Ej: Certificado Recuerdo Floral"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Proporción</label>
                            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                {(['16:9', '4:3', '3:4'] as const).map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setAspectRatio(r)}
                                        className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${aspectRatio === r ? 'bg-primary text-white' : 'text-white/30 hover:text-white/60'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer flex-1 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5">
                                <Upload size={14} /> {bgUrlToShow ? 'Cambiar imagen' : 'Subir imagen'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleBgSelect} />
                            </label>
                        </div>
                        <div
                            onClick={() => setIsDefault((v) => !v)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isDefault ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={18} className={isDefault ? 'text-primary' : 'text-white/20'} />
                                <span className={`text-xs font-black uppercase tracking-wider ${isDefault ? 'text-white' : 'text-white/40'}`}>Predeterminado</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-all ${isDefault ? 'bg-primary' : 'bg-white/10'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${isDefault ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </div>

                    {/* Propiedades del elemento seleccionado */}
                    {selectedElement && (
                        <div className="bg-white/[0.02] rounded-[2rem] border border-purple-500/20 p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-300 flex items-center gap-2"><Sticker size={14} /> Elemento</h3>
                                <button
                                    onClick={() => deleteElement(selectedElement.id)}
                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="w-full h-24 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
                                <img src={getImageUrl(selectedElement.url)} alt="" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-white/30">Posición X (%)</label>
                                    <input type="number" min={0} max={100} value={Math.round(selectedElement.x)} onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-purple-500/50" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-white/30">Posición Y (%)</label>
                                    <input type="number" min={0} max={100} value={Math.round(selectedElement.y)} onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-purple-500/50" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-white/30">Tamaño</label><span className="text-[9px] font-black text-purple-300">{selectedElement.w}%</span></div>
                                <input type="range" min={3} max={100} value={selectedElement.w} onChange={(e) => updateElement(selectedElement.id, { w: Number(e.target.value) })} className="w-full accent-purple-500" />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-white/30">Rotación</label><span className="text-[9px] font-black text-purple-300">{selectedElement.rotation || 0}°</span></div>
                                <input type="range" min={-180} max={180} value={selectedElement.rotation || 0} onChange={(e) => updateElement(selectedElement.id, { rotation: Number(e.target.value) })} className="w-full accent-purple-500" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-white/30 flex items-center gap-1.5"><Layers size={11} /> Capa (z-index)</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateElement(selectedElement.id, { z: Math.max(1, (selectedElement.z || 1) - 1) })} className="px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-white/70 hover:text-white text-sm font-black">−</button>
                                    <input type="number" min={1} value={selectedElement.z} onChange={(e) => updateElement(selectedElement.id, { z: Math.max(1, Number(e.target.value)) })} className="flex-1 bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white text-center outline-none focus:border-purple-500/50" />
                                    <button onClick={() => updateElement(selectedElement.id, { z: (selectedElement.z || 1) + 1 })} className="px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-white/70 hover:text-white text-sm font-black">+</button>
                                </div>
                                <p className="text-[10px] text-white/20 font-medium">El texto está en la capa {FIELD_Z}. Menor a {FIELD_Z} = detrás del texto; mayor = delante. Nunca por debajo del fondo.</p>
                            </div>
                            <div
                                onClick={() => updateElement(selectedElement.id, { optional: !selectedElement.optional })}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedElement.optional ? 'bg-purple-500/10 border-purple-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                                <span className={`text-[11px] font-black uppercase tracking-wider ${selectedElement.optional ? 'text-purple-300' : 'text-white/40'}`}>Opcional para el tenant</span>
                                <div className={`w-10 h-5 rounded-full relative transition-all ${selectedElement.optional ? 'bg-purple-500' : 'bg-white/10'}`}>
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${selectedElement.optional ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                            {selectedElement.optional && (
                                <div
                                    onClick={() => updateElement(selectedElement.id, { default_on: !(selectedElement.default_on ?? true) })}
                                    className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between"
                                >
                                    <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Visible por defecto</span>
                                    <div className={`w-10 h-5 rounded-full relative transition-all ${(selectedElement.default_on ?? true) ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${(selectedElement.default_on ?? true) ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Propiedades del campo seleccionado */}
                    <div className="bg-white/[0.02] rounded-[2rem] border border-white/5 p-6 space-y-5">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Propiedades del campo</h3>
                        {!selectedField ? (
                            <p className="text-white/30 text-sm italic py-6 text-center">Selecciona un campo en el lienzo para editarlo, o agrega uno desde la barra superior.</p>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-white">{FIELD_META[selectedField.type].label}</span>
                                    <button
                                        onClick={() => deleteField(selectedField.id)}
                                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Posición */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-white/30">Posición X (%)</label>
                                        <input type="number" min={0} max={100} value={Math.round(selectedField.x)} onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-white/30">Posición Y (%)</label>
                                        <input type="number" min={0} max={100} value={Math.round(selectedField.y)} onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50" />
                                    </div>
                                </div>

                                {FIELD_META[selectedField.type].isImage ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-white/30">Tamaño</label><span className="text-[9px] font-black text-primary">{selectedField.w}%</span></div>
                                            <input type="range" min={5} max={60} value={selectedField.w || 18} onChange={(e) => updateField(selectedField.id, { w: Number(e.target.value) })} className="w-full accent-primary" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-white/30">Forma</label>
                                            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                                <button onClick={() => updateField(selectedField.id, { shape: 'circle' })} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${selectedField.shape === 'circle' ? 'bg-white/10 text-white' : 'text-white/30'}`}>Círculo</button>
                                                <button onClick={() => updateField(selectedField.id, { shape: 'rect' })} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${selectedField.shape !== 'circle' ? 'bg-white/10 text-white' : 'text-white/30'}`}>Rectángulo</button>
                                            </div>
                                        </div>
                                        {selectedField.type === 'logo_tenant' ? (
                                            <p className="text-[10px] text-white/20 font-medium">Logo de la empresa. Se toma automáticamente del tenant al emitir el certificado.</p>
                                        ) : (
                                            <p className="text-[10px] text-white/20 font-medium">Foto #{(selectedField.slot ?? 0) + 1} de la mascota. Si la mascota tiene menos fotos, el slot queda vacío al emitir.</p>
                                        )}

                                        {/* Marco decorativo (solo foto de mascota) */}
                                        {selectedField.type === 'imagen_mascota' && (() => {
                                            const fr: CertFrame = selectedField.frame || { color: 'gold' };
                                            const setFrame = (patch: Partial<CertFrame>) => updateField(selectedField.id, { frame: { ...fr, ...patch } });
                                            return (
                                                <div className="space-y-3 pt-3 mt-1 border-t border-white/5">
                                                    <label className="text-[9px] font-black uppercase text-white/30">Marco de la foto</label>
                                                    <div className="flex gap-2">
                                                        {FRAME_COLOR_LIST.map((c) => (
                                                            <button
                                                                key={c.key}
                                                                onClick={() => setFrame({ color: c.key })}
                                                                title={c.label}
                                                                className={`w-7 h-7 rounded-full border-2 transition-all ${fr.color === c.key ? 'border-white scale-110' : 'border-white/10'}`}
                                                                style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button onClick={() => setFrame({ border: !fr.border })} className={`py-2 text-[10px] font-black rounded-lg border transition-all ${fr.border ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Borde</button>
                                                        <button onClick={() => setFrame({ glow: !fr.glow })} className={`py-2 text-[10px] font-black rounded-lg border transition-all ${fr.glow ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Halo</button>
                                                        <button onClick={() => setFrame(fr.gradient ? { gradient: false } : { gradient: true, border: true })} className={`py-2 text-[10px] font-black rounded-lg border transition-all ${fr.gradient ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Degradado</button>
                                                    </div>
                                                    {selectedField.shape === 'circle' ? (
                                                        <button onClick={() => setFrame({ feather: !fr.feather })} className={`w-full py-2 text-[10px] font-black rounded-lg border transition-all ${fr.feather ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Difuminar borde (feather)</button>
                                                    ) : (
                                                        <p className="text-[10px] text-white/20 font-medium italic">El difuminado de borde solo aplica a fotos circulares.</p>
                                                    )}
                                                    <p className="text-[10px] text-white/20 font-medium">El tenant podrá cambiar el marco al emitir.</p>
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-white/30">Tamaño de fuente</label><span className="text-[9px] font-black text-primary">{selectedField.fontSize}px</span></div>
                                            <input type="range" min={10} max={120} value={selectedField.fontSize || 32} onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })} className="w-full accent-primary" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-white/30">Tipografía</label>
                                            <select value={selectedField.fontFamily} onChange={(e) => updateField(selectedField.id, { fontFamily: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50">
                                                {FONT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase text-white/30">Color</label>
                                                <input type="color" value={selectedField.color} onChange={(e) => updateField(selectedField.id, { color: e.target.value })} className="w-full h-9 bg-black/40 border border-white/5 rounded-xl cursor-pointer" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase text-white/30">Estilo</label>
                                                <button onClick={() => updateField(selectedField.id, { bold: !selectedField.bold })} className={`w-full h-9 rounded-xl border flex items-center justify-center transition-all ${selectedField.bold ? 'bg-primary text-white border-primary' : 'bg-black/40 text-white/40 border-white/5'}`}><Bold size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-white/30">Alineación</label>
                                            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                                {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([al, Ic]) => (
                                                    <button key={al} onClick={() => updateField(selectedField.id, { align: al })} className={`flex-1 py-2 rounded-lg flex items-center justify-center ${selectedField.align === al ? 'bg-white/10 text-white' : 'text-white/30'}`}><Ic size={14} /></button>
                                                ))}
                                            </div>
                                        </div>
                                        {FIELD_META[selectedField.type].isDate && (
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase text-white/30">Formato de fecha (por defecto)</label>
                                                <select value={selectedField.format} onChange={(e) => updateField(selectedField.id, { format: e.target.value as any })} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50">
                                                    <option value="short">12/06/2026</option>
                                                    <option value="long">12 de junio de 2026</option>
                                                    <option value="month_year">junio de 2026</option>
                                                    <option value="year">2026</option>
                                                </select>
                                                <p className="text-[10px] text-white/20 font-medium">El tenant podrá cambiar este formato al emitir.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {cropImage && (
                <ImageCropper
                    image={cropImage}
                    aspect={ASPECT_NUM[aspectRatio]}
                    cropShape="rect"
                    showAspectSelector={false}
                    onCancel={() => setCropImage(null)}
                    onCropComplete={handleCropComplete}
                    title={`Recortar fondo (${aspectRatio})`}
                />
            )}

            {/* Selector de elementos (subir / biblioteca) */}
            <AnimatePresence>
                {showElementPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowElementPicker(false)} />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative z-10 w-full max-w-3xl max-h-[85vh] bg-[#0a192f] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-purple-500/10 text-purple-300 rounded-xl"><Library size={18} /></div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">Elementos decorativos</h3>
                                        <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Sube uno nuevo o reutiliza de la biblioteca</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowElementPicker(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"><X size={18} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <label className="cursor-pointer w-full mb-6 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 rounded-2xl py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
                                    {uploadingEl ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                    {uploadingEl ? 'Subiendo...' : 'Subir nuevo elemento (PNG/JPG → webp)'}
                                    <input type="file" className="hidden" accept="image/*" disabled={uploadingEl} onChange={handleElementUpload} />
                                </label>

                                {libraryLoading ? (
                                    <div className="h-32 flex items-center justify-center text-white/30"><Loader2 className="animate-spin" size={28} /></div>
                                ) : library.length === 0 ? (
                                    <p className="text-white/30 text-sm italic text-center py-8">La biblioteca está vacía. Sube tu primer elemento.</p>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {library.map((it) => (
                                            <button
                                                key={it.id}
                                                onClick={() => addElement(it.url)}
                                                className="aspect-square bg-black/40 rounded-xl border border-white/5 hover:border-purple-500/50 p-2 flex items-center justify-center transition-all group"
                                                title="Agregar al diseño"
                                            >
                                                <img src={getImageUrl(it.url)} alt="" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function EditorImagenPage() {
    return (
        <Suspense fallback={
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-white/20">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="font-black uppercase tracking-widest text-xs">Iniciando Editor...</p>
            </div>
        }>
            <EditorImagenContent />
        </Suspense>
    );
}
