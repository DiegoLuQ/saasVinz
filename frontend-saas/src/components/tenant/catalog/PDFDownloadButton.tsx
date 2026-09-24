"use client";

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
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
    const [isGenerating, setIsGenerating] = useState(false);

    const getAbsoluteUrl = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleDownload = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            const absLogoUrl = getAbsoluteUrl(logoUrl);

            // 1. Convertir imágenes de productos a PNG solo al hacer clic
            const convertedProducts = await Promise.all(
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
                        return { ...base, image_url: null };
                    }
                })
            );

            // 2. Convertir logo
            let logoResult: string | null = null;
            if (absLogoUrl) {
                const proxyLogoUrl = (absLogoUrl.startsWith('data:') || absLogoUrl.startsWith('blob:'))
                    ? absLogoUrl
                    : `/api/image-proxy?url=${encodeURIComponent(absLogoUrl)}`;
                try {
                    logoResult = await webpUrlToPngDataUri(proxyLogoUrl);
                } catch (e: any) {
                    logoResult = absLogoUrl;
                }
            }

            // 3. Generar el documento PDF solo al hacer clic
            const doc = (
                <CatalogPDF
                    products={convertedProducts}
                    tenantName={tenantName}
                    logoUrl={logoResult}
                    origin={origin}
                    showPrices={showPrices}
                />
            ) as any;

            const blob = await pdf(doc).toBlob();

            // 4. Disparar descarga en el navegador
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando PDF de catálogo:', error);
            alert('Hubo un error al generar el PDF. Por favor intenta nuevamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            title="Descargar catálogo en formato PDF"
        >
            {isGenerating ? (
                <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    <span>Generando PDF...</span>
                </>
            ) : (
                <>
                    <Download className="mr-2" size={16} />
                    <span>Descargar PDF</span>
                </>
            )}
        </button>
    );
}
