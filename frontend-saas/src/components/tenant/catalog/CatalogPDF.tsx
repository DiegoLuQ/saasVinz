import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface CatalogProduct {
    id: number;
    name: string;
    code: string;
    sale_price: number;
    cost_price: number;
    stock: number;
    discount_percentage?: number;
    image_url?: string | null;
    category?: { name: string } | null;
    availability_status?: string;
}

interface CatalogPDFProps {
    products: CatalogProduct[];
    tenantName: string;
    logoUrl: string | null;
    origin: string;
    showPrices?: boolean;
}

const styles = StyleSheet.create({
    page: {
        padding: 28,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingBottom: 18,
        borderBottom: '2px solid #d97706',
        marginBottom: 20,
    },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 50,
        height: 50,
        objectFit: 'contain',
    },
    logoPlaceholder: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d1d5db',
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 10,
        color: '#6b7280',
        marginBottom: 2,
    },
    date: {
        fontSize: 8,
        color: '#9ca3af',
        textTransform: 'uppercase',
    },
    grid: {
        flexDirection: 'column',
        gap: 12,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        flex: 1,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#ffffff',
    },
    imageContainer: {
        width: '100%',
        height: 160,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    productImage: {
        width: '100%',
        height: 160,
        objectFit: 'contain',
    },
    noImageText: {
        fontSize: 8,
        color: '#d1d5db',
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    cardBody: {
        padding: 8,
    },
    productName: {
        fontSize: 8.5,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 2,
    },
    productCode: {
        fontSize: 6.5,
        color: '#9ca3af',
        fontFamily: 'Courier',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    price: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#d97706',
    },
    consultPriceText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderRadius: 3,
    },
    discountedPrice: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#d97706',
    },
    originalPrice: {
        fontSize: 7.5,
        color: '#9ca3af',
        textDecoration: 'line-through',
    },
    discountBadge: {
        fontSize: 6.5,
        fontWeight: 'bold',
        color: '#e11d48',
        backgroundColor: '#fce7f3',
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 3,
    },
    discountBadgeText: {
        fontSize: 6.5,
        fontWeight: 'bold',
        color: '#e11d48',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 2,
    },
    stockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    stockGreen: {
        backgroundColor: '#10b981',
    },
    stockYellow: {
        backgroundColor: '#f59e0b',
    },
    stockRed: {
        backgroundColor: '#ef4444',
    },
    category: {
        fontSize: 6.5,
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 3,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    stockTextAgotado: {
        fontSize: 6.5,
        color: '#ef4444',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 28,
        right: 28,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTop: '1px solid #e5e7eb',
    },
    footerText: {
        fontSize: 7,
        color: '#9ca3af',
    },
});

function CatalogPDF({ products, tenantName, logoUrl, origin, showPrices = true }: CatalogPDFProps) {
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

    const calcDiscountedPrice = (price: number, discount: number) => {
        return Math.round(price * (1 - discount / 100));
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
                            <Text style={styles.logoPlaceholder}>SC</Text>
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{tenantName}</Text>
                        <Text style={styles.subtitle}>Catálogo de Productos</Text>
                        <Text style={styles.date}>Generado el {dateStr}</Text>
                    </View>
                </View>

                {/* Product Grid */}
                <View style={styles.grid}>
                    {products.reduce<React.ReactNode[][]>((rows, product, index) => {
                        const hasDiscount = product.discount_percentage !== undefined && product.discount_percentage > 0;
                        const discountedPrice = hasDiscount
                            ? calcDiscountedPrice(product.sale_price, product.discount_percentage!)
                            : product.sale_price;

                        const card = (
                            <View key={product.id} style={styles.card} wrap={false}>
                                <View style={styles.imageContainer}>
                                    {product.image_url ? (
                                        <Image
                                            src={getImageSrc(product.image_url)}
                                            style={styles.productImage}
                                        />
                                    ) : (
                                        <Text style={styles.noImageText}>Sin imagen</Text>
                                    )}
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.productName}>{product.name}</Text>
                                    <Text style={styles.productCode}>{product.code}</Text>

                                    {showPrices ? (
                                        <View style={styles.priceRow}>
                                            {hasDiscount ? (
                                                <>
                                                    <Text style={styles.discountedPrice}>
                                                        ${discountedPrice.toLocaleString('es-CL')}
                                                    </Text>
                                                    <Text style={styles.originalPrice}>
                                                        ${product.sale_price.toLocaleString('es-CL')}
                                                    </Text>
                                                    <View style={styles.discountBadge}>
                                                        <Text style={styles.discountBadgeText}>
                                                            -{product.discount_percentage!}%
                                                        </Text>
                                                    </View>
                                                </>
                                            ) : (
                                                <Text style={styles.price}>
                                                    ${product.sale_price.toLocaleString('es-CL')}
                                                </Text>
                                            )}
                                        </View>
                                    ) : (
                                        <View style={styles.priceRow}>
                                            <Text style={styles.consultPriceText}>Consultar precio</Text>
                                        </View>
                                    )}


                                     <View style={styles.metaRow}>
                                         <View
                                             style={[
                                                 styles.stockDot,
                                                 (product.stock <= 0 || product.availability_status?.toLowerCase() === 'agotado')
                                                     ? styles.stockRed
                                                     : product.stock === 1
                                                     ? styles.stockYellow
                                                     : styles.stockGreen,
                                             ]}
                                         />
                                         {(product.stock <= 0 || product.availability_status?.toLowerCase() === 'agotado') && (
                                             <Text style={styles.stockTextAgotado}>
                                                 Agotado
                                             </Text>
                                         )}
                                         <Text style={styles.category}>
                                             {product.category?.name || 'Sin categoría'}
                                         </Text>
                                     </View>
                                </View>
                            </View>
                        );

                        const rowIndex = Math.floor(index / 3);
                        if (!rows[rowIndex]) {
                            rows[rowIndex] = [];
                        }
                        rows[rowIndex].push(card);
                        return rows;
                    }, []).map((rowCards, rowIndex) => (
                        <View key={rowIndex} style={styles.gridRow}>
                            {rowCards}
                            {rowCards.length < 3 && Array.from({ length: 3 - rowCards.length }).map((_, i) => (
                                <View key={`empty-${i}`} style={{ flex: 1, marginBottom: 12 }} />
                            ))}
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>{tenantName} • Catálogo generado el {dateStr}</Text>
                    <Text style={styles.footerText}>
                        {products.length} producto{products.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

export default CatalogPDF;
