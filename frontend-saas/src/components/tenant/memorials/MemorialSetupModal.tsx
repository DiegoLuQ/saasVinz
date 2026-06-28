"use client";

import React, { useState, useEffect } from 'react';
import {
    Heart,
    Link as LinkIcon,
    Copy,
    Check,
    Settings,
    Sparkles,
    Smartphone,
    X,
    Loader2,
    Eye
} from 'lucide-react';
import Modal from '@/components/tenant/Modal';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { copyToClipboard } from '@/lib/clipboard';

interface MemorialSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    pet: any;
    tenantName?: string;
}

export default function MemorialSetupModal({ isOpen, onClose, pet, tenantName }: MemorialSetupModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [memorial, setMemorial] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [pinCopied, setPinCopied] = useState(false);

    const [form, setForm] = useState({
        msg_despedida: '',
        color_fondo: '#ffffff',
        particulas: 'flores',
        tema: 'claro',
        es_privado: false
    });

    useEffect(() => {
        if (isOpen && pet?.id) {
            fetchMemorial();
        }
    }, [isOpen, pet]);

    const fetchMemorial = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            // We need an endpoint to get memorial by pet_id or check if exists
            // Since I haven't created a specific "get by pet_id" for internal use, 
            // I'll try to find it via the memorials router if I add that logic, 
            // or just rely on the create logic which returns existing.
            const res = await apiRequest(`/api/internal/memorials`, {
                method: 'POST',
                body: JSON.stringify({
                    id_mascota: pet.id,
                    msg_despedida: 'Estamos preparando un lugar especial para recordar a ' + pet.name,
                    diseno: { color_fondo: '#ffffff', particulas: 'flores', tema: 'claro' }
                })
            });
            setMemorial(res);
            setForm({
                msg_despedida: res.msg_despedida || '',
                color_fondo: res.diseno?.color_fondo || '#ffffff',
                particulas: res.diseno?.particulas || 'flores',
                tema: res.diseno?.tema || 'claro',
                es_privado: res.es_privado || false
            });
        } catch (err: any) {
            // El wrapper de la API lanza { status, message, data }. Extraemos un
            // mensaje legible en lugar de loguear un objeto plano (que el overlay
            // de Next.js muestra como "{}").
            const msg = err?.message || err?.data?.detail || 'No se pudo cargar el memorial.';
            console.warn('[MemorialSetupModal] fetchMemorial error:', err?.status, msg);
            setErrorMsg(typeof msg === 'string' ? msg : 'No se pudo cargar el memorial.');
            showToast(typeof msg === 'string' ? msg : 'No se pudo cargar el memorial.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!memorial) return;
        setSaving(true);
        try {
            const res = await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/manage`, {
                method: 'PATCH',
                body: JSON.stringify({
                    msg_despedida: form.msg_despedida,
                    diseno: {
                        color_fondo: form.color_fondo,
                        particulas: form.particulas,
                        tema: form.tema
                    },
                    es_privado: form.es_privado
                }),
                headers: {
                    'access-key': memorial.access_key
                }
            });
            setMemorial(res);
            showToast('Configuración guardada exitosamente', 'success');
        } catch (err: any) {
            showToast(err.message || 'Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const getPublicUrl = () => {
        if (!memorial) return '';
        let host = window.location.host;

        // Strip subdomain if exists (e.g. tenant.lvh.me:3000 -> lvh.me:3000)
        const parts = host.split('.');
        if (parts.length > 2) {
            host = parts.slice(1).join('.');
        }

        const family_slug = (tenantName || 'memorial')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');

        const pet_slug = pet.name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');

        return `${window.location.protocol}//${host}/memorials/v/${family_slug}/${pet_slug}/${memorial.id_recuerdo}`;
    };

    const handleCopyLink = async () => {
        const success = await copyToClipboard(getPublicUrl());
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            showToast('Enlace copiado al portapapeles', 'success');
        }
    };

    const handleCopyPin = async () => {
        if (!memorial) return;
        const success = await copyToClipboard(memorial.access_key);
        if (success) {
            setPinCopied(true);
            setTimeout(() => setPinCopied(false), 2000);
            showToast('PIN copiado al portapapeles', 'success');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Memorial de ${pet?.name}`}
            maxWidth="max-w-2xl"
        >
            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <p className="text-muted-foreground font-medium">Cargando memorial...</p>
                </div>
            ) : errorMsg && !memorial ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 px-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                        <X size={24} />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm">{errorMsg}</p>
                    <button
                        onClick={fetchMemorial}
                        className="px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Public Info Card */}
                    <div className="glass-card bg-primary/5 border-primary/20 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <LinkIcon size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Link del Memorial</p>
                                    <p className="text-xs font-medium text-muted-foreground truncate max-w-[200px] md:max-w-sm">
                                        {getPublicUrl()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.open(getPublicUrl(), '_blank')}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
                                    title="Ver Memorial"
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    onClick={handleCopyLink}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
                                >
                                    {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">PIN de Gestión Familiar</p>
                                    <p className="text-lg font-bold tracking-[0.3em] font-mono text-white">
                                        {memorial?.access_key}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCopyPin}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold"
                            >
                                {pinCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                Copiar PIN
                            </button>
                        </div>

                        {/* Management Access Button */}
                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={() => {
                                    const managementUrl = `${window.location.protocol}//${window.location.host.split('.').length > 2 ? window.location.host.split('.').slice(1).join('.') : window.location.host}/memorials/m/${memorial?.id_recuerdo}/gestion`;
                                    window.open(managementUrl, '_blank');
                                }}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 group"
                            >
                                <Settings className="group-hover:rotate-90 transition-transform duration-300" size={20} />
                                Acceder como Dueño (Gestionar Memorial)
                            </button>
                            <p className="text-[10px] text-muted-foreground text-center mt-2">
                                Compartir este enlace para que el dueño pueda gestionar el memorial con su PIN
                            </p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 md:col-span-2">
                            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                <Heart size={16} className="text-primary" />
                                Mensaje de Despedida
                            </label>
                            <textarea
                                value={form.msg_despedida}
                                onChange={(e) => setForm({ ...form, msg_despedida: e.target.value.slice(0, 1000) })}
                                maxLength={1000}
                                onPaste={(e) => {
                                    setTimeout(() => {
                                        setForm(prev => {
                                            if (prev.msg_despedida.length > 1000) {
                                                alert('Tu mensaje ha sido ajustado al límite de 1000 caracteres.');
                                                return { ...prev, msg_despedida: prev.msg_despedida.slice(0, 1000) };
                                            }
                                            return prev;
                                        });
                                    }, 0);
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-primary/50 transition-all text-sm min-h-[120px]"
                                placeholder="Escribe unas palabras de despedida..."
                            />
                            <p className="text-[10px] text-right text-muted-foreground">{form.msg_despedida.length}/1000</p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                <Sparkles size={16} className="text-primary" />
                                Efecto de Partículas
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['nieve', 'estrellas'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setForm({ ...form, particulas: p })}
                                        className={`py-2 px-3 rounded-xl border text-[10px] uppercase font-black tracking-widest transition-all ${form.particulas === p
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                <Settings size={16} className="text-primary" />
                                Tema Visual
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {['claro', 'oscuro'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setForm({ ...form, tema: t })}
                                        className={`py-2 px-3 rounded-xl border text-[10px] uppercase font-black tracking-widest transition-all ${form.tema === t
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                                            }`}
                                    >
                                        {t === 'claro' ? 'Pastel Soft' : 'Night Mode'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl md:col-span-2">
                            <div>
                                <p className="text-sm font-bold text-white">Modo Privado</p>
                                <p className="text-[10px] text-muted-foreground">Solo accesible con PIN</p>
                            </div>
                            <button
                                onClick={() => setForm({ ...form, es_privado: !form.es_privado })}
                                className={`w-12 h-6 rounded-full relative transition-colors ${form.es_privado ? 'bg-primary' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.es_privado ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl hover:bg-white/5 font-bold transition-all"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center"
                        >
                            {saving && <Loader2 className="animate-spin mr-2" size={18} />}
                            Guardar Configuración
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
