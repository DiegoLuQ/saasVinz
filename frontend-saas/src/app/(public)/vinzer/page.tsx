import React from 'react';
import type { Metadata } from 'next';
import VinzerLandingClient from '@/components/vinzer/VinzerLandingClient';
import { fetchPublicPlans } from '@/lib/api/plans';
import { VINZER_FAQS } from '@/lib/vinzer-faqs';

// Server-Side Metadata Generation for the main Vinzer landing page
export async function generateMetadata(): Promise<Metadata> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/public/landing-config`, {
            next: { tags: ['landing-config'] },
        });

        if (!response.ok) throw new Error('Config fetch failed');

        const data = await response.json();
        const seo = data.config?.seo || {};

        return {
            metadataBase: new URL('https://vinzer.app'),
            title: (seo.title && seo.title !== 'App - Crematorio de Mascotas') ? seo.title : "Vinzer | Software para crematorios de mascotas en Chile",
            description: (seo.description && seo.description !== 'Gestión integral para crematorios') ? seo.description : "Software para crematorios de mascotas. Gestiona servicios, trazabilidad, evidencias, certificados y seguimiento familiar con Vinzer.",
            keywords: [
                'software para crematorios de mascotas',
                'software para crematorios de mascotas en Chile',
                'sistema para crematorios de mascotas',
                'software crematorio mascotas',
                'gestión crematorio mascotas',
                'trazabilidad cremación mascotas',
                'seguimiento cremación mascota',
                'certificado cremación mascota',
            ],
            robots: seo.robots || "index, follow",
            openGraph: {
                title: seo.ogTitle || "Vinzer | Software para crematorios de mascotas en Chile",
                description: seo.ogDescription || "Software para crematorios de mascotas. Gestiona servicios, trazabilidad, evidencias, certificados y seguimiento familiar con Vinzer.",
                images: seo.ogImage
                    ? [{ url: seo.ogImage }]
                    : [{ url: '/images/og-image-vinzer.jpg', width: 1200, height: 630, alt: 'Panel de gestión de Vinzer' }],
                url: 'https://vinzer.app',
                siteName: 'Vinzer',
                locale: 'es_CL',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: seo.ogTitle || "Vinzer | Software para crematorios de mascotas en Chile",
                description: seo.ogDescription || "Software para crematorios de mascotas. Gestiona servicios, trazabilidad, evidencias, certificados y seguimiento familiar con Vinzer.",
                images: seo.ogImage ? [seo.ogImage] : ['/images/og-image-vinzer.jpg'],
            },
            alternates: {
                canonical: seo.canonical || 'https://vinzer.app',
            },
        };
    } catch (error) {
        console.error('SEO metadata fetch error on root domain:', error);
        return {
            metadataBase: new URL('https://vinzer.app'),
            title: "Vinzer | Software para crematorios de mascotas en Chile",
            description: "Software para crematorios de mascotas. Gestiona servicios, trazabilidad, evidencias, certificados y seguimiento familiar con Vinzer.",
        };
    }
}

export default async function VinzerLandingPage() {
    let config = null;

    // Los planes se leen en el servidor para que los precios queden en el HTML
    // (SEO) y salgan de la misma tabla que aplica los topes en el backend.
    const plans = await fetchPublicPlans();

    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/public/landing-config`, {
            next: { tags: ['landing-config'] },
        });

        if (response.ok) {
            const data = await response.json();
            config = data.config;
        }
    } catch (error) {
        console.error('Error fetching landing config on root domain page:', error);
    }

    return (
        <>
            {/* Structured Schema JSON-LD can be here */}
            <VinzerLandingPageSchema />
            <VinzerLandingClient initialConfig={config} initialPlans={plans} />
        </>
    );
}

function VinzerLandingPageSchema() {
    // Definición de Esquema JSON-LD para SoftwareApplication
    const softwareSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'Vinzer',
        'operatingSystem': 'All',
        'applicationCategory': 'BusinessApplication',
        'description': 'Plataforma SaaS multi-tenant para la gestión de crematorios de mascotas. Código de verificación único por servicio, evidencia fotográfica por fase, seguimiento público en tiempo real para las familias y certificados digitales verificables.',
        'offers': {
            '@type': 'Offer',
            'price': '29900',
            'priceCurrency': 'CLP',
            'category': 'SaaS'
        },
        'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.9',
            'reviewCount': '12'
        }
    };

    // Definición de Esquema JSON-LD para FAQPage (Rich Snippets).
    // Se genera desde VINZER_FAQS, la misma fuente que alimenta el acordeón:
    // duplicar el texto aquí hacía que el schema y la página se desincronizaran.
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': VINZER_FAQS.map((faq) => ({
            '@type': 'Question',
            'name': faq.q,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': faq.a,
            },
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
        </>
    );
}
