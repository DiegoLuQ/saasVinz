"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    KeyRound,
    Loader2,
    Store,
    Send,
    DollarSign,
    CheckCircle2,
    Calendar,
    User,
    Dog,
    Package,
    ArrowRight,
    ArrowLeft,
    ExternalLink,
    Copy,
    Check,
    LogOut,
    Sparkles,
    AlertCircle,
    Building2,
    Phone,
    Mail,
    Plus,
    Info,
    X,
    Trash2,
    MapPin,
    Crop,
    Image as ImageIcon,
    Eye,
    EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { copyToClipboard } from '@/lib/clipboard';
import { buildTrackingUrl } from '@/lib/publicUrls';
import { formatRut } from '@/lib/formatters';
import { CHILE_REGIONS_COMUNAS } from '@/lib/geo-data';
import ImageCropper from '@/components/tenant/ImageCropper';

interface PartnerInfo {
    partner_id: number;
    partner_name: string;
    partner_rut?: string;
    partner_email?: string;
    partner_phone?: string;
    partner_address?: string;
    partner_city?: string;
    partner_region?: string;
    tenant_name: string;
    tenant_slug: string;
    tenant_logo_url?: string;
    tenant_phone?: string;
    tipo_comision: string;
    porcentaje_comision: number;
    monto_comision: number;
}

interface PlanItem {
    id: number;
    name: string;
    description: string;
    price: number;
    image_url?: string | null;
    services?: { id: number; name: string }[];
    products?: { id: number; name: string }[];
}

interface CaseItem {
    id: number;
    cremation_id: number;
    date: string;
    pet_name: string;
    pet_type?: string;
    owner_name: string;
    owner_phone?: string;
    service_name: string;
    order_total: number;
    commission_amount: number;
    commission_status: string;
    cremation_status: string;
    tracking_code?: string;
    paid_at?: string | null;
}

interface DashboardStats {
    total_earned: number;
    total_pending: number;
    total_paid: number;
    count_cases: number;
    count_pending: number;
    count_paid: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PartnerPortalPage() {
    const params = useParams();
    const token = params?.token as string;

    // Autenticación
    const [pin, setPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [authError, setAuthError] = useState('');

    // Datos
    const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
    const [plans, setPlans] = useState<PlanItem[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [cases, setCases] = useState<CaseItem[]>([]);
    const [activeTab, setActiveTab] = useState<'admit' | 'commissions'>('admit');

    // Estado Formulario de Admisión
    const [currentStep, setCurrentStep] = useState(1);
    const [ownerData, setOwnerData] = useState({
        fullName: '',
        rut: '',
        phone: '',
        email: '',
        // Dirección del tutor (entrega de cenizas)
        address: '',
        commune: '',
        region: '',
        // Lugar de retiro (por defecto, la clínica)
        veterinary: '',
        pickupCommune: '',
        pickupRegion: '',
        notes: ''
    });

    const [petData, setPetData] = useState({
        name: '',
        type: 'Canino',
        weightKg: '',
        deathDate: new Date().toISOString().split('T')[0],
        dedication: ''
    });

    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [detailPlan, setDetailPlan] = useState<PlanItem | null>(null);
    const [showCommission, setShowCommission] = useState(false);

    // Fotos con recorte y optimización WebP
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [showCropper, setShowCropper] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resultado de éxito
    const [admissionResult, setAdmissionResult] = useState<{
        tracking_code: string;
        tracking_url: string;
        estimated_commission: number;
    } | null>(null);
    const [copiedTracking, setCopiedTracking] = useState(false);

    // Región de la clínica normalizada a una clave de CHILE_REGIONS_COMUNAS
    const clinicRegion = useMemo(() => matchRegionKey(partnerInfo?.partner_region), [partnerInfo?.partner_region]);

    // Prellenar: retiro en la clínica; la región del tutor parte en la de la clínica
    useEffect(() => {
        if (partnerInfo) {
            setOwnerData(prev => ({
                ...prev,
                veterinary: prev.veterinary || partnerInfo.partner_address || '',
                pickupCommune: prev.pickupCommune || partnerInfo.partner_city || '',
                pickupRegion: prev.pickupRegion || clinicRegion,
                region: prev.region || clinicRegion,
            }));
        }
    }, [partnerInfo, clinicRegion]);

    const ownerComunas = CHILE_REGIONS_COMUNAS[ownerData.region] || [];
    const pickupComunas = CHILE_REGIONS_COMUNAS[ownerData.pickupRegion] || [];

    // Validación de email
    const isValidEmail = (emailStr: string): boolean => {
        if (!emailStr) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
    };

    // Cargar PIN guardado en sessionStorage si existe
    useEffect(() => {
        if (!token) return;
        const savedPin = sessionStorage.getItem(`partner_pin_${token}`);
        if (savedPin) {
            setPin(savedPin);
            verifyAccess(savedPin);
        }
    }, [token]);

    const verifyAccess = async (pinToVerify: string) => {
        setIsVerifying(true);
        setAuthError('');
        try {
            const res = await fetch(`${API_URL}/api/public/partner-portal/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, pin: pinToVerify.trim() })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'PIN incorrecto o enlace inválido.');
            }

            const data: PartnerInfo = await res.json();
            setPartnerInfo(data);
            setIsAuthenticated(true);
            sessionStorage.setItem(`partner_pin_${token}`, pinToVerify.trim());

            // Cargar Catálogo y Dashboard
            loadCatalog(pinToVerify);
            loadDashboard(pinToVerify);
        } catch (err: any) {
            setAuthError(err.message || 'Error al verificar credenciales');
            sessionStorage.removeItem(`partner_pin_${token}`);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) {
            setAuthError('Por favor ingresa un PIN de 4 dígitos');
            return;
        }
        verifyAccess(pin);
    };

    const loadCatalog = async (activePin: string) => {
        try {
            const res = await fetch(`${API_URL}/api/public/partner-portal/${token}/catalog`, {
                headers: { 'X-Partner-Pin': activePin }
            });
            if (res.ok) {
                const data = await res.json();
                setPlans(data.plans || []);
                if (data.plans?.length > 0 && !selectedPlanId) {
                    setSelectedPlanId(data.plans[0].id);
                }
            }
        } catch (err) {
            console.error('Error cargando catálogo:', err);
        }
    };

    const loadDashboard = async (activePin: string) => {
        try {
            const res = await fetch(`${API_URL}/api/public/partner-portal/${token}/dashboard`, {
                headers: { 'X-Partner-Pin': activePin }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setCases(data.cases || []);
            }
        } catch (err) {
            console.error('Error cargando comisiones:', err);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(`partner_pin_${token}`);
        setIsAuthenticated(false);
        setPin('');
        setPartnerInfo(null);
    };

    // Procesamiento en cola para recortar fotos una por una y optimizar a WebP
    const processNextCrop = (filesQueue: File[]) => {
        if (filesQueue.length === 0) return;
        const [nextFile, ...rest] = filesQueue;
        setPendingFiles(rest);
        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(nextFile);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const incoming = Array.from(e.target.files);
        const availableSlots = 3 - selectedFiles.length;
        if (availableSlots <= 0) {
            alert('Solo puedes adjuntar hasta 3 fotografías o documentos.');
            e.target.value = '';
            return;
        }
        const filesToProcess = incoming.slice(0, availableSlots);
        e.target.value = '';
        processNextCrop(filesToProcess);
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        setShowCropper(false);
        setCropSource(null);

        const newFileName = `mascota_${Date.now()}_${selectedFiles.length + 1}.webp`;
        const webpFile = new File([croppedBlob], newFileName, { type: 'image/webp' });

        setSelectedFiles(prev => [...prev, webpFile].slice(0, 3));
        const previewUrl = URL.createObjectURL(croppedBlob);
        setPhotoPreviews(prev => [...prev, previewUrl].slice(0, 3));

        // Continuar con la siguiente foto en cola si existe
        if (pendingFiles.length > 0 && selectedFiles.length + 1 < 3) {
            setTimeout(() => {
                processNextCrop(pendingFiles);
            }, 100);
        } else {
            setPendingFiles([]);
        }
    };

    const handleCancelCrop = () => {
        setShowCropper(false);
        setCropSource(null);
        setPendingFiles([]);
    };

    const removeFile = (idx: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
        setPhotoPreviews(prev => {
            if (prev[idx]) URL.revokeObjectURL(prev[idx]);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleSubmitAdmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlanId) {
            alert('Por favor selecciona un plan de cremación');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('owner_data', JSON.stringify(ownerData));
            formData.append('pet_data', JSON.stringify(petData));
            formData.append('selected_services', JSON.stringify([`plan_${selectedPlanId}`]));
            formData.append('pin', pin);

            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            const res = await fetch(`${API_URL}/api/public/partner-portal/${token}/submit`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al procesar la admisión');
            }

            const result = await res.json();
            setAdmissionResult(result);
            loadDashboard(pin);
        } catch (err: any) {
            alert(err.message || 'Hubo un error al enviar la admisión');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetAdmissionForm = () => {
        setAdmissionResult(null);
        setCurrentStep(1);
        setOwnerData({
            fullName: '',
            rut: '',
            phone: '',
            email: '',
            address: '',
            commune: '',
            region: clinicRegion,
            veterinary: partnerInfo?.partner_address || '',
            pickupCommune: partnerInfo?.partner_city || '',
            pickupRegion: clinicRegion,
            notes: ''
        });
        setPetData({
            name: '',
            type: 'Canino',
            weightKg: '',
            deathDate: new Date().toISOString().split('T')[0],
            dedication: ''
        });
        setSelectedFiles([]);
        setPhotoPreviews(prev => {
            prev.forEach(url => URL.revokeObjectURL(url));
            return [];
        });
        setPendingFiles([]);
        setShowCropper(false);
        setCropSource(null);
    };

    // =========================================================================
    // 1. PANTALLA DE ACCESO CON PIN (NO AUTENTICADO)
    // =========================================================================
    if (!isAuthenticated) {
        return (
            <div data-mode="dark" className="dark min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-black">
                {/* Luces de fondo */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="w-full max-w-md relative z-10">
                    <div className="bg-[#0e1320] border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                            <Store size={32} />
                        </div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                Portal de Convenio Veterinario
                            </span>
                            <h1 className="text-2xl font-black text-white mt-3 tracking-tight">
                                Acceso a Clínica Aliada
                            </h1>
                            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                Ingresa el PIN de seguridad proporcionado por el crematorio para acceder a tu panel de derivación y comisiones.
                            </p>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block text-left">
                                    PIN de Acceso (4 Dígitos)
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        maxLength={6}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="••••"
                                        className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-4 text-center text-3xl font-mono tracking-[0.6em] text-emerald-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <KeyRound size={20} />
                                    </div>
                                </div>
                            </div>

                            {authError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 text-left font-medium">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{authError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isVerifying || pin.length < 4}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Verificando PIN...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Ingresar al Portal</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                            Canal seguro y cifrado exclusivo entre la veterinaria y el crematorio.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // 2. INTERFAZ PRINCIPAL DEL PORTAL (AUTENTICADO)
    // =========================================================================
    return (
        <div data-mode="dark" className="dark min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
            {/* Barra Superior con Branding Conjunto */}
            <header className="sticky top-0 z-40 bg-[#0e1320]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Store size={20} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-black text-white truncate">
                                {partnerInfo?.partner_name}
                            </h2>
                            <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                                Convenio Activo
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                            Alianza oficial con <span className="text-white font-semibold">{partnerInfo?.tenant_name}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Badge de Comisión (Ocultable por privacidad) */}
                    <button
                        type="button"
                        onClick={() => setShowCommission(!showCommission)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161c2e] hover:bg-[#1a2238] border border-slate-700 hover:border-slate-600 text-xs transition-all cursor-pointer group shadow-sm select-none"
                        title={showCommission ? "Ocultar comisión" : "Ver comisión"}
                    >
                        <span className="text-slate-400">Tu Comisión:</span>
                        {showCommission ? (
                            <span className="font-black text-emerald-400 flex items-center gap-1.5 animate-in fade-in duration-200">
                                {partnerInfo?.tipo_comision === 'fijo'
                                    ? `$${partnerInfo?.monto_comision?.toLocaleString('es-CL')} fijo`
                                    : `${partnerInfo?.porcentaje_comision}% por servicio`}
                                <EyeOff size={13} className="text-slate-400 group-hover:text-white transition-colors" />
                            </span>
                        ) : (
                            <span className="font-mono text-slate-400 flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                                ••••••••
                                <Eye size={13} className="text-slate-400 group-hover:text-emerald-400 transition-colors" />
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="p-2.5 rounded-xl bg-[#161c2e] border border-slate-700 hover:bg-red-500/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Bloquear y cerrar sesión"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                </div>
            </header>

            {/* Pestañas Principales */}
            <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-2">
                <div className="grid grid-cols-2 p-1.5 bg-[#0e1320] rounded-2xl border border-slate-800 max-w-md mx-auto shadow-inner">
                    <button
                        onClick={() => {
                            setActiveTab('admit');
                            if (admissionResult) resetAdmissionForm();
                        }}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeTab === 'admit'
                                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <Send size={15} />
                        <span>Nueva Admisión</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('commissions')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeTab === 'commissions'
                                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <DollarSign size={15} />
                        <span>Mis Comisiones</span>
                    </button>
                </div>
            </div>

            {/* Contenido Dinámico según Pestaña */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
                {activeTab === 'admit' ? (
                    // =========================================================
                    // VISTA 1: FORMULARIO DE ADMISIÓN O CONFIRMACIÓN
                    // =========================================================
                    admissionResult ? (
                        <div className="max-w-xl mx-auto bg-[#0e1320] border border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-6 animate-in fade-in zoom-in duration-300 shadow-2xl">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 size={36} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-white">
                                    ¡Admisión Registrada con Éxito!
                                </h2>
                                <p className="text-xs text-slate-300 mt-1.5">
                                    El caso de <strong className="text-white font-bold">{petData.name}</strong> ha sido derivado directamente a {partnerInfo?.tenant_name}.
                                </p>
                            </div>

                            {/* Código de Seguimiento */}
                            <div className="p-5 rounded-2xl bg-[#161c2e] border border-slate-700 space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Código Único de Seguimiento (Tracking)
                                </p>
                                <p className="text-3xl font-mono font-black text-emerald-400 tracking-widest">
                                    {admissionResult.tracking_code}
                                </p>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    {(() => {
                                        const fullTrackingUrl = buildTrackingUrl(
                                            partnerInfo?.tenant_slug || '',
                                            petData.name || 'mascota',
                                            admissionResult.tracking_code
                                        );
                                        return (
                                            <>
                                                <button
                                                    onClick={async () => {
                                                        const ok = await copyToClipboard(fullTrackingUrl);
                                                        if (ok) {
                                                            setCopiedTracking(true);
                                                            setTimeout(() => setCopiedTracking(false), 2500);
                                                        }
                                                    }}
                                                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    {copiedTracking ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                    <span>{copiedTracking ? 'Enlace Copiado' : 'Copiar Enlace para la Familia'}</span>
                                                </button>
                                                <a
                                                    href={fullTrackingUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-all"
                                                    title="Abrir seguimiento en vivo"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Comisión Estimada Asignada */}
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-emerald-400">Comisión Asignada a tu Clínica</p>
                                    <p className="text-[11px] text-emerald-300/80 mt-0.5">Quedó registrada en estado pendiente de liquidación</p>
                                </div>
                                <span className="text-xl font-black text-emerald-400 font-mono">
                                    ${admissionResult.estimated_commission.toLocaleString('es-CL')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={resetAdmissionForm}
                                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                                >
                                    Derivar Otra Mascota
                                </button>
                                <button
                                    onClick={() => setActiveTab('commissions')}
                                    className="w-full py-3.5 px-4 rounded-2xl bg-[#161c2e] hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                                >
                                    Ver en Mis Comisiones
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitAdmission} className="max-w-3xl mx-auto space-y-6">
                            {/* Pasos */}
                            <div className="flex items-center justify-between px-2 pb-2">
                                <div>
                                    <h3 className="text-xl font-black text-white">Ficha de Admisión y Derivación</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Paso {currentStep} de 3 • Completa los datos para generar la orden y el seguimiento
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3].map(step => (
                                        <div
                                            key={step}
                                            className={`w-7 h-2 rounded-full transition-all ${
                                                currentStep >= step ? 'bg-emerald-500' : 'bg-slate-800'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* PASO 1: DATOS DEL TUTOR Y RETIRO */}
                            {currentStep === 1 && (
                                <div className="bg-[#0e1320] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <User className="text-emerald-400" size={20} />
                                            <h4 className="font-bold text-white text-base">Datos del Tutor y Retiro</h4>
                                        </div>
                                        {partnerInfo?.partner_name && (
                                            <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                                <Store size={14} className="text-emerald-400" />
                                                <span className="text-slate-300 font-medium">{partnerInfo.partner_name}</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                Nombre Completo del Tutor *
                                            </label>
                                            <input
                                                required
                                                value={ownerData.fullName}
                                                onChange={e => setOwnerData({ ...ownerData, fullName: e.target.value })}
                                                placeholder="Ej: Juan Pérez Morales"
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                Teléfono de Contacto *
                                            </label>
                                            <input
                                                required
                                                type="tel"
                                                value={ownerData.phone}
                                                onChange={e => setOwnerData({ ...ownerData, phone: e.target.value })}
                                                placeholder="+56 9 1234 5678"
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                    Correo Electrónico
                                                </label>
                                                {ownerData.email && !isValidEmail(ownerData.email) && (
                                                    <span className="text-[10px] text-rose-400 font-bold">Email no válido</span>
                                                )}
                                            </div>
                                            <input
                                                type="email"
                                                value={ownerData.email}
                                                onChange={e => setOwnerData({ ...ownerData, email: e.target.value })}
                                                placeholder="tutor@correo.cl"
                                                className={`w-full bg-[#161c2e] border rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 transition-all ${
                                                    ownerData.email && !isValidEmail(ownerData.email)
                                                        ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                                                        : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/50'
                                                }`}
                                            />
                                        </div>

                                        {/* RUT con formato 12.123.456-7 */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                    RUT / DNI Tutor
                                                </label>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    Formato: 12.123.456-7
                                                </span>
                                            </div>
                                            <input
                                                value={ownerData.rut}
                                                onChange={e => {
                                                    const formatted = formatRut(e.target.value);
                                                    setOwnerData({ ...ownerData, rut: formatted });
                                                }}
                                                placeholder="12.123.456-7"
                                                maxLength={12}
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                                            />
                                        </div>

                                    </div>

                                    {/* Lugar de retiro: por defecto la clínica */}
                                    <div className="space-y-3 pt-4 border-t border-slate-800">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="text-emerald-400" size={16} />
                                                <h5 className="text-sm font-bold text-white">Lugar de retiro de la mascota</h5>
                                            </div>
                                            {partnerInfo?.partner_address && (
                                                <button
                                                    type="button"
                                                    onClick={() => setOwnerData(prev => ({
                                                        ...prev,
                                                        veterinary: partnerInfo.partner_address || '',
                                                        pickupCommune: partnerInfo.partner_city || '',
                                                        pickupRegion: clinicRegion,
                                                    }))}
                                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    <Store size={12} />
                                                    <span>Usar dirección de la clínica</span>
                                                </button>
                                            )}
                                        </div>
                                        <AddressFields
                                            address={ownerData.veterinary}
                                            region={ownerData.pickupRegion}
                                            commune={ownerData.pickupCommune}
                                            comunas={pickupComunas}
                                            addressLabel="Dirección de retiro *"
                                            addressPlaceholder="Calle, número o sucursal donde se retira..."
                                            onAddress={v => setOwnerData(prev => ({ ...prev, veterinary: v.slice(0, 100) }))}
                                            onRegion={v => setOwnerData(prev => ({ ...prev, pickupRegion: v, pickupCommune: '' }))}
                                            onCommune={v => setOwnerData(prev => ({ ...prev, pickupCommune: v }))}
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            📍 Prellenado con la dirección de tu clínica. Edítala si el retiro es en otro lugar.
                                        </p>
                                    </div>

                                    {/* Dirección del tutor: entrega de cenizas */}
                                    <div className="space-y-3 pt-4 border-t border-slate-800">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="text-emerald-400" size={16} />
                                                <h5 className="text-sm font-bold text-white">Dirección del tutor (entrega)</h5>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setOwnerData(prev => ({
                                                    ...prev,
                                                    address: prev.veterinary.slice(0, 70),
                                                    commune: prev.pickupCommune,
                                                    region: prev.pickupRegion,
                                                }))}
                                                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition-colors"
                                            >
                                                Igual al retiro
                                            </button>
                                        </div>
                                        <AddressFields
                                            address={ownerData.address}
                                            region={ownerData.region}
                                            commune={ownerData.commune}
                                            comunas={ownerComunas}
                                            addressLabel="Dirección del tutor *"
                                            addressPlaceholder="Calle y número del domicilio del tutor..."
                                            onAddress={v => setOwnerData(prev => ({ ...prev, address: v.slice(0, 70) }))}
                                            onRegion={v => setOwnerData(prev => ({ ...prev, region: v, commune: '' }))}
                                            onCommune={v => setOwnerData(prev => ({ ...prev, commune: v }))}
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            Donde el crematorio entrega las cenizas y contacta a la familia.
                                        </p>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!ownerData.fullName || !ownerData.phone) {
                                                    alert('Por favor completa al menos el nombre y teléfono del tutor');
                                                    return;
                                                }
                                                if (!ownerData.veterinary.trim()) {
                                                    alert('Indica la dirección de retiro de la mascota');
                                                    return;
                                                }
                                                if (!ownerData.address.trim() || !ownerData.commune) {
                                                    alert('Indica la dirección y comuna del tutor (entrega de cenizas)');
                                                    return;
                                                }
                                                if (ownerData.email && !isValidEmail(ownerData.email)) {
                                                    alert('Por favor ingresa un correo electrónico con formato válido (ej: tutor@correo.cl)');
                                                    return;
                                                }
                                                setCurrentStep(2);
                                            }}
                                            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <span>Siguiente: Datos de la Mascota</span>
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PASO 2: DATOS DE LA MASCOTA */}
                            {currentStep === 2 && (
                                <div className="bg-[#0e1320] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                                        <Dog className="text-emerald-400" size={20} />
                                        <h4 className="font-bold text-white text-base">Datos de la Mascota</h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                Nombre de la Mascota *
                                            </label>
                                            <input
                                                required
                                                value={petData.name}
                                                onChange={e => setPetData({ ...petData, name: e.target.value })}
                                                placeholder="Ej: Max, Luna..."
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                Especie / Tipo *
                                            </label>
                                            <select
                                                value={petData.type}
                                                onChange={e => setPetData({ ...petData, type: e.target.value })}
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer"
                                            >
                                                <option value="Canino">Canino (Perro)</option>
                                                <option value="Felino">Felino (Gato)</option>
                                                <option value="Ave">Ave</option>
                                                <option value="Conejo">Conejo</option>
                                                <option value="Roedor / Hurón">Roedor / Hurón (Cobaya, Hámster, etc.)</option>
                                                <option value="Reptil / Anfibio">Reptil / Anfibio</option>
                                                <option value="Equino">Equino (Caballo / Pony)</option>
                                                <option value="Granja">Animal de Granja (Mini Pig, Cabra, etc.)</option>
                                                <option value="Exótico">Exótico</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                Fecha de Fallecimiento *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                max={new Date().toISOString().split('T')[0]}
                                                value={petData.deathDate}
                                                onChange={e => setPetData({ ...petData, deathDate: e.target.value })}
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all [color-scheme:dark] cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                Peso Aproximado (Kg)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={petData.weightKg}
                                                onChange={e => setPetData({ ...petData, weightKg: e.target.value })}
                                                placeholder="Ej: 14.5"
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                            />
                                        </div>

                                        {/* Dedicatoria limitada a 300 caracteres */}
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                    Dedicatoria / Palabras de Homenaje (Opcional)
                                                </label>
                                                <span className={`text-[11px] font-mono ${petData.dedication.length >= 300 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                                                    {petData.dedication.length} / 300 caracteres
                                                </span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                maxLength={300}
                                                value={petData.dedication}
                                                onChange={e => setPetData({ ...petData, dedication: e.target.value.slice(0, 300) })}
                                                placeholder="Escribe un mensaje de amor y homenaje para el certificado y memorial (máximo 300 caracteres)..."
                                                className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"
                                            />
                                            <p className="text-[11px] text-slate-400">
                                                Aparecerá en el certificado oficial de cremación y en el portal conmemorativo de la familia.
                                            </p>
                                        </div>

                                        {/* Fotografías o Documentos (hasta 3 con recorte WebP) */}
                                        <div className="space-y-2 sm:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                                    Fotografías o Documentos de la Mascota (Hasta 3)
                                                </label>
                                                <span className="text-[11px] text-emerald-400 font-bold">
                                                    {selectedFiles.length} de 3 agregadas (WebP)
                                                </span>
                                            </div>

                                            {selectedFiles.length < 3 && (
                                                <label className="cursor-pointer p-4 rounded-2xl bg-[#161c2e] border border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/60 text-xs text-white transition-all flex flex-col items-center justify-center gap-2 group">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                        <Plus size={20} />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="font-bold text-emerald-400">Haz clic para subir una imagen</span>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">Se abrirá el recortador para optimizarla a WebP automáticamente</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}

                                            {/* Galería de previews WebP */}
                                            {selectedFiles.length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                                    {selectedFiles.map((file, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="relative group bg-[#161c2e] border border-slate-700 rounded-2xl overflow-hidden shadow-md aspect-square flex flex-col items-center justify-center"
                                                        >
                                                            {photoPreviews[idx] ? (
                                                                <img
                                                                    src={photoPreviews[idx]}
                                                                    alt={`Foto ${idx + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <ImageIcon size={24} className="text-slate-500" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeFile(idx)}
                                                                    className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 transition-colors shadow-sm"
                                                                    title="Eliminar foto"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-emerald-400 font-bold uppercase pointer-events-none">
                                                                WEBP
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-4 border-t border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(1)}
                                            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <ArrowLeft size={16} />
                                            <span>Volver</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!petData.name) {
                                                    alert('Por favor ingresa el nombre de la mascota');
                                                    return;
                                                }
                                                setCurrentStep(3);
                                            }}
                                            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <span>Siguiente: Selección de Plan</span>
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PASO 3: PLAN DE CREMACIÓN & CONFIRMACIÓN */}
                            {currentStep === 3 && (
                                <div className="bg-[#0e1320] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                                        <Package className="text-emerald-400" size={20} />
                                        <h4 className="font-bold text-white text-base">Selecciona el Plan de Cremación</h4>
                                    </div>

                                    {plans.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            No hay planes disponibles en este momento.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {plans.map(plan => {
                                                const isSelected = selectedPlanId === plan.id;

                                                return (
                                                    <div
                                                        key={plan.id}
                                                        onClick={() => setSelectedPlanId(plan.id)}
                                                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                                            isSelected
                                                                ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                                                                : 'bg-[#161c2e] border-slate-800 hover:border-slate-700 hover:bg-[#1b233a]'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h5 className="font-black text-white text-base leading-tight">
                                                                    {plan.name}
                                                                </h5>
                                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                                                    isSelected ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600'
                                                                }`}>
                                                                    {isSelected && <Check size={12} />}
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                                                                {plan.description || 'Servicio completo de cremación con trazabilidad.'}
                                                            </p>
                                                        </div>

                                                        {/* Valor Servicio (Comisión oculta según requerimiento) */}
                                                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                                                            <div className="flex items-baseline justify-between">
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold">
                                                                    Valor Servicio
                                                                </span>
                                                                <span className="text-xl font-black text-white font-mono">
                                                                    ${plan.price?.toLocaleString('es-CL')}
                                                                </span>
                                                            </div>

                                                            {/* Botón Detalles del Plan */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDetailPlan(plan);
                                                                }}
                                                                className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                                            >
                                                                <Info size={14} />
                                                                <span>Detalles del Plan</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Resumen Final de Derivación */}
                                    <div className="p-4 rounded-2xl bg-[#161c2e] border border-slate-800 text-xs space-y-1.5">
                                        <p className="font-bold text-white uppercase tracking-wider">Confirmación de Derivación</p>
                                        <p className="text-slate-300">
                                            Mascota: <strong className="text-white font-bold">{petData.name}</strong> ({petData.type}) • Tutor: <strong className="text-white font-bold">{ownerData.fullName}</strong> ({ownerData.phone})
                                        </p>
                                        {ownerData.veterinary && (
                                            <p className="text-slate-400 text-[11px]">
                                                Retiro: {[ownerData.veterinary, ownerData.pickupCommune, ownerData.pickupRegion].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {ownerData.address && (
                                            <p className="text-slate-400 text-[11px]">
                                                Entrega: {[ownerData.address, ownerData.commune, ownerData.region].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-between pt-4 border-t border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(2)}
                                            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <ArrowLeft size={16} />
                                            <span>Volver</span>
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !selectedPlanId}
                                            className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    <span>Enviando Admisión...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={18} />
                                                    <span>Confirmar y Enviar Admisión</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    )
                ) : (
                    // =========================================================
                    // VISTA 2: MIS COMISIONES & CASOS DERIVADOS
                    // =========================================================
                    <div className="space-y-6">
                        {/* 3 Tarjetas de Métricas */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-[#0e1320] border border-slate-800 rounded-3xl p-5 space-y-1 shadow-lg">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Total Ganado Acumulado
                                </span>
                                <p className="text-2xl sm:text-3xl font-black text-white font-mono">
                                    ${stats?.total_earned?.toLocaleString('es-CL') || '0'}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    En {stats?.count_cases || 0} caso(s) derivado(s)
                                </p>
                            </div>

                            <div className="bg-[#0e1320] border border-amber-500/30 rounded-3xl p-5 space-y-1 shadow-lg">
                                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                                    Pendiente por Liquidar
                                </span>
                                <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                                    ${stats?.total_pending?.toLocaleString('es-CL') || '0'}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    {stats?.count_pending || 0} comisiones por transferir
                                </p>
                            </div>

                            <div className="bg-[#0e1320] border border-emerald-500/30 rounded-3xl p-5 space-y-1 shadow-lg">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                                    Comisiones Pagadas
                                </span>
                                <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                                    ${stats?.total_paid?.toLocaleString('es-CL') || '0'}
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    {stats?.count_paid || 0} comisiones liquidadas
                                </p>
                            </div>
                        </div>

                        {/* Historial de Mascotas y Comisiones */}
                        <div className="bg-[#0e1320] border border-slate-800 rounded-3xl overflow-hidden space-y-4 shadow-xl">
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-lg text-white">Historial de Servicios Derivados</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Seguimiento de cada mascota y estado de tu comisión
                                    </p>
                                </div>
                                <button
                                    onClick={() => loadDashboard(pin)}
                                    className="p-2.5 px-3.5 rounded-xl bg-[#161c2e] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold cursor-pointer"
                                    title="Actualizar datos"
                                >
                                    Actualizar
                                </button>
                            </div>

                            {cases.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 space-y-3">
                                    <Package size={40} className="mx-auto opacity-30 text-slate-500" />
                                    <p className="text-sm font-medium">Aún no has registrado mascotas a través de este portal.</p>
                                    <button
                                        onClick={() => setActiveTab('admit')}
                                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                    >
                                        Registrar Primera Mascota
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-[#161c2e] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                                                <th className="px-6 py-4">Fecha</th>
                                                <th className="px-6 py-4">Mascota & Tutor</th>
                                                <th className="px-6 py-4">Plan</th>
                                                <th className="px-6 py-4">Tracking</th>
                                                <th className="px-6 py-4">Estado</th>
                                                <th className="px-6 py-4 text-right">Comisión</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 text-sm">
                                            {cases.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                                                        {new Date(item.date).toLocaleDateString('es-CL')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <p className="font-bold text-white text-sm leading-tight">{item.pet_name}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{item.owner_name}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-300 whitespace-nowrap">
                                                        {item.service_name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {item.tracking_code ? (
                                                            <a
                                                                href={buildTrackingUrl(
                                                                    partnerInfo?.tenant_slug || '',
                                                                    item.pet_name || 'mascota',
                                                                    item.tracking_code
                                                                )}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                                                                title="Abrir seguimiento en vivo"
                                                            >
                                                                <span>{item.tracking_code}</span>
                                                                <ExternalLink size={12} />
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#161c2e] border border-slate-700 text-slate-200 uppercase tracking-wider">
                                                            {item.cremation_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <p className="font-mono font-bold text-sm text-emerald-400">
                                                            +${item.commission_amount.toLocaleString('es-CL')}
                                                        </p>
                                                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded-md ${
                                                            item.commission_status === 'pagado'
                                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                                        }`}>
                                                            {item.commission_status === 'pagado' ? 'Pagada' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
                <p>
                    {partnerInfo?.tenant_name} • Canal Directo de Convenios y Gestión Veterinaria
                </p>
            </footer>

            {/* Modal de Recorte y Optimización WebP */}
            {showCropper && cropSource && (
                <ImageCropper
                    image={cropSource}
                    aspect={1}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCancelCrop}
                    title="Recortar y Optimizar Foto Mascota (WebP)"
                    showAspectSelector={true}
                />
            )}

            {/* Modal de Detalles del Plan */}
            {detailPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setDetailPlan(null)}
                    />
                    <div className="relative w-full max-w-lg bg-[#0e1320] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 z-10 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    Detalle del Plan de Cremación
                                </span>
                                <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                                    {detailPlan.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailPlan(null)}
                                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Precio */}
                        <div className="p-4 rounded-2xl bg-[#161c2e] border border-slate-800 flex items-baseline justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Valor del Servicio
                            </span>
                            <span className="text-2xl font-black text-white font-mono">
                                ${detailPlan.price?.toLocaleString('es-CL')}
                            </span>
                        </div>

                        {/* Descripción */}
                        {detailPlan.description && (
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Descripción del Servicio
                                </label>
                                <p className="text-sm text-slate-300 leading-relaxed bg-[#161c2e]/60 p-3.5 rounded-xl border border-slate-800/80">
                                    {detailPlan.description}
                                </p>
                            </div>
                        )}

                        {/* Servicios y Productos incluidos si existen */}
                        {((detailPlan.services && detailPlan.services.length > 0) || (detailPlan.products && detailPlan.products.length > 0)) && (
                            <div className="space-y-3">
                                {detailPlan.services && detailPlan.services.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                                            Servicios Incluidos
                                        </label>
                                        <div className="space-y-1">
                                            {detailPlan.services.map((s, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                                                    <Check size={14} className="text-emerald-400 shrink-0" />
                                                    <span>{s.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {detailPlan.products && detailPlan.products.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                                            Productos y Ánforas Incluidas
                                        </label>
                                        <div className="space-y-1">
                                            {detailPlan.products.map((p, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                                                    <Package size={14} className="text-amber-400 shrink-0" />
                                                    <span>{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDetailPlan(null)}
                                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPlanId(detailPlan.id);
                                    setDetailPlan(null);
                                }}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <Check size={14} />
                                <span>{selectedPlanId === detailPlan.id ? 'Plan Seleccionado' : 'Elegir este Plan'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const SELECT_CLS = 'w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer';

/** Normaliza el nombre de región de la clínica a una clave de CHILE_REGIONS_COMUNAS. */
function matchRegionKey(regionName?: string | null): string {
    const strip = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const keys = Object.keys(CHILE_REGIONS_COMUNAS);
    if (!regionName) return keys.find(k => k.includes('Metropolitana')) || '';
    const clean = strip(regionName);
    if (clean.includes('metropolitana') || clean.includes('santiago') || clean === 'rm') {
        return keys.find(k => k.includes('Metropolitana')) || '';
    }
    return keys.find(k => {
        const kc = strip(k);
        return kc === clean || kc.includes(clean) || clean.includes(kc);
    }) || '';
}

/** Dirección + región + comuna (usado para el retiro y para la entrega). */
function AddressFields({
    address, region, commune, comunas, addressLabel, addressPlaceholder, onAddress, onRegion, onCommune,
}: {
    address: string;
    region: string;
    commune: string;
    comunas: string[];
    addressLabel: string;
    addressPlaceholder: string;
    onAddress: (v: string) => void;
    onRegion: (v: string) => void;
    onCommune: (v: string) => void;
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">{addressLabel}</label>
                <input
                    required
                    value={address}
                    onChange={e => onAddress(e.target.value)}
                    placeholder={addressPlaceholder}
                    className="w-full bg-[#161c2e] border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Región</label>
                <select value={region} onChange={e => onRegion(e.target.value)} className={SELECT_CLS}>
                    <option value="">Selecciona Región</option>
                    {Object.keys(CHILE_REGIONS_COMUNAS).map(r => (
                        <option key={r} value={r} className="bg-[#0e1320] text-white">{r}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Comuna</label>
                <select value={commune} onChange={e => onCommune(e.target.value)} className={SELECT_CLS} disabled={!region}>
                    <option value="">Selecciona Comuna</option>
                    {comunas.map(c => (
                        <option key={c} value={c} className="bg-[#0e1320] text-white">{c}</option>
                    ))}
                    {commune && !comunas.includes(commune) && (
                        <option value={commune} className="bg-[#0e1320] text-white">{commune}</option>
                    )}
                </select>
            </div>
        </div>
    );
}
