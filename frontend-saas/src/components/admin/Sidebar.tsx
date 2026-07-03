import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Plus,
    Shield,
    ChevronLeft,
    ChevronRight,
    Wrench,
    ChevronDown,
    CheckCircle,
    Briefcase,
    CreditCard,
    Bell,
    Palette,
    Library,
    Building2,
    BookOpen,
    Heart,
    ImageIcon,
    Receipt,
    Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminVets, useAdminMetadata, useAdminSaasConfig } from '@/hooks/useAdminBootstrap';

interface SidebarProps {
    onLogout: () => void;
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    /* En <lg el sidebar es un drawer off-canvas: estas props controlan su apertura */
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

export default function Sidebar({ onLogout, isCollapsed: isCollapsedProp, setIsCollapsed, isMobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();

    // Con el drawer móvil abierto el sidebar se muestra siempre expandido
    // (labels visibles), aunque la preferencia guardada de desktop sea colapsado.
    const isCollapsed = isCollapsedProp && !isMobileOpen;

    // Cerrar el drawer móvil al navegar a otra página
    React.useEffect(() => {
        onMobileClose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const vets = useAdminVets();
    const metadata = useAdminMetadata();
    const saasConfig = useAdminSaasConfig();
    const loadingVets = !vets;
    const unreadCount = metadata?.unread_notifications || 0;

    const sections = React.useMemo(() => [
        {
            title: 'Operaciones',
            items: [
                { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { href: '/dashboard/tenants', icon: Building2, label: 'Tenants (Empresas)' },
                { href: '/dashboard/widgets', icon: Code2, label: 'Widgets Web' },
                {
                    href: '/dashboard/memorials',
                    icon: BookOpen,
                    label: 'Recuerdos Globales',
                    subItems: [
                        { href: '/dashboard/memorials', label: 'Listado de Recuerdos' },
                        { href: '/dashboard/fondos-globales', label: 'Fondos y Temas' },
                    ]
                },
                {
                    href: '/dashboard/veterinaries',
                    icon: Briefcase,
                    label: 'Veterinarias Globales',
                    subItems: loadingVets
                        ? [{ href: '#', label: 'Cargando...' }]
                        : [
                            ...vets.slice(0, 10).map(v => ({
                                href: `/dashboard/veterinaries?id=${v.id}`,
                                label: v.name
                            })),
                            { href: '/dashboard/veterinaries', label: 'Ver Todas →' }
                        ]
                },
            ]
        },
        {
            title: 'Comercial',
            items: [
                { href: '/dashboard/transacciones', icon: Receipt, label: 'Transacciones y Recibos' },
                {
                    href: '/dashboard/suscripciones',
                    icon: CreditCard,
                    label: 'Suscripciones & Cobros',
                    subItems: [
                        { href: '/dashboard/suscripciones', label: 'Dashboard de Cobros' },
                        { href: '/dashboard/suscripciones/listado', label: 'Suscripciones de Tenants' },
                        { href: '/dashboard/suscripciones/transacciones', label: 'Historial de Cobros' },
                        { href: '/dashboard/suscripciones/cupones', label: 'Cupones de Descuento' },
                        { href: '/dashboard/recibos', label: 'Recibos Generados' },
                    ]
                },
                { href: '/dashboard/planes', icon: Plus, label: 'Configuración de Planes' },
            ]
        },
        {
            title: 'Contenido',
            items: [
                { href: '/dashboard/disenos', icon: Palette, label: 'Diseños de Documentos' },
                { href: '/dashboard/despedidas', icon: Heart, label: 'Plantillas de Despedida' },
                { href: '/dashboard/plantillas-imagen', icon: ImageIcon, label: 'Plantillas de Imagen' },
                { href: '/dashboard/biblioteca', icon: Library, label: 'Biblioteca de Medios' },
            ]
        },
        {
            title: 'Sistema',
            items: [
                { href: '/dashboard/roles', icon: Shield, label: 'Gestión de Roles' },
                { href: '/dashboard/roles-blueprint', icon: Shield, label: 'Roles y Módulos (Blueprint)' },
                { href: '/dashboard/notificaciones', icon: Bell, label: 'Notificaciones' },
                {
                    href: '/dashboard/mantencion',
                    icon: Wrench,
                    label: 'Mantención SaaS',
                    subItems: [
                        { href: '/dashboard/mantencion', label: 'Dashboard General' },
                        { href: '/dashboard/mantencion/logs', label: 'Logs del Sistema' },
                    ]
                },
                { href: '/dashboard/configuracion', icon: Settings, label: 'Configuración Global' },
            ]
        },
    ], [vets, loadingVets]);

    const allItems = React.useMemo(() => sections.flatMap(s => s.items), [sections]);

    const [openMenus, setOpenMenus] = useState<string[]>([]);

    const toggleMenu = (label: string) => {
        setOpenMenus(prev =>
            prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
        );
    };

    // Auto-open menus that contain the current path
    React.useEffect(() => {
        const activeMenus = allItems
            .filter(item => 'subItems' in item && item.subItems?.some(sub => pathname === sub.href))
            .map(item => item.label);

        if (activeMenus.length === 0) return;

        setOpenMenus(prev => {
            // Idempotent: if every active menu is already open, return the
            // same reference so React bails out of the re-render. Without
            // this, `Array.from(new Set(...))` produces a new array on every
            // render and feeds an infinite loop whenever `allItems` changes
            // reference upstream.
            if (activeMenus.every(label => prev.includes(label))) return prev;
            return Array.from(new Set([...prev, ...activeMenus]));
        });
    }, [pathname, allItems]);

    return (
        <>
        {/* Backdrop del drawer móvil */}
        {isMobileOpen && (
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
                onClick={onMobileClose}
                aria-hidden="true"
            />
        )}
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? '80px' : '288px' }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            /* max-lg: drawer off-canvas de ancho fijo (el ! pisa el width inline de
               framer-motion); en lg+ se mantiene el comportamiento colapsable */
            className={`bg-[#0a192f] border-r border-white/5 flex flex-col fixed h-full z-30
                max-lg:!w-72 max-lg:transition-transform max-lg:duration-300
                ${isMobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}`}
        >
            {/* Header / Logo */}
            <div className={`p-6 border-b border-white/5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className="flex items-center gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${saasConfig?.logo ? '' : 'bg-primary shadow-lg shadow-primary/20'}`}>
                        {saasConfig?.logo ? (
                            <img
                                src={`/${saasConfig.logo}`}
                                alt="SaaS Logo"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <Shield className="text-white" size={24} />
                        )}
                    </div>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="whitespace-nowrap"
                        >
                            <h1 className="font-bold text-white tracking-tight text-sm uppercase truncate max-w-[160px]">
                                {saasConfig?.name || 'SAAS ADMIN'}
                            </h1>
                            <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Creator Portal</p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Toggle Button (solo desktop: en móvil el drawer se cierra con el backdrop) */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block absolute -right-3 top-20 bg-primary text-white p-1 rounded-full shadow-lg z-40 hover:scale-110 active:scale-95 transition-all"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Nav Items */}
            <nav className="flex-1 p-4 mt-4 overflow-y-auto custom-scrollbar">
                {sections.map((section, idx) => (
                    <div key={section.title} className={idx > 0 ? (isCollapsed ? 'mt-3 pt-3 border-t border-white/5' : 'mt-5') : ''}>
                        {!isCollapsed && (
                            <div className="px-3 pb-2 text-[10px] uppercase font-bold text-white/30 tracking-widest">
                                {section.title}
                            </div>
                        )}
                        <div className="space-y-2">
                {section.items.map((item: any) => {
                    const isActive = pathname === item.href || (item.subItems?.some((s: any) => pathname === s.href));
                    const isSubMenuOpen = openMenus.includes(item.label);
                    const isAnySubActive = item.subItems?.some((s: any) => pathname === s.href);
                    const Icon = item.icon;


                    if (item.subItems && !isCollapsed) {
                        return (
                            <div key={item.label} className="space-y-1">
                                <button
                                    onClick={() => toggleMenu(item.label)}
                                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all font-medium group relative ${isActive
                                        ? 'bg-primary/10 text-white border border-white/5'
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-white transition-colors'} />
                                        <span className="text-sm">{item.label}</span>
                                    </div>
                                    <ChevronDown
                                        size={14}
                                        className={`transition-transform duration-300 ${isSubMenuOpen ? 'rotate-180' : ''} text-white/20`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {isSubMenuOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-black/20 rounded-xl"
                                        >
                                                            {item.subItems.map((sub: any) => (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className={`flex items-center gap-3 pl-11 pr-3 py-2 text-xs font-bold transition-all ${pathname === sub.href ? 'text-primary' : 'text-white/30 hover:text-white'
                                                        }`}
                                                >
                                                    <div className={`w-1 h-1 rounded-full ${pathname === sub.href ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'bg-white/10'}`} />
                                                    {sub.label}
                                                </Link>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.label : ''}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium group relative ${isActive
                                ? 'bg-primary/10 text-white border border-primary/20 shadow-sm'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-white transition-colors'} />
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className="whitespace-nowrap text-sm flex-1 flex justify-between items-center"
                                >
                                    {item.label}
                                    {item.label === 'Notificaciones' && unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </motion.span>
                            )}

                            {/* Tooltip for collapsed mode */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-3 py-2 bg-primary text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                                    {item.label}
                                    {item.subItems && (
                                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                                            {item.subItems.map((s: any) => (
                                                <div key={s.href} className="text-[10px] text-white/60">• {s.label}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Link>
                    );
                })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={onLogout}
                    className={`flex items-center gap-3 px-3 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition-all font-bold w-full group relative ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <LogOut size={20} />
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="text-sm"
                        >
                            Cerrar Sesión
                        </motion.span>
                    )}

                    {isCollapsed && (
                        <div className="absolute left-full ml-4 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-red-500/10">
                            Cerrar Sesión
                        </div>
                    )}
                </button>
            </div>
        </motion.aside>
        </>
    );
}
