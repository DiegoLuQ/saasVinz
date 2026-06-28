"use client";

import React, { useState, useEffect } from 'react';
import {
    Settings,
    Activity,
    Bell,
    CreditCard,
    Building2,
    Box,
    RefreshCcw,
    MessageCircle,
    Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTheme } from '@/app/(tenant)/tenant/context/ThemeContext';
import { usePolar } from '@/hooks/usePolar';
import { apiRequest } from '@/lib/tenant/api';
import DeactivateTenantModal from '@/components/tenant/modals/DeactivateTenantModal';

import { GeneralTab } from '@/components/tenant/settings/GeneralTab';
import { NotificationsTab } from '@/components/tenant/settings/NotificationsTab';
import { MaintenanceTab } from '@/components/tenant/settings/MaintenanceTab';
import { WorkflowTab } from '@/components/tenant/settings/WorkflowTab';
import { BillingTab } from '@/components/tenant/settings/BillingTab';
import { CertificatesTab } from '@/components/tenant/settings/CertificatesTab';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { themeMode } = useTheme();
    const { openPortal } = usePolar();
    
    const { data: bootstrapData, isLoading: bootstrapLoading } = useSessionBootstrap();
    const bootstrapUser = bootstrapData?.user;
    const bootstrapTenant = bootstrapData?.tenant;

    const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

    useEffect(() => {
        if (!bootstrapLoading && !bootstrapUser) {
            router.push('/login');
            return;
        }

        if (bootstrapUser && bootstrapUser.role !== 'admin' && bootstrapUser.role !== 'creator') {
            router.push('/dashboard');
            showToast('No tienes permisos para acceder a esta sección', 'error');
        }
    }, [bootstrapUser, bootstrapLoading, router, showToast]);

    const tabs = [
        { id: 'general', name: 'General', icon: Building2 },
        { id: 'notificaciones', name: 'Notificaciones', icon: Bell },
        { id: 'certificados', name: 'Certificados', icon: Award },
        { id: 'facturacion', name: 'Facturación', icon: CreditCard },
        { id: 'flujo', name: 'Flujo Operativo', icon: Activity },
    ];

    const handleDeactivateTenant = async () => {
        try {
            await apiRequest('/api/internal/tenants/me/deactivate', {
                method: 'POST'
            });
            showToast('La renovación automática ha sido cancelada correctamente. Mantendrás acceso hasta el fin de tu periodo.', 'success');
            setDeactivateModalOpen(false);

            queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
        } catch (err: any) {
            showToast(err.message || 'Error al desactivar la cuenta', 'error');
        }
    };

    if (bootstrapLoading || !bootstrapTenant) {
        return <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>;
    }

    return (
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto animate-fade-in pb-20 px-3 sm:px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 pb-6 border-b border-white/5">
                <div className="flex items-start gap-5 min-w-0">
                    <div className="space-y-1 min-w-0">
                        <div className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded w-fit mb-2">Configuración de Instancia</div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight truncate">
                            {bootstrapTenant.name || 'Cargando...'}
                        </h1>
                        <div className="flex items-center gap-4 text-white/40 text-sm font-medium">
                            <span className="flex items-center gap-1.5 truncate"><Box size={14} className="text-blue-400 shrink-0" /> Slug: /{bootstrapTenant.slug}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {activeTab === 'facturacion' && (
                        <a
                            href="https://wa.me/56912345678?text=Hola,%20necesito%20ayuda%20con%20mi%20plan%20de%20facturaci%C3%B3n"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold min-h-[44px] py-3 px-6 sm:px-8 rounded-2xl flex items-center justify-center shadow-lg shadow-[#25D366]/20 hover:shadow-[#25D366]/40 transition-all text-sm"
                        >
                            <MessageCircle className="mr-2" size={18} />
                            Contactar por WhatsApp
                        </a>
                    )}
                </div>
            </div>

            <div className="flex flex-col space-y-6 sm:space-y-8">
                {/* Tabs scroller with fade edges to indicate horizontal scroll */}
                <div className="relative -mx-3 sm:mx-0">
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 sm:hidden" />
                    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 sm:hidden" />
                    <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-[2rem] border border-white/5 w-max overflow-x-auto max-w-full mx-3 sm:mx-0 no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-4 sm:px-5 py-2.5 min-h-[44px] rounded-[1.5rem] transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon size={16} className="mr-2" />
                                <span className="font-extrabold text-[11px] uppercase tracking-wider">{tab.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full space-y-10">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-10 space-y-8 md:space-y-10"
                    >
                        {activeTab === 'general' && (
                            <GeneralTab 
                                bootstrapTenant={bootstrapTenant}
                                billingInfo={bootstrapData?.tenant}
                                onNavigateToBilling={() => setActiveTab('facturacion')}
                                setDeactivateModalOpen={setDeactivateModalOpen}
                            />
                        )}

                        {activeTab === 'notificaciones' && (
                            <NotificationsTab />
                        )}

                        {activeTab === 'flujo' && (
                            <div className="space-y-12">
                                <WorkflowTab />
                                <div className="h-px bg-white/5 w-full" />
                                <MaintenanceTab />
                            </div>
                        )}

                        {activeTab === 'facturacion' && (
                            <BillingTab 
                                bootstrapTenant={bootstrapTenant} 
                                bootstrapData={bootstrapData} 
                                bootstrapUser={bootstrapUser} 
                            />
                        )}

                        {activeTab === 'certificados' && (
                            <CertificatesTab bootstrapTenant={bootstrapTenant} />
                        )}
                    </motion.div>
                </div>

                <DeactivateTenantModal
                    isOpen={deactivateModalOpen}
                    onClose={() => setDeactivateModalOpen(false)}
                    onConfirm={handleDeactivateTenant}
                />
            </div>
        </div>
    );
}
