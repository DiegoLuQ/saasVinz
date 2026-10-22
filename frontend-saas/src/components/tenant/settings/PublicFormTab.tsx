import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Lock,
    Plus,
    Save,
    Scale,
    Trash2,
    User,
    PawPrint,
    Tag,
    Sparkles,
    X,
    Package,
    Heart,
    CheckCircle2,
    Eye,
    EyeOff,
    ChevronRight,
    ChevronLeft,
    Info,
    Camera,
    MessageSquareQuote,
    Layers,
    Copy,
    Check,
    ExternalLink,
    FileText,
    Globe,
    Share2,
    Pencil,
    SlidersHorizontal,
    MessageSquare,
    HeartHandshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { apiRequest } from '@/lib/tenant/api';
import CondolenceModal from '@/components/public/CondolenceModal';
import WelcomeVideoField, { uploadPendingVideo } from './WelcomeVideoField';
import {
    formatCLP,
    type PhaseConfig,
    type MemoriesConfig,
    type CustomFormPreset,
    type FormFieldKey,
    type FormFieldSetting,
    type WelcomeModalConfig,
    type FormVideo,
    DEFAULT_PHASES,
    DEFAULT_MEMORIES_CONFIG,
    DEFAULT_WELCOME_MODAL_CONFIG
} from '@/lib/publicFormConfig';

// Configuración del formulario público (el enlace que se envía a la familia).
// Organizado por fases: Familia, Ángel, Camino, Recuerdos.
// Cada fase se puede mostrar u ocultar, y configurar a medida.

const MAX_TIERS = 20;

// Columnas de campos: nombre del campo | Mostrar | Obligatorio
const FIELD_GRID = 'grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] items-center gap-x-2';

// Rangos de peso en escritorio: nombre | desde | hasta | recargo | eliminar
const TIER_GRID_MD = 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_2.5rem]';

const TIER_PLACEHOLDERS = ['Mini', 'Pequeño', 'Mediano', 'Grande', 'Extra grande', 'Gigante'];

interface FieldRow {
    key: string;
    section: 'owner' | 'pet';
    label: string;
    visible: boolean;
    required: boolean;
}

interface TierRow {
    label: string;
    min_weight: string;
    max_weight: string;
    price: string;
}

const FIXED_FIELDS: Record<FieldRow['section'], string[]> = {
    owner: ['Nombre completo', 'Teléfono'],
    pet: ['Nombre', 'Especie'],
};

interface SpecialService {
    id: number;
    name: string;
    description: string | null;
    price: number;
    is_active: boolean;
    is_special?: boolean;
    show_in_form?: boolean;
}

const EMPTY_SPECIAL = { name: '', description: '', price: '' };

interface SavedTier {
    label: string | null;
    min_weight: number | null;
    max_weight: number | null;
    price: number | null;
}

const fmtKg = (n: number) => String(n).replace('.', ',');
const parseKg = (v: string) => parseFloat(v.replace(',', '.'));

const toTierRows = (rules: SavedTier[]): TierRow[] => rules.map(r => ({
    label: r.label || '',
    min_weight: fmtKg(r.min_weight ?? 0),
    max_weight: r.max_weight != null ? fmtKg(r.max_weight) : '',
    price: r.price != null ? String(r.price) : '0',
}));

function Toggle({
    checked,
    onChange,
    disabled,
    label
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed ${
                checked ? 'bg-primary' : 'bg-slate-300 dark:bg-white/20'
            }`}
        >
            <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}

type PhaseId = 'familia' | 'angel' | 'camino' | 'recuerdos';
type SectionId = 'fases' | 'pesos' | 'bienvenida' | 'enlaces';

const SECTIONS: { id: SectionId; name: string; hint: string; icon: React.ElementType }[] = [
    { id: 'fases', name: 'Pasos y datos', hint: 'Fases y campos', icon: Layers },
    { id: 'pesos', name: 'Pesos y precios', hint: 'Rangos, precios y servicios', icon: Scale },
    { id: 'bienvenida', name: 'Bienvenida y avisos', hint: 'Mensaje inicial y plazo', icon: HeartHandshake },
    { id: 'enlaces', name: 'Enlaces', hint: 'Principal y personalizados', icon: Share2 },
];

interface PhaseMeta {
    id: PhaseId;
    num: number;
    name: string;
    shortTitle: string;
    description: string;
    icon: React.ElementType;
    color: string;
}

const PHASES_LIST: PhaseMeta[] = [
    {
        id: 'familia',
        num: 1,
        name: 'Familia',
        shortTitle: 'Datos del cliente',
        description: 'Paso donde la familia proporciona sus datos de contacto y direcciones para el servicio.',
        icon: User,
        color: 'from-blue-500/20 to-sky-500/20 text-blue-400 border-blue-500/30'
    },
    {
        id: 'angel',
        num: 2,
        name: 'Ángel',
        shortTitle: 'Datos de la mascota',
        description: 'Información conmemorativa de la mascota y selección de rango de peso para el servicio.',
        icon: PawPrint,
        color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30'
    },
    {
        id: 'camino',
        num: 3,
        name: 'Camino',
        shortTitle: 'Planes y servicios',
        description: 'Selección del plan de cremación, servicios especiales y visualización de precios.',
        icon: Package,
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
        id: 'recuerdos',
        num: 4,
        name: 'Recuerdos',
        shortTitle: 'Homenaje y dedicatoria',
        description: 'Subida de fotografías enmarcadas y palabras de despedida para honrar la memoria del compañero.',
        icon: Heart,
        color: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30'
    }
];

export function PublicFormTab() {
    const { showToast } = useToast();
    const { tenantData, refreshTenantData } = useTenant();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Sección visible y, dentro de «Pasos y datos», la fase que se edita
    const [section, setSection] = useState<SectionId>('fases');
    const [selectedPhase, setSelectedPhase] = useState<PhaseId>('familia');

    // Fases activas / mostradas
    const [phases, setPhases] = useState<PhaseConfig>(DEFAULT_PHASES);

    // Plazo o nota de entrega de cenizas (general)
    const [deliveryNotice, setDeliveryNotice] = useState<string>('');

    // Formularios específicos personalizados (Presets)
    const [customForms, setCustomForms] = useState<CustomFormPreset[]>([]);
    const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);

    // Mensaje de Bienvenida / Condolencias General
    const [welcomeModal, setWelcomeModal] = useState<WelcomeModalConfig>(DEFAULT_WELCOME_MODAL_CONFIG);
    const [previewWelcomeModal, setPreviewWelcomeModal] = useState<WelcomeModalConfig | null>(null);
    const [videoAllowed, setVideoAllowed] = useState(false);

    // Modal / form para crear formulario personalizado
    const [isCreatingPreset, setIsCreatingPreset] = useState(false);
    const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
    const [presetName, setPresetName] = useState('');
    const [presetDescription, setPresetDescription] = useState('');
    const [presetPhases, setPresetPhases] = useState<PhaseConfig>({ familia: true, angel: true, camino: true, recuerdos: true });
    const [presetIncludeHealth, setPresetIncludeHealth] = useState(false);
    const [presetDeliveryNotice, setPresetDeliveryNotice] = useState('');
    const [presetFields, setPresetFields] = useState<FieldRow[]>([]);
    const [presetSectionTab, setPresetSectionTab] = useState<'owner' | 'pet'>('owner');
    const [presetWelcomeCustom, setPresetWelcomeCustom] = useState(false);
    const [presetWelcomeTitle, setPresetWelcomeTitle] = useState('');
    const [presetWelcomeMessage, setPresetWelcomeMessage] = useState('');
    const [presetWelcomeButton, setPresetWelcomeButton] = useState('');
    // Botón "Ver video" del formulario: igual que el general / mostrar / no mostrar
    const [presetVideoMode, setPresetVideoMode] = useState<'inherit' | 'show' | 'hide'>('inherit');
    const [presetVideoButton, setPresetVideoButton] = useState('');
    const [presetVideo, setPresetVideo] = useState<FormVideo | null>(null);
    const [presetVideoPosition, setPresetVideoPosition] = useState<'inherit' | 'start' | 'end'>('inherit');
    const [savingPreset, setSavingPreset] = useState(false);
    const [presetAssociatedServiceId, setPresetAssociatedServiceId] = useState<string>('');
    const [allCatalogServices, setAllCatalogServices] = useState<SpecialService[]>([]);
    const [allCatalogPlans, setAllCatalogPlans] = useState<{ id: number; name: string; price: number; is_active?: boolean }[]>([]);

    // Campos de Familia y Ángel
    const [fields, setFields] = useState<FieldRow[]>([]);

    // Tramos de peso (Ángel / Camino)
    const [tiers, setTiers] = useState<TierRow[]>([]);

    // Camino (Servicios especiales y precios)
    const [showPrices, setShowPrices] = useState(false);
    const [showServicePrices, setShowServicePrices] = useState(false);
    const [specials, setSpecials] = useState<SpecialService[]>([]);
    const [savedSpecialVisibility, setSavedSpecialVisibility] = useState<Record<number, boolean>>({});
    const [newSpecial, setNewSpecial] = useState<typeof EMPTY_SPECIAL | null>(null);
    const [creatingSpecial, setCreatingSpecial] = useState(false);

    // Recuerdos
    const [memories, setMemories] = useState<MemoriesConfig>(DEFAULT_MEMORIES_CONFIG);

    useEffect(() => {
        (async () => {
            try {
                const [cfg, rules] = await Promise.all([
                    apiRequest('/api/internal/maintenance/form-config'),
                    apiRequest('/api/internal/maintenance/weight-pricing'),
                ]);
                if (cfg.phases) {
                    setPhases({ ...DEFAULT_PHASES, ...cfg.phases });
                }
                if (cfg.delivery_notice) {
                    setDeliveryNotice(cfg.delivery_notice);
                }
                if (cfg.welcome_modal) {
                    setWelcomeModal({ ...DEFAULT_WELCOME_MODAL_CONFIG, ...cfg.welcome_modal });
                }
                setVideoAllowed(!!cfg.video_allowed);
                if (Array.isArray(cfg.custom_forms)) {
                    setCustomForms(cfg.custom_forms);
                }
                setFields(cfg.fields || []);
                setShowPrices(!!cfg.show_weight_prices);
                setShowServicePrices(!!cfg.show_service_prices);
                if (cfg.memories) {
                    setMemories({ ...DEFAULT_MEMORIES_CONFIG, ...cfg.memories });
                }
                setTiers(toTierRows(rules as SavedTier[]));

                const [services, plans] = await Promise.all([
                    apiRequest('/api/internal/services/').catch(() => []) as Promise<SpecialService[]>,
                    apiRequest('/api/internal/plans/').catch(() => []) as Promise<{ id: number; name: string; price: number; is_active?: boolean }[]>,
                ]);
                const sp = (services || []).filter(sv => sv.is_special);
                setSpecials(sp);
                setAllCatalogServices(services || []);
                setAllCatalogPlans((plans || []).filter(p => p.is_active !== false));
                setSavedSpecialVisibility(Object.fromEntries(sp.map(sv => [sv.id, sv.show_in_form !== false])));
            } catch (err: unknown) {
                showToast((err as Error)?.message || 'Error al cargar la configuración del formulario', 'error');
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const togglePhase = (phaseKey: PhaseId) => {
        const isCurrentlyActive = phases[phaseKey];
        if (isCurrentlyActive) {
            const activeCount = Object.values(phases).filter(Boolean).length;
            if (activeCount <= 1) {
                showToast('Debes mantener al menos una fase activa en el formulario', 'error');
                return;
            }
        }
        setPhases(prev => ({ ...prev, [phaseKey]: !prev[phaseKey] }));
    };

    const updateField = (key: string, patch: Partial<FieldRow>) => {
        setFields(prev => prev.map(f => {
            if (f.key !== key) return f;
            const next = { ...f, ...patch };
            if (!next.visible) next.required = false; // oculto nunca es obligatorio
            if (patch.required) next.visible = true;
            return next;
        }));
    };

    const updateTier = (idx: number, patch: Partial<TierRow>) =>
        setTiers(prev => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

    const addTier = () => {
        if (tiers.length >= MAX_TIERS) return;
        setTiers(prev => [...prev, { label: '', min_weight: prev.length === 0 ? '0' : '', max_weight: '', price: '0' }]);
    };

    const removeTier = (idx: number) => setTiers(prev => prev.filter((_, i) => i !== idx));

    const createSpecial = async () => {
        if (!newSpecial) return;
        const name = newSpecial.name.trim();
        if (!name) {
            showToast('Indica el nombre del servicio especial', 'error');
            return;
        }
        setCreatingSpecial(true);
        try {
            const created = await apiRequest('/api/internal/services/', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    description: newSpecial.description.trim() || null,
                    price: parseFloat(newSpecial.price || '0') || 0,
                    cost: 0,
                    is_active: true,
                    is_special: true,
                    show_in_form: true,
                }),
            }) as SpecialService;
            setSpecials(prev => [...prev, created]);
            setSavedSpecialVisibility(prev => ({ ...prev, [created.id]: true }));
            setNewSpecial(null);
            showToast('Servicio especial creado', 'success');
        } catch (err: unknown) {
            showToast((err as Error)?.message || 'Error al crear el servicio', 'error');
        } finally {
            setCreatingSpecial(false);
        }
    };

    const validateTiers = (): string | null => {
        let prevMax: number | null = null;
        for (let i = 0; i < tiers.length; i++) {
            const t = tiers[i];
            const n = i + 1;
            const isLast = i === tiers.length - 1;
            const price = parseFloat(t.price || '0');
            if (isNaN(price) || price < 0) return `Rango ${n}: recargo inválido`;
            const min = parseKg(t.min_weight);
            if (!t.min_weight.trim() || isNaN(min) || min < 0) return `Rango ${n}: indica desde cuántos kg`;
            if (prevMax !== null && min < prevMax) return `Rango ${n}: debe empezar en ${fmtKg(prevMax)} kg o más (el anterior llega hasta ${fmtKg(prevMax)} kg)`;
            if (!t.max_weight.trim()) {
                if (!isLast) return `Rango ${n}: indica hasta cuántos kg (solo el último puede quedar abierto)`;
                continue;
            }
            const max = parseKg(t.max_weight);
            if (isNaN(max) || max <= min) return `Rango ${n}: el peso hasta debe ser mayor que ${fmtKg(min)} kg`;
            prevMax = max;
        }
        return null;
    };

    /** Guarda form_config con los formularios indicados. Sube antes el video general si es local. */
    const putFormConfig = async (forms: CustomFormPreset[]) => {
        let wm = welcomeModal;
        if (wm.video?.url.startsWith('blob:')) {
            wm = { ...wm, video: await uploadPendingVideo(wm.video) };
            setWelcomeModal(wm);
        }
        await apiRequest('/api/internal/maintenance/form-config', {
            method: 'PUT',
            body: JSON.stringify({
                phases,
                fields: Object.fromEntries(fields.map(f => [f.key, { visible: f.visible, required: f.required }])),
                show_weight_prices: showPrices,
                show_service_prices: showServicePrices,
                delivery_notice: deliveryNotice.trim() || null,
                welcome_modal: wm,
                custom_forms: forms,
                memories,
            }),
        });
        // Navbar > Compartir lista los enlaces propios desde el bootstrap.
        refreshTenantData().catch(() => { });
    };

    const handleSave = async () => {
        const tierError = validateTiers();
        if (tierError) {
            showToast(tierError, 'error');
            return;
        }
        setSaving(true);
        try {
            await putFormConfig(customForms);
            const saved = await apiRequest('/api/internal/maintenance/weight-pricing', {
                method: 'PUT',
                body: JSON.stringify({
                    tiers: tiers.map(t => ({
                        label: t.label.trim() || null,
                        min_weight: parseKg(t.min_weight),
                        max_weight: t.max_weight.trim() ? parseKg(t.max_weight) : null,
                        price: parseFloat(t.price || '0') || 0,
                    })),
                }),
            });
            setTiers(toTierRows(saved as SavedTier[]));
            const changed = specials.filter(sv => (sv.show_in_form !== false) !== savedSpecialVisibility[sv.id]);
            await Promise.all(changed.map(sv => apiRequest(`/api/internal/services/${sv.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ show_in_form: sv.show_in_form !== false }),
            })));
            setSavedSpecialVisibility(Object.fromEntries(specials.map(sv => [sv.id, sv.show_in_form !== false])));
            showToast('Configuración del formulario guardada con éxito', 'success');
        } catch (err: unknown) {
            showToast((err as Error)?.message || 'Error al guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    const getPresetUrl = (presetId?: string) => {
        if (!tenantData?.slug) return '';
        const baseUrl = process.env.NEXT_PUBLIC_PUBLIC_FORM_URL ||
            (typeof window !== 'undefined'
                ? `${window.location.protocol}//${process.env.NEXT_PUBLIC_ROOT_DOMAIN || (window.location.host.includes('lvh.me') ? 'lvh.me:3000' : window.location.host)}`
                : 'http://localhost:3000');
        const permToken = tenantData.public_token;
        const base = `${baseUrl}/${tenantData.slug}/form`;
        const params = new URLSearchParams();
        if (permToken) params.set('token', permToken);
        if (presetId) params.set('form', presetId);
        const qs = params.toString();
        return qs ? `${base}?${qs}` : base;
    };

    const handleCopyUrl = async (presetId: string, url: string) => {
        let copied = false;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
                copied = true;
            }
        } catch {
            copied = false;
        }

        if (!copied) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = url;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "-9999px";
                textArea.setAttribute("readonly", "");
                document.body.appendChild(textArea);
                textArea.select();
                copied = document.execCommand('copy');
                document.body.removeChild(textArea);
            } catch (fallbackErr) {
                console.error('Fallback copy error', fallbackErr);
            }
        }

        if (copied) {
            setCopiedPresetId(presetId);
            showToast('¡Enlace copiado al portapapeles!', 'success');
            setTimeout(() => setCopiedPresetId(null), 2500);
        } else {
            showToast('Selecciona el enlace y presiona Ctrl+C para copiarlo', 'info');
        }
    };

    const getAssociatedServiceName = (assocId?: string | null) => {
        if (!assocId) return null;
        if (assocId.startsWith('svc_')) {
            const rawId = parseInt(assocId.replace('svc_', ''), 10);
            const found = allCatalogServices.find(s => s.id === rawId);
            return found ? found.name : assocId;
        }
        if (assocId.startsWith('plan_')) {
            const rawId = parseInt(assocId.replace('plan_', ''), 10);
            const found = allCatalogPlans.find(p => p.id === rawId);
            return found ? found.name : assocId;
        }
        return assocId;
    };

    const handleOpenCreateModal = () => {
        setEditingPresetId(null);
        setPresetName('');
        setPresetDescription('');
        setPresetAssociatedServiceId('');
        setPresetPhases({ familia: true, angel: true, camino: true, recuerdos: true });
        setPresetIncludeHealth(false);
        setPresetDeliveryNotice('');
        setPresetFields(fields.map(f => ({ ...f })));
        setPresetSectionTab('owner');
        setPresetWelcomeCustom(false);
        setPresetWelcomeTitle('');
        setPresetWelcomeMessage('');
        setPresetWelcomeButton('');
        setPresetVideoMode('inherit');
        setPresetVideoButton('');
        setPresetVideo(null);
        setIsCreatingPreset(true);
    };

    const handleStartEditPreset = (preset: CustomFormPreset) => {
        setEditingPresetId(preset.id);
        setPresetName(preset.name);
        setPresetDescription(preset.description || '');
        setPresetAssociatedServiceId(preset.associated_service_id || '');
        setPresetPhases({ familia: true, angel: true, camino: true, recuerdos: true, ...(preset.phases || {}) });
        setPresetIncludeHealth(Boolean(preset.include_health_status));
        setPresetDeliveryNotice(preset.delivery_notice || '');

        const initializedFields = fields.map(f => {
            const override = preset.fields?.[f.key as FormFieldKey];
            if (override) {
                const vis = Boolean(override.visible);
                return {
                    ...f,
                    visible: vis,
                    required: Boolean(override.required) && vis,
                };
            }
            if (f.key === 'healthStatus' && preset.include_health_status) {
                return { ...f, visible: true, required: true };
            }
            return { ...f };
        });
        setPresetFields(initializedFields);
        setPresetSectionTab('owner');

        if (preset.welcome_modal) {
            setPresetWelcomeCustom(true);
            setPresetWelcomeTitle(preset.welcome_modal.title || '');
            setPresetWelcomeMessage(preset.welcome_modal.message || '');
            setPresetWelcomeButton(preset.welcome_modal.button_text || '');
            const show = preset.welcome_modal.show_video_button;
            setPresetVideoMode(show == null ? 'inherit' : show ? 'show' : 'hide');
            setPresetVideoButton(preset.welcome_modal.video_button_text || '');
            setPresetVideo(preset.welcome_modal.video || null);
            setPresetVideoPosition(preset.welcome_modal.video_position || 'inherit');
        } else {
            setPresetWelcomeCustom(false);
            setPresetWelcomeTitle('');
            setPresetWelcomeMessage('');
            setPresetWelcomeButton('');
            setPresetVideoMode('inherit');
            setPresetVideoButton('');
            setPresetVideo(null);
            setPresetVideoPosition('inherit');
        }

        setIsCreatingPreset(true);
    };

    const updatePresetField = (key: string, patch: Partial<FieldRow>) => {
        setPresetFields(prev => prev.map(f => {
            if (f.key !== key) return f;
            const next = { ...f, ...patch };
            if (!next.visible) next.required = false; // oculto nunca es obligatorio
            if (patch.required) next.visible = true;
            if (key === 'healthStatus' && patch.visible !== undefined) {
                setPresetIncludeHealth(patch.visible);
            }
            return next;
        }));
    };

    const handleSaveNewPreset = async () => {
        const name = presetName.trim();
        if (!name) {
            showToast('Ingresa un nombre para el formulario', 'error');
            return;
        }
        const activePhasesCount = Object.values(presetPhases).filter(Boolean).length;
        if (activePhasesCount === 0) {
            showToast('Debes seleccionar al menos una fase para el formulario', 'error');
            return;
        }

        const id = editingPresetId || (
            name.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') || `form-${Date.now()}`
        );

        const presetFieldsMap: Partial<Record<FormFieldKey, FormFieldSetting>> = {};
        presetFields.forEach(f => {
            presetFieldsMap[f.key as FormFieldKey] = {
                visible: f.visible,
                required: f.required && f.visible,
            };
        });

        let ownVideo: FormVideo | null = null;
        if (presetWelcomeCustom && presetVideoMode === 'show') {
            setSavingPreset(true);
            try {
                ownVideo = await uploadPendingVideo(presetVideo);
            } catch (err: unknown) {
                setSavingPreset(false);
                showToast((err as Error)?.message || 'No se pudo subir el video', 'error');
                return;
            }
        }

        const newPreset: CustomFormPreset = {
            id,
            name,
            description: presetDescription.trim() || undefined,
            associated_service_id: presetAssociatedServiceId.trim() || null,
            phases: presetPhases,
            include_health_status: presetIncludeHealth || Boolean(presetFields.find(f => f.key === 'healthStatus')?.visible),
            delivery_notice: presetDeliveryNotice.trim() || undefined,
            fields: presetFieldsMap,
            welcome_modal: presetWelcomeCustom ? {
                enabled: true,
                title: presetWelcomeTitle.trim() || undefined,
                message: presetWelcomeMessage.trim() || undefined,
                button_text: presetWelcomeButton.trim() || undefined,
                show_video_button: presetVideoMode === 'inherit' ? null : presetVideoMode === 'show',
                video_button_text: presetVideoMode === 'show' ? (presetVideoButton.trim() || null) : null,
                video: ownVideo,
                video_position: presetVideoMode === 'show' && presetVideoPosition !== 'inherit' ? presetVideoPosition : null,
            } : null,
            created_at: editingPresetId
                ? (customForms.find(f => f.id === editingPresetId)?.created_at || new Date().toISOString())
                : new Date().toISOString(),
        };

        const updated = editingPresetId
            ? customForms.map(f => (f.id === editingPresetId ? newPreset : f))
            : [...customForms.filter(f => f.id !== id), newPreset];

        setCustomForms(updated);
        setIsCreatingPreset(false);
        const wasEditing = Boolean(editingPresetId);
        setEditingPresetId(null);
        setPresetName('');
        setPresetDescription('');
        setPresetAssociatedServiceId('');
        setPresetPhases({ familia: true, angel: true, camino: true, recuerdos: true });
        setPresetIncludeHealth(false);
        setPresetDeliveryNotice('');
        setPresetWelcomeCustom(false);
        setPresetWelcomeTitle('');
        setPresetWelcomeMessage('');
        setPresetWelcomeButton('');

        setPresetVideoMode('inherit');
        setPresetVideoButton('');
        setPresetVideo(null);

        try {
            await putFormConfig(updated);
            showToast(wasEditing ? `Formulario "${name}" actualizado con éxito` : `Formulario "${name}" creado con éxito`, 'success');
            if (!wasEditing) {
                const generatedUrl = getPresetUrl(id);
                if (generatedUrl) {
                    handleCopyUrl(id, generatedUrl);
                }
            }
        } catch (err: any) {
            showToast(err?.message || 'Error al guardar el formulario', 'error');
        } finally {
            setSavingPreset(false);
        }
    };

    const handleDeletePreset = async (presetId: string) => {
        const updated = customForms.filter(f => f.id !== presetId);
        setCustomForms(updated);
        try {
            await putFormConfig(updated);
            showToast('Formulario eliminado', 'success');
        } catch (err: any) {
            showToast(err?.message || 'Error al eliminar el formulario', 'error');
        }
    };

    if (loading) {
        return <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">Cargando configuración del formulario…</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Encabezado */}
            <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Formulario para la familia</h3>
                <p className="text-sm text-slate-600 dark:text-muted-foreground mt-1 max-w-2xl">
                    Lo que completa la familia al abrir tu enlace: qué pasos ve, qué datos se le piden, los rangos de peso con sus precios y los enlaces para compartir.
                </p>
            </div>

            {/* Secciones */}
            <nav className="grid grid-cols-2 lg:grid-cols-4 gap-2" aria-label="Secciones del formulario">
                {SECTIONS.map(s => {
                    const Icon = s.icon;
                    const active = section === s.id;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setSection(s.id)}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-start gap-3 p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                active
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]'
                            }`}
                        >
                            <span className={`p-2 rounded-xl shrink-0 ${active ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-muted-foreground'}`}>
                                <Icon size={16} />
                            </span>
                            <span className="min-w-0">
                                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                                    {s.name}
                                    {s.id === 'enlaces' && customForms.length > 0 && (
                                        <span className="px-1.5 rounded-full bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white text-[10px] font-mono">{customForms.length + 1}</span>
                                    )}
                                </span>
                                <span className="block text-[11px] text-slate-500 dark:text-muted-foreground mt-0.5 leading-snug">{s.hint}</span>
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Fases: elegir cuál configurar */}
            {section === 'fases' && (
                <div className="flex flex-wrap items-center gap-2">
                    {PHASES_LIST.map(phase => {
                        const Icon = phase.icon;
                        const active = selectedPhase === phase.id;
                        return (
                            <button
                                key={phase.id}
                                type="button"
                                onClick={() => setSelectedPhase(phase.id)}
                                className={`flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    active
                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-white/[0.03] dark:text-white/80 dark:border-white/10 dark:hover:bg-white/[0.06]'
                                }`}
                            >
                                <Icon size={14} />
                                <span>{phase.num}. {phase.name}</span>
                                <span
                                    className={`w-2 h-2 rounded-full ${phases[phase.id] ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    title={phases[phase.id] ? 'Visible' : 'Oculta'}
                                />
                            </button>
                        );
                    })}
                    <span className="text-[11px] text-slate-500 dark:text-muted-foreground ml-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />visible
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-3 mr-1" />oculta
                    </span>
                </div>
            )}

            {/* CONTENIDO */}
            <div className="space-y-6">

                {/* ============================================================== */}
                {/* FASE 1: FAMILIA */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'familia' && (
                    <PhaseSectionContainer
                        id="familia"
                        num={1}
                        name="Familia"
                        title="Datos de contacto y entrega"
                        description="Configura si este paso se solicita a la familia y qué datos del cliente son obligatorios para el servicio."
                        icon={User}
                        isActive={phases.familia}
                        onToggle={() => togglePhase('familia')}
                    >
                        <div className="glass-card p-5 sm:p-6 rounded-3xl min-w-0">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Campos del tutor / cliente</h4>
                                    <p className="text-xs text-muted-foreground">Datos personales y de contacto para coordinar el retiro y entrega.</p>
                                </div>
                            </div>

                            <div className={`${FIELD_GRID} pb-2 border-b border-foreground/10 text-[11px] font-semibold text-muted-foreground`}>
                                <span>Campo</span>
                                <span className="text-center">Mostrar</span>
                                <span className="text-center">Obligatorio</span>
                            </div>

                            <div className="divide-y divide-foreground/5">
                                {FIXED_FIELDS.owner.map(name => (
                                    <div key={name} className={`${FIELD_GRID} py-3`}>
                                        <span className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
                                            <Lock size={13} className="shrink-0 text-primary" />
                                            <span className="truncate">{name}</span>
                                        </span>
                                        <span className="col-span-2 justify-self-center rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                            Siempre obligatorio
                                        </span>
                                    </div>
                                ))}
                                {fields.filter(f => f.section === 'owner').map(f => {
                                    const status = !f.visible ? 'Oculto' : f.required ? 'Obligatorio' : 'Opcional';
                                    const statusClass = !f.visible
                                        ? 'text-muted-foreground'
                                        : f.required ? 'text-primary' : 'text-emerald-400';
                                    return (
                                        <div key={f.key} className={`${FIELD_GRID} py-3`}>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium break-words ${f.visible ? 'text-white' : 'text-muted-foreground'}`}>{f.label}</p>
                                                <p className={`text-[11px] font-medium mt-0.5 ${statusClass}`}>{status}</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`Mostrar ${f.label}`} checked={f.visible} onChange={v => updateField(f.key, { visible: v })} />
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`${f.label} obligatorio`} checked={f.required} disabled={!f.visible} onChange={v => updateField(f.key, { required: v })} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PhaseSectionContainer>
                )}

                {/* ============================================================== */}
                {/* FASE 2: ÁNGEL */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'angel' && (
                    <PhaseSectionContainer
                        id="angel"
                        num={2}
                        name="Ángel"
                        title="Datos de la mascota"
                        description="Qué datos de la mascota se piden. El rango de peso que elige la familia se configura en «Pesos y precios»."
                        icon={PawPrint}
                        isActive={phases.angel}
                        onToggle={() => togglePhase('angel')}
                    >
                        <div className="space-y-6">
                            {/* Campos de la mascota */}
                            <div className="glass-card p-5 sm:p-6 rounded-3xl min-w-0">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                                        <PawPrint size={16} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">Campos de la mascota</h4>
                                        <p className="text-xs text-muted-foreground">Información básica y conmemorativa de la mascota.</p>
                                    </div>
                                </div>

                                <div className={`${FIELD_GRID} pb-2 border-b border-foreground/10 text-[11px] font-semibold text-muted-foreground`}>
                                    <span>Campo</span>
                                    <span className="text-center">Mostrar</span>
                                    <span className="text-center">Obligatorio</span>
                                </div>

                                <div className="divide-y divide-foreground/5">
                                    {FIXED_FIELDS.pet.map(name => (
                                        <div key={name} className={`${FIELD_GRID} py-3`}>
                                            <span className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
                                                <Lock size={13} className="shrink-0 text-primary" />
                                                <span className="truncate">{name}</span>
                                            </span>
                                            <span className="col-span-2 justify-self-center rounded-full bg-foreground/5 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                                Siempre obligatorio
                                            </span>
                                        </div>
                                    ))}
                                    {fields.filter(f => f.section === 'pet').map(f => {
                                        const status = !f.visible ? 'Oculto' : f.required ? 'Obligatorio' : 'Opcional';
                                        const statusClass = !f.visible
                                            ? 'text-muted-foreground'
                                            : f.required ? 'text-primary' : 'text-emerald-400';
                                        return (
                                            <div key={f.key} className={`${FIELD_GRID} py-3`}>
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-medium break-words ${f.visible ? 'text-white' : 'text-muted-foreground'}`}>{f.label}</p>
                                                    <p className={`text-[11px] font-medium mt-0.5 ${statusClass}`}>{status}</p>
                                                </div>
                                                <div className="flex justify-center">
                                                    <Toggle label={`Mostrar ${f.label}`} checked={f.visible} onChange={v => updateField(f.key, { visible: v })} />
                                                </div>
                                                <div className="flex justify-center">
                                                    <Toggle label={`${f.label} obligatorio`} checked={f.required} disabled={!f.visible} onChange={v => updateField(f.key, { required: v })} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </PhaseSectionContainer>
                )}

                {/* ============================================================== */}
                {/* FASE 3: CAMINO */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'camino' && (
                    <PhaseSectionContainer
                        id="camino"
                        num={3}
                        name="Camino"
                        title="Selección de planes, servicios y precios"
                        description="Permite que la familia elija su plan de cremación, servicios especiales y visualice los precios."
                        icon={Package}
                        isActive={phases.camino}
                        onToggle={() => togglePhase('camino')}
                    >
                        <div className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-white">Planes, servicios especiales y precios</h4>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                                    En este paso la familia elige su plan de cremación y los servicios especiales. Qué servicios aparecen y qué precios se muestran se configura en «Pesos y precios».
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSection('pesos')}
                                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/15 cursor-pointer"
                            >
                                Ir a Pesos y precios <ChevronRight size={15} />
                            </button>
                        </div>
                    </PhaseSectionContainer>
                )}

                {/* ============================================================== */}
                {/* FASE 4: RECUERDOS */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'recuerdos' && (
                    <PhaseSectionContainer
                        id="recuerdos"
                        num={4}
                        name="Recuerdos"
                        title="Homenaje, fotos y dedicatoria"
                        description="Paso para que la familia suba fotografías conmemorativas y redacte una dedicatoria o mensaje de despedida."
                        icon={Heart}
                        isActive={phases.recuerdos}
                        onToggle={() => togglePhase('recuerdos')}
                    >
                        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Heart size={18} className="text-rose-400" />
                                    <h4 className="font-bold text-white">Opciones de Homenaje y Recuerdos</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                                    Define si la familia puede subir fotos, escribir una dedicatoria y si estos elementos son obligatorios.
                                </p>
                            </div>

                            <div className="divide-y divide-foreground/5">
                                {/* Fotos conmemorativas */}
                                <div className="py-4 space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                                                <Camera size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">Subida de fotos de la mascota</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Permite a la familia adjuntar hasta 5 fotos para enmarcar su recuerdo y generar la tarjeta conmemorativa.
                                                </p>
                                            </div>
                                        </div>
                                        <Toggle
                                            label="Permitir fotos"
                                            checked={memories.allow_photos}
                                            onChange={v => setMemories(prev => ({
                                                ...prev,
                                                allow_photos: v,
                                                require_photos: v ? prev.require_photos : false
                                            }))}
                                        />
                                    </div>

                                    {memories.allow_photos && (
                                        <div className="ml-11 flex items-center justify-between gap-4 pt-2 border-t border-foreground/5">
                                            <div>
                                                <p className="text-xs font-medium text-white">Al menos una foto obligatoria</p>
                                                <p className="text-[10px] text-muted-foreground">La familia no podrá avanzar sin subir al menos una fotografía.</p>
                                            </div>
                                            <Toggle
                                                label="Foto obligatoria"
                                                checked={memories.require_photos}
                                                onChange={v => setMemories(prev => ({ ...prev, require_photos: v }))}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Dedicatoria */}
                                <div className="py-4 space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                                                <MessageSquareQuote size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">Palabras de despedida / Dedicatoria</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Espacio emotivo para que el tutor escriba un mensaje personalizado para honrar la partida de su mascota.
                                                </p>
                                            </div>
                                        </div>
                                        <Toggle
                                            label="Permitir dedicatoria"
                                            checked={memories.allow_dedication}
                                            onChange={v => setMemories(prev => ({
                                                ...prev,
                                                allow_dedication: v,
                                                require_dedication: v ? prev.require_dedication : false
                                            }))}
                                        />
                                    </div>

                                    {memories.allow_dedication && (
                                        <div className="ml-11 flex items-center justify-between gap-4 pt-2 border-t border-foreground/5">
                                            <div>
                                                <p className="text-xs font-medium text-white">Dedicatoria obligatoria</p>
                                                <p className="text-[10px] text-muted-foreground">Exige escribir unas palabras antes de continuar al resumen.</p>
                                            </div>
                                            <Toggle
                                                label="Dedicatoria obligatoria"
                                                checked={memories.require_dedication}
                                                onChange={v => setMemories(prev => ({ ...prev, require_dedication: v }))}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Sugerencias de despedida con IA / precargadas */}
                                <div className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                                            <Sparkles size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Sugerencias y apoyo para redactar</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Muestra el botón "Sugerir mensaje" para acompañar a los tutores que se sienten abrumados o sin palabras.
                                            </p>
                                        </div>
                                    </div>
                                    <Toggle
                                        label="Permitir sugerencias"
                                        checked={memories.allow_suggestions}
                                        onChange={v => setMemories(prev => ({ ...prev, allow_suggestions: v }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </PhaseSectionContainer>
                )}


                {/* ============================================================== */}
                {/* PESOS Y PRECIOS */}
                {/* ============================================================== */}
                {section === 'pesos' && (
                    <section className="space-y-6">
                        {/* Tramos de peso */}
                        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Scale size={18} className="text-amber-400" />
                                    <h4 className="font-bold text-white">Rangos de peso</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                                    Hasta {MAX_TIERS} rangos. Escribe desde y hasta cuántos kg (ej. 0 – 4, 4,1 – 7). Deja vacío el “hasta” del último para “desde X kg”.
                                    Se usan en el formulario, en el catálogo y para el cálculo de recargo en las órdenes.
                                </p>
                            </div>

                            {tiers.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">
                                    Sin rangos definidos: el formulario usa rangos genéricos (Pequeño, Mediano, Grande, Gigante) sin recargo.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    <div className={`hidden md:grid ${TIER_GRID_MD} gap-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground`}>
                                        <span>Nombre (opcional)</span>
                                        <span>Desde</span>
                                        <span>Hasta</span>
                                        <span>Recargo</span>
                                        <span className="w-10" />
                                    </div>
                                    {tiers.map((t, idx) => {
                                        const isLast = idx === tiers.length - 1;
                                        return (
                                            <div key={idx} className={`grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border border-foreground/10 p-3 ${TIER_GRID_MD} md:items-start md:gap-3 md:rounded-none md:border-0 md:p-0`}>
                                                <div className="col-span-2 md:col-span-1 flex items-end gap-2 min-w-0">
                                                    <div className="flex-1 min-w-0">
                                                        <TierLabel>Rango {idx + 1} · Nombre (opcional)</TierLabel>
                                                        <FormInputLite placeholder={`Ej: ${TIER_PLACEHOLDERS[idx] ?? `Rango ${idx + 1}`}`} value={t.label} maxLength={40} ariaLabel={`Rango ${idx + 1}: nombre`} onChange={v => updateTier(idx, { label: v })} />
                                                    </div>
                                                    <RemoveTierButton idx={idx} onClick={() => removeTier(idx)} className="flex md:hidden" />
                                                </div>
                                                <div className="min-w-0">
                                                    <TierLabel>Desde</TierLabel>
                                                    <FormInputLite
                                                        placeholder={idx === 0 ? '0' : tiers[idx - 1].max_weight || '…'}
                                                        value={t.min_weight}
                                                        inputMode="decimal"
                                                        suffix="kg"
                                                        ariaLabel={`Rango ${idx + 1}: desde (kg)`}
                                                        onChange={v => updateTier(idx, { min_weight: v.replace(/[^\d.,]/g, '') })}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <TierLabel>Hasta</TierLabel>
                                                    <FormInputLite
                                                        placeholder={isLast ? 'o más' : 'ej. 4'}
                                                        ariaLabel={`Rango ${idx + 1}: hasta (kg)`}
                                                        value={t.max_weight}
                                                        inputMode="decimal"
                                                        suffix="kg"
                                                        onChange={v => updateTier(idx, { max_weight: v.replace(/[^\d.,]/g, '') })}
                                                    />
                                                </div>
                                                <div className="col-span-2 md:col-span-1 min-w-0">
                                                    <TierLabel>Recargo</TierLabel>
                                                    <FormInputLite
                                                        placeholder="0"
                                                        value={t.price}
                                                        inputMode="numeric"
                                                        prefix="$"
                                                        ariaLabel={`Rango ${idx + 1}: recargo ($)`}
                                                        onChange={v => updateTier(idx, { price: v.replace(/\D/g, '') })}
                                                        hint={parseFloat(t.price) > 0 ? formatCLP(parseFloat(t.price)) : undefined}
                                                    />
                                                </div>
                                                <RemoveTierButton idx={idx} onClick={() => removeTier(idx)} className="hidden md:flex" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={addTier}
                                disabled={tiers.length >= MAX_TIERS}
                                className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Plus size={16} />
                                {tiers.length >= MAX_TIERS ? `Máximo ${MAX_TIERS} rangos` : 'Agregar rango de peso'}
                            </button>
                        </div>
                        {/* Precios visibles en el formulario */}
                        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Tag size={18} className="text-emerald-400" />
                                    <h4 className="font-bold text-white">Precios en el formulario</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                                    Elige qué precios ve la familia. Al activar alguno, el resumen final muestra el total estimado (plan elegido + servicios especiales + recargo por peso).
                                </p>
                            </div>
                            <div className="divide-y divide-foreground/5">
                                <PriceToggleRow
                                    title="Precio según el peso"
                                    description="Muestra el recargo correspondiente a cada rango de peso."
                                    checked={showPrices}
                                    onChange={setShowPrices}
                                />
                                <PriceToggleRow
                                    title="Precio según el plan elegido"
                                    description="Muestra el precio de cada plan de cremación y de los servicios adicionales al seleccionarlos."
                                    checked={showServicePrices}
                                    onChange={setShowServicePrices}
                                />
                            </div>
                        </div>

                        {/* Servicios especiales */}
                        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-emerald-400" />
                                    <h4 className="font-bold text-white">Servicios especiales</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                                    Servicios como eutanasia o exhumación ofrecidos a la familia tras elegir el plan. Se administran en el{' '}
                                    <Link href="/dashboard/gestion-servicios" className="text-primary font-semibold hover:underline">catálogo de servicios</Link>.
                                </p>
                            </div>

                            {specials.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">Aún no tienes servicios especiales configurados.</p>
                            ) : (
                                <div className="divide-y divide-foreground/5">
                                    {specials.map(sv => (
                                        <div key={sv.id} className="flex items-center justify-between gap-4 py-3">
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium break-words ${sv.show_in_form !== false ? 'text-white' : 'text-muted-foreground'}`}>
                                                    {sv.name}
                                                    <span className="ml-2 text-xs font-semibold text-muted-foreground">{formatCLP(sv.price || 0)}</span>
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                                                    {!sv.is_active ? 'Inactivo en el catálogo · ' : ''}{sv.description || 'Sin descripción'}
                                                </p>
                                            </div>
                                            <Toggle
                                                label={`Mostrar ${sv.name} en el formulario`}
                                                checked={sv.show_in_form !== false}
                                                onChange={v => setSpecials(prev => prev.map(x => (x.id === sv.id ? { ...x, show_in_form: v } : x)))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {newSpecial ? (
                                <div className="rounded-2xl border border-foreground/10 p-4 space-y-3 bg-white/5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-white">Nuevo servicio especial</p>
                                        <button type="button" onClick={() => setNewSpecial(null)} aria-label="Cancelar" className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/5">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                                        <FormInputLite placeholder="Nombre (ej: Eutanasia)" value={newSpecial.name} maxLength={80} ariaLabel="Nombre del servicio especial" onChange={v => setNewSpecial({ ...newSpecial, name: v })} />
                                        <FormInputLite placeholder="Precio" value={newSpecial.price} inputMode="numeric" prefix="$" ariaLabel="Precio del servicio especial" onChange={v => setNewSpecial({ ...newSpecial, price: v.replace(/\D/g, '') })} />
                                        <div className="sm:col-span-2">
                                            <FormInputLite placeholder="Descripción (opcional)" value={newSpecial.description} maxLength={200} ariaLabel="Descripción del servicio especial" onChange={v => setNewSpecial({ ...newSpecial, description: v })} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={createSpecial}
                                            disabled={creatingSpecial}
                                            className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60 cursor-pointer"
                                        >
                                            {creatingSpecial ? 'Creando…' : 'Crear servicio'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setNewSpecial(EMPTY_SPECIAL)}
                                    className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-80 cursor-pointer"
                                >
                                    <Plus size={16} />
                                    Agregar servicio especial
                                </button>
                            )}
                        </div>
                    </section>
                )}

                {/* ============================================================== */}
                {/* BIENVENIDA Y AVISOS */}
                {/* ============================================================== */}
                {section === 'bienvenida' && (
                    <section className="space-y-6">
                        {/* 3. Mensaje de Bienvenida / Condolencias (Modal Inicial) */}
                        <div className="p-6 rounded-3xl border-2 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-950/20 space-y-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-indigo-200 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-400">
                                        <HeartHandshake size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h5 className="font-extrabold text-indigo-950 dark:text-white text-sm">
                                                Mensaje de Bienvenida y Condolencias (Modal Inicial)
                                            </h5>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                                                Al abrir enlace
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-indigo-900/80 dark:text-muted-foreground font-medium">
                                            Ventana emergente que recibe a la familia con tu logo y un mensaje de acompañamiento antes de iniciar el formulario.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewWelcomeModal(welcomeModal)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                        title="Ver cómo lo verá la familia"
                                    >
                                        <Eye size={14} />
                                        <span>Previsualizar</span>
                                    </button>
                                    <Toggle
                                        label="Mostrar modal de bienvenida"
                                        checked={welcomeModal.enabled !== false}
                                        onChange={v => setWelcomeModal(prev => ({ ...prev, enabled: v }))}
                                    />
                                </div>
                            </div>

                            {welcomeModal.enabled !== false && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-indigo-200/60 dark:border-indigo-500/20">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-slate-200 mb-1">
                                            Título del Modal
                                        </label>
                                        <input
                                            type="text"
                                            value={welcomeModal.title || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Lamentamos tu pérdida"
                                            maxLength={60}
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-muted-foreground rounded-2xl py-2.5 px-3.5 outline-none focus:border-indigo-600 font-semibold shadow-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-slate-200 mb-1">
                                            Texto del Botón
                                        </label>
                                        <input
                                            type="text"
                                            value={welcomeModal.button_text || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, button_text: e.target.value }))}
                                            placeholder="Continuar"
                                            maxLength={30}
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-muted-foreground rounded-2xl py-2.5 px-3.5 outline-none focus:border-indigo-600 font-semibold shadow-xs"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-slate-200 mb-1">
                                            Mensaje de Condolencias / Acompañamiento
                                        </label>
                                        <textarea
                                            value={welcomeModal.message || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, message: e.target.value }))}
                                            placeholder="En estos momentos difíciles, en {empresa} queremos acompañarte y brindarte todo nuestro apoyo. Estamos aquí para ayudarte a honrar la memoria de tu ser querido."
                                            rows={3}
                                            maxLength={350}
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-muted-foreground rounded-2xl py-2.5 px-3.5 outline-none focus:border-indigo-600 font-medium resize-none shadow-xs"
                                        />
                                        <p className="text-[11px] text-indigo-900/70 dark:text-muted-foreground mt-1 font-medium">
                                            Tip: Puedes escribir <code className="bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-300 font-mono font-bold">{"{empresa}"}</code> para que se reemplace automáticamente por el nombre de tu crematorio en negrita.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Video opcional (PRO / ULTRA): al inicio (en el mensaje) o al final (tras enviar) */}
                            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white/70 dark:bg-slate-900/50 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-extrabold text-indigo-950 dark:text-white">Video para la familia (opcional)</p>
                                        <p className="text-[11px] text-indigo-900/80 dark:text-muted-foreground font-medium">
                                            Un video corto (máx. 30 s) que la familia ve solo si pulsa el botón. No se reproduce solo.
                                        </p>
                                    </div>
                                    <Toggle
                                        label="Mostrar botón Ver video"
                                        checked={!!welcomeModal.show_video_button}
                                        disabled={!videoAllowed || !welcomeModal.video}
                                        onChange={v => setWelcomeModal(prev => ({ ...prev, show_video_button: v }))}
                                    />
                                </div>
                                <WelcomeVideoField
                                    video={welcomeModal.video}
                                    allowed={videoAllowed}
                                    onError={msg => showToast(msg, 'error')}
                                    onChange={v => setWelcomeModal(prev => ({ ...prev, video: v, show_video_button: v ? (prev.video ? prev.show_video_button : true) : false }))}
                                />
                                {videoAllowed && welcomeModal.video && (
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-950 dark:text-slate-200 mb-1">¿Cuándo se muestra?</label>
                                        <VideoPositionPicker
                                            value={welcomeModal.video_position === 'end' ? 'end' : 'start'}
                                            onChange={v => setWelcomeModal(prev => ({ ...prev, video_position: v }))}
                                        />
                                        {welcomeModal.enabled === false && welcomeModal.video_position !== 'end' && (
                                            <p className="mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                                El mensaje de bienvenida está desactivado: elige «Al final» para que la familia vea el video.
                                            </p>
                                        )}
                                    </div>
                                )}
                                {videoAllowed && welcomeModal.video && (
                                    <div className="max-w-xs">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-950 dark:text-slate-200 mb-1">Texto del botón del video</label>
                                        <input
                                            type="text"
                                            value={welcomeModal.video_button_text || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, video_button_text: e.target.value }))}
                                            placeholder="Ver video"
                                            maxLength={40}
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-indigo-600 font-semibold"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Plazo / Aviso de Entrega de Cenizas General */}
                        <div className="p-6 rounded-3xl border-2 border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 space-y-3 shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-400">
                                    <Info size={16} />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-amber-950 dark:text-white text-sm">
                                        Plazo o Nota de Entrega de Cenizas (Aviso General)
                                    </h5>
                                    <p className="text-[11px] text-amber-900/80 dark:text-muted-foreground font-medium">
                                        Mensaje que verá la familia en el resumen y al confirmar su solicitud para conocer los tiempos de entrega.
                                    </p>
                                </div>
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={deliveryNotice}
                                    onChange={e => setDeliveryNotice(e.target.value)}
                                    placeholder="Ej: Las cenizas serán entregadas en un plazo de 72 horas hábiles."
                                    maxLength={200}
                                    className="w-full bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-muted-foreground rounded-2xl py-3 px-4 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-500/15 transition-all shadow-sm font-medium"
                                />
                            </div>
                            <p className="text-[10px] text-amber-900/70 dark:text-muted-foreground italic font-medium">
                                Puedes dejarlo vacío si no deseas mostrar un plazo automático.
                            </p>
                        </div>
                    </section>
                )}

                {/* ============================================================== */}
                {/* SECCIÓN: FORMULARIOS Y ENLACES (PRESETS) */}
                {/* ============================================================== */}
                {section === 'enlaces' && (
                    <section className="space-y-6">
                        {/* Cabecera de la sección */}
                        <div className="p-6 sm:p-7 rounded-3xl border-2 border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 via-purple-50/40 to-white dark:from-violet-500/10 dark:via-purple-500/5 dark:to-slate-900 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-2xl bg-violet-600 text-white shrink-0 shadow-md shadow-violet-600/25">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400">
                                                Formularios y Enlaces
                                            </span>
                                            <span className="text-slate-300 dark:text-white/30 text-xs">·</span>
                                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                                                Personalizables
                                            </span>
                                        </div>
                                        <h4 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                                            Generador de Formularios y Enlaces
                                        </h4>
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                                            Crea formularios específicos con <strong className="text-slate-900 dark:text-white">Nombre</strong> y <strong className="text-slate-900 dark:text-white">Descripción</strong> (ej. <em>Datos para proceso de Eutanasia</em>, <em>Servicios Extras</em>) para enviar directamente por WhatsApp o enlace. Elige qué fases mostrar y si incluir el campo médico/diagnóstico sin alterar tu formulario base.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleOpenCreateModal}
                                    className="bg-violet-600 hover:bg-violet-700 text-white font-black py-3 px-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/25 shrink-0 cursor-pointer self-start sm:self-auto hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <Plus size={18} />
                                    <span>Crear Formulario</span>
                                </button>
                            </div>
                        </div>

                        {/* 1. Formulario Principal / Oficial (Base) */}
                        <div className="p-6 rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                                    <h5 className="font-extrabold text-slate-900 dark:text-white text-base">
                                        Formulario Principal (Oficial)
                                    </h5>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                        Base activa
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-muted-foreground">
                                    Usa la configuración de «Pasos y datos», «Pesos y precios» y «Bienvenida y avisos»
                                </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-muted-foreground leading-relaxed">
                                Este es el formulario general del crematorio. Utilízalo para compartir en tu sitio web, biografía de Instagram o atenciones estándar.
                            </p>

                            {/* Enlace y acciones */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                                <div className="relative flex-1 min-w-0">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getPresetUrl()}
                                        className="w-full bg-slate-50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono text-slate-900 dark:text-white/90 rounded-2xl py-3 pl-4 pr-10 outline-none select-all focus:border-primary font-semibold"
                                    />
                                    <Globe size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground pointer-events-none" />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleCopyUrl('base', getPresetUrl())}
                                        className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-transparent"
                                    >
                                        {copiedPresetId === 'base' ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
                                        <span>{copiedPresetId === 'base' ? 'Copiado' : 'Copiar Enlace'}</span>
                                    </button>

                                    <a
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hola, te comparto nuestro formulario para el servicio de cremación:\n\n${getPresetUrl()}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
                                    >
                                        <Share2 size={16} />
                                        <span>WhatsApp</span>
                                    </a>

                                    <a
                                        href={getPresetUrl()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-transparent"
                                        title="Probar formulario en nueva pestaña"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>
                        </div>


                        {/* 2. Listado de Formularios Personalizados */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-muted-foreground">
                                    Formularios Creados ({customForms.length})
                                </h5>
                                {customForms.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleOpenCreateModal}
                                        className="text-xs font-black text-violet-700 dark:text-violet-400 hover:text-violet-800 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 border border-violet-200 dark:border-violet-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                                    >
                                        <Plus size={14} />
                                        Nuevo formulario
                                    </button>
                                )}
                            </div>

                            {customForms.length === 0 ? (
                                <div className="p-10 rounded-3xl border-2 border-dashed border-violet-300 dark:border-violet-500/30 bg-violet-50/40 dark:bg-transparent text-center space-y-3">
                                    <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-600/20 flex items-center justify-center mx-auto">
                                        <FileText size={26} />
                                    </div>
                                    <h6 className="font-black text-slate-900 dark:text-white text-lg">
                                        No has creado formularios personalizados todavía
                                    </h6>
                                    <p className="text-xs text-slate-600 dark:text-muted-foreground max-w-md mx-auto leading-relaxed">
                                        Crea uno con nombre y descripción específica (por ejemplo para <em>Eutanasia</em>, <em>Servicios Extras</em> o <em>Retiros Urgentes</em>) y genera su enlace con 1 clic.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleOpenCreateModal}
                                        className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Plus size={16} />
                                        Crear primer formulario personalizado
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {customForms.map((preset) => {
                                        const url = getPresetUrl(preset.id);
                                        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Hola, te comparto el formulario de ${preset.name}:\n\n${url}`)}`;

                                        return (
                                            <div
                                                key={preset.id}
                                                className="p-5 sm:p-6 rounded-3xl border-2 border-slate-200 dark:border-white/10 hover:border-violet-500/60 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-4 group"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="badge px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-violet-600 text-white shadow-sm">
                                                                {preset.name}
                                                            </span>
                                                            {preset.include_health_status && (
                                                                <span className="badge px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                                                                    🩺 Incluye Diagnóstico Clínico
                                                                </span>
                                                            )}
                                                            {preset.fields && Object.keys(preset.fields).length > 0 && (
                                                                <span className="badge px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 border border-violet-300 dark:border-violet-500/30">
                                                                    ⚙ Campos personalizados
                                                                </span>
                                                            )}
                                                            {preset.delivery_notice && (
                                                                <span className="badge px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                                                                    ⏱ {preset.delivery_notice}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {preset.description && (
                                                            <p className="text-xs sm:text-sm text-slate-700 dark:text-muted-foreground mt-2 leading-relaxed font-medium">
                                                                {preset.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end sm:self-start">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEditPreset(preset)}
                                                            className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 dark:text-violet-300 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 border-2 border-violet-200 dark:border-violet-500/30 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                            title="Editar este formulario"
                                                        >
                                                            <Pencil size={13} />
                                                            <span>Editar</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (confirm(`¿Estás seguro de eliminar el formulario "${preset.name}"?`)) {
                                                                    handleDeletePreset(preset.id);
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-muted-foreground dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-200"
                                                            title="Eliminar formulario"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Fases activas y servicio asociado con colores contrastados */}
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    {preset.associated_service_id && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-950 border-2 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40 shadow-xs">
                                                            <Sparkles size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                                            <span>Servicio fijado: <strong>{getAssociatedServiceName(preset.associated_service_id)}</strong></span>
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-muted-foreground tracking-wider ml-0.5">
                                                        Fases:
                                                    </span>
                                                    {Object.entries(preset.phases || {}).map(([key, isAct]) => {
                                                        const pLabels: Record<string, string> = {
                                                            familia: '1. Familia',
                                                            angel: '2. Ángel',
                                                            camino: '3. Camino',
                                                            recuerdos: '4. Recuerdos',
                                                        };
                                                        const pColors: Record<string, string> = {
                                                            familia: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
                                                            angel: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
                                                            camino: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
                                                            recuerdos: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
                                                        };
                                                        return (
                                                            <span
                                                                key={key}
                                                                className={`badge px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                                    isAct
                                                                        ? pColors[key] || 'bg-violet-100 text-violet-900 border-violet-300'
                                                                        : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/5 dark:text-slate-500 dark:border-white/5 line-through opacity-70'
                                                                }`}
                                                            >
                                                                {pLabels[key] || key}
                                                            </span>
                                                        );
                                                    })}
                                                </div>

                                                {/* Input de URL y botones */}
                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                                    <div className="relative flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={url}
                                                            className="w-full bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono text-violet-700 dark:text-violet-300 rounded-2xl py-2.5 pl-3.5 pr-10 outline-none select-all focus:border-violet-600 font-semibold"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyUrl(preset.id, url)}
                                                            className="flex-1 sm:flex-none px-4 py-2.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-600/20 dark:hover:bg-violet-600/30 text-violet-700 dark:text-violet-200 border-2 border-violet-200 dark:border-violet-500/30 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                                                        >
                                                            {copiedPresetId === preset.id ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={15} />}
                                                            <span>{copiedPresetId === preset.id ? 'Copiado' : 'Copiar'}</span>
                                                        </button>

                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
                                                        >
                                                            <Share2 size={15} />
                                                            <span>WhatsApp</span>
                                                        </a>

                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-transparent"
                                                            title="Probar formulario en nueva pestaña"
                                                        >
                                                            <ExternalLink size={15} />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>
                )}

            </div>

            {/* Barra inferior fija de guardado */}
            <div className="sticky bottom-3 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:pl-5 rounded-2xl border border-slate-200 bg-white/95 shadow-lg dark:border-white/10 dark:bg-slate-900/95 backdrop-blur">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-muted-foreground">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span>
                        {section === 'enlaces'
                            ? 'Los formularios personalizados se guardan al crearlos o editarlos. Este botón guarda el resto de la configuración.'
                            : 'Los cambios se aplican a todos los enlaces que compartas con las familias.'}
                    </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto justify-center bg-primary text-primary-foreground font-bold py-2.5 px-7 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 shadow-lg shadow-primary/20 cursor-pointer"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* Modal para crear formulario personalizado */}
            <AnimatePresence>
                {isCreatingPreset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-white/15 rounded-[2rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-600/25">
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {editingPresetId ? 'Editar Formulario Personalizado' : 'Crear Formulario Personalizado'}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-muted-foreground mt-0.5 font-medium">
                                            {editingPresetId
                                                ? 'Modifica el nombre, descripción, fases y nota de entrega de este formulario'
                                                : 'Configura nombre, descripción y fases para generar su enlace'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreatingPreset(false);
                                        setEditingPresetId(null);
                                    }}
                                    className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-muted-foreground dark:hover:text-white rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-transparent"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* Nombre */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                                        Nombre del Formulario *
                                    </label>
                                    <input
                                        type="text"
                                        value={presetName}
                                        onChange={e => setPresetName(e.target.value)}
                                        placeholder="Ej: Datos para proceso de Eutanasia, Servicios Extras..."
                                        maxLength={60}
                                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl py-3 px-4 text-sm font-semibold outline-none focus:border-violet-600 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-600/15 transition-all shadow-sm"
                                    />
                                </div>

                                {/* Descripción */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                                        Descripción para la Familia
                                    </label>
                                    <textarea
                                        value={presetDescription}
                                        onChange={e => setPresetDescription(e.target.value)}
                                        placeholder="Ej: Por favor completa la información médica y de contacto para coordinar el procedimiento con nuestro equipo."
                                        rows={3}
                                        maxLength={250}
                                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl py-2.5 px-4 text-sm font-medium outline-none focus:border-violet-600 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-600/15 transition-all resize-none shadow-sm"
                                    />
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                                        Aparecerá en la parte superior del formulario cuando el cliente abra el enlace.
                                    </p>
                                </div>

                                {/* Servicio o Plan Asociado al Formulario */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
                                            Servicio o Plan Asociado (Opcional)
                                        </label>
                                        {presetAssociatedServiceId && (
                                            <button
                                                type="button"
                                                onClick={() => setPresetAssociatedServiceId('')}
                                                className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                                            >
                                                Quitar servicio fijado
                                            </button>
                                        )}
                                    </div>
                                    <select
                                        value={presetAssociatedServiceId}
                                        onChange={e => setPresetAssociatedServiceId(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3 px-4 text-sm font-semibold outline-none focus:border-violet-600 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-600/15 transition-all shadow-sm cursor-pointer"
                                    >
                                        <option value="">-- Sin servicio predeterminado (selección libre) --</option>

                                        {allCatalogServices.some(s => s.is_special) && (
                                            <optgroup label="🩺 Servicios Especiales / Clínicos (Eutanasia, Exhumación...)">
                                                {allCatalogServices.filter(s => s.is_special).map(sv => (
                                                    <option key={`svc_${sv.id}`} value={`svc_${sv.id}`}>
                                                        {sv.name} {sv.price ? `(${formatCLP(sv.price)})` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}

                                        {allCatalogPlans.length > 0 && (
                                            <optgroup label="🕊️ Planes de Cremación">
                                                {allCatalogPlans.map(pl => (
                                                    <option key={`plan_${pl.id}`} value={`plan_${pl.id}`}>
                                                        {pl.name} {pl.price ? `(${formatCLP(pl.price)})` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}

                                        {allCatalogServices.some(s => !s.is_special) && (
                                            <optgroup label="📋 Otros Servicios del Catálogo">
                                                {allCatalogServices.filter(s => !s.is_special).map(sv => (
                                                    <option key={`svc_${sv.id}`} value={`svc_${sv.id}`}>
                                                        {sv.name} {sv.price ? `(${formatCLP(sv.price)})` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">
                                        {presetAssociatedServiceId ? (
                                            <span className="text-violet-700 dark:text-violet-300 font-bold flex items-center gap-1.5">
                                                <Sparkles size={13} className="shrink-0 text-amber-500" />
                                                La solicitud se registrará automáticamente con {getAssociatedServiceName(presetAssociatedServiceId)}, incluso si ocultas la fase de planes.
                                            </span>
                                        ) : (
                                            'Si este enlace es para un servicio específico (ej: Eutanasia o Exhumación), elígelo aquí para asociarlo directamente al formulario.'
                                        )}
                                    </p>
                                </div>

                                {/* Selector de Fases */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-2">
                                        Fases que verá la familia en este formulario
                                    </label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { key: 'familia', label: '1. Familia', desc: 'Datos del cliente y retiro' },
                                            { key: 'angel', label: '2. Ángel', desc: 'Mascota, peso y especie' },
                                            { key: 'camino', label: '3. Camino', desc: 'Planes y servicios' },
                                            { key: 'recuerdos', label: '4. Recuerdos', desc: 'Fotos y dedicatoria' },
                                        ].map(phase => {
                                            const isAct = presetPhases[phase.key as keyof PhaseConfig];
                                            return (
                                                <button
                                                    key={phase.key}
                                                    type="button"
                                                    onClick={() => setPresetPhases(prev => ({
                                                        ...prev,
                                                        [phase.key]: !prev[phase.key as keyof PhaseConfig]
                                                    }))}
                                                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                                                        isAct
                                                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-slate-900 dark:text-white shadow-md ring-2 ring-violet-600/20'
                                                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-xs font-black ${isAct ? 'text-violet-950 dark:text-violet-200' : 'text-slate-700 dark:text-slate-400'}`}>
                                                            {phase.label}
                                                        </span>
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                                            isAct ? 'bg-violet-600 text-white shadow-sm' : 'border-2 border-slate-300 dark:border-white/20 bg-white dark:bg-slate-800'
                                                        }`}>
                                                            {isAct && <Check size={12} strokeWidth={3} />}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[11px] mt-1 truncate ${isAct ? 'text-violet-900 dark:text-violet-300 font-bold' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>
                                                        {phase.desc}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Selector / Editor de Campos de este formulario */}
                                <div className="rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40 p-4 sm:p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="p-1.5 rounded-lg bg-violet-600 text-white">
                                                    <SlidersHorizontal size={14} />
                                                </span>
                                                <h5 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                    Campos de este Formulario
                                                </h5>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-muted-foreground mt-0.5 font-medium">
                                                Configura qué datos solicitar a la familia y cuáles son obligatorios para este formulario.
                                            </p>
                                        </div>

                                        {/* Pestañas para alternar entre Familia y Mascota */}
                                        <div className="flex items-center bg-slate-200/80 dark:bg-white/10 p-1 rounded-xl self-start sm:self-auto shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setPresetSectionTab('owner')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    presetSectionTab === 'owner'
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <User size={13} />
                                                <span>Familia ({presetFields.filter(f => f.section === 'owner' && f.visible).length})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPresetSectionTab('pet')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    presetSectionTab === 'pet'
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <PawPrint size={13} />
                                                <span>Ángel ({presetFields.filter(f => f.section === 'pet' && f.visible).length})</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tabla de campos */}
                                    <div className="space-y-1">
                                        <div className={`${FIELD_GRID} pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground border-b border-slate-200 dark:border-white/5`}>
                                            <span>Nombre del Campo</span>
                                            <span className="text-center">Mostrar</span>
                                            <span className="text-center">Obligatorio</span>
                                        </div>

                                        <div className="divide-y divide-slate-200 dark:divide-white/5">
                                            {/* Campos fijos del sistema */}
                                            {FIXED_FIELDS[presetSectionTab].map(fixedName => (
                                                <div key={fixedName} className={`${FIELD_GRID} py-2.5`}>
                                                    <span className="flex items-center gap-2 min-w-0 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                        <Lock size={12} className="shrink-0 text-violet-600 dark:text-violet-400" />
                                                        <span className="truncate">{fixedName}</span>
                                                    </span>
                                                    <span className="col-span-2 justify-self-center rounded-full bg-slate-200/80 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        Siempre obligatorio
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Campos configurables */}
                                            {presetFields
                                                .filter(f => f.section === presetSectionTab)
                                                .map(f => {
                                                    const status = !f.visible ? 'Oculto' : f.required ? 'Obligatorio' : 'Opcional';
                                                    const statusClass = !f.visible
                                                        ? 'text-slate-400 dark:text-slate-500'
                                                        : f.required
                                                            ? 'text-violet-700 dark:text-violet-400 font-bold'
                                                            : 'text-emerald-700 dark:text-emerald-400 font-bold';
                                                    return (
                                                        <div key={f.key} className={`${FIELD_GRID} py-2.5`}>
                                                            <div className="min-w-0 pr-2">
                                                                <p className={`text-xs sm:text-sm font-semibold break-words ${f.visible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                                                                    {f.label}
                                                                </p>
                                                                <p className={`text-[10px] mt-0.5 ${statusClass}`}>
                                                                    {status}
                                                                </p>
                                                            </div>
                                                            <div className="flex justify-center">
                                                                <Toggle
                                                                    label={`Mostrar ${f.label}`}
                                                                    checked={f.visible}
                                                                    onChange={v => updatePresetField(f.key, { visible: v })}
                                                                />
                                                            </div>
                                                            <div className="flex justify-center">
                                                                <Toggle
                                                                    label={`${f.label} obligatorio`}
                                                                    checked={f.required}
                                                                    disabled={!f.visible}
                                                                    onChange={v => updatePresetField(f.key, { required: v })}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>

                                {/* Mensaje de bienvenida específico para este formulario (opcional) */}
                                <div className="rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40 p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                                Personalizar mensaje de bienvenida para este formulario
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-muted-foreground font-medium">
                                                Si lo activas, este enlace usará su propio título y mensaje de bienvenida en lugar del general.
                                            </p>
                                        </div>
                                        <Toggle
                                            label="Personalizar mensaje de bienvenida para este formulario"
                                            checked={presetWelcomeCustom}
                                            onChange={setPresetWelcomeCustom}
                                        />
                                    </div>

                                    {presetWelcomeCustom && (
                                        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                                                        Título del Modal
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={presetWelcomeTitle}
                                                        onChange={e => setPresetWelcomeTitle(e.target.value)}
                                                        placeholder="Ej: Acompañamiento en Eutanasia"
                                                        maxLength={60}
                                                        className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-violet-600 font-semibold shadow-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                                                        Texto del Botón
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={presetWelcomeButton}
                                                        onChange={e => setPresetWelcomeButton(e.target.value)}
                                                        placeholder="Continuar"
                                                        maxLength={30}
                                                        className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-violet-600 font-semibold shadow-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                                                    Mensaje para la Familia
                                                </label>
                                                <textarea
                                                    value={presetWelcomeMessage}
                                                    onChange={e => setPresetWelcomeMessage(e.target.value)}
                                                    placeholder="Ej: En este proceso tan sensible, queremos brindarte toda la tranquilidad y cuidado que merecen..."
                                                    rows={3}
                                                    maxLength={350}
                                                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-violet-600 font-medium resize-none shadow-xs"
                                                />
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                                    Usa <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-bold">{"{empresa}"}</code> para incluir el nombre de tu empresa en negrita.
                                                </p>
                                            </div>

                                            {/* Botón "Ver video" de este formulario */}
                                            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/5">
                                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                    Botón «Ver video»
                                                </label>
                                                <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-white/10 text-xs font-bold">
                                                    {([['inherit', 'Igual que el general'], ['show', 'Mostrar'], ['hide', 'No mostrar']] as const).map(([id, label]) => (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => setPresetVideoMode(id)}
                                                            disabled={id === 'show' && !videoAllowed}
                                                            className={`px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${presetVideoMode === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {presetVideoMode === 'show' && (
                                                    <div className="space-y-2">
                                                        <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                                                            {presetVideo ? 'Este formulario usa su propio video.' : welcomeModal.video ? 'Sin video propio se usa el video general. Puedes elegir otro solo para este formulario:' : 'Elige el video de este formulario:'}
                                                        </p>
                                                        <WelcomeVideoField video={presetVideo} onChange={setPresetVideo} allowed={videoAllowed} onError={msg => showToast(msg, 'error')} />
                                                        <div>
                                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">¿Cuándo se muestra?</label>
                                                            <div className="inline-flex flex-wrap p-1 rounded-xl bg-slate-200/80 dark:bg-white/10 text-xs font-bold">
                                                                {([['inherit', `Igual que el general (${welcomeModal.video_position === 'end' ? 'al final' : 'al inicio'})`], ['start', 'Al inicio'], ['end', 'Al final']] as const).map(([id, label]) => (
                                                                    <button
                                                                        key={id}
                                                                        type="button"
                                                                        onClick={() => setPresetVideoPosition(id)}
                                                                        className={`px-3 py-1.5 rounded-lg cursor-pointer ${presetVideoPosition === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={presetVideoButton}
                                                            onChange={e => setPresetVideoButton(e.target.value)}
                                                            placeholder={`Texto del botón (ej: ${welcomeModal.video_button_text || 'Ver video'})`}
                                                            maxLength={40}
                                                            className="w-full max-w-xs bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-violet-600 font-semibold"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Plazo de entrega específico */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1.5">
                                        Plazo o Nota de Entrega Específico (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={presetDeliveryNotice}
                                        onChange={e => setPresetDeliveryNotice(e.target.value)}
                                        placeholder="Ej: Entrega en 48 horas hábiles (o dejar vacío para usar el general)"
                                        maxLength={200}
                                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl py-3 px-4 text-xs sm:text-sm font-medium outline-none focus:border-violet-600 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-600/15 transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-slate-100 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreatingPreset(false);
                                        setEditingPresetId(null);
                                    }}
                                    className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 border-2 border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveNewPreset}
                                    disabled={savingPreset}
                                    className="disabled:opacity-60 px-7 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                >
                                    {savingPreset ? 'Subiendo video…' : editingPresetId ? 'Guardar Cambios' : 'Crear y generar enlace'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Previsualización de Condolencias */}
            {previewWelcomeModal && tenantData && (
                <CondolenceModal
                    isOpen
                    onClose={() => setPreviewWelcomeModal(null)}
                    tenant={tenantData as any}
                    config={previewWelcomeModal}
                />
            )}
        </div>
    );
}

// Contenedor modular para cada fase
function PhaseSectionContainer({
    id,
    num,
    name,
    title,
    description,
    icon: Icon,
    isActive,
    onToggle,
    children
}: {
    id: PhaseId;
    num: number;
    name: string;
    title: string;
    description: string;
    icon: React.ElementType;
    isActive: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <section className={`space-y-4 rounded-3xl transition-all ${!isActive ? 'opacity-75' : ''}`}>
            {/* Tarjeta de cabecera de la fase con switch maestro */}
            <div className={`glass-card p-5 sm:p-6 rounded-3xl border transition-all ${
                isActive
                    ? 'border-white/10 bg-gradient-to-r from-white/5 to-transparent'
                    : 'border-amber-500/20 bg-amber-500/5'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0 text-white">
                            <Icon size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                    Fase {num}
                                </span>
                                <span className="text-white/30 text-xs">·</span>
                                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isActive
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                    {isActive ? 'Visible en formulario' : 'Fase desactivada'}
                                </span>
                            </div>
                            <h4 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                                {name} · {title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <span className="text-xs font-semibold text-white/70">
                            {isActive ? 'Mostrar fase' : 'Ocultar fase'}
                        </span>
                        <Toggle
                            label={`Mostrar fase ${name} en el formulario`}
                            checked={isActive}
                            onChange={onToggle}
                        />
                    </div>
                </div>

                {!isActive && (
                    <div className="mt-4 pt-3 border-t border-amber-500/15 flex items-center gap-2 text-xs text-amber-300">
                        <Info size={14} className="shrink-0" />
                        <span>Esta fase está desactivada. La familia no verá este paso y pasará directamente a las fases siguientes. Puedes configurar sus opciones aquí si decides activarla en el futuro.</span>
                    </div>
                )}
            </div>

            {/* Configuración interna de la fase */}
            <div className="space-y-6">
                {children}
            </div>
        </section>
    );
}

function TierLabel({ children }: { children: React.ReactNode }) {
    return <span className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 ml-1">{children}</span>;
}

function RemoveTierButton({ idx, onClick, className = '' }: { idx: number; onClick: () => void; className?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Eliminar rango ${idx + 1}`}
            className={`${className} h-[42px] w-10 shrink-0 items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer`}
        >
            <Trash2 size={16} />
        </button>
    );
}

function PriceToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Toggle label={title} checked={checked} onChange={onChange} />
        </div>
    );
}

function FormInputLite({ value, onChange, placeholder, maxLength, inputMode, hint, ariaLabel, prefix, suffix }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength?: number;
    inputMode?: 'decimal' | 'numeric';
    hint?: string;
    ariaLabel?: string;
    prefix?: string;
    suffix?: string;
}) {
    return (
        <div>
            <div className="relative">
                {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-white/40">{prefix}</span>}
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    inputMode={inputMode}
                    aria-label={ariaLabel}
                    className={`w-full min-w-0 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-sm dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-primary/50 dark:focus:ring-0 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-9' : 'pr-3'}`}
                />
                {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-white/40">{suffix}</span>}
            </div>
            {hint && <p className="text-[10px] text-muted-foreground mt-1 ml-1">{hint}</p>}
        </div>
    );
}

/** Inicio = botón en el mensaje de bienvenida; final = botón en la pantalla tras enviar el formulario. */
function VideoPositionPicker({ value, onChange }: { value: 'start' | 'end'; onChange: (v: 'start' | 'end') => void }) {
    const options = [
        ['start', 'Al inicio', 'En el mensaje de bienvenida'],
        ['end', 'Al final', 'Al confirmar el envío'],
    ] as const;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map(([id, label, hint]) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id)}
                    className={`text-left rounded-xl border-2 px-3 py-2 cursor-pointer transition-colors ${value === id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15' : 'border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-400'}`}
                >
                    <span className="block text-sm font-bold text-indigo-950 dark:text-white">{label}</span>
                    <span className="block text-[11px] text-indigo-900/70 dark:text-muted-foreground">{hint}</span>
                </button>
            ))}
        </div>
    );
}
