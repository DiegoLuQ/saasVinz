import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReceiptTemplateProps {
    id: string;
    receiptNumber: string;
    tenantName: string;
    tenantId: string | number;
    planName: string;
    cycle: string;
    amount: number;
    startDate: Date | string;
    endDate: Date | string;
    advantages?: string[];
    config?: any;
    issuer?: {
        name: string;
        rut: string;
        address: string;
        email: string;
        logo_url?: string;
    };
}

export default function ReceiptTemplate({
    id,
    receiptNumber,
    tenantName,
    tenantId,
    planName,
    cycle,
    amount,
    startDate,
    endDate,
    advantages = [
        'Acceso completo a la plataforma',
        'Soporte técnico 24/7',
        'Actualizaciones automáticas',
    ],
    config = {},
    issuer
}: ReceiptTemplateProps) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const issueDate = new Date();
    const sc = config || {};

    // Use passed receiptNumber or derived as fallback
    const rNum = receiptNumber || `R-${String(tenantId).padStart(6, '0')}`;

    // Translate cycle
    const cycleLabel = {
        'monthly': 'Mensual',
        'bimonthly': 'Bimestral',
        'semiannual': 'Semestral',
        'annual': 'Anual'
    }[cycle] || cycle;

    const planColorHex = {
        'FREE': '#d97706', // amber-600
        'NORMAL': '#2563eb', // blue-600
        'PRO': '#ea580c', // orange-600
        'ULTRA': '#059669' // emerald-600
    }[planName] || '#2563eb';

    return (
        <div id={id} className="w-[800px] bg-white text-[#1a1c21] p-8 font-sans relative overflow-hidden flex flex-col receipt-container" style={{ minHeight: '800px', backgroundColor: '#ffffff', color: '#1a1c21' }}>
            <style jsx>{`
                .receipt-container {
                    color: #1a1c21 !important;
                }
                .text-black { color: #000000 !important; }
                .text-black-60 { color: rgba(0,0,0,0.6) !important; }
                .text-black-50 { color: rgba(0,0,0,0.5) !important; }
                .text-black-40 { color: rgba(0,0,0,0.4) !important; }
                .text-black-30 { color: rgba(0,0,0,0.3) !important; }
                .text-blue-600 { color: #2563eb !important; }
                .text-primary-blue { color: #3b82f6 !important; }
                .bg-blue-50 { background-color: #eff6ff !important; }
                .border-blue-100 { border-color: #dbeafe !important; }
                .bg-black-box { background-color: #000000 !important; }
            `}</style>

            {/* Header / Branding - Compacted */}
            <div className="flex justify-between items-start mb-6 border-b border-black/5 pb-6" style={{ borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        {/* Company Logo */}
                        <div className="w-10 h-10 bg-black-box rounded-lg flex items-center justify-center text-white overflow-hidden" style={{ backgroundColor: '#000000' }}>
                            {issuer?.logo_url ? (
                                <img src={issuer.logo_url} alt="SC" className="w-full h-full object-cover" onError={(e) => {
                                    (e.target as any).style.display = 'none';
                                    (e.target as any).parentElement.innerText = 'SC';
                                }} />
                            ) : (
                                <span className="font-bold text-white" style={{ color: '#ffffff' }}>SC</span>
                            )}
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-black" style={{ color: '#000000' }}>{issuer?.name?.toUpperCase() || 'SAASCREMATORIO'}</h1>
                    </div>
                    <p className="text-[10px] text-black-50 font-medium mb-3" style={{ color: 'rgba(0,0,0,0.5)' }}>Software Líder en Gestión Funeraria y Crematorios</p>

                    <div className="text-[10px] text-black-60 font-medium space-y-0.5 leading-tight" style={{ color: 'rgba(0,0,0,0.6)' }}>
                        <p>RUT: {issuer?.rut || '77.777.777-7'}</p>
                        <p>{issuer?.address || 'Av. Providencia 1234, Santiago'}</p>
                        <p>{issuer?.email || 'contacto@saascrematorio.com'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-black text-[#e5e7eb] mb-0.5" style={{ color: '#e5e7eb' }}>RECIBO</h2>
                    <p className="text-sm font-bold text-primary-blue" style={{ color: '#3b82f6' }}>{rNum}</p>
                    <p className="text-[10px] text-black-40 mt-1 uppercase tracking-widest font-bold" style={{ color: 'rgba(0,0,0,0.4)' }}>Fecha: {format(issueDate, 'dd/MM/yyyy')}</p>
                </div>
            </div>

            {/* Info Section - Grid Compacted */}
            <div className="grid grid-cols-2 gap-8 mb-6 bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div>
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-primary-blue mb-3" style={{ color: '#3b82f6' }}>Cliente</h3>
                    <div className="space-y-1">
                        <p className="text-base font-bold text-black" style={{ color: '#000000' }}>{tenantName}</p>
                        <p className="text-[10px] text-black-60 font-medium" style={{ color: 'rgba(0,0,0,0.6)' }}>Estado: <span className="text-green-600 font-bold" style={{ color: '#16a34a' }}>Activo</span></p>
                    </div>
                </div>
                <div>
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-primary-blue mb-3" style={{ color: '#3b82f6' }}>Suscripción</h3>
                    <div className="space-y-1">
                        <p className="text-base font-black" style={{ color: planColorHex }}>{planName.toUpperCase()}</p>
                        <p className="text-[10px] font-medium text-black-60" style={{ color: 'rgba(0,0,0,0.6)' }}>Ciclo: <span className="capitalize text-black font-bold" style={{ color: '#000000' }}>{cycleLabel}</span></p>
                        <div className="flex gap-4 mt-2 pt-2 border-t border-black/5" style={{ borderTopColor: 'rgba(0,0,0,0.05)' }}>
                            <div>
                                <span className="text-[9px] font-black uppercase text-black-40 mr-1" style={{ color: 'rgba(0,0,0,0.4)' }}>Desde:</span>
                                <span className="text-[10px] font-bold text-black" style={{ color: '#000000' }}>{format(start, 'dd/MM/yyyy')}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase text-black-40 mr-1" style={{ color: 'rgba(0,0,0,0.4)' }}>Hasta:</span>
                                <span className="text-[10px] font-bold text-primary-blue" style={{ color: '#3b82f6' }}>{format(end, 'dd/MM/yyyy')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Detail - Compacted */}
            <div className="mb-4 flex-grow">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-black/5" style={{ borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                            <th className="py-2 text-left text-[9px] font-black uppercase tracking-widest text-black-40" style={{ color: 'rgba(0,0,0,0.4)' }}>Descripción</th>
                            <th className="py-2 text-right text-[9px] font-black uppercase tracking-widest text-black-40" style={{ color: 'rgba(0,0,0,0.4)' }}>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-black/5" style={{ borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                            <td className="py-4">
                                <p className="font-bold text-sm mb-1 text-black" style={{ color: '#000000' }}>Membresía Software SaaS Crematorio</p>
                                <p className="text-[10px] text-black-50 leading-relaxed max-w-lg mb-4" style={{ color: 'rgba(0,0,0,0.5)' }}>
                                    Acceso completo a la plataforma, actualizaciones y soporte.
                                </p>

                                {/* Incluye Section Embedded */}
                                {advantages && advantages.length > 0 && (
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary-blue mb-2" style={{ color: '#3b82f6' }}>INCLUYE</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            {advantages.map((adv: string, idx: number) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-blue" style={{ backgroundColor: '#3b82f6' }}></div>
                                                    <p className="text-[10px] font-medium text-black-60" style={{ color: 'rgba(0,0,0,0.6)' }}>{adv}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className="py-6 text-right align-top">
                                <p className="text-xl font-black text-black" style={{ color: '#000000' }}>${amount?.toLocaleString()}</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Total Section */}
            <div className="flex justify-end mb-8">
                <div className="w-48 space-y-1">
                    <div className="flex justify-between items-center text-xs text-black-40 font-medium pt-1 border-t-2 border-black" style={{ borderTopColor: '#000000' }}>
                        <span className="text-sm font-black uppercase tracking-widest text-black" style={{ color: '#000000' }}>Total</span>
                        <span className="text-2xl font-black text-primary-blue" style={{ color: '#3b82f6' }}>${amount?.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Footer / Slogan - Compacted */}
            <div className="mt-auto pt-8 flex justify-between items-end">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary-blue mb-0.5" style={{ color: '#3b82f6' }}>Nuestro Compromiso</p>
                    <p className="text-[10px] font-bold italic text-black-40" style={{ color: 'rgba(0,0,0,0.4)' }}>"Excelencia y dignidad en cada detalle"</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-black-30" style={{ color: 'rgba(0,0,0,0.3)' }}>Generado por <span className="text-black-60" style={{ color: 'rgba(0,0,0,0.6)' }}>Vincer</span></p>
                </div>
            </div>

            {/* Watermark/Design Element */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(59, 130, 246, 0.04)' }}></div>
        </div>
    );
}
