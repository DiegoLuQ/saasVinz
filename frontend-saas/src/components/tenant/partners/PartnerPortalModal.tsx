"use client";

import React, { useState, useEffect } from 'react';
import Modal from '@/components/tenant/Modal';
import { PartnerLink, PartnerPortalAccess, getPartnerPortalAccess, regeneratePartnerPortalAccess } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { copyToClipboard } from '@/lib/clipboard';
import { buildPartnerPortalUrl } from '@/lib/publicUrls';
import {
    KeyRound,
    Copy,
    Check,
    RefreshCw,
    ExternalLink,
    Send,
    ShieldCheck,
    Loader2,
    Lock,
    Sparkles
} from 'lucide-react';

interface PartnerPortalModalProps {
    isOpen: boolean;
    onClose: () => void;
    partnerLink: PartnerLink | null;
}

export default function PartnerPortalModal({
    isOpen,
    onClose,
    partnerLink
}: PartnerPortalModalProps) {
    const { showToast } = useToast();
    const [access, setAccess] = useState<PartnerPortalAccess | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);

    const fetchAccess = async () => {
        if (!partnerLink) return;
        setLoading(true);
        try {
            const data = await getPartnerPortalAccess(partnerLink.id);
            setAccess(data);
        } catch (err: any) {
            console.error('Error al obtener acceso de partner:', err);
            showToast(err.message || 'Error al cargar credenciales del portal', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && partnerLink) {
            fetchAccess();
            setCopiedLink(false);
            setCopiedPin(false);
        } else {
            setAccess(null);
        }
    }, [isOpen, partnerLink]);

    const fullPortalUrl = access
        ? buildPartnerPortalUrl(access.tenant_slug, access.access_token)
        : '';

    const handleCopyLink = async () => {
        if (!fullPortalUrl) return;
        const ok = await copyToClipboard(fullPortalUrl);
        if (ok) {
            setCopiedLink(true);
            showToast('Enlace copiado al portapapeles', 'success');
            setTimeout(() => setCopiedLink(false), 2500);
        } else {
            showToast('No se pudo copiar automáticamente', 'error');
        }
    };

    const handleCopyPin = async () => {
        if (!access) return;
        const ok = await copyToClipboard(access.access_pin);
        if (ok) {
            setCopiedPin(true);
            showToast('PIN copiado al portapapeles', 'success');
            setTimeout(() => setCopiedPin(false), 2500);
        } else {
            showToast('No se pudo copiar el PIN', 'error');
        }
    };

    const handleRegenerate = async () => {
        if (!partnerLink) return;
        const confirmed = window.confirm(
            '¿Estás seguro de regenerar el enlace y PIN? El acceso anterior dejará de funcionar inmediatamente para esta veterinaria.'
        );
        if (!confirmed) return;

        setRegenerating(true);
        try {
            const data = await regeneratePartnerPortalAccess(partnerLink.id);
            setAccess(data);
            showToast('¡Enlace y PIN regenerados con éxito!', 'success');
        } catch (err: any) {
            console.error('Error al regenerar:', err);
            showToast(err.message || 'Error al regenerar acceso', 'error');
        } finally {
            setRegenerating(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (!access || !partnerLink || !fullPortalUrl) return;
        const vetName = partnerLink.veterinary.name || 'Clínica Veterinaria';
        const msg = encodeURIComponent(
            `Hola estimado equipo de *${vetName}*,\n\n` +
            `Aquí tienen su enlace de acceso privado para registrar mascotas y revisar sus comisiones pactadas en tiempo real con nosotros:\n\n` +
            `🔗 *Enlace:* ${fullPortalUrl}\n` +
            `🔑 *PIN de Acceso:* ${access.access_pin}\n\n` +
            `Cualquier consulta estamos a su completa disposición.`
        );
        const phone = partnerLink.veterinary.phone?.replace(/[^0-9]/g, '') || '';
        const waUrl = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
        window.open(waUrl, '_blank');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Portal Privado: ${partnerLink?.veterinary.name || 'Veterinaria'}`}
            maxWidth="max-w-xl"
            zIndex="z-[350]"
        >
            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="animate-spin text-primary" size={36} />
                    <p className="text-xs text-muted-foreground font-medium">Cargando credenciales del portal...</p>
                </div>
            ) : !access ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                    No se pudieron cargar los datos de acceso para este convenio.
                </div>
            ) : (
                <div className="space-y-6 pt-2">
                    {/* Header Informativo */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border border-primary/20 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles size={20} />
                        </div>
                        <div className="text-xs leading-relaxed">
                            <p className="font-bold text-white text-sm">Portal Exclusivo de Convenio</p>
                            <p className="text-muted-foreground mt-0.5">
                                La veterinaria puede ingresar con este enlace y PIN para <span className="text-white font-medium">derivar mascotas, elegir planes y consultar sus comisiones</span> en vivo.
                            </p>
                        </div>
                    </div>

                    {/* Enlace Permanente */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Enlace de Acceso Privado</span>
                            <span className="text-[10px] text-emerald-400 font-medium">Permanente (Sin Expiración)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={fullPortalUrl}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-mono text-white/90 outline-none focus:border-primary/50 select-all"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="shrink-0 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/30 text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                                title="Copiar enlace"
                            >
                                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                            </button>
                        </div>
                    </div>

                    {/* PIN de Seguridad */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PIN de Seguridad</p>
                                <p className="text-2xl font-black font-mono tracking-widest text-white mt-0.5">
                                    {access.access_pin}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCopyPin}
                            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            {copiedPin ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                            <span>{copiedPin ? 'Copiado' : 'Copiar PIN'}</span>
                        </button>
                    </div>

                    {/* Botones de Acción */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        <button
                            onClick={handleWhatsAppShare}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all active:scale-95 shadow-lg shadow-emerald-600/20 cursor-pointer"
                        >
                            <Send size={16} />
                            <span>Enviar por WhatsApp</span>
                        </button>

                        <button
                            onClick={() => window.open(fullPortalUrl, '_blank')}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <ExternalLink size={16} />
                            <span>Abrir Portal en Pestaña</span>
                        </button>
                    </div>

                    {/* Zona de Peligro / Regenerar */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                            ¿Sospechas que el PIN fue comprometido?
                        </p>
                        <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={regenerating}
                            className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                            {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            <span>Regenerar Enlace y PIN</span>
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
