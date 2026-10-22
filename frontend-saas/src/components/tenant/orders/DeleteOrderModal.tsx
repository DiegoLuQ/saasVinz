"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Trash2, FileX, Dog, Users, Lock } from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { useDeleteCremation } from '@/hooks/useCremations';

// GET /api/internal/cremations/{id}/delete-preview
interface DeletePreview {
    oc_number?: number | null;
    verification_code?: string | null;
    pet_name?: string | null;
    customer_name?: string | null;
    servicios: number;
    planes: number;
    productos: number;
    certificados: number;
    documentos: number;
    evidencias: number;
    fotos: number;
    tareas_logistica: number;
    comision: { amount: number; status: string } | null;
    scopes?: {
        pet: { available: boolean; reason?: string; pet_name?: string; memorials?: number; submissions?: number;
            designs?: number; illustrations?: number; digital_cards?: number; images?: number };
        all: { available: boolean; reason?: string; customer_name?: string };
    };
}

type Scope = 'order' | 'pet' | 'all';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface Props {
    isOpen: boolean;
    orderId: number;
    onClose: () => void;
    onDeleted: () => void;
}

// Montar solo mientras está abierto (así la confirmación parte desmarcada).
export default function DeleteOrderModal({ isOpen, orderId, onClose, onDeleted }: Props) {
    const [confirmed, setConfirmed] = useState(false);
    const [scope, setScope] = useState<Scope>('order');
    const deleteMutation = useDeleteCremation();


    const { data: preview, isLoading, error } = useQuery<DeletePreview>({
        queryKey: ['cremation-delete-preview', orderId],
        queryFn: () => apiRequest(`/api/internal/cremations/${orderId}/delete-preview`),
        enabled: isOpen && !!orderId,
        staleTime: 0,
    });

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync({ id: orderId, scope });
            onDeleted();
        } catch {
            // el hook ya muestra el toast de error
        }
    };

    // Solo lo que existe en esta orden; los datos de la orden siempre se borran.
    const lines: string[] = [];
    if (preview) {
        lines.push('Los datos de la orden: logística, agenda, detalle financiero y estado de la operación');
        const sales = [
            preview.planes ? plural(preview.planes, 'plan', 'planes') : '',
            preview.servicios ? plural(preview.servicios, 'servicio', 'servicios') : '',
            preview.productos ? plural(preview.productos, 'producto', 'productos') + ' (vuelven al stock)' : '',
        ].filter(Boolean);
        if (sales.length) lines.push(`Lo vendido: ${sales.join(', ')}`);
        if (preview.evidencias) lines.push(`${plural(preview.evidencias, 'registro', 'registros')} de etapas del proceso (evidencias)`);
        if (preview.fotos) lines.push(`${plural(preview.fotos, 'foto', 'fotos')} de la orden y de las etapas (se borran del almacenamiento)`);
        if (preview.certificados) lines.push(`${plural(preview.certificados, 'certificado emitido', 'certificados emitidos')}`);
        if (preview.documentos) lines.push(`${plural(preview.documentos, 'documento adjunto', 'documentos adjuntos')}`);
        if (preview.tareas_logistica) lines.push(`${plural(preview.tareas_logistica, 'tarea', 'tareas')} de retiro/entrega`);
        if (preview.comision) lines.push(`La comisión de la veterinaria (${CLP.format(preview.comision.amount || 0)}, ${preview.comision.status})`);
        if (preview.verification_code) lines.push(`El enlace de seguimiento de la familia (código ${preview.verification_code}) deja de funcionar`);
    }

    // Lo extra que se borra al elegir mascota / todo.
    const petScope = preview?.scopes?.pet;
    const allScope = preview?.scopes?.all;
    const petLines: string[] = [];
    if (petScope?.available) {
        petLines.push(`La mascota ${petScope.pet_name} con sus datos y todas sus fotos`);
        if (petScope.memorials) petLines.push(plural(petScope.memorials, 'memorial (con dedicatorias)', 'memoriales (con dedicatorias)'));
        if (petScope.submissions) petLines.push(plural(petScope.submissions, 'registro web del formulario', 'registros web del formulario'));
        const ai = [
            petScope.designs ? plural(petScope.designs, 'diseño para redes', 'diseños para redes') : '',
            petScope.illustrations ? plural(petScope.illustrations, 'ilustración IA', 'ilustraciones IA') : '',
            petScope.digital_cards ? plural(petScope.digital_cards, 'tarjeta digital', 'tarjetas digitales') : '',
        ].filter(Boolean);
        if (ai.length) petLines.push(ai.join(', '));
        if (petScope.images) petLines.push(`${plural(petScope.images, 'imagen', 'imágenes')} en el almacenamiento (las que ya nadie use)`);
    }

    const options: { value: Scope; icon: typeof FileX; title: string; desc: string; available: boolean; reason?: string }[] = [
        { value: 'order', icon: FileX, title: 'Solo la orden', desc: 'La mascota, el cliente y el registro web se conservan (puedes volver a procesarlo).', available: true },
        { value: 'pet', icon: Dog, title: 'La orden y la mascota', desc: 'Todo lo de la mascota: datos, fotos, memorial, registro web, diseños e ilustraciones IA.', available: !!petScope?.available, reason: petScope?.reason },
        { value: 'all', icon: Users, title: 'Todo, incluido el cliente', desc: allScope?.customer_name ? `Además el cliente ${allScope.customer_name}.` : 'Además el cliente.', available: !!allScope?.available, reason: allScope?.reason || petScope?.reason },
    ];

    const busy = deleteMutation.isPending;

    return (
        <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title="Eliminar orden" maxWidth="max-w-lg">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20">
                    <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-900 dark:text-rose-200">
                        Vas a eliminar la orden
                        {preview?.oc_number ? <strong> OC #{String(preview.oc_number).padStart(4, '0')}</strong> : null}
                        {preview?.pet_name ? <> de <strong>{preview.pet_name}</strong></> : null}
                        {preview?.customer_name ? <> ({preview.customer_name})</> : null}.
                        {' '}Esta acción <strong>no se puede deshacer</strong>.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500 dark:text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" /> Revisando lo que se eliminará…
                    </div>
                ) : error ? (
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                        {error instanceof Error ? error.message : 'No se pudo revisar la orden.'}
                    </p>
                ) : preview && (
                    <>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground mb-2">¿Qué quieres eliminar?</p>
                            <div className="space-y-2" role="radiogroup">
                                {options.map(o => {
                                    const Icon = o.icon;
                                    const active = scope === o.value;
                                    return (
                                        <button key={o.value} type="button" role="radio" aria-checked={active} disabled={!o.available || busy}
                                            onClick={() => { setScope(o.value); setConfirmed(false); }}
                                            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition ${active ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500/30 dark:border-rose-500/60 dark:bg-rose-500/10 dark:ring-0' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]'} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:border-dashed dark:disabled:bg-transparent dark:disabled:opacity-50`}>
                                            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${active ? 'border-rose-500 bg-rose-500 shadow-[inset_0_0_0_2px_white] dark:shadow-[inset_0_0_0_2px_rgba(15,23,42,1)]' : 'border-slate-400 dark:border-white/30'}`} />
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white"><Icon size={13} className="text-rose-600 dark:text-rose-300" /> {o.title}</span>
                                                <span className="block text-[11px] text-slate-600 dark:text-muted-foreground mt-0.5">{o.desc}</span>
                                                {!o.available && o.reason && (
                                                    <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"><Lock size={11} /> {o.reason}</span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground mb-2">Se eliminará</p>
                            <ul className="space-y-1.5 text-xs text-slate-800 dark:text-white list-disc pl-5 marker:text-rose-500">
                                {lines.map((l) => <li key={l}>{l}</li>)}
                                {scope !== 'order' && petLines.map((l) => <li key={l}>{l}</li>)}
                                {scope === 'all' && allScope?.customer_name && <li>El cliente {allScope.customer_name} y sus datos de contacto</li>}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground mb-1">No se elimina</p>
                            <p className="text-xs text-slate-600 dark:text-muted-foreground">
                                {scope === 'order' ? 'La mascota (con sus fotos), el cliente, el registro web, su memorial y sus diseños siguen guardados.'
                                    : scope === 'pet' ? 'El cliente sigue en el CRM. El consumo de créditos IA queda en el historial.'
                                        : 'El consumo de créditos IA queda en el historial (sin imágenes).'}
                            </p>
                        </div>

                        <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-0.5 accent-rose-500"
                            />
                            Entiendo que se eliminará todo lo anterior y no se puede recuperar.
                        </label>
                    </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="h-10 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-muted-foreground dark:hover:text-white text-xs font-bold transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!confirmed || !preview || busy}
                        className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {scope === 'order' ? 'Eliminar orden' : scope === 'pet' ? 'Eliminar orden y mascota' : 'Eliminar todo'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
