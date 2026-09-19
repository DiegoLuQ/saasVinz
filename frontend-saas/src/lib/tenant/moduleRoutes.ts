/**
 * Mapa ruta → módulo RBAC de la app del tenant.
 *
 * El blueprint de roles (admin) decide qué módulos ve cada rol; el Sidebar solo
 * oculta los enlaces. Este mapa permite además bloquear el acceso por URL y
 * elegir la página de inicio de cada rol (p. ej. el operador no tiene Dashboard).
 * Mantener alineado con los `moduleKey` de `components/tenant/Sidebar.tsx`.
 */

const ROUTE_MODULES: { prefix: string; module: string }[] = [
    { prefix: '/dashboard/clientes', module: 'clientes' },
    { prefix: '/dashboard/mascotas', module: 'mascotas' },
    { prefix: '/dashboard/gestion-servicios', module: 'servicios' },
    { prefix: '/dashboard/recepcion-pedidos', module: 'ordenes' },
    { prefix: '/dashboard/asignacion-servicios', module: 'ordenes' },
    { prefix: '/dashboard/registros', module: 'ordenes' },
    { prefix: '/dashboard/inventario', module: 'inventario' },
    { prefix: '/dashboard/documentos', module: 'certificados' },
    { prefix: '/dashboard/operaciones', module: 'operaciones' },
    { prefix: '/dashboard/ordenes-cremacion', module: 'pagos' },
    { prefix: '/dashboard/partners', module: 'veterinarios' },
    { prefix: '/dashboard/partners_legacy', module: 'veterinarios' },
    { prefix: '/dashboard/roles-modulos', module: 'configuracion' },
    { prefix: '/dashboard/configuracion', module: 'configuracion' },
    { prefix: '/dashboard/facturacion', module: 'configuracion' },
    { prefix: '/dashboard/recibo', module: 'configuracion' },
];

/** Rutas sin módulo: accesibles para cualquier usuario autenticado del tenant. */
const OPEN_PREFIXES = ['/dashboard/perfil', '/dashboard/ayuda'];

/** Roles que usan el Panel de Trabajo (el backend de /ops/board solo los admite a ellos). */
const OPS_PANEL_ROLES = ['admin', 'operator', 'driver', 'operador_cremacion', 'creator'];

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Módulo requerido por una ruta, o null si la ruta es libre. */
export function moduleForPath(path: string): string | null {
    if (path === '/dashboard' || path === '/dashboard/') return 'dashboard';
    if (OPEN_PREFIXES.some(p => matches(path, p))) return null;
    return ROUTE_MODULES.find(r => matches(path, r.prefix))?.module ?? null;
}

/** Primera pantalla útil para el rol, según sus módulos activos. */
export function homeRouteFor(activeModules: string[], role?: string): string {
    const has = (m: string) => activeModules.includes(m);
    if (has('dashboard')) return '/dashboard';
    if (has('operaciones')) {
        return OPS_PANEL_ROLES.includes(role ?? '')
            ? '/dashboard/operaciones/lista'
            : '/dashboard/operaciones/crear-seguimiento';
    }
    const order: [string, string][] = [
        ['ordenes', '/dashboard/recepcion-pedidos'],
        ['clientes', '/dashboard/clientes'],
        ['mascotas', '/dashboard/mascotas'],
        ['servicios', '/dashboard/gestion-servicios'],
        ['pagos', '/dashboard/ordenes-cremacion'],
        ['inventario', '/dashboard/inventario/productos'],
        ['certificados', '/dashboard/documentos'],
        ['veterinarios', '/dashboard/partners'],
        ['configuracion', '/dashboard/configuracion'],
    ];
    return order.find(([m]) => has(m))?.[1] ?? '/dashboard/perfil';
}
