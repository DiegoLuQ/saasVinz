export type AspectRatio = '9:16' | '3:4' | '4:3' | '1:1';
export type FontFamily = 'Playfair Display' | 'Cormorant Garamond' | 'Lora';
export type TextBinding = 'pet_name' | 'date' | 'phrase' | 'static';
export type PhotoShape = 'circle' | 'square' | 'rounded';

export interface BackgroundDef {
    type: 'color' | 'image';
    value: string;
    opacity: number;
}

export interface TextLayer {
    type: 'text';
    id: string;
    binding: TextBinding;
    static_text?: string;
    x: number;
    y: number;
    width: number;
    font_family: FontFamily;
    font_size: number;
    font_weight: '400' | '500' | '600' | '700';
    italic: boolean;
    color: string;
    align: 'left' | 'center' | 'right';
    letter_spacing: number;
    shadow: boolean;
}

export interface PhotoLayer {
    type: 'photo';
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: PhotoShape;
    border_color: string;
    border_width: number;
}

export type Layer = TextLayer | PhotoLayer;

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
    is_active?: boolean;
}

export type ImageTemplateUpdate = Partial<ImageTemplateCreate>;
