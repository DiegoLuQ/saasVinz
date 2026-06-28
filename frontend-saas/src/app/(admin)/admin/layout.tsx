import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Server-Side Metadata Generation
export async function generateMetadata(): Promise<Metadata> {
  try {
    // Fetch SEO config from backend (server-side)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/api/public/landing-config`, {
      next: { tags: ['landing-config'] },
    });

    if (!response.ok) throw new Error('Config fetch failed');

    const data = await response.json();
    const seo = data.config?.seo || {};

    return {
      title: seo.title || "SaaS Crematorio - Gestión Profesional",
      description: seo.description || "Sistema completo para gestionar cremaciones, clientes e inventarios.",
      keywords: seo.keywords || "crematorio, mascotas, gestión",
      robots: seo.robots || "index, follow",
      openGraph: {
        title: seo.ogTitle || seo.title || "SaaS Crematorio",
        description: seo.ogDescription || seo.description || "Gestión integral para crematorios",
        images: seo.ogImage ? [{ url: seo.ogImage }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: seo.ogTitle || seo.title,
        description: seo.ogDescription || seo.description,
        images: seo.ogImage ? [seo.ogImage] : [],
      },
      alternates: {
        canonical: seo.canonical || undefined,
      },
    };
  } catch (error) {
    console.error('SEO metadata fetch error:', error);
    // Fallback to defaults
    return {
      title: "SaaS Crematorio - Gestión Profesional",
      description: "Sistema completo para gestionar cremaciones, clientes e inventarios.",
    };
  }
}

import { AdminProviders } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
      <AdminProviders>
        {children}
      </AdminProviders>
    </div>
  );
}


