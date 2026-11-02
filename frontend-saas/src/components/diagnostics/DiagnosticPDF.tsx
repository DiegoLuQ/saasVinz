import React from 'react';
import { Document, Page, Text, View, Image, Link, StyleSheet } from '@react-pdf/renderer';
import { type DiagnosticReport, type DiagCategoryScore, pctTone, TONE_HEX, fmtPct, clp, MODES, promoPrice, waLink } from '@/lib/diagnostics';

// Informe del Diagnóstico 360° (react-pdf, Helvetica: solo caracteres Latin-1).
const NAVY = '#0a192f';
const CYAN = '#0891b2';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

const s = StyleSheet.create({
    page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 10, fontFamily: 'Helvetica', color: INK },
    band: { backgroundColor: NAVY, marginTop: -36, marginHorizontal: -36, paddingHorizontal: 36, paddingVertical: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: { flexDirection: 'row', alignItems: 'center' },
    logo: { width: 44, height: 22, marginRight: 8 },
    brandName: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
    bandRight: { color: '#cbd5e1', fontSize: 9, textAlign: 'right' },
    title: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginTop: 22, color: NAVY },
    subtitle: { fontSize: 11, color: MUTED, marginTop: 4 },
    hero: { flexDirection: 'row', marginTop: 18, borderWidth: 1, borderColor: LINE, borderRadius: 10, padding: 16, alignItems: 'center' },
    heroPct: { fontSize: 40, fontFamily: 'Helvetica-Bold' },
    heroLabel: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 },
    heroLevel: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: NAVY },
    heroMsg: { fontSize: 10, color: '#334155', marginTop: 4, lineHeight: 1.4 },
    h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 20, marginBottom: 8 },
    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    catName: { width: 160, fontSize: 9.5 },
    barTrack: { flex: 1, height: 9, backgroundColor: '#f1f5f9', borderRadius: 5 },
    bar: { height: 9, borderRadius: 5 },
    catPct: { width: 44, textAlign: 'right', fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
    twoCols: { flexDirection: 'row', marginTop: 6 },
    col: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 10 },
    colTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
    li: { fontSize: 9.5, marginBottom: 3 },
    recCat: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 3 },
    recItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
    bullet: { width: 10, color: CYAN, fontFamily: 'Helvetica-Bold' },
    recText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
    tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: LINE, paddingBottom: 4, marginTop: 4 },
    th: { fontSize: 8, color: MUTED, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: LINE, paddingVertical: 5 },
    tdQ: { flex: 1.3, fontSize: 9, paddingRight: 8 },
    tdA: { flex: 1, fontSize: 9, color: '#334155', paddingRight: 8 },
    tdP: { width: 46, fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
    dot: { width: 7, height: 7, borderRadius: 4, marginRight: 4, marginTop: 1 },
    planBox: { marginTop: 10, borderRadius: 10, backgroundColor: '#ecfeff', borderWidth: 1, borderColor: '#a5f3fc', padding: 14 },
    planName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY },
    cta: { marginTop: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: NAVY, borderRadius: 10, padding: 14 },
    ctaText: { color: '#ffffff', fontSize: 12, fontFamily: 'Helvetica-Bold' },
    ctaLink: { color: '#67e8f9', fontSize: 10, marginTop: 4, textDecoration: 'none' },
    qr: { width: 74, height: 74, marginLeft: 'auto', backgroundColor: '#ffffff', padding: 4, borderRadius: 6 },
    footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' },
    note: { fontSize: 8.5, color: MUTED, marginTop: 6, lineHeight: 1.4 },
});

const toneColor = (pct: number | null) => TONE_HEX[pctTone(pct)];

function CategoryBars({ scores }: { scores: DiagCategoryScore[] }) {
    return (
        <View>
            {scores.map(c => (
                <View key={c.key} style={s.catRow} wrap={false}>
                    <Text style={s.catName}>{c.name}</Text>
                    <View style={s.barTrack}>
                        {c.pct !== null && <View style={[s.bar, { width: `${Math.max(3, c.pct)}%`, backgroundColor: toneColor(c.pct) }]} />}
                    </View>
                    <Text style={[s.catPct, { color: toneColor(c.pct) }]}>{c.pct === null ? 'N/A' : fmtPct(c.pct)}</Text>
                </View>
            ))}
        </View>
    );
}

interface Props { d: DiagnosticReport; logo?: string | null; qr?: string | null }

export default function DiagnosticPDF({ d, logo, qr }: Props) {
    const date = new Date(d.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const modeLabel = MODES.find(m => m.value === d.mode)?.label ?? '';
    const scored = d.category_scores.filter(c => c.pct !== null);
    const strengths = [...scored].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 3);
    const weak = [...scored].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).filter(c => (c.pct ?? 0) < 100).slice(0, 3);

    // Recomendaciones agrupadas por categoría (respuestas bajo el umbral)
    const recs = d.category_scores
        .map(c => ({ cat: c, items: d.answers.filter(a => a.category_key === c.key && a.recommendation) }))
        .filter(g => g.items.length > 0);

    // Funciones de Vinzer: solo las ligadas a lo que salió bajo
    const features = Array.from(new Set(
        d.answers.filter(a => a.recommendation && a.vinzer_feature).map(a => a.vinzer_feature as string)
    ));
    const plan = d.suggested_plan;
    const total = d.total_pct;
    const price = d.plan_price?.price ?? 0;
    const promo = d.promo_pct > 0 ? d.promo_pct : 0;
    const wa = waLink(d.sales_whatsapp,
        `Hola, hice el Diagnóstico 360° de ${d.business_name} (${fmtPct(total)}) y quiero aprovechar el ${promo || ''}${promo ? ' % de descuento en ' : ''}el plan ${d.plan_price?.name ?? plan?.plan ?? ''}.`);

    return (
        <Document title={`Diagnóstico 360° · ${d.business_name}`} author="Vinzer">
            <Page size="A4" style={s.page}>
                <View style={s.band}>
                    <View style={s.brand}>
                        {logo && <Image src={logo} style={s.logo} />}
                        <Text style={s.brandName}>VINZER</Text>
                    </View>
                    <Text style={s.bandRight}>Diagnóstico 360°{'\n'}{date}</Text>
                </View>

                <Text style={s.title}>{d.business_name}</Text>
                <Text style={s.subtitle}>
                    {[[d.city, d.region].filter(Boolean).join(', '), d.contact_name && `Contacto: ${d.contact_name}`,
                        `Modalidad ${modeLabel} (${d.mode} preguntas)`].filter(Boolean).join(' · ')}
                </Text>

                <View style={s.hero}>
                    <View style={{ width: 130, alignItems: 'center' }}>
                        <Text style={s.heroLabel}>Resultado general</Text>
                        <Text style={[s.heroPct, { color: toneColor(total) }]}>{fmtPct(total)}</Text>
                    </View>
                    <View style={{ flex: 1, paddingLeft: 14, borderLeftWidth: 1, borderColor: LINE }}>
                        <Text style={s.heroLabel}>Nivel de optimización</Text>
                        <Text style={s.heroLevel}>{d.level ?? '—'}</Text>
                        {d.level_message && <Text style={s.heroMsg}>{d.level_message}</Text>}
                        {d.is_partial && <Text style={[s.note, { color: '#b45309' }]}>Diagnóstico parcial: varias preguntas no aplicaban a tu crematorio.</Text>}
                    </View>
                </View>

                <Text style={s.h2}>Resultado por área</Text>
                <CategoryBars scores={d.category_scores} />

                <View style={s.twoCols}>
                    <View style={[s.col, { marginRight: 8 }]}>
                        <Text style={[s.colTitle, { color: TONE_HEX.good }]}>Tus fortalezas</Text>
                        {strengths.map(c => <Text key={c.key} style={s.li}>• {c.name} ({fmtPct(c.pct)})</Text>)}
                    </View>
                    <View style={s.col}>
                        <Text style={[s.colTitle, { color: TONE_HEX.bad }]}>Oportunidades de mejora</Text>
                        {weak.length === 0
                            ? <Text style={s.li}>Todas tus áreas están al máximo.</Text>
                            : weak.map(c => <Text key={c.key} style={s.li}>• {c.name} ({fmtPct(c.pct)})</Text>)}
                    </View>
                </View>

                <Footer business={d.business_name} />
            </Page>

            <Page size="A4" style={s.page}>
                {recs.length > 0 && (
                    <>
                        <Text style={[s.h2, { marginTop: 0 }]}>Recomendaciones</Text>
                        {recs.map(g => (
                            <View key={g.cat.key} wrap={false}>
                                <Text style={s.recCat}>{g.cat.name} · {fmtPct(g.cat.pct)}</Text>
                                {g.items.map(a => (
                                    <View key={a.question_id} style={s.recItem}>
                                        <Text style={s.bullet}>›</Text>
                                        <Text style={s.recText}>{a.recommendation}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </>
                )}

                <Text style={[s.h2, recs.length === 0 ? { marginTop: 0 } : {}]}>Detalle de tus respuestas</Text>
                <View style={s.tableHead}>
                    <Text style={[s.th, { flex: 1.3 }]}>Pregunta</Text>
                    <Text style={[s.th, { flex: 1 }]}>Tu respuesta</Text>
                    <Text style={[s.th, { width: 46, textAlign: 'right' }]}>Puntaje</Text>
                </View>
                {d.answers.map(a => (
                    <View key={a.question_id} style={s.tr} wrap={false}>
                        <Text style={s.tdQ}>{a.question}</Text>
                        <View style={[s.tdA, { flexDirection: 'row' }]}>
                            <View style={[s.dot, { backgroundColor: toneColor(a.pct) }]} />
                            <Text style={{ flex: 1 }}>{a.answer}</Text>
                        </View>
                        <Text style={[s.tdP, { color: toneColor(a.pct) }]}>{a.na ? 'N/A' : fmtPct(a.pct)}</Text>
                    </View>
                ))}
                <Footer business={d.business_name} />
            </Page>

            <Page size="A4" style={s.page}>
                <Text style={[s.h2, { marginTop: 0 }]}>Cómo te ayuda Vinzer</Text>
                <Text style={s.heroMsg}>
                    Vinzer es la plataforma para crematorios de mascotas: órdenes, seguimiento para las familias,
                    certificados, catálogo de planes y más, en un solo lugar.
                </Text>
                {features.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                        <Text style={s.colTitle}>Según tu diagnóstico, esto es lo que más te ayudaría:</Text>
                        {features.map(f => (
                            <View key={f} style={s.recItem}>
                                <Text style={s.bullet}>›</Text>
                                <Text style={s.recText}>{f}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {plan && (
                    <View style={s.planBox} wrap={false}>
                        <Text style={s.heroLabel}>Plan sugerido</Text>
                        <Text style={s.planName}>Plan {d.plan_price?.name ?? plan.plan}</Text>
                        {price > 0 && (
                            promo ? (
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
                                    <Text style={{ fontSize: 11, color: MUTED, textDecoration: 'line-through', marginRight: 6 }}>{clp(price)}</Text>
                                    <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: CYAN }}>{clp(promoPrice(price, promo))} al mes</Text>
                                </View>
                            ) : <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 4 }}>{clp(price)} al mes</Text>
                        )}
                        {promo > 0 && (
                            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#be185d', marginTop: 6 }}>
                                {promo} % de descuento{d.promo_text ? ` · ${d.promo_text}` : ''}
                            </Text>
                        )}
                        <Text style={s.heroMsg}>{plan.reason}</Text>
                        {plan.start_free && (
                            <Text style={s.heroMsg}>
                                Puedes empezar gratis con el plan FREE y subir de plan cuando lo necesites.
                            </Text>
                        )}
                    </View>
                )}

                <View style={s.cta} wrap={false}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.ctaText}>Siguiente paso: conoce Vinzer</Text>
                        {wa && <Link src={wa} style={s.ctaLink}>Escríbenos por WhatsApp</Link>}
                        <Link src={d.cta_url} style={s.ctaLink}>{d.cta_url.replace(/^https?:\/\//, '')}</Link>
                    </View>
                    {qr && <Image src={qr} style={s.qr} />}
                </View>

                <Text style={[s.note, { marginTop: 18 }]}>
                    Cómo se calcula: cada respuesta vale un % de cumplimiento; el resultado de cada área es el promedio de sus
                    preguntas y el resultado general pondera las áreas según su importancia. Las preguntas marcadas como
                    «No aplica» no se consideran.
                </Text>
                <Footer business={d.business_name} />
            </Page>
        </Document>
    );
}

function Footer({ business }: { business: string }) {
    return (
        <View style={s.footer} fixed>
            <Text>Diagnóstico 360° · {business}</Text>
            <Text render={({ pageNumber, totalPages }) => `vinzer.cl · ${pageNumber} / ${totalPages}`} />
        </View>
    );
}
