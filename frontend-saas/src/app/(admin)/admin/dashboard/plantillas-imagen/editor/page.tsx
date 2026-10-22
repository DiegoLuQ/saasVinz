"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Save, Loader2, Type, Image as ImageIcon, Sticker, Trash2, ChevronUp, ChevronDown,
    Sparkles, Lock, AlertCircle, CheckCircle2, Layers, Settings2, AlignLeft, AlignCenter, AlignRight,
    Wand2, Globe, RotateCcw, Database, Plus, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, Crosshair,
} from 'lucide-react';
import { useAdminTenants } from '@/hooks/useAdminBootstrap';
import { getImageUrl } from '@/lib/admin/api';

import TemplateCanvas from '@/components/admin/imageTemplates/TemplateCanvas';
import LibraryPickerModal, { type LibraryItem } from '@/components/admin/imageTemplates/LibraryPickerModal';
import { sampleBindings } from '@/components/admin/imageTemplates/TemplatePreviewThumb';
import {
    createImageTemplate, getAiMeta, getImageTemplate, testAiImage, testAiText, updateImageTemplate, uploadTemplateAsset,
} from '@/lib/admin/imageTemplates/api';
import {
    ASPECT_RATIOS, DATA_FIELD_GROUPS, FONT_FAMILIES, MAX_AI_TEXT_CHARS, PHOTO_SLOTS, PROMPT_PLACEHOLDERS, SAMPLE_PHOTO_URL,
    TEMPLATE_FONTS_URL, TEXT_BINDINGS, loremOf, nearestAiRatio, newPhotoLayer, newStickerLayer, newTextLayer,
} from '@/lib/admin/imageTemplates/constants';
import type {
    AspectRatio, ImageTemplateCreate, Layer, PhotoLayer, PhotoSlot, StickerLayer, TemplateDefinition, TextBinding, TextLayer,
} from '@/lib/admin/imageTemplates/types';

const STAGE_MAX = 560;
const SAMPLE_PHOTO_3_URL =
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80';
const SAMPLE_PHOTO_2_URL =
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80';

const EMPTY_DEFINITION: TemplateDefinition = {
    background: { type: 'color', value: '#1e1b2e', opacity: 1 },
    layers: [],
};

type Tab = 'plantilla' | 'capas' | 'ia';

// ---------------------------------------------------------------------------
// Controles pequeños
// ---------------------------------------------------------------------------

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/60';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className={labelCls}>{label}</label>{children}</div>;
}

function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }: {
    label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string;
}) {
    return (
        <div>
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                <span>{label}</span><span className="text-white/70 normal-case">{value}{suffix}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
        </div>
    );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</span>
            <div className="flex items-center gap-2">
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
                    className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white font-mono" />
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
                    onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
            </div>
        </div>
    );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
    return (
        <label className="flex items-start justify-between gap-3 cursor-pointer">
            <span>
                <span className="block text-xs font-semibold text-white/80">{label}</span>
                {hint && <span className="block text-[11px] text-white/40 mt-0.5">{hint}</span>}
            </span>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-emerald-500 w-4 h-4" />
        </label>
    );
}

function LibraryButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/15 hover:border-primary/50 rounded-lg px-3 py-2.5 text-xs font-bold text-white/70">
            <ImageIcon size={14} /> {label}
        </button>
    );
}

/** Destino de la imagen elegida en el modal de biblioteca. */
type PickerTarget =
    | { kind: 'background' }
    | { kind: 'sticker-new' }
    | { kind: 'sticker'; id: string }
    | { kind: 'sample'; slot: PhotoSlot };

interface SamplePhoto {
    url: string;
    /** Archivo local (solo vista previa / prueba IA: nunca se guarda en la plantilla). */
    file: File | null;
    /** URL de biblioteca: la prueba IA la usa sin volver a subir la imagen. */
    libraryUrl: string | null;
}

function layerLabel(layer: Layer): string {
    if (layer.type === 'photo') {
        return layer.source === 'ai'
            ? `Ilustración IA · desde ${PHOTO_SLOTS.find(s => s.value === (layer.ai_from || 'photo_1'))?.label}`
            : `Foto mascota · ${PHOTO_SLOTS.find(s => s.value === (layer.slot || 'photo_1'))?.label}`;
    }
    if (layer.type === 'sticker') {
        if (layer.binding === 'tenant_logo') return 'Logo del crematorio';
        return layer.url.startsWith('blob:') ? 'Adorno · se sube al guardar' : 'Adorno';
    }
    const b = TEXT_BINDINGS.find(t => t.value === layer.binding)?.label || layer.binding;
    return layer.binding === 'static' ? `Texto · “${(layer.static_text || '').slice(0, 18)}”` : `Texto · ${b}`;
}

// ---------------------------------------------------------------------------
// Editores de propiedades por tipo de capa
// ---------------------------------------------------------------------------

// x/y son el centro de la capa: centrarla en el lienzo es llevarlos al 50 %.
const CENTER_ACTIONS = [
    { label: 'Horizontal', title: 'Centrar horizontalmente', icon: AlignHorizontalJustifyCenter, patch: { x: 50 } },
    { label: 'Vertical', title: 'Centrar verticalmente', icon: AlignVerticalJustifyCenter, patch: { y: 50 } },
    { label: 'Ambos', title: 'Centrar en el lienzo', icon: Crosshair, patch: { x: 50, y: 50 } },
] as const;

function PositionFields({ layer, onChange }: { layer: Layer; onChange: (p: { x?: number; y?: number }) => void }) {
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
                <Slider label="X" value={layer.x} min={0} max={100} step={0.5} suffix="%" onChange={(v) => onChange({ x: v })} />
                <Slider label="Y" value={layer.y} min={0} max={100} step={0.5} suffix="%" onChange={(v) => onChange({ y: v })} />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                {CENTER_ACTIONS.map(({ label, title, icon: Icon, patch }) => {
                    const active = Object.entries(patch).every(([k, v]) => layer[k as 'x' | 'y'] === v);
                    return (
                        <button key={label} type="button" title={title} onClick={() => onChange(patch)}
                            className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${active ? 'bg-primary/20 border-primary/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}>
                            <Icon size={12} /> {label}
                        </button>
                    );
                })}
            </div>
            <p className="text-[10px] text-white/30">Al arrastrar en el lienzo, la capa se pega al centro (mantén Alt para moverla libre).</p>
        </div>
    );
}

function TextProps({ layer, onChange, aiPreview, onAiPreview, maxChars, onMaxChars }: {
    layer: TextLayer;
    onChange: (p: Partial<TextLayer>) => void;
    aiPreview: string;
    onAiPreview: (v: string) => void;
    maxChars: number;
    onMaxChars: (v: number) => void;
}) {
    return (
        <div className="space-y-4">
            <Field label="Contenido">
                <select value={layer.binding} onChange={(e) => onChange({ binding: e.target.value as TextLayer['binding'] })} className={inputCls}>
                    {DATA_FIELD_GROUPS.map(g => (
                        <optgroup key={g.key} label={g.label} className="bg-slate-900">
                            {g.fields.map(f => <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>)}
                        </optgroup>
                    ))}
                    <option value="static" className="bg-slate-900">Texto fijo</option>
                </select>
            </Field>
            {layer.binding === 'ai_text' && (
                <div className="space-y-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-center justify-between">
                        <label className={labelCls}>Texto de vista previa</label>
                        <span className="text-[11px] text-white/50">{aiPreview.length}/{maxChars}</span>
                    </div>
                    <Slider label="Máximo de caracteres que genera la IA" value={maxChars} min={20} max={MAX_AI_TEXT_CHARS} step={10}
                        onChange={onMaxChars} />
                    <textarea value={aiPreview} rows={5} maxLength={maxChars} onChange={(e) => onAiPreview(e.target.value)} className={inputCls} />
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-white/40">El texto generado ocupa esta capa con su fuente, estilo, color y ancho. Diseña con el largo máximo.</p>
                        <button type="button" onClick={() => onAiPreview(loremOf(maxChars))}
                            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-violet-300 hover:text-white">
                            <RotateCcw size={11} /> Lorem máx.
                        </button>
                    </div>
                </div>
            )}
            {layer.binding === 'static' && (
                <Field label="Texto fijo">
                    <textarea value={layer.static_text || ''} rows={2} onChange={(e) => onChange({ static_text: e.target.value })} className={inputCls} />
                </Field>
            )}
            <Field label="Fuente">
                <select value={layer.font_family} onChange={(e) => onChange({ font_family: e.target.value as TextLayer['font_family'] })} className={inputCls}>
                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>)}
                </select>
            </Field>
            <Slider label="Tamaño" value={layer.font_size} min={1} max={20} step={0.1} suffix="%" onChange={(v) => onChange({ font_size: v })} />
            <div className="grid grid-cols-2 gap-3">
                <Field label="Grosor">
                    <select value={layer.font_weight} onChange={(e) => onChange({ font_weight: e.target.value as TextLayer['font_weight'] })} className={inputCls}>
                        {['400', '500', '600', '700'].map(w => <option key={w} value={w} className="bg-slate-900">{w}</option>)}
                    </select>
                </Field>
                <Field label="Alineación">
                    <div className="flex gap-1">
                        {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                            <button key={a} type="button" onClick={() => onChange({ align: a })}
                                className={`flex-1 py-2 rounded-lg flex justify-center ${layer.align === a ? 'bg-primary text-white' : 'bg-white/5 text-white/60'}`}>
                                <Icon size={14} />
                            </button>
                        ))}
                    </div>
                </Field>
            </div>
            <ColorInput label="Color" value={layer.color} onChange={(v) => onChange({ color: v })} />
            <Slider label="Espaciado letras" value={layer.letter_spacing || 0} min={-2} max={20} step={0.5} onChange={(v) => onChange({ letter_spacing: v })} />
            <Slider label="Interlineado" value={layer.line_height || 1.25} min={0.8} max={2.5} step={0.05} onChange={(v) => onChange({ line_height: v })} />
            <Toggle label="Cursiva" checked={layer.italic} onChange={(v) => onChange({ italic: v })} />
            <Toggle label="Sombra" checked={layer.shadow} onChange={(v) => onChange({ shadow: v })} />
            <Toggle label="Ajustar a una caja" hint="Define un alto máximo: la letra se achica si el texto no cabe (recomendado para texto IA)."
                checked={!!layer.height} onChange={(v) => onChange({ height: v ? 25 : undefined })} />
            <Slider label="Ancho" value={layer.width} min={5} max={100} step={0.5} suffix="%" onChange={(v) => onChange({ width: v })} />
            {!!layer.height && (
                <Slider label="Alto máximo" value={layer.height} min={3} max={100} step={0.5} suffix="%" onChange={(v) => onChange({ height: v })} />
            )}
            <PositionFields layer={layer} onChange={onChange} />
        </div>
    );
}

function PhotoProps({ layer, onChange }: { layer: PhotoLayer; onChange: (p: Partial<PhotoLayer>) => void }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <Field label="Contenido">
                    <select value={layer.source === 'ai' ? 'ai' : (layer.slot || 'photo_1')} className={inputCls}
                        onChange={(e) => {
                            const v = e.target.value;
                            onChange(v === 'ai'
                                ? { source: 'ai', ai_from: layer.ai_from || 'photo_1' }
                                : { source: 'pet', slot: v as PhotoLayer['slot'] });
                        }}>
                        {PHOTO_SLOTS.map(s => <option key={s.value} value={s.value} className="bg-slate-900">{`Mascota · ${s.label}`}</option>)}
                        <option value="ai" className="bg-slate-900">Ilustración IA</option>
                    </select>
                </Field>
                <Field label="Forma">
                    <select value={layer.shape} onChange={(e) => onChange({ shape: e.target.value as PhotoLayer['shape'] })} className={inputCls}>
                        <option value="circle" className="bg-slate-900">Círculo / óvalo</option>
                        <option value="rounded" className="bg-slate-900">Redondeada</option>
                        <option value="square" className="bg-slate-900">Rectángulo</option>
                    </select>
                </Field>
            </div>
            <Slider label="Ancho" value={layer.width} min={5} max={100} step={0.5} suffix="%" onChange={(v) => onChange({ width: v })} />
            <Slider label="Alto" value={layer.height} min={5} max={100} step={0.5} suffix="%" onChange={(v) => onChange({ height: v })} />
            <ColorInput label="Borde" value={layer.border_color} onChange={(v) => onChange({ border_color: v })} />
            <Slider label="Grosor borde" value={layer.border_width} min={0} max={15} step={0.5} suffix="px" onChange={(v) => onChange({ border_width: v })} />
            <ColorInput label="Resplandor" value={layer.glow_color || '#ffffff'} onChange={(v) => onChange({ glow_color: v })} />
            <Slider label="Intensidad resplandor" value={layer.glow_blur || 0} min={0} max={60} onChange={(v) => onChange({ glow_blur: v })} />
            {layer.source === 'ai' && (
                <div className="space-y-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Field label="Generar a partir de">
                        <select value={layer.ai_from || 'photo_1'} onChange={(e) => onChange({ ai_from: e.target.value as PhotoSlot })} className={inputCls}>
                            {PHOTO_SLOTS.map(s => <option key={s.value} value={s.value} className="bg-slate-900">{`Mascota · ${s.label}`}</option>)}
                        </select>
                    </Field>
                    <p className="text-[11px] text-violet-300/80">La ilustración ocupa este espacio con su forma, borde y resplandor. Mientras el tenant no la genere, se muestra esa foto original.</p>
                </div>
            )}
            <PositionFields layer={layer} onChange={onChange} />
        </div>
    );
}

function StickerProps({ layer, onChange, onReplace }: {
    layer: StickerLayer; onChange: (p: Partial<StickerLayer>) => void; onReplace: () => void;
}) {
    return (
        <div className="space-y-4">
            {layer.binding === 'tenant_logo'
                ? <p className="text-[11px] text-white/50">Muestra el logo de cada crematorio (Configuración del tenant). Ajusta tamaño y posición.</p>
                : <LibraryButton label="Reemplazar imagen" onClick={onReplace} />}
            <Slider label="Ancho" value={layer.width} min={2} max={100} step={0.5} suffix="%" onChange={(v) => onChange({ width: v })} />
            <Slider label="Rotación" value={layer.rotation || 0} min={-180} max={180} suffix="°" onChange={(v) => onChange({ rotation: v })} />
            <Slider label="Opacidad" value={layer.opacity ?? 1} min={0.05} max={1} step={0.05} onChange={(v) => onChange({ opacity: v })} />
            <PositionFields layer={layer} onChange={onChange} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

function EditorInner() {
    const router = useRouter();
    const qc = useQueryClient();
    const params = useSearchParams();
    const idParam = params.get('id');
    const [templateId, setTemplateId] = useState<number | null>(idParam ? Number(idParam) : null);

    const [form, setForm] = useState<ImageTemplateCreate>({
        name: '', description: '', default_phrase: '', supported_ratios: ['4:5', '1:1', '9:16'],
        definition: EMPTY_DEFINITION, ai_text_prompt: null, ai_image_prompt: null,
        ai_text_max_chars: MAX_AI_TEXT_CHARS, tenant_id: null, is_active: true,
    });
    const tenants = useAdminTenants();
    // Vista previa IA del editor (no se guarda en la plantilla): texto de la capa
    // "Texto IA", foto de prueba (Foto 1) e ilustración generada en la pestaña IA.
    const [aiPreviewText, setAiPreviewText] = useState<string | null>(null);
    const [samples, setSamples] = useState<Record<PhotoSlot, SamplePhoto>>({
        photo_1: { url: SAMPLE_PHOTO_URL, file: null, libraryUrl: null },
        photo_2: { url: SAMPLE_PHOTO_2_URL, file: null, libraryUrl: null },
        photo_3: { url: SAMPLE_PHOTO_3_URL, file: null, libraryUrl: null },
    });
    const [picker, setPicker] = useState<PickerTarget | null>(null);
    const [aiPreviewImage, setAiPreviewImage] = useState<string | null>(null);
    const [locked, setLocked] = useState(false);
    const [loaded, setLoaded] = useState(!idParam);
    const [tab, setTab] = useState<Tab>('plantilla');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [ratio, setRatio] = useState<AspectRatio>('4:5');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    const { data: aiMeta } = useQuery({ queryKey: ['admin', 'image-templates', 'ai-meta'], queryFn: getAiMeta });

    useEffect(() => {
        if (!idParam) return;
        getImageTemplate(Number(idParam))
            .then((t) => {
                setForm({
                    name: t.name, description: t.description, default_phrase: t.default_phrase,
                    supported_ratios: t.supported_ratios?.length ? t.supported_ratios : ['1:1'],
                    definition: t.definition?.layers ? t.definition : EMPTY_DEFINITION,
                    ai_text_prompt: t.ai_text_prompt, ai_image_prompt: t.ai_image_prompt,
                    ai_text_max_chars: t.ai_text_max_chars || MAX_AI_TEXT_CHARS, tenant_id: t.tenant_id ?? null,
                    is_active: t.is_active,
                });
                setRatio(t.supported_ratios?.[0] || '1:1');
                setLocked(t.is_locked);
                setLoaded(true);
            })
            .catch((e) => showToast((e as Error).message || 'No se pudo cargar la plantilla', 'error'));
    }, [idParam]);

    const definition = form.definition;
    const selected = definition.layers.find(l => l.id === selectedId) || null;

    const setDefinition = (fn: (d: TemplateDefinition) => TemplateDefinition) =>
        setForm(f => ({ ...f, definition: fn(f.definition) }));

    const updateLayer = (id: string, patch: Partial<Layer>) =>
        setDefinition(d => ({ ...d, layers: d.layers.map(l => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) }));

    const addLayer = (layer: Layer) => {
        setDefinition(d => ({ ...d, layers: [...d.layers, layer] }));
        setSelectedId(layer.id);
        setTab('capas');
    };

    // Elemento de datos: texto enlazado al campo, con un tamaño razonable según su tipo.
    const addDataField = (binding: TextBinding) => {
        const t = newTextLayer();
        const big = binding === 'pet_name';
        if (binding === 'ai_text') {
            addLayer({ ...t, binding, static_text: '', font_size: 3.2, width: 80, height: 30 });
            return;
        }
        addLayer({
            ...t, binding, static_text: '',
            font_size: big ? 7 : 3.4,
            font_weight: big ? '700' : '500',
            font_family: big ? 'Cinzel' : t.font_family,
        });
    };

    const removeLayer = (id: string) => {
        setDefinition(d => ({ ...d, layers: d.layers.filter(l => l.id !== id) }));
        if (selectedId === id) setSelectedId(null);
    };

    // El orden del arreglo es el orden de dibujo: el último queda encima.
    const moveLayer = (id: string, dir: -1 | 1) => setDefinition(d => {
        const i = d.layers.findIndex(l => l.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= d.layers.length) return d;
        const layers = [...d.layers];
        [layers[i], layers[j]] = [layers[j], layers[i]];
        return { ...d, layers };
    });

    // Imágenes nuevas (fondo/adornos): mientras se edita solo existen en el
    // navegador como blob:. Se procesan a WebP y suben a la nube recién al
    // guardar; si se quitan antes, nunca se suben.
    const pendingFiles = useRef<Map<string, File>>(new Map());

    useEffect(() => {
        const files = pendingFiles.current;
        return () => { files.forEach((_f, url) => URL.revokeObjectURL(url)); };
    }, []);

    const upload = async (file: File): Promise<string | null> => {
        if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
            showToast('La imagen debe ser PNG, JPG o WebP', 'error');
            return null;
        }
        if (file.size > 8 * 1024 * 1024) {
            showToast('La imagen supera 8 MB', 'error');
            return null;
        }
        const url = URL.createObjectURL(file);
        pendingFiles.current.set(url, file);
        return url;
    };

    /** Sube las imágenes locales que la plantilla usa y devuelve la definición con URLs definitivas. */
    const uploadPending = async (def: TemplateDefinition): Promise<TemplateDefinition> => {
        const used = new Set<string>();
        if (def.background.type === 'image' && def.background.value.startsWith('blob:')) used.add(def.background.value);
        def.layers.forEach(l => { if (l.type === 'sticker' && l.url.startsWith('blob:')) used.add(l.url); });
        if (used.size === 0) return def;

        const map = new Map<string, string>();
        for (const blobUrl of used) {
            const file = pendingFiles.current.get(blobUrl);
            if (!file) throw new Error('Una imagen local se perdió: vuelve a agregarla.');
            const res = await uploadTemplateAsset(file);
            map.set(blobUrl, res.url);
        }
        const swap = (u: string) => map.get(u) ?? u;
        // Las subidas quedan registradas: un reintento de guardado no las repite.
        for (const blobUrl of map.keys()) {
            pendingFiles.current.delete(blobUrl);
            URL.revokeObjectURL(blobUrl);
        }
        return {
            background: { ...def.background, value: swap(def.background.value) },
            layers: def.layers.map(l => (l.type === 'sticker' ? { ...l, url: swap(l.url) } : l)),
        };
    };

    // Ratio de vista previa: siempre uno de los soportados.
    useEffect(() => {
        if (!form.supported_ratios.includes(ratio)) setRatio(form.supported_ratios[0] || '1:1');
    }, [form.supported_ratios, ratio]);

    const stageSize = useMemo(() => {
        const r = ASPECT_RATIOS.find(a => a.value === ratio) || ASPECT_RATIOS[0];
        return r.w >= r.h
            ? { width: STAGE_MAX, height: Math.round((STAGE_MAX * r.h) / r.w) }
            : { width: Math.round((STAGE_MAX * r.w) / r.h), height: STAGE_MAX };
    }, [ratio]);

    const maxChars = form.ai_text_max_chars || MAX_AI_TEXT_CHARS;
    const aiText = (aiPreviewText ?? loremOf(maxChars)).slice(0, maxChars);
    const bindings = useMemo(
        () => ({ ...sampleBindings({ default_phrase: form.default_phrase ?? null }), ai_text: aiText }),
        [form.default_phrase, aiText],
    );
    const photos = useMemo(() => ({
        photo_1: { url: samples.photo_1.url, zoom: 1, offset_x: 0, offset_y: 0 },
        photo_2: { url: samples.photo_2.url, zoom: 1, offset_x: 0, offset_y: 0 },
        photo_3: { url: samples.photo_3.url, zoom: 1, offset_x: 0, offset_y: 0 },
        ai: { url: aiPreviewImage, zoom: 1, offset_x: 0, offset_y: 0 },
    }), [samples, aiPreviewImage]);

    // Proporción para pedir la ilustración: la del primer hueco "Ilustración IA".
    const aiLayer = definition.layers.find((l): l is PhotoLayer => l.type === 'photo' && l.source === 'ai');
    const aiRatio = aiLayer
        ? nearestAiRatio((aiLayer.width / 100) * stageSize.width, (aiLayer.height / 100) * stageSize.height)
        : '1:1';

    const aiFrom: PhotoSlot = aiLayer?.ai_from || 'photo_1';

    const setSample = (slot: PhotoSlot, next: SamplePhoto) => {
        setSamples(prev => {
            if (prev[slot].file) URL.revokeObjectURL(prev[slot].url);
            return { ...prev, [slot]: next };
        });
        if (slot === aiFrom) setAiPreviewImage(null);
    };

    // Imagen elegida en la biblioteca: ya está en la nube, se usa su URL tal cual.
    const onLibrarySelect = (item: LibraryItem) => {
        if (!picker) return;
        const url = item.url;
        if (picker.kind === 'background') setDefinition(d => ({ ...d, background: { ...d.background, type: 'image', value: url } }));
        else if (picker.kind === 'sticker-new') addLayer(newStickerLayer(url));
        else if (picker.kind === 'sticker') updateLayer(picker.id, { url });
        else setSample(picker.slot, { url: getImageUrl(url), file: null, libraryUrl: url });
    };

    // Archivo desde el equipo: queda local (blob:) y se sube recién al guardar.
    // Las fotos de ejemplo nunca se suben: solo sirven para la vista previa y la prueba IA.
    const onLocalFile = async (file: File) => {
        if (!picker) return;
        if (picker.kind === 'sample') {
            setSample(picker.slot, { url: URL.createObjectURL(file), file, libraryUrl: null });
            return;
        }
        const url = await upload(file);
        if (!url) return;
        if (picker.kind === 'background') setDefinition(d => ({ ...d, background: { ...d.background, type: 'image', value: url } }));
        else if (picker.kind === 'sticker-new') addLayer(newStickerLayer(url));
        else updateLayer(picker.id, { url });
    };

    const handleSave = async () => {
        if (!form.name.trim()) { showToast('Ponle un nombre a la plantilla', 'error'); setTab('plantilla'); return; }
        if (!form.supported_ratios.length) { showToast('Elige al menos un formato', 'error'); setTab('plantilla'); return; }
        setSaving(true);
        try {
            setUploading(true);
            let definition: TemplateDefinition;
            try {
                definition = await uploadPending(form.definition);
            } finally {
                setUploading(false);
            }
            setForm(f => ({ ...f, definition }));
            const payload: ImageTemplateCreate = {
                ...form,
                definition,
                name: form.name.trim(),
                ai_text_prompt: form.ai_text_prompt?.trim() || null,
                ai_image_prompt: form.ai_image_prompt?.trim() || null,
            };
            if (templateId) {
                await updateImageTemplate(templateId, payload);
            } else {
                const created = await createImageTemplate(payload);
                setTemplateId(created.id);
                router.replace(`/dashboard/plantillas-imagen/editor?id=${created.id}`);
            }
            qc.invalidateQueries({ queryKey: ['admin', 'image-templates'] });
            showToast('Plantilla guardada');
        } catch (e) {
            showToast((e as Error).message || 'Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!loaded) {
        return <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    return (
        <div className="p-6 max-w-[1500px] mx-auto">
            <link href={TEMPLATE_FONTS_URL} rel="stylesheet" />

            {toast && (
                <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-bold backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-red-500/15 border-red-500/30 text-red-300'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.text}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => router.push('/dashboard/plantillas-imagen')}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"><ArrowLeft size={18} /></button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-white truncate">{form.name || 'Nueva plantilla'}</h1>
                        <p className="text-white/40 text-xs">Editor de plantillas para redes · arrastra las capas sobre el lienzo</p>
                    </div>
                </div>
                <button onClick={handleSave} disabled={saving || locked}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                </button>
            </div>

            {locked && (
                <div className="mb-5 bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                    <Lock size={16} /> Esta plantilla ya fue usada por tenants y es de solo lectura. Duplícala desde el listado para crear una versión nueva.
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Panel lateral */}
                <div className="w-full xl:w-[400px] shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto">
                    <div className="flex gap-1 mb-4 bg-black/20 p-1 rounded-xl">
                        {([['plantilla', 'Plantilla', Settings2], ['capas', 'Capas', Layers], ['ia', 'IA', Sparkles]] as const).map(([key, label, Icon]) => (
                            <button key={key} onClick={() => setTab(key)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${tab === key ? 'bg-primary text-white' : 'text-white/60 hover:text-white'}`}>
                                <Icon size={13} /> {label}
                            </button>
                        ))}
                    </div>

                    {tab === 'plantilla' && (
                        <div className="space-y-4">
                            <Field label="Nombre">
                                <input value={form.name} maxLength={120} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                            </Field>
                            <Field label="Descripción">
                                <textarea value={form.description || ''} rows={2} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
                            </Field>
                            <Field label="Frase por defecto">
                                <textarea value={form.default_phrase || ''} rows={2} maxLength={300}
                                    onChange={(e) => setForm(f => ({ ...f, default_phrase: e.target.value }))} className={inputCls} />
                            </Field>
                            <Field label="Formatos soportados">
                                <div className="flex flex-wrap gap-2">
                                    {ASPECT_RATIOS.map(r => {
                                        const on = form.supported_ratios.includes(r.value);
                                        return (
                                            <button key={r.value} type="button"
                                                onClick={() => setForm(f => ({
                                                    ...f,
                                                    supported_ratios: on ? f.supported_ratios.filter(x => x !== r.value) : [...f.supported_ratios, r.value],
                                                }))}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${on ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                                {r.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>
                            <div className="pt-2 border-t border-white/10 space-y-3">
                                <label className={labelCls}>Fondo</label>
                                <div className="flex gap-2">
                                    {(['color', 'image'] as const).map(t => (
                                        <button key={t} type="button"
                                            onClick={() => setDefinition(d => ({ ...d, background: { ...d.background, type: t, value: t === 'color' ? '#1e1b2e' : '' } }))}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold ${definition.background.type === t ? 'bg-primary text-white' : 'bg-white/5 text-white/60'}`}>
                                            {t === 'color' ? 'Color' : 'Imagen'}
                                        </button>
                                    ))}
                                </div>
                                {definition.background.type === 'color' ? (
                                    <ColorInput label="Color de fondo" value={definition.background.value}
                                        onChange={(v) => setDefinition(d => ({ ...d, background: { ...d.background, value: v } }))} />
                                ) : (
                                    <LibraryButton label={definition.background.value ? 'Cambiar imagen de fondo' : 'Elegir imagen de fondo'}
                                        onClick={() => setPicker({ kind: 'background' })} />
                                )}
                                {definition.background.type === 'image' && definition.background.value.startsWith('blob:') && (
                                    <p className="text-[11px] text-amber-300/80">Imagen local: se optimiza a WebP y se sube al guardar.</p>
                                )}
                                <Slider label="Opacidad fondo" value={definition.background.opacity ?? 1} min={0.05} max={1} step={0.05}
                                    onChange={(v) => setDefinition(d => ({ ...d, background: { ...d.background, opacity: v } }))} />
                            </div>
                            <div className="pt-2 border-t border-white/10 space-y-2">
                                <label className={labelCls}>Disponible para</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setForm(f => ({ ...f, tenant_id: null }))}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold ${form.tenant_id == null ? 'bg-primary text-white' : 'bg-white/5 text-white/60'}`}>
                                        <Globe size={13} /> Todos (global)
                                    </button>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, tenant_id: f.tenant_id ?? tenants[0]?.id ?? null }))}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold ${form.tenant_id != null ? 'bg-primary text-white' : 'bg-white/5 text-white/60'}`}>
                                        <Lock size={13} /> Exclusiva
                                    </button>
                                </div>
                                {form.tenant_id != null && (
                                    <select value={form.tenant_id} onChange={(e) => setForm(f => ({ ...f, tenant_id: Number(e.target.value) }))} className={inputCls}>
                                        {tenants.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
                                    </select>
                                )}
                                <p className="text-[11px] text-white/40">
                                    {form.tenant_id == null ? 'La ven todos los crematorios.' : 'Solo ese crematorio la ve y la usa.'}
                                </p>
                            </div>
                            <Toggle label="Visible para los tenants" checked={form.is_active !== false}
                                onChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                        </div>
                    )}

                    {tab === 'capas' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button onClick={() => addLayer(newTextLayer())} className="flex flex-col items-center gap-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-bold">
                                    <Type size={16} /> Texto
                                </button>
                                <button onClick={() => {
                                    const used = new Set(definition.layers.filter((l): l is PhotoLayer => l.type === 'photo' && l.source !== 'ai').map(l => l.slot || 'photo_1'));
                                    addLayer(newPhotoLayer(PHOTO_SLOTS.find(s => !used.has(s.value))?.value || 'photo_1'));
                                }} className="flex flex-col items-center gap-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-bold">
                                    <ImageIcon size={16} /> Foto mascota
                                </button>
                                <button onClick={() => addLayer(newPhotoLayer('photo_1', 'ai'))}
                                    className="flex flex-col items-center gap-1 py-3 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 text-[11px] font-bold">
                                    <Wand2 size={16} /> Imagen IA
                                </button>
                                <button onClick={() => {
                                    const t = newTextLayer();
                                    addLayer({ ...t, binding: 'ai_text', static_text: '', font_size: 3.2, width: 80, height: 30 });
                                }} className="flex flex-col items-center gap-1 py-3 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 text-[11px] font-bold">
                                    <Sparkles size={16} /> Texto IA
                                </button>
                                <button onClick={() => setPicker({ kind: 'sticker-new' })}
                                    className="flex flex-col items-center gap-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-bold">
                                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Sticker size={16} />} Adorno
                                </button>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/60">
                                    <Database size={12} /> Datos · clic para agregar
                                </p>
                                {DATA_FIELD_GROUPS.map(g => (
                                    <div key={g.key}>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-1">{g.label}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {g.fields.map(f => (
                                                <button key={f.value} type="button" onClick={() => addDataField(f.value)}
                                                    title={f.sample ? `Ejemplo: ${f.sample}` : undefined}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${f.value === 'ai_text' ? 'bg-violet-500/15 text-violet-200 hover:bg-violet-500/30' : 'bg-white/5 text-white/75 hover:bg-primary/25 hover:text-white'}`}>
                                                    <Plus size={10} /> {f.label}
                                                </button>
                                            ))}
                                            {g.key === 'tenant' && (
                                                <button type="button"
                                                    onClick={() => addLayer({ ...newStickerLayer(''), binding: 'tenant_logo', width: 20 })}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-white/5 text-white/75 hover:bg-primary/25 hover:text-white">
                                                    <Plus size={10} /> Logo (imagen)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1">
                                {definition.layers.length === 0 && (
                                    <p className="text-white/40 text-xs text-center py-4">Sin capas. Agrega texto, fotos o adornos.</p>
                                )}
                                {[...definition.layers].reverse().map((l) => (
                                    <div key={l.id} onClick={() => setSelectedId(l.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs ${selectedId === l.id ? 'bg-primary/20 text-white ring-1 ring-primary/50' : 'bg-white/[0.03] text-white/70 hover:bg-white/5'}`}>
                                        <span className="flex-1 truncate font-semibold">{layerLabel(l)}</span>
                                        <button title="Subir" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }} className="p-1 text-white/40 hover:text-white"><ChevronUp size={13} /></button>
                                        <button title="Bajar" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }} className="p-1 text-white/40 hover:text-white"><ChevronDown size={13} /></button>
                                        <button title="Eliminar" onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }} className="p-1 text-white/40 hover:text-red-400"><Trash2 size={13} /></button>
                                    </div>
                                ))}
                            </div>

                            {selected && (
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-xs font-black uppercase tracking-wider text-primary mb-3">{layerLabel(selected)}</p>
                                    {selected.type === 'text' && (
                                        <TextProps layer={selected} onChange={(p) => updateLayer(selected.id, p)}
                                            aiPreview={aiText} onAiPreview={setAiPreviewText} maxChars={maxChars}
                                            onMaxChars={(v) => setForm(f => ({ ...f, ai_text_max_chars: v }))} />
                                    )}
                                    {selected.type === 'photo' && <PhotoProps layer={selected} onChange={(p) => updateLayer(selected.id, p)} />}
                                    {selected.type === 'sticker' && (
                                        <StickerProps layer={selected} onChange={(p) => updateLayer(selected.id, p)}
                                            onReplace={() => setPicker({ kind: 'sticker', id: selected.id })} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'ia' && (
                        <AiTab form={form} setForm={setForm} aiMeta={aiMeta} aiRatio={aiRatio} showToast={showToast}
                            hasAiText={definition.layers.some(l => l.type === 'text' && l.binding === 'ai_text')}
                            hasAiImage={!!aiLayer}
                            samples={samples} aiFrom={aiFrom} onPickSample={(slot) => setPicker({ kind: 'sample', slot })}
                            onText={setAiPreviewText} onImage={setAiPreviewImage}
                            aiImage={aiPreviewImage} />
                    )}
                </div>

                {/* Lienzo */}
                <div className="flex-1 flex flex-col items-center gap-4 min-w-0">
                    {form.supported_ratios.length > 1 && (
                        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                            {form.supported_ratios.map(r => (
                                <button key={r} onClick={() => setRatio(r)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold ${ratio === r ? 'bg-primary text-white' : 'text-white/60'}`}>{r}</button>
                            ))}
                        </div>
                    )}
                    <div className="max-w-full overflow-auto rounded-lg shadow-2xl ring-1 ring-white/10">
                        <TemplateCanvas
                            width={stageSize.width}
                            height={stageSize.height}
                            definition={definition}
                            bindings={bindings}
                            photos={photos}
                            editable={!locked}
                            selectedId={selectedId}
                            onSelect={(id) => { setSelectedId(id); if (id) setTab('capas'); }}
                            onLayerChange={updateLayer}
                        />
                    </div>
                    <p className="text-white/40 text-xs text-center">Vista previa con datos de ejemplo. Lo que generes en la pestaña IA se muestra aquí, pero no se guarda en la plantilla.</p>
                </div>

            <LibraryPickerModal
                isOpen={!!picker}
                onClose={() => setPicker(null)}
                title={
                    picker?.kind === 'background' ? 'Imagen de fondo'
                        : picker?.kind === 'sample' ? 'Foto de ejemplo de la mascota'
                            : 'Adorno / elemento'
                }
                defaultCategory={picker?.kind === 'sample' ? 'pets' : ''}
                onSelect={onLibrarySelect}
                onPickFile={onLocalFile}
                uploadHint={picker?.kind === 'sample' ? 'Solo para la vista previa: no se sube' : 'Se optimiza a WebP y se sube al guardar la plantilla'}
            />
            </div>
        </div>
    );
}

function AiTab({
    form, setForm, aiMeta, aiRatio, showToast, hasAiText, hasAiImage, samples, aiFrom, onPickSample, onText, onImage, aiImage,
}: {
    form: ImageTemplateCreate;
    setForm: React.Dispatch<React.SetStateAction<ImageTemplateCreate>>;
    aiMeta: Awaited<ReturnType<typeof getAiMeta>> | undefined;
    aiRatio: string;
    showToast: (t: string, type?: 'success' | 'error') => void;
    hasAiText: boolean;
    hasAiImage: boolean;
    samples: Record<PhotoSlot, SamplePhoto>;
    aiFrom: PhotoSlot;
    onPickSample: (slot: PhotoSlot) => void;
    onText: (t: string) => void;
    onImage: (url: string | null) => void;
    aiImage: string | null;
}) {
    const textRef = useRef<HTMLTextAreaElement>(null);
    const imageRef = useRef<HTMLTextAreaElement>(null);
    const [focus, setFocus] = useState<'text' | 'image'>('text');
    const [testingText, setTestingText] = useState(false);
    const [testInfo, setTestInfo] = useState<string | null>(null);
    const [testingImage, setTestingImage] = useState(false);
    const [imageSecs, setImageSecs] = useState<number | null>(null);

    const textPrompt = form.ai_text_prompt ?? '';
    const imagePrompt = form.ai_image_prompt ?? '';
    const effectiveText = textPrompt.trim() || aiMeta?.default_text_prompt || '';
    const effectiveImage = imagePrompt.trim() || aiMeta?.default_image_prompt || '';
    const maxChars = form.ai_text_max_chars || MAX_AI_TEXT_CHARS;

    const insert = (token: string) => {
        const el = focus === 'text' ? textRef.current : imageRef.current;
        const key = focus === 'text' ? 'ai_text_prompt' : 'ai_image_prompt';
        const current = (focus === 'text' ? textPrompt : imagePrompt) || '';
        const pos = el?.selectionStart ?? current.length;
        const next = current.slice(0, pos) + `{${token}}` + current.slice(pos);
        setForm(f => ({ ...f, [key]: next }));
        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos + token.length + 2, pos + token.length + 2); });
    };

    return (
        <div className="space-y-5">
            {aiMeta && (!aiMeta.configured || !aiMeta.image_configured) && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs px-3 py-2 rounded-lg">
                    Falta configurar una plataforma de IA para {!aiMeta.configured && !aiMeta.image_configured ? 'textos e ilustraciones' : !aiMeta.configured ? 'textos' : 'ilustraciones'}.
                    Hazlo en Configuración Global → Plataformas IA.
                </div>
            )}

            <div>
                <label className={labelCls}>Variables (clic para insertar)</label>
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(aiMeta?.placeholders || PROMPT_PLACEHOLDERS).map(([k, desc]) => (
                        <button key={k} type="button" title={desc} onClick={() => insert(k)}
                            className="px-2 py-1 rounded-md bg-white/5 hover:bg-primary/20 text-[11px] font-mono text-white/70">{`{${k}}`}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className={labelCls}>Prompt de texto · {aiMeta?.text_model || 'gemini'}</label>
                    {textPrompt && <button className="text-[11px] text-white/40 hover:text-white" onClick={() => setForm(f => ({ ...f, ai_text_prompt: null }))}>Usar predeterminado</button>}
                </div>
                <textarea ref={textRef} rows={6} value={textPrompt} placeholder={aiMeta?.default_text_prompt}
                    onFocus={() => setFocus('text')}
                    onChange={(e) => setForm(f => ({ ...f, ai_text_prompt: e.target.value }))} className={inputCls} />
                <Slider label="Límite de caracteres" value={maxChars} min={20} max={MAX_AI_TEXT_CHARS} step={10}
                    onChange={(v) => setForm(f => ({ ...f, ai_text_max_chars: v }))} />
                <button disabled={testingText || !effectiveText}
                    onClick={async () => {
                        setTestingText(true);
                        try {
                            const r = await testAiText(effectiveText, maxChars);
                            onText(r.text);
                            const secs = r.duration_ms != null ? ` · tardó ${(r.duration_ms / 1000).toFixed(1)} s` : '';
                            setTestInfo(`${r.chars}/${r.max_chars} caracteres${secs} · ${hasAiText ? 'aplicado a la capa "Texto IA" del lienzo' : 'agrega una capa "Texto IA" para verlo en el lienzo'}`);
                        } catch (e) { showToast((e as Error).message || 'Error al generar', 'error'); }
                        finally { setTestingText(false); }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-40">
                    {testingText ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Probar con mascota de ejemplo
                </button>
                {testInfo && <p className="text-[11px] text-violet-300/90">{testInfo}</p>}
            </div>

            <div className="space-y-2 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <label className={labelCls}>Prompt de ilustración · {aiMeta?.image_model || 'gemini'}</label>
                    {imagePrompt && <button className="text-[11px] text-white/40 hover:text-white" onClick={() => setForm(f => ({ ...f, ai_image_prompt: null }))}>Usar predeterminado</button>}
                </div>
                <textarea ref={imageRef} rows={6} value={imagePrompt} placeholder={aiMeta?.default_image_prompt}
                    onFocus={() => setFocus('image')}
                    onChange={(e) => setForm(f => ({ ...f, ai_image_prompt: e.target.value }))} className={inputCls} />
                <p className="text-[11px] text-white/40">La IA recibe la foto real de la mascota junto a este prompt.</p>
                <div>
                    <label className={labelCls}>Fotos de ejemplo de la mascota</label>
                    <div className="grid grid-cols-3 gap-2">
                        {PHOTO_SLOTS.map(s => (
                            <button key={s.value} type="button" onClick={() => onPickSample(s.value)} title="Elegir de la biblioteca o del equipo"
                                className={`relative aspect-square rounded-lg overflow-hidden ring-1 ${s.value === aiFrom ? 'ring-2 ring-violet-400' : 'ring-white/10'} hover:ring-primary`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={samples[s.value].url} alt={s.label} className="w-full h-full object-cover" />
                                <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] text-white py-0.5">
                                    {s.label}{s.value === aiFrom ? ' · IA' : ''}
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-white/40 mt-1">La marcada con «IA» es la que recibe la ilustración. Las fotos de ejemplo no se guardan.</p>
                </div>
                {!hasAiImage && <p className="text-[11px] text-amber-300/80">Agrega una capa &quot;Imagen IA&quot; para ver la ilustración en el lienzo.</p>}
                <button disabled={testingImage || !effectiveImage || !(samples[aiFrom].file || samples[aiFrom].libraryUrl)}
                    title={samples[aiFrom].file || samples[aiFrom].libraryUrl ? undefined : 'Elige una foto de ejemplo de la biblioteca o de tu equipo'}
                    onClick={async () => {
                        const sample = samples[aiFrom];
                        setTestingImage(true);
                        try {
                            const r = await testAiImage(effectiveImage, { file: sample.file, url: sample.libraryUrl }, aiRatio);
                            onImage(r.url);
                            setImageSecs(r.duration_ms != null ? r.duration_ms / 1000 : null);
                        } catch (e) { showToast((e as Error).message || 'Error al generar', 'error'); }
                        finally { setTestingImage(false); }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-40">
                    {testingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Probar ilustración
                </button>
                {aiImage && (
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-violet-300/90">
                            Ilustración aplicada al lienzo ({aiRatio}){imageSecs != null ? ` · tardó ${imageSecs.toFixed(1)} s` : ''}.
                        </span>
                        <button type="button" onClick={() => onImage(null)} className="text-white/40 hover:text-white">Quitar</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ImageTemplateEditorPage() {
    return (
        <Suspense fallback={<div className="p-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
            <EditorInner />
        </Suspense>
    );
}
