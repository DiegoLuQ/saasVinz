"use client";

import React, { useState, useMemo } from 'react';
import {
    Sparkles,
    Copy,
    Check,
    ExternalLink,
    Lock,
    Globe,
    Settings,
    MessageCircle,
    RotateCw,
    ShieldCheck,
    Heart,
    Loader2,
    Share2,
    BookHeart,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/tenant/api';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { getPublicMemorialPath } from '@/lib/memorialUrls';
import { getMemorialBaseUrl } from '@/lib/publicUrls';
import {
    MEMORIAL_SCENARIOS,
    normalizeScenarioId,
    isProOrUltraCrematoryPlan,
    type MemorialScenarioId,
} from '@/lib/memorialDesign';
import MemorialSetupModal from '@/components/tenant/memorials/MemorialSetupModal';

interface Props {
    orderId?: number | null;
    pet: {
        id?: number | null;
        name?: string | null;
        photos?: string[];
        dedication?: string | null;
        [key: string]: any;
    };
    customer?: {
        name?: string | null;
        phone?: string | null;
        email?: string | null;
    } | null;
    deliverableMemorial?: {
        uuid: string;
        status: string;
        access_key?: string;
        scenario?: string;
        short_code?: string | null;
    } | null;
    onUpdated?: () => void;
}

export default function MemorialOrderSection({
    orderId,
    pet,
    customer,
    deliverableMemorial,
    onUpdated,
}: Props) {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const tenantCtx = useTenant();
    const tenant: any = tenantCtx?.tenantData || (tenantCtx as any)?.tenant || null;

    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);
    const [copiedGestion, setCopiedGestion] = useState(false);
    const [resettingPin, setResettingPin] = useState(false);

    const petId = pet?.id;
    const petName = (pet?.name || 'la mascota').trim();

    const planName =
        tenant?.subscription_plan?.name ||
        (typeof tenant?.plan === 'string' ? tenant.plan : tenant?.plan?.name) ||
        'PRO';

    const isProOrUltra = useMemo(() => {
        if (tenant?.plan?.can_use_memorial === true) return true;
        return isProOrUltraCrematoryPlan(planName);
    }, [tenant, planName]);

    // Consulta de datos completos del memorial
    const { data: memorial, isLoading, refetch } = useQuery({
        queryKey: ['tenant', 'memorial', petId],
        queryFn: async () => {
            if (!petId) return null;
            return await apiRequest('/api/internal/memorials', {
                method: 'POST',
                body: {
                    id_mascota: petId,
                    msg_despedida: `En memoria de nuestro querido ${petName}. Siempre vivirás en nuestros corazones.`,
                    es_privado: false,
                    diseno: {
                        tipo_diseno: 'normal',
                        tema: 'claro',
                        particulas: 'estrellas',
                        color_fondo: '',
                        portada_url: '',
                    },
                },
            });
        },
        enabled: !!petId,
        staleTime: 30_000,
    });

    const activeUuid = memorial?.id_recuerdo || deliverableMemorial?.uuid;
    const activePin = memorial?.access_key || deliverableMemorial?.access_key;
    const currentScenarioId = normalizeScenarioId(memorial?.diseno?.tipo_diseno || deliverableMemorial?.scenario);
    const scenarioConfig = MEMORIAL_SCENARIOS.find((s) => s.id === currentScenarioId) || MEMORIAL_SCENARIOS[0];

    // Construcción de URLs públicas y privadas
    // memorial.<dominio actual> (vinzer.cl en producción, lvh.me en local)
    const memorialBase = getMemorialBaseUrl();

    const publicPath = activeUuid
        ? getPublicMemorialPath({
              id_recuerdo: activeUuid,
              tenantSlug: tenant?.slug || tenant?.name || 'memorial',
              petName: petName,
              shortCode: memorial?.short_code || deliverableMemorial?.short_code,
          })
        : '';
    const publicUrl = activeUuid ? `${memorialBase}${publicPath}` : '';
    const gestionUrl = activeUuid ? `${memorialBase}/memorials/m/${activeUuid}/gestion` : '';

    const handleCopy = (text: string, type: 'link' | 'pin' | 'gestion') => {
        if (!text) return;
        try {
            navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }

        if (type === 'link') {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
            showToast('Enlace público del memorial copiado.', 'success');
        } else if (type === 'pin') {
            setCopiedPin(true);
            setTimeout(() => setCopiedPin(false), 2000);
            showToast('PIN de acceso copiado.', 'success');
        } else {
            setCopiedGestion(true);
            setTimeout(() => setCopiedGestion(false), 2000);
            showToast('Enlace de gestión copiado.', 'success');
        }
    };

    const handleResetPin = async () => {
        if (!activeUuid || resettingPin) return;
        setResettingPin(true);
        try {
            const updated = await apiRequest(`/api/internal/memorials/${activeUuid}/reset-pin`, {
                method: 'POST',
            });
            if (updated) {
                refetch();
                if (onUpdated) onUpdated();
                showToast(`Nuevo PIN generado: ${updated.access_key}`, 'success');
            }
        } catch (err: any) {
            showToast(err?.message || 'Error al restablecer el PIN', 'error');
        } finally {
            setResettingPin(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!activeUuid) return;
        const tenantName = tenant?.name || 'Nuestro Crematorio';
        const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';

        const msg = [
            `Estimada familia de *${petName}*,`,
            ``,
            `Desde *${tenantName}* les enviamos un afectuoso abrazo en este momento tan significativo. Hemos dispuesto un Memorial Online Conmemorativo en su honor para recordar su huella eterna:`,
            ``,
            `🕊️ *Ver Memorial y Encender Vela:*`,
            `${publicUrl}`,
            ``,
            `🔐 *Gestión Familiar de Dedicatorias y Mensajes:*`,
            `${gestionUrl}`,
            `*PIN Exclusivo de la Familia:* \`${activePin || 'Consultar'}\``,
            ``,
            `Con todo nuestro respeto y cariño,`,
            `*${tenantName}*`,
        ].join('\n');

        if (phone && phone.length >= 8) {
            const fullPhone = phone.startsWith('56') ? phone : `56${phone.replace(/^0+/, '')}`;
            window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            // Copiar al portapapeles si no hay número de teléfono registrado
            handleCopy(msg, 'link');
            showToast('Mensaje de condolencia con link y PIN copiado al portapapeles para WhatsApp.', 'info');
        }
    };

    const petForModal = useMemo(() => ({
        id: pet.id,
        name: pet.name,
        image_url: pet.photos?.[0],
        dedication: pet.dedication,
        owner_dedication: pet.dedication,
    }), [pet]);

    return (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 space-y-4">
            {/* Cabecera */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                                Memorial online conmemorativo
                            </h3>
                            {activeUuid && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Activo
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                            Altar digital perpetuo con velas interactivas y dedicatorias de condolencia.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsSetupOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                        <Settings size={13} />
                        <span>Configurar / Editar</span>
                    </button>
                </div>
            </div>

            {/* Contenido según si está cargando o ya disponible */}
            {isLoading ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={16} className="animate-spin text-amber-500" />
                    <span>Cargando configuración del memorial…</span>
                </div>
            ) : activeUuid ? (
                <div className="space-y-3.5">
                    {/* Altar / Escenario Activo y Plan */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                Escenario actual:
                            </span>
                            <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs"
                                style={{
                                    backgroundColor: `${scenarioConfig.accentColor}18`,
                                    color: scenarioConfig.accentColor,
                                    border: `1px solid ${scenarioConfig.accentColor}35`,
                                }}
                            >
                                <span>✦</span>
                                <span>{scenarioConfig.name}</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                                <ShieldCheck size={12} /> Plan {memorial?.plan_name || 'Partner'}
                            </span>
                        </div>
                    </div>

                    {/* Bloque: Link Público y PIN de Acceso */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {/* 1. Enlace Público */}
                        <div className="md:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Globe size={11} className="text-amber-500" />
                                    Enlace público del homenaje
                                </label>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                    Para compartir con amigos y familia
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    readOnly
                                    value={publicUrl}
                                    className="w-full text-xs font-mono bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 truncate select-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopy(publicUrl, 'link')}
                                    title="Copiar enlace público"
                                    className="p-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition shrink-0 cursor-pointer shadow-xs"
                                >
                                    {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                </button>
                                <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Abrir altar en una nueva pestaña"
                                    className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 transition shrink-0 cursor-pointer shadow-xs"
                                >
                                    <ExternalLink size={13} />
                                </a>
                            </div>
                        </div>

                        {/* 2. PIN Familiar */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Lock size={11} className="text-amber-500" />
                                    PIN de Gestión
                                </label>
                                <button
                                    type="button"
                                    onClick={handleResetPin}
                                    disabled={resettingPin}
                                    title="Regenerar PIN"
                                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                    <RotateCw size={10} className={resettingPin ? 'animate-spin' : ''} />
                                    Nuevo
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="flex-1 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-center font-bold text-sm tracking-[0.25em] text-amber-600 dark:text-amber-400 select-all">
                                    {activePin || '------'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(activePin || '', 'pin')}
                                    title="Copiar PIN"
                                    className="p-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition shrink-0 cursor-pointer shadow-xs"
                                >
                                    {copiedPin ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Enlace Privado de Gestión de la Familia */}
                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                                <b>Portal de Gestión Familiar:</b> para moderar dedicatorias y editar mensaje.
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleCopy(gestionUrl, 'gestion')}
                                className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                            >
                                {copiedGestion ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                Copiar link familiar
                            </button>
                            <a
                                href={gestionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition cursor-pointer"
                                title="Abrir portal de gestión"
                            >
                                <ExternalLink size={13} />
                            </a>
                        </div>
                    </div>

                    {/* Botón Principal: Enviar a la Familia por WhatsApp */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2.5">
                        <button
                            type="button"
                            onClick={handleSendWhatsApp}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <MessageCircle size={15} />
                            <span>Enviar Enlace y PIN por WhatsApp</span>
                            {customer?.phone && (
                                <span className="opacity-75 font-normal text-[11px]">
                                    ({customer.phone})
                                </span>
                            )}
                        </button>

                        <p className="text-[10px] text-muted-foreground italic">
                            Los altares disponibles se ajustan automáticamente al plan {planName} de tu crematorio.
                        </p>
                    </div>
                </div>
            ) : (
                /* Estado no configurado aún */
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 text-center space-y-3">
                    <p className="text-xs text-muted-foreground">
                        El memorial conmemorativo de <b>{petName}</b> aún no ha sido activado.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsSetupOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                        <Sparkles size={14} />
                        <span>Activar y Configurar Memorial</span>
                    </button>
                    <p className="text-[10px] text-muted-foreground">
                        Incluye selección de altar (Santuario Sereno, Altar de Luz, Jardín Celestial o Constelación Eterna), velas de condolencia y dedicatoria personalizada.
                    </p>
                </div>
            )}

            {/* Modal de Configuración y Edición de Altar */}
            {isSetupOpen && (
                <MemorialSetupModal
                    isOpen={isSetupOpen}
                    onClose={() => setIsSetupOpen(false)}
                    pet={petForModal}
                    onSuccess={() => {
                        refetch();
                        if (onUpdated) onUpdated();
                        queryClient.invalidateQueries({ queryKey: ['expediente', orderId] });
                    }}
                />
            )}
        </div>
    );
}

