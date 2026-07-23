import { NextRequest, NextResponse } from 'next/server';

export const config = {
    matcher: [
        '/((?!api/|_next/|_static/|static/|storage/|widget/|_vercel|[\\w-]+\\.\\w+).*)',
    ],
};

// Hosts soportados
//   admin.<root>     -> /admin           (panel SaaS Creator)
//   app.<root>       -> /tenant          (panel multi-tenant, identificación por JWT)
//   veterinary.<root>-> /veterinary      (portal veterinarias)
//   memorial.<root>  -> /public          (URLs públicas de memoriales)
//   track.<root>     -> /public          (seguimiento público de órdenes)
//   <memorialDomain> -> /public          (dominio de marca dedicado, ej. pawmemory.pet)
//   <root>           -> /public          (landing temporal hasta migrar a sitio externo)
//   cualquier otro   -> redirect a <root>

export default async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get('host');

    const rootDomainEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const memorialDomain = process.env.NEXT_PUBLIC_MEMORIAL_DOMAIN;

    let currentHost: 'admin' | 'app' | 'veterinary' | 'memorial' | 'track' | 'invalid' | undefined;
    const isLocal = hostname?.includes('lvh.me') || hostname?.includes('localhost');
    let effectiveRoot = isLocal
        ? (hostname?.includes('lvh.me') ? 'lvh.me:3000' : 'localhost:3000')
        : rootDomainEnv;

    if (hostname) {
        if (memorialDomain && (hostname === memorialDomain || hostname === `www.${memorialDomain}`)) {
            currentHost = 'memorial';
        } else if (hostname.startsWith('memorial.')) {
            currentHost = 'memorial';
        } else if (hostname.startsWith('track.')) {
            currentHost = 'track';
        } else {
            if (hostname === effectiveRoot || hostname === `www.${effectiveRoot}`) {
                currentHost = undefined;
            } else if (hostname.startsWith('admin.')) {
                currentHost = 'admin';
            } else if (hostname.startsWith('app.')) {
                currentHost = 'app';
            } else if (hostname.startsWith('veterinary.')) {
                currentHost = 'veterinary';
            } else {
                currentHost = 'invalid';
            }
        }
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log(`[Middleware] Host: ${hostname} | Detected: ${currentHost ?? 'root'} | Path: ${url.pathname}`);
    }

    // Pasar de largo: API y memoriales públicos
    if (url.pathname.startsWith('/memorials') || url.pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Subdomain no soportado -> redirect a root
    if (currentHost === 'invalid') {
        const rootUrl = new URL('/', req.url);
        rootUrl.host = effectiveRoot;
        return NextResponse.redirect(rootUrl);
    }

    if (currentHost === 'admin') {
        const token = req.cookies.get('saasc_token')?.value;
        const isLoginPage = url.pathname === '/iniciar-sesion-creador';

        // La raíz del subdominio admin no muestra landing: redirige al login
        // del creador (o al dashboard si ya hay sesión).
        if (url.pathname === '/' || url.pathname === '') {
            return NextResponse.redirect(
                new URL(token ? '/dashboard' : '/iniciar-sesion-creador', req.url)
            );
        }

        if (!token && !isLoginPage) {
            return NextResponse.redirect(new URL('/iniciar-sesion-creador', req.url));
        }
        if (token && isLoginPage) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }

        url.pathname = `/admin${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    if (currentHost === 'app') {
        url.pathname = `/tenant${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    if (currentHost === 'veterinary') {
        const token = req.cookies.get('vet_token')?.value;
        const isLoginPage = url.pathname === '/login';

        if (!token && !isLoginPage) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
        if (token && isLoginPage) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }

        url.pathname = `/veterinary${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    // Raíz del subdominio de seguimiento -> web pública de búsqueda por código
    if (currentHost === 'track' && (url.pathname === '/' || url.pathname === '')) {
        url.pathname = '/track';
        return NextResponse.rewrite(url);
    }

    // Memoriales, seguimiento o páginas públicas del tenant (form, track) -> /public
    const isPublicTenantPath = url.pathname.includes('/track/') || url.pathname.includes('/form');
    if (currentHost === 'memorial' || currentHost === 'track' || isPublicTenantPath) {
        url.pathname = `/public${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    // Root (Vinzer) -> /vinzer
    if (currentHost === undefined) {
        url.pathname = `/vinzer${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    // Default to /public for anything else (safety)
    url.pathname = `/public${url.pathname}`;
    return NextResponse.rewrite(url);
}
