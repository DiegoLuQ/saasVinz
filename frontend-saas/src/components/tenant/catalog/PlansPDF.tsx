import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface Service {
    id: number;
    name: string;
    description: string;
    price: number;
    cost: number;
    is_active: boolean;
}

interface Product {
    id: number;
    name: string;
    sale_price: number;
    cost_price: number;
}

interface CatalogPlan {
    id: number;
    name: string;
    description: string;
    price: number;
    cost: number;
    is_active: boolean;
    image_url?: string | null;
    services?: Service[];
    products?: Product[];
}

interface PlansPDFProps {
    plans: CatalogPlan[];
    tenantName: string;
    logoUrl: string | null;
    origin: string;
    showPrices?: boolean;
}

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingBottom: 18,
        borderBottom: '2.5px solid #d97706',
        marginBottom: 24,
    },
    logoContainer: {
        width: 55,
        height: 55,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 55,
        height: 55,
        objectFit: 'contain',
    },
    logoPlaceholder: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#d1d5db',
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 3,
    },
    subtitle: {
        fontSize: 11,
        color: '#4b5563',
        marginBottom: 3,
    },
    date: {
        fontSize: 8,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    planList: {
        flexDirection: 'column',
        gap: 18,
    },
    planCard: {
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        backgroundColor: '#fafafa',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: 8,
        marginBottom: 10,
    },
    planName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    planPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#d97706',
    },
    planNoPrice: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    planDescription: {
        fontSize: 9.5,
        color: '#4b5563',
        lineHeight: 1.5,
        marginBottom: 12,
    },
    servicesSection: {
        marginTop: 4,
    },
    servicesTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    servicesGrid: {
        flexDirection: 'column',
        gap: 6,
    },
    serviceItem: {
        backgroundColor: '#ffffff',
        border: '1px solid #f3f4f6',
        borderRadius: 6,
        padding: 8,
    },
    serviceName: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 2,
    },
    serviceDesc: {
        fontSize: 7.5,
        color: '#6b7280',
        lineHeight: 1.3,
    },
    footer: {
        position: 'absolute',
        bottom: 25,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTop: '1px solid #e5e7eb',
    },
    footerText: {
        fontSize: 7.5,
        color: '#9ca3af',
    },
});

export default function PlansPDF({ plans, tenantName, logoUrl, origin, showPrices = true }: PlansPDFProps) {
    const dateStr = new Date().toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const getImageSrc = (url?: string | null) => {
        if (!url) return undefined;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        {logoUrl ? (
                            <Image src={getImageSrc(logoUrl)} style={styles.logo} />
                        ) : (
                            <Text style={styles.logoPlaceholder}>VP</Text>
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{tenantName}</Text>
                        <Text style={styles.subtitle}>Portafolio de Planes Comerciales</Text>
                        <Text style={styles.date}>Generado el {dateStr}</Text>
                    </View>
                </View>

                {/* Plan List */}
                <View style={styles.planList}>
                    {plans.map((plan) => (
                        <View key={plan.id} style={styles.planCard} wrap={false}>
                            {/* Card Header */}
                            <View style={styles.planHeader}>
                                <Text style={styles.planName}>{plan.name}</Text>
                                {showPrices ? (
                                    <Text style={styles.planPrice}>
                                        ${(plan.price || 0).toLocaleString('es-CL')}
                                    </Text>
                                ) : (
                                    <Text style={styles.planNoPrice}>Consultar Precio</Text>
                                )}
                            </View>

                            {/* Plan Description & Image */}
                            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
                                {plan.image_url && (
                                    <Image src={getImageSrc(plan.image_url)} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.planDescription, { marginBottom: 0 }]}>
                                        {plan.description || 'Sin descripción detallada.'}
                                    </Text>
                                </View>
                            </View>

                            {/* Composition Columns (Services & Products) */}
                            <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
                                {/* Services Column */}
                                <View style={{ flex: 1 }}>
                                    {plan.services && plan.services.length > 0 ? (
                                        <View style={styles.servicesSection}>
                                            <Text style={styles.servicesTitle}>Servicios Incluidos</Text>
                                            <View style={styles.servicesGrid}>
                                                {plan.services.map((svc) => (
                                                    <View key={svc.id} style={styles.serviceItem}>
                                                        <Text style={svc.is_active ? styles.serviceName : [styles.serviceName, { color: '#9ca3af' }]}>
                                                            • {svc.name} {!svc.is_active && '(Inactivo)'}
                                                        </Text>
                                                        {svc.description && (
                                                            <Text style={styles.serviceDesc}>{svc.description}</Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Products Column */}
                                <View style={{ flex: 1 }}>
                                    {plan.products && plan.products.length > 0 ? (
                                        <View style={styles.servicesSection}>
                                            <Text style={[styles.servicesTitle, { color: '#e04f1a' }]}>Productos Incluidos</Text>
                                            <View style={styles.servicesGrid}>
                                                {plan.products.map((prod) => (
                                                    <View key={prod.id} style={styles.serviceItem}>
                                                        <Text style={styles.serviceName}>
                                                            • {prod.name}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>{tenantName} • Dossier de Planes</Text>
                    <Text style={styles.footerText}>
                        {plans.length} plan{plans.length !== 1 ? 'es' : ''} registrado{plans.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
