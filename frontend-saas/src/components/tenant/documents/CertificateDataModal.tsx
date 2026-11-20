"use client";

/**
 * «Ver datos» de un certificado en Documentos → Repositorio: con qué se emitió
 * (diseño, mascota, dueño y lo impreso en cada campo; en los textos con código,
 * si salió del texto guardado del crematorio, lo escrito al emitir o el del diseño).
 * API GET /api/internal/ops-records/certificates/{id}/data (ops_certificates.data).
 */
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Info, Loader2 } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';

interface PrintedField { type: string; value: string; code?: string | null; source?: 'emision' | 'guardado' | 'diseno' }
interface CertData {
    id: number; number: string; type: string; issue_date: string;
    order: { id: number; verification_code?: string | null; status?: string | null; pet_name?: string | null; owner_name?: string | null } | null;
    data: {
        /** Emitido antes de guardar sus datos: textos leídos del certificado, sin código ni origen. */
        legacy?: boolean;
        template?: { id: number; name: string } | null;
        pet?: { name?: string | null; species?: string | null; breed?: string | null; description?: string | null } | null;
        owner?: { name?: string | null; rut?: string | null; email?: string | null; phone?: string | null; contact?: string | null } | null;
        fields?: PrintedField[];
    } | null;
}

const FIELD_LABEL: Record<string, string> = {
    nombre_mascota: 'Nombre de la mascota',
    fecha_nacimiento: 'Fecha de nacimiento',
    fecha_fallecimiento: 'Fecha de fallecimiento',
    fecha_actual: 'Fecha de emisión',
    texto_fijo: 'Texto libre',
    dato: 'Dato del certificado',
    nombre_empresa: 'Nombre del crematorio',
    rut_tenant: 'RUT del crematorio',
    encargado_tenant: 'Encargado',
    rut_encargado: 'RUT del encargado',
    celular_tenant: 'Teléfono del crematorio',
    direccion_tenant: 'Dirección del crematorio',
    nombre_dueno: 'Nombre del dueño',
    rut_dueno: 'RUT del dueño',
    correo_dueno: 'Correo del dueño',
    telefono_dueno: 'Teléfono del dueño',
    direccion_dueno: 'Dirección del dueño',
    codigo_verificacion: 'Código de verificación',
    numero_certificado: 'Número de certificado',
    folio: 'Folio',
    declaracion: 'Declaración',
    proceso: 'Detalle del proceso',
    firma: 'Firma',
    mensaje: 'Mensaje',
    despedida: 'Texto de despedida',
};

const SOURCE: Record<string, { label: string; cls: string }> = {
    guardado: { label: 'Texto guardado del crematorio', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25' },
    emision: { label: 'Escrito al emitir', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25' },
    diseno: { label: 'Texto del diseño', cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10' },
};

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
    if (value == null || value === '') return null;
    return (
        <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-2 border-b border-slate-100 dark:border-white/5 last:border-0 text-sm">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">{label}</span>
            <span className="text-slate-900 dark:text-white break-words whitespace-pre-line">{value}</span>
        </div>
    );
}

export default function CertificateDataModal({ certId, onClose }: { certId: number | null; onClose: () => void }) {
    const { data, isLoading, error } = useQuery<CertData>({
        queryKey: ['certificate-data', certId],
        queryFn: () => apiRequest(`/api/internal/ops-records/certificates/${certId}/data`),
        enabled: certId != null,
    });
    const d = data?.data;
    const owner = d?.owner;
    const pet = d?.pet;
    const fields = d?.fields || [];

    return (
        <Modal isOpen={certId != null} onClose={onClose} title="Datos del certificado" maxWidth="max-w-2xl">
            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
            ) : error || !data ? (
                <p className="text-sm text-red-500 py-6 text-center">No se pudieron cargar los datos del certificado.</p>
            ) : (
                <div className="space-y-6">
                    <section>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Certificado</h4>
                        <Row label="Número" value={<span className="font-mono">{data.number}</span>} />
                        <Row label="Tipo" value={data.type} />
                        <Row label="Emitido" value={new Date(data.issue_date).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' })} />
                        <Row label="Diseño" value={d?.template?.name} />
                        {data.order && (
                            <Row label="Orden" value={
                                <Link href={`/dashboard/recepcion-pedidos?orden=${data.order.id}`} className="inline-flex items-center gap-1 text-primary hover:underline font-semibold">
                                    #{data.order.id}{data.order.verification_code ? ` · ${data.order.verification_code}` : ''} <ExternalLink size={12} />
                                </Link>
                            } />
                        )}
                    </section>

                    {!d ? (
                        <div className="flex items-start gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                            <Info size={15} className="text-sky-600 dark:text-sky-400 shrink-0 mt-px" />
                            <p>
                                Este certificado se emitió antes de que se guardaran sus datos. Mascota: <b>{data.order?.pet_name || '—'}</b>
                                {data.order?.owner_name ? <> · Dueño: <b>{data.order.owner_name}</b></> : null}.
                                Si lo vuelves a emitir desde la orden, aquí verás todo lo que se imprimió.
                            </p>
                        </div>
                    ) : (
                        <>
                            <section>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Mascota y dueño</h4>
                                <Row label="Mascota" value={pet?.name} />
                                <Row label="Especie / raza" value={pet?.description || [pet?.species, pet?.breed].filter(Boolean).join(' · ')} />
                                <Row label="Dueño" value={owner?.name} />
                                <Row label="RUT" value={owner?.rut} />
                                <Row label="Contacto" value={owner?.contact || [owner?.email, owner?.phone].filter(Boolean).join(' · ')} />
                            </section>

                            {d.legacy && (
                                <div className="flex items-start gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                                    <Info size={15} className="text-sky-600 dark:text-sky-400 shrink-0 mt-px" />
                                    <p>Certificado emitido antes de guardar sus datos: los textos se leyeron del propio certificado, sin su código ni de dónde salieron. Si lo vuelves a emitir verás también eso.</p>
                                </div>
                            )}
                            <section>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Lo que se imprimió</h4>
                                {!fields.length ? (
                                    <p className="text-sm text-slate-500">Sin campos de texto.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {fields.map((f, i) => {
                                            const src = f.source ? SOURCE[f.source] : null;
                                            return (
                                                <li key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{FIELD_LABEL[f.type] || f.type}</span>
                                                        {f.code && <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 font-mono text-[10px] text-slate-600 dark:text-slate-300">{f.code}</span>}
                                                        {src && <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${src.cls}`}>{src.label}</span>}
                                                    </div>
                                                    <p className="text-sm text-slate-900 dark:text-white whitespace-pre-line break-words">{f.value}</p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
}
