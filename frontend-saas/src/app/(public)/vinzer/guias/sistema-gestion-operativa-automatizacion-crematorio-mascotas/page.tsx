import React from 'react';
import type { Metadata } from 'next';
import { GuiaGestionOperativaClient } from '@/components/vinzer/GuiaGestionOperativaClient';

export const metadata: Metadata = {
    title: 'Software de Gestión Operativa para Crematorios de Mascotas | Vinzer',
    description: 'Control técnico de hornos, hojas de ruta con firma digital, formularios inteligentes de recepción y stock de urnas. Elimina el desorden de Excel.',
    keywords: [
        'software gestion operativa crematorio mascotas',
        'sistema control hornos cremacion mascotas',
        'formulario recepcion crematorio mascotas',
        'logistica retiro mascotas fallecidas',
        'software crematorio mascotas chile',
        'erp crematorio mascotas'
    ],
    alternates: {
        canonical: 'https://vinzer.app/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas',
    },
    openGraph: {
        title: 'Gestión Operativa y Formularios Inteligentes para Crematorios de Mascotas | Vinzer',
        description: 'Control técnico de hornos, formularios inteligentes de recepción guiada y hojas de ruta de logística.',
        url: 'https://vinzer.app/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas',
        siteName: 'Vinzer',
        locale: 'es_CL',
        type: 'article',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Gestión Operativa para Crematorios de Mascotas | Vinzer',
        description: 'Control de planta, logística y formularios guiados sin planillas de cálculo.',
    }
};

const FAQ_ENTITIES = [
    {
        question: '¿Cómo funciona el formulario de recepción de pedidos en Vinzer?',
        answer: 'Está estructurado en 4 pestañas intuitivas: Angelito (ficha del paciente y tutor), Logística (direcciones de retiro y entrega), Evidencia (fotos de recepción y pertenencias) y Comercial (servicios, planes, urnas adicionales y cálculo de ticket). Además cuenta con autoguardado de borradores para nunca perder información.',
    },
    {
        question: '¿Cómo apoya al operador de horno durante la jornada?',
        answer: 'Cada cremación cuenta con un registro técnico donde el operario vincula el número de cámara o ID de horno, el operador responsable, la hora exacta de inicio, término y la temperatura de operación. Esto garantiza trazabilidad interna y control de tiempos por servicio.',
    },
    {
        question: '¿Cuánto tarda la capacitación del personal de planta y choferes?',
        answer: 'La interfaz para operarios de horno y choferes está diseñada con enfoque táctil de alta legibilidad y botones grandes para uso en terreno. El tiempo promedio de adopción del equipo es de menos de 48 horas, eliminando la resistencia al cambio.',
    },
];

export default function GuiaGestionOperativaPage() {
    const jsonLdArticle = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: 'Software de Gestión Operativa para Crematorios de Mascotas: Control de Planta, Logística y Formularios Inteligentes',
        description: 'Estrategias y software para directores de crematorios de mascotas: control técnico de hornos, formularios de recepción en 4 pasos y hojas de ruta con firma digital.',
        url: 'https://vinzer.app/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas',
        inLanguage: 'es-CL',
        author: {
            '@type': 'Organization',
            name: 'Equipo de Operaciones Vinzer',
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
                name: 'Gestión Operativa y Automatización',
                item: 'https://vinzer.app/guias/sistema-gestion-operativa-automatizacion-crematorio-mascotas',
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

            {/* Componente interactivo de cliente con soporte dark/light completo */}
            <GuiaGestionOperativaClient />
        </>
    );
}
