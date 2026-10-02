"use client";

import React, { useMemo, useState } from 'react';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import { DEFAULT_CATALOG_INTRO } from '@/lib/catalogDefaults';
import type { WeightTier } from '@/lib/publicFormConfig';
import {
    Check, ChevronDown, Facebook, Feather, Globe, Info, Instagram, Mail, MapPin, MessageCircle, Phone, Plus, Search, Share2, X,
} from 'lucide-react';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--cat-serif' });
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--cat-sans' });

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
    services: PublicPlanItem[];
    products: PublicPlanItem[];
}

export interface PublicCatalogTenant {
    name: string;
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
    /** Tramos de peso del crematorio; vacío = tamaños genéricos */
    weightTiers?: WeightTier[];
    /** Mensaje del crematorio en este enlace (se muestra en negrita antes de los planes) */
    message?: string | null;
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
const COLLAPSED_ITEMS = 5; // ítems visibles antes de "Ver más"

// Tamaños de mascota para cotizar: el precio de cremación depende del peso.
// Respaldo si el crematorio no definió sus tramos de peso en Configuración.
const PET_SIZES = [
    { key: 'mini', label: 'Aves / Menos de 1 kg' },
    { key: 'small', label: 'Pequeño (1 a 10 kg)' },
    { key: 'medium', label: 'Mediano (10 a 25 kg)' },
    { key: 'large', label: 'Grande (25 a 45 kg)' },
    { key: 'giant', label: 'Gigante (+45 kg)' },
] as const;
const DEFAULT_SIZE = 'small';

/** Tramos del crematorio como opciones del selector ("Pequeño (Hasta 4 kg) · $10.000"). */
const tierSizes = (tiers: WeightTier[]) => tiers.map(t => {
    const base = t.label ? `${t.label} (${t.range_text})` : t.range_text;
    return { key: String(t.id), label: base, display: t.price != null ? `${base} · ${formatCLP(t.price)}` : base };
});

const formatCLP = (value: number) => `$${Math.round(value).toLocaleString('es-CL')}`;

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
export default function PublicPlansCatalog({ tenant, plans, getImageUrl, onShare, copiedLink, weightTiers = [], message }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const sizes = useMemo(
        () => (weightTiers.length > 0 ? tierSizes(weightTiers) : PET_SIZES.map(s => ({ ...s, display: s.label }))),
        [weightTiers]
    );
    const [sizeKey, setSizeKey] = useState<string>(
        weightTiers.length > 0 ? String(weightTiers[0].id) : DEFAULT_SIZE
    );
    // El texto de cotización y de WhatsApp no lleva el precio del tramo.
    const sizeLabel = (sizes.find(s => s.key === sizeKey) ?? sizes[0])?.label ?? '';

    const views = useMemo<PlanView[]>(() => plans.map(plan => ({
        plan,
        included: [...plan.services.filter(s => !s.is_optional), ...plan.products],
        optional: plan.services.filter(s => s.is_optional),
    })), [plans]);

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return views;
        return views.filter(({ plan }) =>
            plan.name.toLowerCase().includes(q) ||
            (plan.description || '').toLowerCase().includes(q) ||
            plan.services.some(s => s.name.toLowerCase().includes(q)) ||
            plan.products.some(s => s.name.toLowerCase().includes(q))
        );
    }, [views, searchTerm]);

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
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
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

            {/* Presentación */}
            <section className="px-4 sm:px-6 pt-12 pb-10 sm:pt-16 sm:pb-14 text-center">
                <div className="max-w-2xl mx-auto">
                    {logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={`Logo de ${tenant.name}`}
                            className="mx-auto mb-6 w-24 h-24 sm:w-28 sm:h-28 rounded-full object-contain bg-white border border-[var(--cat-line)] p-3 shadow-[0_12px_30px_-18px_rgba(43,39,36,0.45)]"
                        />
                    )}
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cat-gold-deep)]">Nuestros planes</p>
                    <h1 className="mt-3 [font-family:var(--cat-serif)] text-4xl sm:text-5xl font-semibold leading-tight">{tenant.name}</h1>
                    {tenant.tagline && (
                        <p className="mt-3 [font-family:var(--cat-serif)] italic text-xl sm:text-2xl text-[var(--cat-gold-deep)]">{tenant.tagline}</p>
                    )}
                    <div className="mx-auto mt-6 h-px w-16 bg-[var(--cat-gold)]/50" />
                    <p className="mt-6 text-[15px] leading-relaxed text-[var(--cat-muted)] whitespace-pre-line">
                        {tenant.intro || DEFAULT_CATALOG_INTRO}
                    </p>
                </div>

                {plans.length > SEARCH_THRESHOLD && (
                    <div className="relative max-w-md mx-auto mt-8">
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
            </section>

            {/* Planes */}
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                {/* Selector de tamaño: ajusta el texto de cotización y el mensaje de WhatsApp de cada plan */}
                {plans.length > 0 && (
                    <div className="mb-10 mx-auto max-w-5xl rounded-3xl bg-white border border-[var(--cat-line)] shadow-[0_10px_30px_-24px_rgba(43,39,36,0.35)] px-4 py-6 sm:px-6 text-center">
                        <h2 id="pet-size-title" className="[font-family:var(--cat-serif)] text-2xl font-semibold">
                            ¿Cuál es el tamaño aproximado de tu mascota?
                        </h2>
                        <div role="radiogroup" aria-labelledby="pet-size-title" className="mt-5 flex flex-wrap justify-center gap-2.5">
                            {sizes.map(size => {
                                const active = size.key === sizeKey;
                                return (
                                    <button
                                        key={size.key}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => setSizeKey(size.key)}
                                        className={`rounded-full px-3.5 py-2.5 text-[14px] font-medium border transition-all ${
                                            active
                                                ? 'bg-[var(--cat-gold-deep)] border-[var(--cat-gold-deep)] text-white shadow-[0_6px_16px_-8px_rgba(138,100,40,0.7)]'
                                                : 'bg-[var(--cat-bg)] border-[var(--cat-line)] text-[var(--cat-ink)] hover:border-[var(--cat-gold)]/60'
                                        }`}
                                    >
                                        {size.display}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Mensaje del crematorio para este enlace: entre el tamaño y los planes */}
                {message?.trim() && (
                    <div className="mb-10 mx-auto max-w-3xl rounded-2xl border border-[var(--cat-gold)]/30 bg-[var(--cat-gold)]/[0.06] px-5 py-4 sm:px-7 text-center">
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
                    // flex-wrap centra la última fila incompleta; las tarjetas de una fila quedan de igual altura
                    <div className="flex flex-wrap justify-center gap-6">
                        {filtered.map(view => (
                            <PlanCard
                                key={view.plan.id}
                                view={view}
                                cover={getImageUrl(view.plan.image_url)}
                                sizeLabel={sizeLabel}
                                waUrl={whatsappUrl(`Hola ${tenant.name}, quisiera consultar por ${planReference(view.plan.name)} para mi mascota de tamaño ${sizeLabel}.`)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Pie: datos de contacto del tenant (cada dato se muestra solo si existe) */}
            <footer className="border-t border-[var(--cat-line)] bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 text-sm">
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
                                <a href={generalWhatsApp!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-[var(--cat-ink)]">
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
                <div className="border-t border-[var(--cat-line)]">
                    <p className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center text-[12px] text-[var(--cat-muted)]">
                        Crematorio potenciado por{' '}
                        <a href="https://vinzer.cl" target="_blank" rel="noopener" className="font-semibold text-[var(--cat-gold-deep)] hover:underline">
                            vinzer.cl
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}

function PlanCard({ view, cover, waUrl, sizeLabel }: { view: PlanView; cover: string | null; waUrl: string | null; sizeLabel: string }) {
    const { plan, included, optional } = view;
    // Tarjeta corta por defecto: descripción recortada y primeros ítems; "Ver más" muestra todo.
    const [expanded, setExpanded] = useState(false);
    const price = priceText(plan);
    const featured = Boolean(plan.is_featured);
    const longDesc = (plan.description || '').length > 120;
    const hiddenCount = Math.max(0, included.length - COLLAPSED_ITEMS) + optional.length;
    const canExpand = hiddenCount > 0 || longDesc;
    const visible = expanded ? included : included.slice(0, COLLAPSED_ITEMS);

    return (
        <article
            className={`relative w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md md:max-w-none flex flex-col rounded-3xl bg-[var(--cat-card)] overflow-hidden transition-shadow ${
                featured
                    ? 'border-2 border-[var(--cat-gold)] shadow-[0_18px_40px_-20px_rgba(166,124,55,0.45)]'
                    : 'border border-[var(--cat-line)] shadow-[0_10px_30px_-22px_rgba(43,39,36,0.35)] hover:shadow-[0_16px_36px_-22px_rgba(43,39,36,0.4)]'
            }`}
        >
            {featured && (
                <span className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-[var(--cat-gold-deep)] text-white text-xs font-semibold tracking-wide shadow-md whitespace-nowrap">
                    Más solicitado
                </span>
            )}

            {/* Portada 1:1, igual al recorte que exige el cargador de imágenes */}
            <div className="relative aspect-square bg-[var(--cat-sand)]">
                {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={plan.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--cat-gold)]/40">
                        <Feather size={56} strokeWidth={1.25} />
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col p-6 sm:p-7">
                <h2 className="[font-family:var(--cat-serif)] text-[28px] leading-tight font-semibold">{plan.name}</h2>
                {price ? (
                    <>
                        <p className={`mt-1 font-semibold ${price.isAmount ? 'text-lg tabular-nums' : 'text-sm uppercase tracking-wider'} text-[var(--cat-gold-deep)]`}>
                            {price.main}
                        </p>
                        <p className="mt-0.5 text-[13px] text-[var(--cat-muted)]">Cotizar para: {sizeLabel}</p>
                    </>
                ) : (
                    <p className="mt-1 text-sm font-semibold text-[var(--cat-gold-deep)]">Cotizar para: {sizeLabel}</p>
                )}

                {plan.important_note && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[var(--cat-gold)]/35 bg-[#fbf3e4] px-3.5 py-3 text-[13px] leading-snug text-[var(--cat-ink)]">
                        <Info size={16} className="mt-px shrink-0 text-[var(--cat-gold-deep)]" />
                        <p><span className="font-semibold">Importante:</span> {plan.important_note}</p>
                    </div>
                )}

                {plan.description && (
                    <p className={`mt-3 text-[14px] leading-relaxed text-[var(--cat-muted)] ${longDesc && !expanded ? 'line-clamp-2' : ''}`}>
                        {plan.description}
                    </p>
                )}

                {included.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-[var(--cat-line)]">
                        <p className="text-[13px] font-semibold text-[var(--cat-ink)] mb-3">Incluye</p>
                        <ul className="space-y-2.5">
                            {visible.map((item, i) => (
                                <li key={`${item.name}-${i}`} className="flex items-start gap-2.5 text-[14px] leading-snug">
                                    <Check size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-[var(--cat-gold)]" />
                                    <span>{item.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {expanded && optional.length > 0 && (
                    <div className="mt-5 rounded-2xl bg-[var(--cat-sand)]/60 px-4 py-3.5">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--cat-muted)] mb-2">Opcionales</p>
                        <ul className="space-y-2">
                            {optional.map((item, i) => (
                                <li key={`${item.name}-${i}`} className="flex items-start gap-2.5 text-[14px] leading-snug text-[var(--cat-muted)]">
                                    <Plus size={15} className="mt-0.5 shrink-0 text-[var(--cat-gold)]" />
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
                        className="mt-4 self-start inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--cat-gold-deep)] hover:underline"
                    >
                        {expanded ? 'Ver menos' : hiddenCount > 0 ? `Ver más (+${hiddenCount})` : 'Ver más'}
                        <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                )}

                {waUrl && (
                    <div className="mt-auto pt-6">
                        <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full rounded-full py-3.5 flex items-center justify-center gap-2 text-[15px] font-semibold transition-colors ${
                                featured
                                    ? 'bg-[var(--cat-gold-deep)] text-white hover:bg-[#735220]'
                                    : 'bg-white text-[var(--cat-gold-deep)] border border-[var(--cat-gold)]/60 hover:bg-[var(--cat-gold-deep)] hover:text-white'
                            }`}
                        >
                            <MessageCircle size={17} />
                            Consultar por WhatsApp
                        </a>
                    </div>
                )}
            </div>
        </article>
    );
}
