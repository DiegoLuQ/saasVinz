import { NextRequest, NextResponse } from 'next/server';

export const config = {
    matcher: [
        '/((?!api/|_next/|_static/|static/|storage/|widget/|images/|_vercel|.*\\.[\\w]+$).*)',
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

    let currentHost: 'admin' | 'app' | 'veterinary' | 'memorial' | 'track' | 'catalogo' | 'partner' | 'invalid' | undefined;
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
        } else if (hostname.startsWith('catalogo.')) {
            currentHost = 'catalogo';
        } else if (hostname.startsWith('partner.')) {
            currentHost = 'partner';
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

    // Portal privado de veterinaria aliada:
    // Soporta formato estructurado /:tenant_slug/:partner_slug/portal-veterinaria/:token
    // y lo reescribe internamente a /portal-veterinaria/:token manteniendo la URL visible
    if (url.pathname.includes('/portal-veterinaria/')) {
        const segments = url.pathname.split('/').filter(Boolean);
        const portalIdx = segments.indexOf('portal-veterinaria');
        if (portalIdx !== -1 && segments[portalIdx + 1]) {
            const token = segments[portalIdx + 1];
            url.pathname = `/portal-veterinaria/${token}`;
            return NextResponse.rewrite(url);
        }
        return NextResponse.next();
    }

    // Pasar de largo: API, memoriales públicos y portal de veterinaria
    if (url.pathname.startsWith('/memorials') || url.pathname.startsWith('/api') || url.pathname.startsWith('/portal-veterinaria')) {
        return NextResponse.next();
    }

    // Formulario incrustable (iframe en el sitio del tenant, plan ULTRA):
    // /embed/form?key=pk_vinzer_live_... -> /public/<slug>/form?embed=1
    if (url.pathname === '/embed/form' && currentHost !== 'invalid') {
        return handleFormEmbed(req);
    }

    // Subdominio partner: exclusivo para el portal de veterinarias aliadas.
    // Cualquier otra ruta (como la raíz / o enlaces sin portal) redirige al dominio principal
    if (currentHost === 'partner') {
        const rootUrl = new URL('/', req.url);
        rootUrl.host = effectiveRoot;
        return NextResponse.redirect(rootUrl);
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
        if (url.pathname.startsWith('/track')) {
            return NextResponse.next();
        }
        if (url.pathname.includes('/track/')) {
            url.pathname = `/public${url.pathname}`;
            return NextResponse.rewrite(url);
        }
        if (url.pathname.includes('/catalogo/')) {
            url.pathname = `/public${url.pathname}`;
            return NextResponse.rewrite(url);
        }
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

    // Subdominio exclusivo de catálogo online (catalogo.)
    if (currentHost === 'catalogo') {
        const segments = url.pathname.split('/').filter(Boolean);
        // Formato limpio: /slug/token -> reescribe internamente a /public/slug/catalogo/token
        if (segments.length === 2) {
            const [tenantSlug, catalogToken] = segments;
            url.pathname = `/public/${tenantSlug}/catalogo/${catalogToken}`;
            return NextResponse.rewrite(url);
        }
        // Formato con prefijo: /slug/catalogo/token -> /public/slug/catalogo/token
        if (segments.length >= 3 && segments[1] === 'catalogo') {
            url.pathname = `/public${url.pathname}`;
            return NextResponse.rewrite(url);
        }
        url.pathname = `/public${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    // Memoriales, seguimiento o páginas públicas del tenant (form, track, catalogo) -> /public
    const isPublicTenantPath = url.pathname.includes('/track/') || url.pathname.includes('/form') || url.pathname.includes('/catalogo/');
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

// ---------------------------------------------------------------------------
// Formulario incrustable
// ---------------------------------------------------------------------------
// El backend valida la API key (activa, plan ULTRA) y devuelve el tenant y los
// dominios autorizados. Con ellos se arma `frame-ancestors`: el navegador solo
// permite incrustar el formulario en esos dominios (X-Frame-Options se excluye
// para /embed en next.config.ts).

type FormEmbedResult =
    | { ok: true; tenantSlug: string; allowedDomains: string[] }
    | { ok: false; status: number; message: string };

const FORM_EMBED_TTL_MS = 60_000;
const formEmbedCache = new Map<string, { result: FormEmbedResult; expires: number }>();

async function resolveFormEmbed(apiKey: string): Promise<FormEmbedResult> {
    const cached = formEmbedCache.get(apiKey);
    if (cached && cached.expires > Date.now()) return cached.result;

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    let result: FormEmbedResult;
    try {
        const res = await fetch(
            `${apiUrl}/api/public/widget/form-embed/config?api_key=${encodeURIComponent(apiKey)}`,
            { cache: 'no-store' }
        );
        if (res.ok) {
            const data = await res.json();
            result = { ok: true, tenantSlug: data.tenant_slug, allowedDomains: data.allowed_domains || [] };
        } else {
            const data = await res.json().catch(() => null);
            const detail = typeof data?.detail === 'string' ? data.detail : 'Formulario no disponible.';
            result = { ok: false, status: res.status, message: detail };
        }
    } catch {
        // Error de red: no se cachea, el próximo intento vuelve a consultar.
        return { ok: false, status: 503, message: 'Servicio no disponible, intenta nuevamente.' };
    }

    if (formEmbedCache.size > 500) formEmbedCache.clear();
    formEmbedCache.set(apiKey, { result, expires: Date.now() + FORM_EMBED_TTL_MS });
    return result;
}

function embedErrorResponse(status: number, message: string) {
    const safe = message.replace(/[<>&"]/g, '');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Formulario no disponible</title></head><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:200px;margin:0;color:#555"><p>${safe}</p></body></html>`;
    return new NextResponse(html, {
        status,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
}

async function handleFormEmbed(req: NextRequest) {
    const apiKey = (req.nextUrl.searchParams.get('key') || '').trim();
    if (!apiKey) return embedErrorResponse(400, 'Falta la clave del formulario.');

    const result = await resolveFormEmbed(apiKey);
    if (!result.ok) return embedErrorResponse(result.status, result.message);

    const url = req.nextUrl.clone();
    url.pathname = `/public/${encodeURIComponent(result.tenantSlug)}/form`;
    url.search = '';
    url.searchParams.set('embed', '1');

    // Host sin esquema: permite http/https según el esquema de la página; `:*`
    // cubre puertos no estándar (útil para pruebas locales).
    const ancestors = result.allowedDomains
        .filter((d) => /^[a-z0-9.-]+$/i.test(d))
        .flatMap((d) => [d, `${d}:*`]);

    const res = NextResponse.rewrite(url);
    res.headers.set('Content-Security-Policy', `frame-ancestors ${ancestors.length ? ancestors.join(' ') : "'none'"}`);
    res.headers.set('Cache-Control', 'no-store');
    return res;
}
