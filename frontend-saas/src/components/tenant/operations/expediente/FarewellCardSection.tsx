"use client";

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Loader2, Heart } from 'lucide-react';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';
import { getImageUrl } from '@/lib/tenant/api';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';

/** Config de plantilla de homenaje (forma libre; la interpreta FarewellPreview). */
type FarewellConfig = { format?: string; elements?: Record<string, unknown>; [key: string]: unknown };

const DEFAULT_CONFIG: FarewellConfig = {
    format: '1:1',
    theme: 'warm',
    styles: { font: 'serif', color: '#1e293b', background: '#FDFBF7' },
    frame: { enabled: true, color: '#d4af37', width: 6, margin: 10 },
    petNameFormatting: { bold: true, fontSize: 38, fontFamily: 'Playfair Display', textAlign: 'center', letterSpacing: 2 },
    subtitleFormatting: { bold: false, italic: true, fontSize: 14, textAlign: 'center', width: 420 },
    textFormatting: { bold: false, italic: true, fontSize: 15, textAlign: 'center', width: 440, lineHeight: 1.6 },
    imageSettings: {
        image2: { shape: 'circle', size: 180, borderColor: '#d4af37', borderWidth: 4, glow: { enabled: true, color: 'rgba(212, 175, 55, 0.5)', size: 24 } },
    },
    backgroundImage: { url: null, opacity: 0 },
};
const DEFAULT_TEXT = 'Gracias por cada instante de ternura y amor incondicional. Tu recuerdo vivirá por siempre en nuestra memoria.';

/** Dimensiones reales de la tarjeta según el formato de la plantilla (mismo cálculo que el formulario público). */
function cardDims(format: string) {
    const h = 550;
    if (format === '9:16') return { width: h * (9 / 16), height: h };
    if (format === '3:4' || format === '4:3') return { width: h * (3 / 4), height: h };
    return { width: h, height: h };
}

interface Props {
    templateConfig: Record<string, unknown> | null | undefined;
    petName?: string | null;
    dedication?: string | null;
    photoUrl?: string | null;
}

/** Tarjeta de homenaje de la orden: vista previa con la plantilla del crematorio y descarga en PNG. */
export default function FarewellCardSection({ templateConfig, petName, dedication, photoUrl }: Props) {
    const exportRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);
    const tenant = useCurrentTenant();

    // Datos del crematorio (logo, nombre, web/redes) igual que el seguimiento
    // público y el formulario: sin ellos la plantilla los dejaba vacíos o con
    // los textos de ejemplo.
    const base: FarewellConfig = (templateConfig as FarewellConfig) || DEFAULT_CONFIG;
    const baseEls = (base.elements || {}) as Record<string, unknown>;
    const socialMedia = tenant?.social_media || {};
    const config: FarewellConfig = {
        ...base,
        elements: {
            ...baseEls,
            petName: petName || 'Tu Angelito',
            subtitle: '',
            farewellText: dedication || DEFAULT_TEXT,
            image2Url: photoUrl ? getImageUrl(photoUrl) : null,
            tenantLogoUrl: tenant?.logo_url ? getImageUrl(tenant.logo_url) : null,
            tenantName: (baseEls.tenantName && String(baseEls.tenantName).trim()) || tenant?.name || '',
            tenantWebsite: (baseEls.tenantWebsite && String(baseEls.tenantWebsite).trim()) || '{sitio_web}',
            tenantSocialMedia: socialMedia,
        },
        tenantSocialMedia: socialMedia,
    };
    const dims = cardDims(config.format || '1:1');
    const scale = 0.5;

    const handleDownload = async () => {
        if (!exportRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(exportRef.current, { useCORS: true, scale: 2, backgroundColor: null, logging: false });
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `homenaje-${(petName || 'mascota').replace(/\s+/g, '-').toLowerCase()}.png`;
            a.click();
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Heart size={16} className="text-amber-400" />
                    <div>
                        <p className="text-xs font-bold text-white">Tarjeta de homenaje</p>
                        <p className="text-[10px] text-muted-foreground">
                            {dedication ? 'Con la dedicatoria de la familia' : 'Sin dedicatoria: se usa un texto predeterminado'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                    {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    PNG
                </button>
            </div>

            {/* Tamaño real fuera de pantalla: html2canvas captura esta versión en alta resolución */}
            <div aria-hidden style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: dims.width, height: dims.height, pointerEvents: 'none' }}>
                <FarewellPreview ref={exportRef} config={config} />
            </div>

            {/* Vista previa escalada */}
            <div className="flex justify-center">
                <div
                    style={{ width: dims.width * scale, height: dims.height * scale }}
                    className="relative rounded-xl overflow-hidden border border-amber-500/20 bg-black/30"
                >
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: dims.width, height: dims.height }} className="absolute inset-0">
                        <FarewellPreview config={config} />
                    </div>
                </div>
            </div>
        </div>
    );
}
