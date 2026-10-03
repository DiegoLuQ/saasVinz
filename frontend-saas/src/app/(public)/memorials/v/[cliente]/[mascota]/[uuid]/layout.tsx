import type { Metadata } from "next";
import { headers } from "next/headers";
import { getMemorialEpitaph } from "@/lib/memorialDesign";

// El memorial se comparte sobre todo por WhatsApp: la previsualización se arma
// en el servidor con el nombre y la foto de la mascota (antes salía el título
// genérico de Vinzer, sin foto).
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "vinzer.cl";
const FALLBACK_BASE = ROOT.startsWith("http") ? ROOT : `https://${ROOT}`;

type MemorialParams = { cliente: string; mascota: string; uuid: string };

/** Origen real de la petición: sirve tanto en lvh.me:3000 como en producción. */
async function resolveOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host) return FALLBACK_BASE;
    const proto =
      h.get("x-forwarded-proto") ||
      (/^(localhost|127\.0\.0\.1|.*\.?lvh\.me)(:\d+)?$/.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return FALLBACK_BASE;
  }
}

/** "copito-de-nieve" -> "Copito De Nieve" */
function prettifyName(raw: string): string {
  const clean = decodeURIComponent(raw || "").replace(/-/g, " ").trim();
  if (!clean) return "";
  return clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<MemorialParams>;
}): Promise<Metadata> {
  const { mascota, uuid } = await params;
  const origin = await resolveOrigin();

  let name = prettifyName(mascota) || "tu compañero";
  let tenantName = "";
  let farewell: string | null = null;
  let hasPhoto = false;
  let isPublic = false;

  try {
    const res = await fetch(`${API}/api/internal/memorials/${uuid}`, {
      next: { revalidate: 300 },
    });
    // Privados/archivados responden 403: no se expone nada más que la URL.
    if (res.ok) {
      const data = await res.json();
      isPublic = true;
      if (data?.mascota?.name) name = data.mascota.name;
      tenantName = data?.tenant_info?.name || "";
      farewell = data?.msg_despedida || null;
      hasPhoto = Boolean(data?.main_image_url || data?.mascota?.image_url);
    }
  } catch {
    // Sin datos usamos el nombre de la URL y la imagen genérica.
  }

  const title = `En memoria de ${name} 🕊️`;
  const description = truncate(
    isPublic
      ? getMemorialEpitaph(farewell, name, uuid, "es")
      : `Un espacio para recordar a ${name} con amor.`,
    180
  );

  const image = hasPhoto
    ? `${origin}/api/internal/memorials/${uuid}/og-image.jpg`
    : `${origin}/og-form.jpg`;
  const alt = hasPhoto ? `Foto de ${name}` : "En memoria de tu fiel compañero";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    robots: isPublic ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: tenantName || "Vinzer",
      locale: "es_CL",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function MemorialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
