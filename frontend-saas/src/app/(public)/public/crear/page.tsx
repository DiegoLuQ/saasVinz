import type { Metadata } from 'next';
import { Suspense } from 'react';
import CrearMemorialClient from './CrearMemorialClient';

// memorial.<dominio>/crear (el middleware lo reescribe a /public/crear). ?plan=<mensual|anual|eterno>, ?i=<invitación>
export const metadata: Metadata = {
  title: 'Crear memorial · Vinzer Memorial',
  description: 'Crea el memorial digital de tu mascota: sube sus fotos, elige el diseño y la música.',
  robots: { index: true, follow: true },
};

export default function CrearMemorialPage() {
  return (
    <Suspense fallback={null}>
      <CrearMemorialClient />
    </Suspense>
  );
}
