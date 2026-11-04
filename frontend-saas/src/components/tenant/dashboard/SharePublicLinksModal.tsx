"use client";

import React, { useState } from 'react';
import Modal from '@/components/tenant/Modal';
import { Share2, Copy, Check, MessageCircle, ExternalLink, Globe, BookOpen, Stethoscope } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import { buildCatalogUrl, buildPublicFormUrl } from '@/lib/publicUrls';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import Link from 'next/link';

interface SharePublicLinksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SharePublicLinksModal({ isOpen, onClose }: SharePublicLinksModalProps) {
    const { showToast } = useToast();
    const { tenantData } = useTenant();
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const slug = tenantData?.slug || 'crematorio';
    const formUrl = buildPublicFormUrl(slug);
    const catalogUrl = tenantData?.public_token ? buildCatalogUrl(slug, tenantData.public_token) : null;

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
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 -mt-1">
                Enlaces públicos listos para enviar por WhatsApp, redes sociales o integrar en tu web.
            </p>
            <div className="space-y-4 pt-1">
                {/* 1. Formulario Público de Solicitud */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 flex items-center justify-center shrink-0">
                            <Globe size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                Formulario Web de Solicitud
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Permite a las familias registrar a su mascota, seleccionar plan, tramo y servicios.
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
                            title="Abrir en pestaña nueva"
                        >
                            <ExternalLink size={16} />
                        </a>
                    </div>
                </div>

                {/* 2. Catálogo Online de Servicios y Urnas */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 flex items-center justify-center shrink-0">
                            <BookOpen size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                Catálogo Digital de Planes y Urnas
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Muestra a las familias tus servicios oficiales, tramos y catálogo interactivo.
                            </p>
                        </div>
                    </div>

                    {catalogUrl ? (
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
                                    onClick={() => handleWhatsApp(catalogUrl, 'catálogo de planes y servicios')}
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
                                    title="Abrir en pestaña nueva"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                            <span>El catálogo online aún no tiene token activo. Configúralo en ajustes.</span>
                            <Link href="/dashboard/configuracion?tab=catalogo" className="font-bold underline hover:no-underline shrink-0">
                                Ir a Configuración
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
