import type { Metadata } from "next";

// Dominio raíz para resolver la URL absoluta del og:image (WhatsApp la necesita
// absoluta). En producción NEXT_PUBLIC_ROOT_DOMAIN = vinzer.cl.
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "vinzer.cl";
const BASE = ROOT.startsWith("http") ? ROOT : `https://${ROOT}`;

const TITLE = "Un adiós lleno de amor 🐾";
const DESC =
  "Honramos la memoria de tu compañero de vida. Completa este registro y acompañaremos su despedida con el respeto, la dignidad y el cariño que merece.";

// Metadata específica del formulario público (sobrescribe la del layout padre).
// Da un preview cálido y emblemático al compartir el enlace por WhatsApp/redes,
// pensado para familias que perdieron a su mascota.
export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: TITLE,
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    siteName: "Vinzer",
    locale: "es_CL",
    type: "website",
    images: [
      {
        url: "/og-form.jpg",
        width: 1200,
        height: 630,
        alt: "En memoria de tu fiel compañero — Vinzer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: ["/og-form.jpg"],
  },
};

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
