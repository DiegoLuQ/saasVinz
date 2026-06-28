"use client";

import React, { useState, useEffect, useRef } from 'react';
import LimitReachedModal from '@/components/memorial/LimitReachedModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Settings,
    MessageCircle,
    Check,
    X,
    Plus,
    Trash2,
    Save,
    Eye,
    Power,
    Loader2,
    ShieldCheck,
    User,
    Edit2,
    Feather,
    CloudIcon,
    Moon,
    Sun,
    Sparkles,
    Globe,
    Camera,
    LayoutDashboard,
    Quote,
    ExternalLink,
    Snowflake,
    Star,
    Lock,
    Crown,
    Image as ImageIcon
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getTranslations, type Locale, type TranslationKeys } from '@/lib/translations';
import { PaymentInterface } from '@/components/payments/PaymentInterface';
import ImageCropper from '@/components/tenant/ImageCropper';
import DedicationModal from '@/components/memorial/DedicationModal';
import { TributePlans } from '@/components/memorial/TributePlans';
import { HuellasFooter } from '@/components/public/HuellasFooter';
import NextImage from 'next/image';
// Altar3D removed — feature deprecated
import { ToastProvider } from '@/app/(tenant)/tenant/context/ToastContext';


const publicApiRequest = async (path: string, options: any = {}) => {
    const isServer = typeof window === 'undefined';
    const API_URL = !isServer
        ? ''
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

    // Si es multipart, dejamos que el navegador establezca el Content-Type con el boundary
    const headers = { ...options.headers };
    if (!options.isMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error en la petición');
    }
    return res.json();
};


const slugify = (text: string) => {
    if (!text) return '...';
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
};

export default function GestionMemorialPage() {
    const params = useParams();
    const router = useRouter();
    const uuid = params.uuid as string;

    // Theme State
    const [theme, setTheme] = useState('light');
    const isDark = theme === 'dark';

    useEffect(() => {
        const saved = localStorage.getItem('admin_theme_preference');
        if (saved) setTheme(saved);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('admin_theme_preference', newTheme);
    };

    const [locale, setLocale] = useState<Locale>('es');

    useEffect(() => {
        // Sync with PublicHeader/Landing changes
        const syncLocale = () => {
            const saved = localStorage.getItem('landing_locale') as Locale | null;
            if (saved === 'es' || saved === 'en') setLocale(saved);
        };
        syncLocale(); // Initial sync
        window.addEventListener('localeChange', syncLocale);
        window.addEventListener('storage', syncLocale);
        return () => {
            window.removeEventListener('localeChange', syncLocale);
            window.removeEventListener('storage', syncLocale);
        };
    }, []);

    const toggleLocale = () => {
        const next: Locale = locale === 'es' ? 'en' : 'es';
        setLocale(next);
        localStorage.setItem('landing_locale', next);
        window.dispatchEvent(new Event('localeChange'));
    };

    const t = getTranslations(locale);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDedication, setSelectedDedication] = useState<any>(null);
    const [isDedicationModalOpen, setIsDedicationModalOpen] = useState(false);
    const [memorial, setMemorial] = useState<any>(null);
    const [dedicatorias, setDedicatorias] = useState<any[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [dedicationToDelete, setDedicationToDelete] = useState<number | null>(null);

    const handleDeleteClick = (id: number) => {
        setDedicationToDelete(id);
        setShowDeleteModal(true);
    };

    const [editingDedication, setEditingDedication] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ mensajero: '', mensaje: '' });

    const [form, setForm] = useState({
        msg_despedida: '',
        diseno: {
            tema: 'claro',
            particulas: 'ninguna',
            tipo_diseno: 'normal',
            portada_url: '',
        },
        private_mode: false,
        pin: '',
        main_image_url: '',
        lista_imagenes: [] as string[]
    });

    const [uiBackgrounds, setUiBackgrounds] = useState<any[]>([]);

    useEffect(() => {
        const fetchUiBackgrounds = async () => {
            try {
                const res = await publicApiRequest('/api/internal/media?category=ui');
                if (res && res.items) {
                    setUiBackgrounds(res.items);
                }
            } catch (error) {
                console.error("Error fetching UI backgrounds:", error);
            }
        };
        fetchUiBackgrounds();
    }, []);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Section Refs for Anchoring
    const personalizationRef = useRef<HTMLDivElement>(null);
    const galleryRef = useRef<HTMLDivElement>(null);
    const moderationRef = useRef<HTMLDivElement>(null);

    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const calculateProgress = () => {
        let score = 0;
        let total = 5;

        if (form.main_image_url) score++;
        if (form.msg_despedida) score++;
        if (form.diseno.tema !== 'claro') score++; // Consider customization done if theme changed
        if (form.diseno.tipo_diseno !== 'normal') score++;
        if (dedicatorias.length > 0) score++;

        return Math.round((score / total) * 100);
    };

    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            const data = await publicApiRequest(`/api/internal/memorials/${uuid}/manage`, {
                headers: { 'access-key': pin }
            });
            setMemorial(data);
            setDedicatorias(data.dedicatorias || []);

            const design = data.diseno || {};
            setForm({
                msg_despedida: data.msg_despedida || '',
                diseno: {
                    tema: design.tema || 'claro',
                    particulas: design.particulas || 'ninguna',
                    tipo_diseno: design.tipo_diseno || 'normal',
                    portada_url: design.portada_url || '',
                },
                private_mode: data.private_mode || false,
                pin: data.pin || '',
                main_image_url: data.main_image_url || '',
                lista_imagenes: data.lista_imagenes || []
            });

            setLoading(false);
        } catch (err: any) {
            if (err.message === 'Unauthorized') {
                localStorage.removeItem(`memorial_pin_${uuid}`);
                router.push(`/memorials/m/${uuid}/login`);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        if (uuid) {
            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            if (!pin) {
                router.push(`/memorials/m/${uuid}/login`);
                return;
            }
            fetchData();
        }
    }, [uuid]);

    const handleStatusChange = async (id: number, status: string) => {
        try {
            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            await publicApiRequest(`/api/internal/memorials/dedications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ estado: status }),
                headers: { 'access-key': pin }
            });
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };


    const handleEditDedication = async (id: number) => {
        try {
            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            await publicApiRequest(`/api/internal/memorials/dedications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(editForm),
                headers: { 'access-key': pin }
            });
            setEditingDedication(null);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            await publicApiRequest(`/api/internal/memorials/${uuid}/manage`, {
                method: 'PATCH',
                body: JSON.stringify(form),
                headers: { 'access-key': pin }
            });
            setShowSuccessModal(true);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Reset input to allow selecting same file again
        e.target.value = '';
    };

    const onCropComplete = async (croppedBlob: Blob) => {
        setImageToCrop(null);
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('file', croppedBlob, 'cropped_image.png');

            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            const data = await publicApiRequest(`/api/internal/memorials/${uuid}/images`, {
                method: 'POST',
                body: formData,
                headers: { 'access-key': pin as string },
                isMultipart: true
            });

            setMemorial(data);
            setForm(prev => ({
                ...prev,
                main_image_url: data.main_image_url,
                lista_imagenes: data.lista_imagenes
            }));
            setShowSuccessModal(true);
        } catch (err: any) {
            console.error('Error al subir imagen:', err);
            alert(err.message || 'Error al subir imagen');
        } finally {
            setSaving(false);
        }
    };

    const handleImageDelete = async (url: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta imagen?')) return;

        setSaving(true);
        try {
            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            const data = await publicApiRequest(`/api/internal/memorials/${uuid}/images?url=${encodeURIComponent(url)}`, {
                method: 'DELETE',
                headers: { 'access-key': pin as string }
            });

            setMemorial(data);
            setForm(prev => ({
                ...prev,
                main_image_url: data.main_image_url,
                lista_imagenes: data.lista_imagenes
            }));
        } catch (err: any) {
            console.error('Error al eliminar imagen:', err);
            alert(err.message || 'Error al eliminar imagen');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(`memorial_pin_${uuid}`);
        router.push(`/memorials/m/${uuid}/login`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    const { mascota } = memorial;
    const tenant = memorial.tenant || memorial.tenant_info;

    // Calculate Limits using strictly the plan from rec_recuerdos
    const rawPlan = memorial.plan || 'PRO';
    const planName = rawPlan.toUpperCase().trim();

    // Define limits: ULTRA/PARAISO=33, PRO/VINCULO=21, NORMAL/HUELLA=9, FREE/RECUERDO=0
    const limit = (planName === 'ULTRA' || planName === 'PARAISO')
        ? 33
        : (planName === 'NORMAL' || planName === 'HUELLA')
            ? 9
            : (planName === 'FREE' || planName === 'RECUERDO')
                ? 0
                : 21; // PRO/VINCULO/PRO+ default to 21

    // IMAGE LIMITS: ULTRA/PARAISO=5, PRO/VINCULO/PRO+=3, NORMAL/HUELLA=2, FREE/RECUERDO=1
    const imgLimit = (planName === 'ULTRA' || planName === 'PARAISO')
        ? 5
        : (planName === 'NORMAL' || planName === 'HUELLA')
            ? 2
            : (planName === 'FREE' || planName === 'RECUERDO')
                ? 1
                : 3; // PRO/VINCULO/PRO+ default to 3

    const approved = dedicatorias.filter(d => d.estado === 'aprobado').length;


    const confirmDelete = async () => {
        if (!dedicationToDelete) return;

        try {
            const pin = localStorage.getItem(`memorial_pin_${uuid}`);
            await publicApiRequest(`/api/internal/memorials/dedications/${dedicationToDelete}`, {
                method: 'DELETE',
                headers: { 'access-key': pin }
            });
            fetchData();
            setShowDeleteModal(false);
            setDedicationToDelete(null);
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <ToastProvider>
            <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0f172a] text-slate-100 selection:bg-sky-900 selection:text-sky-200' : 'bg-slate-50 text-slate-800 selection:bg-sky-200 selection:text-sky-900'}`}>
                {/* Celestial Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-90' : 'bg-gradient-to-br from-sky-100 via-white to-sky-50 opacity-100'}`} />
                    <div className={`absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[120px] animate-pulse-slow transition-colors duration-700 ${isDark ? 'bg-sky-900/10' : 'bg-sky-300/20'}`} />
                    <div className={`absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[100px] transition-colors duration-700 ${isDark ? 'bg-indigo-900/10' : 'bg-blue-200/20'}`} />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
                </div>

                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className={`max-w-sm w-full border rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-900/90 border-slate-700 text-slate-100 shadow-black' : 'bg-white/90 border-white/60 text-slate-800 shadow-sky-900/10'}`}
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
                                <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center border ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}>
                                    <Trash2 className="w-8 h-8 text-red-400" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className={`text-xl font-bold tracking-tight font-serif ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.mg_delete_confirm_title}</h3>
                                    <p className={`text-sm leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.mg_delete_confirm_msg}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className={`py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                                    >
                                        {t.mg_cancel}
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className={`py-3 border rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 ${isDark ? 'bg-red-900/20 text-red-400 border-red-900/30 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white'}`}
                                    >
                                        {t.mg_delete}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div >
                    )}
                </AnimatePresence >

                <header className={`border-b relative z-20 shadow-sm transition-colors duration-500 ${isDark ? 'bg-slate-900 border-slate-700 shadow-black/20' : 'bg-white border-white/40 shadow-sky-100/50'}`}>
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 text-sky-400 shadow-inner' : 'bg-sky-100 text-sky-600'}`}>
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h1 className={`text-2xl font-black leading-tight tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.mg_title}</h1>
                                <p className={`text-xs uppercase font-black tracking-widest leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.mg_pet_family} {mascota?.nombre || mascota?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleLocale}
                                className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-sky-400 hover:bg-slate-700' : 'bg-white/50 border-white/50 text-slate-400 hover:text-sky-500 hover:bg-white'}`}
                                title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                            >
                                <Globe size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                                    {locale === 'es' ? 'ES' : 'EN'}
                                </span>
                            </button>

                            <div className={`flex items-center p-1 rounded-xl border transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/50 border-white/50'}`}>
                                <button
                                    onClick={() => { setTheme('light'); localStorage.setItem('admin_theme_preference', 'light'); }}
                                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${theme === 'light'
                                        ? 'bg-amber-100 text-amber-600 shadow-sm'
                                        : 'text-slate-400 hover:text-amber-500'}`}
                                    title="Modo Claro"
                                >
                                    <Sun size={16} strokeWidth={2.5} />
                                </button>
                                <button
                                    onClick={() => { setTheme('dark'); localStorage.setItem('admin_theme_preference', 'dark'); }}
                                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${theme === 'dark'
                                        ? 'bg-slate-700 text-sky-400 shadow-sm'
                                        : 'text-slate-400 hover:text-sky-500'}`}
                                    title="Modo Oscuro"
                                >
                                    <Moon size={16} strokeWidth={2.5} />
                                </button>
                            </div>


                            <button
                                onClick={() => window.open(`/memorials/v/${(tenant?.name || 'memorial').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}/${(mascota?.nombre || mascota?.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}/${uuid}`, '_blank')}
                                className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center gap-2 ${isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20' : 'bg-sky-600 text-white border-sky-700 hover:bg-sky-700 shadow-lg shadow-sky-600/20'}`}
                                title="Ver Altar Público"
                            >
                                <Eye size={20} />
                                <span className="text-[11px] font-bold uppercase tracking-[0.15em] hidden md:inline">
                                    {locale === 'es' ? 'Previsualizar' : 'Preview'}
                                </span>
                                <ExternalLink size={14} className="opacity-60" />
                            </button>
                            <button
                                onClick={handleLogout}
                                className={`p-2.5 rounded-xl border transition-all ${isDark ? 'bg-red-900/10 border-red-900/30 text-red-400 hover:bg-red-900/20' : 'bg-red-50 border-red-100 text-red-400 hover:bg-red-100'}`}
                                title="Cerrar Sesión"
                            >
                                <Power size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="relative z-10 transition-all duration-500">
                    <div className="max-w-7xl mx-auto px-6 py-10 pb-40">
                        {/* ─── Header de Progreso (Relocalizado) ─── */}
                        <div className="mb-12">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-8 rounded-[3rem] border flex items-center justify-between gap-6 ${isDark ? 'bg-slate-800/40 border-slate-700/50 shadow-black/20' : 'bg-white/60 border-white/40 shadow-sky-100/30'}`}
                            >
                                <div className="flex items-center gap-6">
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="32" cy="32" r="28" fill="transparent" stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth="6" />
                                            <circle cx="32" cy="32" r="28" fill="transparent" stroke="#0ea5e9" strokeWidth="6" strokeDasharray={176} strokeDashoffset={176 - (176 * calculateProgress()) / 100} strokeLinecap="round" className="transition-all duration-1000" />
                                        </svg>
                                        <span className={`absolute text-sm font-black tracking-tighter ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{calculateProgress()}%</span>
                                    </div>
                                    <div>
                                        <h3 className={`text-xs font-black uppercase tracking-[0.3em] mb-1 opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.mg_progress_title}</h3>
                                        <p className={`text-lg font-bold leading-tight ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {t.mg_progress_msg.replace('{name}', mascota?.nombre || mascota?.name || '...')}
                                        </p>
                                    </div>
                                </div>

                                {calculateProgress() < 100 && (
                                    <div className={`hidden md:flex flex-col items-end text-right px-6 py-3 rounded-2xl border ${isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-100 text-sky-600'}`}>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Siguiente Paso</span>
                                        <span className="text-sm font-bold">Completa el perfil de {mascota?.nombre}</span>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                            <div className="xl:col-span-12 w-full space-y-8">
                                <div className={`glass-card p-10 rounded-[2.5rem] border shadow-xl backdrop-blur-md transition-all duration-500 ${isDark ? 'bg-slate-800/50 border-slate-700/50 shadow-black/20' : 'bg-white/70 border-white/60 shadow-sky-100/50'}`}>
                                    <div className="flex items-center gap-4 mb-10">
                                        <Settings className={isDark ? "text-sky-400" : "text-sky-600"} size={32} />
                                        <h2 className={`text-2xl font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.mg_personalization}</h2>
                                    </div>

                                    <div ref={personalizationRef} className="scroll-mt-24">

                                        {/* ─── PREMIUM THEME SELECTOR ─── */}
                                        {(() => {
                                            const themeGradients: Record<string, { gradient: string, ring: string, label: string }> = {
                                                'claro': { gradient: 'from-sky-100 via-slate-50 to-white', ring: 'ring-sky-300', label: t.mg_theme_light },
                                                'oscuro': { gradient: 'from-slate-800 via-slate-900 to-slate-950', ring: 'ring-slate-500', label: t.mg_theme_dark },
                                                'esmeralda': { gradient: 'from-emerald-400 via-emerald-600 to-emerald-900', ring: 'ring-emerald-400', label: t.mg_theme_emerald },
                                                'dorado': { gradient: 'from-amber-300 via-amber-500 to-amber-700', ring: 'ring-amber-400', label: t.mg_theme_gold },
                                                'rosado': { gradient: 'from-rose-300 via-rose-400 to-rose-600', ring: 'ring-rose-400', label: t.mg_theme_rose },
                                                'safiro': { gradient: 'from-blue-400 via-blue-600 to-blue-900', ring: 'ring-blue-400', label: t.mg_theme_sapphire },
                                                'orange': { gradient: 'from-orange-300 via-orange-500 to-orange-700', ring: 'ring-orange-400', label: t.mg_theme_orange },
                                            };

                                            const getThemeColorClass = (theme: string, type: string, isDark: boolean) => {
                                                const colors: any = {
                                                    'esmeralda': { active_bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-50', active_border: isDark ? 'border-emerald-500/40' : 'border-emerald-200', active_text: isDark ? 'text-emerald-300' : 'text-emerald-700' },
                                                    'dorado': { active_bg: isDark ? 'bg-amber-500/20' : 'bg-amber-50', active_border: isDark ? 'border-amber-500/40' : 'border-amber-200', active_text: isDark ? 'text-amber-300' : 'text-amber-700' },
                                                    'rosado': { active_bg: isDark ? 'bg-rose-500/20' : 'bg-rose-50', active_border: isDark ? 'border-rose-500/40' : 'border-rose-200', active_text: isDark ? 'text-rose-300' : 'text-rose-700' },
                                                    'safiro': { active_bg: isDark ? 'bg-blue-600/20' : 'bg-blue-50', active_border: isDark ? 'border-blue-500/40' : 'border-blue-200', active_text: isDark ? 'text-blue-300' : 'text-blue-700' },
                                                    'orange': { active_bg: isDark ? 'bg-orange-500/20' : 'bg-orange-50', active_border: isDark ? 'border-orange-500/40' : 'border-orange-200', active_text: isDark ? 'text-orange-300' : 'text-orange-700' },
                                                    'claro': { active_bg: isDark ? 'bg-sky-500/20' : 'bg-white', active_border: isDark ? 'border-sky-500/40' : 'border-sky-200', active_text: isDark ? 'text-sky-300' : 'text-sky-700' },
                                                    'oscuro': { active_bg: isDark ? 'bg-sky-500/20' : 'bg-white', active_border: isDark ? 'border-sky-500/40' : 'border-sky-200', active_text: isDark ? 'text-sky-300' : 'text-sky-700' },
                                                };
                                                return (colors[theme] || colors['claro'])[type];
                                            };

                                            return (
                                                <>
                                                    <div className="space-y-5 pt-6 border-t border-slate-700/30">
                                                        <label className={`text-sm font-black uppercase tracking-wider ml-1 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            <Sparkles size={16} className="opacity-60" />
                                                            {t.mg_theme}
                                                        </label>
                                                        <div className="flex flex-wrap gap-3 justify-center">
                                                            {Object.entries(themeGradients).map(([key, val]) => {
                                                                const isActive = form.diseno.tema === key;
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        onClick={() => setForm({ ...form, diseno: { ...form.diseno, tema: key } })}
                                                                        className="flex flex-col items-center gap-1.5 group"
                                                                    >
                                                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${val.gradient} border-2 transition-all duration-300 ${isActive
                                                                            ? `${val.ring} ring-2 ring-offset-2 ${isDark ? 'ring-offset-slate-900' : 'ring-offset-white'} border-transparent scale-110 shadow-lg`
                                                                            : `${isDark ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-400'} hover:scale-105`
                                                                        }`} />
                                                                        <span className={`text-[9px] font-black uppercase tracking-widest transition-all ${isActive
                                                                            ? (isDark ? 'text-slate-200' : 'text-slate-700')
                                                                            : (isDark ? 'text-slate-600 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-600')
                                                                        }`}>
                                                                            {val.label}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* ─── PREMIUM LAYOUT CARDS ─── */}
                                                    <div className="space-y-5 pt-6">
                                                        <label className={`text-sm font-black uppercase tracking-wider ml-1 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            <LayoutDashboard size={16} className="opacity-60" />
                                                            {t.mg_page_design}
                                                        </label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                                            {[
                                                                { id: 'normal', label: t.mg_design_normal, icon: '🏠', plan: 'FREE', desc: locale === 'es' ? 'Clásico y elegante' : 'Classic & elegant' },
                                                                { id: 'editorial', label: t.mg_design_editorial, icon: '📰', plan: 'PRO', desc: locale === 'es' ? 'Estilo revista' : 'Magazine style' },
                                                                { id: 'carta', label: t.mg_design_solemn, icon: '✉️', plan: 'PRO', desc: locale === 'es' ? 'Carta solemne' : 'Solemn letter' },
                                                                { id: 'altar', label: t.mg_design_altar, icon: '🕯️', plan: 'FREE', desc: locale === 'es' ? 'Altar solemne' : 'Solemn altar' },
                                                                { id: 'cielo', label: locale === 'es' ? 'Cielo' : 'Heaven', icon: '☁️', plan: 'PRO', desc: locale === 'es' ? 'Celestial y etéreo' : 'Celestial & ethereal' },
                                                                { id: 'cinematico', label: locale === 'es' ? 'Cinemático' : 'Cinematic', icon: '🎬', plan: 'ULTRA', desc: locale === 'es' ? 'Épico y dramático' : 'Epic & dramatic' },
                                                                { id: 'constelacion', label: locale === 'es' ? 'Constelación' : 'Constellation', icon: '🌌', plan: 'ULTRA', desc: locale === 'es' ? 'Una estrella en el cielo' : 'A star in the sky' },
                                                                { id: 'galeria', label: locale === 'es' ? 'Galería' : 'Gallery', icon: '🖼️', plan: 'ULTRA', desc: locale === 'es' ? 'Museo y obra de arte' : 'Museum & artwork' },
                                                            ].map((d) => {
                                                                const planRanks: Record<string, number> = { FREE: 0, RECUERDO: 0, NORMAL: 1, HUELLA: 1, PRO: 2, VINCULO: 2, 'PRO+': 2, ULTRA: 3, PARAISO: 3 };
                                                                const requiredRank = planRanks[d.plan] || 0;
                                                                const currentRank = planRanks[planName] ?? 0;
                                                                const isLocked = currentRank < requiredRank;
                                                                const isActive = form.diseno.tipo_diseno === d.id;

                                                                return (
                                                                    <motion.button
                                                                        key={d.id}
                                                                        whileHover={!isLocked ? { scale: 1.02 } : {}}
                                                                        whileTap={!isLocked ? { scale: 0.98 } : {}}
                                                                        onClick={() => !isLocked && setForm({ ...form, diseno: { ...form.diseno, tipo_diseno: d.id } })}
                                                                        disabled={isLocked}
                                                                        className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 ${isActive
                                                                            ? `${getThemeColorClass(form.diseno.tema || 'claro', 'active_bg', isDark)} ${getThemeColorClass(form.diseno.tema || 'claro', 'active_border', isDark)} shadow-lg`
                                                                            : isLocked
                                                                                ? (isDark ? 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed')
                                                                                : (isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-sky-500/30 hover:bg-slate-800' : 'bg-white/50 border-slate-100 hover:border-sky-200 hover:bg-white')
                                                                        }`}
                                                                    >
                                                                        {/* Plan Badge */}
                                                                        {d.plan !== 'FREE' && (
                                                                            <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md ${
                                                                                d.plan === 'ULTRA'
                                                                                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                                                                                    : 'bg-gradient-to-r from-sky-400 to-blue-500 text-white'
                                                                            }`}>
                                                                                <Crown size={8} />
                                                                                {d.plan}
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-2xl">{d.icon}</span>
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className={`text-xs font-black uppercase tracking-wider block ${isActive
                                                                                    ? getThemeColorClass(form.diseno.tema || 'claro', 'active_text', isDark)
                                                                                    : (isDark ? 'text-slate-300' : 'text-slate-600')
                                                                                }`}>
                                                                                    {d.label}
                                                                                </span>
                                                                                <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                                    {d.desc}
                                                                                </span>
                                                                            </div>
                                                                            {isLocked && <Lock size={14} className={isDark ? 'text-slate-600' : 'text-slate-300'} />}
                                                                            {isActive && <Check size={16} className={getThemeColorClass(form.diseno.tema || 'claro', 'active_text', isDark)} strokeWidth={3} />}
                                                                        </div>
                                                                    </motion.button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}

                                        <div ref={galleryRef} className="space-y-4 pt-4 scroll-mt-24">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.mg_main_image}</label>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-100 text-sky-600'}`}>
                                                    {t.mg_plan_limit.replace('{plan}', planName).replace('{limit}', imgLimit.toString())}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {(memorial?.lista_imagenes || [])
                                                    .filter((img: string) => img && img.startsWith('http'))
                                                    .map((img: string, i: number) => (
                                                        <div key={i} className="relative group">
                                                            <button
                                                                onClick={() => setForm({ ...form, main_image_url: img })}
                                                                className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${form.main_image_url === img
                                                                    ? 'border-sky-500 shadow-md scale-95 ring-2 ring-sky-500/30 ring-offset-2'
                                                                    : (isDark ? 'border-slate-700 hover:border-sky-500/50 opacity-60 hover:opacity-100' : 'border-slate-200 hover:border-sky-200 opacity-60 hover:opacity-100')}`}
                                                            >
                                                                <img src={img} className="w-full h-full object-cover" alt={`Mascota ${i + 1}`} />

                                                                {/* Selection Overlay */}
                                                                {form.main_image_url === img && (
                                                                    <div className="absolute inset-0 bg-sky-900/20 flex items-center justify-center backdrop-blur-[1px]">
                                                                        <div className="bg-sky-500 text-white rounded-full p-2 shadow-lg scale-110 animate-in fade-in zoom-in duration-200">
                                                                            <Check size={20} strokeWidth={4} />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Hover Hint for Unselected */}
                                                                {form.main_image_url !== img && (
                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white border border-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                                                            Seleccionar
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleImageDelete(img); }}
                                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 hover:scale-110 z-10"
                                                                title="Eliminar imagen"
                                                            >
                                                                <X size={12} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ))}


                                                {/* Botón de Subir - Solo visible si no se ha alcanzado el límite */}
                                                {(memorial?.lista_imagenes || []).filter((img: string) => img && img.startsWith('http')).length < imgLimit && (
                                                    <div
                                                        onClick={() => {
                                                            document.getElementById('image-upload-input')?.click();
                                                        }}
                                                        className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${isDark ? 'border-slate-700 hover:border-sky-500/50 text-slate-500 hover:text-sky-400' : 'border-slate-200 hover:border-sky-200 text-slate-400 hover:text-sky-600'}`}
                                                    >
                                                        <Plus size={24} strokeWidth={2.5} />
                                                        <span className="text-[10px] uppercase font-black mt-1">{t.mg_upload}</span>
                                                        <span className="text-[9px] opacity-50 font-bold">{(memorial?.lista_imagenes || []).filter((img: string) => img && img.startsWith('http')).length} / {imgLimit}</span>
                                                        <input
                                                            id="image-upload-input"
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                        />
                                                    </div>
                                                )}
                                            </div>


                                        </div>

                                        {/* ─── COVER BACKGROUND (PORTADA) SELECTOR ─── */}
                                        <div className="space-y-5 pt-6 border-t border-slate-700/20">
                                            <label className={`text-sm font-black uppercase tracking-wider ml-1 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <ImageIcon size={16} className="opacity-60" />
                                                {locale === 'es' ? 'Imagen de Portada' : 'Cover Image'}
                                            </label>
                                            <p className={`text-xs ml-1 -mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {locale === 'es'
                                                    ? 'Selecciona un fondo premium para la portada de tu memorial.'
                                                    : 'Select a premium background for your memorial cover.'}
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {/* Default option: no portada (uses pet photo) */}
                                                <button
                                                    onClick={() => setForm({ ...form, diseno: { ...form.diseno, portada_url: '' } })}
                                                    className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 aspect-[16/9] flex flex-col items-center justify-center gap-1 ${
                                                        !form.diseno.portada_url
                                                            ? (isDark ? 'bg-sky-500/15 border-sky-500/40 shadow-lg' : 'bg-sky-50 border-sky-300 shadow-md')
                                                            : (isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-sky-500/30' : 'bg-white/50 border-slate-100 hover:border-sky-200')
                                                    }`}
                                                >
                                                    <Heart size={20} className={!form.diseno.portada_url ? (isDark ? 'text-sky-400' : 'text-sky-600') : (isDark ? 'text-slate-500' : 'text-slate-400')} />
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${!form.diseno.portada_url ? (isDark ? 'text-sky-300' : 'text-sky-700') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                                                        {locale === 'es' ? 'Por Defecto' : 'Default'}
                                                    </span>
                                                    {!form.diseno.portada_url && (
                                                        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-sky-500' : 'bg-sky-500'}`}>
                                                            <Check size={12} className="text-white" strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </button>

                                                {/* UI Backgrounds from media library */}
                                                {uiBackgrounds.map((bg: any) => {
                                                    const isSelected = form.diseno.portada_url === bg.url;
                                                    return (
                                                        <button
                                                            key={bg.id || bg.url}
                                                            onClick={() => setForm({ ...form, diseno: { ...form.diseno, portada_url: bg.url } })}
                                                            className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 aspect-[16/9] group ${
                                                                isSelected
                                                                    ? (isDark ? 'border-sky-500/60 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/30' : 'border-sky-400 shadow-md ring-2 ring-sky-300/40')
                                                                    : (isDark ? 'border-slate-700/50 hover:border-sky-500/30 opacity-70 hover:opacity-100' : 'border-slate-100 hover:border-sky-200 opacity-70 hover:opacity-100')
                                                            }`}
                                                        >
                                                            <img
                                                                src={bg.url}
                                                                alt={bg.name || 'Fondo'}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            {/* Hover overlay */}
                                                            {!isSelected && (
                                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white border border-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                                                        {locale === 'es' ? 'Seleccionar' : 'Select'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {/* Selected check */}
                                                            {isSelected && (
                                                                <div className="absolute inset-0 bg-sky-900/20 flex items-center justify-center backdrop-blur-[1px]">
                                                                    <div className="bg-sky-500 text-white rounded-full p-2 shadow-lg">
                                                                        <Check size={18} strokeWidth={3} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Name label */}
                                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                                <span className="text-[8px] font-bold uppercase tracking-widest text-white/80 truncate block">
                                                                    {bg.name || 'Fondo'}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {uiBackgrounds.length === 0 && (
                                                <p className={`text-xs italic ml-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {locale === 'es' ? 'No hay fondos disponibles en la biblioteca.' : 'No backgrounds available in the library.'}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-5 pt-6">
                                            <label className={`text-sm font-black uppercase tracking-wider ml-1 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <Sparkles size={16} className="opacity-60" />
                                                {t.mg_visual_effect}
                                            </label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {([
                                                    { id: 'ninguna', label: t.mg_effect_none, icon: <X size={20} />, desc: locale === 'es' ? 'Sin efecto' : 'No effect' },
                                                    { id: 'nieve', label: t.mg_effect_snow, icon: <Snowflake size={20} />, desc: locale === 'es' ? 'Copos suaves' : 'Soft flakes' },
                                                    { id: 'estrellas', label: t.mg_effect_stars, icon: <Star size={20} />, desc: locale === 'es' ? 'Cielo estrellado' : 'Starry sky' },
                                                ] as const).map((p) => {
                                                    const isActive = form.diseno.particulas === p.id;
                                                    return (
                                                        <motion.button
                                                            key={p.id}
                                                            whileHover={{ scale: 1.04 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            onClick={() => setForm({ ...form, diseno: { ...form.diseno, particulas: p.id } })}
                                                            className={`relative p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-300 ${isActive
                                                                ? (isDark ? 'bg-sky-500/15 border-sky-500/40 shadow-lg shadow-sky-500/10' : 'bg-sky-50 border-sky-300 shadow-md shadow-sky-200/40')
                                                                : (isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-sky-500/20' : 'bg-white/50 border-slate-100 hover:border-sky-200')
                                                            }`}
                                                        >
                                                            <div className={`transition-colors ${isActive ? (isDark ? 'text-sky-400' : 'text-sky-600') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                                                                {p.icon}
                                                            </div>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? (isDark ? 'text-sky-300' : 'text-sky-700') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                                                                {p.label}
                                                            </span>
                                                            {isActive && (
                                                                <motion.div
                                                                    layoutId="particle-indicator"
                                                                    className={`absolute -bottom-1 w-8 h-1 rounded-full ${isDark ? 'bg-sky-500' : 'bg-sky-500'}`}
                                                                />
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4">
                                            <label className={`text-sm font-black uppercase tracking-wider ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.mg_farewell_msg}</label>
                                            <textarea
                                                className={`w-full border rounded-2xl p-5 text-sm outline-none transition-all resize-none min-h-[200px] placeholder:text-slate-400 ${isDark ? 'bg-slate-900/50 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-sky-400'}`}
                                                value={form.msg_despedida}
                                                onChange={e => setForm({ ...form, msg_despedida: e.target.value.slice(0, 500) })}
                                                maxLength={500}
                                                onPaste={() => {
                                                    setTimeout(() => {
                                                        setForm(prev => {
                                                            if (prev.msg_despedida.length > 500) {
                                                                alert('Tu mensaje ha sido ajustado al límite de 500 caracteres.');
                                                                return { ...prev, msg_despedida: prev.msg_despedida.slice(0, 500) };
                                                            }
                                                            return prev;
                                                        });
                                                    }, 0);
                                                }}
                                                placeholder="Escribe unas palabras para honrar su memoria..."
                                            />
                                            <p className={`text-[10px] text-right ${form.msg_despedida.length > 450 ? 'text-amber-500 font-bold' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {form.msg_despedida.length}/500
                                            </p>
                                        </div>

                                        <motion.button
                                            onClick={handleSaveSettings}
                                            disabled={saving}
                                            whileHover={{ scale: saving ? 1 : 1.02 }}
                                            whileTap={{ scale: saving ? 1 : 0.98 }}
                                            className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 mt-8 relative overflow-hidden ${saving
                                                ? 'bg-sky-700 text-sky-100 cursor-wait'
                                                : 'bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 text-white shadow-xl shadow-sky-600/30 hover:shadow-sky-500/40'
                                            }`}
                                        >
                                            {!saving && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                                            )}
                                            {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                            {saving ? t.mg_saving : t.mg_save_success}
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {planName !== 'FREE' && planName !== 'RECUERDO' && (
                                <div ref={moderationRef} className="xl:col-span-12 space-y-8 scroll-mt-24">
                                    {/* Dedications Header - Explicitly Rerendered */}
                                    {/* Professional Moderate Header */}
                                    <div className={`p-8 rounded-[3rem] border shadow-2xl backdrop-blur-xl transition-all duration-700 relative overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/60 border-white/80 shadow-sky-100/50'}`}>
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <MessageCircle size={120} className={isDark ? "text-white" : "text-sky-900"} />
                                        </div>

                                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-3 ${isDark ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white' : 'bg-gradient-to-br from-sky-400 to-sky-600 text-white'}`}>
                                                    <MessageCircle size={32} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h2 className={`text-3xl font-serif font-black tracking-tight mb-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.mg_moderate}</h2>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{planName} PLAN</span>
                                                        <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
                                                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            {memorial.valid_until ? `${locale === 'es' ? 'Vence' : 'Expires'}: ${new Date(memorial.valid_until).toLocaleDateString()}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className={`flex flex-col items-end px-5 py-2.5 rounded-2xl border transition-all ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>{locale === 'es' ? 'Pendientes' : 'Pending'}</span>
                                                    <span className={`text-xl font-black tabular-nums ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>{dedicatorias.filter(d => d.estado === 'pendiente').length}</span>
                                                </div>
                                                <div className={`flex flex-col items-end px-5 py-2.5 rounded-2xl border transition-all ${approved >= limit ? (isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100') : (isDark ? 'bg-sky-500/5 border-sky-500/20' : 'bg-sky-50 border-sky-100')}`}>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${approved >= limit ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-sky-400' : 'text-sky-600')}`}>{locale === 'es' ? 'Uso' : 'Usage'}</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`text-xl font-black tabular-nums ${approved >= limit ? (isDark ? 'text-red-200' : 'text-red-700') : (isDark ? 'text-sky-200' : 'text-sky-700')}`}>{approved}</span>
                                                        <span className={`text-xs font-bold opacity-40 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>/ {limit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {dedicatorias.length === 0 ? (
                                            <div className={`text-center py-20 rounded-[2.5rem] border border-dashed transition-colors ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white/40 border-sky-100'}`}>
                                                <Heart size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-sky-200'}`} />
                                                <p className={`font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{locale === 'es' ? 'Aún no hay dedicatorias.' : 'No dedications yet.'}</p>
                                            </div>
                                        ) : (
                                            <AnimatePresence mode="popLayout">
                                                {dedicatorias.map((d) => (
                                                    <motion.div
                                                        key={d.id_dedicatoria}
                                                        layout
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden group ${d.estado === 'pendiente'
                                                            ? (isDark ? 'bg-amber-900/10 shadow-lg shadow-amber-900/10 border-amber-900/30' : 'bg-amber-50 shadow-lg shadow-amber-500/10 border-amber-200')
                                                            : (isDark ? 'bg-slate-800/60 border-slate-700/50 shadow-sm hover:shadow-md hover:shadow-black/30' : 'bg-white/80 border-white/60 shadow-sm backdrop-blur-md hover:shadow-md hover:shadow-sky-100/50')}`}
                                                        onClick={() => {
                                                            setSelectedDedication(d);
                                                            setIsDedicationModalOpen(true);
                                                        }}
                                                    >
                                                        <div className="relative">
                                                            {/* Header & Content */}
                                                            <div className="pr-24"> {/* Espacio para botones absolutos */}
                                                                {editingDedication === d.id_dedicatoria ? (
                                                                    <div className="space-y-3" onClick={e => e.stopPropagation()}>
                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editForm.mensajero}
                                                                                onChange={e => setEditForm({ ...editForm, mensajero: e.target.value })}
                                                                                className={`flex-1 border rounded-xl px-3 py-2 text-sm outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-600 text-slate-100 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-sky-400'}`}
                                                                                placeholder="Nombre"
                                                                            />
                                                                        </div>
                                                                        <textarea
                                                                            value={editForm.mensaje}
                                                                            onChange={e => setEditForm({ ...editForm, mensaje: e.target.value })}
                                                                            className={`w-full border rounded-xl px-3 py-2 text-sm outline-none resize-none transition-colors ${isDark ? 'bg-slate-900 border-slate-600 text-slate-100 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-sky-400'}`}
                                                                            rows={2}
                                                                            placeholder="Mensaje"
                                                                        />
                                                                        <div className="flex gap-2 justify-end">
                                                                            <button
                                                                                onClick={() => setEditingDedication(null)}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                                                                            >
                                                                                Cancelar
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleEditDedication(d.id_dedicatoria)}
                                                                                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-emerald-600"
                                                                            >
                                                                                <Check size={12} /> Guardar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center gap-3 mb-3">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${isDark ? 'bg-slate-700 border-slate-600 text-sky-400' : 'bg-sky-100 text-sky-600 border-sky-200'}`}>
                                                                                <User size={14} />
                                                                            </div>
                                                                            <div>
                                                                                <h3 className={`font-bold text-sm leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{d.mensajero}</h3>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(d.fecha).toLocaleDateString()}</span>
                                                                                    {d.estado === 'pendiente' && (
                                                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest leading-none ${isDark ? 'bg-amber-900/30 text-amber-500' : 'bg-amber-100 text-amber-600'}`}>{locale === 'es' ? 'Pendiente' : 'Pending'}</span>
                                                                                    )}
                                                                                    {d.estado === 'aprobado' && (
                                                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest leading-none ${isDark ? 'bg-emerald-900/30 text-emerald-500' : 'bg-emerald-100 text-emerald-600'}`}>{locale === 'es' ? 'Aprobado' : 'Approved'}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <p className={`font-medium text-sm leading-relaxed pl-4 border-l-2 transition-colors ${isDark ? 'text-slate-300 border-slate-700 group-hover:border-sky-500/50' : 'text-slate-600 border-sky-100 group-hover:border-sky-300'}`}>
                                                                            {d.mensaje}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Compact Actions (Absolute Top Right) */}
                                                            {!editingDedication && (
                                                                <div className="absolute top-0 right-0 flex gap-1" onClick={e => e.stopPropagation()}>
                                                                    {d.estado === 'pendiente' ? (
                                                                        <button
                                                                            onClick={() => handleStatusChange(d.id_dedicatoria, 'aprobado')}
                                                                            className={`w-7 h-7 rounded-lg transition-all border flex items-center justify-center ${isDark ? 'bg-emerald-900/20 text-emerald-500 border-emerald-900/30 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-100'}`}
                                                                            title={locale === 'es' ? 'Aprobar' : 'Approve'}
                                                                        >
                                                                            <Check size={14} />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleStatusChange(d.id_dedicatoria, 'pendiente')}
                                                                            className={`w-7 h-7 rounded-lg transition-all border flex items-center justify-center ${isDark ? 'bg-amber-900/20 text-amber-500 border-amber-900/30 hover:bg-amber-600 hover:text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border-amber-100'}`}
                                                                            title={locale === 'es' ? 'Marcar Pendiente' : 'Mark as Pending'}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingDedication(d.id_dedicatoria);
                                                                            setEditForm({ mensajero: d.mensajero, mensaje: d.mensaje });
                                                                        }}
                                                                        className={`w-7 h-7 rounded-lg transition-all border flex items-center justify-center ${isDark ? 'bg-blue-900/20 text-blue-400 border-blue-900/30 hover:bg-blue-600 hover:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border-blue-100'}`}
                                                                        title={locale === 'es' ? 'Editar' : 'Edit'}
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(d.id_dedicatoria)}
                                                                        className={`w-7 h-7 rounded-lg transition-all border flex items-center justify-center ${isDark ? 'bg-red-900/20 text-red-400 border-red-900/30 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border-red-100'}`}
                                                                        title={locale === 'es' ? 'Eliminar' : 'Delete'}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* ─── Consagración del Memorial ─── */}
                <TributePlans
                    currentPlan={planName}
                    uuid={uuid}
                    petName={mascota?.nombre || mascota?.name || ''}
                    t={(key) => (t as any)[key]}
                    isDark={isDark}
                    locale={locale}
                    showCurrent={true}
                />

                <AnimatePresence>
                    {showSuccessModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-sky-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                            onClick={() => setShowSuccessModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="max-w-sm w-full bg-white/95 border border-white/60 rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl shadow-emerald-900/10 relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
                                <motion.div
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center border border-emerald-100"
                                >
                                    <Check className="w-10 h-10 text-emerald-500" strokeWidth={3} />
                                </motion.div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold tracking-tight text-slate-800 font-serif">¡Todo listo!</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">Los cambios han sido guardados.</p>
                                </div>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                >
                                    Entendido
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>


                <DedicationModal
                    isOpen={isDedicationModalOpen}
                    onClose={() => setIsDedicationModalOpen(false)}
                    dedication={selectedDedication}
                    locale={locale}
                    themeConfig={isDark ? {
                        card: 'bg-slate-900 border-slate-700 shadow-2xl shadow-black/50',
                        text: 'text-slate-100',
                        divider: 'border-slate-700',
                        overlay: 'bg-black/60 backdrop-blur-sm'
                    } : {
                        card: 'bg-white border-slate-200 shadow-2xl',
                        text: 'text-slate-800',
                        divider: 'border-slate-100',
                        overlay: 'bg-sky-900/20 backdrop-blur-sm'
                    }}
                />

                {
                    imageToCrop && (
                        <ImageCropper
                            image={imageToCrop}
                            aspect={1}
                            showAspectSelector={false}
                            onCropComplete={onCropComplete}
                            onCancel={() => setImageToCrop(null)}
                            title="Ajustar Foto del Memorial"
                        />
                    )
                }

                <HuellasFooter locale={locale === 'es' || locale === 'en' ? locale : 'es'} t={(t as any)} />

                <LimitReachedModal
                    isOpen={showLimitModal}
                    onClose={() => setShowLimitModal(false)}
                    limit={imgLimit}
                    planName={planName}
                />
            </div >
        </ToastProvider >
    );
}
