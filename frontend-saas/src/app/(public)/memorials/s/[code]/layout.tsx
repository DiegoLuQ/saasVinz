import type { Metadata } from "next";
import { memorialMetadata, resolveMemorialCode } from "@/lib/memorialMetadata";

// Enlace corto memorial.<dominio>/<crematorio>/<mascota>-<código>: el middleware lo
// reescribe a /memorials/s/<código>. Misma vista previa que el enlace largo.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const uuid = await resolveMemorialCode(code);
  if (!uuid) return { title: "Memorial no encontrado", robots: { index: false, follow: false } };
  return memorialMetadata(uuid);
}

export default function ShortMemorialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
