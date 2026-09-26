"use client";

import React, { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, X } from 'lucide-react';

interface Props {
    url: string;
    tenantName: string;
    onClose: () => void;
}

/**
 * QR del enlace de derivación, para imprimir y dejar en la recepción de la
 * clínica. Se genera en el navegador (sin servicios externos).
 */
export default function VetLinkQrModal({ url, tenantName, onClose }: Props) {
    const canvasWrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleDownload = () => {
        const canvas = canvasWrapRef.current?.querySelector('canvas');
        if (!canvas) return;
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `qr-derivacion-${tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
        a.click();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vet-qr-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-[2rem] border border-[var(--card-border-color)] bg-[var(--card-color)] p-6 space-y-5 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 text-left">
                    <div>
                        <h3 id="vet-qr-title" className="font-black text-lg tracking-tight">Código QR de derivación</h3>
                        <p className="text-xs text-[var(--muted-foreground)]">{tenantName}</p>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted-foreground)]">
                        <X size={18} />
                    </button>
                </div>

                {/* Fondo blanco siempre: el QR debe leerse bien impreso y en pantalla */}
                <div ref={canvasWrapRef} className="inline-block rounded-2xl bg-white p-4">
                    <QRCodeCanvas value={url} size={240} level="M" marginSize={1} />
                </div>

                <p className="text-xs text-[var(--muted-foreground)]">
                    Imprímelo y déjalo en la recepción: al escanearlo, la familia llega al formulario del crematorio con tu convenio aplicado.
                </p>

                <button
                    onClick={handleDownload}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 text-[var(--primary-foreground)] px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                    <Download size={15} /> Descargar PNG
                </button>
            </div>
        </div>
    );
}
