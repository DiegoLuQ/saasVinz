"use client";

import React, { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
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
    const [convertedLogoUrl, setConvertedLogoUrl] = useState<string | null>(null);
    const [convertedPlans, setConvertedPlans] = useState<CatalogPlan[]>([]);
    const [isConverting, setIsConverting] = useState(true);

    const getAbsoluteUrl = React.useCallback((url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function convertImages() {
            setIsConverting(true);

            // 1. Convertir Logo
            const absLogoUrl = getAbsoluteUrl(logoUrl);
            let logoResult: string | null = null;

            if (absLogoUrl) {
                const proxyLogoUrl = (absLogoUrl.startsWith('data:') || absLogoUrl.startsWith('blob:')) 
                    ? absLogoUrl 
                    : `/api/image-proxy?url=${encodeURIComponent(absLogoUrl)}`;
                try {
                    logoResult = await webpUrlToPngDataUri(proxyLogoUrl);
                } catch (e: any) {
                    console.error("Logo conversion error", e);
                    logoResult = absLogoUrl;
                }
            }

            // 2. Convertir imágenes de los planes
            const processedPlans = await Promise.all(
                plans.map(async (plan) => {
                    if (!plan.image_url) return plan;
                    const absPlanImgUrl = getAbsoluteUrl(plan.image_url);
                    if (!absPlanImgUrl) return plan;

                    const proxyPlanImgUrl = (absPlanImgUrl.startsWith('data:') || absPlanImgUrl.startsWith('blob:'))
                        ? absPlanImgUrl
                        : `/api/image-proxy?url=${encodeURIComponent(absPlanImgUrl)}`;
                    try {
                        const planImgResult = await webpUrlToPngDataUri(proxyPlanImgUrl);
                        return { ...plan, image_url: planImgResult };
                    } catch (e: any) {
                        console.error(`Error converting image for plan ${plan.name}`, e);
                        return plan;
                    }
                })
            );

            if (!cancelled) {
                setConvertedLogoUrl(logoResult);
                setConvertedPlans(processedPlans);
                setIsConverting(false);
            }
        }

        convertImages();

        return () => { cancelled = true; };
    }, [logoUrl, plans, getAbsoluteUrl]);

    const cacheKey = React.useMemo(() => {
        return `${plans.map(p => `${p.id}-${p.is_active}`).join(',')}-${showPrices}`;
    }, [plans, showPrices]);

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
                <PlansPDF
                    plans={convertedPlans}
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
