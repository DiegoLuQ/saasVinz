'use client';

/**
 * Planes de memorial que Vinzer vende a las familias (Recuerdo / Eterno / Infinito).
 * Precio y límites viven en la base (Admin → Memoriales → «Planes y precios», rec_plans);
 * aquí solo se leen (`GET /api/public/memorial-plans`) y se convierten en textos.
 * Partner = el plan de los memoriales de crematorios (no se vende).
 */
import { useEffect, useState } from 'react';

export type MemorialBilling = 'yearly' | 'one_time' | 'included';

export interface MemorialPlanFeatures {
    max_images: number;
    max_dedications: number;
    max_dedication_chars: number;
    max_melodies: number;
    qr: boolean;
    timeline: boolean;
    max_timeline: number;
    max_videos: number;
    max_voice: number;
    expired_images: number;
    expired_dedications: number;
}

export interface MemorialPlanInfo {
    id?: number;
    key: string;
    name: string;
    kind?: string;
    price: number;
    original_price?: number;
    final_price?: number;
    discount_percent?: number;
    discount_label?: string | null;
    currency: string;
    billing: MemorialBilling;
    description?: string | null;
    highlight?: boolean;
    sort_order?: number;
    is_active?: boolean;
    features: MemorialPlanFeatures;
}

const base = { max_dedication_chars: 500, expired_images: 3, expired_dedications: 5 };

/** Solo mientras carga la API (mismos valores que la migración a9c1e3f5b708). */
export const FALLBACK_MEMORIAL_PLANS: MemorialPlanInfo[] = [
    { key: 'recuerdo', name: 'Recuerdo', price: 39, currency: 'USD', billing: 'yearly', description: 'Su recuerdo, siempre cerca.',
      features: { ...base, max_images: 10, max_dedications: 30, max_melodies: 1, qr: false, timeline: false, max_timeline: 0, max_videos: 0, max_voice: 0 } },
    { key: 'eterno', name: 'Eterno', price: 79, currency: 'USD', billing: 'yearly', highlight: true, description: 'Su historia completa, en una línea de tiempo.',
      features: { ...base, max_images: 30, max_dedications: 50, max_melodies: 3, qr: true, timeline: true, max_timeline: 50, max_videos: 0, max_voice: 0 } },
    { key: 'infinito', name: 'Infinito', price: 135, currency: 'USD', billing: 'one_time', description: 'Para siempre, con su voz y un video.',
      features: { ...base, max_images: 150, max_dedications: 100, max_melodies: 3, qr: true, timeline: true, max_timeline: 100, max_videos: 1, max_voice: 1 } },
];

let cache: Promise<MemorialPlanInfo[]> | null = null;

export function fetchMemorialPlans(): Promise<MemorialPlanInfo[]> {
    if (!cache) {
        cache = fetch('/api/public/memorial-plans')
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((rows: MemorialPlanInfo[]) => (Array.isArray(rows) && rows.length ? rows : FALLBACK_MEMORIAL_PLANS))
            .catch(() => { cache = null; return FALLBACK_MEMORIAL_PLANS; });
    }
    return cache;
}

/** Planes vigentes; mientras cargan, los valores por defecto. */
export function useMemorialPlans(): MemorialPlanInfo[] {
    return useMemorialPlansState().plans;
}

/** Igual que useMemorialPlans, indicando si ya llegaron los planes de la API. */
export function useMemorialPlansState(): { plans: MemorialPlanInfo[]; loaded: boolean } {
    const [state, setState] = useState<{ plans: MemorialPlanInfo[]; loaded: boolean }>({ plans: FALLBACK_MEMORIAL_PLANS, loaded: false });
    useEffect(() => {
        let alive = true;
        fetchMemorialPlans().then((p) => { if (alive) setState({ plans: p, loaded: true }); });
        return () => { alive = false; };
    }, []);
    return state;
}

export const formatPrice = (price: number) => String(Math.round(price));

export function planPeriod(billing: MemorialBilling | string | null | undefined, en = false): string {
    if (billing === 'one_time') return en ? 'one-time payment' : 'pago único';
    if (billing === 'included') return en ? 'included' : 'incluido';
    return en ? '/ year' : '/ año';
}

export type CompareValue = string | boolean;
export interface CompareRow { label: string; values: CompareValue[] }

/** Filas de comparación construidas desde los límites de cada plan. */
export function compareRows(plans: MemorialPlanInfo[], en = false): CompareRow[] {
    const upTo = (n: number) => (en ? `Up to ${n}` : `Hasta ${n}`);
    return [
        { label: en ? 'Billing' : 'Cobro', values: plans.map((p) => (p.billing === 'one_time' ? (en ? 'One-time' : 'Pago único') : (en ? 'Yearly' : 'Anual'))) },
        { label: en ? 'Gallery photos' : 'Fotos de la galería', values: plans.map((p) => upTo(p.features.max_images)) },
        { label: en ? 'Messages of love' : 'Mensajes de cariño', values: plans.map((p) => upTo(p.features.max_dedications)) },
        { label: en ? 'Candles, flowers and kisses' : 'Velas, flores y besos', values: plans.map(() => (en ? 'Unlimited' : 'Ilimitados')) },
        { label: en ? 'Background music' : 'Música de fondo', values: plans.map((p) => (p.features.max_melodies > 1 ? (en ? `${p.features.max_melodies} melodies to choose` : `${p.features.max_melodies} melodías a elegir`) : (en ? '1 melody' : '1 melodía'))) },
        { label: en ? 'Life timeline' : 'Línea de tiempo de su vida', values: plans.map((p) => (p.features.timeline && p.features.max_timeline > 0 ? (en ? `${p.features.max_timeline} moments` : `${p.features.max_timeline} momentos`) : false)) },
        { label: en ? 'Printable QR code' : 'Código QR para imprimir', values: plans.map((p) => p.features.qr) },
        { label: en ? '30-second video' : 'Video de 30 segundos', values: plans.map((p) => p.features.max_videos > 0) },
        { label: en ? 'Their voice (30 s audio)' : 'Su voz (audio de 30 s)', values: plans.map((p) => p.features.max_voice > 0) },
        { label: en ? 'Private memorial with PIN' : 'Memorial privado con PIN', values: plans.map(() => true) },
        { label: en ? 'Stays online' : 'Permanencia', values: plans.map((p) => (p.billing === 'one_time' ? (en ? 'Forever' : 'Para siempre') : (en ? '12 months, renewable' : '12 meses, renovable'))) },
    ];
}

/** Lo más importante de cada plan, para las tarjetas. */
export function planHighlights(p: MemorialPlanInfo, en = false): string[] {
    const f = p.features;
    const out = [
        en ? `Up to ${f.max_images} photos` : `Hasta ${f.max_images} fotos`,
        en ? `Up to ${f.max_dedications} messages · unlimited candles` : `Hasta ${f.max_dedications} mensajes · velas ilimitadas`,
        f.max_melodies > 1 ? (en ? `${f.max_melodies} melodies to choose from` : `${f.max_melodies} melodías a elegir`) : (en ? 'Background melody' : 'Melodía de fondo'),
    ];
    if (f.timeline && f.max_timeline > 0) out.push(en ? `Life timeline (${f.max_timeline} moments)` : `Línea de tiempo (${f.max_timeline} momentos)`);
    if (f.qr) out.push(en ? 'Printable QR code' : 'Código QR para imprimir');
    if (f.max_videos > 0) out.push(en ? '30-second video' : 'Un video de 30 segundos');
    if (f.max_voice > 0) out.push(en ? 'Their voice, 30 seconds' : 'Su voz, 30 segundos');
    out.push(p.billing === 'one_time' ? (en ? 'Forever, no renewals' : 'Para siempre, sin renovaciones') : (en ? '12 months, renewable at the same price' : '12 meses, renovable al mismo precio'));
    return out;
}
