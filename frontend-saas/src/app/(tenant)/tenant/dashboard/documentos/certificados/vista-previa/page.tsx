"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/tenant/api';
import { Loader2, ArrowLeft, Printer, AlertCircle } from 'lucide-react';

export default function CertificatePreviewPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const handlePrint = () => {
        const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.print();
        }
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
                        <p className="text-xs text-slate-500">Formato de impresión profesional</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <Printer size={18} />
                        Probar Impresión
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 p-4 md:p-8 bg-slate-900 overflow-auto flex justify-center">
                <div className="bg-white shadow-2xl rounded-sm overflow-hidden w-full max-w-[850px] min-h-[1100px] h-fit">
                    <iframe
                        id="preview-frame"
                        srcDoc={htmlContent || ''}
                        className="w-full h-full border-none pointer-events-auto"
                        style={{ minHeight: '1100px' }}
                        title="Vista previa del certificado"
                    />
                </div>
            </div>

            {/* Hint */}
            <div className="p-4 text-center bg-slate-950/20">
                <p className="text-xs text-slate-500">
                    * Esta es una previsualización con datos de prueba para verificar márgenes, colores y logos.
                </p>
            </div>
        </div>
    );
}
