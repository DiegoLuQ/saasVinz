"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Download, Loader2, Sparkles, Upload, Search, PawPrint, ImageIcon, RotateCcw, ChevronDown, Wand2, X, Save,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import type Konva from 'konva';

import TemplateCanvas, { type Bindings } from '@/components/admin/imageTemplates/TemplateCanvas';
import TemplatePreviewThumb, { templateRatio } from '@/components/admin/imageTemplates/TemplatePreviewThumb';
import { ASPECT_RATIOS, EXPORT_WIDTH, PHOTO_SLOTS, TEMPLATE_FONTS_URL, nearestAiRatio } from '@/lib/admin/imageTemplates/constants';
import type { AspectRatio, ImageTemplate, PhotoFill, PhotoFills, PhotoLayer, PhotoSlot, TextLayer } from '@/lib/admin/imageTemplates/types';
import { apiRequest, getImageUrl } from '@/lib/tenant/api';
import {
    generateAiBoth, generateAiImage, generateAiText, getAiSession, getAiUsage, getRenderData, listTenantImageTemplates,
    discardGeneration, openAiSession, recoverGeneration, registerTemplateUse, resolvePrompts, saveDesign, saveTemplateImage,
    type AiGenerationResult, type AiSession,
} from '@/lib/tenant/imageTemplates';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useCanOpen } from '@/hooks/useCanOpen';
import MyDesigns from '@/components/tenant/redes/MyDesigns';
import LayerAdjustPanel from '@/components/tenant/redes/LayerAdjustPanel';
import { applyOverrides, geometryPatch, type LayerOverrides } from '@/lib/admin/imageTemplates/overrides';

const STAGE_MAX = 540;
const TEMPLATES_PAGE_SIZE = 8;

interface Pet {
    id: number;
    name: string;
    species?: string;
    breed?: string;
    size?: string;
    birth_date?: string | null;
    death_date?: string | null;
    age?: number | null;
    image_url?: string | null;
    images?: string[];
}

/** Foto real de la mascota en un hueco. La Foto 1 es además la que recibe la IA para ilustrar. */
interface SlotState {
    url: string | null;
    zoom: number;
    offset_x: number;
    offset_y: number;
    file: File | null;
    /** Ruta guardada en la plataforma (para que el backend la lea sin re-subirla). */
    stored: string | null;
}

const emptySlot = (): SlotState => ({ url: null, zoom: 1, offset_x: 0, offset_y: 0, file: null, stored: null });

const inputCls = 'w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-primary/60';
const labelCls = 'block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1.5';
const cardCls = 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.06] rounded-2xl p-4 space-y-3';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fmtDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

function Slider({ label, value, min, max, step = 1, onChange }: {
    label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
    return (
        <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                <span>{label}</span><span>{Math.round(value * 100) / 100}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
        </div>
    );
}

export default function RedesDesignsPage() {
    const { canOpen } = useCanOpen();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { data: bootstrap } = useSessionBootstrap();
    const userRole = bootstrap?.user?.role;
    // Galería: plantillas disponibles o diseños ya generados por el crematorio.
    const [galleryTab, setGalleryTab] = useState<'plantillas' | 'disenos'>('plantillas');
    // Se cargan de a TEMPLATES_PAGE_SIZE (las más recientes primero), no todas de una vez.
    const [templatesPage, setTemplatesPage] = useState(1);
    const { data: templatesData, isLoading } = useQuery({
        queryKey: ['tenant', 'image-templates', 'list', templatesPage],
        queryFn: () => listTenantImageTemplates(templatesPage, TEMPLATES_PAGE_SIZE),
        placeholderData: keepPreviousData,
    });
    const templates = templatesData?.items;
    const templatesPages = templatesData ? Math.max(1, Math.ceil(templatesData.total / TEMPLATES_PAGE_SIZE)) : 1;
    const { data: usage, refetch: refetchUsage } = useQuery({
        queryKey: ['tenant', 'image-templates', 'ai-usage'], queryFn: getAiUsage,
    });
    // Texto e ilustración se habilitan por separado: cada uno depende de su
    // plataforma en Configuración Global → Plataformas IA. El consumo se paga con créditos.
    const textReady = !!usage?.configured;
    const imageReady = !!usage?.image_configured;
    const aiReady = textReady || imageReady;
    const credits = usage?.credits;
    const aiUnavailableReason = (kind: 'text' | 'image') =>
        `La IA para ${kind === 'image' ? 'ilustraciones' : 'textos'} no está disponible por ahora. Contacta al administrador de Vinzer.`;

    const [selected, setSelected] = useState<ImageTemplate | null>(null);
    const [ratio, setRatio] = useState<AspectRatio>('4:5');

    // Mascota
    const [pets, setPets] = useState<Pet[]>([]);
    const [pet, setPet] = useState<Pet | null>(null);
    const [petQuery, setPetQuery] = useState('');
    const [petListOpen, setPetListOpen] = useState(false);

    // Contenido. renderData = valores de los elementos de datos (mascota, dueño,
    // crematorio, redes) formateados por el backend.
    const [renderData, setRenderData] = useState<Record<string, string>>({});
    const [petName, setPetName] = useState('');
    const [phrase, setPhrase] = useState('');
    const [aiText, setAiText] = useState('');
    const [details, setDetails] = useState('');
    const [slots, setSlots] = useState<Record<PhotoSlot, SlotState>>({ photo_1: emptySlot(), photo_2: emptySlot(), photo_3: emptySlot() });

    // IA
    const [textPrompt, setTextPrompt] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [maxChars, setMaxChars] = useState(500);
    const [showTextPrompt, setShowTextPrompt] = useState(false);
    const [showImagePrompt, setShowImagePrompt] = useState(false);
    const [genText, setGenText] = useState(false);
    const [genImage, setGenImage] = useState(false);
    // Ilustración IA (capas "Imagen IA"): generada desde la Foto 1. No se guarda en la nube.
    const [aiImage, setAiImage] = useState<PhotoFill | null>(null);
    // URL guardada de esa ilustración (para la receta del diseño; aiImage puede ser data URL).
    const [aiStoredUrl, setAiStoredUrl] = useState<string | null>(null);
    // Ilustración recién generada esperando confirmación (modal): al guardar va a
    // la carpeta `ia` del crematorio (WebP optimizado) y se usa en el diseño.
    const [pendingAi, setPendingAi] = useState<{ url: string; generation_id: number | null; recovered?: boolean } | null>(null);
    // Generaciones ya mostradas en esta página (para no ofrecer dos veces la misma al recuperar).
    const shownGenerations = useRef<Set<number>>(new Set());
    // Cronómetro mientras se genera: segundos transcurridos vs. lo que suele tardar.
    const [genStartedAt, setGenStartedAt] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [savingAi, setSavingAi] = useState(false);
    // Crédito del diseño actual (plantilla + mascota) y modal para confirmar el uso de uno nuevo.
    const [session, setSession] = useState<AiSession | null>(null);
    const [creditPrompt, setCreditPrompt] = useState<{ resolve: (s: AiSession | null) => void } | null>(null);
    const [openingSession, setOpeningSession] = useState(false);
    // El texto falló en un «texto + ilustración»: se ofrece reintentarlo sin gastar intento.
    const [freeTextRetry, setFreeTextRetry] = useState(false);

    const [exporting, setExporting] = useState(false);
    const stageRef = useRef<Konva.Stage>(null);

    // «Ajustar elementos»: capas ocultas / movidas / achicadas solo en este diseño.
    const [overrides, setOverrides] = useState<LayerOverrides>({});
    const [adjusting, setAdjusting] = useState(false);
    const [adjustSel, setAdjustSel] = useState<string | null>(null);
    const canvasDefinition = useMemo(
        () => (selected ? applyOverrides(selected.definition, overrides) : null),
        [selected, overrides],
    );

    useEffect(() => {
        const id = 'image-templates-google-fonts-v2';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = TEMPLATE_FONTS_URL;
        document.head.appendChild(link);
    }, []);

    useEffect(() => {
        apiRequest('/api/internal/pets/')
            .then((data) => setPets(Array.isArray(data) ? [...data].sort((a, b) => b.id - a.id) : []))
            .catch(() => setPets([]));
    }, []);

    useEffect(() => {
        if (!selected) return;
        let cancelled = false;
        getRenderData(pet?.id ?? null)
            .then((d) => { if (!cancelled) setRenderData(d || {}); })
            .catch(() => { if (!cancelled) setRenderData({}); });
        return () => { cancelled = true; };
    }, [selected, pet]);

    // Retoma un crédito aún vigente de esta plantilla + mascota (ej. tras recargar la página).
    useEffect(() => {
        if (!selected) return;
        let cancelled = false;
        setSession(null);
        getAiSession(selected.id, pet?.id ?? null)
            .then((s) => {
                if (cancelled) return;
                setSession(s);
                if (s) recover(true);
            })
            .catch(() => { });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, pet]);

    useEffect(() => {
        if (genStartedAt == null) return;
        const t = setInterval(() => setElapsed(Math.round((Date.now() - genStartedAt) / 1000)), 1000);
        return () => clearInterval(t);
    }, [genStartedAt]);

    const layers = selected?.definition?.layers || [];
    const photoLayers = layers.filter((l): l is PhotoLayer => l.type === 'photo');
    const aiLayer = photoLayers.find(l => l.source === 'ai');
    const hasAiImageLayer = !!aiLayer;
    // Foto de la mascota desde la que se genera la ilustración (la elige el admin en la plantilla).
    const aiFrom: PhotoSlot = aiLayer?.ai_from || 'photo_1';
    const aiFromLabel = PHOTO_SLOTS.find(s => s.value === aiFrom)?.label || 'Foto 1';
    // Huecos de foto real; con capa IA siempre se pide además su foto de origen.
    const usedSlots = Array.from(new Set([
        ...photoLayers.filter(l => l.source !== 'ai').map(l => l.slot || 'photo_1'),
        ...(hasAiImageLayer ? [aiFrom] : []),
    ])).sort() as PhotoSlot[];
    const textBindings = new Set(layers.filter((l): l is TextLayer => l.type === 'text').map(l => l.binding));
    const usesAiText = textBindings.has('ai_text');
    const usesPhrase = textBindings.has('phrase');

    // Prompts resueltos con los datos de la mascota (el tenant puede retocarlos).
    useEffect(() => {
        if (!selected || !aiReady) return;
        const t = setTimeout(() => {
            resolvePrompts(selected.id, pet?.id ?? null, details)
                .then((r) => { setTextPrompt(r.text_prompt); setImagePrompt(r.image_prompt); setMaxChars(r.max_chars); })
                .catch(() => { });
        }, 400);
        return () => clearTimeout(t);
    }, [selected, pet, details, aiReady]);

    const openTemplate = (t: ImageTemplate) => {
        setSession(null);
        setSelected(t);
        setRatio(t.supported_ratios?.[0] || '1:1');
        setPhrase(t.default_phrase || '');
        setAiText('');
        setAiImage(null); setAiStoredUrl(null);
        setFreeTextRetry(false);
        setOverrides({}); setAdjusting(false); setAdjustSel(null);
    };

    const choosePet = (p: Pet | null) => {
        setPet(p);
        setPetListOpen(false);
        setPetQuery('');
        setPetName(p?.name || '');
        const stored = p?.image_url || p?.images?.[0] || null;
        const url = stored ? getImageUrl(stored) : null;
        // Fotos 2 y 3: las siguientes de la galería de la mascota, si existen.
        const rest = (p?.images || []).filter(img => img !== stored);
        const fill = (img: string | undefined): SlotState => ({ ...emptySlot(), url: img ? getImageUrl(img) : null, stored: img || null });
        setSlots({
            photo_1: { ...emptySlot(), url, stored },
            photo_2: fill(rest[0]),
            photo_3: fill(rest[1]),
        });
        setAiImage(null); setAiStoredUrl(null);
    };

    const updateSlot = (slot: PhotoSlot, patch: Partial<SlotState>) =>
        setSlots(prev => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));

    const uploadPhoto = (slot: PhotoSlot, file: File) => {
        if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen', 'error'); return; }
        const local = URL.createObjectURL(file);
        updateSlot(slot, { url: local, file, stored: null, zoom: 1, offset_x: 0, offset_y: 0 });
        // La ilustración sale de esta foto: si cambia, la anterior ya no corresponde.
        if (slot === aiFrom) { setAiImage(null); setAiStoredUrl(null); }
    };

    const stageSize = useMemo(() => {
        const r = ASPECT_RATIOS.find(a => a.value === ratio) || ASPECT_RATIOS[0];
        return r.w >= r.h
            ? { width: STAGE_MAX, height: Math.round((STAGE_MAX * r.h) / r.w) }
            : { width: Math.round((STAGE_MAX * r.w) / r.h), height: STAGE_MAX };
    }, [ratio]);

    const sessionUsable = !!session && session.active && session.attempts_left > 0;
    // El diseño actual gastó todos los intentos de su crédito: seguir cuesta 1 crédito más.
    const attemptsSpent = !!session && session.attempts_left === 0;

    /** "Generando… 23 s (suele tardar ~40 s)" */
    const waitLabel = (kind: 'text' | 'image') => {
        const avg = usage?.avg_seconds?.[kind];
        return `Generando… ${elapsed} s${avg ? ` (suele tardar ~${avg} s)` : ''}`;
    };

    /** Crédito para generar: el del diseño actual o, previa confirmación, uno nuevo. */
    const ensureSession = async (): Promise<AiSession | null> => {
        if (sessionUsable) return session;
        return new Promise<AiSession | null>((resolve) => setCreditPrompt({ resolve }));
    };

    const confirmUseCredit = async () => {
        if (!selected || !creditPrompt) return;
        setOpeningSession(true);
        try {
            const s = await openAiSession(selected.id, pet?.id ?? null);
            setSession(s);
            refetchUsage();
            creditPrompt.resolve(s);
            setCreditPrompt(null);
        } catch (e) {
            showToast((e as Error).message || 'No se pudo usar el crédito', 'error');
            creditPrompt.resolve(null);
            setCreditPrompt(null);
            refetchUsage();
        } finally {
            setOpeningSession(false);
        }
    };

    const cancelUseCredit = () => {
        creditPrompt?.resolve(null);
        setCreditPrompt(null);
    };

    /**
     * Trae lo último generado en el diseño vigente que no llegó (corte de conexión)
     * o que quedó sin guardar ni descartar. No gasta intentos.
     */
    const recover = async (onOpen = false): Promise<boolean> => {
        if (!selected) return false;
        try {
            const r = await recoverGeneration(selected.id, pet?.id ?? null);
            let found = false;
            if (r.session) setSession(r.session);
            if (r.text && !shownGenerations.current.has(r.text.generation_id)) {
                shownGenerations.current.add(r.text.generation_id);
                if (!onOpen) {
                    setAiText(r.text.text);
                    found = true;
                }
            }
            if (r.image && !shownGenerations.current.has(r.image.generation_id)) {
                shownGenerations.current.add(r.image.generation_id);
                setPendingAi({ url: r.image.url, generation_id: r.image.generation_id, recovered: true });
                found = true;
            }
            return found;
        } catch {
            return false;
        }
    };

    const startTimer = () => { setElapsed(0); setGenStartedAt(Date.now()); };
    const stopTimer = () => setGenStartedAt(null);

    const handleAiError = async (e: unknown, fallback: string) => {
        const err = e as { message?: string; status?: number; data?: { detail?: { code?: string } } };
        if (err?.data?.detail?.code === 'credit_required') setSession(null);
        refetchUsage();
        // Si la respuesta se cortó pero la IA alcanzó a generar, se recupera sin gastar otro intento.
        if (err?.status !== 409 && await recover()) {
            showToast('La respuesta tardó en llegar, pero recuperamos lo que se generó.', 'success');
            return;
        }
        showToast(err?.message || fallback, 'error');
    };

    const applyResult = (r: AiGenerationResult) => {
        setSession(r.session);
        if (r.text) {
            setAiText(r.text.text);
            setFreeTextRetry(false);
        }
        if (r.image) {
            if (r.image.generation_id != null) shownGenerations.current.add(r.image.generation_id);
            setPendingAi({ url: r.image.url, generation_id: r.image.generation_id });
        }
        if (r.text_error && r.image) {
            // «Texto + ilustración»: la ilustración salió y el intento ya se contó;
            // el texto se puede reintentar sin costo.
            setFreeTextRetry(true);
            showToast(`Texto: ${r.text_error}`, 'error', { label: 'Reintentar texto sin costo', onClick: () => handleGenerateText(true) });
        } else if (r.text_error) {
            showToast(`Texto: ${r.text_error}`, 'error');
        }
        if (r.image_error) showToast(`Ilustración: ${r.image_error}`, 'error');
        refetchUsage();
    };

    const imageSource = () => {
        const source = slots[aiFrom];
        if (!source.file && !source.stored) {
            showToast(`Primero sube la ${aiFromLabel} de la mascota`, 'error');
            return null;
        }
        return {
            aspect_ratio: aiLayer
                ? nearestAiRatio((aiLayer.width / 100) * stageSize.width, (aiLayer.height / 100) * stageSize.height)
                : undefined,
            file: source.file,
            photo_url: source.file ? null : source.stored,
        };
    };

    /** `free`: reintento sin costo del texto que falló junto a una ilustración que sí salió. */
    const handleGenerateText = async (free = false) => {
        if (!selected) return;
        const s = free && session ? session : await ensureSession();
        if (!s) return;
        setGenText(true);
        startTimer();
        try {
            applyResult(await generateAiText(selected.id, {
                session_id: s.id, pet_id: pet?.id ?? null, details, prompt: textPrompt || undefined,
                free_retry: free || undefined,
            }));
        } catch (e) {
            await handleAiError(e, 'No se pudo generar el texto');
        } finally {
            setGenText(false);
            stopTimer();
        }
    };

    const handleGenerateImage = async () => {
        if (!selected || !aiLayer) return;
        const src = imageSource();
        if (!src) return;
        const s = await ensureSession();
        if (!s) return;
        setGenImage(true);
        startTimer();
        try {
            applyResult(await generateAiImage(selected.id, {
                session_id: s.id, pet_id: pet?.id ?? null, details, prompt: imagePrompt || undefined, ...src,
            }));
        } catch (e) {
            await handleAiError(e, 'No se pudo generar la ilustración');
        } finally {
            setGenImage(false);
            stopTimer();
        }
    };

    // Texto e ilustración en UNA llamada: cuenta 1 intento. Si una parte falla,
    // la otra igual llega (y si fallan las dos, el intento se devuelve).
    const canGenerateBoth = usesAiText && hasAiImageLayer && textReady && imageReady;
    const handleGenerateBoth = async () => {
        if (!selected) return;
        const src = imageSource();
        if (!src) return;
        const s = await ensureSession();
        if (!s) return;
        setGenText(true);
        setGenImage(true);
        startTimer();
        try {
            applyResult(await generateAiBoth(selected.id, {
                session_id: s.id, pet_id: pet?.id ?? null, details,
                text_prompt: textPrompt || undefined, image_prompt: imagePrompt || undefined, ...src,
            }));
        } catch (e) {
            await handleAiError(e, 'No se pudo generar con IA');
        } finally {
            setGenText(false);
            setGenImage(false);
            stopTimer();
        }
    };

    const bindings: Bindings = useMemo(() => ({
        ...renderData,
        tenant_logo: renderData.tenant_logo ? getImageUrl(renderData.tenant_logo) : '',
        // Lo que el tenant edita en el panel tiene prioridad sobre los datos guardados.
        pet_name: petName || 'Nombre de la mascota',
        date: fmtDate(new Date().toISOString()),
        phrase,
        ai_text: aiText || (usesAiText ? 'Genera el texto con IA o escríbelo en el panel.' : ''),
    }), [renderData, petName, phrase, aiText, usesAiText]);

    // Sin ilustración generada, la capa IA muestra su foto de origen para que nunca se exporte vacía.
    const photos: PhotoFills = useMemo(() => ({
        photo_1: slots.photo_1,
        photo_2: slots.photo_2,
        photo_3: slots.photo_3,
        ai: aiImage ?? slots[aiFrom],
    }), [slots, aiImage, aiFrom]);

    const confirmAiImage = async () => {
        if (!selected || !pendingAi) return;
        setSavingAi(true);
        try {
            const blob = await (await fetch(pendingAi.url)).blob();
            const saved = await saveTemplateImage(selected.id, {
                kind: 'illustration', image: blob, pet_id: pet?.id ?? null, generation_id: pendingAi.generation_id,
            });
            setAiStoredUrl(saved.url);
            // En el lienzo se usa la misma imagen ya cargada (data URL): idéntica a la guardada.
            setAiImage({ url: pendingAi.url, zoom: 1, offset_x: 0, offset_y: 0 });
            setPendingAi(null);
            showToast('Ilustración guardada en tu biblioteca (carpeta IA)', 'success');
        } catch (e) {
            showToast((e as Error).message || 'No se pudo guardar la ilustración', 'error');
        } finally {
            setSavingAi(false);
        }
    };

    const discardAiImage = () => {
        if (selected && pendingAi?.generation_id != null) {
            discardGeneration(selected.id, pendingAi.generation_id).catch(() => { });
        }
        setPendingAi(null);
        showToast('Ilustración descartada', 'info');
    };

    const handleExport = async () => {
        if (!stageRef.current || !selected) return;
        setExporting(true);
        if (adjusting) {
            // Sin marcos ni guías de edición en la imagen descargada.
            setAdjusting(false);
            setAdjustSel(null);
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        }
        const stage = stageRef.current;
        if (!stage) { setExporting(false); return; }
        try {
            // 1080 px de ancho: tamaño nativo de Instagram (feed y stories).
            const dataUrl = stage.toDataURL({ pixelRatio: EXPORT_WIDTH / stageSize.width, mimeType: 'image/png' });
            registerTemplateUse(selected.id).catch(() => { });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${(petName || 'mascota').replace(/\s+/g, '-').toLowerCase()}-${ratio.replace(':', 'x')}.png`;
            link.click();
            // El diseño final no se sube a la nube: se guarda su receta en «Mis diseños»
            // (textos, fotos ya guardadas e ilustración IA) y se vuelve a dibujar al verlo o descargarlo.
            try {
                const fill = (f: PhotoFill, stored: string | null) => ({ url: stored, zoom: f.zoom, offset_x: f.offset_x, offset_y: f.offset_y });
                await saveDesign(selected.id, {
                    pet_id: pet?.id ?? null,
                    recipe: {
                        ratio, ai_text: aiText, phrase, pet_name: petName, date: bindings.date || '', overrides,
                        photos: {
                            photo_1: fill(slots.photo_1, slots.photo_1.stored),
                            photo_2: fill(slots.photo_2, slots.photo_2.stored),
                            photo_3: fill(slots.photo_3, slots.photo_3.stored),
                            ai: aiImage ? fill(aiImage, aiStoredUrl) : fill(slots[aiFrom], slots[aiFrom].stored),
                        },
                    },
                });
                queryClient.invalidateQueries({ queryKey: ['tenant', 'template-exports'] });
                showToast('Imagen descargada y registrada en «Mis diseños generados»', 'success');
            } catch (e) {
                showToast(`Imagen descargada, pero no se pudo registrar en Mis diseños: ${(e as Error).message || 'error'}`, 'error');
            }
        } catch {
            showToast('No se pudo exportar la imagen. Si usaste fotos externas, vuelve a subirlas.', 'error');
        } finally {
            setExporting(false);
        }
    };

    const filteredPets = useMemo(() => {
        const q = petQuery.trim().toLowerCase();
        return (q ? pets.filter(p => p.name?.toLowerCase().includes(q)) : pets).slice(0, 8);
    }, [pets, petQuery]);

    // ------------------------------------------------------------------
    // Galería
    // ------------------------------------------------------------------
    if (!selected) {
        return (
            <div className="max-w-7xl mx-auto pb-16 space-y-6">
                <header>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Diseños para Redes</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Plantillas para Instagram listas para personalizar con los datos y fotos de cada mascota
                        {aiReady ? ', con texto e ilustraciones generadas por IA (1 crédito = 1 diseño con varios intentos).' : '.'}
                    </p>
                </header>
                <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit" role="tablist">
                    {([['plantillas', 'Plantillas'], ['disenos', 'Mis diseños generados']] as const).map(([key, label]) => (
                        <button key={key} role="tab" aria-selected={galleryTab === key} onClick={() => setGalleryTab(key)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${galleryTab === key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                {galleryTab === 'disenos' ? (
                    <MyDesigns canDelete={userRole === 'admin' || userRole === 'creator'} />
                ) : isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[0, 1, 2, 3].map(i => <div key={i} className="h-96 rounded-[2rem] bg-slate-200/60 dark:bg-white/5 animate-pulse" />)}
                    </div>
                ) : !templates?.length ? (
                    <div className="text-center py-20 text-slate-500">
                        <ImageIcon className="mx-auto mb-3 opacity-40" size={44} />
                        Aún no hay plantillas disponibles.
                    </div>
                ) : (
                    <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {templates.map(t => (
                            <button key={t.id} onClick={() => openTemplate(t)}
                                className="group text-left bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.06] rounded-[2rem] overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all">
                                <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-950/40">
                                    {t.thumbnail_url ? (
                                        <>
                                            {/* Imagen de ejemplo subida por Vinzer: muestra cómo queda la plantilla. */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={getImageUrl(t.thumbnail_url)} alt={`Ejemplo de ${t.name}`} loading="lazy" className="w-full h-full object-contain p-4" />
                                            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-white/90 text-slate-800 text-[10px] font-bold shadow-sm">Ejemplo</span>
                                        </>
                                    ) : (
                                        <TemplatePreviewThumb template={t} className="w-full h-full p-4" />
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-black text-slate-900 dark:text-white truncate group-hover:text-primary">{t.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{t.description || templateRatio(t).label}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    {templatesPages > 1 && (
                        <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                            <button disabled={templatesPage <= 1} onClick={() => setTemplatesPage(p => p - 1)} aria-label="Página anterior"
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={16} /></button>
                            Página {templatesPage} de {templatesPages}
                            <button disabled={templatesPage >= templatesPages} onClick={() => setTemplatesPage(p => p + 1)} aria-label="Página siguiente"
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
                        </div>
                    )}
                    </div>
                )}
            </div>
        );
    }

    // ------------------------------------------------------------------
    // Editor
    // ------------------------------------------------------------------
    return (
        <div className="max-w-7xl mx-auto pb-16">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setSelected(null)} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white truncate">{selected.name}</h1>
                        {credits && aiReady && (
                            <p className="text-[11px] text-slate-500">
                                Créditos IA: <b className="text-slate-700 dark:text-slate-200">{credits.available}</b> disponibles
                                {' '}· {credits.monthly_remaining}/{credits.monthly_granted} del mes{credits.extra_remaining > 0 ? ` + ${credits.extra_remaining} extra` : ''}
                            </p>
                        )}
                    </div>
                </div>
                <button onClick={handleExport} disabled={exporting}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-black disabled:opacity-50">
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Descargar PNG
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Panel */}
                <div className="w-full lg:w-[400px] shrink-0 space-y-4">
                    {/* Mascota */}
                    <div className={cardCls}>
                        <label className={labelCls}>Mascota</label>
                        <div className="relative">
                            <button onClick={() => setPetListOpen(o => !o)} className={`${inputCls} flex items-center gap-2 text-left`}>
                                <PawPrint size={14} className="text-primary shrink-0" />
                                <span className="flex-1 truncate">{pet ? `${pet.name}${pet.species ? ` · ${pet.species}` : ''}` : 'Sin mascota (completar a mano)'}</span>
                                <ChevronDown size={14} />
                            </button>
                            {petListOpen && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2">
                                    <div className="relative mb-2">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input autoFocus value={petQuery} onChange={(e) => setPetQuery(e.target.value)} placeholder="Buscar mascota…" className={`${inputCls} pl-8`} />
                                    </div>
                                    <button onClick={() => choosePet(null)} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500">
                                        Sin mascota
                                    </button>
                                    {filteredPets.map(p => (
                                        <button key={p.id} onClick={() => choosePet(p)}
                                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-white">
                                            {p.name} <span className="text-xs text-slate-500">{[p.species, p.breed].filter(Boolean).join(' · ')}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={labelCls}>Nombre a mostrar</label>
                            <input value={petName} onChange={(e) => setPetName(e.target.value)} className={inputCls} />
                        </div>
                        {usesPhrase && (
                            <div>
                                <label className={labelCls}>Frase</label>
                                <textarea value={phrase} rows={2} maxLength={300} onChange={(e) => setPhrase(e.target.value)} className={inputCls} />
                            </div>
                        )}
                        {aiReady && (
                            <div>
                                <label className={labelCls}>Detalles para la IA (opcional)</label>
                                <textarea value={details} rows={2} maxLength={500} placeholder="Ej: le encantaba dormir al sol y jugar con su pelota roja"
                                    onChange={(e) => setDetails(e.target.value)} className={inputCls} />
                            </div>
                        )}
                    </div>

                    {/* Crédito del diseño */}
                    {aiReady && (usesAiText || hasAiImageLayer) && (
                        <div className={`${cardCls} border-violet-300/40 dark:border-violet-500/20`}>
                            <div className="flex items-center justify-between gap-2">
                                <label className={labelCls}>Crédito de este diseño</label>
                                {credits && <span className="text-[11px] text-slate-500">{credits.available} créditos disponibles</span>}
                            </div>
                            {sessionUsable && session ? (
                                <div>
                                    <div className="flex gap-1.5 mb-1.5">
                                        {Array.from({ length: session.max_attempts }).map((_, i) => (
                                            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < session.attempts_used ? 'bg-violet-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        {session.attempts_used > 0
                                            ? <>Intento <b>{session.attempts_used} de {session.max_attempts}</b> incluidos en tu crédito · te quedan {session.attempts_left}</>
                                            : <><b>{session.max_attempts} intentos</b> incluidos en tu crédito</>}
                                    </p>
                                </div>
                            ) : attemptsSpent && session ? (
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    Usaste los <b>{session.max_attempts} intentos</b> incluidos en este crédito.
                                    Para generar otra variación se usará 1 crédito adicional.
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500">
                                    Al generar se usa 1 crédito para este diseño, con {credits?.attempts_per_credit ?? 3} intentos.
                                    Cada clic de generar cuenta 1 intento (texto + ilustración juntos también es 1).
                                </p>
                            )}
                        </div>
                    )}

                    {/* Generar todo */}
                    {canGenerateBoth && (
                        <div className={`${cardCls} border-violet-300/40 dark:border-violet-500/20`}>
                            <button onClick={handleGenerateBoth} disabled={genText || genImage || !slots[aiFrom].url}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white text-sm font-black disabled:opacity-50">
                                {genText || genImage ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {genText || genImage ? waitLabel('image') : aiText || aiImage ? 'Generar otra versión de ambos' : 'Generar texto e ilustración'}
                            </button>
                            <p className="text-[11px] text-slate-500">
                                {slots[aiFrom].url
                                    ? `Crea la dedicatoria y la ilustración desde la ${aiFromLabel} en un solo paso. Usa 1 texto y 1 ilustración de tu cupo mensual.`
                                    : `Sube la ${aiFromLabel} de la mascota para generar ambos.`}
                            </p>
                        </div>
                    )}

                    {/* Texto IA */}
                    {usesAiText && (
                        <div className={cardCls}>
                            <div className="flex items-center justify-between">
                                <label className={labelCls}>Dedicatoria</label>
                                <span className={`text-[10px] font-bold ${aiText.length > maxChars ? 'text-red-500' : 'text-slate-400'}`}>{aiText.length}/{maxChars}</span>
                            </div>
                            <textarea value={aiText} rows={5} maxLength={maxChars} onChange={(e) => setAiText(e.target.value)}
                                placeholder={textReady ? 'Genera el texto con IA o escríbelo aquí' : 'Escribe la dedicatoria'} className={inputCls} />
                            {!textReady && <p className="text-[11px] text-amber-600 dark:text-amber-300/80">{aiUnavailableReason('text')}</p>}
                            {textReady && (
                                <>
                                    {freeTextRetry && !genText && (
                                        <button onClick={() => handleGenerateText(true)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-violet-400 text-violet-700 dark:text-violet-300 text-xs font-black hover:bg-violet-50 dark:hover:bg-violet-500/10">
                                            <RotateCcw size={14} /> Reintentar texto sin costo
                                        </button>
                                    )}
                                    <button onClick={() => handleGenerateText()} disabled={genText}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black disabled:opacity-50">
                                        {genText ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        {genText ? waitLabel('text') : aiText ? 'Generar otra versión' : 'Generar con IA'}
                                    </button>
                                    <button onClick={() => setShowTextPrompt(s => !s)} className="text-[11px] font-bold text-slate-500 hover:text-primary">
                                        {showTextPrompt ? 'Ocultar instrucciones' : 'Ver / ajustar instrucciones de la IA'}
                                    </button>
                                    {showTextPrompt && (
                                        <textarea value={textPrompt} rows={6} onChange={(e) => setTextPrompt(e.target.value)} className={`${inputCls} text-xs`} />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Fotos */}
                    {usedSlots.map(slot => {
                        const s = slots[slot];
                        const label = PHOTO_SLOTS.find(x => x.value === slot)?.label || slot;
                        return (
                            <div key={slot} className={cardCls}>
                                <label className={labelCls}>
                                    Foto de la mascota · {label}{slot === aiFrom && hasAiImageLayer ? ' (se usa para la ilustración IA)' : ''}
                                </label>
                                <div className="flex gap-2">
                                    <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary/50 rounded-xl py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                        <Upload size={14} /> {s.url ? 'Cambiar foto' : 'Subir foto'}
                                        <input type="file" accept="image/*" className="hidden"
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(slot, f); e.target.value = ''; }} />
                                    </label>
                                    {s.url && (
                                        <button title="Quitar foto" onClick={() => { updateSlot(slot, emptySlot()); if (slot === aiFrom) { setAiImage(null); setAiStoredUrl(null); } }}
                                            className="px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500"><X size={14} /></button>
                                    )}
                                </div>
                                {s.url && (
                                    <div className="space-y-2">
                                        <Slider label="Zoom" value={s.zoom} min={0.5} max={3} step={0.05} onChange={(v) => updateSlot(slot, { zoom: v })} />
                                        <Slider label="Mover horizontal" value={s.offset_x} min={-50} max={50} onChange={(v) => updateSlot(slot, { offset_x: v })} />
                                        <Slider label="Mover vertical" value={s.offset_y} min={-50} max={50} onChange={(v) => updateSlot(slot, { offset_y: v })} />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {hasAiImageLayer && (
                        <div className={`${cardCls} border-violet-300/40 dark:border-violet-500/20`}>
                            <div className="flex items-center justify-between">
                                <label className={labelCls}>Ilustración IA</label>
                                {aiImage && (
                                    <button onClick={() => setAiImage(null)}
                                        className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary">
                                        <RotateCcw size={11} /> Quitar
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                                {aiImage
                                    ? `Ilustración generada desde la ${aiFromLabel}. Ajusta el encuadre o genera otra versión.`
                                    : `Aún sin generar: mientras tanto se muestra la ${aiFromLabel} en ese espacio.`}
                            </p>
                            {aiImage && (
                                <div className="space-y-2">
                                    <Slider label="Zoom" value={aiImage.zoom} min={0.5} max={3} step={0.05} onChange={(v) => setAiImage({ ...aiImage, zoom: v })} />
                                    <Slider label="Mover horizontal" value={aiImage.offset_x} min={-50} max={50} onChange={(v) => setAiImage({ ...aiImage, offset_x: v })} />
                                    <Slider label="Mover vertical" value={aiImage.offset_y} min={-50} max={50} onChange={(v) => setAiImage({ ...aiImage, offset_y: v })} />
                                </div>
                            )}
                            {imageReady ? (
                                <>
                                    <button onClick={handleGenerateImage} disabled={genImage || !slots[aiFrom].url}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black disabled:opacity-50">
                                        {genImage ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                        {genImage ? waitLabel('image') : aiImage ? 'Generar otra versión' : `Ilustrar ${aiFromLabel} con IA`}
                                    </button>
                                    <button onClick={() => setShowImagePrompt(v => !v)} className="text-[11px] font-bold text-slate-500 hover:text-primary">
                                        {showImagePrompt ? 'Ocultar instrucciones de ilustración' : 'Ver / ajustar instrucciones de ilustración'}
                                    </button>
                                    {showImagePrompt && (
                                        <textarea value={imagePrompt} rows={6} onChange={(e) => setImagePrompt(e.target.value)} className={`${inputCls} text-xs`} />
                                    )}
                                </>
                            ) : (
                                <p className="text-[11px] text-amber-600 dark:text-amber-300/80">{aiUnavailableReason('image')}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Lienzo */}
                <div className="flex-1 flex flex-col items-center gap-4 min-w-0 lg:sticky lg:top-6">
                    {selected.supported_ratios.length > 1 && (
                        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                            {selected.supported_ratios.map(r => (
                                <button key={r} onClick={() => setRatio(r)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black ${ratio === r ? 'bg-primary text-white' : 'text-slate-500'}`}>
                                    {ASPECT_RATIOS.find(a => a.value === r)?.label || r}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="max-w-full overflow-auto rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                        <TemplateCanvas
                            ref={stageRef}
                            width={stageSize.width}
                            height={stageSize.height}
                            definition={canvasDefinition!}
                            bindings={bindings}
                            photos={photos}
                            editable={adjusting}
                            selectedId={adjustSel}
                            onSelect={setAdjustSel}
                            onLayerChange={(id, patch) => setOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...geometryPatch(patch) } }))}
                        />
                    </div>
                    <LayerAdjustPanel
                        layers={selected.definition.layers}
                        overrides={overrides}
                        onChange={setOverrides}
                        active={adjusting}
                        onToggle={(on) => { setAdjusting(on); if (!on) setAdjustSel(null); }}
                        selectedId={adjustSel}
                        onSelect={setAdjustSel}
                    />
                    <p className="text-[11px] text-slate-500">Se descarga a {EXPORT_WIDTH} px de ancho, listo para Instagram.</p>
                </div>
            </div>

            {creditPrompt && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
                        {credits && credits.available > 0 ? (
                            <>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Sparkles size={18} className="text-violet-500" />
                                        {attemptsSpent ? `Has usado tus ${session?.max_attempts ?? credits.attempts_per_credit} intentos incluidos` : '¿Usar 1 crédito?'}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                        {attemptsSpent ? (
                                            <>Para obtener <b>{credits.attempts_per_credit} opciones más</b> se consumirá <b>1 crédito adicional</b>. ¿Deseas continuar?{' '}</>
                                        ) : (
                                            <>Este diseño tendrá <b>{credits.attempts_per_credit} intentos</b> de generación durante {credits.session_days} días.{' '}</>
                                        )}
                                        Te quedarán <b>{credits.available - 1}</b> créditos.
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-2">
                                        Valor del crédito: USD {credits.credit_price_usd.toFixed(2)} (puede variar con el tiempo).
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={cancelUseCredit} disabled={openingSession}
                                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-bold disabled:opacity-50">
                                        Cancelar
                                    </button>
                                    <button onClick={confirmUseCredit} disabled={openingSession}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black disabled:opacity-50">
                                        {openingSession ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {attemptsSpent ? 'Sí, usar 1 crédito' : 'Usar crédito'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Sin créditos de IA</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                        Usaste todos tus créditos. Tu plan entrega {credits?.monthly_granted ?? 0} cada mes;
                                        puedes comprar más por transferencia u otro medio de pago.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={cancelUseCredit}
                                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-bold">
                                        Cerrar
                                    </button>
                                    {canOpen('/dashboard/configuracion?tab=creditos') ? (
                                        <a href="/dashboard/configuracion?tab=creditos" onClick={cancelUseCredit}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black">
                                            Comprar créditos
                                        </a>
                                    ) : canOpen('/dashboard/configuracion?tab=facturacion') && (
                                        <a href="/dashboard/configuracion?tab=facturacion" onClick={cancelUseCredit}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black">
                                            Ver planes
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {pendingAi && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles size={18} className="text-violet-500" /> {pendingAi.recovered ? 'Recuperamos una ilustración' : 'Ilustración generada'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {pendingAi.recovered && 'Se generó en este diseño pero no alcanzó a llegar o quedó sin guardar (no gastó otro intento). '}
                                ¿La guardamos? Se guarda optimizada en tu Biblioteca de Medios (carpeta IA) y se usa en el diseño.
                            </p>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pendingAi.url} alt="Ilustración generada con IA" className="w-full max-h-[50vh] object-contain rounded-2xl bg-slate-100 dark:bg-slate-950" />
                        <div className="flex gap-2">
                            <button onClick={discardAiImage} disabled={savingAi}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-bold disabled:opacity-50">
                                <X size={15} /> Descartar
                            </button>
                            <button onClick={confirmAiImage} disabled={savingAi}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black disabled:opacity-50">
                                {savingAi ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar y usar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
