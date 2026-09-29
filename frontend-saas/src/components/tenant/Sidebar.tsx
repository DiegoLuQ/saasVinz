"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Dog,
    FileText,
    Flame,
    Palette,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CreditCard,
    ShoppingBag,
    Package,
    Tags,
    Truck,
    Heart,
    ShieldCheck,
    AlertCircle,
    LogOut,
    Briefcase,
    Store,
    DollarSign,
    Activity,
    Stamp,
    Lock,
    CreditCard as CreditCardIcon,
    HelpCircle,
    Sparkles
} from 'lucide-react';
import { getSubscriptionInfo, isModuleAllowedWhenLocked } from '@/lib/tenant/subscription';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { apiRequest, API_URL } from '@/lib/tenant/api';
import { useSidebar } from '@/app/(tenant)/tenant/context/SidebarContext';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useFeatures } from '@/hooks/useFeatures';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NavItem {
    name: string;
    href: string;
    icon: any;
    moduleKey?: string; // Nuevo: clave del módulo asociado
    featureKey?: string; // Feature flag granular del plan
    children?: NavChild[];
    allowedRoles?: string[]; // Opcional: restringir visibilidad por rol
    group: NavGroup;
}

type NavChild = Omit<NavItem, 'group' | 'children'>;

type NavGroup = 'principal' | 'operacion' | 'clientes' | 'catalogo' | 'configuracion';

// Orden y títulos de los grupos del menú
const NAV_GROUPS: { key: NavGroup; label: string }[] = [
    { key: 'principal', label: 'Principal' },
    { key: 'operacion', label: 'Operación' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'catalogo', label: 'Catálogo y documentos' },
    { key: 'configuracion', label: 'Configuración' },
];

const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard', group: 'principal' },
    { name: 'Clientes', href: '/dashboard/clientes', icon: Users, moduleKey: 'clientes', group: 'clientes' },
    { name: 'Mascotas', href: '/dashboard/mascotas', icon: Dog, moduleKey: 'mascotas', group: 'clientes' },
    { name: 'Catálogo de Servicios', href: '/dashboard/gestion-servicios', icon: Palette, moduleKey: 'servicios', group: 'catalogo' },
    { name: 'Recepción y Pedidos', href: '/dashboard/recepcion-pedidos', icon: Flame, moduleKey: 'ordenes', group: 'operacion' },
    {
        name: 'Inventario',
        href: '#',
        group: 'catalogo',
        icon: ShoppingBag,
        moduleKey: 'inventario',
        children: [
            { name: 'Productos', href: '/dashboard/inventario/productos', icon: Package },
            { name: 'Categorías', href: '/dashboard/inventario/categorias', icon: Tags, featureKey: 'inventario:categorias:gestionar' },
            { name: 'Proveedores', href: '/dashboard/inventario/proveedores', icon: Truck, featureKey: 'inventario:proveedores:gestionar' },
        ]
    },
    {
        name: 'Documentos',
        href: '#',
        group: 'catalogo',
        icon: FileText,
        moduleKey: 'certificados',
        children: [
            { name: 'Emitir Certificado', href: '/dashboard/documentos', icon: Stamp, featureKey: 'certificados:generar_pdf' },
            { name: 'Repositorio', href: '/dashboard/documentos/repositorio', icon: FileText, featureKey: 'certificados:repositorio' },
            { name: 'Tarjetas de Homenaje', href: '/dashboard/documentos/disenos', icon: Palette, featureKey: 'certificados:diseno' },
        ]
    },
    {
        name: 'Operaciones',
        href: '#',
        group: 'operacion',
        icon: Briefcase,
        moduleKey: 'operaciones',
        children: [
            { name: 'Panel de Trabajo', href: '/dashboard/operaciones/lista', icon: Activity, allowedRoles: ['admin', 'operator', 'driver', 'operador_cremacion'], moduleKey: 'operaciones', featureKey: 'operaciones:panel' },
            // 'Iniciar Nuevo Tracking' (/dashboard/operaciones/crear-seguimiento) oculto del menú: la ruta sigue
            // activa porque homeRouteFor la usa como inicio de roles con operaciones y sin dashboard.
        ]
    },
    { name: 'Historial y Cobros', href: '/dashboard/ordenes-cremacion', icon: CreditCard, moduleKey: 'pagos', featureKey: 'pagos:ver_historial', group: 'operacion' },
    {
        name: 'Veterinarios',
        href: '#',
        group: 'clientes',
        icon: Store,
        moduleKey: 'veterinarios',
        children: [
            { name: 'Listado', href: '/dashboard/partners', icon: Store, featureKey: 'veterinarios:gestionar' },
            { name: 'Comisiones', href: '/dashboard/partners/comisiones', icon: DollarSign, featureKey: 'veterinarios:comisiones:ver' },
        ]
    },
    { name: 'Roles y Módulos', href: '/dashboard/roles-modulos', icon: ShieldCheck, moduleKey: 'configuracion', featureKey: 'configuracion:roles', group: 'configuracion' }, // Nuevo
    { name: 'Ayuda y Tutoriales', href: '/dashboard/ayuda', icon: HelpCircle, group: 'configuracion' },
];

export default function Sidebar() {
    const { collapsed, toggleSidebar, mobileOpen, closeMobile } = useSidebar();
    const { data: bootstrapData, isLoading: loadingModules, error: bootstrapError } = useSessionBootstrap();
    const { hasFeature } = useFeatures();
    const pathname = usePathname();

    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [lockedNotice, setLockedNotice] = useState(false);

    // Auto-close drawer when navigating
    useEffect(() => {
        closeMobile();
    }, [pathname, closeMobile]);

    // Lock body scroll when drawer is open on mobile
    useEffect(() => {
        if (mobileOpen) {
            const original = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = original; };
        }
    }, [mobileOpen]);

    const tenant = bootstrapData?.tenant;
    const user = bootstrapData?.user;
    const activeModules = bootstrapData?.rbac.modules
        .filter(m => m.is_active)
        .map(m => m.module_key) || [];

    // Estado de suscripción: si está en lockdown (post-gracia), todos los módulos
    // excepto los permitidos se muestran con candado.
    const subInfo = getSubscriptionInfo((tenant as any)?.plan, (tenant as any)?.next_billing_date);
    const subscriptionLocked = subInfo.locked;

    const error = bootstrapError ? (bootstrapError as any).message || 'Error de conexión' : null;

    // Filtrar items según módulos activos, roles y feature flags del plan
    const filteredNavItems = navItems.filter(item => {
        if (item.moduleKey && !activeModules.includes(item.moduleKey)) return false;
        if (item.featureKey && !hasFeature(item.featureKey, true)) return false;
        return true;
    }).map(item => {
        if (item.children) {
            return {
                ...item,
                children: item.children.filter(child => {
                    const userRole = (user?.role || '').toLowerCase();
                    // Admin del tenant siempre puede ver entradas con restricción de rol
                    const roleAllowed = !child.allowedRoles
                        || userRole === 'admin'
                        || userRole === 'creator'
                        || child.allowedRoles.some(r => r.toLowerCase() === userRole);
                    const moduleAllowed = !child.moduleKey || activeModules.includes(child.moduleKey);
                    const featureAllowed = !child.featureKey || hasFeature(child.featureKey, true);
                    return roleAllowed && moduleAllowed && featureAllowed;
                })
            };
        }
        return item;
    }).filter(item => {
        // Si el item es de tipo menú y quedó sin hijos tras el filtrado, ocultarlo
        if (item.children && item.children.length === 0 && item.href === '#') return false;
        return true;
    });

    const toggleSubmenu = (name: string) => {
        if (expandedItem === name) {
            setExpandedItem(null);
        } else {
            setExpandedItem(name);
        }
    };

    return (
        <>
            {/* Backdrop (mobile only) */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeMobile}
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container — CSS translate based, SSR-safe */}
            <aside
                aria-label="Navegación principal"
                className={cn(
                    "fixed top-0 bottom-0 z-50 flex flex-col overflow-hidden bg-white text-slate-700 border-r border-slate-200 shadow-sm dark:bg-[#0A192F] dark:text-white dark:border-[#15233A] dark:shadow-xl",
                    "transition-[transform,width] duration-300 ease-out will-change-transform",
                    // Mobile: slide in/out
                    mobileOpen ? "translate-x-0" : "-translate-x-full",
                    // Desktop: always visible, never translated
                    "lg:translate-x-0",
                    // Width
                    collapsed ? "w-[80px]" : "w-[220px]"
                )}
            >
                {/* Logo Section */}
                <div className={cn(
                    "h-20 flex items-center border-b border-slate-100 dark:border-white/5 transition-all duration-300",
                    collapsed ? "justify-center px-0" : "px-6"
                )}>
                    {tenant?.logo_url ? (
                        // Logo del crematorio tal cual: sin fondo ni recorte, así un PNG
                        // transparente se ve limpio en ambos modos.
                        <img
                            src={tenant.logo_url.startsWith('http') ? tenant.logo_url : `${API_URL}${tenant.logo_url}`}
                            alt={tenant?.short_name || 'Logo'}
                            className="w-10 h-10 object-contain shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 bg-gradient-to-tr from-[#0EA5E9] to-[#10B981]">
                            <Heart size={18} className="fill-white text-white" />
                        </div>
                    )}
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="ml-3 truncate"
                        >
                            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white block truncate">
                                {tenant?.short_name || 'Vinzer'}
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-5 px-3 overflow-y-auto overflow-x-hidden">
                    {loadingModules ? (
                        <div className="flex flex-col gap-3 px-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-10 w-full bg-slate-100 dark:bg-white/5 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="px-4 py-6 text-center">
                            <AlertCircle className="mx-auto text-red-400 mb-2" size={24} />
                            <p className="text-xs text-slate-400 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-xs bg-primary/15 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/25 transition-colors font-bold"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : NAV_GROUPS.map((group, gi) => {
                        const groupItems = filteredNavItems.filter((it) => it.group === group.key);
                        if (groupItems.length === 0) return null;
                        return (
                            <div key={group.key} className={cn(gi > 0 && "pt-4")}>
                                {collapsed ? (
                                    gi > 0 && <div className="mx-3 mb-3 border-t border-slate-200 dark:border-white/10" />
                                ) : (
                                    <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                        {group.label}
                                    </p>
                                )}
                                <div className="space-y-1">
                    {groupItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedItem === item.name;
                        const matchesPath = (href?: string) =>
                            !!href && href !== '#' && (
                                href === '/dashboard'
                                    ? pathname === '/dashboard'
                                    : (pathname === href || pathname.startsWith(href + '/'))
                            );
                        const firstChildHref = item.children?.[0]?.href;
                        const sectionBase = hasChildren
                            ? (item.href !== '#'
                                ? item.href
                                : (firstChildHref && firstChildHref.startsWith('/')
                                    ? firstChildHref.split('/').slice(0, 3).join('/')
                                    : undefined))
                            : item.href;
                        const isActive = matchesPath(sectionBase) ||
                            (hasChildren && item.children?.some(child => matchesPath(child.href)));

                        const itemLocked = subscriptionLocked && !isModuleAllowedWhenLocked(item.moduleKey);
                        if (itemLocked) {
                            return (
                                <div key={item.name}>
                                    <button
                                        onClick={() => setLockedNotice(true)}
                                        title="Bloqueado: regulariza tu pago para reactivar este módulo"
                                        className={cn(
                                            "w-full flex items-center p-2.5 rounded-xl transition-all duration-200 group relative select-none cursor-not-allowed text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/[0.02]",
                                            collapsed ? "justify-center" : "justify-between"
                                        )}
                                    >
                                        <div className="flex items-center min-w-0">
                                            <item.icon size={19} className="shrink-0 opacity-40" />
                                            {!collapsed && (
                                                <span className="ml-3 font-semibold text-xs whitespace-nowrap truncate">{item.name}</span>
                                            )}
                                        </div>
                                        {!collapsed && <Lock size={13} className="shrink-0 opacity-40" />}
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div key={item.name}>
                                {hasChildren ? (
                                    <button
                                        onClick={() => !collapsed && toggleSubmenu(item.name)}
                                        className={cn(
                                            "w-full flex items-center p-2.5 rounded-xl transition-all duration-200 group relative select-none text-xs",
                                            (isActive || isExpanded) ? "text-white bg-primary font-bold shadow-md shadow-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-none" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white font-medium",
                                            collapsed ? "justify-center" : "justify-between"
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <item.icon size={19} className={cn("shrink-0 transition-colors", (isActive || isExpanded) ? "text-white dark:text-emerald-300" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white")} />
                                            {!collapsed && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -6 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="ml-3 font-semibold whitespace-nowrap"
                                                >
                                                    {item.name}
                                                </motion.span>
                                            )}
                                        </div>
                                        {!collapsed && (
                                            <ChevronDown
                                                size={14}
                                                className={cn("transition-transform duration-200", (isActive || isExpanded) ? "text-white dark:text-emerald-300" : "text-slate-400", isExpanded ? "rotate-180" : "")}
                                            />
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center p-2.5 rounded-xl transition-all duration-200 group relative text-xs",
                                            isActive
                                                ? "bg-primary text-white font-bold shadow-md shadow-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-none"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white font-medium",
                                            collapsed ? "justify-center" : ""
                                        )}
                                    >
                                        <item.icon size={19} className={cn("shrink-0 transition-colors", isActive ? "text-white dark:text-emerald-300" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white")} />
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -6 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="ml-3 font-semibold whitespace-nowrap"
                                            >
                                                {item.name}
                                            </motion.span>
                                        )}
                                    </Link>
                                )}

                                {/* Submenu */}
                                <AnimatePresence>
                                    {!collapsed && hasChildren && isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-slate-200 dark:border-white/10 ml-5 my-1">
                                                {item.children?.map((child) => {
                                                    const isChildActive = child.href === sectionBase
                                                        ? pathname === child.href
                                                        : matchesPath(child.href);
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            className={cn(
                                                                "flex items-center py-1.5 px-2.5 rounded-lg text-xs transition-colors",
                                                                isChildActive
                                                                    ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-white/5 font-bold"
                                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 font-medium"
                                                                )}
                                                        >
                                                            <child.icon size={14} className={cn("mr-2 shrink-0", isChildActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                                                            {child.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Footer Perfil de Usuario como en la imagen */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 dark:border-white/5 dark:bg-[#081527]">
                    <div className={cn("flex items-center gap-2.5", collapsed ? "justify-center" : "px-2 py-1")}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#19B5FE] to-[#10B981] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        {!collapsed && (
                            <div className="min-w-0 flex-1 truncate">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Administrador'}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate capitalize">{user?.role || 'Admin'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Aviso de módulo bloqueado por suscripción vencida */}
            <AnimatePresence>
                {lockedNotice && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLockedNotice(false)} />
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative z-10 w-full max-w-md bg-[#0a192f] border border-white/10 rounded-3xl shadow-2xl p-8 text-center"
                        >
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/15 border border-red-400/20 flex items-center justify-center mb-5">
                                <Lock size={30} className="text-red-300" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">Módulo bloqueado</h3>
                            <p className="text-white/60 text-sm leading-relaxed mb-6">
                                Tu suscripción venció y el período de gracia finalizó. Regulariza tu pago para reactivar este módulo.
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link
                                    href="/dashboard/configuracion"
                                    onClick={() => setLockedNotice(false)}
                                    className="w-full py-3 rounded-xl font-bold text-white bg-primary hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    <CreditCardIcon size={18} /> Ir a Facturación
                                </Link>
                                <button
                                    onClick={() => setLockedNotice(false)}
                                    className="w-full py-2.5 rounded-xl font-bold text-white/60 hover:text-white bg-transparent border border-white/10 hover:bg-white/5 transition-all text-sm"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

