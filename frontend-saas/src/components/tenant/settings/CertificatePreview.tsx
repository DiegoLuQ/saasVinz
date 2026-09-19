"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Eye, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';

interface PreviewResponse {
    html_content: string | null;
    template_id: number | null;
    template_name: string;
    is_global: boolean;
    source: string;
    source_label: string;
}

interface CertificatePreviewProps {
    /** null = la predeterminada que resuelve el backend (igual que al emitir) */
    templateId: number | null;
    company: { name: string; rut: string; legal_rep_name: string; legal_rep_rut: string };
}

/** Ancho lógico al que se renderiza el certificado antes de escalarlo al contenedor */
const RENDER_WIDTH = 1100;

/**
 * Vista previa real del certificado: la plantilla que se usaría al emitir,
 * renderizada por el backend con una mascota de ejemplo y los datos de la
 * empresa del formulario (aunque aún no estén guardados).
 */
export function CertificatePreview({ templateId, company }: CertificatePreviewProps) {
    const [data, setData] = useState<PreviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(0.5);
    const [contentHeight, setContentHeight] = useState(800);
    const containerRef = useRef<HTMLDivElement>(null);

    // Re-render con debounce al cambiar plantilla o datos de la empresa
    useEffect(() => {
        const t = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (templateId) params.set('template_id', String(templateId));
                Object.entries(company).forEach(([k, v]) => { if (v) params.set(k, v); });
                setData(await apiRequest(`/api/internal/ops-records/templates/preview?${params.toString()}`));
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'No se pudo generar la vista previa');
            } finally {
                setLoading(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [templateId, company.name, company.rut, company.legal_rep_name, company.legal_rep_rut]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escala el certificado al ancho disponible
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setScale(Math.min(1, el.clientWidth / RENDER_WIDTH));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const html = data?.html_content || '';
    const missingCompanyData =
        !!html && ((company.rut && !html.includes(company.rut)) || (company.legal_rep_name && !html.includes(company.legal_rep_name)));

    return (
        <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
                <Eye className="text-primary" size={20} />
                <h4 className="text-lg font-bold">Vista Previa</h4>
                <span className="text-[10px] text-muted-foreground">Así se verá el certificado al emitirlo</span>
            </div>

            {data && (
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">
                        {data.is_global ? '🌐 ' : ''}{data.template_name}
                    </span>
                    <span className="text-muted-foreground">{data.source_label}</span>
                    {data.template_id && (
                        <a
                            href={`/dashboard/documentos/certificados/vista-previa?id=${data.template_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 text-primary font-bold hover:underline"
                        >
                            Abrir en tamaño real <ExternalLink size={12} />
                        </a>
                    )}
                </div>
            )}

            <div
                ref={containerRef}
                className="relative rounded-2xl border border-foreground/10 bg-white overflow-hidden"
                style={{ height: html ? contentHeight * scale : 320 }}
            >
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                        <Loader2 className="animate-spin text-primary" size={28} />
                    </div>
                )}
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-red-500 p-6 text-center">
                        <AlertCircle size={24} /> {error}
                    </div>
                ) : html ? (
                    <iframe
                        title="Vista previa del certificado"
                        srcDoc={html}
                        sandbox="allow-same-origin"
                        scrolling="no"
                        onLoad={e => {
                            const frame = e.currentTarget;
                            // Se mide al cargar y otra vez cuando terminan fuentes/imágenes
                            const measure = () => {
                                const doc = frame.contentDocument;
                                if (doc) setContentHeight(Math.max(doc.documentElement.scrollHeight, 400));
                            };
                            measure();
                            setTimeout(measure, 800);
                        }}
                        className="border-0 origin-top-left pointer-events-none overflow-hidden"
                        style={{ width: RENDER_WIDTH, height: contentHeight, transform: `scale(${scale})` }}
                    />
                ) : null}
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 ml-1">
                Mascota y propietario son datos de ejemplo. Los cambios de empresa se ven aquí al instante, pero se aplican al guardar.
                {missingCompanyData && ' Esta plantilla no imprime el RUT o el representante legal; si los necesitas, elige una plantilla que los incluya o ajústala en el diseñador.'}
            </p>
        </div>
    );
}
