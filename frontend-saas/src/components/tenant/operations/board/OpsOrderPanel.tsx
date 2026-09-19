"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    Camera,
    CheckCircle2,
    Image as ImageIcon,
    Info,
    Link as LinkIcon,
    Loader2,
    MessageCircle,
    Pencil,
    Play,
    Scale,
    Trash2,
    Undo2,
    User,
    X as XIcon,
} from 'lucide-react';
import { API_URL } from '@/lib/tenant/api';
import { copyToClipboard } from '@/lib/clipboard';
import { buildTrackingUrl } from '@/lib/publicUrls';
import CameraModal from '@/components/tenant/CameraModal';
import ImageCropper from '@/components/tenant/ImageCropper';
import EditDateModal from '@/components/tenant/EditDateModal';
import EditWeightModal from '@/components/tenant/EditWeightModal';
import OpsOrderDetailModal from './OpsOrderDetailModal';
import { isFinished, isNotStarted, useOpsOrderActions, type OpsOrder, type OrderEvidence } from '@/hooks/useOperations';
import { elapsedLabel, type OpsStep } from './OpsOrderCard';

type ToastFn = (msg: string, type: 'success' | 'error' | 'info') => void;

const photoSrc = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

function EvidenceView({ evidence, onDelete }: { evidence: OrderEvidence; onDelete?: () => void }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            {evidence.photo_url && (
                <a href={photoSrc(evidence.photo_url)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img src={photoSrc(evidence.photo_url)} className="w-16 h-16 rounded-lg object-cover border border-foreground/10" alt="Evidencia" />
                </a>
            )}
            <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Evidencia guardada</p>
                {evidence.comments?.map((c, i) => <p key={i} className="text-sm text-foreground break-words">{c}</p>)}
            </div>
            {onDelete && (
                <button onClick={onDelete} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" title="Eliminar evidencia">
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    );
}

function EvidenceForm({
    initialNote,
    saving,
    onSave,
}: {
    initialNote: string;
    saving: boolean;
    onSave: (photo: File | null, comments: string[]) => void;
}) {
    const [photo, setPhoto] = useState<File | null>(null);
    const [note, setNote] = useState(initialNote);
    const [showCamera, setShowCamera] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);

    // Una sola URL por archivo (antes se creaba una nueva en cada render)
    const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const openCropper = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => setCropSource(reader.result as string);
        reader.readAsDataURL(file);
    };

    const canSave = !!photo || note.trim() !== '';

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setShowCamera(true)}
                    className="py-5 rounded-xl border-2 border-dashed border-foreground/15 bg-foreground/5 hover:bg-foreground/10 flex flex-col items-center gap-2 text-foreground"
                >
                    <Camera size={26} />
                    <span className="text-sm font-bold">Tomar foto</span>
                </button>
                <label className="py-5 rounded-xl border-2 border-dashed border-foreground/15 bg-foreground/5 hover:bg-foreground/10 flex flex-col items-center gap-2 text-foreground cursor-pointer">
                    <ImageIcon size={26} />
                    <span className="text-sm font-bold">Galería</span>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) openCropper(file);
                            e.target.value = '';
                        }}
                    />
                </label>
            </div>

            {preview && (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-primary">
                    <img src={preview} className="w-full h-full object-cover" alt="Vista previa" />
                    <button onClick={() => setPhoto(null)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white">
                        <XIcon size={14} />
                    </button>
                </div>
            )}

            <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Nota (opcional si subes foto). Una línea por observación."
                className="w-full bg-background/60 border border-foreground/15 rounded-xl px-4 py-3 text-base text-foreground outline-none focus:border-primary/60"
            />

            <button
                onClick={() => onSave(photo, note.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3))}
                disabled={!canSave || saving}
                className="w-full py-4 rounded-xl bg-emerald-600 text-white text-base font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            >
                {saving && <Loader2 size={18} className="animate-spin" />}
                Guardar evidencia
            </button>

            {showCamera && (
                <CameraModal
                    onCapture={file => { setShowCamera(false); openCropper(file); }}
                    onClose={() => setShowCamera(false)}
                />
            )}
            {cropSource && (
                <ImageCropper
                    image={cropSource}
                    aspect={1}
                    showAspectSelector
                    title="Recortar evidencia"
                    onCropComplete={blob => { setPhoto(new File([blob], 'evidence.png', { type: 'image/png' })); setCropSource(null); }}
                    onCancel={() => setCropSource(null)}
                />
            )}
        </div>
    );
}

export default function OpsOrderPanel({
    order: initialOrder,
    steps,
    now,
    timezone,
    showToast,
    onClose,
}: {
    order: OpsOrder;
    steps: OpsStep[];
    now: number;
    timezone: string;
    showToast: ToastFn;
    onClose: () => void;
}) {
    const [order, setOrder] = useState<OpsOrder>(initialOrder);
    const [confirm, setConfirm] = useState<null | 'revert' | 'finalize' | { deleteEvidence: number }>(null);
    const [openEvidenceStep, setOpenEvidenceStep] = useState<number | null>(null);
    const [editingEvidence, setEditingEvidence] = useState(false);
    const [editTime, setEditTime] = useState<{ stepId: number; initialDate: string } | null>(null);
    const [editWeight, setEditWeight] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const actions = useOpsOrderActions(showToast, updated => { setOrder(updated); setEditingEvidence(false); });

    const finished = isFinished(order);
    const notStarted = isNotStarted(order);
    const currentIndex = steps.findIndex(s => s.id === order.current_step_id);
    const isLastStep = currentIndex === steps.length - 1;
    const evidenceFor = (stepId: number) => order.evidence?.find(e => e.step_id === stepId);
    const inStep = !finished && !notStarted ? elapsedLabel(order.step_started_at, now) : null;

    // Bloquea el scroll del fondo mientras el panel está abierto
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    const trackingUrl = order.verification_code || order.tracking_token
        ? buildTrackingUrl(order.tenant_slug || '', order.pet_name, (order.verification_code || order.tracking_token) as string)
        : null;
    const waPhone = (order.customer_phone || '').replace(/\D/g, '');

    const runConfirm = async () => {
        const c = confirm;
        setConfirm(null);
        if (c === 'revert') await actions.revert(order.id);
        else if (c === 'finalize') await actions.finalize(order.id);
        else if (c && typeof c === 'object') await actions.deleteEvidence(c.deleteEvidence);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                className="bg-background w-full sm:max-w-2xl sm:rounded-3xl border border-foreground/10 shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-hidden"
            >
                {/* Encabezado */}
                <div className="p-4 sm:p-6 border-b border-foreground/10 shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                    <div className="flex items-start justify-between gap-3">
                        <div
                            className="min-w-0 cursor-pointer group"
                            onClick={() => setShowInfoModal(true)}
                            title="Ver información de la mascota y logística"
                        >
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                                    {order.pet_name}
                                </h2>
                                <span className="p-1 rounded-lg bg-foreground/5 group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary transition-colors">
                                    <Info size={16} />
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                                <span className="font-mono">#{order.oc_number ?? order.id}</span>
                                <span className="flex items-center gap-1"><User size={14} /> {order.customer_name}</span>
                                {order.partner_name && <span>· {order.partner_name}</span>}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 -m-1 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground shrink-0" aria-label="Cerrar">
                            <XIcon size={22} />
                        </button>
                    </div>

                    <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold whitespace-nowrap shadow-sm hover:opacity-95 active:scale-95 transition-all"
                            title="Ver información completa de la mascota, tutor y logística"
                        >
                            <Info size={16} /> Detalles
                        </button>
                        {waPhone && (
                            <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] text-sm font-bold whitespace-nowrap hover:bg-[#25D366]/25 transition-colors"
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </a>
                        )}
                        {trackingUrl && (
                            <button
                                onClick={async () => { if (await copyToClipboard(trackingUrl)) showToast('Enlace de seguimiento copiado', 'success'); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground text-sm font-bold whitespace-nowrap transition-colors"
                            >
                                <LinkIcon size={16} /> Copiar Tracking
                            </button>
                        )}
                        <button
                            onClick={() => setEditWeight(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground text-sm font-bold whitespace-nowrap transition-colors"
                        >
                            <Scale size={16} /> {order.weight ? `${order.weight} kg` : 'Registrar peso'}
                        </button>
                    </div>
                </div>

                {/* Fases */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-0">
                    {steps.length === 0 && (
                        <p className="text-sm text-muted-foreground">No hay fases configuradas para este crematorio.</p>
                    )}
                    {steps.map((step, idx) => {
                        const done = finished || idx < currentIndex;
                        const current = !finished && idx === currentIndex;
                        const evidence = evidenceFor(step.id);
                        const meta = order.timeline_metadata?.[String(step.id)];
                        const showForm = current && editingEvidence;

                        return (
                            <div
                                key={step.id}
                                className={`rounded-2xl border p-4 ${current ? 'border-primary/40 bg-primary/5' : done ? 'border-foreground/10' : 'border-transparent opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black ${done ? 'bg-emerald-500/15 text-emerald-500' : current ? 'bg-primary text-primary-foreground' : 'bg-foreground/5 text-muted-foreground'
                                            }`}
                                    >
                                        {done ? <CheckCircle2 size={18} /> : idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold ${current ? 'text-primary text-lg' : 'text-foreground'}`}>{step.name}</p>
                                        {current && inStep && <p className="text-xs text-muted-foreground">En esta fase hace {inStep}</p>}
                                        {done && meta?.completed_at_formatted && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                Completada {meta.completed_at_formatted}
                                                <button
                                                    onClick={() => setEditTime({ stepId: step.id, initialDate: meta.completed_at || new Date().toISOString() })}
                                                    className="p-1 rounded hover:text-primary"
                                                    title="Corregir hora"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                    {done && evidence && (
                                        <button
                                            onClick={() => setOpenEvidenceStep(openEvidenceStep === step.id ? null : step.id)}
                                            className="text-xs font-bold text-primary px-3 py-2 rounded-lg hover:bg-primary/10 shrink-0"
                                        >
                                            {openEvidenceStep === step.id ? 'Ocultar' : 'Ver evidencia'}
                                        </button>
                                    )}
                                </div>

                                {done && evidence && openEvidenceStep === step.id && (
                                    <div className="mt-3"><EvidenceView evidence={evidence} /></div>
                                )}

                                {current && (
                                    <div className="mt-4 space-y-3">
                                        {evidence && !editingEvidence && (
                                            <>
                                                <EvidenceView evidence={evidence} onDelete={() => setConfirm({ deleteEvidence: evidence.id })} />
                                                <button onClick={() => setEditingEvidence(true)} className="text-sm font-bold text-primary">
                                                    Reemplazar evidencia
                                                </button>
                                            </>
                                        )}
                                        {!evidence && !editingEvidence && (
                                            <button
                                                onClick={() => setEditingEvidence(true)}
                                                className="w-full py-3 rounded-xl border border-dashed border-foreground/20 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex items-center justify-center gap-2"
                                            >
                                                <Camera size={16} /> Agregar foto o nota (opcional)
                                            </button>
                                        )}
                                        {showForm && (
                                            <EvidenceForm
                                                key={`${step.id}-${evidence?.id ?? 'new'}`}
                                                initialNote={(evidence?.comments || []).join('\n')}
                                                saving={actions.busy === 'evidence'}
                                                onSave={(photo, comments) => actions.uploadEvidence(order.id, step.id, photo, comments)}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Acción principal */}
                <div className="p-3 sm:p-4 border-t border-foreground/10 shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                    {finished ? (
                        <div className="w-full py-4 rounded-2xl bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center gap-2">
                            <CheckCircle2 size={20} /> Proceso concluido y entregado
                        </div>
                    ) : notStarted ? (
                        <button
                            onClick={() => actions.advance(order.id, true)}
                            disabled={!!actions.busy || steps.length === 0}
                            className="w-full py-5 rounded-2xl bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            {actions.busy === 'advance' ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                            Iniciar proceso
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                {currentIndex > 0 && (
                                    <button
                                        onClick={() => setConfirm('revert')}
                                        disabled={!!actions.busy}
                                        className="w-16 rounded-2xl bg-foreground/5 hover:bg-foreground/10 text-muted-foreground flex items-center justify-center disabled:opacity-40"
                                        title="Volver a la fase anterior"
                                    >
                                        <Undo2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={() => (isLastStep ? setConfirm('finalize') : actions.advance(order.id, false))}
                                    disabled={!!actions.busy}
                                    className={`flex-1 py-5 rounded-2xl text-base font-bold flex items-center justify-center gap-2 disabled:opacity-40 ${isLastStep ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
                                        }`}
                                >
                                    {actions.busy === 'advance' || actions.busy === 'finalize' ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : isLastStep ? (
                                        <CheckCircle2 size={20} />
                                    ) : null}
                                    {isLastStep ? 'Concluir y marcar entregada' : 'Completar fase'}
                                    {!isLastStep && <ArrowRight size={20} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmación */}
            {confirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => { e.stopPropagation(); setConfirm(null); }}>
                    <div onClick={e => e.stopPropagation()} className="bg-background border border-foreground/15 rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
                        <h3 className="text-lg font-black text-foreground">
                            {confirm === 'revert' ? '¿Volver a la fase anterior?' : confirm === 'finalize' ? '¿Concluir la orden?' : '¿Eliminar la evidencia?'}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {confirm === 'revert'
                                ? `La orden volverá a «${currentIndex > 0 ? steps[currentIndex - 1].name : ''}».`
                                : confirm === 'finalize'
                                    ? 'Quedará marcada como entregada y saldrá del panel de trabajo.'
                                    : 'Se borrarán la foto y las notas de esta fase.'}
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setConfirm(null)}
                                className="flex-1 py-3 rounded-xl border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={runConfirm}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-md ${
                                    typeof confirm === 'object'
                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                                        : confirm === 'finalize'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                            : 'bg-primary hover:opacity-90 text-primary-foreground shadow-primary/20'
                                }`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div onClick={e => e.stopPropagation()}>
                <EditDateModal
                    isOpen={!!editTime}
                    onClose={() => setEditTime(null)}
                    initialDate={editTime?.initialDate}
                    timezone={timezone}
                    onSave={newDate => { if (editTime) actions.updateStepTime(order.id, editTime.stepId, newDate); }}
                />
                <EditWeightModal
                    isOpen={editWeight}
                    onClose={() => setEditWeight(false)}
                    orderId={order.id}
                    petName={order.pet_name}
                    currentWeight={order.weight || 0}
                    onSave={newWeight => setOrder(prev => ({ ...prev, weight: newWeight }))}
                />
                <OpsOrderDetailModal
                    isOpen={showInfoModal}
                    onClose={() => setShowInfoModal(false)}
                    order={order}
                />
            </div>
        </div>
    );
}
