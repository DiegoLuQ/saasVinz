import type { Metadata } from 'next';
import DiagnosticoClient from '@/components/vinzer/diagnostico/DiagnosticoClient';
import { siteUrl } from '@/lib/vinzer/site';
import { DIAG_FAQS } from '@/lib/vinzer/diagnosticoContent';

const TITLE = 'Diagnóstico gratuito para crematorios de mascotas | Vinzer';
const DESCRIPTION = 'Descubre qué tan optimizado está tu crematorio de mascotas: gestión, trazabilidad, certificados, Google y redes. Elige 10, 15 o 20 preguntas y recibe tu puntaje e informe PDF gratis.';

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: DIAG_FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: siteUrl('/diagnostico') },
    openGraph: {
        title: '¿Qué tan optimizado está tu crematorio de mascotas?',
        description: DESCRIPTION,
        url: siteUrl('/diagnostico'),
        images: [{ url: '/images/og-image-vinzer.jpg', width: 1200, height: 630 }],
        type: 'website',
        locale: 'es_CL',
    },
};

export default function DiagnosticoPage() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
            <DiagnosticoClient />
        </>
    );
}
