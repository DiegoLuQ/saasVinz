"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/tenant/api';
import { Loader2, ArrowLeft, Download, AlertCircle } from 'lucide-react';
import { extractCertSpec, renderCertSpecToCanvas } from '@/lib/certImageDraw';

export default function CertificatePreviewPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [frameHeight, setFrameHeight] = useState(1100);

    useEffect(() => {
        const fetchPreview = async () => {
            if (!id) {
                setError("ID de plantilla no proporcionado");
                setLoading(false);
                return;
            }

            try {
                // Seleccionar endpoint basado en el tipo
                const endpoint = type === 'farewell'
                    ? `/api/internal/farewell-templates/${id}/preview`
                    : `/api/internal/ops-records/templates/${id}/preview`;

                const data = await apiRequest(endpoint);

                if (data && data.html_content) {
                    setHtmlContent(data.html_content);
                } else {
                    setError("No se pudo generar el contenido del diseño");
                }
            } catch (err: any) {
                setError("Ocurrió un error al cargar el diseño: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [id]);

    // PDF con el diseño tal cual (sin encabezado/pie ni márgenes del navegador que
    // agregaba "Imprimir"). Certificados con imagen: se dibuja desde el spec embebido,
    // el mismo renderer de Documentos y del Repositorio. Otros diseños: captura del
    // contenido de la vista previa.
    const handleDownloadPdf = async () => {
        if (!htmlContent) return;
        setDownloading(true);
        try {
            let canvas: HTMLCanvasElement;
            const spec = extractCertSpec(htmlContent);
            if (spec) {
                canvas = await renderCertSpecToCanvas(spec, 816, 3);
            } else {
                const iframe = document.getElementById('preview-frame') as HTMLIFrameElement | null;
                const doc = iframe?.contentDocument;
                if (!doc?.body) throw new Error('La vista previa aún no está lista');
                const { default: html2canvas } = await import('html2canvas');
                const root = (doc.body.firstElementChild as HTMLElement) || doc.body;
                canvas = await html2canvas(root, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    windowWidth: doc.documentElement.scrollWidth,
                    windowHeight: doc.documentElement.scrollHeight,
                });
            }
            const { default: JsPDF } = await import('jspdf');
            const w = canvas.width, h = canvas.height;
            const pdf = new JsPDF({ unit: 'px', format: [w, h], orientation: w >= h ? 'landscape' : 'portrait', hotfixes: ['px_scaling'] });
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            pdf.save(`diseno_${type === 'farewell' ? 'homenaje' : 'certificado'}_${id}.pdf`);
        } catch (err: unknown) {
            setError('No se pudo generar el PDF: ' + (err instanceof Error ? err.message : ''));
        } finally {
            setDownloading(false);
        }
    };

    // La vista previa se ajusta al alto real del diseño (antes era fija: 1100 px)
    const fitFrame = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
        const doc = e.currentTarget.contentDocument;
        // Alto real del contenido (el documento mide al menos el alto visible del iframe)
        const root = (doc?.body?.firstElementChild as HTMLElement | null) || doc?.body;
        const hgt = root ? Math.ceil(root.getBoundingClientRect().bottom + (doc?.defaultView?.scrollY || 0)) : 0;
        if (hgt) setFrameHeight(Math.max(300, hgt));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-emerald-400 font-medium animate-pulse">Generando vista previa del diseño...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2rem] max-w-md w-full">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                    <p className="text-red-300/70 mb-6">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                    >
                        <ArrowLeft size={18} />
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Toolbar */}
            <div className="bg-slate-950/50 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-sm font-bold text-white uppercase tracking-widest">Vista Previa de Diseño</h1>
                        <p className="text-xs text-slate-500">Revisa el diseño y descárgalo en PDF</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                    >
                        {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {downloading ? 'Generando PDF…' : 'Descargar PDF'}
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 p-4 md:p-8 bg-slate-900 overflow-auto flex justify-center">
                <div className="bg-white shadow-2xl rounded-sm overflow-hidden w-full max-w-[850px] h-fit">
                    <iframe
                        id="preview-frame"
                        srcDoc={htmlContent || ''}
                        onLoad={fitFrame}
                        className="w-full border-none pointer-events-auto block"
                        style={{ height: `${frameHeight}px` }}
                        title="Vista previa del certificado"
                    />
                </div>
            </div>

            {/* Hint */}
            <div className="p-4 text-center bg-slate-950/20">
                <p className="text-xs text-slate-500">
                    * Previsualización con datos de prueba. &quot;Descargar PDF&quot; genera el archivo con el diseño, márgenes y elementos tal como están configurados.
                </p>
            </div>
        </div>
    );
}
