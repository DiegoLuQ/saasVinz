import React from 'react';
import type { Metadata } from 'next';
import { GuiaTrazabilidadClient } from '@/components/vinzer/GuiaTrazabilidadClient';
import { SITE_URL, siteUrl } from '@/lib/vinzer/site';
import { guiaPath } from '@/lib/vinzer/guias';
import { GUIA_TRAZABILIDAD_SLUG, GUIA_TRAZABILIDAD_SEO as SEO, GUIA_TRAZABILIDAD_FAQ } from '@/lib/vinzer/guia-trazabilidad';

const URL_GUIA = siteUrl(guiaPath(GUIA_TRAZABILIDAD_SLUG));
const OG_IMAGE = { url: '/images/og-image-vinzer.jpg', width: 1200, height: 630, alt: 'Seguimiento de cremación de mascotas con Vinzer' };

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: SEO.title,
    description: SEO.description,
    keywords: SEO.keywords,
    alternates: {
        canonical: URL_GUIA,
    },
    openGraph: {
        title: SEO.headline,
        description: SEO.description,
        url: URL_GUIA,
        siteName: 'Vinzer',
        locale: 'es_CL',
        type: 'article',
        publishedTime: SEO.datePublished,
        modifiedTime: SEO.dateModified,
        images: [OG_IMAGE],
    },
    twitter: {
        card: 'summary_large_image',
        title: SEO.title,
        description: SEO.description,
        images: [OG_IMAGE.url],
    },
};

export default function GuiaTrazabilidadPage() {
    const jsonLdArticle = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: SEO.headline,
        description: SEO.description,
        url: URL_GUIA,
        mainEntityOfPage: { '@type': 'WebPage', '@id': URL_GUIA },
        image: siteUrl(OG_IMAGE.url),
        inLanguage: 'es-CL',
        keywords: SEO.keywords.join(', '),
        about: [
            { '@type': 'Thing', name: 'Crematorio de mascotas' },
            { '@type': 'Thing', name: 'Cadena de custodia' },
        ],
        author: { '@type': 'Organization', name: 'Equipo Vinzer', url: SITE_URL },
        publisher: {
            '@type': 'Organization',
            name: 'Vinzer',
            url: SITE_URL,
            logo: { '@type': 'ImageObject', url: siteUrl('/images/logomododark.webp') },
        },
        datePublished: SEO.datePublished,
        dateModified: SEO.dateModified,
    };

    const jsonLdFaq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: GUIA_TRAZABILIDAD_FAQ.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    };

    const jsonLdBreadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl('/') },
            { '@type': 'ListItem', position: 2, name: 'Guías', item: siteUrl('/guias') },
            { '@type': 'ListItem', position: 3, name: 'Trazabilidad y cadena de custodia', item: URL_GUIA },
        ],
    };

    return (
        <>
            {/* Structured Data JSON-LD en Server Component para SEO */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }} />

            <GuiaTrazabilidadClient />
        </>
    );
}
