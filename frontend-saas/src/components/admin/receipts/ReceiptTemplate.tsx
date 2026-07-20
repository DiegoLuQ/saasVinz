import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReceiptTemplateProps {
    id: string;
    tenantName: string;
    tenantId: string | number;
    planName: string;
    cycle: string;
    amount: number;
    startDate: Date | string;
    endDate: Date | string;
    advantages?: string[];
    config?: any;
}

export default function ReceiptTemplate({
    id,
    tenantName,
    tenantId,
    planName,
    cycle,
    amount,
    startDate,
    endDate,
    advantages = [
        "Acceso ilimitado a todas las funciones del plan",
        "Soporte técnico prioritario 24/7",
        "Copias de seguridad automáticas diarias",
        "Panel de administración avanzado",
        "Métricas y reportes en tiempo real"
    ], // Should be passed from parent or fallback to this default
    config = {}
}: ReceiptTemplateProps) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const issueDate = new Date();
    const sc = config || {};

    // Generate formatted Receipt ID (Mock for now, or derived from tenantId/Timestamp)
    const receiptNumber = `R-${String(tenantId).padStart(6, '0')}`;

    // Translate cycle
    const cycleLabel = {
        'monthly': 'Mensual',
        'bimonthly': 'Bimestral',
        'semiannual': 'Semestral',
        'annual': 'Anual'
    }[cycle] || cycle;

    const planColor = {
        'FREE': 'text-yellow-600',
        'NORMAL': 'text-blue-600',
        'PRO': 'text-orange-600',
        'ULTRA': 'text-emerald-600'
    }[planName] || 'text-blue-600';

    return (
        <div id={id} className="w-[800px] bg-white text-[#1a1c21] p-10 font-sans relative overflow-hidden flex flex-col" style={{ minHeight: '800px' }}>
            {/* Header / Branding - Compacted */}
            <div className="flex justify-between items-start mb-8 border-b border-black/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        {/* Company Logo */}
                        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white overflow-hidden">
                            <img src="/static/saas-logo-check.png" alt="SC" className="w-full h-full object-cover" onError={(e) => {
                                // Fallback if image fails
                                (e.target as any).style.display = 'none';
                                (e.target as any).parentElement.innerText = 'SC';
                            }} />
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-black">SAASCREMATORIO</h1>
                    </div>
                    <p className="text-[10px] text-black/50 font-medium mb-3">Software Líder en Gestión Funeraria y Crematorios</p>

                    <div className="text-[10px] text-black/60 font-medium space-y-0.5 leading-tight">
                        <p>RUT: 77.777.777-7</p>
                        <p>Av. Providencia 1234, Santiago</p>
                        <p>contacto@saascrematorio.com</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-black text-[#e5e7eb] mb-0.5">RECIBO</h2>
                    <p className="text-sm font-bold text-[#3b82f6]">{receiptNumber}</p>
                    <p className="text-[10px] text-black/40 mt-1 uppercase tracking-widest font-bold">Fecha: {format(issueDate, 'dd/MM/yyyy')}</p>
                </div>
            </div>

            {/* Info Section - Grid Compacted */}
            <div className="grid grid-cols-2 gap-8 mb-8 bg-[#f8fafc] p-6 rounded-xl border border-[#e2e8f0]">
                <div>
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-[#3b82f6] mb-3">Cliente</h3>
                    <div className="space-y-1">
                        <p className="text-base font-bold text-black">{tenantName}</p>
                        <p className="text-[10px] text-black/60 font-medium">Estado: <span className="text-green-600 font-bold">Activo</span></p>
                    </div>
                </div>
                <div>
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-[#3b82f6] mb-3">Suscripción</h3>
                    <div className="space-y-1">
                        <p className={`text-base font-black ${planColor}`}>{planName.toUpperCase()}</p>
                        <p className="text-[10px] font-medium text-black/60">Ciclo: <span className="capitalize text-black font-bold">{cycleLabel}</span></p>
                        <div className="flex gap-4 mt-2 pt-2 border-t border-black/5">
                            <div>
                                <span className="text-[9px] font-black uppercase text-black/40 mr-1">Desde:</span>
                                <span className="text-[10px] font-bold">{format(start, 'dd/MM/yyyy')}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase text-black/40 mr-1">Hasta:</span>
                                <span className="text-[10px] font-bold text-[#3b82f6]">{format(end, 'dd/MM/yyyy')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Detail - Compacted */}
            <div className="mb-4 flex-grow">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-black/5">
                            <th className="py-2 text-left text-[9px] font-black uppercase tracking-widest text-black/40">Descripción</th>
                            <th className="py-2 text-right text-[9px] font-black uppercase tracking-widest text-black/40">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-black/5">
                            <td className="py-6">
                                <p className="font-bold text-sm mb-1 text-black">Membresía Software SaaS Crematorio</p>
                                <p className="text-[10px] text-black/50 leading-relaxed max-w-lg mb-4">
                                    Acceso completo a la plataforma, actualizaciones y soporte.
                                </p>

                                {/* Incluye Section Embedded */}
                                {advantages && advantages.length > 0 && (
                                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#3b82f6] mb-2">Incluye:</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            {advantages.map((adv: string, idx: number) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></div>
                                                    <p className="text-[10px] font-medium text-black/70">{adv}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className="py-6 text-right align-top">
                                <p className="text-xl font-black text-black">${amount?.toLocaleString()}</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Total Section */}
            <div className="flex justify-end mb-12">
                <div className="w-48 space-y-1">
                    <div className="flex justify-between items-center text-xs text-black/40 font-medium pt-1 border-t-2 border-black">
                        <span className="text-sm font-black uppercase tracking-widest text-black">Total</span>
                        <span className="text-2xl font-black text-[#3b82f6]">${amount?.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Footer / Slogan - Compacted */}
            <div className="mt-auto pt-8 flex justify-between items-end">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#3b82f6] mb-0.5">Nuestro Compromiso</p>
                    <p className="text-[10px] font-bold italic text-black/40">"Excelencia y dignidad en cada detalle"</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-black/30">Generado por <span className="text-black/60">Vinzer</span></p>
                </div>
            </div>

            {/* Watermark/Design Element */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(59, 130, 246, 0.04)' }}></div>
        </div>
    );
}
