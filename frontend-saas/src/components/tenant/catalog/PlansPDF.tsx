import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * Catálogo de planes en PDF: una hoja por plan, en el orden del catálogo
 * (Posición → precio → nombre). Incluye servicios, productos, opcionales,
 * precio según peso (recargo por rango o tabla por plan) y el contacto del crematorio.
 */

interface Service {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    is_active: boolean;
}

interface Product {
    id: number;
    name: string;
    sale_price?: number;
}

export interface PDFPlan {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    is_active: boolean;
    image_url?: string | null;
    is_featured?: boolean;
    price_label?: string | null;
    important_note?: string | null;
    sort_order?: number;
    services?: Service[];
    optional_service_ids?: number[];
    products?: Product[];
}

export interface PDFWeightTier {
    id: number;
    label?: string | null;
    min_weight: number | null;
    max_weight: number | null;
    price: number | null;
}

export interface PDFTenantContact {
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
}

interface PlansPDFProps {
    plans: PDFPlan[];
    tenantName: string;
    logoUrl: string | null;
    origin: string;
    showPrices?: boolean;
    showImages?: boolean;
    tiers?: PDFWeightTier[];
    /** 'table' = precio por plan y peso; 'surcharge' = precio del plan + recargo del rango */
    weightMode?: 'surcharge' | 'table';
    /** Precios por rango de cada plan {plan_id: {"<id rango>": precio}} */
    planWeightPrices?: Record<number, Record<string, number>>;
    contact?: PDFTenantContact;
}

const ACCENT = '#b45309';
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';

const styles = StyleSheet.create({
    page: { paddingTop: 34, paddingBottom: 62, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 10, color: INK, backgroundColor: '#ffffff' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: `1.5px solid ${ACCENT}`, marginBottom: 18 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo: { width: 34, height: 34, objectFit: 'contain' },
    brandName: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
    topRight: { alignItems: 'flex-end' },
    topLabel: { fontSize: 8, color: ACCENT, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1 },
    topDate: { fontSize: 7.5, color: MUTED, marginTop: 2 },
    hero: { width: '100%', height: 210, objectFit: 'cover', borderRadius: 10, marginBottom: 16 },
    badges: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    badge: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MUTED, backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
    badgeFeatured: { color: '#ffffff', backgroundColor: ACCENT },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 10 },
    planName: { fontSize: 24, fontFamily: 'Helvetica-Bold', flex: 1 },
    priceBox: { alignItems: 'flex-end' },
    priceCaption: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 },
    price: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: ACCENT },
    priceLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: ACCENT, maxWidth: 200, textAlign: 'right' },
    note: { backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 9, marginBottom: 12 },
    noteText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#92400e' },
    description: { fontSize: 10.5, lineHeight: 1.55, color: '#374151', marginBottom: 16 },
    sectionTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 },
    columns: { flexDirection: 'row', gap: 18, marginBottom: 16 },
    column: { flex: 1 },
    item: { flexDirection: 'row', gap: 6, paddingVertical: 5, borderBottom: `0.75px solid ${LINE}` },
    bullet: { fontSize: 10, color: ACCENT, fontFamily: 'Helvetica-Bold' },
    itemBody: { flex: 1 },
    itemName: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    itemDesc: { fontSize: 8.5, color: MUTED, lineHeight: 1.35, marginTop: 1.5 },
    itemPrice: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: ACCENT },
    empty: { fontSize: 9, color: MUTED },
    table: { border: `1px solid ${LINE}`, borderRadius: 8, marginBottom: 6 },
    tr: { flexDirection: 'row', borderBottom: `0.75px solid ${LINE}` },
    trLast: { flexDirection: 'row' },
    th: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 6, paddingHorizontal: 9, backgroundColor: '#f9fafb' },
    td: { flex: 1, fontSize: 10, paddingVertical: 6, paddingHorizontal: 9 },
    tdPrice: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right', paddingVertical: 6, paddingHorizontal: 9 },
    tableNote: { fontSize: 7.5, color: MUTED, marginBottom: 14 },
    footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, borderTop: `0.75px solid ${LINE}` },
    footerText: { fontSize: 7.5, color: MUTED, maxWidth: 400, lineHeight: 1.4 },
    footerPage: { fontSize: 7.5, color: MUTED },
});

const clp = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CL')}`;
const kg = (n: number) => String(n).replace('.', ',');

const tierRange = (t: PDFWeightTier) =>
    t.max_weight == null ? `Desde ${kg(t.min_weight ?? 0)} kg` : `${kg(t.min_weight ?? 0)} – ${kg(t.max_weight)} kg`;

export default function PlansPDF({
    plans, tenantName, logoUrl, origin, showPrices = true, showImages = true,
    tiers = [], weightMode = 'surcharge', planWeightPrices = {}, contact = {},
}: PlansPDFProps) {
    const dateStr = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

    const getImageSrc = (url?: string | null) => {
        if (!url) return undefined;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const contactLine = [
        contact.phone && `Tel. ${contact.phone}`,
        contact.email,
        [contact.address, contact.city].filter(Boolean).join(', '),
    ].filter(Boolean).join('  ·  ');

    // Precio del plan en cada rango (null = no aplica una tabla para este plan)
    const weightRows = (plan: PDFPlan): { tier: PDFWeightTier; price: number }[] | null => {
        if (!showPrices || tiers.length === 0) return null;
        if (weightMode === 'table') {
            const prices = planWeightPrices[plan.id] || {};
            if (Object.keys(prices).length === 0) return null;
            return tiers.map(t => ({ tier: t, price: prices[String(t.id)] ?? plan.price ?? 0 }));
        }
        if (!plan.price || plan.price <= 0 || !tiers.some(t => (t.price ?? 0) > 0)) return null;
        return tiers.map(t => ({ tier: t, price: (plan.price || 0) + (t.price ?? 0) }));
    };

    return (
        <Document title={`Planes · ${tenantName}`} author={tenantName}>
            {plans.map((plan, index) => {
                const optional = new Set(plan.optional_service_ids || []);
                const included = (plan.services || []).filter(s => !optional.has(s.id));
                const extras = (plan.services || []).filter(s => optional.has(s.id));
                const products = plan.products || [];
                const rows = weightRows(plan);
                const minPrice = rows ? Math.min(...rows.map(r => r.price)) : null;
                const hero = showImages ? getImageSrc(plan.image_url) : undefined;

                return (
                    <Page key={plan.id} size="A4" style={styles.page}>
                        {/* Encabezado */}
                        <View style={styles.topBar} fixed>
                            <View style={styles.brand}>
                                {logoUrl && <Image src={getImageSrc(logoUrl)} style={styles.logo} />}
                                <Text style={styles.brandName}>{tenantName}</Text>
                            </View>
                            <View style={styles.topRight}>
                                <Text style={styles.topLabel}>Catálogo de planes</Text>
                                <Text style={styles.topDate}>{dateStr}</Text>
                            </View>
                        </View>

                        {hero && <Image src={hero} style={styles.hero} />}

                        <View style={styles.badges}>
                            <Text style={styles.badge}>Plan {index + 1} de {plans.length}</Text>
                            {plan.is_featured && <Text style={[styles.badge, styles.badgeFeatured]}>Más solicitado</Text>}
                        </View>

                        {/* Nombre y precio */}
                        <View style={styles.titleRow}>
                            <Text style={styles.planName}>{plan.name}</Text>
                            <View style={styles.priceBox}>
                                {!showPrices ? (
                                    <Text style={styles.priceLabel}>Precio a consultar</Text>
                                ) : rows && minPrice != null ? (
                                    <>
                                        <Text style={styles.priceCaption}>Desde</Text>
                                        <Text style={styles.price}>{clp(minPrice)}</Text>
                                    </>
                                ) : plan.price_label?.trim() ? (
                                    <Text style={styles.priceLabel}>{plan.price_label.trim()}</Text>
                                ) : plan.price > 0 ? (
                                    <Text style={styles.price}>{clp(plan.price)}</Text>
                                ) : (
                                    <Text style={styles.priceLabel}>Valor según peso</Text>
                                )}
                            </View>
                        </View>

                        {plan.important_note?.trim() && (
                            <View style={styles.note}>
                                <Text style={styles.noteText}>{plan.important_note.trim()}</Text>
                            </View>
                        )}

                        {plan.description?.trim() && <Text style={styles.description}>{plan.description.trim()}</Text>}

                        {/* Qué incluye */}
                        <View style={styles.columns}>
                            <View style={styles.column}>
                                <Text style={styles.sectionTitle}>Servicios incluidos</Text>
                                {included.length === 0 ? (
                                    <Text style={styles.empty}>—</Text>
                                ) : included.map(s => (
                                    <View key={s.id} style={styles.item} wrap={false}>
                                        <Text style={styles.bullet}>•</Text>
                                        <View style={styles.itemBody}>
                                            <Text style={styles.itemName}>{s.name}</Text>
                                            {s.description?.trim() && <Text style={styles.itemDesc}>{s.description.trim()}</Text>}
                                        </View>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.sectionTitle}>Productos incluidos</Text>
                                {products.length === 0 ? (
                                    <Text style={styles.empty}>—</Text>
                                ) : products.map(p => (
                                    <View key={p.id} style={styles.item} wrap={false}>
                                        <Text style={styles.bullet}>•</Text>
                                        <View style={styles.itemBody}>
                                            <Text style={styles.itemName}>{p.name}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {extras.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.sectionTitle}>Servicios opcionales (con costo adicional)</Text>
                                {extras.map(s => (
                                    <View key={s.id} style={styles.item} wrap={false}>
                                        <Text style={styles.bullet}>+</Text>
                                        <View style={styles.itemBody}>
                                            <Text style={styles.itemName}>{s.name}</Text>
                                            {s.description?.trim() && <Text style={styles.itemDesc}>{s.description.trim()}</Text>}
                                        </View>
                                        {showPrices && s.price > 0 && <Text style={styles.itemPrice}>{clp(s.price)}</Text>}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Precio según peso */}
                        {rows && (
                            <View wrap={false}>
                                <Text style={styles.sectionTitle}>Precio según el peso de tu mascota</Text>
                                <View style={styles.table}>
                                    <View style={styles.tr}>
                                        <Text style={styles.th}>Peso</Text>
                                        <Text style={[styles.th, { textAlign: 'right' }]}>Valor del plan</Text>
                                    </View>
                                    {rows.map((r, i) => (
                                        <View key={r.tier.id} style={i === rows.length - 1 ? styles.trLast : styles.tr}>
                                            <Text style={styles.td}>
                                                {r.tier.label ? `${r.tier.label} (${tierRange(r.tier)})` : tierRange(r.tier)}
                                            </Text>
                                            <Text style={styles.tdPrice}>{clp(r.price)}</Text>
                                        </View>
                                    ))}
                                </View>
                                <Text style={styles.tableNote}>
                                    {weightMode === 'table'
                                        ? 'Valor final del plan según el peso de la mascota.'
                                        : `Incluye el recargo por peso sobre el valor base del plan (${clp(plan.price)}).`}
                                </Text>
                            </View>
                        )}

                        {/* Pie */}
                        <View style={styles.footer} fixed>
                            <Text style={styles.footerText}>{contactLine || tenantName}</Text>
                            <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                        </View>
                    </Page>
                );
            })}
        </Document>
    );
}
