"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import {
    CreditCard,
    HardDrive,
    Mail,
    Image as ImageIcon,
    CheckCircle2,
    XCircle,
    ExternalLink
} from 'lucide-react';
import { useTenantDetail } from '@/hooks/useTenantDetail';

interface IntegrationCardProps {
    title: string;
    description: string;
    Icon: any;
    accent: string;
    connected: boolean;
    rows: { label: string; value: string | null | undefined; mono?: boolean }[];
    actionHref?: string;
    actionLabel?: string;
}

function IntegrationCard({ title, description, Icon, accent, connected, rows, actionHref, actionLabel }: IntegrationCardProps) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className={`p-3 bg-white/5 rounded-xl ${accent}`}>
                        <Icon size={22} />
                    </div>
                    <div>
                        <div className="text-base font-black text-white">{title}</div>
                        <div className="text-xs text-white/40 font-medium">{description}</div>
                    </div>
                </div>
                {connected ? (
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={12} /> Conectado
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
                        <XCircle size={12} /> Sin conexión
                    </span>
                )}
            </div>

            {rows.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                    {rows.map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs gap-4">
                            <span className="text-white/40 font-medium">{r.label}</span>
                            <span className={`text-white/70 truncate max-w-[60%] text-right ${r.mono ? 'font-mono' : ''}`}>
                                {r.value || <span className="text-white/20 italic">no configurado</span>}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {actionHref && (
                <a
                    href={actionHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                    {actionLabel || 'Ver detalles'} <ExternalLink size={11} />
                </a>
            )}
        </div>
    );
}

export default function TenantIntegracionesPage() {
    const params = useParams();
    const tenantSlug = params.slug as string;
    const { data, isLoading } = useTenantDetail(tenantSlug);

    if (isLoading) return <div className="text-white/40 text-sm">Cargando integraciones...</div>;

    const tenant = data?.tenant;
    if (!tenant) {
        return <div className="text-white/40 text-sm">No hay datos disponibles.</div>;
    }

    const polarConnected = !!tenant.polar_subscription_id || !!tenant.polar_customer_id;
    const r2Connected = !!tenant.logo_url;
    const mailConnected = !!tenant.email;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Pasarela de pagos</h2>
                <IntegrationCard
                    title="Polar.sh"
                    description="Suscripciones y portal de cliente"
                    Icon={CreditCard}
                    accent="text-blue-400"
                    connected={polarConnected}
                    rows={[
                        { label: 'Subscription ID', value: tenant.polar_subscription_id, mono: true },
                        { label: 'Customer ID', value: tenant.polar_customer_id, mono: true },
                        { label: 'Estado de suscripción', value: tenant.subscription_status },
                        { label: 'Fin de período actual', value: tenant.current_period_end ? new Date(tenant.current_period_end).toLocaleDateString('es-CL') : null },
                    ]}
                />
            </div>

            <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Almacenamiento</h2>
                <IntegrationCard
                    title="Cloudflare R2"
                    description="Bucket S3-compatible para logos, certificados y media"
                    Icon={HardDrive}
                    accent="text-orange-400"
                    connected={r2Connected}
                    rows={[
                        { label: 'Logo cargado', value: tenant.logo_url ? 'Sí' : 'No' },
                        { label: 'URL', value: tenant.logo_url, mono: true },
                    ]}
                />
            </div>

            <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Comunicación</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <IntegrationCard
                        title="Email (Gmail SMTP)"
                        description="Notificaciones a clientes del tenant"
                        Icon={Mail}
                        accent="text-emerald-400"
                        connected={mailConnected}
                        rows={[
                            { label: 'Email principal', value: tenant.email },
                            { label: 'Canales de aviso', value: tenant.billing_notify_channels },
                        ]}
                    />
                    <IntegrationCard
                        title="Branding del tenant"
                        description="Identidad visual personalizada"
                        Icon={ImageIcon}
                        accent="text-pink-400"
                        connected={!!tenant.logo_url}
                        rows={[
                            { label: 'Logo', value: tenant.logo_url ? 'Cargado' : null },
                        ]}
                    />
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-xs text-white/40 leading-relaxed">
                <span className="font-bold text-white/60">Nota:</span> esta vista refleja la configuración guardada del tenant en base de datos.
                Las claves API (R2, Mail, reCAPTCHA) son globales del SaaS y se gestionan en{' '}
                <a href="/dashboard/configuracion" className="text-primary font-bold hover:underline">Configuración Global</a>.
            </div>
        </div>
    );
}
