import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
console.log('Next.js API Proxy Destination:', API_URL);

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Required for the optimized Dockerfile
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
