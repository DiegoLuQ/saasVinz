"use client";

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { sortPlansForCatalog } from '@/lib/tenant/planOrder';
import PlansPDF, { type PDFPlan, type PDFTenantContact, type PDFWeightTier } from './PlansPDF';
import { webpUrlToPngDataUri } from '@/lib/tenant/imageToPngBase64';
import { apiRequest } from '@/lib/tenant/api';

interface PDFPlansDownloadButtonProps {
    plans: PDFPlan[];
    tenantName: string;
    logoUrl: string | null;
    filename: string;
    showPrices?: boolean;
    showImages?: boolean;
    contact?: PDFTenantContact;
}

interface WeightTable {
    mode?: string;
    plans?: { plan_id: number; prices?: Record<string, number> }[];
}

export default function PDFPlansDownloadButton({ plans, tenantName, logoUrl, filename, showPrices = true, showImages = true, contact }: PDFPlansDownloadButtonProps) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const [isGenerating, setIsGenerating] = useState(false);

    const getAbsoluteUrl = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // react-pdf no lee WebP: se convierte a PNG pasando por el proxy de imágenes.
    const toPng = async (url?: string | null): Promise<string | null> => {
        const abs = getAbsoluteUrl(url);
        if (!abs) return null;
        const src = (abs.startsWith('data:') || abs.startsWith('blob:')) ? abs : `/api/image-proxy?url=${encodeURIComponent(abs)}`;
        try {
            return await webpUrlToPngDataUri(src);
        } catch {
            return null;
        }
    };

    const handleDownload = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            // 1. Rangos de peso y precios por plan (si fallan, el PDF sale sin la tabla de peso)
            const [tiers, weightTable] = await Promise.all([
                showPrices ? (apiRequest('/api/internal/maintenance/weight-pricing') as Promise<PDFWeightTier[]>).catch(() => []) : Promise.resolve([]),
                showPrices ? (apiRequest('/api/internal/maintenance/plan-weight-prices') as Promise<WeightTable>).catch(() => null) : Promise.resolve(null),
            ]);
            const planWeightPrices = Object.fromEntries(
                (weightTable?.plans || []).map(p => [p.plan_id, p.prices || {}])
            );

            // 2. Planes en el orden del catálogo, con su imagen en PNG
            const ordered = sortPlansForCatalog(plans);
            const processedPlans = await Promise.all(
                ordered.map(async (plan) => (
                    showImages && plan.image_url ? { ...plan, image_url: await toPng(plan.image_url) } : { ...plan, image_url: null }
                ))
            );
            const logoResult = (await toPng(logoUrl)) ?? getAbsoluteUrl(logoUrl);

            // 3. Documento: una hoja por plan
            const doc = (
                <PlansPDF
                    plans={processedPlans}
                    tenantName={tenantName}
                    logoUrl={logoResult}
                    origin={origin}
                    showPrices={showPrices}
                    showImages={showImages}
                    tiers={Array.isArray(tiers) ? tiers : []}
                    weightMode={weightTable?.mode === 'table' ? 'table' : 'surcharge'}
                    planWeightPrices={planWeightPrices}
                    contact={contact}
                />
            );

            const blob = await pdf(doc).toBlob();

            // 4. Descarga
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
            disabled={isGenerating || plans.length === 0}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            title="Descargar el catálogo de planes en PDF (una hoja por plan)"
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
