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
    ChevronUp,
    ChevronDown,
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
    HeartHandshake,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { apiRequest } from '@/lib/tenant/api';
import CondolenceModal from '@/components/public/CondolenceModal';
import WelcomeVideoField, { uploadPendingVideo } from './WelcomeVideoField';
import PlanWeightPriceTable, { type PlanWeightRow } from './PlanWeightPriceTable';
import PriceListsSection, { PRICE_LIST_STATUS, type PriceList } from './PriceListsSection';
import TierIconField from './TierIconField';
import TransportSection from './TransportSection';
import {
    formatCLP,
    MAX_FIELD_LABEL,
    type PhaseConfig,
    type MemoriesConfig,
    type CustomFormPreset,
    type FormFieldKey,
    type FormFieldSetting,
    type WelcomeModalConfig,
    type FormVideo,
    DEFAULT_PHASES,
    DEFAULT_MEMORIES_CONFIG,
    DEFAULT_WELCOME_MODAL_CONFIG,
    NEVER_REQUIRED,
    PHASE_DEFAULTS,
    PHASE_KEYS,
    MAX_PHASE_NAME,
    MAX_PHASE_PHRASE,
    HUELLA_TEMPLATE,
    cleanPhaseOrder,
    type PhaseKey,
    type PhaseLabels,
    type FormTemplate,
} from '@/lib/publicFormConfig';

// Configuración del formulario público (el enlace que se envía a la familia).
// Organizado por fases: Familia, Ángel, Camino, Recuerdos.
// Cada fase se puede mostrar u ocultar, y configurar a medida.

const MAX_TIERS = 20;

// Columnas de campos: nombre del campo | Mostrar | Obligatorio
const FIELD_GRID = 'grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem] items-center gap-x-2';

// Rangos de peso en escritorio: nombre | desde | hasta | recargo | eliminar
const TIER_GRID_MD = 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_7.5rem]';
// Con la tabla «precio por plan y peso» el rango no lleva recargo.
const TIER_GRID_MD_TABLE = 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem]';

const TIER_PLACEHOLDERS = ['Mini', 'Pequeño', 'Mediano', 'Grande', 'Extra grande', 'Gigante'];

interface FieldRow {
    key: string;
    section: 'owner' | 'pet';
    label: string;
    visible: boolean;
    required: boolean;
    /** Nombre propio en un formulario personalizado (vacío = el de siempre). */
    customLabel?: string;
}

interface TierRow {
    label: string;
    min_weight: string;
    max_weight: string;
    price: string;
    icon_url?: string;
    examples?: string;
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
    id?: number;
    label: string | null;
    min_weight: number | null;
    max_weight: number | null;
    price: number | null;
    icon_url?: string | null;
    examples?: string | null;
}

const fmtKg = (n: number) => String(n).replace('.', ',');
const parseKg = (v: string) => parseFloat(v.replace(',', '.'));

const toTierRows = (rules: SavedTier[]): TierRow[] => rules.map(r => ({
    label: r.label || '',
    min_weight: fmtKg(r.min_weight ?? 0),
    max_weight: r.max_weight != null ? fmtKg(r.max_weight) : '',
    price: r.price != null ? String(r.price) : '0',
    icon_url: r.icon_url || '',
    examples: r.examples || '',
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
type PresetModalTab = 'general' | 'pasos' | 'bienvenida';

const SECTIONS: { id: SectionId; name: string; hint: string; icon: React.ElementType }[] = [
    { id: 'enlaces', name: 'Mis Formularios', hint: 'Principal, plantillas y a medida', icon: FileText },
    { id: 'fases', name: 'Pasos y Campos', hint: 'Estructura del formulario base', icon: Layers },
    { id: 'pesos', name: 'Pesos y Tarifas', hint: 'Rangos, precios y traslados', icon: Scale },
    { id: 'bienvenida', name: 'Bienvenida y Avisos', hint: 'Mensaje inicial, video y plazo', icon: HeartHandshake },
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

// Qué contiene cada fase (editor de formularios personalizados)
const PHASE_EDITOR_DESC: Record<PhaseKey, string> = {
    familia: 'Datos de contacto y retiro',
    angel: 'Mascota, especie y tamaño',
    camino: 'Planes y servicios',
    recuerdos: 'Fotos y dedicatoria',
};

export function PublicFormTab() {
    const { showToast } = useToast();
    const { tenantData, refreshTenantData } = useTenant();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Sección visible y, dentro de «Pasos y Campos», la fase que se edita
    const [section, setSection] = useState<SectionId>('enlaces');
    const [selectedPhase, setSelectedPhase] = useState<PhaseId>('familia');
    const [presetModalTab, setPresetModalTab] = useState<PresetModalTab>('general');

    // Fases activas / mostradas
    const [phases, setPhases] = useState<PhaseConfig>(DEFAULT_PHASES);

    // Plazo o nota de entrega de cenizas (general)
    const [deliveryNotice, setDeliveryNotice] = useState<string>('');

    // Formularios específicos personalizados (Presets) y cuál es el formulario oficial en uso
    const [customForms, setCustomForms] = useState<CustomFormPreset[]>([]);
    const [officialFormId, setOfficialFormId] = useState<string | null>(null);
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
    // Orden y nombre propio de las fases de este formulario (ids fijos)
    const [presetPhaseOrder, setPresetPhaseOrder] = useState<PhaseKey[]>([...PHASE_KEYS]);
    const [presetPhaseLabels, setPresetPhaseLabels] = useState<PhaseLabels>({});
    // Plantillas de Vinzer (Admin → Configuración → Plantillas de formulario); sin respuesta = Huella
    const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([HUELLA_TEMPLATE]);
    // Plantilla desde la que se está creando el formulario ('' = en blanco / clásico)
    const [presetTemplateId, setPresetTemplateId] = useState('');
    useEffect(() => {
        apiRequest('/api/internal/maintenance/form-templates')
            .then((d: { templates?: FormTemplate[] }) => { if (Array.isArray(d?.templates)) setFormTemplates(d.templates); })
            .catch(() => { /* se queda con la plantilla incluida */ });
    }, []);
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
    // Tabla de precios (rangos de peso) del formulario personalizado: '' = la del principal
    const [presetPriceListId, setPresetPriceListId] = useState<string>('');
    const [allCatalogServices, setAllCatalogServices] = useState<SpecialService[]>([]);
    const [allCatalogPlans, setAllCatalogPlans] = useState<{ id: number; name: string; price: number; is_active?: boolean }[]>([]);

    // Campos de Familia y Ángel
    const [fields, setFields] = useState<FieldRow[]>([]);

    // Tramos de peso (Ángel / Camino)
    const [tiers, setTiers] = useState<TierRow[]>([]);

    // Camino (Servicios especiales y precios)
    const [showPrices, setShowPrices] = useState(false);
    const [showServicePrices, setShowServicePrices] = useState(false);
    const [showPlanRequest, setShowPlanRequest] = useState(true);
    // Precio por peso: recargo por rango ('surcharge') o precio de cada plan por rango ('table')
    const [weightMode, setWeightMode] = useState<'surcharge' | 'table'>('surcharge');
    const [tablePlans, setTablePlans] = useState<PlanWeightRow[]>([]);
    // Precio por plan, en el orden de los rangos ('' = precio base del plan)
    const [tableValues, setTableValues] = useState<Record<number, string[]>>({});
    const [priceListsKey, setPriceListsKey] = useState(0);
    // Tabla de precios del formulario principal (null = General)
    const [formPriceListId, setFormPriceListId] = useState<number | null>(null);
    const [tiersAccordionOpen, setTiersAccordionOpen] = useState(false);
    const [priceListOptions, setPriceListOptions] = useState<PriceList[]>([]);
    useEffect(() => {
        apiRequest('/api/internal/price-lists')
            .then((ls: PriceList[]) => setPriceListOptions(Array.isArray(ls) ? ls : []))
            .catch(() => setPriceListOptions([]));
    }, [priceListsKey]);
    const priceListName = (id?: number | null) => {
        if (!id) return 'General';
        const pl = priceListOptions.find(p => p.id === id);
        return pl ? pl.name : 'Tabla eliminada (General)';
    };
    const [specials, setSpecials] = useState<SpecialService[]>([]);
    const [savedSpecialVisibility, setSavedSpecialVisibility] = useState<Record<number, boolean>>({});
    const [newSpecial, setNewSpecial] = useState<typeof EMPTY_SPECIAL | null>(null);
    const [creatingSpecial, setCreatingSpecial] = useState(false);

    // Recuerdos
    const [memories, setMemories] = useState<MemoriesConfig>(DEFAULT_MEMORIES_CONFIG);

    useEffect(() => {
        (async () => {
            try {
                const [cfg, rules, weightTable] = await Promise.all([
                    apiRequest('/api/internal/maintenance/form-config'),
                    apiRequest('/api/internal/maintenance/weight-pricing'),
                    apiRequest('/api/internal/maintenance/plan-weight-prices').catch(() => null),
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
                const loadedCustomForms: CustomFormPreset[] = Array.isArray(cfg.custom_forms) ? cfg.custom_forms : [];
                setCustomForms(loadedCustomForms);
                const offId = cfg.official_form || (tenantData?.form_config as { official_form?: string | null } | null)?.official_form || null;
                setOfficialFormId(offId);
                if (offId) {
                    const found = loadedCustomForms.find(f => f.id === offId);
                    if (found) {
                        const firstOrderedPhase = cleanPhaseOrder(found.phase_order)[0];
                        if (firstOrderedPhase) {
                            setSelectedPhase(firstOrderedPhase);
                        }
                    }
                }
                setFields(cfg.fields || []);
                setShowPrices(!!cfg.show_weight_prices);
                setShowPlanRequest(cfg.show_plan_request_button !== false);
                setShowServicePrices(!!cfg.show_service_prices);
                if (cfg.memories) {
                    setMemories({ ...DEFAULT_MEMORIES_CONFIG, ...cfg.memories });
                }
                setTiers(toTierRows(rules as SavedTier[]));
                setWeightMode(cfg.weight_pricing_mode === 'table' ? 'table' : 'surcharge');
                setFormPriceListId(typeof cfg.price_list_id === 'number' ? cfg.price_list_id : null);
                if (weightTable) {
                    const rows = ((weightTable.plans || []) as (PlanWeightRow & { prices: Record<string, number> })[])
                        .filter(p => p.is_active !== false);
                    setTablePlans(rows);
                    setTableValues(Object.fromEntries(rows.map(p => [
                        p.plan_id,
                        (rules as SavedTier[]).map(r => {
                            const v = r.id != null ? p.prices?.[String(r.id)] : undefined;
                            return v != null ? String(Math.round(v)) : '';
                        }),
                    ])));
                }

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

    // Formulario activo/oficial en uso (si eligió uno personalizado como "Formulario Eterno", se usa ese; si no, el principal)
    const activePreset = officialFormId ? customForms.find(f => f.id === officialFormId) || null : null;
    const activeFormName = activePreset ? activePreset.name : 'Formulario Principal (Predeterminado)';
    const activePhaseOrder: PhaseKey[] = activePreset ? cleanPhaseOrder(activePreset.phase_order) : [...PHASE_KEYS];
    const activePhases: PhaseConfig = activePreset
        ? { ...DEFAULT_PHASES, ...(activePreset.phases || {}) }
        : phases;
    const activeOrderedPhases: PhaseMeta[] = activePhaseOrder.map((key, idx) => {
        const base = PHASES_LIST.find(p => p.id === key)!;
        const customName = activePreset?.phase_labels?.[key]?.name?.trim();
        const customPhrase = activePreset?.phase_labels?.[key]?.phrase?.trim();
        return {
            ...base,
            num: idx + 1,
            name: customName || base.name,
            description: customPhrase || base.description,
        };
    });
    const activeFields: FieldRow[] = activePreset
        ? fields.map(f => {
            const ov = activePreset.fields?.[f.key as FormFieldKey];
            if (ov) {
                const vis = Boolean(ov.visible);
                return {
                    ...f,
                    visible: vis,
                    required: Boolean(ov.required) && vis,
                    customLabel: ov.label || '',
                };
            }
            if (f.key === 'healthStatus' && activePreset.include_health_status) {
                return { ...f, visible: true, required: true };
            }
            return f;
        })
        : fields;

    const togglePhase = (phaseKey: PhaseId) => {
        const isCurrentlyActive = activePhases[phaseKey];
        if (isCurrentlyActive) {
            const activeCount = Object.values(activePhases).filter(Boolean).length;
            if (activeCount <= 1) {
                showToast('Debes mantener al menos una fase activa en el formulario', 'error');
                return;
            }
        }
        if (activePreset) {
            const nextPhases = { ...activePhases, [phaseKey]: !activePhases[phaseKey] };
            setCustomForms(prev => prev.map(cf => (cf.id === activePreset.id ? { ...cf, phases: nextPhases } : cf)));
        } else {
            setPhases(prev => ({ ...prev, [phaseKey]: !prev[phaseKey] }));
        }
    };

    const updateField = (key: string, patch: Partial<FieldRow>) => {
        if (activePreset) {
            setCustomForms(prev => prev.map(cf => {
                if (cf.id !== activePreset.id) return cf;
                const currentField = activeFields.find(f => f.key === key);
                if (!currentField) return cf;
                const next = { ...currentField, ...patch };
                if (!next.visible) next.required = false;
                if (patch.required) next.visible = true;
                const nextFieldsMap: Partial<Record<FormFieldKey, FormFieldSetting>> = { ...(cf.fields || {}) };
                nextFieldsMap[key as FormFieldKey] = {
                    visible: next.visible,
                    required: next.required && next.visible,
                    ...(next.customLabel?.trim() ? { label: next.customLabel.trim().slice(0, MAX_FIELD_LABEL) } : {}),
                };
                return {
                    ...cf,
                    fields: nextFieldsMap,
                    include_health_status: key === 'healthStatus' ? next.visible : cf.include_health_status,
                };
            }));
        } else {
            setFields(prev => prev.map(f => {
                if (f.key !== key) return f;
                const next = { ...f, ...patch };
                if (!next.visible) next.required = false; // oculto nunca es obligatorio
                if (patch.required) next.visible = true;
                return next;
            }));
        }
    };

    const updateTier = (idx: number, patch: Partial<TierRow>) =>
        setTiers(prev => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

    const addTier = () => {
        if (tiers.length >= MAX_TIERS) return;
        setTiers(prev => [...prev, { label: '', min_weight: prev.length === 0 ? '0' : '', max_weight: '', price: '0' }]);
        setTableValues(prev => Object.fromEntries(Object.entries(prev).map(([k, row]) => [k, [...row, '']])));
    };

    // La columna del rango quitado sale también de la tabla por plan.
    const removeTier = (idx: number) => {
        setTiers(prev => prev.filter((_, i) => i !== idx));
        setTableValues(prev => Object.fromEntries(Object.entries(prev).map(([k, row]) => [k, row.filter((_, i) => i !== idx)])));
    };

    // Mover un rango arriba/abajo: su columna de la tabla por plan se mueve con él.
    const moveTier = (idx: number, dir: -1 | 1) => {
        const j = idx + dir;
        if (j < 0 || j >= tiers.length) return;
        const swap = <T,>(list: T[]) => {
            const next = [...list];
            [next[idx], next[j]] = [next[j], next[idx]];
            return next;
        };
        setTiers(prev => swap(prev));
        setTableValues(prev => Object.fromEntries(Object.entries(prev).map(([k, row]) => {
            const full = [...row];
            while (full.length < tiers.length) full.push('');
            return [k, swap(full)];
        })));
    };

    const updateTableCell = (planId: number, tierIdx: number, value: string) =>
        setTableValues(prev => {
            const row = [...(prev[planId] || [])];
            while (row.length < tiers.length) row.push('');
            row[tierIdx] = value;
            return { ...prev, [planId]: row };
        });

    const fillRowWithBase = (planId: number) => {
        const plan = tablePlans.find(p => p.plan_id === planId);
        if (!plan) return;
        const base = String(Math.round(plan.price || 0));
        setTableValues(prev => ({
            ...prev,
            [planId]: tiers.map((_, i) => (prev[planId]?.[i] || '').trim() || base),
        }));
    };

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

    const validateTiers = (tiers: TierRow[]): string | null => {
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
                show_plan_request_button: showPlanRequest,
                weight_pricing_mode: weightMode,
                price_list_id: formPriceListId,
                delivery_notice: deliveryNotice.trim() || null,
                welcome_modal: wm,
                custom_forms: forms,
                memories,
            }),
        });
        // Navbar > Compartir lista los enlaces propios desde el bootstrap.
        refreshTenantData().catch(() => { });
        // «Enlaces oficiales» lista los formularios: que vea el recién creado / renombrado
        queryClient.invalidateQueries({ queryKey: ['official-links'] });
    };

    const handleSave = async () => {
        // Los rangos se guardan ordenados por «desde» (un rango agregado al final, p. ej.
        // 0 – 0,9, pasa a su lugar); las columnas de la tabla por plan se mueven con ellos.
        const minOf = (t: TierRow) => {
            const v = parseKg(t.min_weight || '');
            return isNaN(v) ? Infinity : v;
        };
        const order = tiers.map((_, i) => i).sort((a, b) => minOf(tiers[a]) - minOf(tiers[b]) || a - b);
        const sortedTiers = order.map(i => tiers[i]);
        const sortedValues: Record<number, string[]> = Object.fromEntries(
            Object.entries(tableValues).map(([k, row]) => [k, order.map(i => row[i] ?? '')])
        );
        if (order.some((i, pos) => i !== pos)) {
            setTiers(sortedTiers);
            setTableValues(sortedValues);
        }
        const tierError = validateTiers(sortedTiers);
        if (tierError) {
            showToast(tierError, 'error');
            return;
        }
        if (weightMode === 'table' && tiers.length === 0) {
            showToast('Para cobrar por plan y peso agrega al menos un rango de peso', 'error');
            return;
        }
        setSaving(true);
        try {
            await putFormConfig(customForms);
            const saved = await apiRequest('/api/internal/maintenance/weight-pricing', {
                method: 'PUT',
                body: JSON.stringify({
                    tiers: sortedTiers.map(t => ({
                        label: t.label.trim() || null,
                        min_weight: parseKg(t.min_weight),
                        max_weight: t.max_weight.trim() ? parseKg(t.max_weight) : null,
                        price: parseFloat(t.price || '0') || 0,
                        icon_url: t.icon_url || null,
                        examples: (t.examples || '').trim() || null,
                    })),
                }),
            });
            setTiers(toTierRows(saved as SavedTier[]));
            // Tabla por plan: las columnas siguen la posición de los rangos guardados.
            if (tablePlans.length > 0) {
                const savedTiers = saved as SavedTier[];
                await apiRequest('/api/internal/maintenance/plan-weight-prices', {
                    method: 'PUT',
                    body: JSON.stringify({
                        plans: tablePlans.map(p => ({
                            plan_id: p.plan_id,
                            prices: Object.fromEntries(savedTiers
                                .map((tier, i) => [String(tier.id), (sortedValues[p.plan_id]?.[i] || '').trim()] as const)
                                .filter(([, v]) => v !== '')
                                .map(([k, v]) => [k, parseFloat(v)])),
                        })),
                    }),
                });
            }
            const changed = specials.filter(sv => (sv.show_in_form !== false) !== savedSpecialVisibility[sv.id]);
            await Promise.all(changed.map(sv => apiRequest(`/api/internal/services/${sv.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ show_in_form: sv.show_in_form !== false }),
            })));
            setSavedSpecialVisibility(Object.fromEntries(specials.map(sv => [sv.id, sv.show_in_form !== false])));
            showToast('Configuración del formulario guardada con éxito', 'success');
            setPriceListsKey(k => k + 1);
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
        setPresetTemplateId('');
        setPresetName('');
        setPresetDescription('');
        setPresetAssociatedServiceId('');
        setPresetPriceListId('');
        setPresetPhases({ familia: true, angel: true, camino: true, recuerdos: true });
        setPresetPhaseOrder([...PHASE_KEYS]);
        setPresetPhaseLabels({});
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
        setPresetModalTab('general');
        setIsCreatingPreset(true);
    };

    // «Formulario Huella»: abre el editor ya armado con la plantilla (se puede ajustar antes de guardar)
    const handleCreateFromTemplate = (t: FormTemplate) => {
        handleOpenCreateModal();
        setPresetTemplateId(t.id);
        const taken = new Set(customForms.map(f => f.name.trim().toLowerCase()));
        let name = t.name;
        for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${t.name} ${n}`;
        setPresetName(name);
        setPresetDescription(t.description || '');
        setPresetPhases({ ...DEFAULT_PHASES, ...(t.phases || {}) });
        setPresetPhaseOrder(cleanPhaseOrder(t.phase_order));
        setPresetPhaseLabels({ ...(t.phase_labels || {}) });
        setPresetFields(fields.map(f => {
            const o = t.fields?.[f.key as FormFieldKey];
            return o ? { ...f, visible: o.visible, required: o.required && o.visible, customLabel: '' } : { ...f, customLabel: '' };
        }));
    };

    const movePresetPhase = (key: PhaseKey, dir: -1 | 1) => {
        setPresetPhaseOrder(prev => {
            const i = prev.indexOf(key);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= prev.length) return prev;
            const next = [...prev];
            [next[i], next[j]] = [next[j], next[i]];
            // «Camino» no puede quedar antes de «Ángel»: ahí se elige el tamaño que define los precios
            if (next.indexOf('camino') < next.indexOf('angel')) {
                showToast('«Camino» debe ir después de «Ángel»: el tamaño elegido define los precios', 'error');
                return prev;
            }
            return next;
        });
    };

    const setPresetPhaseLabel = (key: PhaseKey, part: 'name' | 'phrase', value: string) => {
        setPresetPhaseLabels(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [part]: value } }));
    };

    const handleStartEditPreset = (preset: CustomFormPreset) => {
        setEditingPresetId(preset.id);
        setPresetName(preset.name);
        setPresetDescription(preset.description || '');
        setPresetAssociatedServiceId(preset.associated_service_id || '');
        setPresetPriceListId(preset.price_list_id ? String(preset.price_list_id) : '');
        setPresetPhases({ familia: true, angel: true, camino: true, recuerdos: true, ...(preset.phases || {}) });
        setPresetPhaseOrder(cleanPhaseOrder(preset.phase_order));
        setPresetPhaseLabels({ ...(preset.phase_labels || {}) });
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
                    customLabel: override.label || '',
                };
            }
            if (f.key === 'healthStatus' && preset.include_health_status) {
                return { ...f, visible: true, required: true };
            }
            return { ...f, customLabel: '' };
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

        setPresetModalTab('general');
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
                ...(f.customLabel?.trim() ? { label: f.customLabel.trim().slice(0, MAX_FIELD_LABEL) } : {}),
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
            price_list_id: presetPriceListId ? Number(presetPriceListId) : null,
            phases: presetPhases,
            // Orden clásico = null (se ve exactamente como el formulario principal)
            phase_order: presetPhaseOrder.join() === PHASE_KEYS.join() ? null : presetPhaseOrder,
            phase_labels: (() => {
                const out: PhaseLabels = {};
                PHASE_KEYS.forEach(k => {
                    const name = presetPhaseLabels[k]?.name?.trim().slice(0, MAX_PHASE_NAME);
                    const phrase = presetPhaseLabels[k]?.phrase?.trim().slice(0, MAX_PHASE_PHRASE);
                    if (name || phrase) out[k] = { ...(name ? { name } : {}), ...(phrase ? { phrase } : {}) };
                });
                return Object.keys(out).length ? out : null;
            })(),
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
        setPresetPriceListId('');
        setPresetPhases({ familia: true, angel: true, camino: true, recuerdos: true });
        setPresetPhaseOrder([...PHASE_KEYS]);
        setPresetPhaseLabels({});
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

    const activeBasePhasesCount = Object.values(activePhases).filter(Boolean).length;
    const currentPhaseMeta = activeOrderedPhases.find(p => p.id === selectedPhase) || activeOrderedPhases[0];
    const activeFormUrl = getPresetUrl(activePreset?.id);

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Encabezado Principal con Resumen y Acciones Rápidas */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-50 via-white to-slate-50/70 dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Formulario en uso: {activeFormName}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                {activeBasePhasesCount}/4 pasos visibles
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                                {customForms.length + 1} {customForms.length === 0 ? 'enlace disponible' : 'formularios creados'}
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Formulario para la familia
                        </h3>
                    </div>

                    {/* Acciones rápidas siempre visibles */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleCopyUrl(activePreset?.id || 'base', activeFormUrl)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                            title={`Copiar enlace de ${activeFormName}`}
                        >
                            {copiedPresetId === (activePreset?.id || 'base') ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                            <span>{copiedPresetId === (activePreset?.id || 'base') ? 'Enlace copiado' : 'Copiar activo'}</span>
                        </button>
                        <a
                            href={activeFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                            title={`Abrir ${activeFormName} en nueva pestaña`}
                        >
                            <ExternalLink size={15} />
                            <span>Ver formulario</span>
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                setSection('enlaces');
                                handleOpenCreateModal();
                            }}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-primary text-primary-foreground hover:opacity-95 shadow-md shadow-primary/20 transition-all cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>Nuevo formulario</span>
                        </button>
                    </div>
                </div>

                <p className="w-full text-xs sm:text-sm text-slate-600 dark:text-muted-foreground leading-relaxed pt-1 border-t border-slate-100 dark:border-white/5">
                    Crea y personaliza los formularios que envías a las familias por WhatsApp o web: define sus pasos, campos obligatorios, tarifas por peso y mensajes de bienvenida.
                </p>
            </div>

            {/* Navegación por pestañas: 2 columnas x 2 filas en tablet/escritorio, 1 columna en móvil */}
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Secciones del formulario">
                {SECTIONS.map(s => {
                    const Icon = s.icon;
                    const active = section === s.id;
                    const badge =
                        s.id === 'enlaces'
                            ? `${customForms.length + 1}`
                            : s.id === 'fases'
                                ? `${activeBasePhasesCount}/4`
                                : s.id === 'pesos'
                                    ? `${tiers.length}`
                                    : welcomeModal.enabled !== false
                                        ? 'Activo'
                                        : null;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setSection(s.id)}
                            aria-current={active ? 'page' : undefined}
                            className={`group flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                active
                                    ? 'border-primary bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/30 shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]'
                            }`}
                        >
                            <span className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                                active
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/70 dark:bg-white/10 dark:text-muted-foreground'
                            }`}>
                                <Icon size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                                        {s.name}
                                    </span>
                                    {badge && (
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                                            active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                        }`}>
                                            {badge}
                                        </span>
                                    )}
                                </span>
                                <span className="block text-xs text-slate-500 dark:text-muted-foreground mt-0.5 leading-snug">
                                    {s.id === 'fases' ? `Fases en orden de «${activeFormName}»` : s.hint}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Stepper visual de Fases cuando estamos en "Pasos y Campos" (2 columnas x 2 filas en el orden del formulario activo) */}
            {section === 'fases' && (
                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 sm:p-5 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                    Recorrido del Formulario Activo
                                </h4>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    En uso: {activeFormName}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                Estás viendo las fases en el orden exacto de <strong>{activeFormName}</strong>. Selecciona un paso para configurar sus campos o activarlo/ocultarlo.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600 dark:text-muted-foreground shrink-0">
                            {activePreset && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleStartEditPreset(activePreset);
                                        setPresetModalTab('pasos');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/15 transition-all cursor-pointer"
                                >
                                    <Pencil size={13} />
                                    <span>Reordenar o renombrar fases</span>
                                </button>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Paso visible
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Paso oculto
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeOrderedPhases.map(phase => {
                            const Icon = phase.icon;
                            const active = selectedPhase === phase.id;
                            const isVisible = activePhases[phase.id];
                            const fieldSummary =
                                phase.id === 'familia'
                                    ? `${FIXED_FIELDS.owner.length + activeFields.filter(f => f.section === 'owner' && f.visible).length} campos activos`
                                    : phase.id === 'angel'
                                        ? `${FIXED_FIELDS.pet.length + activeFields.filter(f => f.section === 'pet' && f.visible).length} campos activos`
                                        : phase.id === 'camino'
                                            ? `${allCatalogPlans.length} planes · ${specials.filter(s => s.show_in_form !== false).length} extras`
                                            : [
                                                memories.allow_photos ? 'Fotos' : null,
                                                memories.allow_dedication ? 'Dedicatoria' : null,
                                            ].filter(Boolean).join(' + ') || 'Sin elementos';

                            return (
                                <button
                                    key={phase.id}
                                    type="button"
                                    onClick={() => setSelectedPhase(phase.id)}
                                    className={`flex flex-col justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                        active
                                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-md'
                                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 dark:bg-slate-900/60 dark:text-white dark:border-white/10 dark:hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 w-full">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${
                                            active ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                            <Icon size={14} />
                                            Paso {phase.num}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            isVisible
                                                ? active
                                                    ? 'bg-emerald-500/20 text-emerald-300 dark:bg-emerald-600/15 dark:text-emerald-700'
                                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                : active
                                                    ? 'bg-amber-500/20 text-amber-300 dark:bg-amber-600/15 dark:text-amber-700'
                                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isVisible ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {isVisible ? 'Visible' : 'Oculto'}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <p className="text-sm sm:text-base font-extrabold leading-tight">
                                            {phase.name} · {phase.shortTitle}
                                        </p>
                                        <p className={`text-xs mt-0.5 ${
                                            active ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-muted-foreground'
                                        }`}>
                                            {fieldSummary}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CONTENIDO */}
            <div className="space-y-6">

                {/* ============================================================== */}
                {/* FASE: FAMILIA */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'familia' && (
                    <PhaseSectionContainer
                        id="familia"
                        num={currentPhaseMeta.num}
                        name={currentPhaseMeta.name}
                        title="Datos de contacto y entrega"
                        description={currentPhaseMeta.description}
                        icon={User}
                        isActive={activePhases.familia}
                        onToggle={() => togglePhase('familia')}
                    >
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 min-w-0 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                                            Campos del tutor / cliente ({activeFormName})
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                            Datos personales y de contacto para coordinar el retiro y la entrega.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {FIXED_FIELDS.owner.map(name => (
                                        <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold">
                                            <Lock size={12} className="text-primary shrink-0" />
                                            {name} (Fijo)
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className={`${FIELD_GRID} pb-2 border-b border-slate-200 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground`}>
                                <span>Campo adicional</span>
                                <span className="text-center">Mostrar</span>
                                <span className="text-center">Obligatorio</span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {activeFields.filter(f => f.section === 'owner').map(f => {
                                    const status = !f.visible ? 'Oculto en el formulario' : f.required ? 'Obligatorio' : 'Opcional';
                                    const statusClass = !f.visible
                                        ? 'text-slate-400 dark:text-muted-foreground'
                                        : f.required ? 'text-primary font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold';
                                    return (
                                        <div key={f.key} className={`${FIELD_GRID} py-3.5`}>
                                            <div className="min-w-0 pr-2">
                                                <p className={`text-sm font-bold break-words ${f.visible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-muted-foreground line-through'}`}>
                                                    {f.customLabel?.trim() || f.label}
                                                    {f.customLabel?.trim() && (
                                                        <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-muted-foreground">({f.label})</span>
                                                    )}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 ${statusClass}`}>{status}</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`Mostrar ${f.label}`} checked={f.visible} onChange={v => updateField(f.key, { visible: v })} />
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`${f.label} obligatorio`} checked={f.required && !NEVER_REQUIRED.has(f.key)} disabled={!f.visible || NEVER_REQUIRED.has(f.key)} onChange={v => updateField(f.key, { required: v })} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PhaseSectionContainer>
                )}

                {/* ============================================================== */}
                {/* FASE: ÁNGEL / HUELLA */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'angel' && (
                    <PhaseSectionContainer
                        id="angel"
                        num={currentPhaseMeta.num}
                        name={currentPhaseMeta.name}
                        title="Datos de la mascota"
                        description={currentPhaseMeta.description}
                        icon={PawPrint}
                        isActive={activePhases.angel}
                        onToggle={() => togglePhase('angel')}
                    >
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 min-w-0 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <PawPrint size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                                            Campos de la mascota ({activeFormName})
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                            Información básica y conmemorativa del compañero.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {FIXED_FIELDS.pet.map(name => (
                                        <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold">
                                            <Lock size={12} className="text-primary shrink-0" />
                                            {name} (Fijo)
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className={`${FIELD_GRID} pb-2 border-b border-slate-200 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground`}>
                                <span>Campo adicional</span>
                                <span className="text-center">Mostrar</span>
                                <span className="text-center">Obligatorio</span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {activeFields.filter(f => f.section === 'pet').map(f => {
                                    const status = !f.visible ? 'Oculto en el formulario' : f.required ? 'Obligatorio' : 'Opcional';
                                    const statusClass = !f.visible
                                        ? 'text-slate-400 dark:text-muted-foreground'
                                        : f.required ? 'text-primary font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold';
                                    return (
                                        <div key={f.key} className={`${FIELD_GRID} py-3.5`}>
                                            <div className="min-w-0 pr-2">
                                                <p className={`text-sm font-bold break-words ${f.visible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-muted-foreground line-through'}`}>
                                                    {f.customLabel?.trim() || f.label}
                                                    {f.customLabel?.trim() && (
                                                        <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-muted-foreground">({f.label})</span>
                                                    )}
                                                </p>
                                                <p className={`text-[11px] mt-0.5 ${statusClass}`}>{status}</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`Mostrar ${f.label}`} checked={f.visible} onChange={v => updateField(f.key, { visible: v })} />
                                            </div>
                                            <div className="flex justify-center">
                                                <Toggle label={`${f.label} obligatorio`} checked={f.required && !NEVER_REQUIRED.has(f.key)} disabled={!f.visible || NEVER_REQUIRED.has(f.key)} onChange={v => updateField(f.key, { required: v })} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </PhaseSectionContainer>
                )}

                {/* ============================================================== */}
                {/* FASE: CAMINO */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'camino' && (
                    <PhaseSectionContainer
                        id="camino"
                        num={currentPhaseMeta.num}
                        name={currentPhaseMeta.name}
                        title="Selección de planes, servicios y precios"
                        description={currentPhaseMeta.description}
                        icon={Package}
                        isActive={activePhases.camino}
                        onToggle={() => togglePhase('camino')}
                    >
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                            <div>
                                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                                    Planes, servicios especiales y precios
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 max-w-xl leading-relaxed">
                                    En este paso la familia elige su plan de cremación y los servicios adicionales. Qué servicios aparecen y qué precios se muestran se configura en «Pesos y Tarifas».
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSection('pesos')}
                                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs sm:text-sm font-bold hover:bg-primary/15 cursor-pointer"
                            >
                                Ir a Pesos y Tarifas <ChevronRight size={15} />
                            </button>
                        </div>
                    </PhaseSectionContainer>
                )}

                {/* ============================================================== */}
                {/* FASE: RECUERDOS / HOMENAJE */}
                {/* ============================================================== */}
                {section === 'fases' && selectedPhase === 'recuerdos' && (
                    <PhaseSectionContainer
                        id="recuerdos"
                        num={currentPhaseMeta.num}
                        name={currentPhaseMeta.name}
                        title="Homenaje, fotos y dedicatoria"
                        description={currentPhaseMeta.description}
                        icon={Heart}
                        isActive={activePhases.recuerdos}
                        onToggle={() => togglePhase('recuerdos')}
                    >
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 space-y-5 shadow-xs">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Heart size={18} className="text-rose-500 dark:text-rose-400" />
                                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                                        Opciones de Homenaje y Recuerdos
                                    </h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 max-w-xl">
                                    Define si la familia puede subir fotos, escribir una dedicatoria y si estos elementos son obligatorios.
                                </p>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {/* Fotos conmemorativas */}
                                <div className="py-4 space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                                                <Camera size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Subida de fotos de la mascota</p>
                                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                                                    Permite a la familia adjuntar de 1 a 3 fotos para enmarcar su recuerdo y generar la tarjeta conmemorativa.
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
                                        <div className="ml-11 flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100 dark:border-white/5">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-white">Al menos una foto obligatoria</p>
                                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">La familia no podrá avanzar sin subir al menos una fotografía.</p>
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
                                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                                                <MessageSquareQuote size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Palabras de despedida / Dedicatoria</p>
                                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
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
                                        <div className="ml-11 flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100 dark:border-white/5">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-white">Dedicatoria obligatoria</p>
                                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">Exige escribir unas palabras antes de continuar al resumen.</p>
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
                                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                                            <Sparkles size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Sugerencias y apoyo para redactar</p>
                                            <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                                                Muestra el botón «Sugerir mensaje» para acompañar a los tutores que se sienten abrumados o sin palabras.
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
                        {/* Tramos de peso (Acordeón colapsable para mantener la pantalla compacta) */}
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden transition-all shadow-xs">
                            <button
                                type="button"
                                onClick={() => setTiersAccordionOpen(prev => !prev)}
                                className="w-full p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="flex items-start sm:items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                        <Scale size={20} />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Rangos de peso (Tabla General)</h4>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                {tiers.length === 1 ? '1 rango' : `${tiers.length} rangos configurados`}
                                            </span>
                                            <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                                                · {weightMode === 'table' ? 'Precio por plan y peso' : 'Recargo por peso'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5 max-w-xl">
                                            {tiersAccordionOpen
                                                ? 'Define los tramos en kg y la matriz de precios base de cada plan.'
                                                : 'Haz clic para desplegar y editar los rangos de peso o modificar los precios de cada plan.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl border bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40">
                                        {tiersAccordionOpen ? 'Plegar' : 'Expandir y editar'}
                                    </span>
                                    <div className={`p-2 rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/90 transition-transform duration-200 ${tiersAccordionOpen ? 'rotate-180' : ''}`}>
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </button>

                            {tiersAccordionOpen && (
                                <div className="p-5 sm:p-6 pt-0 space-y-6 border-t border-slate-100 dark:border-white/5">
                                    {/* Cómo cobra el peso */}
                                    <fieldset className="pt-4">
                                        <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">¿Cómo cobras según el peso?</legend>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {([
                                                { id: 'surcharge', title: 'Recargo por peso', desc: 'Cada rango suma un monto al plan o servicio elegido.' },
                                                { id: 'table', title: 'Precio por plan y peso', desc: 'Cada plan tiene su propio precio en cada rango. Los servicios especiales no cambian con el peso.' },
                                            ] as const).map(opt => {
                                                const active = weightMode === opt.id;
                                                return (
                                                    <label
                                                        key={opt.id}
                                                        className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition-colors ${active ? 'border-primary bg-primary/10' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="weight-pricing-mode"
                                                            value={opt.id}
                                                            checked={active}
                                                            onChange={() => setWeightMode(opt.id)}
                                                            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-bold text-slate-900 dark:text-white">{opt.title}</span>
                                                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-muted-foreground">{opt.desc}</span>
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </fieldset>

                                    {tiers.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-muted-foreground py-4">
                                            Sin rangos definidos: el formulario usa rangos genéricos (Pequeño, Mediano, Grande, Gigante) sin recargo.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className={`hidden md:grid ${weightMode === 'table' ? TIER_GRID_MD_TABLE : TIER_GRID_MD} gap-3 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground`}>
                                                <span>Nombre (opcional)</span>
                                                <span>Desde</span>
                                                <span>Hasta</span>
                                                {weightMode !== 'table' && <span>Recargo</span>}
                                                <span className="w-[7.5rem]" />
                                            </div>
                                            {tiers.map((t, idx) => {
                                                const isLast = idx === tiers.length - 1;
                                                return (
                                                    <div key={idx} className={`grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border border-slate-200 dark:border-white/10 p-3 ${weightMode === 'table' ? TIER_GRID_MD_TABLE : TIER_GRID_MD} md:items-start md:gap-3 md:rounded-none md:border-0 md:p-0`}>
                                                        <div className="col-span-2 md:col-span-1 flex items-end gap-2 min-w-0">
                                                            <div className="flex-1 min-w-0">
                                                                <TierLabel>Rango {idx + 1} · Nombre (opcional)</TierLabel>
                                                                <FormInputLite placeholder={`Ej: ${TIER_PLACEHOLDERS[idx] ?? `Rango ${idx + 1}`}`} value={t.label} maxLength={40} ariaLabel={`Rango ${idx + 1}: nombre`} onChange={v => updateTier(idx, { label: v })} />
                                                            </div>
                                                            <TierActions idx={idx} total={tiers.length} onMove={dir => moveTier(idx, dir)} onRemove={() => removeTier(idx)} className="flex md:hidden" />
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
                                                        {weightMode !== 'table' && <div className="col-span-2 md:col-span-1 min-w-0">
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
                                                        </div>}
                                                        <TierActions idx={idx} total={tiers.length} onMove={dir => moveTier(idx, dir)} onRemove={() => removeTier(idx)} className="hidden md:flex" />
                                                        {/* Tarjeta del tamaño en el catálogo de planes */}
                                                        <div className="col-span-2 md:col-span-full flex items-center gap-3 md:pb-3 md:border-b md:border-slate-100 dark:md:border-white/5">
                                                            <TierIconField value={t.icon_url} label={`Rango ${idx + 1}`} onChange={url => updateTier(idx, { icon_url: url })} />
                                                            <div className="flex-1 min-w-0">
                                                                <FormInputLite
                                                                    placeholder="Ejemplos en el catálogo (opcional): Gatos, Chihuahuas"
                                                                    value={t.examples || ''}
                                                                    maxLength={60}
                                                                    ariaLabel={`Rango ${idx + 1}: ejemplos`}
                                                                    onChange={v => updateTier(idx, { examples: v })}
                                                                />
                                                            </div>
                                                        </div>
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

                                    {/* Precio por plan y peso dentro del acordeón */}
                                    {weightMode === 'table' && (
                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Layers size={18} className="text-amber-500 dark:text-amber-400" />
                                                    <h4 className="font-extrabold text-slate-900 dark:text-white">Precio de cada plan según el peso</h4>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 max-w-xl">
                                                    Escribe el precio final de cada plan en cada rango (ya incluye el peso, no se suma recargo).
                                                    Si dejas una celda vacía se usa el precio base del plan. Se aplica en el formulario, el catálogo y las órdenes nuevas.
                                                </p>
                                            </div>
                                            <PlanWeightPriceTable
                                                tiers={tiers}
                                                plans={tablePlans}
                                                values={tableValues}
                                                onChange={updateTableCell}
                                                onFillRow={fillRowWithBase}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <TransportSection />

                        <PriceListsSection
                            reloadKey={priceListsKey}
                            onChanged={() => setPriceListsKey(k => k + 1)}
                            activeListId={formPriceListId}
                            onSelectActiveList={setFormPriceListId}
                        />
                        {/* Rangos de peso / precios que usa el formulario principal */}
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 space-y-3 shadow-xs">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Layers size={18} className="text-sky-500 dark:text-sky-400" />
                                    <h4 className="font-extrabold text-slate-900 dark:text-white">Rangos y precios del formulario principal</h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 max-w-xl">
                                    Elige qué rangos de peso y precios ve la familia en el formulario principal. Los formularios personalizados usan esta misma tabla, salvo que elijan otra en «Mis Formularios».
                                </p>
                            </div>
                            <select
                                value={formPriceListId ?? ''}
                                onChange={e => setFormPriceListId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full sm:max-w-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl py-3 px-4 text-sm font-semibold outline-none focus:border-primary/50"
                            >
                                <option value="">General (los rangos de arriba)</option>
                                {priceListOptions.map(pl => (
                                    <option key={pl.id} value={pl.id}>{pl.name} · {PRICE_LIST_STATUS[pl.status]?.label || pl.status}</option>
                                ))}
                                {formPriceListId && !priceListOptions.some(p => p.id === formPriceListId) && (
                                    <option value={formPriceListId}>Tabla eliminada (se usa la General)</option>
                                )}
                            </select>
                            {formPriceListId && (() => {
                                const pl = priceListOptions.find(p => p.id === formPriceListId);
                                return pl && pl.status !== 'activa' ? (
                                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        «{pl.name}» está {PRICE_LIST_STATUS[pl.status]?.label.toLowerCase() || pl.status}: mientras no esté vigente el formulario usa la General.
                                    </p>
                                ) : null;
                            })()}
                        </div>

                        {/* Precios visibles y Catálogo en grid de 2 columnas en desktop */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 space-y-4 shadow-xs">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Tag size={18} className="text-emerald-500 dark:text-emerald-400" />
                                        <h4 className="font-extrabold text-slate-900 dark:text-white">Precios visibles en el formulario</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">
                                        Elige qué precios ve la familia. Al activar alguno, el resumen final muestra el total estimado.
                                    </p>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {weightMode !== 'table' && (
                                        <PriceToggleRow
                                            title="Precio según el peso"
                                            description="Muestra el recargo correspondiente a cada rango de peso."
                                            checked={showPrices}
                                            onChange={setShowPrices}
                                        />
                                    )}
                                    <PriceToggleRow
                                        title="Precio según el plan elegido"
                                        description={weightMode === 'table'
                                            ? 'Muestra el precio de cada plan (según el peso elegido) y de los servicios adicionales.'
                                            : 'Muestra el precio de cada plan de cremación y de los servicios adicionales al seleccionarlos.'}
                                        checked={showServicePrices}
                                        onChange={setShowServicePrices}
                                    />
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 space-y-4 shadow-xs">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Tag size={18} className="text-emerald-500 dark:text-emerald-400" />
                                        <h4 className="font-extrabold text-slate-900 dark:text-white">Catálogo de planes</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">
                                        Lo que ve la familia en el enlace del catálogo de planes (Gestión de Servicios → Compartir Catálogo).
                                    </p>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    <PriceToggleRow
                                        title="Botón «Solicitar este plan»"
                                        description="Lleva al formulario de registro con el plan y el peso elegidos. Si lo ocultas, solo muestra «Consultar por WhatsApp»."
                                        checked={showPlanRequest}
                                        onChange={setShowPlanRequest}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Servicios especiales */}
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 p-5 sm:p-6 space-y-4 shadow-xs">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-emerald-500 dark:text-emerald-400" />
                                    <h4 className="font-extrabold text-slate-900 dark:text-white">Servicios especiales</h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 max-w-xl">
                                    Servicios como eutanasia o exhumación ofrecidos a la familia tras elegir el plan. Se administran en el{' '}
                                    <Link href="/dashboard/gestion-servicios" className="text-primary font-semibold hover:underline">catálogo de servicios</Link>.
                                </p>
                            </div>

                            {specials.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-muted-foreground py-2">Aún no tienes servicios especiales configurados.</p>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {specials.map(sv => (
                                        <div key={sv.id} className="flex items-center justify-between gap-4 py-3">
                                            <div className="min-w-0">
                                                <p className={`text-sm font-bold break-words ${sv.show_in_form !== false ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-muted-foreground'}`}>
                                                    {sv.name}
                                                    <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-muted-foreground">{formatCLP(sv.price || 0)}</span>
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-0.5 break-words">
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
                                <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3 bg-slate-50 dark:bg-white/5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Nuevo servicio especial</p>
                                        <button type="button" onClick={() => setNewSpecial(null)} aria-label="Cancelar" className="p-1.5 rounded-lg text-slate-500 dark:text-muted-foreground hover:bg-slate-200/60 dark:hover:bg-white/5">
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
                        {/* 1. Mensaje de Bienvenida / Condolencias (Modal Inicial) */}
                        <div className="p-5 sm:p-6 rounded-3xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-4 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                                        <HeartHandshake size={18} />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h5 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                                                Mensaje de Bienvenida y Condolencias
                                            </h5>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                                                Al abrir enlace
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-muted-foreground">
                                            Ventana que recibe a la familia con tu logo y un mensaje de acompañamiento antes de iniciar el formulario.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewWelcomeModal(welcomeModal)}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-indigo-200/60 dark:border-indigo-500/20">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                                            Título del Modal
                                        </label>
                                        <input
                                            type="text"
                                            value={welcomeModal.title || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Lamentamos tu pérdida"
                                            maxLength={60}
                                            className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-2.5 px-3.5 outline-none focus:border-indigo-600 font-semibold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                                            Texto del Botón
                                        </label>
                                        <input
                                            type="text"
                                            value={welcomeModal.button_text || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, button_text: e.target.value }))}
                                            placeholder="Continuar"
                                            maxLength={30}
                                            className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-2.5 px-3.5 outline-none focus:border-indigo-600 font-semibold"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                                            Mensaje de Condolencias / Acompañamiento
                                        </label>
                                        <textarea
                                            value={welcomeModal.message || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, message: e.target.value }))}
                                            placeholder="En estos momentos difíciles, en {empresa} queremos acompañarte y brindarte todo nuestro apoyo. Estamos aquí para ayudarte a honrar la memoria de tu ser querido."
                                            rows={3}
                                            maxLength={350}
                                            className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-2.5 px-3.5 outline-none focus:border-indigo-600 font-medium resize-none"
                                        />
                                        <p className="text-[11px] text-slate-600 dark:text-muted-foreground mt-1 font-medium">
                                            Tip: Escribe <code className="bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-300 font-mono font-bold">{"{empresa}"}</code> para insertar automáticamente el nombre de tu crematorio en negrita.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Video opcional (PRO / ULTRA) */}
                            <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-900/50 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Video para la familia (opcional)</p>
                                        <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                            Un video corto (máx. 60 s) que la familia ve solo si pulsa el botón. No se reproduce solo.
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
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">¿Cuándo se muestra?</label>
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
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">Texto del botón del video</label>
                                        <input
                                            type="text"
                                            value={welcomeModal.video_button_text || ''}
                                            onChange={e => setWelcomeModal(prev => ({ ...prev, video_button_text: e.target.value }))}
                                            placeholder="Ver video"
                                            maxLength={40}
                                            className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-indigo-600 font-semibold"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Plazo / Aviso de Entrega de Cenizas General */}
                        <div className="p-5 sm:p-6 rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-3 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                    <Info size={18} />
                                </div>
                                <div>
                                    <h5 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                                        Plazo o Nota de Entrega de Cenizas (Aviso General)
                                    </h5>
                                    <p className="text-xs text-slate-600 dark:text-muted-foreground">
                                        Mensaje que verá la familia en el resumen y al confirmar su solicitud para conocer los tiempos de entrega.
                                    </p>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={deliveryNotice}
                                onChange={e => setDeliveryNotice(e.target.value)}
                                placeholder="Ej: Las cenizas serán entregadas en un plazo de 72 horas hábiles."
                                maxLength={200}
                                className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-3 px-4 outline-none focus:border-amber-600 transition-all font-medium"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                                Puedes dejarlo vacío si no deseas mostrar un plazo automático.
                            </p>
                        </div>
                    </section>
                )}

                {/* ============================================================== */}
                {/* SECCIÓN: MIS FORMULARIOS Y ENLACES (PRESETS) */}
                {/* ============================================================== */}
                {section === 'enlaces' && (
                    <section className="space-y-6">
                        {/* 1. Tarjeta Destacada: Formulario Principal (Oficial) */}
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="flex items-start gap-3.5">
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                        <Globe size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                                                Formulario Principal (Predeterminado)
                                            </h4>
                                            {!activePreset ? (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    En uso (Oficial)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                                    Base clásica
                                                </span>
                                            )}
                                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                Tarifa: {priceListName(formPriceListId)}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">
                                            Tu formulario general clásico. {activePreset ? `Actualmente tu formulario oficial en uso es «${activePreset.name}».` : 'Actualmente es tu formulario oficial activo.'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSection('fases')}
                                    className="self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shrink-0"
                                >
                                    <SlidersHorizontal size={14} />
                                    <span>Configurar pasos base</span>
                                </button>
                            </div>

                            {/* Recorrido visual de pasos del formulario principal */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground mr-1">
                                    Recorrido actual:
                                </span>
                                {PHASES_LIST.map((p, idx) => {
                                    const active = phases[p.id];
                                    return (
                                        <React.Fragment key={p.id}>
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                    active
                                                        ? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-white/10 dark:text-white dark:border-white/15'
                                                        : 'bg-slate-50 text-slate-400 border-slate-200/60 dark:bg-white/[0.02] dark:text-slate-500 dark:border-white/5 line-through'
                                                }`}
                                            >
                                                <span>{idx + 1}. {p.name}</span>
                                            </span>
                                            {idx < PHASES_LIST.length - 1 && (
                                                <ChevronRight size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                <ChevronRight size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    Resumen
                                </span>
                            </div>

                            {/* Barra de enlace y botones de acción */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                <div className="relative flex-1 min-w-0">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getPresetUrl()}
                                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-mono text-slate-800 dark:text-white/90 rounded-xl py-2.5 pl-3.5 pr-9 outline-none select-all focus:border-primary font-medium"
                                    />
                                    <Globe size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleCopyUrl('base', getPresetUrl())}
                                        className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        {copiedPresetId === 'base' ? <Check size={14} className="text-emerald-400 dark:text-emerald-600" /> : <Copy size={14} />}
                                        <span>{copiedPresetId === 'base' ? 'Copiado' : 'Copiar enlace'}</span>
                                    </button>
                                    <a
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hola, te comparto nuestro formulario para el servicio de cremación:\n\n${getPresetUrl()}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3.5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                    >
                                        <Share2 size={14} />
                                        <span>WhatsApp</span>
                                    </a>
                                    <a
                                        href={getPresetUrl()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                                        title="Abrir formulario en nueva pestaña"
                                    >
                                        <ExternalLink size={15} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* 2. Plantillas Rápidas de Vinzer (Ancho completo) */}
                        {formTemplates.length > 0 && (
                            <div className="w-full rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-5 sm:p-6 space-y-3.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h5 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                                            <Sparkles size={15} className="text-primary" />
                                            Plantillas rápidas recomendadas
                                        </h5>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground mt-0.5">
                                            Inicia un formulario nuevo a partir de una estructura probada sin afectar tu formulario principal.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 w-full">
                                    {formTemplates.map(t => (
                                        <div
                                            key={t.id}
                                            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                                        >
                                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                                <span className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                                                    <PawPrint size={18} />
                                                </span>
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                                                        Plantilla «{t.name}»
                                                    </p>
                                                    {t.description && (
                                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">
                                                            {t.description}
                                                        </p>
                                                    )}
                                                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 pt-0.5">
                                                        {cleanPhaseOrder(t.phase_order).filter(k => t.phases?.[k] !== false).map((k, i) => `${i + 1}. ${t.phase_labels?.[k]?.name || PHASE_DEFAULTS[k].name}`).join(' → ')} → Resumen
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCreateFromTemplate(t)}
                                                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
                                            >
                                                <Plus size={15} />
                                                <span>Usar plantilla</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Listado de Formularios Personalizados (Ancho completo) */}
                        <div className="w-full space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h5 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                        Formularios Personalizados ({customForms.length})
                                    </h5>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground">
                                        Crea enlaces a medida para casos específicos (ej. Eutanasia, Convenios, Retiros urgentes o Servicios adicionales).
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleOpenCreateModal}
                                    className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:opacity-95 transition-all cursor-pointer shadow-sm shrink-0"
                                >
                                    <Plus size={15} />
                                    <span>Crear formulario a medida</span>
                                </button>
                            </div>

                            {customForms.length === 0 ? (
                                <div className="w-full p-8 sm:p-10 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-center space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                        <FileText size={22} />
                                    </div>
                                    <h6 className="font-extrabold text-slate-900 dark:text-white text-base">
                                        Aún no tienes formularios personalizados
                                    </h6>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                        Puedes crear formularios con pasos propios, un servicio fijo (como Eutanasia), otra lista de precios o campos médicos adicionales sin modificar tu formulario principal.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleOpenCreateModal}
                                        className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs transition-all cursor-pointer shadow-sm"
                                    >
                                        <Plus size={15} />
                                        Crear primer formulario
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 w-full">
                                    {customForms.map((preset) => {
                                        const url = getPresetUrl(preset.id);
                                        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Hola, te comparto el formulario de ${preset.name}:\n\n${url}`)}`;

                                        const isOfficialPreset = preset.id === officialFormId;

                                        return (
                                            <div
                                                key={preset.id}
                                                className={`w-full p-5 sm:p-6 rounded-3xl border shadow-xs transition-all flex flex-col justify-between gap-4 ${
                                                    isOfficialPreset
                                                        ? 'border-emerald-500/50 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04] ring-1 ring-emerald-500/20'
                                                        : 'border-slate-200 dark:border-white/10 hover:border-primary/40 bg-white dark:bg-slate-900/60'
                                                }`}
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h6 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                                                                    {preset.name}
                                                                </h6>
                                                                {isOfficialPreset && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                        En uso (Formulario Oficial)
                                                                    </span>
                                                                )}
                                                                {preset.associated_service_id && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                                                                        <Sparkles size={12} />
                                                                        {getAssociatedServiceName(preset.associated_service_id)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {preset.description && (
                                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-muted-foreground mt-1.5 leading-relaxed">
                                                                    {preset.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartEditPreset(preset)}
                                                                className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
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
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                                                title="Eliminar formulario"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Recorrido de fases de este formulario */}
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {cleanPhaseOrder(preset.phase_order).map((key, i) => {
                                                            const isAct = preset.phases?.[key] !== false;
                                                            const custom = preset.phase_labels?.[key]?.name?.trim();
                                                            return (
                                                                <span
                                                                    key={key}
                                                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                                                                        isAct
                                                                            ? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/15'
                                                                            : 'bg-slate-50 text-slate-400 border-slate-200/50 dark:bg-white/[0.02] dark:text-slate-600 dark:border-white/5 line-through'
                                                                    }`}
                                                                >
                                                                    {i + 1}. {custom || PHASE_DEFAULTS[key].name}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Etiquetas adicionales */}
                                                    {(preset.include_health_status || preset.price_list_id || preset.delivery_notice || preset.welcome_modal) && (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {preset.price_list_id && (
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                                                    Tarifa: {priceListName(preset.price_list_id)}
                                                                </span>
                                                            )}
                                                            {preset.include_health_status && (
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                                    Incluye diagnóstico clínico
                                                                </span>
                                                            )}
                                                            {preset.welcome_modal && (
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                                                    Bienvenida propia
                                                                </span>
                                                            )}
                                                            {preset.delivery_notice && (
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 truncate max-w-xs">
                                                                    Plazo: {preset.delivery_notice}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Enlace y acciones */}
                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                                    <div className="relative flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={url}
                                                            className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 rounded-xl py-2 px-3 outline-none select-all"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyUrl(preset.id, url)}
                                                            className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                                        >
                                                            {copiedPresetId === preset.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                            <span>{copiedPresetId === preset.id ? 'Copiado' : 'Copiar'}</span>
                                                        </button>
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                                        >
                                                            <Share2 size={14} />
                                                            <span>WhatsApp</span>
                                                        </a>
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                                                            title="Abrir formulario en nueva pestaña"
                                                        >
                                                            <ExternalLink size={14} />
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
                            ? 'Los formularios personalizados se guardan al crearlos o editarlos. Este botón guarda la configuración base.'
                            : 'Los cambios se aplican al formulario principal y a los enlaces que hereden su configuración.'}
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

            {/* Modal para crear / editar formulario personalizado (Organizado en 3 pasos claros y responsive) */}
            <AnimatePresence>
                {isCreatingPreset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 dark:bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
                        >
                            {/* Cabecera fija del modal */}
                            <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-slate-200 dark:border-white/10 shrink-0 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                                {editingPresetId ? `Editar: ${presetName || 'Formulario'}` : 'Nuevo Formulario Personalizado'}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                                Configura los datos, el orden de los pasos y la bienvenida de este enlace.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingPreset(false);
                                            setEditingPresetId(null);
                                        }}
                                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-muted-foreground dark:hover:text-white dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Vista previa en vivo del recorrido que verá la familia */}
                                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-[11px]">
                                    <span className="font-bold text-slate-500 dark:text-muted-foreground mr-1">
                                        Vista previa de pasos:
                                    </span>
                                    {presetPhaseOrder.filter(k => presetPhases[k]).map((key, i) => (
                                        <React.Fragment key={key}>
                                            <span className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                                                {i + 1}. {presetPhaseLabels[key]?.name?.trim() || PHASE_DEFAULTS[key].name}
                                            </span>
                                            <ChevronRight size={12} className="text-slate-400 shrink-0" />
                                        </React.Fragment>
                                    ))}
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                        Resumen
                                    </span>
                                </div>

                                {/* Pestañas del modal (3 pasos claros) */}
                                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
                                    {([
                                        { id: 'general', label: '1. Datos y Servicio', icon: FileText },
                                        { id: 'pasos', label: '2. Pasos y Campos', icon: Layers },
                                        { id: 'bienvenida', label: '3. Bienvenida y Plazo', icon: HeartHandshake },
                                    ] as const).map(tab => {
                                        const TabIcon = tab.icon;
                                        const active = presetModalTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setPresetModalTab(tab.id)}
                                                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                    active
                                                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                            >
                                                <TabIcon size={14} className="shrink-0" />
                                                <span className="truncate">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Cuerpo desplazable del modal */}
                            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
                                {/* ========================================== */}
                                {/* PESTAÑA 1: DATOS Y SERVICIO */}
                                {/* ========================================== */}
                                {presetModalTab === 'general' && (
                                    <div className="space-y-4">
                                        {/* Partir de una plantilla de Vinzer (solo al crear) */}
                                        {!editingPresetId && formTemplates.length > 0 && (
                                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-4 space-y-2.5">
                                                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                                    Punto de partida
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenCreateModal}
                                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${!presetTemplateId
                                                            ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900 dark:border-white/10 dark:text-slate-300'}`}
                                                    >
                                                        En blanco (orden clásico)
                                                    </button>
                                                    {formTemplates.map(t => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => handleCreateFromTemplate(t)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${presetTemplateId === t.id
                                                                ? 'bg-rose-600 border-rose-600 text-white'
                                                                : 'bg-white border-rose-200 text-rose-700 hover:border-rose-300 dark:bg-slate-900 dark:border-rose-500/30 dark:text-rose-300'}`}
                                                        >
                                                            <PawPrint size={13} />
                                                            Plantilla «{t.name}»
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                                                    Al elegir una plantilla se precargan sus fases y campos recomendados. Luego puedes ajustar cualquier detalle en la pestaña «2. Pasos y Campos».
                                                </p>
                                            </div>
                                        )}

                                        {/* Nombre */}
                                        <div>
                                            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                                                Nombre del Formulario *
                                            </label>
                                            <input
                                                type="text"
                                                value={presetName}
                                                onChange={e => setPresetName(e.target.value)}
                                                placeholder="Ej: Atención Eutanasia, Convenio Veterinaria, Retiro Urgente..."
                                                maxLength={60}
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-2.5 px-3.5 text-sm font-semibold outline-none focus:border-primary"
                                            />
                                        </div>

                                        {/* Descripción */}
                                        <div>
                                            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                                                Descripción para la Familia (Opcional)
                                            </label>
                                            <textarea
                                                value={presetDescription}
                                                onChange={e => setPresetDescription(e.target.value)}
                                                placeholder="Ej: Por favor completa la información médica y de contacto para coordinar el procedimiento con nuestro equipo."
                                                rows={2}
                                                maxLength={250}
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-2.5 px-3.5 text-sm font-medium outline-none focus:border-primary resize-none"
                                            />
                                            <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-1">
                                                Se muestra como subtítulo en la cabecera cuando la familia abre este enlace.
                                            </p>
                                        </div>

                                        {/* Grid 2 cols: Servicio asociado + Tabla de precios */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        Servicio o Plan Fijado
                                                    </label>
                                                    {presetAssociatedServiceId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPresetAssociatedServiceId('')}
                                                            className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                                                        >
                                                            Quitar
                                                        </button>
                                                    )}
                                                </div>
                                                <select
                                                    value={presetAssociatedServiceId}
                                                    onChange={e => setPresetAssociatedServiceId(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold outline-none focus:border-primary cursor-pointer"
                                                >
                                                    <option value="">Selección libre por la familia</option>
                                                    {allCatalogServices.some(s => s.is_special) && (
                                                        <optgroup label="Servicios Especiales / Clínicos">
                                                            {allCatalogServices.filter(s => s.is_special).map(sv => (
                                                                <option key={`svc_${sv.id}`} value={`svc_${sv.id}`}>
                                                                    {sv.name} {sv.price ? `(${formatCLP(sv.price)})` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    {allCatalogPlans.length > 0 && (
                                                        <optgroup label="Planes de Cremación">
                                                            {allCatalogPlans.map(pl => (
                                                                <option key={`plan_${pl.id}`} value={`plan_${pl.id}`}>
                                                                    {pl.name} {pl.price ? `(${formatCLP(pl.price)})` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    {allCatalogServices.some(s => !s.is_special) && (
                                                        <optgroup label="Otros Servicios">
                                                            {allCatalogServices.filter(s => !s.is_special).map(sv => (
                                                                <option key={`svc_${sv.id}`} value={`svc_${sv.id}`}>
                                                                    {sv.name} {sv.price ? `(${formatCLP(sv.price)})` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>
                                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-1">
                                                    {presetAssociatedServiceId
                                                        ? `Se asignará automáticamente «${getAssociatedServiceName(presetAssociatedServiceId)}».`
                                                        : 'Opcional: útil si este formulario es exclusivo para un servicio.'}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                                                    Tabla de Precios y Pesos
                                                </label>
                                                <select
                                                    value={presetPriceListId}
                                                    onChange={e => setPresetPriceListId(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold outline-none focus:border-primary cursor-pointer"
                                                >
                                                    <option value="">Misma que el principal ({priceListName(formPriceListId)})</option>
                                                    {priceListOptions.map(pl => (
                                                        <option key={pl.id} value={pl.id}>{pl.name} · {PRICE_LIST_STATUS[pl.status]?.label || pl.status}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-1">
                                                    Define qué rangos y tarifas verá la familia en este enlace.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ========================================== */}
                                {/* PESTAÑA 2: PASOS Y CAMPOS */}
                                {/* ========================================== */}
                                {presetModalTab === 'pasos' && (
                                    <div className="space-y-5">
                                        {/* Orden y visibilidad de Fases */}
                                        <div className="space-y-2.5">
                                            <div>
                                                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Orden y Nombre de los Pasos
                                                </label>
                                                <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                                    Usa las flechas para reordenar, actívalos u ocúltalos, y personaliza su título si lo deseas.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                {presetPhaseOrder.map((key, idx) => {
                                                    const isAct = presetPhases[key];
                                                    const desc = PHASE_EDITOR_DESC[key];
                                                    const pos = presetPhaseOrder.slice(0, idx + 1).filter(k => presetPhases[k]).length;
                                                    return (
                                                        <div
                                                            key={key}
                                                            className={`rounded-2xl border p-3 transition-all ${
                                                                isAct
                                                                    ? 'border-slate-300 dark:border-white/20 bg-white dark:bg-slate-950/60 shadow-2xs'
                                                                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] opacity-75'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-0.5 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => movePresetPhase(key, -1)}
                                                                        disabled={idx === 0}
                                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                                                        aria-label="Subir fase"
                                                                    >
                                                                        <ChevronUp size={15} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => movePresetPhase(key, 1)}
                                                                        disabled={idx === presetPhaseOrder.length - 1}
                                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                                                        aria-label="Bajar fase"
                                                                    >
                                                                        <ChevronDown size={15} />
                                                                    </button>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-xs sm:text-sm font-extrabold ${isAct ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                                                                        {isAct ? `${pos}. ` : ''}{PHASE_DEFAULTS[key].name}
                                                                        <span className="font-medium text-xs text-slate-500 dark:text-muted-foreground no-underline"> · {desc}</span>
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPresetPhases(prev => ({ ...prev, [key]: !prev[key] }))}
                                                                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                                        isAct
                                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-400'
                                                                    }`}
                                                                >
                                                                    {isAct ? <Eye size={13} /> : <EyeOff size={13} />}
                                                                    {isAct ? 'Visible' : 'Oculto'}
                                                                </button>
                                                            </div>
                                                            {isAct && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5">
                                                                    <input
                                                                        type="text"
                                                                        value={presetPhaseLabels[key]?.name || ''}
                                                                        onChange={e => setPresetPhaseLabel(key, 'name', e.target.value)}
                                                                        placeholder={`Título (por defecto: ${PHASE_DEFAULTS[key].name})`}
                                                                        maxLength={MAX_PHASE_NAME}
                                                                        aria-label={`Nombre de la fase ${PHASE_DEFAULTS[key].name}`}
                                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-1.5 px-3 text-xs font-semibold outline-none focus:border-primary"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={presetPhaseLabels[key]?.phrase || ''}
                                                                        onChange={e => setPresetPhaseLabel(key, 'phrase', e.target.value)}
                                                                        placeholder={`Subtítulo: ${PHASE_DEFAULTS[key].phrase}`}
                                                                        maxLength={MAX_PHASE_PHRASE}
                                                                        aria-label={`Frase de la fase ${PHASE_DEFAULTS[key].name}`}
                                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-1.5 px-3 text-xs font-medium outline-none focus:border-primary"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Campos específicos de este formulario */}
                                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-4 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
                                                <div>
                                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                                                        Campos solicitados en este formulario
                                                    </h5>
                                                    <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                                                        Activa, marca como obligatorios o cambia el nombre de los campos para este enlace.
                                                    </p>
                                                </div>

                                                <div className="flex items-center bg-slate-200/80 dark:bg-white/10 p-1 rounded-xl self-start sm:self-auto shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPresetSectionTab('owner')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                            presetSectionTab === 'owner'
                                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
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
                                                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        <PawPrint size={13} />
                                                        <span>Ángel ({presetFields.filter(f => f.section === 'pet' && f.visible).length})</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 pb-1">
                                                <span className="text-[11px] font-semibold text-slate-500 dark:text-muted-foreground">Siempre obligatorios:</span>
                                                {FIXED_FIELDS[presetSectionTab].map(fixedName => (
                                                    <span key={fixedName} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                                                        <Lock size={11} className="text-primary" />
                                                        {fixedName}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className={`${FIELD_GRID} pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground border-b border-slate-200 dark:border-white/5`}>
                                                <span>Campo</span>
                                                <span className="text-center">Mostrar</span>
                                                <span className="text-center">Obligatorio</span>
                                            </div>

                                            <div className="divide-y divide-slate-200/70 dark:divide-white/5">
                                                {presetFields
                                                    .filter(f => f.section === presetSectionTab)
                                                    .map(f => {
                                                        const status = !f.visible ? 'Oculto' : f.required ? 'Obligatorio' : 'Opcional';
                                                        const statusClass = !f.visible
                                                            ? 'text-slate-400 dark:text-slate-500'
                                                            : f.required
                                                                ? 'text-primary font-bold'
                                                                : 'text-emerald-600 dark:text-emerald-400 font-bold';
                                                        return (
                                                            <div key={f.key} className={`${FIELD_GRID} py-2.5`}>
                                                                <div className="min-w-0 pr-2">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <p className={`text-xs sm:text-sm font-bold break-words ${f.visible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                                                                            {f.label}
                                                                        </p>
                                                                        <span className={`text-[10px] ${statusClass}`}>· {status}</span>
                                                                    </div>
                                                                    {f.visible && (
                                                                        <input
                                                                            type="text"
                                                                            value={f.customLabel || ''}
                                                                            onChange={e => updatePresetField(f.key, { customLabel: e.target.value })}
                                                                            maxLength={MAX_FIELD_LABEL}
                                                                            placeholder={`Etiqueta personalizada (por defecto: ${f.label})`}
                                                                            aria-label={`Nombre de ${f.label} en este formulario`}
                                                                            className="mt-1.5 w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] text-slate-900 dark:text-white placeholder:text-slate-400 rounded-lg py-1 px-2.5 outline-none focus:border-primary"
                                                                        />
                                                                    )}
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
                                                                        checked={f.required && !NEVER_REQUIRED.has(f.key)}
                                                                        disabled={!f.visible || NEVER_REQUIRED.has(f.key)}
                                                                        onChange={v => updatePresetField(f.key, { required: v })}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ========================================== */}
                                {/* PESTAÑA 3: BIENVENIDA Y PLAZO */}
                                {/* ========================================== */}
                                {presetModalTab === 'bienvenida' && (
                                    <div className="space-y-4">
                                        {/* Mensaje de bienvenida específico para este formulario */}
                                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                                        Mensaje de bienvenida propio para este formulario
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                                        Si lo dejas desactivado, usará el mensaje de condolencias general del crematorio.
                                                    </p>
                                                </div>
                                                <Toggle
                                                    label="Personalizar mensaje de bienvenida para este formulario"
                                                    checked={presetWelcomeCustom}
                                                    onChange={setPresetWelcomeCustom}
                                                />
                                            </div>

                                            {presetWelcomeCustom && (
                                                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
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
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-primary font-semibold"
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
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-primary font-semibold"
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
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-primary font-medium resize-none"
                                                        />
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
                                                                    className={`px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${presetVideoMode === id ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
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
                                                                                className={`px-3 py-1.5 rounded-lg cursor-pointer ${presetVideoPosition === id ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
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
                                                                    className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl py-2 px-3 outline-none focus:border-primary font-semibold"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Plazo de entrega específico */}
                                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-2">
                                            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Plazo o Nota de Entrega Específico (Opcional)
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                                Si lo dejas vacío, se mostrará el aviso de entrega general del crematorio.
                                            </p>
                                            <input
                                                type="text"
                                                value={presetDeliveryNotice}
                                                onChange={e => setPresetDeliveryNotice(e.target.value)}
                                                placeholder="Ej: Entrega en 48 horas hábiles"
                                                maxLength={200}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm font-medium outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pie fijo del modal con navegación entre pasos y botón de guardado */}
                            <div className="px-5 sm:px-7 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2">
                                    {presetModalTab !== 'general' && (
                                        <button
                                            type="button"
                                            onClick={() => setPresetModalTab(presetModalTab === 'bienvenida' ? 'pasos' : 'general')}
                                            className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-all cursor-pointer"
                                        >
                                            <ChevronLeft size={15} />
                                            Anterior
                                        </button>
                                    )}
                                    {presetModalTab !== 'bienvenida' && (
                                        <button
                                            type="button"
                                            onClick={() => setPresetModalTab(presetModalTab === 'general' ? 'pasos' : 'bienvenida')}
                                            className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-200/80 hover:bg-slate-300/70 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white transition-all cursor-pointer"
                                        >
                                            Siguiente paso
                                            <ChevronRight size={15} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2.5 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingPreset(false);
                                            setEditingPresetId(null);
                                        }}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveNewPreset}
                                        disabled={savingPreset}
                                        className="disabled:opacity-60 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs sm:text-sm transition-all shadow-md shadow-primary/20 hover:opacity-95 cursor-pointer"
                                    >
                                        {savingPreset ? 'Subiendo video…' : editingPresetId ? 'Guardar cambios' : 'Crear y copiar enlace'}
                                    </button>
                                </div>
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
        <section className={`space-y-4 rounded-3xl transition-all ${!isActive ? 'opacity-80' : ''}`}>
            {/* Tarjeta de cabecera de la fase con switch maestro */}
            <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                isActive
                    ? 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/60 shadow-xs'
                    : 'border-amber-300 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/5'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 dark:bg-white/5 dark:border-white/10 shrink-0 dark:text-white">
                            <Icon size={20} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                    Paso {num} de 4
                                </span>
                                <span className="text-slate-300 dark:text-white/30 text-xs">·</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                    isActive
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                }`}>
                                    {isActive ? 'Visible en formulario' : 'Paso oculto'}
                                </span>
                            </div>
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                {name} · {title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 max-w-2xl">
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                        <span className="text-xs font-bold text-slate-700 dark:text-white/80">
                            {isActive ? 'Paso activo' : 'Paso oculto'}
                        </span>
                        <Toggle
                            label={`Mostrar fase ${name} en el formulario`}
                            checked={isActive}
                            onChange={onToggle}
                        />
                    </div>
                </div>

                {!isActive && (
                    <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-500/15 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                        <Info size={14} className="shrink-0" />
                        <span>Este paso está oculto. La familia no lo verá y avanzará directamente al siguiente paso activo.</span>
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
    return <span className="md:hidden block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground mb-1 ml-1">{children}</span>;
}

/** Subir / bajar / eliminar un rango de peso (al guardar igual se ordenan por «desde»). */
function TierActions({ idx, total, onMove, onRemove, className = '' }: {
    idx: number;
    total: number;
    onMove: (dir: -1 | 1) => void;
    onRemove: () => void;
    className?: string;
}) {
    const moveCls = 'flex h-[42px] w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-foreground/5 hover:text-slate-900 dark:hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer';
    return (
        <div className={`${className} shrink-0 items-center gap-0.5`}>
            <button type="button" onClick={() => onMove(-1)} disabled={idx === 0} aria-label={`Subir rango ${idx + 1}`} title="Subir" className={moveCls}>
                <ChevronUp size={16} />
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={idx === total - 1} aria-label={`Bajar rango ${idx + 1}`} title="Bajar" className={moveCls}>
                <ChevronDown size={16} />
            </button>
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Eliminar rango ${idx + 1}`}
                title="Eliminar"
                className="flex h-[42px] w-9 shrink-0 items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

function PriceToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">{description}</p>
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
