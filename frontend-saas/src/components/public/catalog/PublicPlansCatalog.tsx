"use client";

import { vinzerPromoUrl, buildPublicFormUrl } from '@/lib/publicUrls';
import React, { useEffect, useMemo, useState } from 'react';
import { catalogSessionId, trackCatalogEvent, type CatalogEventKind } from '@/lib/catalogEvents';
import localFont from 'next/font/local';
import { DEFAULT_CATALOG_INTRO } from '@/lib/catalogDefaults';
import { planFitsWeight, type WeightTier } from '@/lib/publicFormConfig';
import FormVideoPlayer from '@/components/public/FormVideoPlayer';
import {
    ArrowRight, Check, ChevronDown, Facebook, Feather, Globe, Info, Instagram, Mail, MapPin, MessageCircle, Phone, Play, Plus, Search, Share2, Sparkles, X,
    PawPrint,
} from 'lucide-react';

// Fuentes autoalojadas (OFL, variables, subconjunto latino) en src/fonts.
// Con next/font/google el build en Docker fallaba cuando Google entregaba URLs
// "/l/font?kit=…&skey=…" que Turbopack no procesa; así el build no depende de Google.
const serif = localFont({
    src: '../../../fonts/CormorantGaramond-Variable-latin.woff2',
    weight: '300 700',
    display: 'swap',
    variable: '--cat-serif',
});
const sans = localFont({
    src: '../../../fonts/PlusJakartaSans-Variable-latin.woff2',
    weight: '200 800',
    display: 'swap',
    variable: '--cat-sans',
});

export interface PublicPlanItem {
    name: string;
    description?: string | null;
    image_url?: string | null;
    is_optional?: boolean;
}

export interface PublicPlan {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    price_label?: string | null;
    important_note?: string | null;
    is_featured?: boolean;
    image_url?: string | null;
    /** Precio por tramo de peso {"<id tramo>": precio} (crematorios con tabla por plan) */
    weight_prices?: Record<string, number> | null;
    /** Peso máximo de la mascota en kg: se oculta en tamaños mayores */
    max_weight?: number | null;
    services: PublicPlanItem[];
    products: PublicPlanItem[];
}

export interface PublicCatalogTenant {
    name: string;
    slug?: string;
    logo?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    social?: Record<string, string> | null;
    tagline?: string | null;
    intro?: string | null;
    whatsapp?: string | null;
}

interface Props {
    tenant: PublicCatalogTenant;
    plans: PublicPlan[];
    getImageUrl: (url?: string | null) => string | null;
    onShare: () => void;
    copiedLink: boolean;
    catalogToken?: string;
    /** Tramos de peso del crematorio; vacío = tamaños genéricos */
    weightTiers?: WeightTier[];
    /** Mensaje del crematorio en este enlace (se muestra en negrita antes de los planes) */
    message?: string | null;
    /** «Potenciado por vinzer.cl» en el pie (false = plan con marca blanca) */
    showVinzerBrand?: boolean;
    /** Botón «Solicitar este plan» (Configuración → Formulario y Pesos); false = solo WhatsApp */
    showRequestButton?: boolean;
    /** Video de bienvenida configurado por el SuperAdmin para este crematorio */
    catalogVideo?: {
        source: 'upload' | 'vimeo' | 'cloudflare';
        url: string;
        duration?: number;
        button_text?: string;
    } | null;
}

// Paleta cálida y luminosa, igual para todos los tenants: el catálogo lo abren
// familias en duelo, así que prima la calma sobre el estilo "tienda".
const THEME = {
    '--cat-bg': '#fbf9f6',
    '--cat-card': '#ffffff',
    '--cat-sand': '#f3eee6',
    '--cat-line': '#ebe3d6',
    '--cat-gold': '#a67c37',
    '--cat-gold-deep': '#8a6428', // contraste AA sobre blanco (botones y texto pequeño)
    '--cat-ink': '#2b2724',
    '--cat-muted': '#6f665e',
} as React.CSSProperties;

const SEARCH_THRESHOLD = 6;
const COLLAPSED_ITEMS = 6; // ítems visibles antes de "Ver más" (en grilla 2 columnas)

// Tamaños de mascota para cotizar: el precio de cremación depende del peso.
// Respaldo si el crematorio no definió sus tramos de peso en Configuración.
const PET_SIZES = [
    { key: 'mini', label: 'Aves / Menos de 1 kg', name: 'Aves', range: 'Menos de 1 kg', price: 0 },
    { key: 'small', label: 'Pequeño (1 a 10 kg)', name: 'Pequeño', range: '1 – 10 kg', price: 0 },
    { key: 'medium', label: 'Mediano (10 a 25 kg)', name: 'Mediano', range: '10 – 25 kg', price: 0 },
    { key: 'large', label: 'Grande (25 a 45 kg)', name: 'Grande', range: '25 – 45 kg', price: 0 },
    { key: 'giant', label: 'Gigante (+45 kg)', name: 'Gigante', range: 'Desde 45 kg', price: 0 },
] as const;

/** Opción del selector de tamaño (tarjeta): nombre, rango, ícono y ejemplos del crematorio. */
interface SizeOption {
    key: string;
    label: string;
    display: string;
    name: string;
    range: string;
    price: number;
    icon?: string | null;
    examples?: string | null;
}
const DEFAULT_SIZE = 'small';

const formatCLP = (value: number) => `$${Math.round(value).toLocaleString('es-CL')}`;

/** Tramos del crematorio como opciones del selector ("Pequeño (Hasta 4 kg) · +$10.000"). */
const tierSizes = (tiers: WeightTier[]): SizeOption[] => tiers.map(t => {
    const base = t.label ? `${t.label} (${t.range_text})` : t.range_text;
    const tierPrice = t.price != null ? Number(t.price) : 0;
    return {
        key: String(t.id),
        label: base,
        display: tierPrice > 0 ? `${base} · +${formatCLP(tierPrice)}` : base,
        name: t.label || t.range_text,
        range: t.range_text,
        price: tierPrice,
        icon: t.icon_url,
        examples: t.examples,
    };
});

/** Precio propio del plan (etiqueta del tenant o monto); null si no tiene. Nunca "$0". */
const priceText = (plan: PublicPlan): { main: string; isAmount: boolean } | null => {
    if (plan.price_label?.trim()) return { main: plan.price_label.trim(), isAmount: false };
    if (plan.price > 0) return { main: formatCLP(plan.price), isAmount: true };
    return null;
};

const planReference = (name: string) => (/^plan\b/i.test(name.trim()) ? `el ${name.trim()}` : `el plan ${name.trim()}`);

const socialUrl = (key: string, raw: string): string | null => {
    const value = raw.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const handle = value.replace(/^@/, '');
    switch (key) {
        case 'instagram': return `https://instagram.com/${handle}`;
        case 'facebook': return `https://facebook.com/${handle.replace(/^(www\.)?(fb|facebook)\.com\//i, '')}`;
        case 'tiktok': return `https://www.tiktok.com/@${handle}`;
        case 'website': return `https://${value}`;
        default: return null;
    }
};

const SOCIAL_META: Record<string, { label: string; icon: React.ReactNode }> = {
    instagram: { label: 'Instagram', icon: <Instagram size={15} /> },
    facebook: { label: 'Facebook', icon: <Facebook size={15} /> },
    tiktok: { label: 'TikTok', icon: <span className="text-[11px] font-bold leading-none">TT</span> },
    website: { label: 'Sitio web', icon: <Globe size={15} /> },
};

interface PlanView {
    plan: PublicPlan;
    included: PublicPlanItem[];   // servicios + productos incluidos
    optional: PublicPlanItem[];
}

/** Catálogo público de planes: diseño sobrio y cálido; los datos son los de cada tenant. */
export default function PublicPlansCatalog({ tenant, plans, getImageUrl, onShare, copiedLink, catalogToken, weightTiers = [], message, showVinzerBrand = true, showRequestButton = true, catalogVideo }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const sizes = useMemo<SizeOption[]>(
        () => (weightTiers.length > 0 ? tierSizes(weightTiers) : PET_SIZES.map(s => ({ ...s, display: s.label, price: 0 }))),
        [weightTiers]
    );
    const [sizeKey, setSizeKey] = useState<string>(
        weightTiers.length > 0 ? String(weightTiers[0].id) : DEFAULT_SIZE
    );
    const currentSize = useMemo(
        () => sizes.find(s => s.key === sizeKey) ?? sizes[0],
        [sizes, sizeKey]
    );
    const sizeLabel = currentSize?.label ?? '';
    const tierPrice = currentSize?.price ?? 0;

    // Embudo del catálogo (lib/catalogEvents.ts): sesión anónima por enlace
    const [sessionId, setSessionId] = useState('');
    useEffect(() => {
        if (!catalogToken) return;
        const sid = catalogSessionId(catalogToken);
        setSessionId(sid);
        trackCatalogEvent({ slug: tenant.slug || '', token: catalogToken, kind: 'view', sessionId: sid });
    }, [catalogToken, tenant.slug]);
    const track = (kind: CatalogEventKind, planId?: number, weightTier: string = sizeLabel) => {
        if (catalogToken && sessionId) {
            trackCatalogEvent({ slug: tenant.slug || '', token: catalogToken, kind, sessionId, planId, weightTier });
        }
    };

    const views = useMemo<PlanView[]>(() => plans.map(plan => ({
        plan,
        included: [...plan.services.filter(s => !s.is_optional), ...plan.products],
        optional: plan.services.filter(s => s.is_optional),
    })), [plans]);

    // Tamaño elegido: los planes con peso máximo menor (ej. «Minigarritas» hasta 1 kg) se ocultan.
    const selectedTier = useMemo(() => weightTiers.find(t => String(t.id) === sizeKey), [weightTiers, sizeKey]);
    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const fitting = views.filter(({ plan }) => planFitsWeight(plan.max_weight, selectedTier?.min_weight));
        if (!q) return fitting;
        return fitting.filter(({ plan }) =>
            plan.name.toLowerCase().includes(q) ||
            (plan.description || '').toLowerCase().includes(q) ||
            plan.services.some(s => s.name.toLowerCase().includes(q)) ||
            plan.products.some(s => s.name.toLowerCase().includes(q))
        );
    }, [views, searchTerm, selectedTier]);

    const whatsappUrl = (text: string) =>
        tenant.whatsapp ? `https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(text)}` : null;

    const generalWhatsApp = whatsappUrl(`Hola ${tenant.name}, estoy viendo sus planes y quisiera hacer una consulta. Tamaño de mi mascota: ${sizeLabel}.`);
    const logoUrl = getImageUrl(tenant.logo);
    const location = [tenant.address, tenant.city].filter(Boolean).join(', ');
    const socials = Object.entries(tenant.social || {})
        .map(([key, raw]) => ({ key, url: socialUrl(key, raw), meta: SOCIAL_META[key] }))
        .filter(s => s.url && s.meta);

    return (
        <div
            style={THEME}
            className={`${serif.variable} ${sans.variable} min-h-screen flex flex-col bg-[var(--cat-bg)] text-[var(--cat-ink)] [font-family:var(--cat-sans)] antialiased selection:bg-[var(--cat-gold)]/20`}
        >
            {/* Barra superior */}
            <header className="sticky top-0 z-40 bg-[var(--cat-bg)]/90 backdrop-blur-md border-b border-[var(--cat-line)]">
                <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt={tenant.name} className="w-10 h-10 rounded-full object-contain bg-white border border-[var(--cat-line)] p-1 shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[var(--cat-sand)] text-[var(--cat-gold-deep)] flex items-center justify-center shrink-0 [font-family:var(--cat-serif)] text-xl font-semibold">
                                {tenant.name.charAt(0)}
                            </div>
                        )}
                        <span className="[font-family:var(--cat-serif)] text-xl font-semibold truncate">{tenant.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onShare}
                            className="h-10 px-3 sm:px-4 rounded-full border border-[var(--cat-line)] bg-white text-[var(--cat-muted)] hover:text-[var(--cat-ink)] hover:border-[var(--cat-gold)]/40 flex items-center gap-2 text-sm font-medium transition-colors"
                            title="Copiar enlace del catálogo"
                        >
                            {copiedLink ? <Check size={16} className="text-[var(--cat-gold-deep)]" /> : <Share2 size={16} />}
                            <span className="hidden sm:inline">{copiedLink ? 'Enlace copiado' : 'Compartir'}</span>
                        </button>
                        {generalWhatsApp && (
                            <a
                                href={generalWhatsApp}
                                onClick={() => track('whatsapp')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-10 px-3 sm:px-4 rounded-full bg-[var(--cat-ink)] text-white hover:bg-black flex items-center gap-2 text-sm font-medium transition-colors"
                            >
                                <MessageCircle size={16} />
                                <span className="hidden sm:inline">Escríbenos</span>
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* Contenedor Superior: Hero + Calculador en 2 columnas (>= 960px) y 1 columna en móvil/tablet */}
            <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 pb-8 sm:pt-12 sm:pb-12">
                <div
                    className={`grid grid-cols-1 ${
                        plans.length > 0 ? 'min-[960px]:grid-cols-[1fr_1.15fr] xl:grid-cols-[1fr_1.2fr]' : ''
                    } items-center gap-8 min-[960px]:gap-12 xl:gap-16`}
                >
                    {/* Columna Izquierda: Centrada en móvil (< 960px), alineada a la izquierda en escritorio (>= 960px) */}
                    <div className="flex flex-col items-center text-center min-[960px]:items-start min-[960px]:text-left">
                        {logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt={`Logo de ${tenant.name}`}
                                className="mb-5 w-20 h-20 sm:w-24 sm:h-24 rounded-full object-contain bg-white border border-[var(--cat-line)] p-3 shadow-[0_12px_30px_-18px_rgba(43,39,36,0.45)]"
                            />
                        )}
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cat-gold-deep)]">
                            Nuestros planes
                        </p>
                        <h1 className="mt-2.5 [font-family:var(--cat-serif)] text-4xl sm:text-5xl lg:text-[52px] font-semibold leading-tight text-[var(--cat-ink)]">
                            {tenant.name}
                        </h1>
                        {tenant.tagline && (
                            <p className="mt-2 [font-family:var(--cat-serif)] italic text-xl sm:text-2xl text-[var(--cat-gold-deep)]">
                                {tenant.tagline}
                            </p>
                        )}
                        <div className="mt-5 h-px w-16 bg-[var(--cat-gold)]/50 mx-auto min-[960px]:mx-0" />
                        <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-[var(--cat-muted)] whitespace-pre-line max-w-2xl">
                            {tenant.intro || DEFAULT_CATALOG_INTRO}
                        </p>
                        {catalogVideo && (
                            <div className="mt-7 flex justify-center min-[960px]:justify-start">
                                <button
                                    type="button"
                                    onClick={() => setVideoModalOpen(true)}
                                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[var(--cat-gold-deep)] hover:bg-[var(--cat-gold)] text-white text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <Play size={14} className="fill-current" />
                                    <span>{catalogVideo.button_text || 'Ver video de bienvenida'}</span>
                                    {catalogVideo.duration ? (
                                        <span className="opacity-80 text-[11px] font-mono">({Math.round(catalogVideo.duration)}s)</span>
                                    ) : null}
                                </button>
                            </div>
                        )}
                        <div className="mt-7 pt-5 border-t border-[var(--cat-line)] w-full max-w-xl flex flex-wrap items-center justify-center min-[960px]:justify-start gap-x-6 gap-y-2 text-xs font-medium text-[var(--cat-muted)]">
                            <span className="inline-flex items-center gap-1.5">
                                <Check size={14} className="text-[var(--cat-gold-deep)]" />
                                Atención cercana
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Check size={14} className="text-[var(--cat-gold-deep)]" />
                                Certificación y trazabilidad
                            </span>
                        </div>
                    </div>

                    {/* Columna Derecha: Tarjeta del calculador/selector interactivo (3x2 si hay >=5 tamaños, 2x2 si <=4) */}
                    {plans.length > 0 && (
                        <div className="w-full rounded-3xl bg-white border border-[var(--cat-line)] shadow-[0_14px_36px_-22px_rgba(43,39,36,0.35)] p-5 sm:p-8 text-center min-[960px]:text-left">
                            <h2 id="pet-size-title" className="[font-family:var(--cat-serif)] text-2xl sm:text-[28px] leading-snug font-semibold text-[var(--cat-ink)]">
                                ¿Cuál es el tamaño aproximado de tu mascota?
                            </h2>
                            <p className="mt-1.5 text-xs sm:text-sm text-[var(--cat-muted)]">
                                Selecciona un rango para calcular automáticamente el valor final estimado en cada plan.
                            </p>
                            <div
                                role="radiogroup"
                                aria-labelledby="pet-size-title"
                                className={`mt-5 grid grid-cols-2 ${
                                    sizes.length >= 5 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                                } gap-3 sm:gap-3.5`}
                            >
                                {sizes.map(size => {
                                    const active = size.key === sizeKey;
                                    const hasDistinctRange = size.range && size.range !== size.name;
                                    return (
                                        <button
                                            key={size.key}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => {
                                                setSizeKey(size.key);
                                                track('size_select', undefined, size.label);
                                            }}
                                            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 text-center transition-all cursor-pointer ${
                                                active
                                                    ? 'bg-[var(--cat-bg)] border-2 border-[var(--cat-gold-deep)] shadow-[0_10px_24px_-16px_rgba(138,100,40,0.75)]'
                                                    : 'bg-white border border-[var(--cat-line)] hover:border-[var(--cat-gold)]/60 hover:-translate-y-0.5'
                                            }`}
                                        >
                                            <span className="flex h-9 w-9 items-center justify-center">
                                                {size.icon ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={size.icon} alt="" loading="lazy" className="h-9 w-9 object-contain" />
                                                ) : (
                                                    <PawPrint size={20} className={active ? 'text-[var(--cat-gold-deep)]' : 'text-[var(--cat-muted)]'} aria-hidden="true" />
                                                )}
                                            </span>
                                            <span className="text-[14px] sm:text-[15px] font-bold leading-tight text-[var(--cat-ink)]">
                                                {hasDistinctRange ? size.range : size.name}
                                            </span>
                                            {hasDistinctRange && (
                                                <span className="text-[12px] font-medium text-[var(--cat-muted)]">
                                                    {size.name}
                                                </span>
                                            )}
                                            {size.price > 0 && (
                                                <span className="mt-0.5 rounded-full bg-[var(--cat-sand)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--cat-gold-deep)]">
                                                    + {formatCLP(size.price)}
                                                </span>
                                            )}
                                            {size.examples && (
                                                <span className="text-[11px] leading-snug text-[var(--cat-muted)] line-clamp-2">
                                                    {size.examples}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {currentSize && (
                                <p className="mt-5 pt-4 border-t border-dashed border-[var(--cat-line)] text-xs sm:text-sm text-[var(--cat-muted)] text-center">
                                    Mostrando planes para: <span className="font-semibold text-[var(--cat-gold-deep)]">{currentSize.name}{currentSize.range !== currentSize.name ? ` (${currentSize.range})` : ''}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Contenedor Inferior: Resultados / Planes */}
            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16">
                {plans.length > SEARCH_THRESHOLD && (
                    <div className="relative max-w-md mx-auto mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--cat-muted)]" size={17} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar un plan o servicio…"
                            className="w-full bg-white border border-[var(--cat-line)] rounded-full pl-11 pr-10 py-3 text-sm placeholder:text-[var(--cat-muted)]/70 focus:outline-none focus:border-[var(--cat-gold)]/60 focus:ring-4 focus:ring-[var(--cat-gold)]/10 transition"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--cat-muted)] hover:text-[var(--cat-ink)]" aria-label="Limpiar búsqueda">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* Mensaje del crematorio para este enlace: al ancho del contenedor */}
                {message?.trim() && (
                    <div className="mb-8 w-full rounded-2xl border border-[var(--cat-gold)]/30 bg-[var(--cat-gold)]/[0.06] px-5 py-4 sm:px-7 text-center">
                        <p className="text-[15px] sm:text-base font-bold leading-relaxed text-[var(--cat-ink)] whitespace-pre-line">
                            {message.trim()}
                        </p>
                    </div>
                )}

                {filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Feather className="mx-auto text-[var(--cat-gold)]/60" size={36} />
                        <h2 className="mt-4 [font-family:var(--cat-serif)] text-2xl font-semibold">
                            {plans.length === 0 ? 'Pronto publicaremos nuestros planes' : 'No encontramos planes con esa búsqueda'}
                        </h2>
                        <p className="mt-2 text-sm text-[var(--cat-muted)]">
                            {plans.length === 0 ? 'Escríbenos y te contamos nuestras opciones.' : 'Prueba con otra palabra.'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {filtered.map(rawView => {
                            // Tabla «precio por plan y peso»: el precio del plan es el del tamaño elegido.
                            const tablePrice = rawView.plan.weight_prices?.[sizeKey];
                            const view = tablePrice != null
                                ? { ...rawView, plan: { ...rawView.plan, price: Number(tablePrice), price_label: null } }
                                : rawView;
                            const basePrice = view.plan.price || 0;
                            const totalPrice = basePrice + tierPrice;
                            const waText = tierPrice > 0 && basePrice > 0
                                ? `Hola ${tenant.name}, quisiera consultar por ${planReference(view.plan.name)} para mi mascota de tamaño ${sizeLabel}. Total estimado en catálogo: ${formatCLP(totalPrice)} (Plan ${formatCLP(basePrice)} + Peso ${formatCLP(tierPrice)}).`
                                : basePrice > 0
                                    ? `Hola ${tenant.name}, quisiera consultar por ${planReference(view.plan.name)} para mi mascota de tamaño ${sizeLabel} (Valor: ${formatCLP(basePrice)}).`
                                    : `Hola ${tenant.name}, quisiera consultar por ${planReference(view.plan.name)} para mi mascota de tamaño ${sizeLabel}.`;

                            const formUrl = tenant.slug
                                ? buildPublicFormUrl(tenant.slug, {
                                      token: catalogToken,
                                      plan_id: view.plan.id,
                                      weight_tier: sizeKey,
                                      cs: sessionId || undefined,
                                  })
                                : null;

                            return (
                                <PlanCard
                                    key={view.plan.id}
                                    view={view}
                                    cover={getImageUrl(view.plan.image_url)}
                                    sizeLabel={sizeLabel}
                                    tierPrice={tierPrice}
                                    waUrl={whatsappUrl(waText)}
                                    formUrl={showRequestButton ? formUrl : null}
                                    onRequest={() => track('plan_request', view.plan.id)}
                                    onWhatsApp={() => track('whatsapp', view.plan.id)}
                                />
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Pie: datos de contacto del tenant (cada dato se muestra solo si existe) */}
            <footer className="border-t border-[var(--cat-line)] bg-white">
                <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 grid gap-8 sm:grid-cols-2 text-sm">
                    <div>
                        <p className="[font-family:var(--cat-serif)] text-2xl font-semibold">{tenant.name}</p>
                        {tenant.tagline && <p className="mt-1 [font-family:var(--cat-serif)] italic text-[var(--cat-gold-deep)]">{tenant.tagline}</p>}
                        {socials.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {socials.map(s => (
                                    <a
                                        key={s.key}
                                        href={s.url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={s.meta.label}
                                        title={s.meta.label}
                                        className="w-9 h-9 rounded-full border border-[var(--cat-line)] text-[var(--cat-muted)] hover:text-[var(--cat-gold-deep)] hover:border-[var(--cat-gold)]/50 flex items-center justify-center transition-colors"
                                    >
                                        {s.meta.icon}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                    <ul className="space-y-3 text-[var(--cat-muted)] sm:justify-self-end">
                        {location && (
                            <li>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-2.5 hover:text-[var(--cat-ink)]"
                                >
                                    <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--cat-gold)]" /> {location}
                                </a>
                            </li>
                        )}
                        {tenant.whatsapp && (
                            <li>
                                <a href={generalWhatsApp!} onClick={() => track('whatsapp')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-[var(--cat-ink)]">
                                    <MessageCircle size={16} className="shrink-0 text-[var(--cat-gold)]" /> WhatsApp +{tenant.whatsapp}
                                </a>
                            </li>
                        )}
                        {tenant.phone && (
                            <li>
                                <a href={`tel:${tenant.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2.5 hover:text-[var(--cat-ink)]">
                                    <Phone size={16} className="shrink-0 text-[var(--cat-gold)]" /> {tenant.phone}
                                </a>
                            </li>
                        )}
                        {tenant.email && (
                            <li>
                                <a href={`mailto:${tenant.email}`} className="flex items-center gap-2.5 hover:text-[var(--cat-ink)] break-all">
                                    <Mail size={16} className="shrink-0 text-[var(--cat-gold)]" /> {tenant.email}
                                </a>
                            </li>
                        )}
                    </ul>
                </div>
                {/* Firma de Vinzer: leve en todos los planes (FREE la muestra un poco más visible) */}
                <div className="border-t border-[var(--cat-line)]">
                    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-4 flex justify-center">
                        <a
                            href={vinzerPromoUrl('catalogo_planes')}
                            target="_blank"
                            rel="noopener"
                            aria-label="Potenciado por Vinzer, software para crematorios"
                            className={`group inline-flex items-baseline gap-1.5 transition-colors duration-300 ${
                                showVinzerBrand ? 'text-[var(--cat-muted)] hover:text-[var(--cat-ink)]' : 'text-[var(--cat-muted)]/60 hover:text-[var(--cat-muted)]'
                            }`}
                        >
                            <span className="text-[9px] uppercase tracking-[0.28em] font-medium">Potenciado por</span>
                            <span className="text-[12px] font-semibold tracking-[0.06em]">
                                vinzer<span className="text-[var(--cat-gold)]/70 group-hover:text-[var(--cat-gold)]">.</span>cl
                            </span>
                        </a>
                    </div>
                </div>
            </footer>

            {/* Modal de video conmemorativo (no invasivo, se activa solo a petición del usuario) */}
            {videoModalOpen && catalogVideo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    onClick={() => setVideoModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl space-y-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--cat-line)]">
                            <div className="flex items-center gap-2 text-[var(--cat-ink)] font-semibold text-base">
                                <Sparkles size={16} className="text-[var(--cat-gold)]" />
                                <span>{tenant.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setVideoModalOpen(false)}
                                className="p-1.5 rounded-full bg-[var(--cat-sand)] hover:bg-[var(--cat-line)] text-[var(--cat-muted)] hover:text-[var(--cat-ink)] transition-colors cursor-pointer"
                                aria-label="Cerrar video"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <FormVideoPlayer video={catalogVideo as any} autoPlay={true} />
                        <p className="text-center text-xs text-[var(--cat-muted)] font-medium">
                            {catalogVideo.button_text || 'Mensaje de bienvenida y compromiso conmemorativo'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlanCard({ view, cover, waUrl, formUrl, sizeLabel, tierPrice = 0, onRequest, onWhatsApp }: { view: PlanView; cover: string | null; waUrl: string | null; formUrl: string | null; sizeLabel: string; tierPrice?: number; onRequest?: () => void; onWhatsApp?: () => void }) {
    const { plan, included, optional } = view;
    // Tarjeta horizontal: muestra los primeros ítems en 2 columnas y "Ver más" despliega el resto.
    const [expanded, setExpanded] = useState(false);
    const price = priceText(plan);
    const basePrice = plan.price || 0;
    const isAmount = Boolean(price?.isAmount && basePrice > 0);
    const totalPrice = isAmount ? basePrice + tierPrice : 0;
    const featured = Boolean(plan.is_featured);
    const longDesc = (plan.description || '').length > 160;
    const hiddenCount = Math.max(0, included.length - COLLAPSED_ITEMS) + optional.length;
    const canExpand = hiddenCount > 0 || longDesc;
    const visible = expanded ? included : included.slice(0, COLLAPSED_ITEMS);

    return (
        <article
            className={`relative w-full flex flex-col min-[960px]:flex-row rounded-3xl bg-[var(--cat-card)] overflow-hidden transition-shadow ${
                featured
                    ? 'border-2 border-[var(--cat-gold)] shadow-[0_18px_40px_-20px_rgba(166,124,55,0.45)]'
                    : 'border border-[var(--cat-line)] shadow-[0_10px_30px_-22px_rgba(43,39,36,0.35)] hover:shadow-[0_16px_36px_-22px_rgba(43,39,36,0.4)]'
            }`}
        >
            {/* Columna Izquierda: Portada compacta */}
            <div className="relative w-full min-[960px]:w-64 xl:w-72 shrink-0 aspect-[16/10] sm:aspect-[2/1] min-[960px]:aspect-auto min-[960px]:min-h-[240px] bg-[var(--cat-sand)]">
                {featured && (
                    <span className="absolute top-3.5 left-3.5 z-10 px-3.5 py-1 rounded-full bg-[var(--cat-gold-deep)] text-white text-xs font-semibold tracking-wide shadow-md whitespace-nowrap">
                        Más solicitado
                    </span>
                )}
                {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={plan.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--cat-gold)]/40">
                        <Feather size={48} strokeWidth={1.25} />
                    </div>
                )}
            </div>

            {/* Columna Central: Nombre, descripción y qué incluye (en 2 o 3 sub-columnas en pantallas anchas) */}
            <div className="flex-1 flex flex-col p-6 sm:p-8 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="[font-family:var(--cat-serif)] text-[26px] sm:text-[30px] leading-tight font-semibold text-[var(--cat-ink)]">
                        {plan.name}
                    </h2>
                </div>

                {plan.description && (
                    <p className={`mt-2 text-[14px] sm:text-[15px] leading-relaxed text-[var(--cat-muted)] ${longDesc && !expanded ? 'line-clamp-2' : ''}`}>
                        {plan.description}
                    </p>
                )}

                {plan.important_note && (
                    <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-[var(--cat-gold)]/35 bg-[#fbf3e4] px-3.5 py-2.5 text-[13px] leading-snug text-[var(--cat-ink)]">
                        <Info size={16} className="mt-px shrink-0 text-[var(--cat-gold-deep)]" />
                        <p><span className="font-semibold">Importante:</span> {plan.important_note}</p>
                    </div>
                )}

                {included.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--cat-line)]">
                        <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--cat-muted)] mb-2.5">
                            Incluye
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2">
                            {visible.map((item, i) => (
                                <li key={`${item.name}-${i}`} className="flex items-start gap-2 text-[13.5px] leading-snug text-[var(--cat-ink)]">
                                    <Check size={15} strokeWidth={2.25} className="mt-0.5 shrink-0 text-[var(--cat-gold)]" />
                                    <span>{item.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {expanded && optional.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-[var(--cat-sand)]/60 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--cat-muted)] mb-2">Opcionales</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1.5">
                            {optional.map((item, i) => (
                                <li key={`${item.name}-${i}`} className="flex items-start gap-2 text-[13px] leading-snug text-[var(--cat-muted)]">
                                    <Plus size={14} className="mt-0.5 shrink-0 text-[var(--cat-gold)]" />
                                    <span>{item.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {canExpand && (
                    <button
                        type="button"
                        onClick={() => setExpanded(e => !e)}
                        aria-expanded={expanded}
                        className="mt-3.5 self-start inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--cat-gold-deep)] hover:underline cursor-pointer"
                    >
                        {expanded ? 'Ver menos' : hiddenCount > 0 ? `Ver más (+${hiddenCount})` : 'Ver más'}
                        <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>

            {/* Columna Derecha: Precio estimado y Botones de acción */}
            <div className="w-full min-[960px]:w-76 xl:w-84 shrink-0 flex flex-col justify-between gap-4 p-6 sm:p-7 border-t min-[960px]:border-t-0 min-[960px]:border-l border-[var(--cat-line)] bg-[var(--cat-bg)]/50">
                <div>
                    {isAmount ? (
                        <div className="p-4 rounded-2xl bg-white border border-[var(--cat-line)] shadow-xs">
                            {tierPrice > 0 ? (
                                <>
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cat-muted)]">
                                            Total estimado:
                                        </span>
                                        <span className="text-2xl font-black tabular-nums text-[var(--cat-gold-deep)]">
                                            {formatCLP(totalPrice)}
                                        </span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-[var(--cat-line)]/70 flex flex-col gap-0.5 text-[12px] text-[var(--cat-muted)]">
                                        <div className="flex items-center justify-between">
                                            <span>Plan base:</span>
                                            <span className="font-medium text-[var(--cat-ink)]">{formatCLP(basePrice)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[var(--cat-gold-deep)] font-semibold">
                                            <span className="truncate pr-2">Peso ({sizeLabel}):</span>
                                            <span className="shrink-0">+ {formatCLP(tierPrice)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cat-muted)]">
                                            Valor del plan:
                                        </span>
                                        <span className="text-2xl font-black tabular-nums text-[var(--cat-gold-deep)]">
                                            {formatCLP(basePrice)}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-[12px] text-[var(--cat-muted)]">
                                        Para tamaño: <span className="font-medium text-[var(--cat-ink)]">{sizeLabel}</span>
                                    </p>
                                </>
                            )}
                        </div>
                    ) : price ? (
                        <div className="p-3.5 rounded-2xl bg-white border border-[var(--cat-line)] flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold uppercase tracking-wider text-[var(--cat-gold-deep)]">
                                {price.main}
                            </span>
                            <span className="text-xs text-[var(--cat-muted)]">
                                {sizeLabel}
                            </span>
                        </div>
                    ) : (
                        <p className="text-sm font-semibold text-[var(--cat-gold-deep)]">Cotizar para: {sizeLabel}</p>
                    )}
                </div>

                <div className="flex flex-col gap-2.5">
                    {formUrl && (
                        <a
                            href={formUrl}
                            onClick={onRequest}
                            className={`w-full rounded-full py-3.5 px-4 flex items-center justify-center gap-2 text-[14px] font-bold transition-all shadow-sm active:scale-[0.98] ${
                                featured
                                    ? 'bg-[var(--cat-gold-deep)] text-white hover:bg-[#735220] shadow-[0_4px_14px_-3px_rgba(138,100,40,0.4)]'
                                    : 'bg-[var(--cat-ink)] text-white hover:bg-black'
                            }`}
                        >
                            <span>Solicitar este plan</span>
                            <ArrowRight size={16} />
                        </a>
                    )}

                    {waUrl && (
                        <a
                            href={waUrl}
                            onClick={onWhatsApp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full rounded-full py-2.5 px-4 flex items-center justify-center gap-2 text-[13.5px] font-medium transition-colors ${
                                formUrl
                                    ? 'bg-white border border-[var(--cat-line)] text-[var(--cat-muted)] hover:text-[var(--cat-ink)] hover:border-[var(--cat-gold)]/50'
                                    : featured
                                        ? 'bg-[var(--cat-gold-deep)] text-white hover:bg-[#735220]'
                                        : 'bg-white text-[var(--cat-gold-deep)] border border-[var(--cat-gold)]/60 hover:bg-[var(--cat-gold-deep)] hover:text-white'
                            }`}
                        >
                            <MessageCircle size={15} />
                            Consultar por WhatsApp
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}
