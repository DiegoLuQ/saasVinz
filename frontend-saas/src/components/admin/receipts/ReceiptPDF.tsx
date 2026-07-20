import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Estilos para el PDF
const styles = StyleSheet.create({
    page: {
        padding: 30, // Reduced from 40
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20, // Reduced from 30
        paddingBottom: 15, // Reduced from 20
        borderBottom: '1px solid #f3f4f6', // Thinner line
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    logo: {
        width: 35, // Smaller
        height: 35,
        backgroundColor: '#000',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 35,
        fontWeight: 'bold',
        fontSize: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    companyName: {
        fontSize: 18, // Smaller
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 3,
    },
    companyInfo: {
        fontSize: 8, // Smaller
        color: '#6b7280',
        marginTop: 5, // Reduced
        lineHeight: 1.4,
    },
    receiptTitle: {
        fontSize: 28, // Smaller
        fontWeight: 'bold',
        color: '#e5e7eb',
        marginBottom: 3,
    },
    receiptNumber: {
        fontSize: 12, // Smaller
        fontWeight: 'bold',
        color: '#2563eb',
    },
    receiptDate: {
        fontSize: 8,
        color: '#9ca3af',
        marginTop: 3,
        textTransform: 'uppercase',
    },
    infoSection: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 16, // Reduced from 24
        marginBottom: 20, // Reduced from 30
        flexDirection: 'row',
    },
    infoCol: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#2563eb',
        textTransform: 'uppercase',
        marginBottom: 8, // Reduced
        letterSpacing: 1,
    },
    clientName: {
        fontSize: 14, // Smaller
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 3,
    },
    planName: {
        fontSize: 14, // Smaller
        fontWeight: 'bold',
        color: '#7c3aed',
        marginBottom: 3,
    },
    detailText: {
        fontSize: 9,
        color: '#6b7280',
        marginTop: 3,
    },
    periodInfo: {
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid #e5e7eb',
        flexDirection: 'row',
        gap: 8,
    },
    table: {
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: 8,
        marginBottom: 8,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #e5e7eb',
        paddingVertical: 15, // Reduced from 24
    },
    serviceTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 3,
    },
    serviceDesc: {
        fontSize: 9,
        color: '#6b7280',
        lineHeight: 1.4,
        marginBottom: 10,
    },
    advantagesBox: {
        backgroundColor: '#eff6ff',
        border: '1px solid #dbeafe',
        borderRadius: 6,
        padding: 8, // Reduced
    },
    advantagesTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#2563eb',
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    advantageItem: {
        fontSize: 9,
        color: '#374151',
        marginVertical: 1,
        paddingLeft: 8,
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    totalSection: {
        alignItems: 'flex-end',
        marginVertical: 15, // Reduced from 30
    },
    totalBox: {
        width: 160, // Smaller
        borderTop: '2px solid #000',
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
        textTransform: 'uppercase',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    footer: {
        marginTop: 30, // Reduced from 60
        paddingTop: 15, // Reduced from 30
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#2563eb',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    footerText: {
        fontSize: 9,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
});

interface ReceiptPDFProps {
    receipt: {
        receipt_number: string;
        tenant_name: string;
        plan_name: string;
        billing_cycle: string;
        amount: number;
        currency: string;
        period_start_date: string;
        period_end_date: string;
        issued_at: string;
        issuer_name?: string;
        issuer_rut?: string;
        issuer_address?: string;
        issuer_email?: string;
        issuer_logo_url?: string;
        metadata_json?: string;
    };
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipt }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: receipt.currency || 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const cycleMap: Record<string, string> = {
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        yearly: 'Anual',
    };

    const cycleLabel = cycleMap[receipt.billing_cycle] || receipt.billing_cycle;

    // Default advantages list
    const advantages = [
        'Acceso completo a la plataforma',
        'Soporte técnico 24/7',
        'Actualizaciones automáticas',
    ];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>{receipt.issuer_name || 'SAASCREMATORIO'}</Text>
                        <View style={styles.companyInfo}>
                            <Text style={{ fontWeight: 'bold', marginTop: 10 }}>
                                Software Líder en Gestión Funeraria y Crematorios
                            </Text>
                            <Text style={{ marginTop: 12 }}>RUT: {receipt.issuer_rut || '77.777.777-7'}</Text>
                            <Text>{receipt.issuer_address || 'Av. Providencia 1234, Santiago'}</Text>
                            <Text>{receipt.issuer_email || 'contacto@saascrematorio.com'}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.receiptTitle}>RECIBO</Text>
                        <Text style={styles.receiptNumber}>{receipt.receipt_number}</Text>
                        <Text style={styles.receiptDate}>Fecha: {formatDate(receipt.issued_at)}</Text>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoTitle}>Cliente</Text>
                        <Text style={styles.clientName}>{receipt.tenant_name}</Text>
                        <Text style={styles.detailText}>
                            Estado: <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>Activo</Text>
                        </Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoTitle}>Suscripción</Text>
                        <Text style={styles.planName}>{receipt.plan_name.toUpperCase()}</Text>
                        <Text style={styles.detailText}>
                            Ciclo: <Text style={{ color: '#000', fontWeight: 'bold' }}>{cycleLabel}</Text>
                        </Text>
                        <View style={styles.periodInfo}>
                            <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold' }}>Desde:</Text>
                            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                                {formatDate(receipt.period_start_date)}
                            </Text>
                            <Text style={{ margin: '0 10px' }}>|</Text>
                            <Text style={{ fontSize: 9, color: '#9ca3af', fontWeight: 'bold' }}>Hasta:</Text>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#2563eb' }}>
                                {formatDate(receipt.period_end_date)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Descripción</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Monto</Text>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={{ flex: 3 }}>
                            <Text style={styles.serviceTitle}>Membresía Software SaaS Crematorio</Text>
                            <Text style={styles.serviceDesc}>
                                Acceso completo a la plataforma, actualizaciones y soporte.
                            </Text>
                            <View style={styles.advantagesBox}>
                                <Text style={styles.advantagesTitle}>INCLUYE</Text>
                                {advantages.map((adv, idx) => (
                                    <Text key={idx} style={styles.advantageItem}>
                                        • {adv}
                                    </Text>
                                ))}
                            </View>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.amount}>{formatCurrency(receipt.amount)}</Text>
                        </View>
                    </View>
                </View>

                {/* Total */}
                <View style={styles.totalSection}>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>{formatCurrency(receipt.amount)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerTitle}>Nuestro Compromiso</Text>
                        <Text style={styles.footerText}>"Excelencia y dignidad en cada detalle"</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 10, color: '#d1d5db', fontWeight: 'bold' }}>
                            Generado por <Text style={{ color: '#6b7280' }}>Vinzer</Text>
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default ReceiptPDF;
