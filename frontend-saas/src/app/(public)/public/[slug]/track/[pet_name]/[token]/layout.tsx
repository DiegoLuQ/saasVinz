import type { Metadata } from "next";
import { headers } from "next/headers";

// El enlace de seguimiento se comparte por WhatsApp, así que la previsualización
// se arma en el servidor: foto de la mascota como imagen y un texto cálido.
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "vinzer.cl";
const FALLBACK_BASE = ROOT.startsWith("http") ? ROOT : `https://${ROOT}`;

type TrackParams = { slug: string; pet_name: string; token: string };

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

/** "ryuk" / "ryuk-lopez" -> "Ryuk", "Ryuk Lopez" */
function prettifyName(raw: string): string {
  const clean = decodeURIComponent(raw || "").replace(/-/g, " ").trim();
  if (!clean) return "";
  return clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<TrackParams>;
}): Promise<Metadata> {
  const { slug, pet_name, token } = await params;
  const origin = await resolveOrigin();

  let name = prettifyName(pet_name) || "tu compañero";
  let tenantName = "";
  let hasPhoto = false;

  try {
    const res = await fetch(
      `${API}/api/public/tracking/${slug}/${pet_name}/${token}`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.pet_name) name = data.pet_name;
      tenantName = data?.tenant_name || "";
      hasPhoto = Boolean(data?.pet_image_url);
    }
  } catch {
    // Sin datos usamos el nombre de la URL y la imagen genérica.
  }

  const title = `Acompañando a ${name} 🕊️`;
  const description =
    `Sigue paso a paso la despedida de ${name}. Cada etapa del proceso con la ` +
    `transparencia, el respeto y el cariño que merece quien nos dio tanto amor.` +
    (tenantName ? ` — ${tenantName}` : "");

  // La foto de la mascota se sirve como JPEG compuesto (1200x630): WhatsApp no
  // previsualiza los .webp con los que se guardan las fotos en R2.
  const petCard = `${origin}/api/public/tracking/${slug}/${pet_name}/${token}/og-image.jpg`;
  const image = hasPhoto ? petCard : `${origin}/og-form.jpg`;
  const alt = hasPhoto ? `Foto de ${name}` : "En memoria de tu fiel compañero";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    // El enlace lleva un token privado de la familia: no debe indexarse.
    robots: { index: false, follow: false },
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

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
