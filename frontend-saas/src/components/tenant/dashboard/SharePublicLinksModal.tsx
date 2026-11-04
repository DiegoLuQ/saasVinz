"use client";

import React, { useState, useEffect } from 'react';
import Modal from '@/components/tenant/Modal';
import { Share2, Copy, Check, MessageCircle, ExternalLink, Globe, BookOpen, Stethoscope, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import { buildCatalogUrl, buildPublicFormUrl } from '@/lib/publicUrls';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { apiRequest } from '@/lib/tenant/api';
import Link from 'next/link';

interface SharePublicLinksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SharePublicLinksModal({ isOpen, onClose }: SharePublicLinksModalProps) {
    const { showToast } = useToast();
    const { tenantData } = useTenant();
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [catalogToken, setCatalogToken] = useState<string | null>(null);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

    const slug = tenantData?.slug || 'crematorio';
    const permToken = tenantData?.public_token;

    // El formulario público SIEMPRE requiere el public_token del tenant para validar el acceso
    const formUrl = permToken ? buildPublicFormUrl(slug, { token: permToken }) : buildPublicFormUrl(slug);
    const catalogUrl = catalogToken ? buildCatalogUrl(slug, catalogToken) : null;

    // Cargar o autogenerar token activo de catálogo de planes cuando se abre el modal
    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        const loadCatalogToken = async () => {
            try {
                setIsLoadingCatalog(true);
                const res = await apiRequest('/api/internal/catalog/links?type=plans');
                if (cancelled) return;

                const active = Array.isArray(res) ? res.find(l => l.is_active && !l.is_expired) : null;
                if (active) {
                    setCatalogToken(active.token);
                } else {
                    // Si aún no tiene un catálogo generado, creamos uno permanente por defecto
                    const created = await apiRequest('/api/internal/catalog/links', {
                        method: 'POST',
                        body: JSON.stringify({
                            catalog_type: 'plans',
                            name: 'Catálogo General de Planes',
                            expires_in_hours: null, // Permanente
                        }),
                    });
                    if (!cancelled && created?.token) {
                        setCatalogToken(created.token);
                    }
                }
            } catch (err) {
                console.warn('No se pudo cargar o generar el enlace del catálogo:', err);
            } finally {
                if (!cancelled) setIsLoadingCatalog(false);
            }
        };

        loadCatalogToken();
        return () => { cancelled = true; };
    }, [isOpen]);

    const handleCopy = async (text: string, key: string, label: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedKey(key);
            showToast(`${label} copiado al portapapeles`, 'success');
            setTimeout(() => setCopiedKey(null), 2000);
        } else {
            showToast('No se pudo copiar el enlace', 'error');
        }
    };

    const handleWhatsApp = (text: string, title: string) => {
        const msg = encodeURIComponent(`Hola, te comparto el ${title} de ${tenantData?.name || 'nuestro crematorio'}:\n${text}`);
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Compartir con Clientes y Familias"
            maxWidth="max-w-xl"
        >
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 -mt-1">
                Enlaces oficiales verificados para enviar por WhatsApp, publicar en redes o agregar a tu sitio web.
            </p>
            <div className="space-y-4 pt-1">
                {/* 1. Formulario Público de Solicitud de Cremación */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center shrink-0">
                            <Globe size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    Formulario de Solicitud Web
                                </h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-extrabold">
                                    Activo
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Para que las familias ingresen los datos de su mascota, elijan plan y soliciten el servicio.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                        <span className="truncate flex-1 select-all">{formUrl}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => handleCopy(formUrl, 'form', 'Enlace del formulario')}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                        >
                            {copiedKey === 'form' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            {copiedKey === 'form' ? '¡Copiado!' : 'Copiar enlace'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWhatsApp(formUrl, 'formulario de solicitud')}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                            title="Compartir por WhatsApp"
                        >
                            <MessageCircle size={14} /> WhatsApp
                        </button>
                        <a
                            href={formUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Abrir formulario en pestaña nueva"
                        >
                            <ExternalLink size={16} />
                        </a>
                    </div>
                </div>

                {/* 2. Catálogo Digital de Planes */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 flex items-center justify-center shrink-0">
                            <BookOpen size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    Catálogo Digital de Planes
                                </h4>
                                {catalogUrl && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-400 font-extrabold">
                                        Público
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Muestra a las familias tus planes comerciales con precios, fotos y cotización interactiva.
                            </p>
                        </div>
                    </div>

                    {isLoadingCatalog ? (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <Loader2 size={15} className="animate-spin text-teal-600" />
                            <span>Preparando enlace del catálogo...</span>
                        </div>
                    ) : catalogUrl ? (
                        <>
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                                <span className="truncate flex-1 select-all">{catalogUrl}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleCopy(catalogUrl, 'catalog', 'Enlace del catálogo')}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                                >
                                    {copiedKey === 'catalog' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    {copiedKey === 'catalog' ? '¡Copiado!' : 'Copiar enlace'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleWhatsApp(catalogUrl, 'catálogo de planes de cremación')}
                                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                                    title="Compartir por WhatsApp"
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </button>
                                <a
                                    href={catalogUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Abrir catálogo en pestaña nueva"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                            <span>Gestiona y crea enlaces personalizados de tus planes comerciales.</span>
                            <Link href="/dashboard/gestion-servicios" onClick={onClose} className="font-bold underline hover:no-underline shrink-0">
                                Ver Catálogo →
                            </Link>
                        </div>
                    )}
                </div>

                {/* 3. Acceso a Veterinarias Aliadas */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Stethoscope size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 truncate">
                            ¿Necesitas derivar desde una <strong>clínica veterinaria aliada</strong>?
                        </span>
                    </div>
                    <Link
                        href="/dashboard/partners"
                        onClick={onClose}
                        className="font-bold text-indigo-700 dark:text-indigo-300 hover:underline shrink-0"
                    >
                        Ver Veterinarias →
                    </Link>
                </div>
            </div>
        </Modal>
    );
}
