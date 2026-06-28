'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Sparkles, Send, CheckCircle2, AlertCircle, Loader2, Link, Copy, ExternalLink } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import FormInput from '../forms/FormInput';
import FormTextarea from '../forms/FormTextarea';
import FormDatePicker from '../forms/FormDatePicker';
import FormFileUpload from '../forms/FormFileUpload';
import FormSelect from '../forms/FormSelect';
import { getTranslations, type Locale } from '@/lib/translations';

interface FreeMemorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    locale?: Locale;
}

export default function FreeMemorialModal({ isOpen, onClose, locale = 'es' }: FreeMemorialModalProps) {
    const t = getTranslations(locale);
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [memorialUrl, setMemorialUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        nombre_mascota: '',
        especie: '',
        raza: '',
        fecha_nacimiento: '',
        fecha_fallecimiento: '',
        nombre_cliente: '',
        email: '',
        telefono: '',
        mensaje: '',
        foto_base64: null as string | null,
        diseno: 'editorial',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!executeRecaptcha) {
            setError(t.free_modal_error_recaptcha);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = await executeRecaptcha('free_memorial_request');

            const response = await fetch('/api/public/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recaptcha_token: token,
                    nombre_cliente: form.nombre_cliente,
                    email: form.email,
                    telefono: form.telefono,
                    nombre_mascota: form.nombre_mascota,
                    especie: form.especie,
                    raza: form.raza,
                    fecha_nacimiento: form.fecha_nacimiento,
                    fecha_fallecimiento: form.fecha_fallecimiento,
                    mensaje: form.mensaje,
                    foto_base64: form.foto_base64,
                    diseno: form.diseno,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Error al enviar el formulario');
            }

            setSuccess(true);
            setMemorialUrl(data.memorial_url);
            setForm({
                nombre_mascota: '',
                especie: '',
                raza: '',
                fecha_nacimiento: '',
                fecha_fallecimiento: '',
                nombre_cliente: '',
                email: '',
                telefono: '',
                mensaje: '',
                foto_base64: null,
                diseno: 'editorial',
            });
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!memorialUrl) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(memorialUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            // Fallback: manually select and copy if possible
            const input = document.createElement('textarea');
            input.value = memorialUrl;
            document.body.appendChild(input);
            input.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (copyErr) {
                console.error('Fallback copy failed', copyErr);
            }
            document.body.removeChild(input);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Heart size={20} className="text-blue-500 fill-blue-500/20" />
                        </div>
                        <div>
                            <h2 className="text-xl font-serif font-bold text-slate-800">{t.free_modal_title}</h2>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.free_modal_subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {success ? (
                        <div className="py-8 text-center space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto"
                            >
                                <Sparkles className="text-blue-500" size={40} />
                            </motion.div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-serif font-bold text-slate-800">{t.free_modal_success_title}</h3>
                                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                    {t.free_modal_success_desc.replace('{name}', form.nombre_mascota || (locale === 'es' ? 'tu mascota' : 'your pet'))}
                                </p>
                            </div>

                            {memorialUrl && (
                                <div className="space-y-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 max-w-md mx-auto">
                                    <div className="flex items-center gap-2 justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <Link size={12} /> {t.free_modal_link_label}
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                                        <input
                                            readOnly
                                            value={memorialUrl}
                                            className="flex-1 text-[11px] text-slate-600 px-2 bg-transparent border-none focus:ring-0 truncate"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className={`p-2 rounded-lg transition-all ${copied
                                                ? 'bg-emerald-50 text-emerald-500'
                                                : 'hover:bg-slate-50 text-blue-500'
                                                }`}
                                            title={copied ? t.free_modal_copied : t.free_modal_copy_title}
                                        >
                                            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                    <div className="text-center pt-2">
                                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 py-2 px-4 rounded-xl">
                                            {t.free_modal_success_pending_title}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
                            >
                                {t.free_modal_close}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormInput
                                                label={t.free_modal_pet_name}
                                                name="nombre_mascota"
                                                value={form.nombre_mascota}
                                                onChange={(val) => setForm({ ...form, nombre_mascota: val })}
                                                placeholder={t.free_modal_pet_placeholder}
                                                required
                                            />
                                            <FormSelect
                                                label={t.free_modal_species}
                                                name="especie"
                                                value={form.especie}
                                                onChange={(val) => setForm({ ...form, especie: val })}
                                                options={[
                                                    { value: 'Perro', label: t.spec_dog },
                                                    { value: 'Gato', label: t.spec_cat },
                                                    { value: 'Ave', label: t.spec_bird },
                                                    { value: 'Mamifero', label: t.spec_mammal },
                                                    { value: 'Exotico', label: t.spec_exotic },
                                                    { value: 'Pez', label: t.spec_fish },
                                                    { value: 'Otro', label: t.spec_other }
                                                ]}
                                                placeholder={t.free_modal_species_placeholder}
                                                required
                                            />
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormInput
                                                label={t.free_modal_breed}
                                                name="raza"
                                                value={form.raza}
                                                onChange={(val) => setForm({ ...form, raza: val })}
                                                placeholder={t.free_modal_optional}
                                            />
                                            <FormDatePicker
                                                label={t.free_modal_birth}
                                                name="fecha_nacimiento"
                                                value={form.fecha_nacimiento}
                                                onChange={(val) => setForm({ ...form, fecha_nacimiento: val })}
                                            />
                                        </div>
                                        <FormDatePicker
                                            label={t.free_modal_death}
                                            name="fecha_fallecimiento"
                                            value={form.fecha_fallecimiento}
                                            onChange={(val) => setForm({ ...form, fecha_fallecimiento: val })}
                                            required
                                        />
                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="button"
                                                onClick={nextStep}
                                                disabled={!form.nombre_mascota || !form.especie || !form.fecha_fallecimiento}
                                                className="flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                            >
                                                {t.free_modal_step_1}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <FormInput
                                            label={t.free_modal_full_name}
                                            name="nombre_cliente"
                                            value={form.nombre_cliente}
                                            onChange={(val) => setForm({ ...form, nombre_cliente: val })}
                                            placeholder={t.free_modal_name_placeholder}
                                            required
                                        />
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormInput
                                                label={t.free_modal_email}
                                                name="email"
                                                type="email"
                                                value={form.email}
                                                onChange={(val) => setForm({ ...form, email: val })}
                                                placeholder="tu@email.com"
                                                required
                                            />
                                            <FormInput
                                                label={t.free_modal_phone}
                                                name="telefono"
                                                type="tel"
                                                value={form.telefono}
                                                onChange={(val) => setForm({ ...form, telefono: val })}
                                                placeholder="+56 9..."
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-between pt-4">
                                            <button
                                                type="button"
                                                onClick={prevStep}
                                                className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95"
                                            >
                                                {t.free_modal_back}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={nextStep}
                                                disabled={!form.nombre_cliente || !form.email || !form.telefono}
                                                className="flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                            >
                                                {t.free_modal_step_2}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="grid md:grid-cols-2 gap-6 items-start">
                                            <FormFileUpload
                                                label={t.free_modal_photo}
                                                preview={form.foto_base64}
                                                onFileSelect={(val) => setForm({ ...form, foto_base64: val })}
                                            />

                                            <div className="space-y-3">
                                                <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                                    {t.free_modal_design}
                                                </label>
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {[
                                                        { id: 'editorial', label: t.design_editorial_label, icon: '📖', desc: t.design_editorial_desc },
                                                        { id: 'solemne', label: t.design_solemn_label, icon: '📝', desc: t.design_solemn_desc },
                                                        { id: 'cinematic', label: t.design_cinematic_label, icon: '🎬', desc: t.design_cinema_desc }
                                                    ].map((d) => (
                                                        <button
                                                            key={d.id}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, diseno: d.id })}
                                                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${form.diseno === d.id
                                                                ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10'
                                                                : 'border-slate-100 hover:border-slate-200 bg-white'
                                                                }`}
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0">
                                                                {d.icon}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider truncate">{d.label}</h4>
                                                                <p className="text-[10px] text-slate-400 truncate">{d.desc}</p>
                                                            </div>
                                                            {form.diseno === d.id && (
                                                                <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                                                    <CheckCircle2 size={12} className="text-white" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <FormTextarea
                                            label={t.free_modal_farewell}
                                            name="mensaje"
                                            value={form.mensaje}
                                            onChange={(val) => setForm({ ...form, mensaje: val })}
                                            placeholder={t.free_modal_farewell_placeholder}
                                            maxLength={1000}
                                            required
                                        />

                                        {error && (
                                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 text-sm">
                                                <AlertCircle size={18} />
                                                <p>{error}</p>
                                            </div>
                                        )}

                                        <div className="flex justify-between pt-4">
                                            <button
                                                type="button"
                                                onClick={prevStep}
                                                className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95"
                                            >
                                                {t.free_modal_back}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading || !form.mensaje}
                                                className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-xl"
                                            >
                                                {loading ? (
                                                    <Loader2 className="animate-spin" size={16} />
                                                ) : (
                                                    <Send size={16} />
                                                )}
                                                {loading ? t.free_modal_sending : t.free_modal_submit}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    )}
                </div>

                {/* Footer trust */}
                {!success && (
                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            <Sparkles size={12} className="text-amber-400" /> {t.free_modal_recaptcha}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
