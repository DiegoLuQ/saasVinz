"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    X,
    Sparkles,
    Globe,
    Lock,
    Heart,
    Copy,
    Check,
    ExternalLink,
    RefreshCw,
    Flame,
    MessageSquareHeart,
    Image as ImageIcon,
    Crown,
    Share2,
    ShieldCheck,
    Sliders,
    Wand2,
    Palette,
    Send,
    PawPrint,
    Quote,
    Mail,
    Calendar,
    Bell,
    Loader2,
} from "lucide-react";
import { apiRequest, getImageUrl } from "@/lib/tenant/api";
import { useTenant } from "@/app/(tenant)/tenant/context/TenantContext";
import { getPublicMemorialPath } from "@/lib/memorialUrls";
import { getMemorialBaseUrl } from "@/lib/publicUrls";
import {
    MEMORIAL_SCENARIOS,
    MAX_MEMORIAL_COMMENTS,
    normalizeScenarioId,
    isProOrUltraCrematoryPlan,
    getSuggestedEpitaphs,
    type MemorialScenarioId,
} from "@/lib/memorialDesign";
import MemorialMelodyPicker, { type MelodyOption } from "./MemorialMelodyPicker";
import { scenariosOf } from "@/lib/memorialPlans";

interface MemorialSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    pet: any;
    tenantName?: string;
    onSuccess?: () => void;
}

const THEME_OPTIONS = [
    { id: "claro", label: "Luz Serena", swatch: "bg-[#FDFBF7] border-amber-300 text-slate-800" },
    { id: "oscuro", label: "Noche Solemne", swatch: "bg-[#121318] border-amber-500/40 text-amber-100" },
    { id: "cielo", label: "Cielo Eterno", swatch: "bg-sky-100 border-sky-300 text-sky-900" },
    { id: "nocturno", label: "Cosmos", swatch: "bg-indigo-950 border-indigo-400/40 text-indigo-100" },
    { id: "otono", label: "Atardecer Cálido", swatch: "bg-amber-50 border-amber-300 text-amber-900" },
    { id: "jardin", label: "Bosque de Paz", swatch: "bg-emerald-50 border-emerald-300 text-emerald-900" },
];

const PARTICLE_OPTIONS = [
    { id: "ninguna", label: "Sin efecto ambiental" },
    { id: "estrellas", label: "✨ Estrellas Celestiales" },
    { id: "plumas", label: "🪶 Plumas de Ángel" },
    { id: "petalos", label: "🌸 Pétalos de Recuerdo" },
    { id: "corazones", label: "🤍 Destellos de Amor" },
    { id: "burbujas", label: "🫧 Luz Flotante" },
];

export default function MemorialSetupModal({
    isOpen,
    onClose,
    pet,
    onSuccess,
}: MemorialSetupModalProps) {
    const tenantCtx = useTenant();
    const tenant: any = tenantCtx?.tenantData || (tenantCtx as any)?.tenant || null;
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [memorial, setMemorial] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"diseno" | "familia">("diseno");
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);
    const [resettingPin, setResettingPin] = useState(false);
    const [planBlockedMessage, setPlanBlockedMessage] = useState<string | null>(null);
    // La mascota aún no tiene memorial: se crea solo con el botón «Crear memorial».
    const [notCreated, setNotCreated] = useState(false);
    const [creating, setCreating] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState(false);

    // Notificaciones y Datos de Contacto
    const [customerEmail, setCustomerEmail] = useState("");
    const [deathDate, setDeathDate] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailSentSuccess, setEmailSentSuccess] = useState(false);

    // Form states
    const [msgDespedida, setMsgDespedida] = useState("");
    const [scenarioId, setScenarioId] = useState<MemorialScenarioId>("normal");
    const [particulas, setParticulas] = useState("estrellas");
    const [tema, setTema] = useState("claro");
    const [esPrivado, setEsPrivado] = useState(false);
    const [mainImageUrl, setMainImageUrl] = useState<string>("");

    // Melodía (catálogo del SuperAdmin; la elige y activa solo el crematorio)
    const [melodies, setMelodies] = useState<MelodyOption[]>([]);
    const [melodiesLoading, setMelodiesLoading] = useState(false);
    const [melodyId, setMelodyId] = useState<number | null>(null);
    const [melodyActive, setMelodyActive] = useState(false);

    const planName =
        tenant?.subscription_plan?.name ||
        (typeof tenant?.plan === "string" ? tenant.plan : tenant?.plan?.name) ||
        memorial?.plan ||
        "PRO";
    const isProOrUltra = useMemo(() => {
        if (tenant?.plan?.can_use_memorial === true) return true;
        return isProOrUltraCrematoryPlan(planName);
    }, [tenant, planName]);

    // Escenarios: los decide el plan del MEMORIAL (Admin → Memoriales → Planes), no el plan SaaS.
    // Sin dato (aún sin crear) = Partner = solo Santuario Sereno. El actual nunca se bloquea.
    const allowedScenarios = useMemo(() => scenariosOf(memorial?.plan_features), [memorial?.plan_features]);
    const memorialPlanName: string = memorial?.plan_name || "Partner";

    const availableImages = useMemo(() => {
        const list: string[] = [];
        const addUrl = (u?: string | null) => {
            if (!u || typeof u !== "string") return;
            const full = getImageUrl(u) || u;
            if (full && !list.includes(full)) list.push(full);
        };
        addUrl(pet?.image_url);
        if (Array.isArray(pet?.images)) {
            pet.images.forEach((img: any) => addUrl(typeof img === "string" ? img : img?.image_url));
        }
        addUrl(memorial?.main_image_url);
        if (Array.isArray(memorial?.lista_imagenes)) {
            memorial.lista_imagenes.forEach((u: string) => addUrl(u));
        }
        return list;
    }, [pet, memorial]);

    const suggestedEpitaphs = useMemo(() => getSuggestedEpitaphs(pet?.name, "es"), [pet?.name]);

    const ownerDedication = useMemo(() => {
        const raw = memorial?.owner_dedication || pet?.dedication || pet?.owner_dedication || "";
        return typeof raw === "string" ? raw.trim() : "";
    }, [memorial?.owner_dedication, pet?.dedication, pet?.owner_dedication]);

    useEffect(() => {
        if (isOpen && pet) {
            fetchOrCreateMemorial();
        }
        // Solo al abrir o cambiar de mascota: tras guardar, el padre refresca sus
        // datos (nuevo objeto `pet`) y no debe recargarse el formulario abierto.
    }, [isOpen, pet?.id]);

    useEffect(() => {
        if (!isOpen) return;
        setMelodiesLoading(true);
        apiRequest("/api/internal/memorials/melodies")
            .then((data: MelodyOption[]) => setMelodies(Array.isArray(data) ? data : []))
            .catch(() => setMelodies([]))
            .finally(() => setMelodiesLoading(false));
    }, [isOpen]);

    const handleSelectMelody = (id: number | null) => {
        // Al elegir la primera melodía queda activa; "Sin melodía" la apaga.
        if (id && !melodyId) setMelodyActive(true);
        if (!id) setMelodyActive(false);
        setMelodyId(id);
    };

    const defaultEpitaph =
        suggestedEpitaphs[0] ||
        `En memoria de nuestro querido ${pet?.name}. Siempre vivirás en nuestros corazones.`;

    /** Crea el memorial (solo desde el botón «Crear memorial»). */
    const createMemorial = async () => {
        setCreating(true);
        try {
            const data = await apiRequest("/api/internal/memorials", {
                method: "POST",
                body: {
                    id_mascota: pet.id,
                    msg_despedida: defaultEpitaph,
                    es_privado: false,
                    diseno: { tipo_diseno: "normal", tema: "claro", particulas: "estrellas", color_fondo: "", portada_url: "" },
                },
            });
            setNotCreated(false);
            applyMemorial(data);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            if (err?.status === 403) setPlanBlockedMessage(err.message || null);
            else console.error("Error creating memorial:", err);
        } finally {
            setCreating(false);
        }
    };

    /** Abre el memorial existente; si la mascota no tiene, muestra «Crear memorial» (no lo crea). */
    const fetchOrCreateMemorial = async () => {
        setLoading(true);
        setPlanBlockedMessage(null);
        setNotCreated(false);
        try {
            const data = await apiRequest(`/api/internal/memorials/by-pet/${pet.id}`);
            if (!data) {
                setMemorial(null);
                setNotCreated(true);
                return;
            }
            applyMemorial(data);
        } catch (err: any) {
            if (err?.status === 403) {
                setPlanBlockedMessage(
                    err.message ||
                        "El entorno de Memoriales Conmemorativos está disponible exclusivamente para planes de crematorio PRO y ULTRA."
                );
            } else {
                console.error("Error fetching memorial:", err);
            }
        } finally {
            setLoading(false);
        }
    };

    const applyMemorial = (data: any) => {
            if (data) {
                setMemorial(data);
                setMsgDespedida(data.msg_despedida || defaultEpitaph);
                const normalizedScenario = normalizeScenarioId(data.diseno?.tipo_diseno);
                setScenarioId(normalizedScenario);
                setParticulas(data.diseno?.particulas || "estrellas");
                setTema(data.diseno?.tema || "claro");
                setEsPrivado(Boolean(data.es_privado));
                setMelodyId(data.melody?.id ?? null);
                setMelodyActive(Boolean(data.melody?.activa));
                const initialImg =
                    data.main_image_url ||
                    pet?.image_url ||
                    (Array.isArray(data.lista_imagenes) && data.lista_imagenes[0]) ||
                    "";
                setMainImageUrl(getImageUrl(initialImg) || initialImg);

                // Cargar correo y fecha de partida
                const initialEmail = data.customer_email || pet?.customer?.email || pet?.customer_email || "";
                setCustomerEmail(initialEmail);
                const rawDeath = data.mascota?.death_date || pet?.death_date || "";
                setDeathDate(rawDeath ? String(rawDeath).slice(0, 10) : "");
            }
    };

    const handleSelectScenario = (id: MemorialScenarioId) => {
        if (!allowedScenarios.includes(id) && scenarioId !== id) {
            return;
        }
        setScenarioId(id);
        const config = MEMORIAL_SCENARIOS.find((s) => s.id === id);
        if (config) {
            setTema(config.defaultTheme);
            setParticulas(config.defaultParticles);
        }
    };

    const handleSave = async () => {
        if (!memorial) return;
        setSaving(true);
        setSaveFeedback(false);
        try {
            const updated = await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/manage`, {
                method: "PATCH",
                headers: memorial.access_key ? { "access-key": memorial.access_key } : {},
                body: {
                    msg_despedida: msgDespedida,
                    es_privado: esPrivado,
                    main_image_url: mainImageUrl || undefined,
                    customer_email: customerEmail.trim() || undefined,
                    death_date: deathDate ? `${deathDate}T00:00:00` : undefined,
                    diseno: {
                        ...(memorial.diseno || {}),
                        tipo_diseno: scenarioId,
                        particulas,
                        tema,
                        color_fondo: memorial.diseno?.color_fondo || "",
                        portada_url: memorial.diseno?.portada_url || "",
                    },
                },
            });

            // La melodía va por su propio endpoint (solo el crematorio puede cambiarla).
            const melodyChanged =
                (memorial.melody?.id ?? null) !== melodyId || Boolean(memorial.melody?.activa) !== (melodyActive && Boolean(melodyId));
            const withMelody = melodyChanged
                ? await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/melody`, {
                      method: "PUT",
                      body: { media_id: melodyId, activa: melodyActive && Boolean(melodyId) },
                  })
                : null;

            if (updated) {
                setMemorial((prev: any) => ({ ...prev, ...updated, ...(withMelody || {}) }));
                // El modal queda abierto para seguir editando; solo se confirma el guardado.
                setSaveFeedback(true);
                if (onSuccess) onSuccess();
                setTimeout(() => setSaveFeedback(false), 2000);
            }
        } catch (err) {
            console.error("Error updating memorial:", err);
        } finally {
            setSaving(false);
        }
    };

    const getMemorialUrl = () => {
        if (!memorial) return "";
        // memorial.<dominio actual> (vinzer.cl en producción, lvh.me en local)
        const path = getPublicMemorialPath({
            id_recuerdo: memorial.id_recuerdo,
            tenantSlug: tenant?.slug || tenant?.name || "memorial",
            petName: pet?.name || "mascota",
            shortCode: memorial.short_code,
        });
        return `${getMemorialBaseUrl()}${path}`;
    };

    const getFamilyPortalUrl = () => {
        if (!memorial) return "";
        return `${getMemorialBaseUrl()}/memorials/m/${memorial.id_recuerdo}/login`;
    };

    const handleCopyLink = () => {
        const url = getMemorialUrl();
        if (!url) return;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopyPin = () => {
        const currentPin = memorial?.access_key || memorial?.pin;
        if (!currentPin) return;
        navigator.clipboard.writeText(currentPin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    const handleResetPin = async () => {
        if (!memorial?.id_recuerdo || resettingPin) return;
        setResettingPin(true);
        try {
            const updated = await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/reset-pin`, {
                method: "POST",
            });
            if (updated) {
                setMemorial((prev: any) => ({
                    ...prev,
                    ...updated,
                    access_key: updated.access_key || updated.pin,
                }));
            }
        } catch (err) {
            console.error("Error resetting PIN:", err);
        } finally {
            setResettingPin(false);
        }
    };

    const handleOpenFamilyManagementDirect = () => {
        if (!memorial?.id_recuerdo) return;
        const currentPin = memorial.access_key || memorial.pin || "";
        if (currentPin) {
            try {
                localStorage.setItem(`memorial_pin_${memorial.id_recuerdo}`, currentPin);
            } catch (_) {}
        }
        const pinParam = currentPin ? `?pin=${encodeURIComponent(currentPin)}` : "";
        window.open(`${getMemorialBaseUrl()}/memorials/m/${memorial.id_recuerdo}/gestion${pinParam}`, "_blank");
    };

    const handleSendCredentialsEmail = async () => {
        if (!memorial?.id_recuerdo || sendingEmail) return;
        const target = customerEmail.trim();
        if (!target) {
            alert("Por favor ingresa un correo electrónico para enviar las credenciales.");
            return;
        }
        setSendingEmail(true);
        setEmailSentSuccess(false);
        try {
            await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/send-credentials`, {
                method: "POST",
                body: { email: target },
            });
            setEmailSentSuccess(true);
            setTimeout(() => setEmailSentSuccess(false), 4000);
        } catch (err: any) {
            alert(err.message || "Error al enviar el correo con las credenciales.");
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSendToOwner = async () => {
        if (!memorial?.id_recuerdo || sendingEmail || saving) return;
        let target = customerEmail.trim();
        if (!target) {
            const prompted = window.prompt("Ingresa el correo electrónico del dueño para enviarle el Memorial:");
            if (!prompted || !prompted.trim()) return;
            target = prompted.trim();
            setCustomerEmail(target);
        }

        // 1. Guardar primero para que los últimos cambios (altar, fotos, música) queden registrados
        setSaving(true);
        try {
            const updated = await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/manage`, {
                method: "PATCH",
                headers: memorial.access_key ? { "access-key": memorial.access_key } : {},
                body: {
                    msg_despedida: msgDespedida,
                    es_privado: esPrivado,
                    main_image_url: mainImageUrl || undefined,
                    customer_email: target,
                    death_date: deathDate ? `${deathDate}T00:00:00` : undefined,
                    diseno: {
                        ...(memorial.diseno || {}),
                        tipo_diseno: scenarioId,
                        particulas,
                        tema,
                        color_fondo: memorial.diseno?.color_fondo || "",
                        portada_url: memorial.diseno?.portada_url || "",
                    },
                },
            });

            const melodyChanged =
                (memorial.melody?.id ?? null) !== melodyId || Boolean(memorial.melody?.activa) !== (melodyActive && Boolean(melodyId));
            const withMelody = melodyChanged
                ? await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/melody`, {
                      method: "PUT",
                      body: { media_id: melodyId, activa: melodyActive && Boolean(melodyId) },
                  })
                : null;

            if (updated) {
                setMemorial((prev: any) => ({ ...prev, ...updated, ...(withMelody || {}) }));
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            console.error("Error guardando memorial previo al envío:", err);
        } finally {
            setSaving(false);
        }

        // 2. Enviar el correo formal con acceso a memorial.vinzer.cl y PIN al dueño
        setSendingEmail(true);
        setEmailSentSuccess(false);
        try {
            await apiRequest(`/api/internal/memorials/${memorial.id_recuerdo}/send-credentials`, {
                method: "POST",
                body: { email: target },
            });
            setEmailSentSuccess(true);
            setTimeout(() => setEmailSentSuccess(false), 5000);
        } catch (err: any) {
            alert(err.message || "Error al enviar el memorial al dueño.");
        } finally {
            setSendingEmail(false);
        }
    };

    const handleShareWhatsAppToFamily = () => {
        if (!memorial) return;
        const publicUrl = getMemorialUrl();
        const portalUrl = getFamilyPortalUrl();
        const pin = memorial.access_key || memorial.pin || "------";
        const message = [
            `🕊️ *Memorial Conmemorativo de ${pet?.name || "su angelito"}*`,
            ``,
            `Hemos preparado un espacio único de homenaje con portada, encendido de velas, dedicatoria y muro de hasta ${MAX_MEMORIAL_COMMENTS} comentarios para honrar su memoria:`,
            `🔗 *Ver Memorial:* ${publicUrl}`,
            ``,
            `🔑 *Gestión Familiar de Comentarios y Escenario:*`,
            `Pueden aprobar o administrar los mensajes y personalizar el escenario ingresando aquí:`,
            `${portalUrl}`,
            `📌 *Código PIN Familiar:* *${pin}*`,
        ].join("\n");

        const rawPhone = (pet?.client_phone || pet?.tutor_phone || "").replace(/\D/g, "");
        const waUrl = rawPhone
            ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(waUrl, "_blank");
    };

    if (!isOpen) return null;

    const candleCount = memorial?.ritual_counts?.vela ?? 0;
    const commentCount =
        memorial?.dedications_count !== undefined
            ? memorial.dedications_count
            : Array.isArray(memorial?.dedications)
            ? memorial.dedications.length
            : 0;

    const currentScenario = MEMORIAL_SCENARIOS.find((s) => s.id === scenarioId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-white/10 w-full max-w-4xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                {/* ═══════════════════════════════════════════════════════
                    HEADER MODERNO Y ELEGANTE CON PESTAÑAS SEGMENTADAS
                ═══════════════════════════════════════════════════════ */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        {/* Mascota & Título */}
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-amber-500/30 bg-amber-500/10 shrink-0 shadow-sm">
                                {pet?.image_url ? (
                                    <img
                                        src={getImageUrl(pet.image_url) || pet.image_url}
                                        alt={pet.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-amber-500">
                                        <PawPrint size={22} />
                                    </div>
                                )}
                                <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/20 rounded-2xl" />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-xl font-serif font-black text-slate-900 dark:text-white tracking-tight truncate">
                                        Memorial de {pet?.name}
                                    </h2>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                        <Crown size={11} /> Plan {planName}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                    Santuario Conmemorativo · Escenario Activo:{" "}
                                    <span className="font-bold text-amber-600 dark:text-amber-400">
                                        {currentScenario?.name || "Jardín Celestial"}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Badges en Vivo & Botones de Acción Rápida */}
                        <div className="flex items-center gap-2 shrink-0">
                            {memorial && (
                                <a
                                    href={getMemorialUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Previsualizar en vivo en una pestaña nueva"
                                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs transition-colors"
                                >
                                    <ExternalLink size={13} />
                                    <span>Ver Memorial</span>
                                </a>
                            )}

                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Selector de Pestañas (Tabs) */}
                    {!planBlockedMessage && !notCreated && isProOrUltra && (
                        <div className="flex items-center gap-2 p-1 bg-slate-200/60 dark:bg-black/40 rounded-2xl w-fit">
                            <button
                                type="button"
                                onClick={() => setActiveTab("diseno")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === "diseno"
                                        ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <Palette size={14} className={activeTab === "diseno" ? "text-amber-500" : ""} />
                                <span>1. Diseño & Escenario</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab("familia")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === "familia"
                                        ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <Share2 size={14} className={activeTab === "familia" ? "text-emerald-500" : ""} />
                                <span>2. Compartir & Familia</span>
                                {commentCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-black">
                                        {commentCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════
                    BODY DE CONTENIDO SEGÚN LA PESTAÑA ACTIVA
                ═══════════════════════════════════════════════════════ */}
                <div className="p-5 sm:p-7 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="animate-spin text-amber-500" size={32} />
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">
                                Preparando Santuario Conmemorativo...
                            </p>
                        </div>
                    ) : planBlockedMessage || !isProOrUltra ? (
                        <div className="py-16 px-6 text-center max-w-lg mx-auto space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
                                <Crown size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                Exclusivo para Crematorios PRO y ULTRA
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {planBlockedMessage ||
                                    "Los Memoriales Conmemorativos con 4 escenarios interactivos, encendido de velas, descarga de retratos y moderación familiar de hasta 20 comentarios están disponibles únicamente en los planes PRO y ULTRA."}
                            </p>
                        </div>
                    ) : notCreated ? (
                        <div className="py-16 px-6 text-center max-w-lg mx-auto space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
                                <Sparkles size={30} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                {pet?.name} aún no tiene memorial
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                Crea su memorial online para que la familia encienda velas y deje mensajes. Se genera con su
                                enlace y su PIN; después podrás elegir el escenario, la foto y la dedicatoria.
                            </p>
                            <button
                                type="button"
                                onClick={createMemorial}
                                disabled={creating}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-sm transition disabled:opacity-60"
                            >
                                {creating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                Crear memorial
                            </button>
                        </div>
                    ) : activeTab === "diseno" ? (
                        /* ── PESTAÑA 1: DISEÑO Y ESCENARIO ── */
                        <div className="space-y-6">
                            {/* Selector Visual de los 4 Escenarios */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Sparkles size={15} className="text-amber-500" />
                                        Elige el Escenario del Homenaje
                                    </label>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Todos incluyen portada, velas, dedicatoria y descarga de recuerdo
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {MEMORIAL_SCENARIOS.map((sc) => {
                                        const isSelected = scenarioId === sc.id;
                                        const isLockedUltra = !allowedScenarios.includes(sc.id) && !isSelected;

                                        return (
                                            <button
                                                key={sc.id}
                                                type="button"
                                                disabled={isLockedUltra}
                                                onClick={() => handleSelectScenario(sc.id)}
                                                title={isLockedUltra ? `No incluido en el plan ${memorialPlanName} del memorial` : undefined}
                                                className={`text-left p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-3 ${
                                                    isSelected
                                                        ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/25 shadow-md"
                                                        : isLockedUltra
                                                        ? "bg-slate-100/70 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 opacity-55 cursor-not-allowed"
                                                        : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-amber-500/40"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span
                                                                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                                                                style={{
                                                                    backgroundColor: `${sc.accentColor}20`,
                                                                    color: sc.accentColor,
                                                                }}
                                                            >
                                                                {sc.levelLabel}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-bold">
                                                                {sc.subtitle}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                                            {sc.name}
                                                        </h4>
                                                    </div>

                                                    <div className="shrink-0">
                                                        {isSelected ? (
                                                            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                                                                <Check size={14} strokeWidth={3} />
                                                            </div>
                                                        ) : isLockedUltra ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                                                🔒 No incluido
                                                            </span>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-white/20" />
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    {sc.description}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Foto de Portada y Dedicatoria en Dos Columnas */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-3 border-t border-slate-200 dark:border-white/10">
                                {/* Columna Izquierda: Portada */}
                                <div className="md:col-span-5 space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <ImageIcon size={14} className="text-amber-500" />
                                        Foto de Portada
                                    </label>

                                    {/* Preview Grande de la Foto Seleccionada */}
                                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 shadow-inner flex items-center justify-center">
                                        {mainImageUrl ? (
                                            <img
                                                src={mainImageUrl}
                                                alt="Portada Seleccionada"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="text-center p-4 text-slate-400">
                                                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-xs font-medium">Sin foto seleccionada</p>
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 left-2 right-2 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] text-white/90 truncate text-center">
                                            Retrato ceremonial principal
                                        </div>
                                    </div>

                                    {/* Tira de Miniaturas */}
                                    {availableImages.length > 0 && (
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                            {availableImages.map((imgUrl, idx) => {
                                                const active = mainImageUrl === imgUrl;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setMainImageUrl(imgUrl)}
                                                        className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                                                            active
                                                                ? "border-amber-500 ring-2 ring-amber-500/30 scale-105"
                                                                : "border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100"
                                                        }`}
                                                    >
                                                        <img
                                                            src={imgUrl}
                                                            alt={`Foto ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {active && (
                                                            <span className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 rounded-full p-0.5">
                                                                <Check size={9} strokeWidth={3} />
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Columna Derecha: Dedicatoria y Frases Sugeridas */}
                                <div className="md:col-span-7 space-y-3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <Heart size={14} className="text-rose-500" />
                                                Dedicatoria Principal
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {msgDespedida.length}/500
                                            </span>
                                        </div>

                                        <textarea
                                            value={msgDespedida}
                                            onChange={(e) => setMsgDespedida(e.target.value)}
                                            rows={4}
                                            maxLength={500}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 text-slate-900 dark:text-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none leading-relaxed"
                                            placeholder="Escribe una dedicatoria solemne para honrar a este angelito..."
                                        />
                                    </div>

                                    {/* Palabras del Dueño / Tutor en la Orden de Cremación (OC) */}
                                    {ownerDedication ? (
                                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/35 space-y-2 shadow-2xs">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                                    <Quote size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                                    Palabras del Dueño / Tutor (Orden de Cremación):
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setMsgDespedida(ownerDedication)}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 ${
                                                        msgDespedida.trim() === ownerDedication
                                                            ? "bg-emerald-500 text-white shadow-xs"
                                                            : "bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 shadow-xs"
                                                    }`}
                                                    title={
                                                        msgDespedida.trim() === ownerDedication
                                                            ? "Dedicatoria ya aplicada al memorial"
                                                            : "Aplicar estas palabras al memorial"
                                                    }
                                                >
                                                    {msgDespedida.trim() === ownerDedication ? (
                                                        <>
                                                            <Check size={12} strokeWidth={3} />
                                                            <span>Aplicada al Memorial</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles size={11} />
                                                            <span>Aplicar al Memorial</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-xs italic text-slate-800 dark:text-amber-100 font-serif leading-relaxed line-clamp-3">
                                                “{ownerDedication}”
                                            </p>
                                        </div>
                                    ) : null}

                                    {/* Sugerencias Rápidas */}
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Wand2 size={12} className="text-amber-500" /> Clic para aplicar dedicatoria de consuelo:
                                        </span>
                                        <div className="flex flex-col gap-1.5">
                                            {suggestedEpitaphs.slice(0, 3).map((phrase, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setMsgDespedida(phrase)}
                                                    className="text-left text-[11px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors truncate"
                                                >
                                                    “{phrase}”
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Atmósfera: Colores y Efecto de Partículas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-white/10">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 block">
                                        Atmósfera de Color
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {THEME_OPTIONS.map((tOpt) => (
                                            <button
                                                key={tOpt.id}
                                                type="button"
                                                onClick={() => setTema(tOpt.id)}
                                                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                                                    tema === tOpt.id
                                                        ? "border-amber-500 bg-amber-500/15 text-slate-900 dark:text-white ring-1 ring-amber-500"
                                                        : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400"
                                                }`}
                                            >
                                                <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${tOpt.swatch}`} />
                                                <span className="truncate">{tOpt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 block">
                                        Partículas Flotantes
                                    </label>
                                    <select
                                        value={particulas}
                                        onChange={(e) => setParticulas(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-amber-500"
                                    >
                                        {PARTICLE_OPTIONS.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Ambiente etéreo animado que acompañará el altar de {pet?.name}.
                                    </p>
                                </div>
                            </div>

                            <MemorialMelodyPicker
                                melodies={melodies}
                                loading={melodiesLoading}
                                selectedId={melodyId}
                                active={melodyActive}
                                petName={pet?.name}
                                onSelect={handleSelectMelody}
                                onToggleActive={setMelodyActive}
                            />
                        </div>
                    ) : (
                        /* ── PESTAÑA 2: COMPARTIR Y ACCESO FAMILIAR ── */
                        <div className="space-y-5">
                            {/* 0. Notificaciones Conmemorativas y Datos de la Familia */}
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-4">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>Notificaciones Familiares y Recordatorios</span>
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Configura el correo para recibir credenciales y avisos de condolencias, y la fecha de partida para el aniversario.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Botón de Enviar Credenciales por Email */}
                                    <button
                                        type="button"
                                        onClick={handleSendCredentialsEmail}
                                        disabled={sendingEmail || !customerEmail.trim()}
                                        className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
                                            emailSentSuccess
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                        }`}
                                    >
                                        {sendingEmail ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                <span>Enviando...</span>
                                            </>
                                        ) : emailSentSuccess ? (
                                            <>
                                                <Check size={14} strokeWidth={3} />
                                                <span>Credenciales Enviadas</span>
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={14} />
                                                <span>Enviar por Email</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Formulario de Correo y Fecha de Fallecimiento */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <Mail size={13} className="text-primary" />
                                            Correo Electrónico de la Familia
                                        </label>
                                        <input
                                            type="email"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            placeholder="ejemplo@correo.com"
                                            className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-primary transition-all font-medium"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Recibirá el PIN, aviso cuando enciendan velas y el recordatorio de aniversario.
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <Calendar size={13} className="text-primary" />
                                            Fecha de Partida (Fallecimiento)
                                        </label>
                                        <input
                                            type="date"
                                            value={deathDate}
                                            onChange={(e) => setDeathDate(e.target.value)}
                                            className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-primary transition-all font-medium"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Fecha para enviar automáticamente: «Hoy se cumple X año de que es un angelito».
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Tarjeta Premium de WhatsApp para la Familia */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-3">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                                            <Send size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                                Enviar Memorial por WhatsApp a la Familia
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Envía el enlace público y el código PIN de gestión en un solo mensaje formateado.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleShareWhatsAppToFamily}
                                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                                    >
                                        <Send size={14} />
                                        <span>Abrir WhatsApp</span>
                                    </button>
                                </div>

                                <div className="p-3 bg-white/60 dark:bg-black/30 rounded-xl border border-emerald-500/20 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                                    🕊️ *Memorial Conmemorativo de {pet?.name}* · Incluye velas, dedicatoria y portal de gestión con PIN.
                                </div>
                            </div>

                            {/* 2. Tarjeta del PIN de Acceso y Moderación */}
                            <div className="p-5 rounded-2xl bg-amber-500/[0.08] dark:bg-amber-500/[0.08] border border-amber-500/25 space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={18} className="text-amber-500" />
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                            PIN de Gestión Familiar (Máx. {MAX_MEMORIAL_COMMENTS} Comentarios)
                                        </h4>
                                    </div>
                                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                        La familia modera comentarios y personaliza su fondo
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-500/30 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            PIN FAMILIAR:
                                        </span>
                                        <span className="font-mono font-black text-xl tracking-[0.25em] text-slate-900 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl">
                                            {memorial?.access_key || memorial?.pin || "------"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyPin}
                                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                                        >
                                            {copiedPin ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                            <span>{copiedPin ? "Copiado" : "Copiar PIN"}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleResetPin}
                                            disabled={resettingPin || !memorial?.id_recuerdo}
                                            title="Generar un nuevo PIN aleatorio de 6 dígitos"
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-500 hover:text-amber-500 transition-all flex items-center gap-1 text-xs"
                                        >
                                            <RefreshCw size={13} className={resettingPin ? "animate-spin text-amber-500" : ""} />
                                            <span className="text-[11px] font-bold hidden sm:inline">Nuevo PIN</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleOpenFamilyManagementDirect}
                                            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm hover:opacity-90"
                                        >
                                            <Sliders size={13} />
                                            <span>Gestionar Comentarios</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Enlace Público Conmemorativo */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-2.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                    Enlace Público Directo del Memorial
                                </span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getMemorialUrl()}
                                        className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                        <span>{copiedLink ? "Copiado" : "Copiar"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* 4. Visibilidad y Privacidad */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2.5 rounded-xl ${
                                            esPrivado
                                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                        }`}
                                    >
                                        {esPrivado ? <Lock size={18} /> : <Globe size={18} />}
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                            {esPrivado ? "Memorial Privado (Protegido por PIN)" : "Memorial Público (Abierto a familiares)"}
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {esPrivado
                                                ? "Cualquier persona que visite el enlace deberá ingresar el PIN para ver el altar."
                                                : "Cualquier persona con el enlace puede ingresar, encender velas y dejar condolencias."}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setEsPrivado(!esPrivado)}
                                    className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${
                                        esPrivado ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${
                                            esPrivado ? "left-7" : "left-1"
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════
                    FOOTER ELEGANTE CON BOTÓN DE GUARDADO PRINCIPAL
                ═══════════════════════════════════════════════════════ */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all"
                    >
                        Cerrar
                    </button>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {!planBlockedMessage && !notCreated && isProOrUltra && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleSendToOwner}
                                    disabled={sendingEmail || saving || loading}
                                    className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer ${
                                        emailSentSuccess
                                            ? "bg-emerald-600 text-white shadow-emerald-600/30"
                                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                                    }`}
                                    title="Guardar cambios y enviar el memorial al correo del tutor"
                                >
                                    {sendingEmail ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" />
                                            <span>Enviando al Dueño...</span>
                                        </>
                                    ) : emailSentSuccess ? (
                                        <>
                                            <Check size={15} strokeWidth={3} />
                                            <span>¡Memorial Enviado!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={15} />
                                            <span>Enviar al Dueño</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving || loading || sendingEmail}
                                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                                >
                                    {saving ? (
                                        <RefreshCw className="animate-spin" size={15} />
                                    ) : saveFeedback ? (
                                        <Check size={15} />
                                    ) : (
                                        <Sparkles size={15} />
                                    )}
                                    {saving
                                        ? "Guardando..."
                                        : saveFeedback
                                        ? "¡Memorial Actualizado!"
                                        : "Guardar Configuración"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
