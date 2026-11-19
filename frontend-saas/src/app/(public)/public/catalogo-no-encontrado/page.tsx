import type { Metadata } from 'next';
import CatalogNotFound from '@/components/public/catalog/CatalogNotFound';

// Destino de catalogo.<dominio>/ y de cualquier ruta de ese subdominio que no sea
// un enlace de catálogo (middleware.ts). Antes caía en la landing de memoriales.
export const metadata: Metadata = {
    title: 'Catálogo no encontrado',
    robots: { index: false, follow: false },
};

export default function CatalogoNoEncontradoPage() {
    return <CatalogNotFound />;
}
