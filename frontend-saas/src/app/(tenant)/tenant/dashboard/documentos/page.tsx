"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Image as ImageIcon,
    Loader2,
    X,
    Download,
    Sparkles,
    Search,
    PawPrint,
    Calendar,
    FileImage,
    Type,
    Sticker,
} from 'lucide-react';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import {
    CertFrame, FRAME_COLOR_LIST, getFrameColor, frameActive,
    frameWrapperStyle, frameInnerInsetPct, frameImageMaskStyle,
    FRAME_BORDER_PCT, FEATHER_INNER_STOP,
} from '@/lib/certFrame';

// --- Tipos compartidos con el editor admin --------------------------------
interface DesignField {
    id: string;
    type: 'nombre_mascota' | 'fecha_nacimiento' | 'fecha_fallecimiento' | 'fecha_actual' | 'imagen_mascota' | 'logo_tenant' | 'rut_tenant' | 'encargado_tenant' | 'rut_encargado' | 'celular_tenant' | 'direccion_tenant';
    x: number;
    y: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    format?: 'short' | 'long' | 'year' | 'month_year';
    slot?: number;
    w?: number;
    shape?: 'circle' | 'rect';
    frame?: CertFrame;
}

interface DesignElement {
    id: string;
    url: string;
    x: number;
    y: number;
    w: number;
    z: number;
    rotation?: number;
    optional?: boolean;
    default_on?: boolean;
}

interface ImgTemplate {
    id: number;
    name: string;
    category: string;
    background_logo_url: string | null;
    sections_config: { aspect_ratio?: string; fields?: DesignField[]; elements?: DesignElement[] } | null;
}

// Nivel z de los campos (debe coincidir con el backend y el editor admin).
const FIELD_Z = 50;

// Etiqueta legible de cada campo para el panel de visibilidad.
const FIELD_LABELS: Record<DesignField['type'], string> = {
    nombre_mascota: 'Nombre mascota',
    fecha_nacimiento: 'Fecha nacimiento',
    fecha_fallecimiento: 'Fecha fallecimiento',
    fecha_actual: 'Fecha actual',
    imagen_mascota: 'Foto mascota',
    logo_tenant: 'Logo empresa',
    rut_tenant: 'RUT empresa',
    encargado_tenant: 'Encargado',
    rut_encargado: 'RUT Encargado',
    celular_tenant: 'Celular',
    direccion_tenant: 'Dirección',
};

const fieldLabel = (f: DesignField): string =>
    f.type === 'imagen_mascota' ? `Foto #${(f.slot ?? 0) + 1}` : FIELD_LABELS[f.type] || 'Campo';

interface CremationLite {
    id: number;
    pet_name?: string;
    customer_name?: string | null;
    pet?: {
        name?: string;
        birth_date?: string | null;
        death_date?: string | null;
        image_url?: string | null;
        images?: string[];
    } | null;
}

const ASPECT_PADDING: Record<string, number> = { '16:9': 56.25, '4:3': 75, '3:4': 133.333 };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fmtDate(value: string | null | undefined | Date, fmt?: string): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    if (fmt === 'long') return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    if (fmt === 'year') return `${d.getFullYear()}`;
    if (fmt === 'month_year') return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function EmitirDocumentosPage() {
    const { showToast } = useToast();

    const [templates, setTemplates] = useState<ImgTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);
    // Datos de la empresa para los campos dinámicos del certificado
    const [tenantInfo, setTenantInfo] = useState<{ rut?: string | null; manager?: string | null; managerRut?: string | null; phone?: string | null; address?: string | null }>({});

    // Emisión
    const [active, setActive] = useState<ImgTemplate | null>(null);
    const [cremations, setCremations] = useState<CremationLite[]>([]);
    const [cremLoading, setCremLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCremId, setSelectedCremId] = useState<number | null>(null);
    const [dateOverrides, setDateOverrides] = useState<Record<string, string>>({});
    const [photoOverrides, setPhotoOverrides] = useState<Record<string, string>>({});
    // Visibilidad elegida por el tenant para cada elemento decorativo: { elementId: bool }
    const [elementToggles, setElementToggles] = useState<Record<string, boolean>>({});
    // Visibilidad elegida por el tenant para cada campo: { fieldId: bool }
    const [fieldToggles, setFieldToggles] = useState<Record<string, boolean>>({});
    // Marco elegido por el tenant por cada foto: { fieldId: CertFrame }
    const [frameOverrides, setFrameOverrides] = useState<Record<string, CertFrame>>({});
    const [generating, setGenerating] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [resultHtml, setResultHtml] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    // Cargar las Google Fonts que puede usar el diseño (Cinzel, Playfair, etc.)
    // para que el preview y el PDF rendericen la tipografía correcta y no caigan
    // al fallback de sistema.
    useEffect(() => {
        const id = 'cert-img-google-fonts';
        if (typeof document !== 'undefined' && !document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;700&family=Great+Vibes&display=swap';
            document.head.appendChild(link);
        }
    }, []);

    // --- Carga de diseños certificadoImg (globales) -----------------------
    useEffect(() => {
        (async () => {
            try {
                const [data, me] = await Promise.all([
                    apiRequest('/api/internal/ops-records/templates/global'),
                    apiRequest('/api/internal/tenants/me').catch(() => null),
                ]);
                setTemplates((data || []).filter((t: any) => t.category === 'certificadoImg'));
                if (me?.logo_url) setTenantLogo(me.logo_url);
                if (me) setTenantInfo({ rut: me.rut, manager: me.legal_rep_name, managerRut: me.legal_rep_rut, phone: me.phone, address: me.address });
            } catch (err: any) {
                showToast('Error al cargar diseños: ' + (err.message || ''), 'error');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openEmit = async (tpl: ImgTemplate) => {
        setActive(tpl);
        setSelectedCremId(null);
        setDateOverrides({});
        setPhotoOverrides({});
        // Inicializar marcos con el del diseño (el tenant puede cambiarlos)
        const initFrames: Record<string, CertFrame> = {};
        (tpl.sections_config?.fields || []).forEach((f) => {
            if (f.type === 'imagen_mascota' && f.frame) initFrames[f.id] = { ...f.frame };
        });
        setFrameOverrides(initFrames);
        // Inicializar visibilidad de cada campo (todos visibles por defecto)
        const initFieldToggles: Record<string, boolean> = {};
        (tpl.sections_config?.fields || []).forEach((f) => { initFieldToggles[f.id] = true; });
        setFieldToggles(initFieldToggles);
        // Inicializar toggles de TODOS los elementos: los opcionales según su
        // visibilidad por defecto; los fijos visibles.
        const initToggles: Record<string, boolean> = {};
        (tpl.sections_config?.elements || []).forEach((el) => {
            initToggles[el.id] = el.optional ? (el.default_on ?? true) : true;
        });
        setElementToggles(initToggles);
        setResultHtml(null);
        setSearch('');
        if (cremations.length === 0) {
            setCremLoading(true);
            try {
                const data = await apiRequest('/api/internal/cremations?sort_order=desc');
                setCremations(data || []);
            } catch (err: any) {
                showToast('Error al cargar cremaciones: ' + (err.message || ''), 'error');
            } finally {
                setCremLoading(false);
            }
        }
    };

    const closeEmit = () => {
        setActive(null);
        setResultHtml(null);
    };

    const selectedCrem = useMemo(
        () => cremations.find((c) => c.id === selectedCremId) || null,
        [cremations, selectedCremId]
    );

    const petPhotos = useMemo(() => {
        const pet = selectedCrem?.pet;
        if (!pet) return [] as string[];
        const list: string[] = [];
        if (pet.image_url) list.push(pet.image_url);
        if (Array.isArray(pet.images)) list.push(...pet.images.filter(Boolean));
        return Array.from(new Set(list));
    }, [selectedCrem]);

    const fields = active?.sections_config?.fields || [];
    const elements = active?.sections_config?.elements || [];
    const aspect = active?.sections_config?.aspect_ratio || '16:9';
    const dateFields = fields.filter((f) => f.type.startsWith('fecha'));
    const imageFields = fields.filter((f) => f.type === 'imagen_mascota');

    // ¿Se muestra el elemento? Según el toggle del tenant; por defecto, los
    // opcionales según su visibilidad por defecto y los fijos siempre.
    const isElementVisible = (el: DesignElement): boolean => {
        return elementToggles[el.id] ?? (el.optional ? (el.default_on ?? true) : true);
    };

    // ¿Se muestra el campo? Según el toggle del tenant; por defecto, visible.
    const isFieldVisible = (f: DesignField): boolean => fieldToggles[f.id] ?? true;

    // Resultados solo al escribir; busca por nombre de mascota o dueño (o N° orden).
    const filteredCremations = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return [];
        return cremations.filter((c) =>
            (c.pet_name || c.pet?.name || '').toLowerCase().includes(q) ||
            (c.customer_name || '').toLowerCase().includes(q) ||
            String(c.id).includes(q)
        );
    }, [cremations, search]);

    // Valor efectivo de un campo para el preview client-side
    const fieldValue = (f: DesignField): string => {
        const pet = selectedCrem?.pet;
        if (f.type === 'nombre_mascota') return pet?.name || selectedCrem?.pet_name || '';
        const fmt = dateOverrides[f.id] || f.format;
        if (f.type === 'fecha_nacimiento') return fmtDate(pet?.birth_date, fmt);
        if (f.type === 'fecha_fallecimiento') return fmtDate(pet?.death_date, fmt);
        if (f.type === 'fecha_actual') return fmtDate(new Date(), fmt);
        if (f.type === 'rut_tenant') return tenantInfo.rut || '';
        if (f.type === 'encargado_tenant') return tenantInfo.manager || '';
        if (f.type === 'rut_encargado') return tenantInfo.managerRut || '';
        if (f.type === 'celular_tenant') return tenantInfo.phone || '';
        if (f.type === 'direccion_tenant') return tenantInfo.address || '';
        return '';
    };

    const photoForField = (f: DesignField): string | null => {
        if (f.type === 'logo_tenant') return tenantLogo;
        if (f.id in photoOverrides) return photoOverrides[f.id];
        const slot = f.slot ?? 0;
        return petPhotos[slot] || null;
    };

    // Marco efectivo de una foto: override del tenant > marco del diseño.
    const frameForField = (f: DesignField): CertFrame | undefined => {
        return frameOverrides[f.id] || f.frame;
    };

    const buildOverrides = () => {
        const overrides: Record<string, any> = {};
        dateFields.forEach((f) => {
            const fmt = dateOverrides[f.id] || f.format;
            if (fmt) overrides[f.id] = { format: fmt };
        });
        imageFields.forEach((f) => {
            const entry: any = {};
            const url = photoForField(f);
            if (url) entry.image_url = url;
            const fr = frameForField(f);
            if (fr) entry.frame = fr;
            if (Object.keys(entry).length) overrides[f.id] = { ...(overrides[f.id] || {}), ...entry };
        });
        // Visibilidad de cada campo
        fields.forEach((f) => {
            overrides[f.id] = { ...(overrides[f.id] || {}), enabled: isFieldVisible(f) };
        });
        // Visibilidad de cada elemento decorativo
        elements.forEach((el) => {
            overrides[el.id] = { ...(overrides[el.id] || {}), enabled: isElementVisible(el) };
        });
        return overrides;
    };

    const handleGenerate = async () => {
        if (!active || !selectedCremId) {
            showToast('Selecciona una mascota / orden', 'error');
            return;
        }
        setGenerating(true);
        try {
            const res = await apiRequest('/api/internal/ops-records/generate', {
                method: 'POST',
                body: {
                    cremation_id: selectedCremId,
                    template_id: active.id,
                    certificate_type: 'Certificado',
                    image_overrides: buildOverrides(),
                    persist: true,
                },
            });
            setResultHtml(res.html_content);
            showToast('Certificado generado correctamente', 'success');
        } catch (err: any) {
            showToast('Error al generar: ' + (err.message || ''), 'error');
        } finally {
            setGenerating(false);
        }
    };

    const imgFromSrc = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });

    // Carga una imagen para dibujarla en canvas sin "tainted". Las imágenes de R2
    // son cross-origin, así que las traemos vía fetch->blob y las dibujamos desde
    // un object URL (blob:, same-origin). Fallback a <img crossOrigin> si falla.
    const loadImg = async (src: string): Promise<HTMLImageElement> => {
        try {
            const resp = await fetch(src, { mode: 'cors', cache: 'no-cache' });
            if (resp.ok) {
                const blob = await resp.blob();
                const objUrl = URL.createObjectURL(blob);
                const img = await imgFromSrc(objUrl);
                setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
                return img;
            }
        } catch { /* cae al fallback */ }
        // Fallback: <img crossOrigin> (requiere CORS en el servidor de la imagen)
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    // Genera el PDF dibujando el certificado en un <canvas> (sin leer hojas de
    // estilo, evitando el error cssRules de html-to-image). Tamaño exacto del
    // diseño, sin encabezados/pies del navegador, listo para imprimir.
    const handleDownloadPdf = async () => {
        const node = previewRef.current;
        if (!node || !active) return;
        setDownloading(true);
        try {
            const jsPdfMod = await import('jspdf');
            const JsPDF = jsPdfMod.default;

            // Asegurar fuentes cargadas antes de dibujar texto en el canvas.
            if ((document as any).fonts?.ready) {
                try { await (document as any).fonts.ready; } catch { /* noop */ }
            }

            const q = 3; // factor de resolución para nitidez de impresión
            const W0 = node.offsetWidth;
            const H0 = node.offsetHeight;
            const W = Math.round(W0 * q);
            const H = Math.round(H0 * q);

            const canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No se pudo crear el lienzo');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, W, H);

            const drawCover = (img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
                const ir = img.width / img.height;
                const br = dw / dh;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
                else { sh = img.width / br; sy = (img.height - sh) / 2; }
                ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
            };
            const drawContain = (img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) => {
                const ir = img.width / img.height;
                const br = dw / dh;
                let rw = dw, rh = dh;
                if (ir > br) { rh = dw / ir; } else { rw = dh * ir; }
                ctx.drawImage(img, dx + (dw - rw) / 2, dy + (dh - rh) / 2, rw, rh);
            };
            // Foto circular con feather: render en canvas offscreen y máscara radial
            // (destination-in) opaca al centro y transparente al borde exterior.
            const makeFeatheredCircle = (img: HTMLImageElement, s: number): HTMLCanvasElement => {
                const px = Math.max(1, Math.round(s));
                const off = document.createElement('canvas');
                off.width = px; off.height = px;
                const octx = off.getContext('2d')!;
                // cover
                const ir = img.width / img.height;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (ir > 1) { sw = img.height; sx = (img.width - sw) / 2; }
                else { sh = img.width; sy = (img.height - sh) / 2; }
                octx.drawImage(img, sx, sy, sw, sh, 0, 0, px, px);
                // máscara radial
                octx.globalCompositeOperation = 'destination-in';
                const g = octx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
                g.addColorStop(FEATHER_INNER_STOP / 100, 'rgba(0,0,0,1)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                octx.fillStyle = g;
                octx.fillRect(0, 0, px, px);
                return off;
            };

            // Traza la forma de la foto (círculo o rect redondeado) en el path actual.
            const traceShape = (dx: number, dy: number, s: number, circle: boolean) => {
                ctx.beginPath();
                if (circle) {
                    ctx.arc(dx + s / 2, dy + s / 2, s / 2, 0, Math.PI * 2);
                } else {
                    const r = s * 0.06;
                    if ((ctx as any).roundRect) { (ctx as any).roundRect(dx, dy, s, s, r); }
                    else { ctx.rect(dx, dy, s, s); }
                }
                ctx.closePath();
            };

            // 1. Fondo (cover)
            if (active.background_logo_url) {
                try {
                    const bg = await loadImg(getImageUrl(active.background_logo_url));
                    drawCover(bg, 0, 0, W, H);
                } catch { /* sin fondo si falla */ }
            }

            // 2. Capas (elementos + campos) ordenadas por z. El fondo (ya dibujado)
            //    es la base; los elementos pueden ir detrás o delante del texto.
            const drawables: { z: number; draw: () => Promise<void> }[] = [];

            // Elementos decorativos visibles
            for (const el of elements) {
                if (!isElementVisible(el)) continue;
                drawables.push({
                    z: Math.max(1, el.z || 1),
                    draw: async () => {
                        try {
                            const im = await loadImg(getImageUrl(el.url));
                            const cx = (el.x / 100) * W;
                            const cy = (el.y / 100) * H;
                            const dw = (el.w / 100) * W;
                            const ir = im.width / im.height;
                            const dh = dw / (ir || 1);
                            const rot = ((el.rotation || 0) * Math.PI) / 180;
                            ctx.save();
                            ctx.translate(cx, cy);
                            if (rot) ctx.rotate(rot);
                            ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
                            ctx.restore();
                        } catch { /* salta elemento que falle */ }
                    },
                });
            }

            // Campos (nivel FIELD_Z)
            for (const f of fields) {
                if (!isFieldVisible(f)) continue;
                drawables.push({
                    z: FIELD_Z,
                    draw: async () => {
                        const cx = (f.x / 100) * W;
                        const cy = (f.y / 100) * H;
                        if (f.type === 'imagen_mascota' || f.type === 'logo_tenant') {
                            const url = photoForField(f);
                            if (!url) return;
                            const size = ((f.w || 18) / 100) * W;
                            const dx = cx - size / 2;
                            const dy = cy - size / 2;
                            const circle = f.shape === 'circle';
                            const fr = f.type === 'imagen_mascota' ? frameForField(f) : undefined;
                            const hasFrame = !!fr && frameActive(fr);
                            try {
                                const im = await loadImg(getImageUrl(url));
                                if (hasFrame && fr) {
                                    const fc = getFrameColor(fr.color);
                                    const inset = fr.border ? size * (FRAME_BORDER_PCT / 100) : 0;
                                    // Halo difuminado
                                    if (fr.glow) {
                                        ctx.save();
                                        ctx.shadowColor = fc.glow;
                                        ctx.shadowBlur = size * 0.18;
                                        ctx.fillStyle = fr.border ? fc.solid : 'rgba(0,0,0,0.35)';
                                        traceShape(dx, dy, size, circle);
                                        ctx.fill();
                                        ctx.restore();
                                    }
                                    // Borde (sólido o degradado)
                                    if (fr.border) {
                                        ctx.save();
                                        traceShape(dx, dy, size, circle);
                                        if (fr.gradient) {
                                            const g = ctx.createLinearGradient(dx, dy, dx + size, dy + size);
                                            g.addColorStop(0, fc.from); g.addColorStop(1, fc.to);
                                            ctx.fillStyle = g;
                                        } else {
                                            ctx.fillStyle = fc.solid;
                                        }
                                        ctx.fill();
                                        ctx.restore();
                                    }
                                    // Foto interior (recortada e insertada)
                                    const inS = size - 2 * inset;
                                    if (fr.feather && circle) {
                                        // Feather: borde exterior desvanecido a transparente
                                        const off = makeFeatheredCircle(im, inS);
                                        ctx.drawImage(off, dx + inset, dy + inset, inS, inS);
                                    } else {
                                        ctx.save();
                                        traceShape(dx + inset, dy + inset, inS, circle);
                                        ctx.clip();
                                        drawCover(im, dx + inset, dy + inset, inS, inS);
                                        ctx.restore();
                                    }
                                } else if (circle) {
                                    ctx.save();
                                    traceShape(dx, dy, size, true);
                                    ctx.clip();
                                    drawCover(im, dx, dy, size, size);
                                    ctx.restore();
                                } else if (f.type === 'logo_tenant') {
                                    drawContain(im, dx, dy, size, size);
                                } else {
                                    drawCover(im, dx, dy, size, size);
                                }
                            } catch { /* salta imagen que falle */ }
                            return;
                        }
                        const value = fieldValue(f);
                        if (!value) return;
                        const weight = f.bold ? '700' : '400';
                        ctx.font = `${weight} ${(f.fontSize || 32) * q}px ${f.fontFamily || 'Georgia, serif'}`;
                        ctx.fillStyle = f.color || '#1a1a1a';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(value, cx, cy);
                    },
                });
            }

            // Orden estable por z y dibujo secuencial (loadImg es async).
            drawables.sort((a, b) => a.z - b.z);
            for (const d of drawables) {
                await d.draw();
            }

            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new JsPDF({
                unit: 'px',
                format: [W0, H0],
                orientation: W0 >= H0 ? 'landscape' : 'portrait',
            });
            const pw = pdf.internal.pageSize.getWidth();
            const ph = pdf.internal.pageSize.getHeight();
            pdf.addImage(dataUrl, 'JPEG', 0, 0, pw, ph);

            const petName = (selectedCrem?.pet?.name || selectedCrem?.pet_name || 'mascota').replace(/[^\w-]/g, '_');
            pdf.save(`certificado_${petName}.pdf`);
        } catch (err: any) {
            showToast('Error al generar PDF: ' + (err.message || ''), 'error');
        } finally {
            setDownloading(false);
        }
    };

    // --- Render -----------------------------------------------------------
    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Emitir Certificado</h1>
                <p className="text-muted-foreground mt-1 text-sm">Elige un diseño, selecciona la mascota y ajusta los detalles antes de generar.</p>
            </div>

            {/* Grid de diseños */}
            <div className="bg-zinc-950/40 border border-white/5 rounded-[2.5rem] p-6 lg:p-8 min-h-[400px]">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="animate-spin text-primary mb-4" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">Cargando diseños...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center">
                        <FileImage size={48} className="text-muted-foreground/20 mb-4" />
                        <h3 className="text-white font-bold mb-1">Aún no hay certificados con imagen</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">Cuando el administrador publique diseños de tipo "Certificado con Imagen", aparecerán aquí para que puedas emitirlos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((tpl) => (
                            <div key={tpl.id} className="group rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden hover:border-primary/30 transition-all flex flex-col">
                                <div className="aspect-video bg-black/40 overflow-hidden">
                                    {tpl.background_logo_url ? (
                                        <img src={getImageUrl(tpl.background_logo_url)} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-white/10" /></div>
                                    )}
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <h4 className="font-bold text-lg text-white tracking-tight">{tpl.name}</h4>
                                    <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-wider w-fit mt-2">
                                        {tpl.sections_config?.aspect_ratio || '16:9'}
                                    </span>
                                    <button
                                        onClick={() => openEmit(tpl)}
                                        className="mt-5 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                                    >
                                        <Sparkles size={14} /> Emitir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de emisión */}
            {active && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeEmit} />
                    <div className="relative w-full max-w-6xl bg-[#0b1220] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col h-[92dvh] overflow-hidden">
                        {/* Header modal */}
                        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0"><Sparkles size={18} /></div>
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-white truncate">{active.name}</h3>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">Emisión de certificado</p>
                                </div>
                            </div>
                            <button onClick={closeEmit} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"><X size={18} /></button>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                            {/* Form */}
                            <div className="lg:w-[380px] shrink-0 border-r border-white/5 overflow-y-auto p-6 space-y-6">
                                {/* Selección de mascota */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><PawPrint size={12} /> Mascota / Orden</label>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Buscar por mascota o dueño..."
                                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-white outline-none focus:border-primary/50"
                                        />
                                    </div>
                                    {!search.trim() ? (
                                        <p className="text-white/20 text-xs italic py-4 text-center">Escribe el nombre de la mascota o del dueño para buscar.</p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                            {cremLoading ? (
                                                <div className="flex items-center justify-center py-6 text-white/30"><Loader2 className="animate-spin" size={20} /></div>
                                            ) : filteredCremations.length === 0 ? (
                                                <p className="text-white/20 text-xs italic py-4 text-center">Sin resultados</p>
                                            ) : (
                                                filteredCremations.map((c) => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { setSelectedCremId(c.id); setPhotoOverrides({}); }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${selectedCremId === c.id ? 'bg-primary/15 border-primary/40' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}`}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-black/40 overflow-hidden shrink-0">
                                                        {(c.pet?.image_url) ? <img src={getImageUrl(c.pet.image_url)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PawPrint size={14} className="text-white/20" /></div>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{c.pet_name || c.pet?.name || 'Mascota'}</p>
                                                        <p className="text-[10px] text-white/30 truncate">{c.customer_name ? `${c.customer_name} · ` : ''}Orden #{c.id}</p>
                                                    </div>
                                                </button>
                                            ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Visibilidad de campos */}
                                {selectedCrem && fields.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Type size={12} /> Campos del certificado</label>
                                        {fields.map((f) => {
                                            const on = isFieldVisible(f);
                                            return (
                                                <div
                                                    key={f.id}
                                                    onClick={() => setFieldToggles((prev) => ({ ...prev, [f.id]: !on }))}
                                                    className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 cursor-pointer transition-all"
                                                >
                                                    <span className="flex-1 text-xs font-bold text-white/70">{fieldLabel(f)}</span>
                                                    <div className={`w-10 h-5 rounded-full relative transition-all ${on ? 'bg-primary' : 'bg-white/10'}`}>
                                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Overrides de fecha */}
                                {selectedCrem && dateFields.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Calendar size={12} /> Formato de fechas</label>
                                        {dateFields.map((f) => (
                                            <div key={f.id} className="space-y-1.5">
                                                <span className="text-[10px] text-white/40 font-bold uppercase">
                                                    {f.type === 'fecha_nacimiento' ? 'Nacimiento' : f.type === 'fecha_fallecimiento' ? 'Fallecimiento' : 'Fecha actual'}
                                                </span>
                                                <select
                                                    value={dateOverrides[f.id] || f.format || 'short'}
                                                    onChange={(e) => setDateOverrides((prev) => ({ ...prev, [f.id]: e.target.value }))}
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-primary/50"
                                                >
                                                    <option value="short">12/06/2026</option>
                                                    <option value="long">12 de junio de 2026</option>
                                                    <option value="month_year">junio de 2026</option>
                                                    <option value="year">2026</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Overrides de fotos */}
                                {selectedCrem && imageFields.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><ImageIcon size={12} /> Fotos</label>
                                        {petPhotos.length === 0 ? (
                                            <p className="text-[11px] text-amber-400/80 italic">Esta mascota no tiene fotos cargadas; los espacios de imagen quedarán vacíos.</p>
                                        ) : (
                                            imageFields.map((f) => {
                                                const fr: CertFrame = frameForField(f) || { color: 'gold' };
                                                const setFrame = (patch: Partial<CertFrame>) => setFrameOverrides((prev) => ({ ...prev, [f.id]: { ...fr, ...patch } }));
                                                return (
                                                    <div key={f.id} className="space-y-2 pb-3 border-b border-white/5 last:border-0">
                                                        <span className="text-[10px] text-white/40 font-bold uppercase">Foto #{(f.slot ?? 0) + 1}</span>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {petPhotos.map((url) => {
                                                                const isSel = photoForField(f) === url;
                                                                return (
                                                                    <button
                                                                        key={url}
                                                                        onClick={() => setPhotoOverrides((prev) => ({ ...prev, [f.id]: url }))}
                                                                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${isSel ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                                    >
                                                                        <img src={getImageUrl(url)} className="w-full h-full object-cover" />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Marco de la foto */}
                                                        <div className="flex items-center gap-2 flex-wrap pt-1">
                                                            <span className="text-[9px] text-white/30 font-bold uppercase mr-1">Marco:</span>
                                                            {FRAME_COLOR_LIST.map((c) => (
                                                                <button
                                                                    key={c.key}
                                                                    onClick={() => setFrame({ color: c.key })}
                                                                    title={c.label}
                                                                    className={`w-6 h-6 rounded-full border-2 transition-all ${fr.color === c.key ? 'border-white scale-110' : 'border-white/10'}`}
                                                                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <button onClick={() => setFrame({ border: !fr.border })} className={`py-1.5 text-[10px] font-black rounded-lg border transition-all ${fr.border ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Borde</button>
                                                            <button onClick={() => setFrame({ glow: !fr.glow })} className={`py-1.5 text-[10px] font-black rounded-lg border transition-all ${fr.glow ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Halo</button>
                                                            <button onClick={() => setFrame(fr.gradient ? { gradient: false } : { gradient: true, border: true })} className={`py-1.5 text-[10px] font-black rounded-lg border transition-all ${fr.gradient ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Degrad.</button>
                                                        </div>
                                                        {f.shape === 'circle' && (
                                                            <button onClick={() => setFrame({ feather: !fr.feather })} className={`w-full py-1.5 text-[10px] font-black rounded-lg border transition-all ${fr.feather ? 'bg-primary/20 text-primary border-primary/30' : 'bg-black/40 text-white/30 border-white/5'}`}>Difuminar borde (feather)</button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Elementos decorativos */}
                                {selectedCrem && elements.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><Sticker size={12} /> Elementos decorativos</label>
                                        {elements.map((el, idx) => {
                                            const on = isElementVisible(el);
                                            return (
                                                <div
                                                    key={el.id}
                                                    onClick={() => setElementToggles((prev) => ({ ...prev, [el.id]: !on }))}
                                                    className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 cursor-pointer transition-all"
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-black/40 overflow-hidden shrink-0 flex items-center justify-center">
                                                        <img src={getImageUrl(el.url)} className="max-w-full max-h-full object-contain" />
                                                    </div>
                                                    <span className="flex-1 text-xs font-bold text-white/70">Elemento #{idx + 1}</span>
                                                    <div className={`w-10 h-5 rounded-full relative transition-all ${on ? 'bg-primary' : 'bg-white/10'}`}>
                                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Acciones */}
                                <div className="pt-2 space-y-3">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!selectedCremId || generating}
                                        className="w-full bg-primary text-primary-foreground font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                                    >
                                        {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                        Generar Certificado
                                    </button>
                                    {resultHtml && (
                                        <button onClick={handleDownloadPdf} disabled={downloading} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-white/5 transition-all disabled:opacity-50">
                                            {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                            Descargar PDF
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="flex-1 bg-black/40 p-6 overflow-auto flex items-start justify-center">
                                {!selectedCrem ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30">
                                        <PawPrint size={40} className="mb-4 opacity-30" />
                                        <p className="text-sm">Selecciona una mascota para ver la vista previa.</p>
                                    </div>
                                ) : (
                                    <div className="w-full max-w-3xl">
                                        <div
                                            ref={previewRef}
                                            className="relative w-full shadow-2xl rounded-lg overflow-hidden bg-white"
                                            style={{
                                                paddingBottom: `${ASPECT_PADDING[aspect]}%`,
                                                backgroundImage: active.background_logo_url ? `url('${getImageUrl(active.background_logo_url)}')` : undefined,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        >
                                            {/* Elementos decorativos visibles (z propio) */}
                                            {elements.map((el) => isElementVisible(el) ? (
                                                <img
                                                    key={el.id}
                                                    src={getImageUrl(el.url)}
                                                    alt=""
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${el.x}%`,
                                                        top: `${el.y}%`,
                                                        width: `${el.w}%`,
                                                        transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                                                        zIndex: Math.max(1, el.z || 1),
                                                        objectFit: 'contain',
                                                    }}
                                                />
                                            ) : null)}
                                            {fields.map((f) => {
                                                if (!isFieldVisible(f)) return null;
                                                const common: React.CSSProperties = {
                                                    position: 'absolute',
                                                    left: `${f.x}%`,
                                                    top: `${f.y}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    zIndex: FIELD_Z,
                                                };
                                                if (f.type === 'imagen_mascota' || f.type === 'logo_tenant') {
                                                    const url = photoForField(f);
                                                    const radius = f.shape === 'circle' ? '50%' : '8px';
                                                    const isCircle = f.shape === 'circle';
                                                    const fr = f.type === 'imagen_mascota' ? frameForField(f) : undefined;
                                                    const hasFrame = !!fr && frameActive(fr);
                                                    const wrapStyle = hasFrame ? frameWrapperStyle(fr as CertFrame, radius) : {};
                                                    const insetPct = hasFrame ? frameInnerInsetPct(fr as CertFrame) : 0;
                                                    const maskStyle = hasFrame ? frameImageMaskStyle(fr, isCircle) : {};
                                                    return (
                                                        <div
                                                            key={f.id}
                                                            style={{
                                                                ...common,
                                                                width: `${f.w || 18}%`,
                                                                aspectRatio: '1 / 1',
                                                                borderRadius: radius,
                                                                background: hasFrame ? undefined : (url ? undefined : 'rgba(0,0,0,0.15)'),
                                                                ...wrapStyle,
                                                            }}
                                                        >
                                                            <div style={{ position: 'absolute', inset: `${insetPct}%`, borderRadius: radius, overflow: 'hidden', background: url ? undefined : 'rgba(0,0,0,0.15)', ...maskStyle }}>
                                                                {url && <img src={getImageUrl(url)} className={`w-full h-full ${f.type === 'logo_tenant' ? 'object-contain' : 'object-cover'}`} />}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div
                                                        key={f.id}
                                                        style={{
                                                            ...common,
                                                            fontSize: `${f.fontSize}px`,
                                                            fontFamily: f.fontFamily,
                                                            color: f.color,
                                                            textAlign: f.align,
                                                            fontWeight: f.bold ? 700 : 400,
                                                            whiteSpace: 'nowrap',
                                                            lineHeight: 1.1,
                                                        }}
                                                    >
                                                        {fieldValue(f)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center italic mt-3">Vista previa · así se generará el certificado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
