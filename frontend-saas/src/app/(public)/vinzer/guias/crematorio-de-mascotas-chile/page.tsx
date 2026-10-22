import React from 'react';
import type { Metadata } from 'next';
import { GuiaCrematorioChileClient } from '@/components/vinzer/GuiaCrematorioChileClient';
import { SITE_URL, siteUrl } from '@/lib/vinzer/site';
import { guiaPath } from '@/lib/vinzer/guias';
import { GUIA_CREMATORIO_CHILE_SLUG, GUIA_CREMATORIO_CHILE_SEO as SEO, GUIA_CREMATORIO_CHILE_FAQ } from '@/lib/vinzer/guia-crematorio-chile';

const URL_GUIA = siteUrl(guiaPath(GUIA_CREMATORIO_CHILE_SLUG));
const OG_IMAGE = { url: '/images/og-image-vinzer.jpg', width: 1200, height: 630, alt: 'Guía sobre crematorios de mascotas en Chile' };

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

export default function GuiaCrematorioChilePage() {
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
            { '@type': 'Thing', name: 'Cremación de mascotas en Chile' },
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
        mainEntity: GUIA_CREMATORIO_CHILE_FAQ.map((item) => ({
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
            { '@type': 'ListItem', position: 3, name: 'Crematorio de mascotas en Chile', item: URL_GUIA },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }} />
            <GuiaCrematorioChileClient />
        </>
    );
}
