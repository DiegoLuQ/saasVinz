import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
console.log('Next.js API Proxy Destination:', API_URL);

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Required for the optimized Dockerfile
  // Orígenes cross-domain permitidos para pedir recursos /_next/* en DEV.
  // Solo aplica a `next dev` (con subdominios lvh.me); en producción no se usa.
  allowedDevOrigins: [
    'lvh.me',
    'www.lvh.me',
    'admin.lvh.me',
    'app.lvh.me',
    'tenant.lvh.me',
    'veterinary.lvh.me',
    'partner.lvh.me',
    'track.lvh.me',
    'memorial.lvh.me',
    'crematorio.lvh.me',
    'funeraria.lvh.me',
    'huellas.lvh.me',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'lvh.me:3000',
        'admin.lvh.me:3000',
        'tenant.lvh.me:3000',
        'partner.lvh.me:3000',
        'www.lvh.me:3000',
        'crematorio.lvh.me:3000',
        'funeraria.lvh.me:3000',
        'huellas.lvh.me:3000'
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `pub-${process.env.NEXT_PUBLIC_CLOUDFLARE_R2}`,
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev', // Fallback for direct R2 URLs
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc', // Marketing imagery used on the public landing
      }
    ],
  },
  async headers() {
    const baseSecurityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // HSTS: solo tiene efecto bajo HTTPS (producción detrás del proxy).
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [
      {
        // Anti-clickjacking en toda la app EXCEPTO /memorials: el panel admin
        // previsualiza memoriales embebiéndolos en un iframe desde otro
        // subdominio (admin.* → dominio de memoriales), y SAMEORIGIN los
        // bloquearía. Los memoriales públicos son de solo lectura.
        // El widget embebible tampoco pasa por aquí (script estático en
        // /public/widget que corre en el sitio del cliente).
        source: '/((?!memorials).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          ...baseSecurityHeaders,
        ],
      },
      {
        source: '/memorials/:path*',
        headers: baseSecurityHeaders,
      },
    ];
  },
  async rewrites() {
    return {
      // beforeFiles: se ejecuta antes de verificar rutas del filesystem
      beforeFiles: [],
      // afterFiles: se ejecuta DESPUÉS de verificar rutas del filesystem (API routes locales)
      // Esto permite que /api/image-proxy sea manejado por Next.js,
      // y solo las rutas /api/ que NO existen localmente se envíen al backend
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${API_URL}/api/:path*`, // Proxy to Backend
        },
        {
          source: '/static/:path*',
          destination: `${API_URL}/static/:path*`,
        },
        {
          source: '/storage/:path*',
          destination: `${API_URL}/storage/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
