import type { Metadata } from "next";
import { memorialMetadata } from "@/lib/memorialMetadata";

type MemorialParams = { cliente: string; mascota: string; uuid: string };

// Vista previa al compartir (WhatsApp): nombre y foto de la mascota. Lógica en lib/memorialMetadata.ts
export async function generateMetadata({
  params,
}: {
  params: Promise<MemorialParams>;
}): Promise<Metadata> {
  const { mascota, uuid } = await params;
  return memorialMetadata(uuid, mascota);
}

export default function MemorialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
