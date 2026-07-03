import React from 'react';
import type { Metadata } from 'next';
import VincerLandingClient from '@/components/vincer/VincerLandingClient';

// Server-Side Metadata Generation for the main Vincer landing page
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
            metadataBase: new URL('https://vincer.app'),
            title: seo.title || "Software para Crematorios de Mascotas y Funerarias | Vincer",
            description: seo.description || "Optimiza la gestión de tu crematorio de mascotas con Vincer. Controla la trazabilidad QR, evidencias fotográficas y clientes en un solo sistema. Pruébalo gratis.",
            keywords: seo.keywords || [
                'software para crematorios de mascotas',
                'gestión funeraria mascotas',
                'trazabilidad qr cremaciones',
                'vincer software chile',
                'sistema de gestion de cementerios de mascotas',
            ],
            robots: seo.robots || "index, follow",
            openGraph: {
                title: seo.ogTitle || "Software de Gestión y Trazabilidad para Crematorios de Mascotas | Vincer",
                description: seo.ogDescription || "Vincer te ayuda a profesionalizar tu crematorio o cementerio de mascotas con tecnología QR e informes transparentes.",
                images: seo.ogImage
                    ? [{ url: seo.ogImage }]
                    : [{ url: '/images/og-image-vincer.jpg', width: 1200, height: 630, alt: 'Panel de gestión de Vincer' }],
                url: 'https://vincer.app',
                siteName: 'Vincer',
                locale: 'es_CL',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: seo.ogTitle || "Software de Gestión y Trazabilidad para Crematorios de Mascotas | Vincer",
                description: seo.ogDescription || "Vincer te ayuda a profesionalizar tu crematorio o cementerio de mascotas con tecnología QR e informes transparentes.",
                images: seo.ogImage ? [seo.ogImage] : ['/images/og-image-vincer.jpg'],
            },
            alternates: {
                canonical: seo.canonical || 'https://vincer.app',
            },
        };
    } catch (error) {
        console.error('SEO metadata fetch error on root domain:', error);
        return {
            metadataBase: new URL('https://vincer.app'),
            title: "Software para Crematorios de Mascotas y Funerarias | Vincer",
            description: "Optimiza la gestión de tu crematorio de mascotas con Vincer. Controla la trazabilidad QR, evidencias fotográficas y clientes en un solo sistema. Pruébalo gratis.",
        };
    }
}

export default async function VincerLandingPage() {
    let config = null;

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
            <VincerLandingPageSchema />
            <VincerLandingClient initialConfig={config} />
        </>
    );
}

function VincerLandingPageSchema() {
    // Definición de Esquema JSON-LD para SoftwareApplication
    const softwareSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'Vincer',
        'operatingSystem': 'All',
        'applicationCategory': 'BusinessApplication',
        'description': 'Plataforma SaaS multi-tenant para la gestión de crematorios de mascotas y funerarias. Trazabilidad QR, plan de tracking en tiempo real para familias y memoriales digitales interactivos.',
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

    // Definición de Esquema JSON-LD para FAQPage (Rich Snippets)
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': '¿Cómo garantiza Vincer la trazabilidad del servicio?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Cada servicio genera un código de verificación único de 10 caracteres más un token de tracking público. El flujo de trabajo es configurable por crematorio y cada fase requiere evidencia fotográfica, notas y firma del operador. El sistema registra usuario, hora y cambios en cada acción crítica, dejando un historial de auditoría completo.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Qué es el Plan de Tracking público para la familia?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Es un enlace único por servicio que la familia abre sin iniciar sesión. Muestra una línea de tiempo con cada fase completada, foto de evidencia, descripción y hora exacta. La familia acompaña el proceso en tiempo real, reduciendo las llamadas de seguimiento al crematorio.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Cómo funcionan los certificados de cremación?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Vincer genera certificados PDF automáticos con datos de la mascota, dueño, tipo de servicio, firma digital, marca de agua del crematorio y numeración secuencial. Las plantillas son editables en secciones, colores, orden y tipografías. Disponibles a partir del plan PRO.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Cómo son los memoriales digitales?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Cada servicio puede generar un memorial público interactivo, temas configurables (fondos, partículas, colores), galería de imágenes, dedicatorias y velas virtuales. Las dedicatorias requieren aprobación del crematorio antes de publicarse y los memoriales privados pueden protegerse con un PIN de 6 dígitos.'
                }
            }
        ]
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
