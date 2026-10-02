import type { Metadata } from 'next';
import MemorialLandingClient from './MemorialLandingClient';

// Landing one-page de memorial.vinzer.cl. Página de servidor solo para los
// metadatos; el contenido es interactivo (MemorialLandingClient).
export const metadata: Metadata = {
  title: 'Vinzer Memorial · Santuario digital para mascotas',
  description:
    'Preserva el legado y el amor de tu mascota en un santuario digital con velas, historias y dedicatorias. Planes Mensual, Anual y Eterno, junto a la red de crematorios Vinzer.',
};

export default function MemorialLandingPage() {
  return <MemorialLandingClient />;
}
