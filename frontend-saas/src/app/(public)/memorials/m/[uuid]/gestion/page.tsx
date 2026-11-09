"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Palette, ChevronRight, ShieldCheck } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { getTranslations, type Locale } from '@/lib/translations';
import {
    getScenarioConfig,
    isPlaceholderFarewell,
    MAX_MEMORIAL_COMMENTS,
    normalizeScenarioId,
    isProOrUltraCrematoryPlan,
    isUltraCrematoryPlan,
} from '@/lib/memorialDesign';
import LimitReachedModal from '@/components/memorial/LimitReachedModal';
import ImageCropper from '@/components/tenant/ImageCropper';
import MemorialPlanUpgrade from '@/components/memorial/MemorialPlanUpgrade';
import { scenariosOf } from '@/lib/memorialPlans';
import { HuellasFooter } from '@/components/public/HuellasFooter';
import { ToastProvider } from '@/app/(tenant)/tenant/context/ToastContext';
import ManageHeader, { type SaveState } from '@/components/memorial/manage/ManageHeader';
import MemorialSummaryCard from '@/components/memorial/manage/MemorialSummaryCard';
import PendingMessages from '@/components/memorial/manage/PendingMessages';
import ShareBlock from '@/components/memorial/manage/ShareBlock';
import MelodyCard from '@/components/memorial/manage/MelodyCard';
import QrCard from '@/components/memorial/manage/QrCard';
import TimelineCard from '@/components/memorial/manage/TimelineCard';
import MediaCard from '@/components/memorial/manage/MediaCard';
import AppearanceSheet from '@/components/memorial/manage/AppearanceSheet';
import {
    cardClass,
    mutedClass,
    publicMemorialPath,
    validImages,
    type Dedication,
    type ManageForm,
} from '@/components/memorial/manage/ui';

const AUTOSAVE_DELAY_MS = 900;

const publicApiRequest = async (path: string, options: any = {}) => {
    const isServer = typeof window === 'undefined';
    const API_URL = !isServer
        ? ''
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

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

const isLandingPlan = (p: string | null | undefined): boolean => {
    if (!p) return false;
    const norm = p.trim().toLowerCase();
    return norm === 'mensual' || norm === 'anual' || norm === 'eterno' || norm === 'free' || norm === 'recuerdo' || norm === 'landing';
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
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('admin_theme_preference', next);
    };

    const [locale, setLocale] = useState<Locale>('es');

    useEffect(() => {
        const syncLocale = () => {
            const saved = localStorage.getItem('landing_locale') as Locale | null;
            if (saved === 'es' || saved === 'en') setLocale(saved);
        };
        syncLocale();
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
    const es = locale === 'es';

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [memorial, setMemorial] = useState<any>(null);
    const [dedicatorias, setDedicatorias] = useState<Dedication[]>([]);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [uiBackgrounds, setUiBackgrounds] = useState<any[]>([]);

    const [form, setForm] = useState<ManageForm>({
        msg_despedida: '',
        diseno: {
            tema: 'claro',
            particulas: 'ninguna',
            tipo_diseno: 'normal',
            portada_url: '',
            captions: {},
        },
        private_mode: false,
        pin: '',
        main_image_url: '',
        lista_imagenes: [],
    });

    const getPin = () => localStorage.getItem(`memorial_pin_${uuid}`) || '';

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

    // ─── Guardado automático ───
    // Cada cambio del formulario marca un "tick"; tras una pausa corta se envía
    // el formulario completo (PATCH /manage). Los guardados se encadenan para
    // que nunca lleguen en desorden.
    const formRef = useRef(form);
    useEffect(() => { formRef.current = form; }, [form]);
    const [dirtyTick, setDirtyTick] = useState(0);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveChain = useRef<Promise<void>>(Promise.resolve());
    const pendingSave = useRef(false);

    const updateForm = (fn: (prev: ManageForm) => ManageForm) => {
        setForm(fn);
        pendingSave.current = true;
        setDirtyTick((n) => n + 1);
    };

    const saveNow = useCallback(() => {
        if (saveTimer.current) {
            clearTimeout(saveTimer.current);
            saveTimer.current = null;
        }
        if (!pendingSave.current) return;
        pendingSave.current = false;
        setSaveState('saving');
        saveChain.current = saveChain.current.then(async () => {
            try {
                const data = await publicApiRequest(`/api/internal/memorials/${uuid}/manage`, {
                    method: 'PATCH',
                    body: JSON.stringify(formRef.current),
                    headers: { 'access-key': getPin() },
                });
                setMemorial(data);
                setSaveState(pendingSave.current ? 'saving' : 'saved');
            } catch (err: any) {
                console.error('Error al guardar el memorial:', err);
                pendingSave.current = true;
                setSaveState('error');
            }
        });
    }, [uuid]);

    useEffect(() => {
        if (!dirtyTick) return;
        setSaveState('saving');
        saveTimer.current = setTimeout(saveNow, AUTOSAVE_DELAY_MS);
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [dirtyTick, saveNow]);

    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => {
            if (pendingSave.current) e.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, []);

    // initial = true también carga el formulario; después solo se refrescan
    // datos (mensajes, fotos) para no pisar lo que la familia está escribiendo.
    const fetchData = async (initial = false) => {
        try {
            const data = await publicApiRequest(`/api/internal/memorials/${uuid}/manage`, {
                headers: { 'access-key': getPin() }
            });
            setMemorial(data);
            setDedicatorias(data.dedicatorias || []);

            if (initial) {
                const design = data.diseno || {};
                setForm({
                    msg_despedida: isPlaceholderFarewell(data.msg_despedida) ? '' : data.msg_despedida,
                    diseno: {
                        tema: design.tema || 'claro',
                        particulas: design.particulas || 'ninguna',
                        tipo_diseno: normalizeScenarioId(design.tipo_diseno),
                        portada_url: design.portada_url || '',
                        captions: (design.captions && typeof design.captions === 'object') ? design.captions : {},
                        auto_publicar_mensajes: design.auto_publicar_mensajes === true,
                    },
                    private_mode: data.private_mode || false,
                    pin: data.pin || '',
                    main_image_url: data.main_image_url || '',
                    lista_imagenes: data.lista_imagenes || []
                });
            }
        } catch (err: any) {
            if (err.message === 'Unauthorized') {
                localStorage.removeItem(`memorial_pin_${uuid}`);
                router.push(`/memorials/m/${uuid}/login`);
            }
        } finally {
            if (initial) setLoading(false);
        }
    };

    useEffect(() => {
        if (uuid && typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const pinFromUrl = searchParams.get('pin');
            if (pinFromUrl && pinFromUrl.trim()) {
                localStorage.setItem(`memorial_pin_${uuid}`, pinFromUrl.trim());
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, '', cleanUrl);
            }

            if (!getPin()) {
                router.push(`/memorials/m/${uuid}/login`);
                return;
            }
            fetchData(true);
        }
    }, [uuid]);

    // ─── Mensajes ───
    const handleStatusChange = async (id: number, estado: Dedication['estado']) => {
        try {
            await publicApiRequest(`/api/internal/memorials/dedications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ estado }),
                headers: { 'access-key': getPin() }
            });
            setDedicatorias((prev) => prev.map((d) => (d.id_dedicatoria === id ? { ...d, estado } : d)));
        } catch (err: any) {
            alert(err.message);
            fetchData();
        }
    };

    const handleEditDedication = async (id: number, data: { mensajero: string; mensaje: string }) => {
        try {
            await publicApiRequest(`/api/internal/memorials/dedications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
                headers: { 'access-key': getPin() }
            });
            setDedicatorias((prev) => prev.map((d) => (d.id_dedicatoria === id ? { ...d, ...data } : d)));
        } catch (err: any) {
            alert(err.message);
            throw err;
        }
    };

    const handleDeleteDedication = async (id: number) => {
        try {
            await publicApiRequest(`/api/internal/memorials/dedications/${id}`, {
                method: 'DELETE',
                headers: { 'access-key': getPin() }
            });
            setDedicatorias((prev) => prev.filter((d) => d.id_dedicatoria !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    // ─── Fotos ───
    const handleImageFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => setImageToCrop(reader.result as string);
        reader.readAsDataURL(file);
    };

    const applyImageResponse = (data: any) => {
        setMemorial(data);
        setForm(prev => ({
            ...prev,
            main_image_url: data.main_image_url,
            lista_imagenes: data.lista_imagenes
        }));
    };

    const onCropComplete = async (croppedBlob: Blob) => {
        setImageToCrop(null);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', croppedBlob, 'cropped_image.png');
            const data = await publicApiRequest(`/api/internal/memorials/${uuid}/images`, {
                method: 'POST',
                body: formData,
                headers: { 'access-key': getPin() },
                isMultipart: true
            });
            applyImageResponse(data);
            setSaveState('saved');
        } catch (err: any) {
            console.error('Error al subir imagen:', err);
            alert(err.message || 'Error al subir imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleImageDelete = async (url: string) => {
        if (!confirm(es ? '¿Eliminar esta foto?' : 'Delete this photo?')) return;
        setUploading(true);
        try {
            const data = await publicApiRequest(`/api/internal/memorials/${uuid}/images?url=${encodeURIComponent(url)}`, {
                method: 'DELETE',
                headers: { 'access-key': getPin() }
            });
            applyImageResponse(data);
        } catch (err: any) {
            console.error('Error al eliminar imagen:', err);
            alert(err.message || 'Error al eliminar imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = () => {
        saveNow();
        localStorage.removeItem(`memorial_pin_${uuid}`);
        router.push(`/memorials/m/${uuid}/login`);
    };

    if (loading || !memorial) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    const { mascota } = memorial;
    const petName: string = mascota?.nombre || mascota?.name || '';
    const tenant = memorial.tenant || memorial.tenant_info;

    const planName = (memorial.plan || 'PRO').toUpperCase().trim();
    const isUltra = isUltraCrematoryPlan(planName);

    // Un memorial proviene de un crematorio/tenant si tiene crematorio asignado y su plan es del crematorio
    const isFromCrematorium = Boolean(
        memorial?.is_from_crematorium ?? (
            (tenant?.name && !isLandingPlan(memorial?.plan)) ||
            isProOrUltraCrematoryPlan(planName) ||
            Boolean(tenant && !isLandingPlan(memorial?.plan))
        )
    );

    const imgLimit: number = memorial.img_limit || (isUltra ? 5 : 3);
    const commentLimit: number = memorial.dedication_limit ?? MAX_MEMORIAL_COMMENTS;
    const images = validImages(memorial.lista_imagenes);
    const approved = dedicatorias.filter(d => d.estado === 'aprobado').length;
    const pendingCount = dedicatorias.filter(d => d.estado === 'pendiente').length;

    const publicPath = publicMemorialPath(tenant?.slug || tenant?.name, petName, uuid, memorial.short_code);
    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath;
    const scenario = getScenarioConfig(form.diseno.tipo_diseno);

    const messagesBlock = (
        <PendingMessages
            dedications={dedicatorias}
            limit={commentLimit}
            isDark={isDark}
            locale={locale}
            onStatus={handleStatusChange}
            onEdit={handleEditDedication}
            onDelete={handleDeleteDedication}
            autoPublish={!!form.diseno.auto_publicar_mensajes}
            onAutoPublishChange={(on) => updateForm(prev => ({ ...prev, diseno: { ...prev.diseno, auto_publicar_mensajes: on } }))}
        />
    );

    return (
        <ToastProvider>
            <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
                <ManageHeader
                    petName={petName}
                    publicUrl={publicPath}
                    isDark={isDark}
                    locale={locale}
                    saveState={saveState}
                    onToggleLocale={toggleLocale}
                    onToggleTheme={toggleTheme}
                    onLogout={handleLogout}
                />

                <main className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-4">
                    {/* Vencido: las visitas ven la vista reducida hasta renovar (nada se borró) */}
                    {memorial.expired && (
                        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-amber-400/40 bg-amber-500/10 text-amber-100' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
                            <p className="font-semibold">{locale === 'en' ? 'The memorial’s period has ended' : 'El periodo del memorial venció'}</p>
                            <p className="mt-0.5 opacity-80">
                                {locale === 'en'
                                    ? 'Visitors see only some photos and messages and cannot leave new ones. Nothing was deleted: renew to bring everything back.'
                                    : 'Las visitas ven solo algunas fotos y mensajes, y no pueden dejar mensajes nuevos. No se borró nada: al renovar vuelve todo.'}
                            </p>
                        </div>
                    )}

                    {/* Lo urgente primero: si hay mensajes esperando, van arriba */}
                    {pendingCount > 0 && messagesBlock}

                    <MemorialSummaryCard
                        petName={petName}
                        mainImage={form.main_image_url}
                        images={images}
                        imgLimit={imgLimit}
                        dedication={form.msg_despedida}
                        ownerDedication={memorial.owner_dedication}
                        isDark={isDark}
                        locale={locale}
                        busy={uploading}
                        onSelectMain={(url) => updateForm(prev => ({ ...prev, main_image_url: url }))}
                        onUploadFile={handleImageFile}
                        onDeleteImage={handleImageDelete}
                        onUploadBlocked={() => setShowLimitModal(true)}
                        onDedicationChange={(text) => updateForm(prev => ({ ...prev, msg_despedida: text }))}
                        onDedicationDone={saveNow}
                    />

                    {pendingCount === 0 && messagesBlock}

                    <ShareBlock url={publicUrl} petName={petName} isDark={isDark} locale={locale} />

                    {/* Línea de tiempo (Eterno, Infinito): momentos con foto propia */}
                    {memorial.plan_features?.timeline && (
                        <TimelineCard uuid={uuid} accessKey={getPin()} isDark={isDark} locale={locale} petName={petName} />
                    )}

                    {/* Video y voz (Infinito): 1 + 1 de 30 s */}
                    {((memorial.plan_features?.max_videos ?? 0) > 0 || (memorial.plan_features?.max_voice ?? 0) > 0) && (
                        <MediaCard uuid={uuid} accessKey={getPin()} isDark={isDark} locale={locale} petName={petName} />
                    )}

                    {/* Plan con QR (Eterno, Infinito): tarjeta para imprimir */}
                    {memorial.plan_features?.qr && (
                        <QrCard url={publicUrl} petName={petName} isDark={isDark} locale={locale} />
                    )}

                    {/* Memoriales Vinzer: la familia elige la música (hasta N melodías según el plan) */}
                    {memorial.is_vinzer_plan && (
                        <MelodyCard uuid={uuid} accessKey={getPin()} isDark={isDark} locale={locale} onSaved={(data) => setMemorial(data)} />
                    )}

                    <button
                        type="button"
                        onClick={() => setAppearanceOpen(true)}
                        className={`${cardClass(isDark)} w-full flex items-center gap-4 text-left transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                    >
                        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-700 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>
                            <Palette size={20} />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className={`block font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{es ? 'Cambiar apariencia' : 'Change appearance'}</span>
                            <span className={`block text-sm truncate ${mutedClass(isDark)}`}>
                                {es ? 'Escenario' : 'Scene'}: {scenario.name}
                            </span>
                        </span>
                        <ChevronRight size={18} className={mutedClass(isDark)} />
                    </button>

                    {isFromCrematorium && (
                        <p className={`flex items-center justify-center gap-2 text-xs pt-2 ${mutedClass(isDark)}`}>
                            <ShieldCheck size={14} className="text-amber-500" />
                            {es
                                ? `Este memorial es una cortesía de ${tenant?.name || 'tu crematorio'}.`
                                : `This memorial is a courtesy of ${tenant?.name || 'your crematorium'}.`}
                        </p>
                    )}
                </main>

                {(!isFromCrematorium || memorial.plan_features) && (
                    <MemorialPlanUpgrade
                        plan={memorial.plan}
                        validUntil={memorial.valid_until}
                        contract={{ price: memorial.plan_price, currency: memorial.plan_currency, billing: memorial.plan_billing }}
                        photosUsed={images.length}
                        photoLimit={imgLimit}
                        dedicationsUsed={approved}
                        dedicationLimit={commentLimit}
                        gestures={Object.values(memorial?.ritual_counts || {}).reduce((acc: number, n: any) => acc + (Number(n) || 0), 0)}
                        petName={petName}
                        uuid={uuid}
                        locale={locale}
                        isDark={isDark}
                        isFromCrematorium={isFromCrematorium}
                        currentFeatures={memorial.plan_features}
                        currentPlanName={memorial.plan_name}
                        crematoriumName={tenant?.name}
                        accessKey={getPin()}
                    />
                )}

                <AppearanceSheet
                    open={appearanceOpen}
                    onClose={() => { setAppearanceOpen(false); saveNow(); }}
                    diseno={form.diseno}
                    onChange={(patch) => updateForm(prev => ({ ...prev, diseno: { ...prev.diseno, ...patch } }))}
                    backgrounds={uiBackgrounds}
                    allowedScenarios={scenariosOf(memorial.plan_features)}
                    isDark={isDark}
                    locale={locale}
                />

                {imageToCrop && (
                    <ImageCropper
                        image={imageToCrop}
                        aspect={1}
                        showAspectSelector={false}
                        onCropComplete={onCropComplete}
                        onCancel={() => setImageToCrop(null)}
                        title={es ? 'Ajustar foto del memorial' : 'Adjust memorial photo'}
                    />
                )}

                <HuellasFooter locale={locale === 'es' || locale === 'en' ? locale : 'es'} t={(t as any)} />

                <LimitReachedModal
                    isOpen={showLimitModal}
                    onClose={() => setShowLimitModal(false)}
                    limit={imgLimit}
                    planName={planName}
                />
            </div>
        </ToastProvider>
    );
}
