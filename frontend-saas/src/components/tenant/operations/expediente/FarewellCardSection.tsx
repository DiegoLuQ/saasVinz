"use client";

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Loader2, Heart } from 'lucide-react';
import FarewellPreview from '@/app/(tenant)/tenant/dashboard/documentos/disenos/components/FarewellPreview';
import { buildFarewellConfig, farewellCardDims } from '@/lib/tenant/farewellCard';
import { useCurrentTenant } from '@/hooks/useSessionBootstrap';

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
    const config = buildFarewellConfig(templateConfig, { petName, dedication, photoUrl }, tenant);
    const dims = farewellCardDims(config.format || '1:1');
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
