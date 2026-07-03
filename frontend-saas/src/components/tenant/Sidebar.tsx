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
    Compass,
    Stamp,
    Lock,
    CreditCard as CreditCardIcon
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
    children?: NavItem[];
    allowedRoles?: string[]; // Opcional: restringir visibilidad por rol
}

const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
    { name: 'Clientes', href: '/dashboard/clientes', icon: Users, moduleKey: 'clientes' },
    { name: 'Mascotas', href: '/dashboard/mascotas', icon: Dog, moduleKey: 'mascotas' },
    { name: 'Gestionar Servicios', href: '/dashboard/gestion-servicios', icon: Palette, moduleKey: 'servicios' },
    { name: 'Asignar Servicios', href: '/dashboard/asignacion-servicios', icon: Flame, moduleKey: 'ordenes' },
    {
        name: 'Inventario',
        href: '#',
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
        icon: FileText,
        moduleKey: 'certificados',
        children: [
            { name: 'Emitir Certificado', href: '/dashboard/documentos', icon: Stamp, featureKey: 'certificados:generar_pdf' },
            { name: 'Repositorio', href: '/dashboard/documentos/repositorio', icon: FileText, featureKey: 'certificados:repositorio' },
            { name: 'Catálogo Diseños', href: '/dashboard/documentos/disenos', icon: Palette, featureKey: 'certificados:diseno' },
        ]
    },
    {
        name: 'Operaciones',
        href: '#',
        icon: Briefcase,
        moduleKey: 'operaciones',
        children: [
            { name: 'Panel de Trabajo', href: '/dashboard/operaciones/lista', icon: Activity, allowedRoles: ['admin', 'operator', 'driver', 'operador_cremacion'], moduleKey: 'operaciones', featureKey: 'operaciones:panel' },
            { name: 'Crear Seguimiento', href: '/dashboard/operaciones/crear-seguimiento', icon: Compass, moduleKey: 'operaciones', featureKey: 'operaciones:seguimiento:crear' },
        ]
    },
    { name: 'Órdenes Cremación', href: '/dashboard/ordenes-cremacion', icon: CreditCard, moduleKey: 'pagos', featureKey: 'pagos:ver_historial' },
    {
        name: 'Veterinarios',
        href: '#',
        icon: Store,
        moduleKey: 'veterinarios',
        children: [
            { name: 'Listado', href: '/dashboard/partners', icon: Store, featureKey: 'veterinarios:gestionar' },
            { name: 'Comisiones', href: '/dashboard/partners/comisiones', icon: DollarSign, featureKey: 'veterinarios:comisiones:ver' },
            { name: 'Solicitudes', href: '/dashboard/partners/solicitudes', icon: FileText, featureKey: 'veterinarios:solicitudes' },
        ]
    },
    { name: 'Roles y Módulos', href: '/dashboard/roles-modulos', icon: ShieldCheck, moduleKey: 'configuracion', featureKey: 'configuracion:roles' }, // Nuevo
    // 'Configuración' se removió del sidebar: ahora está en el menú de usuario del Navbar.
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
                    "fixed top-0 bottom-0 z-50 flex flex-col glass-card border-r border-white/5 overflow-hidden",
                    "transition-[transform,width] duration-300 ease-out will-change-transform",
                    // Mobile: slide in/out
                    mobileOpen ? "translate-x-0" : "-translate-x-full",
                    // Desktop: always visible, never translated
                    "lg:translate-x-0",
                    // Width
                    collapsed ? "w-[80px]" : "w-[260px]"
                )}
            >
                {/* Logo Section */}
                <div className={cn(
                    "h-20 flex items-center border-b border-white/5 transition-all duration-300",
                    collapsed ? "justify-center px-0" : "px-6"
                )}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative shadow-lg shadow-black/20">
                        {tenant?.logo_url ? (
                            <img
                                src={tenant.logo_url.startsWith('http') ? tenant.logo_url : `${API_URL}${tenant.logo_url}`}
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary flex items-center justify-center">
                                <Flame className="text-primary-foreground" size={24} />
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="ml-3 font-bold text-xl tracking-tight truncate max-w-[160px] text-foreground"
                        >
                            {tenant?.short_name || 'SaaSCrem'}
                            {!tenant?.short_name && <span className="text-primary">.</span>}
                        </motion.span>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
                    {loadingModules ? (
                        <div className="flex flex-col gap-4 px-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-10 w-full bg-white/5 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="px-4 py-6 text-center">
                            <AlertCircle className="mx-auto text-red-400 mb-2" size={24} />
                            <p className="text-xs text-muted-foreground mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : filteredNavItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedItem === item.name;
                        // Coincidencia por prefijo: una ruta es activa si es exacta o es una
                        // subruta (href + '/...'). Para padres con href '#' derivamos la base
                        // de la sección desde el primer hijo (p. ej. /dashboard/documentos),
                        // así rutas hermanas no listadas (como .../disenos) marcan el módulo.
                        const matchesPath = (href?: string) =>
                            !!href && href !== '#' && (pathname === href || pathname.startsWith(href + '/'));
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

                        // Módulo bloqueado por suscripción vencida (post-gracia):
                        // se muestra con candado y, al hacer clic, avisa de regularizar pago.
                        const itemLocked = subscriptionLocked && !isModuleAllowedWhenLocked(item.moduleKey);
                        if (itemLocked) {
                            return (
                                <div key={item.name}>
                                    <button
                                        onClick={() => setLockedNotice(true)}
                                        title="Bloqueado: regulariza tu pago para reactivar este módulo"
                                        className={cn(
                                            "w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative select-none cursor-not-allowed text-muted-foreground/40 hover:bg-white/[0.03]",
                                            collapsed ? "justify-center" : "justify-between"
                                        )}
                                    >
                                        <div className="flex items-center min-w-0">
                                            <item.icon size={22} className="shrink-0 opacity-50" />
                                            {!collapsed && (
                                                <span className="ml-3 font-medium whitespace-nowrap truncate">{item.name}</span>
                                            )}
                                        </div>
                                        {!collapsed && <Lock size={14} className="shrink-0 opacity-70" />}
                                        {collapsed && (
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-white/10 rounded-md text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-60 flex items-center gap-1.5 text-muted-foreground">
                                                <Lock size={12} /> {item.name}
                                            </div>
                                        )}
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
                                            "w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative select-none",
                                            (isActive || isExpanded) ? "text-foreground bg-white/5" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                                            collapsed ? "justify-center" : "justify-between"
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <item.icon size={22} className={cn("shrink-0", (isActive || isExpanded) ? "text-primary" : "group-hover:scale-110 transition-transform")} />
                                            {!collapsed && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="ml-3 font-medium whitespace-nowrap"
                                                >
                                                    {item.name}
                                                </motion.span>
                                            )}
                                        </div>
                                        {!collapsed && (
                                            <ChevronDown
                                                size={16}
                                                className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}
                                            />
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center p-3 rounded-xl transition-all duration-200 group relative",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                                            collapsed ? "justify-center" : ""
                                        )}
                                    >
                                        <item.icon size={22} className={cn("shrink-0", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="ml-3 font-medium whitespace-nowrap"
                                            >
                                                {item.name}
                                            </motion.span>
                                        )}
                                        {collapsed && (
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-white/10 rounded-md text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-60">
                                                {item.name}
                                            </div>
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
                                            <div className="pl-10 pr-2 py-1 space-y-1">
                                                {item.children?.map((child) => {
                                                    // El hijo-índice (ruta = base de sección) es prefijo de sus
                                                    // hermanos; para él usamos match exacto y evitamos que se marque
                                                    // activo en las subrutas hermanas.
                                                    const isChildActive = child.href === sectionBase
                                                        ? pathname === child.href
                                                        : matchesPath(child.href);
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            className={cn(
                                                                "flex items-center py-2 px-3 rounded-lg text-sm transition-colors",
                                                                isChildActive
                                                                    ? "text-primary font-medium bg-primary/10"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                                            )}
                                                        >
                                                            <child.icon size={16} className="mr-2 opacity-70" />
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
                </nav>

                {/* Footer / Toggle */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "w-full flex items-center p-2 rounded-lg hover:bg-white/5 text-muted-foreground hidden lg:flex transition-all",
                            collapsed ? "justify-center" : "justify-center"
                        )}
                    >
                        {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center"><ChevronLeft size={20} /> <span className="ml-2 text-sm italic">Contraer</span></div>}
                    </button>
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

