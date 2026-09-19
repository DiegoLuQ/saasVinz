import React from 'react';
import type { Metadata } from 'next';
import { GuiaTrazabilidadClient } from '@/components/vinzer/GuiaTrazabilidadClient';

export const metadata: Metadata = {
    title: '¿Cómo Garantizar la Trazabilidad y Cadena de Custodia en un Crematorio de Mascotas? | Vinzer',
    description: 'Guía B2B para directores de crematorios: protocolo de trazabilidad con código QR, registro fotográfico, control de hornos y emisión de certificados inviolables.',
    keywords: [
        'trazabilidad crematorio mascotas',
        'cadena de custodia crematorio',
        'software crematorio mascotas chile',
        'codigo qr cenizas mascotas',
        'certificado cremacion digital',
        'protocolo cremacion mascotas',
        'gestion crematorio mascotas'
    ],
    alternates: {
        canonical: 'https://vinzer.app/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas',
    },
    openGraph: {
        title: 'Trazabilidad y Cadena de Custodia en Crematorios de Mascotas | Vinzer',
        description: 'Elimina el error humano y entrega tranquilidad absoluta a las familias con trazabilidad digital inviolable.',
        url: 'https://vinzer.app/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas',
        siteName: 'Vinzer',
        locale: 'es_CL',
        type: 'article',
        images: [
            {
                url: '/images/MockupVinzer_comprimido.webp',
                width: 800,
                height: 1200,
                alt: 'Portal de trazabilidad y custodia Vinzer',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Trazabilidad y Cadena de Custodia en Crematorios de Mascotas | Vinzer',
        description: 'Protocolo paso a paso para directores de crematorios y clínicas veterinarias.',
        images: ['/images/MockupVinzer_comprimido.webp'],
    }
};

const FAQ_ENTITIES = [
    {
        question: '¿Cómo demuestro a una veterinaria aliada que el proceso es 100% individual?',
        answer: 'Vinzer genera una bitácora temporal inmutable con marca de tiempo (timestamp) en cada hito. Cada mascota recibe un token y precinto QR inviolable. El operador debe escanear el QR antes de abrir el horno y subir la evidencia fotográfica del ingreso individual. La clínica veterinaria puede consultar este historial desde su propio portal de convenios sin revelar datos de otros clientes.',
    },
    {
        question: '¿Qué respaldo legal y técnico entrega el sistema frente a reclamos o sospechas?',
        answer: 'El certificado de cremación emitido por Vinzer incluye un código de verificación criptográfica (hash) y un código QR de consulta pública permanente. Cualquier tutor o perito puede escanear el certificado y comprobar en el servidor la fecha, hora exacta de inicio/fin del ciclo de cremación, operario responsable y fotografía de custodia, eliminando cualquier ambigüedad.',
    },
    {
        question: '¿Los tutores pueden ver el estado del proceso en tiempo real?',
        answer: 'Sí. El crematorio decide qué hitos mostrar al tutor a través de un enlace de seguimiento sin necesidad de contraseñas. La familia puede verificar cuándo su mascota fue recibida en el centro, cuándo ingresó a la sala de custodia y cuándo sus cenizas están listas para el retiro, mitigando la angustia y llamadas constantes al call center.',
    },
];

export default function GuiaTrazabilidadPage() {
    const jsonLdArticle = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: '¿Cómo Garantizar la Trazabilidad y Cadena de Custodia en un Crematorio de Mascotas?',
        description: 'Guía técnica y de procesos para directores de crematorios de mascotas: control de custodia, prevención de errores con código QR y certificados digitales.',
        url: 'https://vinzer.app/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas',
        inLanguage: 'es-CL',
        image: 'https://vinzer.app/images/MockupVinzer_comprimido.webp',
        author: {
            '@type': 'Organization',
            name: 'Equipo de Ingeniería y Operaciones Vinzer',
            url: 'https://vinzer.app',
        },
        publisher: {
            '@type': 'Organization',
            name: 'Vinzer SaaS',
            logo: {
                '@type': 'ImageObject',
                url: 'https://vinzer.app/images/logomododark.webp',
            },
        },
        datePublished: '2026-09-16',
        dateModified: '2026-09-16',
    };

    const jsonLdFaq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ENTITIES.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };

    const jsonLdBreadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://vinzer.app/',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Guías',
                item: 'https://vinzer.app/#producto',
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: 'Trazabilidad y Cadena de Custodia',
                item: 'https://vinzer.app/guias/software-trazabilidad-cadena-custodia-crematorios-mascotas',
            },
        ],
    };

    return (
        <>
            {/* Structured Data JSON-LD preservado en Server Component para SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
            />

            {/* Componente interactivo de cliente con soporte dark/light y Hero 3D */}
            <GuiaTrazabilidadClient />
        </>
    );
}
