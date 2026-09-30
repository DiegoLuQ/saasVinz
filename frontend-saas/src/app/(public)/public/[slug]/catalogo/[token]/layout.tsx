import type { Metadata } from "next";
import { headers } from "next/headers";

// El catálogo se comparte por WhatsApp y la página se arma en el cliente, así
// que la previsualización (título, descripción, imagen) se resuelve aquí en el
// servidor con los datos del tenant.
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "vinzer.cl";
const FALLBACK_BASE = ROOT.startsWith("http") ? ROOT : `https://${ROOT}`;

type CatalogParams = { slug: string; token: string };

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

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export async function generateMetadata({
  params,
}: {
  params: Promise<CatalogParams>;
}): Promise<Metadata> {
  const { slug, token } = await params;
  const origin = await resolveOrigin();

  let tenantName = "";
  let isPlans = true;
  let summary = "";

  try {
    // preview=1: la lectura para la previsualización no cuenta como visita.
    const res = await fetch(
      `${API}/api/public/catalog/${encodeURIComponent(slug)}/${encodeURIComponent(token)}?preview=1`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      tenantName = data?.tenant_name || "";
      isPlans = data?.catalog_type !== "products";
      summary = data?.catalog_tagline || data?.catalog_intro || "";
    }
  } catch {
    // Sin datos se usa un texto genérico.
  }

  const title = tenantName
    ? `${isPlans ? "Planes" : "Catálogo"} · ${tenantName}`
    : isPlans ? "Nuestros planes" : "Catálogo";
  const description = truncate(
    summary ||
      (isPlans
        ? "Conoce nuestros planes de despedida para tu compañero. Te acompañamos con respeto y cercanía; escríbenos cuando lo necesites."
        : "Conoce nuestras ánforas, relicarios y recuerdos conmemorativos."),
    200
  );
  const image = `${origin}/og-form.jpg`;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    // El enlace lleva un token de acceso: no debe indexarse.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: tenantName || "Vinzer",
      locale: "es_CL",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: tenantName || title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
