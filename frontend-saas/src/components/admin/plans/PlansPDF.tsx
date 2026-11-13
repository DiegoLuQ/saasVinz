import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { FEATURES_REGISTRY, PLAN_EXEMPT_MODULES, buildDraftFromPlan } from './ManageFeaturesModal';
import type { PlanData } from './PlanCard';

/**
 * PDF «Planes y características» (Admin → Planes → Descargar PDF). Tabla comparativa
 * de los planes en el orden de «Orden»: precios, límites, créditos IA, módulos y cada
 * característica del registro (misma regla que «Configurar Características»: módulo
 * apagado = no incluida; sin valor guardado = valor por defecto del plan).
 * Helvetica de react-pdf: solo caracteres WinAnsi (nada de ✓ ni ≤).
 */

const NAVY = '#0a192f';
const GREEN = '#059669';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const SOFT = '#f1f5f9';
const UNLIMITED = 999999;

const s = StyleSheet.create({
    page: { paddingTop: 30, paddingBottom: 42, paddingHorizontal: 30, fontSize: 8.5, fontFamily: 'Helvetica', color: INK },
    band: { backgroundColor: NAVY, marginTop: -30, marginHorizontal: -30, paddingHorizontal: 30, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: { flexDirection: 'row', alignItems: 'center' },
    logo: { width: 40, height: 20, marginRight: 8 },
    brandName: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
    bandRight: { color: '#cbd5e1', fontSize: 8.5, textAlign: 'right', lineHeight: 1.4 },
    title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 16, color: NAVY },
    subtitle: { fontSize: 9, color: MUTED, marginTop: 3, marginBottom: 10, lineHeight: 1.4 },
    head: { flexDirection: 'row', backgroundColor: NAVY, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    headLabel: { color: '#cbd5e1', fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', padding: 6 },
    headPlan: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 6, paddingHorizontal: 4 },
    headCode: { color: '#94a3b8', fontSize: 6.5, textAlign: 'center', paddingBottom: 6 },
    group: { flexDirection: 'row', backgroundColor: SOFT, borderBottomWidth: 0.5, borderColor: LINE },
    groupText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 4, paddingHorizontal: 6 },
    row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: LINE },
    label: { paddingVertical: 3.5, paddingHorizontal: 6 },
    labelText: { fontSize: 8.5 },
    labelSub: { fontSize: 6.5, color: MUTED, marginTop: 1 },
    cell: { paddingVertical: 3.5, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
    yes: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GREEN },
    no: { fontSize: 8.5, color: '#cbd5e1' },
    value: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    valueSub: { fontSize: 6.5, color: MUTED, textAlign: 'center', marginTop: 1 },
    note: { fontSize: 7.5, color: MUTED, marginTop: 10, lineHeight: 1.4 },
    footer: { position: 'absolute', bottom: 16, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: '#94a3b8' },
});

const LABEL_W = 210;
const clp = (n: number) => '$' + new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const limit = (n: number | undefined) => (n ?? 0) >= UNLIMITED ? 'Ilimitado' : String(n ?? 0);
const code = (p: PlanData) => (p.code || p.name).trim().toUpperCase();

/** Módulo apagado = nada; sin valor guardado = valor por defecto del plan. */
export function planFeatureMap(p: PlanData): Record<string, boolean> {
    return buildDraftFromPlan((p.features || {}) as Record<string, boolean>, p.allowed_modules || [], code(p));
}

function Row({ label, sub, cells, cellW }: { label: string; sub?: string; cells: React.ReactNode[]; cellW: string }) {
    return (
        <View style={s.row} wrap={false}>
            <View style={[s.label, { width: LABEL_W }]}>
                <Text style={s.labelText}>{label}</Text>
                {sub ? <Text style={s.labelSub}>{sub}</Text> : null}
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
                {cells.map((c, i) => <View key={i} style={[s.cell, { width: cellW }]}>{c}</View>)}
            </View>
        </View>
    );
}

function Group({ title }: { title: string }) {
    return <View style={s.group} wrap={false} minPresenceAhead={30}><Text style={s.groupText}>{title}</Text></View>;
}

const yesNo = (v: boolean) => v ? <Text style={s.yes}>Sí</Text> : <Text style={s.no}>—</Text>;
const val = (main: string, sub?: string) => (
    <View><Text style={s.value}>{main}</Text>{sub ? <Text style={s.valueSub}>{sub}</Text> : null}</View>
);

interface Props {
    plans: PlanData[];
    logo: string | null;
    annualPct: number | null;
    generatedAt: string;
}

export function PlansPDF({ plans, logo, annualPct, generatedAt }: Props) {
    const cellW = `${100 / Math.max(1, plans.length)}%`;
    const maps = plans.map(planFeatureMap);
    const moduleOn = (p: PlanData, m: string) => PLAN_EXEMPT_MODULES.includes(m) || (p.allowed_modules || []).includes(m);

    return (
        <Document title="Planes y características" author="Vinzer">
            <Page size="A4" orientation="landscape" style={s.page}>
                <View style={s.band} fixed>
                    <View style={s.brand}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf, no lleva alt */}
                        {logo ? <Image src={logo} style={s.logo} /> : null}
                        <Text style={s.brandName}>VINZER</Text>
                    </View>
                    <Text style={s.bandRight}>Planes y características{'\n'}{generatedAt}</Text>
                </View>

                <Text style={s.title}>Planes y características</Text>
                <Text style={s.subtitle}>
                    {plans.length} planes en el orden configurado. «Sí» = el plan lo incluye según sus módulos y características.
                    {annualPct ? ` Pago anual con ${annualPct}% de descuento.` : ''}
                </Text>

                <View style={s.head} fixed>
                    <View style={{ width: LABEL_W, justifyContent: 'flex-end' }}><Text style={s.headLabel}>Plan</Text></View>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        {plans.map(p => (
                            <View key={p.id} style={{ width: cellW }}>
                                <Text style={s.headPlan}>{p.name}</Text>
                                <Text style={s.headCode}>{p.is_active === false ? 'INACTIVO' : code(p)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Group title="Precio" />
                <Row cellW={cellW} label="Mensual (CLP)" cells={plans.map(p => val(p.price > 0 ? clp(p.price) : 'Gratis'))} />
                <Row cellW={cellW} label="Anual (CLP)" cells={plans.map(p => p.price > 0 && p.annual_price
                    ? val(clp(p.annual_price), `${clp(p.annual_price / 12)} / mes`)
                    : <Text key={p.id} style={s.no}>—</Text>)} />

                <Group title="Límites y capacidad" />
                <Row cellW={cellW} label="Órdenes de cremación" sub="por mes" cells={plans.map(p => val(limit(p.max_orders)))} />
                <Row cellW={cellW} label="Usuarios" cells={plans.map(p => val(limit(p.max_users)))} />
                <Row cellW={cellW} label="Servicios" cells={plans.map(p => val(limit(p.max_services)))} />
                <Row cellW={cellW} label="Planes del crematorio" cells={plans.map(p => val(limit(p.max_plans)))} />
                <Row cellW={cellW} label="Productos" cells={plans.map(p => val(limit(p.max_products)))} />
                <Row cellW={cellW} label="Partners (veterinarias)" cells={plans.map(p => val(limit(p.max_partners)))} />
                <Row cellW={cellW} label="Créditos IA" sub="por mes" cells={plans.map(p => val(String(p.ai_monthly_credits ?? 0)))} />
                <Row cellW={cellW} label="Exportar datos" cells={plans.map(p => yesNo(!!p.can_export))} />
                <Row cellW={cellW} label="Eliminar registros" cells={plans.map(p => yesNo(!!p.can_delete))} />

                {Object.entries(FEATURES_REGISTRY).map(([mKey, mod]) => (
                    <View key={mKey}>
                        <Group title={mod.label} />
                        <Row cellW={cellW} label="Módulo" sub={PLAN_EXEMPT_MODULES.includes(mKey) ? 'incluido en todos los planes' : undefined}
                            cells={plans.map(p => yesNo(moduleOn(p, mKey)))} />
                        {mod.sections.flatMap(sec => sec.features.map(f => (
                            <Row key={f.key} cellW={cellW} label={f.label} sub={sec.label}
                                cells={maps.map(m => yesNo(!!m[f.key]))} />
                        )))}
                    </View>
                ))}

                <Text style={s.note}>
                    Precios en pesos chilenos, IVA según corresponda. Lo que paga cada crematorio que ya contrató queda congelado y no cambia con estos valores.
                </Text>

                <View style={s.footer} fixed>
                    <Text>Vinzer · Planes y características</Text>
                    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}
