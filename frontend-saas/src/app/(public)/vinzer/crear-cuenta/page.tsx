import type { Metadata } from 'next';
import CrearCuentaClient from '@/components/vinzer/CrearCuentaClient';

export const metadata: Metadata = {
    title: 'Crear cuenta gratis | Vinzer',
    description: 'Crea gratis la cuenta de tu crematorio de mascotas en Vinzer: órdenes, seguimiento para las familias y certificados en un solo lugar.',
};

export default function CrearCuentaPage() {
    return <CrearCuentaClient />;
}
