import type { Metadata } from 'next';
import DiagnosticReportClient from '@/components/vinzer/diagnostico/DiagnosticReportClient';

// Enlace privado (llega por correo): no se indexa.
export const metadata: Metadata = {
    title: 'Tu Diagnóstico 360° | Vinzer',
    robots: { index: false, follow: false },
};

export default async function DiagnosticReportPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <DiagnosticReportClient token={token} />;
}
