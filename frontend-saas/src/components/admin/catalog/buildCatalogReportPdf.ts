import { createElement } from 'react';
import { downloadBlob, imageAsPng } from '@/components/diagnostics/buildDiagnosticPdf';
import type {
    PdfFilters, PdfFormFunnel, PdfGlobalReport, PdfTenantDetail, PdfTenantReport,
} from './CatalogReportPDF';

const slug = (v: string) => (v || 'informe').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_');

/** PDF formal de /dashboard/catalogos (global o filtrado por crematorio). react-pdf se carga solo al usarlo. */
export async function downloadGlobalCatalogPdf(data: PdfGlobalReport, filters: PdfFilters) {
    const [{ pdf }, { GlobalCatalogPDF }, logo] = await Promise.all([
        import('@react-pdf/renderer'), import('./CatalogReportPDF'), imageAsPng('/logo-vinzer.webp'),
    ]);
    const el = createElement(GlobalCatalogPDF, { data, filters, logo });
    const blob = await pdf(el as unknown as Parameters<typeof pdf>[0]).toBlob();
    downloadBlob(blob, `kpis-catalogo_${slug(filters.tenantName || 'global')}_${filters.dateFrom}_${filters.dateTo}.pdf`);
}

/** PDF formal del detalle de un crematorio (/dashboard/catalogos/{id}). */
export async function downloadTenantCatalogPdf(
    detail: PdfTenantDetail, report: PdfTenantReport | null, form: PdfFormFunnel | null, filters: PdfFilters,
) {
    const [{ pdf }, { TenantCatalogPDF }, logo] = await Promise.all([
        import('@react-pdf/renderer'), import('./CatalogReportPDF'), imageAsPng('/logo-vinzer.webp'),
    ]);
    const el = createElement(TenantCatalogPDF, { detail, report, form, filters, logo });
    const blob = await pdf(el as unknown as Parameters<typeof pdf>[0]).toBlob();
    downloadBlob(blob, `informe-crematorio_${slug(detail.tenant.name)}_${filters.dateFrom}_${filters.dateTo}.pdf`);
}

