'use client';

/**
 * Carga masiva de productos desde imágenes (Inventario → Productos).
 * Cada imagen = un producto: el nombre sale del nombre del archivo, la imagen se
 * recorta 1:1 al centro (ajustable con «Recortar»), se convierte a WebP ≤ 1200 px
 * en el navegador y el backend la optimiza al subirla (/products/upload-image,
 * MediaService). «Datos para todas» rellena los campos comunes; cada fila se puede
 * editar. El código se genera en el backend (P-0001…) si queda vacío.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
    AlertTriangle, CheckCircle2, ChevronDown, Crop, ImagePlus, Loader2, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import SearchableSelect from '@/components/tenant/SearchableSelect';

type Area = { x: number; y: number; width: number; height: number };
type Status = 'ready' | 'saving' | 'done' | 'error';

interface Row {
    id: string;
    file: File;
    src: string;          // object URL del original
    preview: string;      // object URL del recorte
    blob: Blob | null;
    crop: Area | null;    // null = recorte automático al centro
    name: string;
    code: string;
    sale_price: number;
    cost_price: number;
    stock: number;
    category_id: number;
    provider_id: number;
    made_to_order: boolean;
    /** Producto especial (adicional del formulario); máx. `specialSlots` en la carga */
    is_special: boolean;
    note: string;
    description: string;
    open: boolean;
    status: Status;
    error?: string;
}

type Common = Pick<Row, 'sale_price' | 'cost_price' | 'stock' | 'category_id' | 'provider_id' | 'made_to_order' | 'note' | 'description'>;

const EMPTY_COMMON: Common = {
    sale_price: 0, cost_price: 0, stock: 0, category_id: 0, provider_id: 0, made_to_order: false, note: '', description: '',
};
const MAX_FILES = 40;
const MAX_SIDE = 1200;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

/** «urna-marmol_blanco (1).jpg» → «Urna marmol blanco» */
export function nameFromFile(filename: string): string {
    let base = filename.replace(/\.[^.]+$/, '');
    try { base = decodeURIComponent(base); } catch { /* nombre tal cual */ }
    base = base.replace(/\s*\(\d+\)\s*$/, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!base) return 'Producto';
    return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 120);
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Formato de imagen no soportado'));
    img.src = src;
});

/** Recorta (área dada o cuadrado centrado), reduce a ≤ 1200 px y convierte a WebP. */
async function renderCrop(src: string, area: Area | null): Promise<Blob> {
    const img = await loadImage(src);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const a = area || { x: (img.naturalWidth - side) / 2, y: (img.naturalHeight - side) / 2, width: side, height: side };
    const scale = Math.min(1, MAX_SIDE / Math.max(a.width, a.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(a.width * scale));
    canvas.height = Math.max(1, Math.round(a.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo procesar la imagen');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, a.x, a.y, a.width, a.height, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('No se pudo convertir la imagen'))), 'image/webp', 0.86,
    ));
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm outline-none focus:border-primary/50';
const labelCls = 'text-[11px] font-bold text-muted-foreground ml-1';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    categories: { id: number; name: string }[];
    providers: { id: number; name: string }[];
    existingNames: string[];
    /** Cuántos productos se pueden crear todavía (Infinity = sin límite) */
    remaining: number;
    /** Cupos libres de productos especiales (máx. 4 por crematorio) */
    specialSlots: number;
}

export default function BulkProductImagesModal({ isOpen, onClose, categories, providers, existingNames, remaining, specialSlots }: Props) {
    const queryClient = useQueryClient();
    const [rows, setRows] = useState<Row[]>([]);
    const [common, setCommon] = useState<Common>(EMPTY_COMMON);
    const [running, setRunning] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [cropping, setCropping] = useState<Row | null>(null);
    const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [cropArea, setCropArea] = useState<Area | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const rowsRef = useRef<Row[]>([]);
    rowsRef.current = rows;

    // Libera los object URLs al cerrar / desmontar
    useEffect(() => () => {
        rowsRef.current.forEach((r) => { URL.revokeObjectURL(r.src); URL.revokeObjectURL(r.preview); });
    }, []);

    const existing = useMemo(() => new Set(existingNames.map((n) => n.trim().toLowerCase())), [existingNames]);
    const catOptions = useMemo(() => [{ value: 0, label: 'Sin categoría' }, ...categories.map((c) => ({ value: c.id, label: c.name }))], [categories]);
    const provOptions = useMemo(() => [{ value: 0, label: 'Sin proveedor' }, ...providers.map((p) => ({ value: p.id, label: p.name }))], [providers]);

    const update = useCallback((id: string, patch: Partial<Row>) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }, []);

    const addFiles = useCallback(async (list: FileList | File[]) => {
        const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
        const room = MAX_FILES - rowsRef.current.length;
        if (files.length > room) setNotice(`Se agregan hasta ${MAX_FILES} imágenes por carga; se omitieron ${files.length - Math.max(room, 0)}.`);
        else setNotice(null);
        for (const file of files.slice(0, Math.max(room, 0))) {
            const src = URL.createObjectURL(file);
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const base: Row = {
                id, file, src, preview: '', blob: null, crop: null, name: nameFromFile(file.name), code: '',
                ...common, is_special: false, open: false, status: 'ready',
            };
            try {
                const blob = await renderCrop(src, null);
                setRows((prev) => [...prev, { ...base, blob, preview: URL.createObjectURL(blob) }]);
            } catch (e: unknown) {
                setRows((prev) => [...prev, { ...base, status: 'error', error: e instanceof Error ? e.message : 'Imagen no válida' }]);
            }
        }
    }, [common]);

    const remove = (r: Row) => {
        URL.revokeObjectURL(r.src);
        if (r.preview) URL.revokeObjectURL(r.preview);
        setRows((prev) => prev.filter((x) => x.id !== r.id));
    };

    const applyToAll = () => {
        setRows((prev) => prev.map((r) => (r.status === 'done' ? r : { ...r, ...common })));
    };

    const openCrop = (r: Row) => {
        setCropping(r);
        setCropPos({ x: 0, y: 0 });
        setZoom(1);
        setCropArea(null);
    };

    const confirmCrop = async () => {
        if (!cropping || !cropArea) return;
        const blob = await renderCrop(cropping.src, cropArea);
        if (cropping.preview) URL.revokeObjectURL(cropping.preview);
        update(cropping.id, { blob, preview: URL.createObjectURL(blob), crop: cropArea, status: 'ready', error: undefined });
        setCropping(null);
    };

    const pending = rows.filter((r) => r.status !== 'done' && r.blob);
    // Especiales marcados en esta carga (los ya creados ya descontaron su cupo al volver a abrir)
    const specialMarked = pending.filter((r) => r.is_special).length;
    const specialLeft = Math.max(specialSlots, 0) - specialMarked;
    const overQuota = Number.isFinite(remaining) && pending.length > remaining;
    const invalid = pending.some((r) => !r.name.trim() || r.sale_price < 0 || r.cost_price < 0 || r.stock < 0);

    const createAll = async () => {
        if (!pending.length || overQuota || invalid) return;
        setRunning(true);
        let created = 0;
        for (const r of pending) {
            update(r.id, { status: 'saving', error: undefined });
            try {
                const fd = new FormData();
                const fname = `${r.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 60) || 'producto'}.webp`;
                fd.append('file', r.blob as Blob, fname);
                const up = await apiRequest('/api/internal/products/upload-image', { method: 'POST', body: fd });
                await apiRequest('/api/internal/products', {
                    method: 'POST',
                    body: {
                        code: r.code.trim(), name: r.name.trim(), category_id: r.category_id || null, provider_id: r.provider_id || null,
                        sale_price: Number(r.sale_price) || 0, cost_price: Number(r.cost_price) || 0, stock: Math.round(Number(r.stock) || 0),
                        description: r.description.trim() || null, note: r.note.trim() || null, made_to_order: r.made_to_order, is_special: r.is_special,
                        image_url: up.image_url, images: [], availability_status: r.made_to_order ? 'A pedido' : ((Number(r.stock) || 0) > 0 ? 'Disponible' : 'Agotado'),
                        is_active: true,
                    },
                });
                created += 1;
                update(r.id, { status: 'done' });
            } catch (e: unknown) {
                update(r.id, { status: 'error', error: e instanceof Error ? e.message : 'No se pudo crear' });
            }
        }
        setRunning(false);
        if (created) {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        }
        setNotice(created ? `Se crearon ${created} producto${created === 1 ? '' : 's'}.` : null);
    };

    const close = () => {
        if (running) return;
        rows.forEach((r) => { URL.revokeObjectURL(r.src); if (r.preview) URL.revokeObjectURL(r.preview); });
        setRows([]);
        setNotice(null);
        onClose();
    };

    if (!isOpen) return null;

    const doneCount = rows.filter((r) => r.status === 'done').length;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-card text-foreground w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[94vh]">
                <div className="p-5 border-b border-white/5 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold">Carga masiva por imágenes</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Cada imagen crea un producto. El nombre del archivo se usa como nombre; la imagen se recorta cuadrada, se convierte y se optimiza.
                        </p>
                    </div>
                    <button onClick={close} disabled={running} className="text-muted-foreground hover:text-white disabled:opacity-40" aria-label="Cerrar">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Zona de carga */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!running) addFiles(e.dataTransfer.files); }}
                        onClick={() => !running && fileRef.current?.click()}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? 'border-primary bg-primary/10' : 'border-white/15 hover:border-primary/50 bg-white/[0.02]'}`}
                    >
                        <ImagePlus className="mx-auto mb-2 text-primary" size={28} />
                        <p className="text-sm font-bold">Arrastra las imágenes o haz clic para elegirlas</p>
                        <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG, WebP, GIF o AVIF · hasta {MAX_FILES} por carga</p>
                        <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden"
                            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
                    </div>

                    {/* Datos para todas */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold">Datos para todas</p>
                            <button type="button" onClick={applyToAll} disabled={!rows.length || running}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-40">
                                Aplicar a todas
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground -mt-1">Se usan en las imágenes que agregues; «Aplicar a todas» los copia también a las ya agregadas.</p>
                        <CommonFields value={common} onChange={setCommon} catOptions={catOptions} provOptions={provOptions} />
                    </div>

                    {notice && <p className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">{notice}</p>}

                    {/* Filas */}
                    {rows.length > 0 && (
                        <div className="space-y-3">
                            {rows.map((r) => {
                                const dup = existing.has(r.name.trim().toLowerCase());
                                const locked = r.status === 'done' || r.status === 'saving' || running;
                                return (
                                    <div key={r.id} className={`rounded-2xl border p-3 ${r.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : r.status === 'error' ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
                                        <div className="flex gap-3">
                                            <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                                                {r.preview ? <img src={r.preview} alt={r.name} className="w-full h-full object-cover" /> : <AlertTriangle className="m-auto mt-6 text-red-400" size={24} />}
                                                {r.status === 'saving' && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin" size={20} /></div>}
                                                {r.status === 'done' && <div className="absolute inset-0 bg-emerald-600/50 flex items-center justify-center"><CheckCircle2 size={24} /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <div className="col-span-2">
                                                    <label className={labelCls}>Nombre</label>
                                                    <input value={r.name} maxLength={120} disabled={locked} onChange={(e) => update(r.id, { name: e.target.value })} className={inputCls} />
                                                    {dup && r.status !== 'done' && <p className="text-[10px] text-amber-300 mt-0.5 ml-1">Ya existe un producto con este nombre.</p>}
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Precio venta</label>
                                                    <input type="number" min={0} value={r.sale_price} disabled={locked} onChange={(e) => update(r.id, { sale_price: Number(e.target.value) })} className={inputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Stock</label>
                                                    <input type="number" min={0} value={r.stock} disabled={locked} onChange={(e) => update(r.id, { stock: Number(e.target.value) })} className={inputCls} />
                                                </div>
                                                <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" checked={r.made_to_order} disabled={locked} onChange={(e) => update(r.id, { made_to_order: e.target.checked })} className="accent-primary" />
                                                        A pedido
                                                    </label>
                                                    <label
                                                        className={`flex items-center gap-1.5 ${!r.is_special && specialLeft <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        title={!r.is_special && specialLeft <= 0 ? 'Ya no quedan cupos de productos especiales (máx. 4)' : 'Se ofrece a la familia como adicional en el formulario'}
                                                    >
                                                        <input type="checkbox" checked={r.is_special} disabled={locked || (!r.is_special && specialLeft <= 0)}
                                                            onChange={(e) => update(r.id, { is_special: e.target.checked, open: e.target.checked ? true : r.open })} className="accent-primary" />
                                                        <Sparkles size={11} className="text-violet-400" /> Especial
                                                    </label>
                                                    {r.is_special && !r.note.trim() && r.status !== 'done' && (
                                                        <span className="text-amber-300 font-semibold">Agrega su nota especial en «Más datos»</span>
                                                    )}
                                                    <span className="text-muted-foreground truncate">{r.file.name}</span>
                                                    {r.status === 'error' && <span className="text-red-300 font-semibold">{r.error}</span>}
                                                    {r.status === 'done' && <span className="text-emerald-300 font-semibold">Creado</span>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 shrink-0">
                                                <button type="button" title="Recortar" disabled={locked || !r.src} onClick={() => openCrop(r)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"><Crop size={16} /></button>
                                                <button type="button" title="Más datos" disabled={locked} onClick={() => update(r.id, { open: !r.open })} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronDown size={16} className={r.open ? 'rotate-180' : ''} /></button>
                                                <button type="button" title="Quitar" disabled={r.status === 'saving' || running} onClick={() => remove(r)} className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-300 disabled:opacity-30"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        {r.open && !locked && (
                                            <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    <div>
                                                        <label className={labelCls}>Código</label>
                                                        <input value={r.code} maxLength={40} placeholder="Automático" onChange={(e) => update(r.id, { code: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>Precio costo</label>
                                                        <input type="number" min={0} value={r.cost_price} onChange={(e) => update(r.id, { cost_price: Number(e.target.value) })} className={inputCls} />
                                                    </div>
                                                </div>
                                                <CommonFields
                                                    value={r} onChange={(v) => update(r.id, v)} catOptions={catOptions} provOptions={provOptions} compact
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        {rows.length ? `${pending.length} por crear${doneCount ? ` · ${doneCount} creados` : ''}` : 'Sin imágenes todavía'}
                        {Number.isFinite(remaining) && <> · Tu plan permite {Math.max(remaining, 0)} más</>}
                        <> · Especiales: {specialMarked} marcados, {Math.max(specialLeft, 0)} cupo{specialLeft === 1 ? '' : 's'} libre{specialLeft === 1 ? '' : 's'}</>
                        {overQuota && <span className="block text-red-300 font-semibold">Hay más imágenes que productos disponibles en tu plan: quita {pending.length - Math.max(remaining, 0)}.</span>}
                        {invalid && <span className="block text-red-300 font-semibold">Revisa los nombres, precios y stock.</span>}
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={close} disabled={running} className="px-5 py-2.5 rounded-2xl hover:bg-white/5 font-bold text-sm disabled:opacity-40">
                            {doneCount ? 'Cerrar' : 'Cancelar'}
                        </button>
                        <button type="button" onClick={createAll} disabled={running || !pending.length || overQuota || invalid}
                            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 disabled:opacity-40">
                            {running ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                            Crear {pending.length || ''} producto{pending.length === 1 ? '' : 's'}
                        </button>
                    </div>
                </div>
            </div>

            {cropping && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4">
                    <div className="bg-[#1a1f2e] w-full max-w-2xl rounded-3xl overflow-hidden border border-white/10 flex flex-col h-[80vh]">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-white">Recortar · {cropping.name}</h3>
                            <button onClick={() => setCropping(null)} className="text-muted-foreground hover:text-white" aria-label="Cerrar"><X size={20} /></button>
                        </div>
                        <div className="relative flex-1 bg-black/50">
                            <Cropper image={cropping.src} crop={cropPos} zoom={zoom} aspect={1}
                                onCropChange={setCropPos} onZoomChange={setZoom}
                                onCropComplete={(_, px) => setCropArea(px)} />
                        </div>
                        <div className="p-4 border-t border-white/5 flex items-center gap-4">
                            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-primary" aria-label="Zoom" />
                            <button onClick={() => setCropping(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-white">Cancelar</button>
                            <button onClick={confirmCrop} disabled={!cropArea} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">Aplicar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CommonFields({ value, onChange, catOptions, provOptions, compact }: {
    value: Common;
    onChange: (v: Common) => void;
    catOptions: { value: number; label: string }[];
    provOptions: { value: number; label: string }[];
    compact?: boolean;
}) {
    const set = (patch: Partial<Common>) => onChange({ ...value, ...patch });
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {!compact && (
                <>
                    <div>
                        <label className={labelCls}>Precio venta</label>
                        <input type="number" min={0} value={value.sale_price} onChange={(e) => set({ sale_price: Number(e.target.value) })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Precio costo</label>
                        <input type="number" min={0} value={value.cost_price} onChange={(e) => set({ cost_price: Number(e.target.value) })} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Stock</label>
                        <input type="number" min={0} value={value.stock} onChange={(e) => set({ stock: Number(e.target.value) })} className={inputCls} />
                    </div>
                    <label className="flex items-end gap-2 pb-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={value.made_to_order} onChange={(e) => set({ made_to_order: e.target.checked })} className="accent-primary w-4 h-4" />
                        A pedido
                    </label>
                </>
            )}
            <div className="col-span-1 sm:col-span-2">
                <label className={labelCls}>Categoría</label>
                <SearchableSelect options={catOptions} value={value.category_id || 0} onChange={(v) => set({ category_id: Number(v) || 0 })} placeholder="Categoría" />
            </div>
            <div className="col-span-1 sm:col-span-2">
                <label className={labelCls}>Proveedor</label>
                <SearchableSelect options={provOptions} value={value.provider_id || 0} onChange={(v) => set({ provider_id: Number(v) || 0 })} placeholder="Proveedor" />
            </div>
            <div className="col-span-2 sm:col-span-4">
                <label className={labelCls}>Nota</label>
                <input value={value.note} maxLength={300} placeholder="Ej: Demora 10 días hábiles" onChange={(e) => set({ note: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-4">
                <label className={labelCls}>Descripción</label>
                <textarea value={value.description} onChange={(e) => set({ description: e.target.value })} className={`${inputCls} min-h-[60px]`} />
            </div>
        </div>
    );
}
