// Configuración del formulario público (el que se envía a la familia).
// Espejo de backend/app/services/public_form_config.py: el backend entrega la
// configuración ya normalizada; estos valores por defecto solo cubren respuestas
// antiguas o un fallo de carga, y reproducen el formulario previo.

export type FormFieldKey =
    | 'rut' | 'email' | 'contactPreference' | 'pickup' | 'address' | 'comments'
    | 'nickname' | 'breed' | 'weight' | 'age' | 'birthDate' | 'deathDate' | 'healthStatus';

export type PhaseKey = 'familia' | 'angel' | 'camino' | 'recuerdos';

export interface PhaseConfig {
    familia: boolean;
    angel: boolean;
    camino: boolean;
    recuerdos: boolean;
}

export interface MemoriesConfig {
    allow_photos: boolean;
    require_photos: boolean;
    allow_dedication: boolean;
    require_dedication: boolean;
    allow_suggestions: boolean;
}

export interface FormFieldSetting {
    visible: boolean;
    required: boolean;
}

/** Video de bienvenida (planes PRO/ULTRA): archivo en R2 o reproductor de Vimeo / Cloudflare Stream. Máx. 30 s. */
export interface FormVideo {
    source: 'upload' | 'vimeo' | 'cloudflare';
    url: string;
    duration: number;
}

export interface WelcomeModalConfig {
    enabled?: boolean;
    title?: string | null;
    message?: string | null;
    button_text?: string | null;
    /** Botón "Ver video" dentro del mensaje. En un formulario personalizado, null = hereda del general. */
    show_video_button?: boolean | null;
    video_button_text?: string | null;
    /** En un formulario personalizado, null = usa el video general. */
    video?: FormVideo | null;
    /** Dónde aparece el botón del video: 'start' = mensaje de bienvenida, 'end' = pantalla final tras enviar. En un formulario personalizado, null = hereda. */
    video_position?: 'start' | 'end' | null;
}

/** Mezcla el mensaje de un formulario personalizado sobre el general: lo vacío hereda. */
export function mergeWelcomeModal(base: WelcomeModalConfig | undefined, override: WelcomeModalConfig | null | undefined): WelcomeModalConfig | undefined {
    if (!override) return base;
    const merged: WelcomeModalConfig = { ...(base || {}) };
    for (const [k, v] of Object.entries(override) as [keyof WelcomeModalConfig, unknown][]) {
        if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) continue;
        (merged as Record<string, unknown>)[k] = v;
    }
    return merged;
}

export const DEFAULT_WELCOME_MODAL_CONFIG: WelcomeModalConfig = {
    enabled: true,
    title: 'Lamentamos tu pérdida',
    message: 'En estos momentos difíciles, en {empresa} queremos acompañarte y brindarte todo nuestro apoyo. Estamos aquí para ayudarte a honrar la memoria de tu ser querido.',
    button_text: 'Continuar',
    show_video_button: false,
    video_button_text: 'Ver video',
    video: null,
    video_position: 'start',
};

export interface CustomFormPreset {
    id: string;
    name: string;
    description?: string;
    phases?: Partial<PhaseConfig>;
    include_health_status?: boolean;
    delivery_notice?: string | null;
    fields?: Partial<Record<FormFieldKey, FormFieldSetting>>;
    welcome_modal?: WelcomeModalConfig | null;
    associated_service_id?: string | null;
    created_at?: string;
}

export interface PublicFormConfig {
    phases: PhaseConfig;
    fields: Record<FormFieldKey, FormFieldSetting>;
    show_weight_prices: boolean;
    /** Muestra el precio de planes/servicios y el total estimado en el resumen */
    show_service_prices: boolean;
    memories: MemoriesConfig;
    delivery_notice?: string | null;
    welcome_modal?: WelcomeModalConfig;
    custom_forms?: CustomFormPreset[];
}

/** Tramo de peso "hasta X kg" del crematorio (max_weight null = abierto). */
export interface WeightTier {
    id: number;
    label: string | null;
    min_weight: number;
    max_weight: number | null;
    range_text: string;
    price?: number;
}

export const DEFAULT_PHASES: PhaseConfig = {
    familia: true,
    angel: true,
    camino: true,
    recuerdos: true,
};

export const DEFAULT_MEMORIES_CONFIG: MemoriesConfig = {
    allow_photos: true,
    require_photos: false,
    allow_dedication: true,
    require_dedication: false,
    allow_suggestions: true,
};

export const DEFAULT_FORM_CONFIG: PublicFormConfig = {
    phases: DEFAULT_PHASES,
    fields: {
        rut: { visible: false, required: false },
        email: { visible: false, required: false },
        contactPreference: { visible: true, required: false },
        pickup: { visible: true, required: true },
        address: { visible: true, required: true },
        comments: { visible: true, required: false },
        nickname: { visible: false, required: false },
        breed: { visible: false, required: false },
        weight: { visible: true, required: true },
        age: { visible: true, required: true },
        birthDate: { visible: false, required: false },
        deathDate: { visible: false, required: false },
        healthStatus: { visible: false, required: false },
    },
    show_weight_prices: false,
    show_service_prices: false,
    memories: DEFAULT_MEMORIES_CONFIG,
    delivery_notice: null,
    welcome_modal: DEFAULT_WELCOME_MODAL_CONFIG,
    custom_forms: [],
};

export function resolveFormConfig(raw?: Partial<PublicFormConfig> | null): PublicFormConfig {
    return {
        phases: { ...DEFAULT_PHASES, ...(raw?.phases || {}) },
        fields: { ...DEFAULT_FORM_CONFIG.fields, ...(raw?.fields || {}) },
        show_weight_prices: !!raw?.show_weight_prices,
        show_service_prices: !!raw?.show_service_prices,
        memories: { ...DEFAULT_MEMORIES_CONFIG, ...(raw?.memories || {}) },
        delivery_notice: raw?.delivery_notice || null,
        welcome_modal: {
            ...DEFAULT_WELCOME_MODAL_CONFIG,
            ...(raw?.welcome_modal || {}),
        },
        custom_forms: raw?.custom_forms || [],
    };
}

/** Sufijo de etiqueta: " *" si es obligatorio, " (Opcional)" si no. */
export function fieldSuffix(setting: FormFieldSetting): string {
    return setting.required ? ' *' : ' (Opcional)';
}

/** Nombre visible de un tramo: "Pequeño · Hasta 4 kg" o solo el rango. */
export function tierDisplay(tier: Pick<WeightTier, 'label' | 'range_text'>): string {
    return tier.label ? `${tier.label} · ${tier.range_text}` : tier.range_text;
}

/** Tramo que cubre un peso exacto: el primero (por máximo ascendente) cuyo
 *  máximo lo cubre; bajo el mínimo del primero no hay tramo. Misma regla que
 *  weight_surcharge del backend. */
export function tierForWeight(tiers: WeightTier[], weight: number): WeightTier | null {
    if (!weight || weight <= 0 || tiers.length === 0) return null;
    const sorted = [...tiers].sort((a, b) => (a.max_weight ?? Infinity) - (b.max_weight ?? Infinity));
    if (weight < (sorted[0].min_weight ?? 0)) return null;
    return sorted.find(t => t.max_weight == null || weight <= t.max_weight) ?? null;
}

export const formatCLP = (value: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
