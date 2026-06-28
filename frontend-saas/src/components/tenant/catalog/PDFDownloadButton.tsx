"use client";

import React, { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import CatalogPDF from './CatalogPDF';
import { webpUrlToPngDataUri } from '@/lib/tenant/imageToPngBase64';

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

interface PDFDownloadButtonProps {
    products: CatalogProduct[];
    tenantName: string;
    logoUrl: string | null;
    filename: string;
    showPrices?: boolean;
}

export default function PDFDownloadButton({ products, tenantName, logoUrl, filename, showPrices = true }: PDFDownloadButtonProps) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const [convertedProducts, setConvertedProducts] = useState<CatalogProduct[] | null>(null);
    const [convertedLogoUrl, setConvertedLogoUrl] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(true);

    const getAbsoluteUrl = React.useCallback((url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }, [origin]);

    useEffect(() => {
        let cancelled = false;

        async function convertImages() {
            setIsConverting(true);

            const absLogoUrl = getAbsoluteUrl(logoUrl);

            const results = await Promise.all(
                products.map(async (product) => {
                    const base: CatalogProduct = {
                        id: product.id,
                        name: product.name,
                        code: product.code,
                        sale_price: product.sale_price,
                        cost_price: product.cost_price,
                        stock: product.stock,
                        discount_percentage: product.discount_percentage ?? 0,
                        image_url: product.image_url,
                        category: product.category,
                        availability_status: product.availability_status,
                    };
                    if (!product.image_url) return { ...base, image_url: null };
                    const absUrl = getAbsoluteUrl(product.image_url);
                    if (!absUrl) return { ...base, image_url: null };
                    
                    const proxyUrl = (absUrl.startsWith('data:') || absUrl.startsWith('blob:')) 
                        ? absUrl 
                        : `/api/image-proxy?url=${encodeURIComponent(absUrl)}`;
                    
                    try {
                        const png = await webpUrlToPngDataUri(proxyUrl);
                        return { ...base, image_url: png };
                    } catch (e: any) {
                        // Append error to name for debugging in the PDF
                        return { ...base, image_url: null, name: `${base.name} [ErrImg: ${e.message}]` };
                    }
                })
            );

            let logoResult: string | null = null;
            if (absLogoUrl) {
                const proxyLogoUrl = (absLogoUrl.startsWith('data:') || absLogoUrl.startsWith('blob:')) 
                    ? absLogoUrl 
                    : `/api/image-proxy?url=${encodeURIComponent(absLogoUrl)}`;
                try {
                    logoResult = await webpUrlToPngDataUri(proxyLogoUrl);
                } catch (e: any) {
                    console.error("Logo error", e);
                    logoResult = absLogoUrl;
                }
            }

            if (!cancelled) {
                setConvertedProducts(results);
                setConvertedLogoUrl(logoResult);
                setIsConverting(false);
            }
        }

        convertImages();

        return () => { cancelled = true; };
    }, [products, logoUrl, getAbsoluteUrl]);

    const cacheKey = React.useMemo(() => {
        return `${products.map(p => `${p.id}-${p.stock}-${p.availability_status}`).join(',')}-${showPrices}`;
    }, [products, showPrices]);

    const displayProducts = convertedProducts ?? products;
    const displayLogo = convertedLogoUrl !== null ? convertedLogoUrl : logoUrl;

    if (isConverting) {
        return (
            <button
                disabled
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center shadow-lg shadow-amber-500/20 text-sm opacity-70 cursor-not-allowed"
            >
                <Loader2 className="animate-spin mr-2" size={16} />
                Preparando imágenes...
            </button>
        );
    }

    return (
        <PDFDownloadLink
            key={cacheKey}
            document={
                <CatalogPDF
                    products={displayProducts}
                    tenantName={tenantName}
                    logoUrl={displayLogo}
                    origin={origin}
                    showPrices={showPrices}
                />
            }

            fileName={filename}
        >
            {({ loading }) => (
                <button
                    className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95 transition-all text-sm disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="animate-spin mr-2" size={16} />
                    ) : (
                        <Download className="mr-2" size={16} />
                    )}
                    {loading ? 'Generando...' : 'Descargar PDF'}
                </button>
            )}
        </PDFDownloadLink>
    );
}
