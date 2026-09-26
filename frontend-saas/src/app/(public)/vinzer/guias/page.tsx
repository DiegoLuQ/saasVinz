import React from 'react';
import type { Metadata } from 'next';
import { GuiasIndexClient } from '@/components/vinzer/GuiasIndexClient';
import { SITE_URL, siteUrl } from '@/lib/vinzer/site';
import { GUIAS, guiaPath } from '@/lib/vinzer/guias';

const TITLE = 'Guías para Crematorios de Mascotas | Vinzer';
const DESCRIPTION = 'Protocolos y buenas prácticas para crematorios de mascotas: trazabilidad y cadena de custodia, recepción sin papel, formulario online para familias e inventario de urnas.';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
        canonical: siteUrl('/guias'),
    },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: siteUrl('/guias'),
        siteName: 'Vinzer',
        locale: 'es_CL',
        type: 'website',
        images: [{ url: '/images/og-image-vinzer.jpg', width: 1200, height: 630, alt: 'Guías Vinzer para crematorios de mascotas' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: TITLE,
        description: DESCRIPTION,
        images: ['/images/og-image-vinzer.jpg'],
    },
};

export default function GuiasIndexPage() {
    const jsonLdCollection = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Guías para crematorios de mascotas',
        description: DESCRIPTION,
        url: siteUrl('/guias'),
        inLanguage: 'es-CL',
        publisher: { '@type': 'Organization', name: 'Vinzer', url: SITE_URL },
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: GUIAS.map((g, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: siteUrl(guiaPath(g.slug)),
                name: g.title,
            })),
        },
    };

    const jsonLdBreadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl('/') },
            { '@type': 'ListItem', position: 2, name: 'Guías', item: siteUrl('/guias') },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdCollection) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }} />
            <GuiasIndexClient />
        </>
    );
}
