"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users as UsersIcon, Palette, CreditCard, Activity, Plug, History } from 'lucide-react';

interface TenantTabsNavProps {
    slug: string;
    usersCount?: number;
}

export default function TenantTabsNav({ slug, usersCount }: TenantTabsNavProps) {
    const pathname = usePathname();
    const base = `/dashboard/tenants/${slug}`;

    const TABS = [
        { href: base, label: 'Información General', description: 'Datos legales y plan', Icon: Shield, accent: 'text-primary' },
        { href: `${base}/usuarios`, label: 'Personal y Cuentas', description: 'Usuarios con acceso', Icon: UsersIcon, accent: 'text-blue-400', badge: usersCount },
        { href: `${base}/branding`, label: 'Branding y Seguridad', description: 'Logo y clave maestra', Icon: Palette, accent: 'text-pink-400' },
        { href: `${base}/facturacion`, label: 'Facturación', description: 'Plan, ciclo y notificaciones', Icon: CreditCard, accent: 'text-green-400' },
        { href: `${base}/uso`, label: 'Uso y Cuotas', description: 'Recursos vs límites del plan', Icon: Activity, accent: 'text-amber-400' },
        { href: `${base}/integraciones`, label: 'Integraciones', description: 'Polar, R2, Mail', Icon: Plug, accent: 'text-purple-400' },
        { href: `${base}/auditoria`, label: 'Auditoría', description: 'Historial de eventos', Icon: History, accent: 'text-rose-400' },
    ];

    return (
        <div className="border-b border-white/5">
            <div className="flex flex-wrap gap-1">
                {TABS.map(tab => {
                    const isActive = tab.href === base
                        ? pathname === base
                        : pathname === tab.href || pathname?.startsWith(tab.href + '/');
                    const Icon = tab.Icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`relative px-5 py-4 flex items-center gap-3 font-bold text-sm transition-all border-b-2 ${
                                isActive
                                    ? 'border-primary text-white'
                                    : 'border-transparent text-white/40 hover:text-white/70'
                            }`}
                        >
                            <Icon size={18} className={isActive ? tab.accent : ''} />
                            <div className="text-left">
                                <div className="leading-tight">
                                    {tab.label}
                                    {typeof tab.badge === 'number' && (
                                        <span className="ml-2 text-[10px] font-black bg-white/10 text-white/60 px-1.5 py-0.5 rounded">
                                            {tab.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                                    {tab.description}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
