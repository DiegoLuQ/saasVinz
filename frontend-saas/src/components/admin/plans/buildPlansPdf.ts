import { createElement } from 'react';
import { downloadBlob, imageAsPng } from '@/components/diagnostics/buildDiagnosticPdf';
import type { PlanData } from './PlanCard';

/** Descarga el PDF «Planes y características». react-pdf se carga solo al usarlo. */
export async function downloadPlansPdf(plans: PlanData[], annualPct: number | null) {
    const [{ pdf }, { PlansPDF }, logo] = await Promise.all([
        import('@react-pdf/renderer'), import('./PlansPDF'), imageAsPng('/logo-vinzer.webp'),
    ]);
    const now = new Date();
    const generatedAt = now.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const el = createElement(PlansPDF, { plans, logo, annualPct, generatedAt });
    const blob = await pdf(el as unknown as Parameters<typeof pdf>[0]).toBlob();
    downloadBlob(blob, `planes-vinzer_${now.toISOString().slice(0, 10)}.pdf`);
}
