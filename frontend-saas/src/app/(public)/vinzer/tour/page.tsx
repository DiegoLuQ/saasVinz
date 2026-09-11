import React from 'react';
import type { Metadata } from 'next';
import VinzerTourClient from '@/components/vinzer/VinzerTourClient';

export const metadata: Metadata = {
    metadataBase: new URL('https://vinzer.app'),
    title: "Tour del Software y Capturas de Módulos | Vinzer Crematorios",
    description: "Recorrido visual completo por el software Vinzer para crematorios y funerarias de mascotas. Conoce la recepción con código único, bitácora de cremación con fotos, portal familiar y certificados digitales con QR.",
    keywords: [
        'tour software crematorio de mascotas',
        'capturas de pantalla software funerario',
        'modulo de recepcion crematorio',
        'bitacora de incineracion digital',
        'portal seguimiento familias cremacion',
        'certificados cremacion codigo QR',
        'demo vinzer chile',
        'software de gestion de cementerios de mascotas'
    ],
    robots: "index, follow",
    alternates: {
        canonical: 'https://vinzer.app/tour',
    },
    openGraph: {
        title: "Tour de la Plataforma y Capturas de Módulos | Vinzer",
        description: "Explora la arquitectura y pantallas reales de Vinzer: trazabilidad total, registro de evidencias fotográficas, seguimiento en vivo para familias y certificados automáticos.",
        url: 'https://vinzer.app/tour',
        siteName: 'Vinzer',
        locale: 'es_CL',
        type: 'website',
        images: [
            {
                url: '/images/og-image-vinzer.jpg',
                width: 1200,
                height: 630,
                alt: 'Captura general de la plataforma Vinzer para crematorios de mascotas',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: "Tour de la Plataforma y Capturas de Módulos | Vinzer",
        description: "Explora cada módulo de Vinzer: recepción, bitácora de horno con fotos, portal público de seguimiento y certificados con QR.",
        images: ['/images/og-image-vinzer.jpg'],
    },
};

export default function VinzerTourPage() {
    // JSON-LD Structured Data for high-rank Google indexing
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    {
                        '@type': 'ListItem',
                        'position': 1,
                        'name': 'Inicio',
                        'item': 'https://vinzer.app'
                    },
                    {
                        '@type': 'ListItem',
                        'position': 2,
                        'name': 'Tour del Software',
                        'item': 'https://vinzer.app/tour'
                    }
                ]
            },
            {
                '@type': 'SoftwareApplication',
                'name': 'Vinzer - Software para Crematorios de Mascotas',
                'applicationCategory': 'BusinessApplication',
                'operatingSystem': 'Web, Cloud, Responsive Mobile & Desktop',
                'description': 'Plataforma SaaS para la gestión operativa, trazabilidad con código único, bitácora fotográfica de incineración y portal para familias en crematorios de mascotas.',
                'offers': {
                    '@type': 'Offer',
                    'price': '0',
                    'priceCurrency': 'CLP',
                    'availability': 'https://schema.org/InStock',
                    'seller': {
                        '@type': 'Organization',
                        'name': 'Vinzer'
                    }
                }
            },
            {
                '@type': 'VideoObject',
                'name': 'Demostración en Video del Sistema Vinzer',
                'description': 'Paso a paso de cómo opera el sistema Vinzer: desde la admisión en recepción hasta la emisión del certificado final de cremación con código QR.',
                'thumbnailUrl': 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                'uploadDate': '2026-01-15T08:00:00+00:00',
                'embedUrl': 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <VinzerTourClient />
        </>
    );
}
