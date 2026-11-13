/**
 * Diagnóstico 360°. Admin: /api/internal/creator/diagnostics; landing pública
 * vinzer.cl/diagnostico: /api/public/diagnostic (backend services/diagnostics.py;
 * especificación docs/DIAGNOSTICO_360.md). Tipos compartidos por el admin, la landing y el PDF.
 */
export const DIAG_API = '/api/internal/creator/diagnostics';
export const PUBLIC_DIAG_API = '/api/public/diagnostic';

export type DiagMode = 10 | 15 | 20;
export const MODES: { value: DiagMode; label: string; minutes: number; description: string }[] = [
    { value: 10, label: 'Rápido', minutes: 3, description: 'Una foto general de tu crematorio en lo esencial.' },
    { value: 15, label: 'Estándar', minutes: 5, description: 'Profundiza en las áreas clave para un resultado más preciso.' },
    { value: 20, label: 'Completo', minutes: 8, description: 'Revisa todas las áreas a fondo, con todas las recomendaciones.' },
];

export interface DiagOption { text: string; pct: number }

export interface DiagCategory {
    id: number; key: string; name: string; weight: number;
    vinzer_feature: string | null; sort_order: number;
}

export interface DiagQuestion {
    id: number; category_id: number; category_key: string; category_name: string;
    text: string; help: string | null; options: DiagOption[]; allows_na: boolean;
    modes: number[]; recommendation: string | null; vinzer_feature: string | null;
    sort_order: number; is_active: boolean;
}

export interface QuestionsResponse {
    questions: DiagQuestion[];
    categories: DiagCategory[];
    mode_counts: Record<string, number>;
}

export interface DiagAnswer {
    question_id: number; category_key: string; category_name: string;
    question: string; help: string | null; vinzer_feature: string | null;
    na: boolean; option_index: number | null; answer: string | null;
    pct: number | null; recommendation: string | null;
}

export interface DiagCategoryScore {
    key: string; name: string; weight: number; pct: number | null;
    questions: number; applicable: number; vinzer_feature: string | null;
}

export interface SuggestedPlan {
    plan: string; reason: string; start_free: boolean;
    /** Plan según sus respuestas; `by_volume` = se subió a `plan` por las cremaciones al mes. */
    needs_plan?: string; by_volume?: boolean;
}

export type DiagStatus = 'nuevo' | 'contactado' | 'demo' | 'cliente' | 'descartado';

export interface DiagnosticRow {
    id: number; business_name: string; contact_name: string | null; city: string | null;
    region: string | null; email: string | null; phone: string | null; website: string | null;
    monthly_cremations: number | null; consent: boolean; mode: DiagMode;
    total_pct: number | null; level: string | null; is_partial: boolean;
    suggested_plan: SuggestedPlan | null; status: DiagStatus; linked_tenant_id: number | null;
    sent_at: string | null; created_at: string; updated_at: string;
    source: 'admin' | 'web'; completed_at: string | null;
    utm: Record<string, string> | null; public_url: string | null;
}

/** Informe (lo mismo que ve el crematorio en su página y en el PDF). */
export interface DiagnosticReport {
    business_name: string; contact_name: string | null; city: string | null; region: string | null;
    mode: DiagMode; created_at: string; completed_at: string | null;
    total_pct: number | null; level: string | null; is_partial: boolean; level_message: string | null;
    answers: DiagAnswer[];
    category_scores: DiagCategoryScore[];
    suggested_plan: SuggestedPlan | null;
    plan_price: { name: string; price: number; annual_price: number | null } | null;
    cta_url: string;
    promo_pct: number;
    promo_text: string | null;
    sales_whatsapp: string | null;
}

export type DiagnosticFull = DiagnosticRow & DiagnosticReport & { notes: string | null };

/** Preguntas de la landing pública (sin los %). */
export interface PublicDiagQuestion {
    id: number; category_name: string; text: string; help: string | null;
    options: string[]; allows_na: boolean; modes: DiagMode[];
}
export interface PublicDiagConfig {
    mode: DiagMode; modes: { value: DiagMode; count: number }[];
    volume_ranges: { value: number; label: string }[];
    questions: PublicDiagQuestion[]; promo_pct: number; promo_text: string | null;
}

export interface DiagLevel { min: number; name: string; message: string }

export interface DiagConfig {
    levels: DiagLevel[];
    recommend_below: number;
    min_applicable: number;
    plan_rules: { free_below: number };
    cta_url: string;
    public_mode: DiagMode;
    promo_pct: number;
    promo_text: string | null;
}

export interface DiagSummary {
    count: number;
    avg_total: number | null;
    by_level: { name: string; count: number }[];
    by_status: Record<DiagStatus, number>;
    categories: { key: string; name: string; avg: number; count: number }[];
    registered: number;
    from_web: number;
    incomplete: number;
}

export const STATUS_META: Record<DiagStatus, { label: string; cls: string }> = {
    nuevo: { label: 'Nuevo', cls: 'bg-sky-500/15 text-sky-300' },
    contactado: { label: 'Contactado', cls: 'bg-violet-500/15 text-violet-300' },
    demo: { label: 'Demo', cls: 'bg-amber-500/15 text-amber-300' },
    cliente: { label: 'Cliente', cls: 'bg-emerald-500/15 text-emerald-300' },
    descartado: { label: 'Descartado', cls: 'bg-white/10 text-white/50' },
};

/** Semáforo del % (mismo umbral en pantalla y en el PDF). */
export function pctTone(pct: number | null | undefined, below = 60): 'good' | 'mid' | 'bad' | 'none' {
    if (pct === null || pct === undefined) return 'none';
    if (pct >= 80) return 'good';
    if (pct >= below) return 'mid';
    return 'bad';
}

export const TONE_HEX = { good: '#10b981', mid: '#f59e0b', bad: '#ef4444', none: '#94a3b8' } as const;

export const fmtPct = (pct: number | null | undefined) =>
    pct === null || pct === undefined ? '—' : `${Math.round(pct)} %`;

export const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

/** wa.me con el mensaje ya escrito (celular chileno de 9 dígitos sin código → +56). */
export function waLink(phone: string | null | undefined, text: string): string | null {
    let digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 9 && digits.startsWith('9')) digits = `56${digits}`;
    return digits.length >= 10 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

/** Precio con el descuento de la promoción (redondeado a la decena). */
export const promoPrice = (price: number, pct: number) => Math.round((price * (1 - pct / 100)) / 10) * 10;

export const pdfFileName = (business: string) =>
    `diagnostico-360-${(business || 'crematorio').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`;
