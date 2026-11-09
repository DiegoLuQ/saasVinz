import { createElement } from 'react';
import type { DiagnosticReport } from '@/lib/diagnostics';

/** react-pdf no lee WebP: se pasa el logo a PNG con un canvas. */
export async function imageAsPng(src: string): Promise<string | null> {
    try {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')?.drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
    } catch {
        return null;
    }
}

/** Genera el PDF del informe en el navegador (react-pdf se carga solo al usarlo). */
export async function buildDiagnosticPdf(d: DiagnosticReport, qr: string | null): Promise<Blob> {
    const [{ pdf }, { default: DiagnosticPDF }, logo] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./DiagnosticPDF'),
        imageAsPng('/logo-vinzer.webp'),
    ]);
    // react-pdf tipa `pdf()` con un elemento <Document>; el componente lo devuelve
    return pdf(createElement(DiagnosticPDF, { d, logo, qr }) as unknown as Parameters<typeof pdf>[0]).toBlob();
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
