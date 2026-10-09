// Configuración del formulario público (el que se envía a la familia).
// Espejo de backend/app/services/public_form_config.py: el backend entrega la
// configuración ya normalizada; estos valores por defecto solo cubren respuestas
// antiguas o un fallo de carga, y reproducen el formulario previo.

export type FormFieldKey =
    | 'rut' | 'email' | 'contactPreference' | 'pickup' | 'address' | 'comments'
    | 'nickname' | 'breed' | 'weight' | 'age' | 'birthDate' | 'deathDate';

export interface FormFieldSetting {
    visible: boolean;
    required: boolean;
}

export interface PublicFormConfig {
    fields: Record<FormFieldKey, FormFieldSetting>;
    show_weight_prices: boolean;
    /** Muestra el precio de planes/servicios y el total estimado en el resumen */
    show_service_prices: boolean;
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

export const DEFAULT_FORM_CONFIG: PublicFormConfig = {
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
    },
    show_weight_prices: false,
    show_service_prices: false,
};

export function resolveFormConfig(raw?: Partial<PublicFormConfig> | null): PublicFormConfig {
    return {
        fields: { ...DEFAULT_FORM_CONFIG.fields, ...(raw?.fields || {}) },
        show_weight_prices: !!raw?.show_weight_prices,
        show_service_prices: !!raw?.show_service_prices,
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
