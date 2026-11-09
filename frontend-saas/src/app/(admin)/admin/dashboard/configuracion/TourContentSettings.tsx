import React, { useEffect, useState } from 'react';
import {
    AlertTriangle, ArrowDown, ArrowUp, CheckCircle, ChevronDown, ExternalLink, ImageIcon, Loader2,
    MonitorPlay, Plus, RotateCcw, Save, Trash2, Upload,
} from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';
import LibraryPickerModal from '@/components/admin/imageTemplates/LibraryPickerModal';
import { DEFAULT_TOUR, TOUR_LIMITS, type TourContent, type TourModule } from '@/lib/vinzer/tourContent';
import { siteUrl } from '@/lib/vinzer/site';

const BASE = '/api/internal/creator/config/tour';
const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/60 placeholder:text-white/20';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5';

const EMPTY_MODULE: TourModule = {
    id: '', short_label: '', badge: '', title: '', subtitle: '', description: '',
    image_url: '', image_alt: '', image_caption: '', tags: [], highlights: [], video_time: '',
};

const clone = (c: TourContent): TourContent => JSON.parse(JSON.stringify(c));
const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);

/**
 * Admin → Configuración → «Tour del software»: contenido de vinzer.cl/tour
 * (video demo + módulos con su captura). Sin guardar = contenido original.
 */
export default function TourContentSettings() {
    const [content, setContent] = useState<TourContent>(clone(DEFAULT_TOUR));
    const [saved, setSaved] = useState('');
    const [isOriginal, setIsOriginal] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState<number | null>(0);
    const [uploading, setUploading] = useState<number | null>(null);
    const [picker, setPicker] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [max, setMax] = useState(TOUR_LIMITS.modules);

    const load = (data: { content: TourContent | null; max_modules?: number }) => {
        const c = data?.content?.modules?.length ? data.content : clone(DEFAULT_TOUR);
        setContent(clone(c));
        setSaved(JSON.stringify(c));
        setIsOriginal(!data?.content);
        if (data?.max_modules) setMax(data.max_modules);
    };

    useEffect(() => {
        apiRequest(BASE)
            .then(load)
            .catch((e) => setMessage({ type: 'error', text: (e as Error).message || 'No se pudo cargar el tour' }))
            .finally(() => setLoading(false));
    }, []);

    const dirty = JSON.stringify(content) !== saved;
    const invalid = !content.modules.length || content.modules.some((m) => !m.title.trim());

    const patchModule = (i: number, p: Partial<TourModule>) =>
        setContent((prev) => ({ ...prev, modules: prev.modules.map((m, j) => (j === i ? { ...m, ...p } : m)) }));

    const move = (i: number, d: -1 | 1) =>
        setContent((prev) => {
            const mods = [...prev.modules];
            const j = i + d;
            if (j < 0 || j >= mods.length) return prev;
            [mods[i], mods[j]] = [mods[j], mods[i]];
            setOpen(j);
            return { ...prev, modules: mods };
        });

    const upload = async (i: number, file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', 'tour');
        fd.append('ratio', 'original');
        fd.append('processing_mode', 'template');
        fd.append('description', `Tour del software: ${file.name}`);
        setUploading(i);
        try {
            const res = await apiRequest('/api/internal/media/upload', { method: 'POST', body: fd });
            if (res?.url) patchModule(i, { image_url: res.url });
        } catch (e) {
            setMessage({ type: 'error', text: (e as Error).message || 'No se pudo subir la imagen' });
        } finally {
            setUploading(null);
        }
    };

    const persist = async (body: { content: TourContent | null }, okText: string) => {
        setSaving(true);
        setMessage(null);
        try {
            const d = await apiRequest(BASE, { method: 'PUT', body });
            load(d);
            await fetch('/api/revalidate-landing', { method: 'POST' }).catch(() => {});
            setMessage({ type: 'success', text: okText });
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
                    <h3 className="text-xl font-bold flex items-center gap-2"><MonitorPlay className="text-primary" size={20} /> Tour del software</h3>
                    <p className="text-sm text-white/50 mt-1 max-w-2xl">
                        Contenido de la página pública <a href={siteUrl('/tour')} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1">/tour <ExternalLink size={12} /></a>:
                        el video demo y cada módulo con su captura, textos, etiquetas y puntos destacados. Hasta {max} módulos.
                        {isOriginal && <span className="block mt-1 text-amber-300/80">Hoy la página muestra el contenido original (sin video).</span>}
                    </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => persist({ content }, 'Tour guardado: la página ya muestra los cambios')} disabled={!dirty || invalid || saving}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar tour
                    </button>
                    <button type="button" onClick={() => persist({ content: null }, 'Se restauró el contenido original')} disabled={isOriginal || saving}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                        <RotateCcw size={13} /> Restaurar original
                    </button>
                </div>
            </div>

            {message && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {message.text}
                </div>
            )}

            {/* Video */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2">
                <label className={labelCls}>Video demo (YouTube o Vimeo)</label>
                <input className={inputCls} value={content.video_url} maxLength={500}
                    onChange={(e) => setContent((prev) => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=…  (vacío = no se muestra la sección de video)" />
                <p className="text-xs text-white/40">Pega el enlace normal del video; se convierte solo al formato para insertar. Los capítulos salen de los módulos que tengan «Minuto en el video».</p>
            </div>

            {/* Módulos */}
            {content.modules.map((m, i) => {
                const isOpen = open === i;
                return (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-3 p-4">
                            <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                                <div className="w-16 h-10 rounded-lg bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                    {m.image_url ? <img src={m.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-white/30" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{m.badge || `Módulo ${i + 1}`}</p>
                                    <p className={`text-sm font-bold truncate ${m.title.trim() ? 'text-white' : 'text-rose-300'}`}>{m.title.trim() || 'Sin título (obligatorio)'}</p>
                                </div>
                                <ChevronDown size={16} className={`ml-auto text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="p-2 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowUp size={15} /></button>
                                <button type="button" onClick={() => move(i, 1)} disabled={i === content.modules.length - 1} aria-label="Bajar" className="p-2 rounded-lg text-white/50 hover:bg-white/10 disabled:opacity-20"><ArrowDown size={15} /></button>
                                <button type="button" disabled={content.modules.length === 1}
                                    onClick={() => { setContent((prev) => ({ ...prev, modules: prev.modules.filter((_, j) => j !== i) })); setOpen(null); }}
                                    aria-label="Eliminar módulo" title={content.modules.length === 1 ? 'Debe quedar al menos un módulo' : 'Eliminar módulo'}
                                    className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-20"><Trash2 size={15} /></button>
                            </div>
                        </div>

                        {isOpen && (
                            <div className="border-t border-white/10 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Captura */}
                                <div className="md:col-span-2 space-y-2">
                                    <label className={labelCls}>Captura del módulo</label>
                                    <div className="relative aspect-[16/10] max-w-md rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                                        {m.image_url
                                            ? <img src={m.image_url} alt={m.image_alt} className="w-full h-full object-cover" />
                                            : <span className="text-xs text-white/40">Sin captura («Captura próximamente»)</span>}
                                        {uploading === i && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold">
                                            <Upload size={13} /> Subir imagen
                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                                                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(i, f); e.target.value = ''; }} />
                                        </label>
                                        <button type="button" onClick={() => setPicker(i)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold">
                                            <ImageIcon size={13} /> Elegir de la biblioteca
                                        </button>
                                        {m.image_url && (
                                            <button type="button" onClick={() => patchModule(i, { image_url: '' })} className="px-3 py-2 rounded-lg text-xs font-bold text-white/50 hover:text-rose-300 hover:bg-rose-500/10">Quitar</button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-white/40">Ideal 1600 × 1000 px (16:10). Se guarda optimizada en WebP.</p>
                                </div>

                                <Field label="Título *" value={m.title} max={TOUR_LIMITS.title} onChange={(v) => patchModule(i, { title: v })} wide />
                                <Field label="Etiqueta superior" value={m.badge} max={TOUR_LIMITS.badge} placeholder="Módulo 01 · Recepción" onChange={(v) => patchModule(i, { badge: v })} />
                                <Field label="Nombre corto (botón)" value={m.short_label} max={TOUR_LIMITS.short_label} placeholder="Recepción" onChange={(v) => patchModule(i, { short_label: v })} />
                                <Field label="Subtítulo" value={m.subtitle} max={TOUR_LIMITS.subtitle} onChange={(v) => patchModule(i, { subtitle: v })} wide />
                                <Area label="Descripción" value={m.description} max={TOUR_LIMITS.description} rows={4} onChange={(v) => patchModule(i, { description: v })} />
                                <Area label="Puntos destacados (uno por línea)" value={m.highlights.join('\n')} rows={4}
                                    hint={`Máx. ${TOUR_LIMITS.highlights}`} onChange={(v) => patchModule(i, { highlights: lines(v).slice(0, TOUR_LIMITS.highlights) })} half />
                                <Area label="Etiquetas (una por línea)" value={m.tags.join('\n')} rows={4}
                                    hint={`Máx. ${TOUR_LIMITS.tags}`} onChange={(v) => patchModule(i, { tags: lines(v).slice(0, TOUR_LIMITS.tags) })} half />
                                <Field label="Texto alternativo de la imagen (SEO)" value={m.image_alt} max={TOUR_LIMITS.image_alt} onChange={(v) => patchModule(i, { image_alt: v })} />
                                <Field label="Minuto en el video" value={m.video_time} max={8} placeholder="01:15 (vacío = no es capítulo)" onChange={(v) => patchModule(i, { video_time: v })} />
                                <Field label="Pie de la imagen" value={m.image_caption} max={TOUR_LIMITS.image_caption} onChange={(v) => patchModule(i, { image_caption: v })} wide />
                            </div>
                        )}
                    </div>
                );
            })}

            {content.modules.length < max && (
                <button type="button"
                    onClick={() => { setContent((prev) => ({ ...prev, modules: [...prev.modules, { ...EMPTY_MODULE, tags: [], highlights: [] }] })); setOpen(content.modules.length); }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-white/15 text-white/60 hover:text-white hover:border-white/30 font-bold text-sm">
                    <Plus size={16} /> Agregar módulo ({content.modules.length}/{max})
                </button>
            )}
            {invalid && <p className="text-xs text-amber-300">Cada módulo necesita un título.</p>}

            <LibraryPickerModal
                isOpen={picker !== null}
                title="Elegir captura del módulo"
                onClose={() => setPicker(null)}
                onSelect={(item) => { if (picker !== null) patchModule(picker, { image_url: item.url }); }}
            />
        </div>
    );
}

function Field({ label, value, max, placeholder, onChange, wide }: {
    label: string; value: string; max: number; placeholder?: string; onChange: (v: string) => void; wide?: boolean;
}) {
    return (
        <div className={wide ? 'md:col-span-2' : ''}>
            <label className={labelCls}>{label}</label>
            <input className={inputCls} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}

function Area({ label, value, max, rows, hint, onChange, half }: {
    label: string; value: string; max?: number; rows: number; hint?: string; onChange: (v: string) => void; half?: boolean;
}) {
    // Texto local (las listas se guardan sin líneas vacías); el editor se monta al abrir el módulo.
    const [text, setText] = useState(value);
    return (
        <div className={half ? '' : 'md:col-span-2'}>
            <label className={labelCls}>{label}{hint && <span className="ml-1 normal-case font-medium text-white/30">· {hint}</span>}</label>
            <textarea className={`${inputCls} resize-y`} rows={rows} maxLength={max} value={text}
                onChange={(e) => { setText(e.target.value); onChange(e.target.value); }} />
        </div>
    );
}
