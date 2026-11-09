import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

/**
 * Informes formales (react-pdf, Helvetica: solo caracteres WinAnsi) de
 * /dashboard/catalogos:
 *  - GlobalCatalogPDF: métricas comparables entre crematorios (embudo, especie, tabla por crematorio).
 *  - TenantCatalogPDF: detalle de un crematorio (planes, tamaños, formulario oficial, seguimiento, memoriales, enlaces).
 */

const NAVY = '#0a192f';
const CYAN = '#0891b2';
const ROSE = '#e11d48';
const SKY = '#0284c7';
const GREEN = '#059669';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const SOFT = '#f1f5f9';

const s = StyleSheet.create({
    page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 9.5, fontFamily: 'Helvetica', color: INK },
    band: { backgroundColor: NAVY, marginTop: -36, marginHorizontal: -36, paddingHorizontal: 36, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: { flexDirection: 'row', alignItems: 'center' },
    logo: { width: 44, height: 22, marginRight: 8 },
    brandName: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
    bandRight: { color: '#cbd5e1', fontSize: 9, textAlign: 'right', lineHeight: 1.4 },
    title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 20, color: NAVY },
    subtitle: { fontSize: 10, color: MUTED, marginTop: 4, lineHeight: 1.4 },
    filters: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    chip: { fontSize: 8.5, color: '#334155', backgroundColor: SOFT, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6, marginRight: 6, marginBottom: 4 },
    h2: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 18, marginBottom: 4 },
    hint: { fontSize: 8.5, color: MUTED, marginBottom: 8, lineHeight: 1.4 },
    kpis: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 14 },
    kpiWrap: { width: '33.33%', paddingHorizontal: 4, marginBottom: 8 },
    kpi: { borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 10 },
    kpiLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Helvetica-Bold' },
    kpiValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 3 },
    kpiHint: { fontSize: 8, color: MUTED, marginTop: 2 },
    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    barLabel: { width: 150, fontSize: 9 },
    barTrack: { flex: 1, height: 10, backgroundColor: SOFT, borderRadius: 5 },
    bar: { height: 10, borderRadius: 5 },
    barValue: { width: 40, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold' },
    barPct: { width: 42, textAlign: 'right', fontSize: 8.5, color: MUTED },
    tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: LINE, paddingBottom: 4, marginTop: 2 },
    th: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: LINE, paddingVertical: 4.5 },
    td: { fontSize: 9 },
    tdBold: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
    tdSub: { fontSize: 7.5, color: MUTED, marginTop: 1 },
    twoCols: { flexDirection: 'row' },
    col: { flex: 1 },
    box: { borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 10, marginBottom: 8 },
    boxTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY },
    boxMeta: { fontSize: 8.5, color: MUTED, marginTop: 2 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    tag: { fontSize: 8, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 5, marginRight: 4, marginBottom: 3, backgroundColor: SOFT, color: '#334155' },
    tagBad: { backgroundColor: '#ffe4e6', color: '#9f1239' },
    note: { fontSize: 8, color: MUTED, marginTop: 14, lineHeight: 1.4 },
    empty: { fontSize: 9, color: MUTED, paddingVertical: 6 },
    footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' },
});

// ---------- Tipos (subconjunto de lo que devuelve /api/internal/creator/catalog-funnel*) ----------
export interface PdfFunnel {
    visitors: number; size_select: number; plan_request: number; whatsapp: number;
    form_open: number; form_submit: number; order: number; delivered: number; pending?: number;
    forms_all?: number; orders_all?: number; delivered_all?: number;
}
export interface PdfSpecies { species: string; catalog: number; forms_all: number; orders: number }
export interface PdfTenantRow extends PdfFunnel {
    tenant_id: number; tenant_name: string; links_period: number; links_total: number;
    has_memorials?: boolean; memorial_views?: number; memorials_period?: number; memorials_total?: number;
    tracking_views?: number; tracking_orders_viewed?: number;
}
export interface PdfGlobalReport {
    totals: PdfFunnel;
    links_total: number; links_period: number;
    has_memorials?: boolean; memorials_total?: number; memorials_period?: number;
    memorial_views?: number; memorial_views_total?: number;
    tracking_views?: number; tracking_views_total?: number; tracking_orders_viewed?: number;
    by_tenant: PdfTenantRow[];
    by_species?: PdfSpecies[];
}
export interface PdfTenantReport {
    totals: PdfFunnel;
    by_species?: PdfSpecies[];
    top_plans: { plan_id: number; plan_name: string; price?: number | null; plan_request?: number; whatsapp?: number; total: number }[];
    top_sizes: { weight_tier: string; count: number }[];
    top_sizes_orders?: number;
}
export interface PdfTenantDetail {
    tenant: { id: number; name: string; slug: string; status: string; plan: string | null };
    official: { form: string | null; plans: { name: string | null } | null; products: { name: string | null } | null };
    links: { id: number; name: string; type: 'plans' | 'products'; official: boolean; active: boolean; views_count: number;
        visitors?: number; plan_requests?: number; whatsapp_clicks?: number; forms_submitted?: number; orders?: number }[];
    views: { tracking: number; tracking_distinct: number; memorial: number; memorial_distinct: number };
    orders_period: number; orders_opened: number;
    top_orders: { id: number; code: string | null; oc_number: number | null; status: string | null; pet_name: string | null; views: number }[];
    top_memorials: { id: number; pet_name: string | null; views: number }[];
    notices: { email: number; whatsapp: number; finish: number };
    feedback: { count: number; avg: number | null };
}
interface PhaseItem { field?: string; key?: string; label: string; sessions: number; pct?: number }
export interface PdfFormFunnel {
    sessions: number; submitted: number; conversion: number;
    phases?: { key: string; label: string; reached: number; pct: number; lost_here: number; actions: PhaseItem[]; errors: PhaseItem[];
        video_offered?: number; video_configured?: boolean }[];
    abandon: { key: string; label: string; sessions: number }[];
}
export interface PdfFilters { dateFrom: string; dateTo: string; trackingStage: 'in_progress' | 'delivered' | 'all'; tenantName?: string | null }

// ---------- Helpers ----------
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)} %` : '—');
const num = (v: number | null | undefined) => Math.round(v || 0).toLocaleString('es-CL');
const clp = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;
const dmy = (iso: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso || '—');
const STAGE: Record<PdfFilters['trackingStage'], string> = { in_progress: 'En proceso', delivered: 'Entregadas', all: 'Todas' };
const ORDER_STATUS: Record<string, string> = {
    pendiente: 'Pendiente', pending: 'Pendiente', recibido: 'Recibido', coordinado: 'Coordinado', en_proceso: 'En proceso',
    processing: 'En proceso', listo: 'Listo', ready: 'Listo', entregado: 'Entregado', cancelado: 'Cancelada', cancelled: 'Cancelada',
};
const FUNNEL_STEPS: { key: keyof PdfFunnel; label: string }[] = [
    { key: 'visitors', label: 'Visitas al catálogo' },
    { key: 'size_select', label: 'Eligieron tamaño' },
    { key: 'plan_request', label: 'Solicitar este plan' },
    { key: 'form_open', label: 'Abrieron el formulario' },
    { key: 'form_submit', label: 'Formulario enviado' },
    { key: 'order', label: 'Con orden' },
    { key: 'delivered', label: 'Entregada' },
];
const today = () => new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

// ---------- Bloques ----------
function Header({ logo, kind }: { logo?: string | null; kind: string }) {
    return (
        <View style={s.band} fixed>
            <View style={s.brand}>
                {logo && <Image src={logo} style={s.logo} />}
                <Text style={s.brandName}>VINZER</Text>
            </View>
            <Text style={s.bandRight}>{kind}{'\n'}Emitido el {today()}</Text>
        </View>
    );
}

function Footer({ label }: { label: string }) {
    return (
        <View style={s.footer} fixed>
            <Text>{label}</Text>
            <Text render={({ pageNumber, totalPages }) => `vinzer.cl · ${pageNumber} / ${totalPages}`} />
        </View>
    );
}

function FilterChips({ f, scope }: { f: PdfFilters; scope: string }) {
    return (
        <View style={s.filters}>
            <Text style={s.chip}>Periodo: {dmy(f.dateFrom)} al {dmy(f.dateTo)}</Text>
            <Text style={s.chip}>Alcance: {scope}</Text>
            <Text style={s.chip}>Tracking: {STAGE[f.trackingStage]}</Text>
        </View>
    );
}

function Kpi({ label, value, hint, color = INK }: { label: string; value: string; hint?: string; color?: string }) {
    return (
        <View style={s.kpiWrap} wrap={false}>
            <View style={s.kpi}>
                <Text style={s.kpiLabel}>{label}</Text>
                <Text style={[s.kpiValue, { color }]}>{value}</Text>
                {hint ? <Text style={s.kpiHint}>{hint}</Text> : null}
            </View>
        </View>
    );
}

function FunnelBlock({ t }: { t: PdfFunnel }) {
    const max = Math.max(1, ...FUNNEL_STEPS.map(x => t[x.key] || 0));
    return (
        <View wrap={false}>
            <Text style={s.h2}>Embudo del catálogo</Text>
            <Text style={s.hint}>
                Personas distintas por paso. El % compara cada paso con el anterior. Consultas por WhatsApp: {num(t.whatsapp)} ({pct(t.whatsapp, t.visitors)} de las visitas).
            </Text>
            {FUNNEL_STEPS.map((st, i) => {
                const v = t[st.key] || 0;
                const prev = i > 0 ? (t[FUNNEL_STEPS[i - 1].key] || 0) : null;
                return (
                    <View key={st.key} style={s.barRow}>
                        <Text style={s.barLabel}>{st.label}</Text>
                        <View style={s.barTrack}>
                            {v > 0 && <View style={[s.bar, { width: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: CYAN }]} />}
                        </View>
                        <Text style={s.barValue}>{num(v)}</Text>
                        <Text style={s.barPct}>{prev !== null ? pct(v, prev) : ''}</Text>
                    </View>
                );
            })}
        </View>
    );
}

function SpeciesBlock({ rows }: { rows: PdfSpecies[] }) {
    const total = rows.reduce((a, r) => a + r.forms_all, 0);
    const max = Math.max(1, ...rows.map(r => r.forms_all));
    return (
        <View wrap={false}>
            <Text style={s.h2}>Métrica por especie</Text>
            <Text style={s.hint}>Mascotas registradas desde catálogo y formularios web ({num(total)} en el periodo) y cuántas pasaron a orden.</Text>
            {rows.length === 0 ? <Text style={s.empty}>Sin registros por especie en el periodo.</Text> : (
                <>
                    <View style={s.tableHead}>
                        <Text style={[s.th, { width: 110 }]}>Especie</Text>
                        <Text style={[s.th, { flex: 1 }]}>Participación</Text>
                        <Text style={[s.th, { width: 50, textAlign: 'right' }]}>Catálogo</Text>
                        <Text style={[s.th, { width: 60, textAlign: 'right' }]}>Formularios</Text>
                        <Text style={[s.th, { width: 45, textAlign: 'right' }]}>OC</Text>
                    </View>
                    {rows.map(r => (
                        <View key={r.species} style={[s.tr, { alignItems: 'center' }]}>
                            <Text style={[s.tdBold, { width: 110 }]}>{r.species}</Text>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}>
                                <View style={[s.barTrack, { height: 7 }]}>
                                    <View style={[s.bar, { height: 7, width: `${Math.max(3, (r.forms_all / max) * 100)}%`, backgroundColor: CYAN }]} />
                                </View>
                                <Text style={{ width: 36, textAlign: 'right', fontSize: 8, color: MUTED }}>{pct(r.forms_all, total)}</Text>
                            </View>
                            <Text style={[s.td, { width: 50, textAlign: 'right' }]}>{num(r.catalog)}</Text>
                            <Text style={[s.td, { width: 60, textAlign: 'right' }]}>{num(r.forms_all)}</Text>
                            <Text style={[s.tdBold, { width: 45, textAlign: 'right', color: GREEN }]}>{num(r.orders)}</Text>
                        </View>
                    ))}
                </>
            )}
        </View>
    );
}

function AllFormsBlock({ t }: { t: PdfFunnel }) {
    return (
        <View style={[s.box, { marginTop: 4, flexDirection: 'row' }]} wrap={false}>
            <View style={{ flex: 1.4 }}>
                <Text style={s.boxTitle}>Todos los formularios web</Text>
                <Text style={s.boxMeta}>Catálogo + enlace directo, QR y formularios personalizados.</Text>
            </View>
            <View style={{ flex: 1 }}><Text style={s.kpiLabel}>Formularios</Text><Text style={[s.kpiValue, { fontSize: 14 }]}>{num(t.forms_all)}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.kpiLabel}>OC desde formulario</Text><Text style={[s.kpiValue, { fontSize: 14 }]}>{num(t.orders_all)}</Text><Text style={s.kpiHint}>{num(t.delivered_all)} entregadas</Text></View>
            <View style={{ flex: 1 }}><Text style={s.kpiLabel}>% desde catálogo</Text><Text style={[s.kpiValue, { fontSize: 14 }]}>{pct(t.order, t.orders_all || 0)}</Text><Text style={s.kpiHint}>{num(t.order)} de {num(t.orders_all)} OC</Text></View>
        </View>
    );
}

// ---------- Informe global ----------
export function GlobalCatalogPDF({ data, filters, logo }: { data: PdfGlobalReport; filters: PdfFilters; logo?: string | null }) {
    const t = data.totals;
    const scope = filters.tenantName || 'Todos los crematorios';
    const hasMem = data.has_memorials !== false;
    return (
        <Document title={`KPIs del catálogo · ${scope}`} author="Vinzer">
            <Page size="A4" style={s.page}>
                <Header logo={logo} kind="Informe de KPIs del catálogo" />
                <Text style={s.title}>KPIs del catálogo de planes</Text>
                <Text style={s.subtitle}>
                    {filters.tenantName
                        ? `Métricas comparables de ${filters.tenantName}: de la visita al catálogo al formulario, orden, seguimiento y memorial.`
                        : 'Métricas comparables entre crematorios: de la visita al catálogo al formulario, orden, seguimiento y memorial.'}
                </Text>
                <FilterChips f={filters} scope={scope} />

                <View style={s.kpis}>
                    <Kpi label="Catálogos creados" value={num(data.links_period)} hint={`${num(data.links_total)} en total`} />
                    <Kpi label="Visitas catálogo" value={num(t.visitors)} hint="Personas distintas" />
                    <Kpi label="Formularios enviados" value={num(t.form_submit)} hint={`${pct(t.form_submit, t.visitors)} de las visitas`} />
                    <Kpi label="Órdenes" value={num(t.order)} hint={`${pct(t.order, t.form_submit)} de los formularios · ${num(t.pending)} pend.`} color={GREEN} />
                    <Kpi label="Visitas a memoriales" value={hasMem ? num(data.memorial_views) : 'No habilitado'} color={ROSE}
                        hint={hasMem ? `${num(data.memorials_period)} creados (${num(data.memorials_total)} total)` : 'El plan no incluye Memoriales'} />
                    <Kpi label="Visitas a tracking" value={num(data.tracking_views)} color={SKY}
                        hint={`${num(data.tracking_orders_viewed)} seguimientos consultados`} />
                </View>

                <AllFormsBlock t={t} />
                <FunnelBlock t={t} />
                <SpeciesBlock rows={data.by_species ?? []} />

                {!filters.tenantName && (
                    <View>
                        <Text style={s.h2}>Métricas por crematorio</Text>
                        <Text style={s.hint}>El detalle de planes, tamaños y formulario oficial de cada crematorio va en su informe individual.</Text>
                        {data.by_tenant.length === 0 ? <Text style={s.empty}>Sin catálogos ni formularios en el periodo.</Text> : (
                            <>
                                <View style={s.tableHead} fixed>
                                    <Text style={[s.th, { flex: 1.6 }]}>Crematorio</Text>
                                    <Text style={[s.th, { flex: 0.8, textAlign: 'right' }]}>Catálogos</Text>
                                    <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Visitas</Text>
                                    <Text style={[s.th, { flex: 0.8, textAlign: 'right' }]}>Solicitudes</Text>
                                    <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Conv.</Text>
                                    <Text style={[s.th, { flex: 0.9, textAlign: 'right' }]}>Formularios</Text>
                                    <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>OC</Text>
                                    <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Tracking</Text>
                                    <Text style={[s.th, { flex: 0.8, textAlign: 'right' }]}>Memoriales</Text>
                                </View>
                                {data.by_tenant.map(r => (
                                    <View key={r.tenant_id} style={s.tr} wrap={false}>
                                        <Text style={[s.tdBold, { flex: 1.6, paddingRight: 4 }]}>{r.tenant_name}</Text>
                                        <Text style={[s.td, { flex: 0.8, textAlign: 'right' }]}>{num(r.links_period)} / {num(r.links_total)}</Text>
                                        <Text style={[s.td, { flex: 0.7, textAlign: 'right' }]}>{num(r.visitors)}</Text>
                                        <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                                            <Text style={s.td}>{num(r.plan_request)}</Text>
                                            {r.whatsapp > 0 && <Text style={s.tdSub}>+{num(r.whatsapp)} WA</Text>}
                                        </View>
                                        <Text style={[s.tdBold, { flex: 0.7, textAlign: 'right', color: CYAN }]}>{pct(r.form_submit, r.visitors)}</Text>
                                        <View style={{ flex: 0.9, alignItems: 'flex-end' }}>
                                            <Text style={s.td}>{num(r.forms_all)}</Text>
                                            {(r.pending || 0) > 0 && <Text style={s.tdSub}>{num(r.pending)} pend.</Text>}
                                        </View>
                                        <View style={{ flex: 0.7, alignItems: 'flex-end' }}>
                                            <Text style={[s.tdBold, { color: GREEN }]}>{num(r.orders_all)}</Text>
                                            {(r.delivered_all || 0) > 0 && <Text style={s.tdSub}>{num(r.delivered_all)} entr.</Text>}
                                        </View>
                                        <Text style={[s.td, { flex: 0.7, textAlign: 'right' }]}>{num(r.tracking_views)}</Text>
                                        <Text style={[s.td, { flex: 0.8, textAlign: 'right' }]}>{r.has_memorials !== false ? num(r.memorial_views) : 'Sin módulo'}</Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                )}

                <Text style={s.note}>
                    Se mide desde que existe este reporte (1 nov 2026). Cada persona cuenta una vez por paso y enlace en el catálogo, y cada
                    apertura de link de memorial o tracking suma al contador de su crematorio. Tracking considera las aperturas con la orden
                    en estado «{STAGE[filters.trackingStage]}».
                </Text>
                <Footer label={`KPIs del catálogo · ${scope}`} />
            </Page>
        </Document>
    );
}

// ---------- Informe del crematorio ----------
export function TenantCatalogPDF({ detail, report, form, filters, logo }: {
    detail: PdfTenantDetail; report: PdfTenantReport | null; form: PdfFormFunnel | null; filters: PdfFilters; logo?: string | null;
}) {
    const d = detail;
    const name = d.tenant.name;
    const t = report?.totals;
    const plansMax = Math.max(1, ...(report?.top_plans ?? []).map(p => p.total));
    const sizesMax = Math.max(1, ...(report?.top_sizes ?? []).map(x => x.count));
    return (
        <Document title={`Informe del crematorio · ${name}`} author="Vinzer">
            <Page size="A4" style={s.page}>
                <Header logo={logo} kind="Informe del crematorio" />
                <Text style={s.title}>{name}</Text>
                <Text style={s.subtitle}>Plan {d.tenant.plan || '—'} · {d.tenant.slug} · {d.tenant.status}</Text>
                <FilterChips f={filters} scope={name} />

                <View style={s.kpis}>
                    <Kpi label="Aperturas seguimiento" value={num(d.views.tracking)} color={SKY} hint={`${num(d.views.tracking_distinct)} seguimientos distintos`} />
                    <Kpi label="Órdenes con seguimiento" value={pct(d.orders_opened, d.orders_period)} hint={`${num(d.orders_opened)} de ${num(d.orders_period)} órdenes del periodo`} />
                    <Kpi label="Aperturas memorial" value={num(d.views.memorial)} color={ROSE} hint={`${num(d.views.memorial_distinct)} memoriales distintos`} />
                    <Kpi label="Avisos a familias" value={num(d.notices.email + d.notices.whatsapp)} hint={`Email ${num(d.notices.email)} · WhatsApp ${num(d.notices.whatsapp)} · ${num(d.notices.finish)} de cierre`} />
                    <Kpi label="Encuesta" value={d.feedback.avg != null ? `${d.feedback.avg} / 5` : '—'} hint={`${num(d.feedback.count)} respuestas`} />
                    {t && <Kpi label="Formularios web" value={num(t.forms_all)} color={GREEN} hint={`${num(t.orders_all)} con orden · ${num(t.delivered_all)} entregadas`} />}
                </View>

                {t && <FunnelBlock t={t} />}
                {report && <SpeciesBlock rows={report.by_species ?? []} />}

                {report && (
                    <View style={[s.twoCols, { marginTop: 4 }]}>
                        <View style={[s.col, { marginRight: 10 }]} wrap={false}>
                            <Text style={s.h2}>Planes más pedidos</Text>
                            <Text style={s.hint}>«Solicitar este plan» + WhatsApp (planes vigentes).</Text>
                            {report.top_plans.length === 0 ? <Text style={s.empty}>Sin solicitudes en el periodo.</Text> : report.top_plans.map(p => (
                                <View key={p.plan_id} style={{ marginBottom: 5 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={[s.td, { flex: 1, paddingRight: 6 }]}>{p.plan_name}{p.price ? `  ·  ${clp(p.price)}` : ''}</Text>
                                        <Text style={s.tdBold}>{num(p.total)}</Text>
                                    </View>
                                    <View style={[s.barTrack, { height: 5, marginTop: 2 }]}><View style={[s.bar, { height: 5, width: `${(p.total / plansMax) * 100}%`, backgroundColor: CYAN }]} /></View>
                                </View>
                            ))}
                        </View>
                        <View style={s.col} wrap={false}>
                            <Text style={s.h2}>Tamaños más pedidos</Text>
                            <Text style={s.hint}>{num(report.top_sizes_orders)} órdenes en proceso y entregadas del periodo.</Text>
                            {report.top_sizes.length === 0 ? <Text style={s.empty}>Sin datos en el periodo.</Text> : report.top_sizes.map(x => (
                                <View key={x.weight_tier} style={{ marginBottom: 5 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={[s.td, { flex: 1, paddingRight: 6 }]}>{x.weight_tier}</Text>
                                        <Text style={s.tdBold}>{num(x.count)}</Text>
                                    </View>
                                    <View style={[s.barTrack, { height: 5, marginTop: 2 }]}><View style={[s.bar, { height: 5, width: `${(x.count / sizesMax) * 100}%`, backgroundColor: CYAN }]} /></View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
                <Footer label={`Informe del crematorio · ${name}`} />
            </Page>

            <Page size="A4" style={s.page}>
                <Header logo={logo} kind="Informe del crematorio" />
                <Text style={[s.h2, { marginTop: 20 }]}>Formulario oficial: hasta dónde llegan</Text>
                {!form ? <Text style={s.empty}>Sin datos del formulario oficial.</Text> : (
                    <>
                        <Text style={s.hint}>
                            {num(form.sessions)} visitas · {num(form.submitted)} enviados · conversión {form.conversion}%. Cada visita cuenta una vez por paso, sin datos personales.
                        </Text>
                        {form.sessions === 0 ? <Text style={s.empty}>Aún no hay visitas al formulario oficial en el periodo.</Text> :
                            (form.phases ?? []).map((ph, i) => (
                                <View key={ph.key} style={s.box} wrap={false}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={s.boxTitle}>{i + 1}. {ph.label}</Text>
                                        <Text style={s.tdBold}>{num(ph.reached)} <Text style={{ color: MUTED, fontFamily: 'Helvetica' }}>({Math.round(ph.pct)} %)</Text></Text>
                                    </View>
                                    {ph.lost_here > 0 && <Text style={[s.boxMeta, { color: ROSE }]}>{num(ph.lost_here)} {ph.lost_here === 1 ? 'persona dejó' : 'personas dejaron'} el formulario aquí</Text>}
                                    {ph.key === 'inicio' && ph.video_configured && !ph.video_offered && (
                                        <Text style={s.boxMeta}>Video de bienvenida configurado (sin reproducciones en el periodo).</Text>
                                    )}
                                    {ph.actions.length > 0 && (
                                        <View style={s.tagRow}>
                                            {ph.actions.map(a => <Text key={a.key || a.label} style={s.tag}>{a.label}: {num(a.sessions)}{a.pct != null ? ` (${Math.round(a.pct)} %)` : ''}</Text>)}
                                        </View>
                                    )}
                                    {ph.errors.length > 0 && (
                                        <View style={s.tagRow}>
                                            {ph.errors.map(e => <Text key={e.field || e.label} style={[s.tag, s.tagBad]}>Error {e.label}: {num(e.sessions)}</Text>)}
                                        </View>
                                    )}
                                </View>
                            ))}
                    </>
                )}

                <View style={[s.twoCols, { marginTop: 4 }]}>
                    <View style={[s.col, { marginRight: 10 }]}>
                        <Text style={s.h2}>Seguimientos más abiertos</Text>
                        {d.top_orders.length === 0 ? <Text style={s.empty}>Sin aperturas en el periodo.</Text> : (
                            <>
                                <View style={s.tableHead}>
                                    <Text style={[s.th, { flex: 1.3 }]}>Mascota</Text>
                                    <Text style={[s.th, { flex: 0.8 }]}>Orden</Text>
                                    <Text style={[s.th, { flex: 1 }]}>Estado</Text>
                                    <Text style={[s.th, { width: 45, textAlign: 'right' }]}>Aperturas</Text>
                                </View>
                                {d.top_orders.map(o => (
                                    <View key={o.id} style={s.tr} wrap={false}>
                                        <Text style={[s.tdBold, { flex: 1.3 }]}>{o.pet_name || '—'}</Text>
                                        <Text style={[s.td, { flex: 0.8 }]}>{o.oc_number ? `#${o.oc_number}` : o.code || `#${o.id}`}</Text>
                                        <Text style={[s.td, { flex: 1 }]}>{ORDER_STATUS[(o.status || '').toLowerCase()] || o.status || '—'}</Text>
                                        <Text style={[s.tdBold, { width: 45, textAlign: 'right' }]}>{num(o.views)}</Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                    <View style={s.col}>
                        <Text style={s.h2}>Memoriales más visitados</Text>
                        {d.top_memorials.length === 0 ? <Text style={s.empty}>Sin visitas en el periodo.</Text> : (
                            <>
                                <View style={s.tableHead}>
                                    <Text style={[s.th, { flex: 1 }]}>Mascota</Text>
                                    <Text style={[s.th, { width: 45, textAlign: 'right' }]}>Visitas</Text>
                                </View>
                                {d.top_memorials.map(m => (
                                    <View key={m.id} style={s.tr} wrap={false}>
                                        <Text style={[s.tdBold, { flex: 1 }]}>{m.pet_name || '—'}</Text>
                                        <Text style={[s.tdBold, { width: 45, textAlign: 'right' }]}>{num(m.views)}</Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>
                </View>

                <Text style={s.h2}>Enlaces oficiales</Text>
                <View style={s.twoCols} wrap={false}>
                    {[
                        { label: 'Formulario oficial', value: d.official.form },
                        { label: 'Catálogo de planes', value: d.official.plans ? (d.official.plans.name || 'Sin nombre') : null },
                        { label: 'Catálogo de productos', value: d.official.products ? (d.official.products.name || 'Sin nombre') : null },
                    ].map((o, i) => (
                        <View key={o.label} style={[s.box, s.col, i < 2 ? { marginRight: 6 } : {}]}>
                            <Text style={s.kpiLabel}>{o.label}</Text>
                            <Text style={[s.tdBold, { marginTop: 3, color: o.value ? INK : MUTED }]}>{o.value || 'Sin elegir'}</Text>
                        </View>
                    ))}
                </View>

                <Text style={s.h2}>Enlaces de catálogo ({d.links.length})</Text>
                <Text style={s.hint}>Histórico de cada enlace desde que se creó.</Text>
                {d.links.length === 0 ? <Text style={s.empty}>Este crematorio no ha creado enlaces de catálogo.</Text> : (
                    <>
                        <View style={s.tableHead} fixed>
                            <Text style={[s.th, { flex: 2 }]}>Enlace</Text>
                            <Text style={[s.th, { flex: 0.8 }]}>Tipo</Text>
                            <Text style={[s.th, { flex: 0.8 }]}>Estado</Text>
                            <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Apert.</Text>
                            <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Visitas</Text>
                            <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Solic.</Text>
                            <Text style={[s.th, { flex: 0.6, textAlign: 'right' }]}>WA</Text>
                            <Text style={[s.th, { flex: 0.7, textAlign: 'right' }]}>Form.</Text>
                            <Text style={[s.th, { flex: 0.6, textAlign: 'right' }]}>OC</Text>
                        </View>
                        {d.links.map(l => (
                            <View key={l.id} style={s.tr} wrap={false}>
                                <Text style={[s.tdBold, { flex: 2, paddingRight: 4 }]}>{l.name}{l.official ? '  (oficial)' : ''}</Text>
                                <Text style={[s.td, { flex: 0.8 }]}>{l.type === 'plans' ? 'Planes' : 'Productos'}</Text>
                                <Text style={[s.td, { flex: 0.8, color: l.active ? GREEN : MUTED }]}>{l.active ? 'Activo' : 'Inactivo'}</Text>
                                <Text style={[s.td, { flex: 0.7, textAlign: 'right' }]}>{num(l.views_count)}</Text>
                                {l.type === 'plans' ? (
                                    <>
                                        <Text style={[s.td, { flex: 0.7, textAlign: 'right' }]}>{num(l.visitors)}</Text>
                                        <Text style={[s.td, { flex: 0.7, textAlign: 'right' }]}>{num(l.plan_requests)}</Text>
                                        <Text style={[s.td, { flex: 0.6, textAlign: 'right' }]}>{num(l.whatsapp_clicks)}</Text>
                                        <Text style={[s.td, { flex: 0.7, textAlign: 'right' }]}>{num(l.forms_submitted)}</Text>
                                        <Text style={[s.tdBold, { flex: 0.6, textAlign: 'right' }]}>{num(l.orders)}</Text>
                                    </>
                                ) : <Text style={[s.td, { flex: 3.3, textAlign: 'right', color: MUTED }]}>Solo aperturas</Text>}
                            </View>
                        ))}
                    </>
                )}
                <Footer label={`Informe del crematorio · ${name}`} />
            </Page>
        </Document>
    );
}

