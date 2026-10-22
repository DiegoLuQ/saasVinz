import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImageIcon, Loader2, MessageCircle, Move, Plus, RotateCcw, Save, Star, Trash2, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import LibraryPickerModal from '@/components/admin/imageTemplates/LibraryPickerModal';
import { DEFAULT_OVERLAY, DEFAULT_OVERLAY_OPACITY, OVERLAY_PRESETS, overlayBackground, slideTextClasses } from '@/lib/dashboardSlides';

interface Slide {
    image_url: string;
    title: string;
    message: string;
    button_label: string;
    whatsapp_text: string;
    show_button: boolean;
    /** Encuadre de la imagen en % (qué parte de la foto se ve en el banner). */
    pos_x: number;
    pos_y: number;
    /** Degradado automático (celeste en modo claro, azul noche en oscuro) o propio. */
    overlay_auto: boolean;
    overlay_color: string;
    overlay_opacity: number;
    text_theme: 'dark' | 'light';
}

const BASE = '/api/internal/creator/config/dashboard-slides';
/** Imagen y textos de la diapositiva principal original (mismos que el carrusel del panel). */
const ORIGINAL_IMAGE = '/images/vinzer-hero-banner.jpg';
const ORIGINAL: Slide = {
    image_url: '',
    title: 'Cada historia\nmerece un adiós digno',
    message: 'Gestiona de forma simple y segura todo el proceso de cremación de mascotas.',
    button_label: 'Escríbenos por WhatsApp',
    whatsapp_text: '',
    show_button: false,
    pos_x: 80,
    pos_y: 50,
    overlay_auto: true,
    overlay_color: DEFAULT_OVERLAY,
    overlay_opacity: DEFAULT_OVERLAY_OPACITY,
    text_theme: 'dark',
};
const EMPTY: Slide = {
    ...ORIGINAL,
    title: '',
    message: '',
    whatsapp_text: 'Hola, vi el mensaje en mi panel de Vinzer y quiero más información.',
    show_button: true,
    overlay_auto: false,
};

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/60 placeholder:text-white/20';
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5';

type Target = 'principal' | number;

/**
 * Banner del inicio de los crematorios (/dashboard): la diapositiva principal
 * (editable, siempre primera, no se puede quitar) más hasta 3 extra, cada una con
 * imagen, encuadre, degradado, título, mensaje y botón de WhatsApp al número de
 * «Datos del SaaS». Si algo no carga, el panel vuelve a la principal original.
 */
export default function DashboardBannerSettings() {
    const [principal, setPrincipal] = useState<Slide>(ORIGINAL);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [max, setMax] = useState(3);
    const [saved, setSaved] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<Target | null>(null);
    const [picker, setPicker] = useState<Target | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const snapshot = (p: Slide, s: Slide[]) => JSON.stringify([p, s]);
    const load = (d: { default: Slide | null; slides: Slide[]; max: number }) => {
        const p = d.default ? { ...ORIGINAL, ...d.default } : ORIGINAL;
        const s = d.slides.map(sl => ({ ...EMPTY, ...sl }));
        setPrincipal(p);
        setSlides(s);
        setMax(d.max);
        setSaved(snapshot(p, s));
    };

    useEffect(() => {
        apiRequest(BASE)
            .then(load)
            .catch((e) => setMessage({ type: 'error', text: (e as Error).message || 'No se pudo cargar el banner' }))
            .finally(() => setLoading(false));
        // Solo al montar: `load` no depende de props.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const patch = (t: Target, p: Partial<Slide>) => t === 'principal'
        ? setPrincipal(prev => ({ ...prev, ...p }))
        : setSlides(prev => prev.map((s, j) => (j === t ? { ...s, ...p } : s)));
    const move = (i: number, dir: -1 | 1) => setSlides(prev => {
        const j = i + dir;
        if (j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });

    // Se sube a la Biblioteca de Medios (WebP optimizado, categoría «banners»).
    const upload = async (t: Target, file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', 'banners');
        fd.append('ratio', 'original');
        fd.append('processing_mode', 'template');
        fd.append('description', `Banner del panel: ${file.name}`);
        setUploading(t);
        try {
            const res = await apiRequest('/api/internal/media/upload', { method: 'POST', body: fd });
            if (res?.url) patch(t, { image_url: res.url });
        } catch (e) {
            setMessage({ type: 'error', text: (e as Error).message || 'No se pudo subir la imagen' });
        } finally {
            setUploading(null);
        }
    };

    const isOriginal = JSON.stringify(principal) === JSON.stringify(ORIGINAL);
    const dirty = snapshot(principal, slides) !== saved;
    const invalid = slides.some(s => !s.image_url || !s.title.trim()) || !principal.title.trim();

    const save = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // Sin cambios respecto de la original se guarda null: así hereda futuras mejoras de la original.
            const d = await apiRequest(BASE, { method: 'PUT', body: { default: isOriginal ? null : principal, slides } });
            load(d);
            setMessage({ type: 'success', text: `Banner guardado: principal${d.default ? ' (editada)' : ' (original)'} + ${d.slides.length} ${d.slides.length === 1 ? 'diapositiva' : 'diapositivas'}.` });
        } catch (e) {
            setMessage({ type: 'error', text: (e as Error).message || 'No se pudo guardar' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2"><ImageIcon className="text-primary" size={20} /> Banner del panel de los crematorios</h3>
                    <p className="text-sm text-white/50 mt-1 max-w-2xl">
                        Carrusel que ven todos los crematorios al entrar a su inicio: la diapositiva principal (siempre primera) y hasta {max} más.
                        Cada una con imagen, título, mensaje y un botón de WhatsApp al número de «Datos del SaaS». Si algo no carga, la principal
                        vuelve a la original.
                    </p>
                </div>
                <button onClick={save} disabled={!dirty || invalid || saving}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar banner
                </button>
            </div>

            {message && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {message.text}
                </div>
            )}

            <SlideEditor
                slide={principal}
                principal
                heading={<span className="flex items-center gap-1.5"><Star size={14} className="text-amber-400" fill="currentColor" /> Diapositiva principal · siempre aparece primero</span>}
                actions={
                    <button type="button" onClick={() => setPrincipal(ORIGINAL)} disabled={isOriginal}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                        <RotateCcw size={13} /> Restaurar original
                    </button>
                }
                uploading={uploading === 'principal'}
                onPatch={p => patch('principal', p)}
                onUpload={f => upload('principal', f)}
                onPick={() => setPicker('principal')}
            />

            {slides.map((s, i) => (
                <SlideEditor
                    key={i}
                    slide={s}
                    heading={`Diapositiva ${i + 2}`}
                    actions={
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="p-2 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowUp size={15} /></button>
                            <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Bajar" className="p-2 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowDown size={15} /></button>
                            <button type="button" onClick={() => setSlides(prev => prev.filter((_, j) => j !== i))} aria-label="Eliminar diapositiva" className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 size={15} /></button>
                        </div>
                    }
                    uploading={uploading === i}
                    onPatch={p => patch(i, p)}
                    onUpload={f => upload(i, f)}
                    onPick={() => setPicker(i)}
                />
            ))}

            {slides.length < max && (
                <button type="button" onClick={() => setSlides(prev => [...prev, { ...EMPTY }])}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-white/15 text-white/60 hover:text-white hover:border-white/30 font-bold text-sm">
                    <Plus size={16} /> Agregar diapositiva ({slides.length}/{max} adicionales)
                </button>
            )}
            {invalid && <p className="text-xs text-amber-300">La principal necesita título; cada diapositiva adicional, imagen y título.</p>}

            <LibraryPickerModal
                isOpen={picker !== null}
                title="Elegir imagen del banner"
                onClose={() => setPicker(null)}
                onSelect={(item) => { if (picker !== null) patch(picker, { image_url: item.url }); }}
            />
        </div>
    );
}

/** Editor de una diapositiva: vista previa con encuadre, degradado, textos y botón. */
function SlideEditor({ slide: s, principal = false, heading, actions, uploading, onPatch, onUpload, onPick }: {
    slide: Slide;
    principal?: boolean;
    heading: React.ReactNode;
    actions: React.ReactNode;
    uploading: boolean;
    onPatch: (p: Partial<Slide>) => void;
    onUpload: (file: File) => void;
    onPick: () => void;
}) {
    // La principal sin imagen propia usa la original (se ve en la vista previa, pero no se guarda).
    const previewImage = s.image_url || (principal ? ORIGINAL_IMAGE : '');
    return (
        <div className={`border rounded-2xl p-5 space-y-4 ${principal ? 'bg-amber-500/[0.04] border-amber-500/25' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white">{heading}</p>
                {actions}
            </div>

            {/* Vista previa con la forma del banner: arrastra la imagen para encuadrarla */}
            <div className="space-y-2">
                <span className={labelCls}>Imagen de fondo y encuadre {principal ? '' : '*'}</span>
                <BannerPreview slide={s} image={previewImage} uploading={uploading} onMove={(pos_x, pos_y) => onPatch({ pos_x, pos_y })} />
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex gap-2 md:w-auto shrink-0">
                        <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer">
                            <Upload size={13} /> Subir imagen
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
                        </label>
                        <button type="button" onClick={onPick} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold border border-white/10">
                            <ImageIcon size={13} /> Biblioteca
                        </button>
                        {principal && s.image_url && (
                            <button type="button" onClick={() => onPatch({ image_url: '', pos_x: 80, pos_y: 50 })} className="px-3 py-2 rounded-lg text-xs font-bold text-white/50 hover:text-white hover:bg-white/10">
                                Usar imagen original
                            </button>
                        )}
                    </div>
                    {previewImage && (
                        <div className="flex-1 grid grid-cols-2 gap-3">
                            <label className="text-[11px] text-white/50 font-bold">
                                Horizontal {s.pos_x}%
                                <input type="range" min={0} max={100} value={s.pos_x} onChange={e => onPatch({ pos_x: Number(e.target.value) })} className="w-full accent-sky-500" />
                            </label>
                            <label className="text-[11px] text-white/50 font-bold">
                                Vertical {s.pos_y}%
                                <input type="range" min={0} max={100} value={s.pos_y} onChange={e => onPatch({ pos_y: Number(e.target.value) })} className="w-full accent-sky-500" />
                            </label>
                        </div>
                    )}
                </div>
                <p className="text-[11px] text-white/30">
                    Arrastra la imagen o usa los controles para elegir qué parte se ve. El texto va a la izquierda: deja ese lado despejado.
                    Ideal: horizontal, unos 1600×600.{principal ? ' Sin imagen propia se usa la original.' : ''}
                </p>
            </div>

            {/* Degradado sobre la imagen */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none">
                    <input type="checkbox" checked={s.overlay_auto} onChange={e => onPatch({ overlay_auto: e.target.checked })} className="h-4 w-4 accent-sky-500" />
                    Degradado automático <span className="text-white/40 text-xs">(celeste en modo claro, azul noche en modo oscuro, como la original)</span>
                </label>
                {!s.overlay_auto && (
                    <div className="grid md:grid-cols-[auto_minmax(0,1fr)_auto] gap-4 md:items-end">
                        <div>
                            <span className={labelCls}>Color del degradado</span>
                            <div className="flex items-center gap-1.5">
                                {OVERLAY_PRESETS.map(c => (
                                    <button key={c} type="button" title={c} aria-label={`Color ${c}`}
                                        onClick={() => onPatch({ overlay_color: c, text_theme: isDark(c) ? 'light' : 'dark' })}
                                        className={`w-6 h-6 rounded-full border-2 ${s.overlay_color.toUpperCase() === c ? 'border-sky-400 scale-110' : 'border-white/20'}`}
                                        style={{ background: c }} />
                                ))}
                                <label className="relative w-7 h-7 rounded-full border-2 border-dashed border-white/30 overflow-hidden cursor-pointer" title="Otro color">
                                    <input type="color" value={s.overlay_color} onChange={e => onPatch({ overlay_color: e.target.value.toUpperCase(), text_theme: isDark(e.target.value) ? 'light' : 'dark' })}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Elegir otro color" />
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/60 pointer-events-none">+</span>
                                </label>
                            </div>
                        </div>
                        <label className="text-[11px] text-white/50 font-bold">
                            Intensidad {s.overlay_opacity}%
                            <input type="range" min={0} max={100} value={s.overlay_opacity} onChange={e => onPatch({ overlay_opacity: Number(e.target.value) })} className="w-full accent-sky-500" />
                        </label>
                        <div>
                            <span className={labelCls}>Color del texto</span>
                            <div className="inline-flex p-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold">
                                {([['dark', 'Oscuro'], ['light', 'Blanco']] as const).map(([v, label]) => (
                                    <button key={v} type="button" onClick={() => onPatch({ text_theme: v })}
                                        className={`px-3 py-1.5 rounded-md ${s.text_theme === v ? 'bg-white text-[#0A192F]' : 'text-white/60'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
                {/* Textos */}
                <div className="space-y-3">
                    <div>
                        <label className={labelCls}>Título *</label>
                        <textarea value={s.title} maxLength={80} rows={principal ? 2 : 1} onChange={e => onPatch({ title: e.target.value })}
                            placeholder="Ej: Nuevo: imágenes con IA para redes" className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                        <label className={labelCls}>Mensaje</label>
                        <textarea value={s.message} maxLength={240} rows={2} onChange={e => onPatch({ message: e.target.value })} placeholder="Texto breve bajo el título" className={`${inputCls} resize-none`} />
                    </div>
                </div>

                {/* Botón de WhatsApp */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none">
                        <input type="checkbox" checked={s.show_button} onChange={e => onPatch({ show_button: e.target.checked })} className="h-4 w-4 accent-emerald-500" />
                        <MessageCircle size={14} className="text-emerald-400" /> Mostrar botón de WhatsApp
                    </label>
                    {s.show_button && (
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Texto del botón</label>
                                <input value={s.button_label} maxLength={30} onChange={e => onPatch({ button_label: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Mensaje prellenado</label>
                                <input value={s.whatsapp_text} maxLength={300} onChange={e => onPatch({ whatsapp_text: e.target.value })} className={inputCls} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Vista previa del banner con su forma real (muy ancho y bajo). Arrastrar la
 * imagen cambia el encuadre (background-position en %), igual que en el panel.
 * Con degradado automático muestra la versión de modo claro.
 */
function BannerPreview({ slide, image, uploading, onMove }: { slide: Slide; image: string; uploading: boolean; onMove: (x: number, y: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

    const onPointerDown = (e: React.PointerEvent) => {
        if (!image) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, px: slide.pos_x, py: slide.pos_y };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        const box = ref.current;
        if (!d || !box) return;
        // Arrastrar la imagen desplaza el encuadre (background-position en %).
        const kx = (100 / box.clientWidth) * 1.5;
        const ky = (100 / box.clientHeight) * 1.5;
        const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
        onMove(clamp(d.px - (e.clientX - d.x) * kx), clamp(d.py - (e.clientY - d.y) * ky));
    };
    const end = () => { drag.current = null; };
    const text = slideTextClasses(slide.overlay_auto ? 'dark' : slide.text_theme);
    const overlay = slide.overlay_auto ? overlayBackground(DEFAULT_OVERLAY, DEFAULT_OVERLAY_OPACITY) : overlayBackground(slide.overlay_color, slide.overlay_opacity);

    return (
        <div
            ref={ref}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={end}
            onPointerCancel={end}
            className={`relative aspect-[5/1] min-h-[150px] w-full rounded-2xl overflow-hidden border select-none touch-none ${
                image ? 'border-white/10 cursor-grab active:cursor-grabbing' : 'border-dashed border-white/20'
            } bg-[#D8EDFA]`}
        >
            {image ? (
                <div className="absolute inset-0 bg-cover bg-no-repeat"
                    style={{ backgroundImage: `url('${image}')`, backgroundPosition: `${slide.pos_x}% ${slide.pos_y}%` }} />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">Sin imagen</div>
            )}
            {/* Mismo degradé y textos que ve el crematorio */}
            <div className="absolute inset-0 w-2/3 pointer-events-none" style={{ background: overlay }} />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-6 max-w-[55%] pointer-events-none">
                <p className={`text-lg font-black leading-tight whitespace-pre-line line-clamp-2 ${text.title}`}>{slide.title || 'Título'}</p>
                {slide.message && <p className={`text-[11px] mt-1 line-clamp-2 ${text.message}`}>{slide.message}</p>}
                {slide.show_button && (
                    <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 text-[10px] font-black text-[#062e16]">
                        <MessageCircle size={11} /> {slide.button_label || 'WhatsApp'}
                    </span>
                )}
            </div>
            {image && (
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white pointer-events-none">
                    <Move size={11} /> Arrastra para encuadrar
                </span>
            )}
            {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
        </div>
    );
}

/** ¿Color oscuro? (para sugerir texto blanco al elegirlo). */
function isDark(hex: string): boolean {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return false;
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}
