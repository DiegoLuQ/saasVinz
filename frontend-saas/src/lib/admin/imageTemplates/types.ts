export type AspectRatio = '9:16' | '4:5' | '3:4' | '4:3' | '1:1';
export type FontFamily =
    | 'Playfair Display'
    | 'Cormorant Garamond'
    | 'Lora'
    | 'Cinzel'
    | 'Great Vibes'
    | 'Alex Brush'
    | 'Dancing Script'
    | 'Montserrat'
    | 'Quicksand';
export type TextBinding =
    // Mascota
    | 'pet_name' | 'species' | 'breed' | 'age' | 'size' | 'birth_date' | 'death_date' | 'life_range'
    // Dueño
    | 'owner_name' | 'owner_phone' | 'owner_email'
    // Crematorio
    | 'tenant_name' | 'tenant_rut' | 'tenant_phone' | 'tenant_email' | 'tenant_address' | 'tenant_city' | 'tenant_legal_rep'
    // Redes sociales del crematorio
    | 'tenant_instagram' | 'tenant_facebook' | 'tenant_tiktok' | 'tenant_youtube' | 'tenant_website' | 'tenant_whatsapp'
    // Contenido
    | 'date' | 'phrase' | 'ai_text' | 'static';

/** Imágenes que vienen de los datos (no de un archivo fijo de la plantilla). */
export type ImageBinding = 'tenant_logo';
export type PhotoShape = 'circle' | 'square' | 'rounded';
export type PhotoSlot = 'photo_1' | 'photo_2' | 'photo_3';

export interface BackgroundDef {
    type: 'color' | 'image';
    value: string;
    opacity: number;
}

// Posiciones y tamaños en % del lienzo (0..100): la misma plantilla escala
// entre tamaños y relaciones de aspecto. x/y son el CENTRO de la capa.
export interface TextLayer {
    type: 'text';
    id: string;
    binding: TextBinding;
    static_text?: string;
    x: number;
    y: number;
    width: number;
    /** Alto máximo (% del lienzo). Si se define, la letra se achica para que el texto quepa. */
    height?: number;
    font_family: FontFamily;
    font_size: number;
    font_weight: '400' | '500' | '600' | '700';
    italic: boolean;
    color: string;
    align: 'left' | 'center' | 'right';
    letter_spacing: number;
    line_height?: number;
    shadow: boolean;
}

export type PhotoSource = 'pet' | 'ai';

export interface PhotoLayer {
    type: 'photo';
    id: string;
    /** 'pet' = foto real de la mascota (según `slot`); 'ai' = ilustración IA generada desde la Foto 1. */
    source?: PhotoSource;
    /** Qué foto de la mascota ocupa este hueco (solo source 'pet'). */
    slot?: PhotoSlot;
    /** Solo source 'ai': foto de la mascota desde la que se genera la ilustración (por defecto Foto 1). */
    ai_from?: PhotoSlot;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: PhotoShape;
    border_color: string;
    border_width: number;
    /** Resplandor/difuminado alrededor de la foto (como el editor HTML original). */
    glow_color?: string;
    glow_blur?: number;
}

export interface StickerLayer {
    type: 'sticker';
    id: string;
    url: string;
    /** Si se define, la imagen sale de los datos (ej. logo del crematorio) en vez de `url`. */
    binding?: ImageBinding;
    x: number;
    y: number;
    /** Ancho en % del lienzo; el alto sale de la proporción de la imagen. */
    width: number;
    rotation: number;
    opacity: number;
}

export type Layer = TextLayer | PhotoLayer | StickerLayer;

export interface TemplateDefinition {
    background: BackgroundDef;
    layers: Layer[];
}

export interface ImageTemplate {
    id: number;
    name: string;
    description: string | null;
    default_phrase: string | null;
    supported_ratios: AspectRatio[];
    definition: TemplateDefinition;
    thumbnail_url: string | null;
    ai_text_prompt: string | null;
    ai_image_prompt: string | null;
    ai_text_max_chars: number;
    /** null = global; con valor = exclusiva de ese tenant. */
    tenant_id: number | null;
    usage_count: number;
    is_locked: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface ImageTemplateCreate {
    name: string;
    description?: string | null;
    default_phrase?: string | null;
    supported_ratios: AspectRatio[];
    definition: TemplateDefinition;
    thumbnail_url?: string | null;
    ai_text_prompt?: string | null;
    ai_image_prompt?: string | null;
    ai_text_max_chars?: number;
    tenant_id?: number | null;
    is_active?: boolean;
}

export type ImageTemplateUpdate = Partial<ImageTemplateCreate>;

/** Ajuste de encuadre que hace el tenant sobre cada foto (no se guarda en la plantilla). */
export interface PhotoFill {
    url: string | null;
    zoom: number;
    /** Desplazamiento en % del tamaño del hueco (-50..50). */
    offset_x: number;
    offset_y: number;
}

/** Fotos por hueco: `photo_1`/`photo_2` = fotos de la mascota, `ai` = ilustración IA. */
export type PhotoFills = Partial<Record<PhotoSlot | 'ai', PhotoFill>>;

export interface AiMeta {
    configured: boolean;
    image_configured: boolean;
    text_model: string;
    image_model: string;
    max_text_chars: number;
    placeholders: Record<string, string>;
    default_text_prompt: string;
    default_image_prompt: string;
}

export interface AiTextResult {
    text: string;
    chars: number;
    max_chars: number;
    duration_ms?: number | null;
}

/** Uso de una plantilla por los crematorios (GET /creator/image-templates/stats/usage). */
export interface TemplateUsageTenant {
    tenant_id: number;
    tenant_name: string;
    designs: number;
    illustrations: number;
    ai_generations: number;
    last_used_at: string | null;
}

export interface TemplateUsageItem {
    id: number;
    url: string;
    title: string;
    kind: 'design' | 'illustration';
    tenant_name: string | null;
    created_at: string;
}

/** Último diseño completo creado con la plantilla: receta (sin archivo) o imagen. */
export interface TemplateLatestDesign {
    id: number;
    /** Solo diseños antiguos guardados como archivo; las recetas vienen sin url. */
    url: string | null;
    meta: import('@/lib/tenant/imageTemplates').DesignRecipe | null;
    /** Datos actuales de mascota, dueño y crematorio para redibujar la receta. */
    bindings: Record<string, string> | null;
    title: string;
    tenant_name: string | null;
    created_at: string;
}

export interface TemplateUsage {
    tenants_count: number;
    designs: number;
    illustrations: number;
    ai_generations: number;
    tenants: TemplateUsageTenant[];
    latest: TemplateUsageItem[];
    latest_design?: TemplateLatestDesign | null;
}
