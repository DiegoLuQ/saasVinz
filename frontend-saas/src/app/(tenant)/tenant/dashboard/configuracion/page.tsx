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
    Award,
    ClipboardList,
    Coins,
    Wand2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTheme } from '@/app/(tenant)/tenant/context/ThemeContext';
import { usePolar } from '@/hooks/usePolar';
import { useFeatures } from '@/hooks/useFeatures';
import { CONFIG_TAB_FEATURES, CONFIG_TAB_MODULES } from '@/hooks/useCanOpen';
import { apiRequest } from '@/lib/tenant/api';
import DeactivateTenantModal from '@/components/tenant/modals/DeactivateTenantModal';

import { GeneralTab } from '@/components/tenant/settings/GeneralTab';
import { NotificationsTab } from '@/components/tenant/settings/NotificationsTab';
import { PublicFormTab } from '@/components/tenant/settings/PublicFormTab';
import { WorkflowTab } from '@/components/tenant/settings/WorkflowTab';
import { BillingTab } from '@/components/tenant/settings/BillingTab';
import { CertificatesTab } from '@/components/tenant/settings/CertificatesTab';
import { AiCreditsTab } from '@/components/tenant/settings/AiCreditsTab';
import { AutoDocumentsTab } from '@/components/tenant/settings/AutoDocumentsTab';

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

    // Abre la pestaña indicada en la URL (?tab=…, p. ej. desde una notificación).
    // Se sincroniza durante el render cuando cambia el parámetro.
    const urlTab = searchParams.get('tab');
    const [syncedUrlTab, setSyncedUrlTab] = useState<string | null>(null);
    if (urlTab !== syncedUrlTab) {
        setSyncedUrlTab(urlTab);
        if (urlTab) setActiveTab(urlTab);
    }

    // Configuración está en todos los planes (General, Facturación y Notificaciones
    // siempre); las demás pestañas dependen de una característica del plan
    // (admin → "Configurar Características"; sin el flag se muestran, como el menú)
    // o de un módulo del plan (Certificados). Ver hooks/useCanOpen.ts.
    const { hasFeature } = useFeatures();
    const activeModules = (bootstrapData?.rbac.modules ?? []).filter(m => m.is_active).map(m => m.module_key);
    const tabAllowed = (id: string) =>
        (!CONFIG_TAB_FEATURES[id] || hasFeature(CONFIG_TAB_FEATURES[id], true))
        && (!CONFIG_TAB_MODULES[id] || activeModules.includes(CONFIG_TAB_MODULES[id]));
    const currentTab = tabAllowed(activeTab) ? activeTab : 'general';

    // Agrupadas por tema: menú lateral en pantallas grandes, chips en móvil.
    const allTabGroups = [
        {
            label: 'Empresa',
            tabs: [
                { id: 'general', name: 'General', hint: 'Datos, logo y contacto', icon: Building2 },
                { id: 'facturacion', name: 'Facturación', hint: 'Plan y pagos', icon: CreditCard },
                { id: 'notificaciones', name: 'Notificaciones', hint: 'Historial de avisos', icon: Bell },
            ],
        },
        {
            label: 'Operación',
            tabs: [
                { id: 'flujo', name: 'Flujo Operativo', hint: 'Etapas del servicio', icon: Activity },
                { id: 'formulario', name: 'Formulario y Pesos', hint: 'Formulario público y tramos', icon: ClipboardList },
            ],
        },
        {
            label: 'Documentos',
            tabs: [
                { id: 'certificados', name: 'Certificados', hint: 'Plantilla y textos', icon: Award },
                { id: 'documentos-auto', name: 'Documentos automáticos', hint: 'Plantillas de «Generar todo»', icon: Wand2 },
            ],
        },
        {
            label: 'Inteligencia artificial',
            tabs: [
                { id: 'creditos', name: 'Compra de créditos', hint: 'Saldo y compras', icon: Coins },
            ],
        },
    ];
    const tabGroups = allTabGroups
        .map(g => ({ ...g, tabs: g.tabs.filter(t => tabAllowed(t.id)) }))
        .filter(g => g.tabs.length > 0);
    const tabs = tabGroups.flatMap(g => g.tabs);

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
                    {currentTab === 'facturacion' && (
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

            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8 lg:items-start">
                {/* Menú de secciones: chips en móvil/tablet, menú lateral agrupado en escritorio */}
                <nav aria-label="Secciones de configuración" className="lg:sticky lg:top-24">
                    <div className="flex flex-wrap gap-2 lg:hidden">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                aria-current={currentTab === tab.id ? 'page' : undefined}
                                className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border text-xs font-bold transition-colors ${currentTab === tab.id
                                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 dark:bg-white/5 dark:text-white/60 dark:border-white/10 dark:hover:text-white'
                                    }`}
                            >
                                <tab.icon size={14} />
                                {tab.name}
                            </button>
                        ))}
                    </div>

                    <div className="hidden lg:block rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
                        {tabGroups.map((group, gi) => (
                            <div key={group.label} className={gi > 0 ? 'mt-3 pt-3 border-t border-slate-100 dark:border-white/5' : ''}>
                                <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-white/30">{group.label}</p>
                                <div className="space-y-0.5">
                                    {group.tabs.map((tab) => {
                                        const active = currentTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                aria-current={active ? 'page' : undefined}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${active
                                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                                    : 'text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/50'}`}>
                                                    <tab.icon size={16} />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-bold leading-tight truncate">{tab.name}</span>
                                                    <span className={`block text-[11px] leading-tight truncate ${active ? 'text-white/75' : 'text-slate-400 dark:text-white/35'}`}>{tab.hint}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="w-full space-y-10">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-10 space-y-8 md:space-y-10"
                    >
                        {currentTab === 'general' && (
                            <GeneralTab 
                                bootstrapTenant={bootstrapTenant}
                                billingInfo={bootstrapData?.tenant}
                                onNavigateToBilling={() => setActiveTab('facturacion')}
                                setDeactivateModalOpen={setDeactivateModalOpen}
                            />
                        )}

                        {currentTab === 'notificaciones' && (
                            <NotificationsTab />
                        )}

                        {currentTab === 'flujo' && (
                            <WorkflowTab />
                        )}

                        {currentTab === 'formulario' && (
                            <PublicFormTab />
                        )}

                        {currentTab === 'facturacion' && (
                            <BillingTab 
                                bootstrapTenant={bootstrapTenant} 
                                bootstrapData={bootstrapData} 
                                bootstrapUser={bootstrapUser} 
                            />
                        )}

                        {currentTab === 'certificados' && (
                            <CertificatesTab bootstrapTenant={bootstrapTenant} />
                        )}

                        {currentTab === 'documentos-auto' && <AutoDocumentsTab />}

                        {currentTab === 'creditos' && <AiCreditsTab />}
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
