"use client";

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import PlansPDF from './PlansPDF';
import { webpUrlToPngDataUri } from '@/lib/tenant/imageToPngBase64';

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

interface PDFPlansDownloadButtonProps {
    plans: CatalogPlan[];
    tenantName: string;
    logoUrl: string | null;
    filename: string;
    showPrices?: boolean;
}

export default function PDFPlansDownloadButton({ plans, tenantName, logoUrl, filename, showPrices = true }: PDFPlansDownloadButtonProps) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const [isGenerating, setIsGenerating] = useState(false);

    const getAbsoluteUrl = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleDownload = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            const absLogoUrl = getAbsoluteUrl(logoUrl);

            // 1. Convertir imágenes de planes a PNG solo al hacer clic
            const processedPlans = await Promise.all(
                plans.map(async (plan) => {
                    if (!plan.image_url) return plan;
                    const absUrl = getAbsoluteUrl(plan.image_url);
                    if (!absUrl) return plan;

                    const proxyUrl = (absUrl.startsWith('data:') || absUrl.startsWith('blob:'))
                        ? absUrl
                        : `/api/image-proxy?url=${encodeURIComponent(absUrl)}`;

                    try {
                        const png = await webpUrlToPngDataUri(proxyUrl);
                        return { ...plan, image_url: png };
                    } catch (e: any) {
                        return { ...plan, image_url: null };
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
                <PlansPDF
                    plans={processedPlans}
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
            console.error('Error generando PDF de planes:', error);
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
            title="Descargar catálogo de servicios en PDF"
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
