"use client";

/**
 * Formulario para crear un memorial de Vinzer (planes Mensual / Anual / Eterno).
 * Lo usan la familia en memorial.<dominio>/crear y el SuperAdmin en Admin → Memoriales.
 * Las fotos se comprimen en el navegador; el servidor las deja cuadradas en WebP.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flower2, ImagePlus, Loader2, Snowflake, Star, Trash2, X } from "lucide-react";
import { compressImage } from "@/lib/clientImageCompressor";
import { MEMORIAL_SCENARIOS, type MemorialScenarioId } from "@/lib/memorialDesign";
import MemorialMelodyPicker, { type MelodyOption } from "@/components/tenant/memorials/MemorialMelodyPicker";

export interface MemorialSignupPlan {
    key: string;
    name: string;
    price: number;
    currency: string;
    billing?: string | null;
    max_images: number;
    days: number | null;
}

export interface MemorialSignupOptions {
    plans: MemorialSignupPlan[];
    melodies: MelodyOption[];
    max_photos: number;
    invite?: { plan: string | null } | null;
}

export interface MemorialCreateResult {
    id_recuerdo: string;
    short_code?: string | null;
    pin: string;
    plan: string;
    status: "pending" | "active";
}

interface Props {
    options: MemorialSignupOptions;
    initialPlan?: string | null;
    /** Recibe el FormData armado (data JSON + photos[]) y lo envía. Debe lanzar Error con el mensaje. */
    onSubmit: (fd: FormData) => Promise<void>;
    submitLabel?: string;
    /** Bloque extra antes de enviar (p. ej. «Activar ahora» en Admin). */
    extra?: React.ReactNode;
}

const THEMES: { id: string; label: string; cls: string }[] = [
    { id: "claro", label: "Claro", cls: "from-sky-100 via-slate-50 to-white" },
    { id: "oscuro", label: "Oscuro", cls: "from-slate-800 via-slate-900 to-slate-950" },
    { id: "cielo", label: "Cielo", cls: "from-sky-200 via-sky-300 to-blue-400" },
    { id: "nocturno", label: "Cosmos", cls: "from-indigo-900 via-slate-900 to-black" },
    { id: "dorado", label: "Dorado", cls: "from-amber-300 via-amber-500 to-amber-700" },
];
const EFFECTS = [
    { id: "ninguna", label: "Ninguno", icon: <X size={16} /> },
    { id: "nieve", label: "Nieve", icon: <Snowflake size={16} /> },
    { id: "estrellas", label: "Estrellas", icon: <Star size={16} /> },
    { id: "flores", label: "Pétalos", icon: <Flower2 size={16} /> },
];
const SCENARIO_ICONS: Record<string, string> = { normal: "🕯️", altar: "🏛️", cielo: "☁️", constelacion: "🌌" };
const STEPS = ["Tu mascota", "Fotos", "Diseño", "Plan y datos"];

const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";
const label = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5";
const card = (active: boolean) =>
    `rounded-2xl border-2 p-3 text-left transition-colors ${active ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"}`;

type Photo = { file: File; url: string };

export default function MemorialCreateForm({ options, initialPlan, onSubmit, submitLabel = "Crear memorial", extra }: Props) {
    const lockedPlan = options.invite?.plan || null;
    const [step, setStep] = useState(0);
    const [pet, setPet] = useState({ name: "", species: "Perro", birth_date: "", death_date: "" });
    const [message, setMessage] = useState("");
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [processing, setProcessing] = useState(false);
    const [scenario, setScenario] = useState<MemorialScenarioId>("normal");
    const [theme, setTheme] = useState("claro");
    const [effect, setEffect] = useState("ninguna");
    const [melodyId, setMelodyId] = useState<number | null>(null);
    const [melodyOn, setMelodyOn] = useState(true);
    const [plan, setPlan] = useState<string>(
        lockedPlan || (initialPlan && options.plans.some((p) => p.key === initialPlan) ? initialPlan : "") || ""
    );
    const [family, setFamily] = useState({ name: "", email: "", phone: "" });
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

    const maxPhotos = options.max_photos || 3;
    const selectedPlan = useMemo(() => options.plans.find((p) => p.key === plan), [options.plans, plan]);

    const pickScenario = (id: MemorialScenarioId) => {
        setScenario(id);
        const sc = MEMORIAL_SCENARIOS.find((s) => s.id === id);
        if (sc) {
            if (THEMES.some((t) => t.id === sc.defaultTheme)) setTheme(sc.defaultTheme);
            setEffect(EFFECTS.some((e) => e.id === sc.defaultParticles) ? sc.defaultParticles : "ninguna");
        }
    };

    const addPhotos = async (list: FileList | null) => {
        if (!list?.length) return;
        setError(null);
        const room = maxPhotos - photos.length;
        const files = Array.from(list).filter((f) => f.type.startsWith("image/")).slice(0, room);
        if (!files.length) return;
        setProcessing(true);
        try {
            const out: Photo[] = [];
            for (const f of files) {
                const c = await compressImage(f, 1600, 1600, 0.85);
                out.push({ file: c, url: URL.createObjectURL(c) });
            }
            setPhotos((p) => [...p, ...out].slice(0, maxPhotos));
        } finally {
            setProcessing(false);
        }
    };
    const removePhoto = (i: number) => setPhotos((p) => { URL.revokeObjectURL(p[i].url); return p.filter((_, j) => j !== i); });
    const makeMain = (i: number) => setPhotos((p) => [p[i], ...p.filter((_, j) => j !== i)]);

    const stepError = (s: number): string | null => {
        if (s === 0) {
            if (!pet.name.trim()) return "Escribe el nombre de tu mascota.";
            if (pet.birth_date && pet.death_date && pet.birth_date > pet.death_date) return "La fecha de nacimiento no puede ser posterior a la de partida.";
        }
        if (s === 1 && !photos.length) return "Sube al menos una foto.";
        if (s === 3) {
            if (!plan) return "Elige un plan.";
            if (!family.name.trim()) return "Escribe tu nombre.";
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(family.email.trim())) return "Revisa tu correo: ahí te llegará el PIN.";
        }
        return null;
    };
    const next = () => {
        const e = stepError(step);
        setError(e);
        if (!e) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const submit = async () => {
        for (let s = 0; s < STEPS.length; s++) {
            const e = stepError(s);
            if (e) { setStep(s); setError(e); return; }
        }
        setError(null);
        setSending(true);
        try {
            const fd = new FormData();
            fd.append("data", JSON.stringify({
                family: { name: family.name.trim(), email: family.email.trim(), phone: family.phone.trim() },
                pet: { ...pet, name: pet.name.trim() },
                message: message.trim(),
                plan,
                design: { scenario, theme, effect, melody_id: melodyId, melody_on: melodyOn },
            }));
            photos.forEach((p, i) => fd.append("photos", p.file, p.file.name || `foto-${i + 1}.jpg`));
            await onSubmit(fd);
        } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo crear el memorial. Intenta de nuevo.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="text-slate-800">
            {/* Pasos */}
            <ol className="mb-6 grid grid-cols-4 gap-2">
                {STEPS.map((s, i) => (
                    <li key={s}>
                        <button
                            type="button"
                            onClick={() => (i < step ? (setError(null), setStep(i)) : undefined)}
                            className={`w-full text-left ${i < step ? "cursor-pointer" : "cursor-default"}`}
                        >
                            <span className={`block h-1.5 rounded-full ${i <= step ? "bg-amber-500" : "bg-slate-200"}`} />
                            <span className={`mt-1.5 block text-[11px] font-semibold ${i === step ? "text-slate-900" : "text-slate-400"}`}>{s}</span>
                        </button>
                    </li>
                ))}
            </ol>

            {step === 0 && (
                <div className="space-y-4">
                    <div>
                        <label className={label}>Nombre de tu mascota *</label>
                        <input className={input} maxLength={60} value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })} placeholder="Ej: Toby" />
                    </div>
                    <div>
                        <label className={label}>Especie</label>
                        <div className="flex flex-wrap gap-2">
                            {["Perro", "Gato", "Conejo", "Ave", "Otro"].map((sp) => (
                                <button key={sp} type="button" onClick={() => setPet({ ...pet, species: sp })}
                                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${pet.species === sp ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}>
                                    {sp}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={label}>Fecha de nacimiento</label>
                            <input type="date" className={input} value={pet.birth_date} onChange={(e) => setPet({ ...pet, birth_date: e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Fecha de partida</label>
                            <input type="date" className={input} value={pet.death_date} onChange={(e) => setPet({ ...pet, death_date: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className={label}>Dedicatoria (opcional)</label>
                        <textarea className={`${input} min-h-[96px]`} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
                            placeholder="Unas palabras para recordarle. Podrás cambiarla después." />
                    </div>
                </div>
            )}

            {step === 1 && (
                <div>
                    <p className="mb-3 text-sm text-slate-600">
                        Sube hasta {maxPhotos} fotos. La primera será la principal. Las optimizamos automáticamente para que carguen rápido.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        {photos.map((p, i) => (
                            <div key={p.url} className={`relative aspect-square overflow-hidden rounded-2xl border-2 ${i === 0 ? "border-amber-500" : "border-slate-200"}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                                {i === 0 ? (
                                    <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">Principal</span>
                                ) : (
                                    <button type="button" onClick={() => makeMain(i)} className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        Hacer principal
                                    </button>
                                )}
                                <button type="button" onClick={() => removePhoto(i)} aria-label="Quitar foto"
                                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1.5 text-rose-600">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}
                        {photos.length < maxPhotos && (
                            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-amber-500 hover:text-amber-600">
                                {processing ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
                                <span className="text-xs font-semibold">{processing ? "Optimizando…" : "Agregar foto"}</span>
                                <input type="file" accept="image/*" multiple className="hidden" disabled={processing}
                                    onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                            </label>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div>
                        <p className={label}>Escenario</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {MEMORIAL_SCENARIOS.map((sc) => (
                                <button key={sc.id} type="button" onClick={() => pickScenario(sc.id)} className={card(scenario === sc.id)}>
                                    <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                        <span className="text-lg">{SCENARIO_ICONS[sc.id]}</span>{sc.name}
                                        {scenario === sc.id && <Check size={15} className="ml-auto text-amber-600" />}
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500">{sc.subtitle.trim()}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className={label}>Color</p>
                        <div className="flex flex-wrap gap-3">
                            {THEMES.map((t) => (
                                <button key={t.id} type="button" onClick={() => setTheme(t.id)} className="flex flex-col items-center gap-1">
                                    <span className={`h-11 w-11 rounded-full bg-gradient-to-br ${t.cls} border-2 ${theme === t.id ? "border-amber-500 ring-2 ring-amber-500/30" : "border-slate-200"}`} />
                                    <span className={`text-[11px] font-semibold ${theme === t.id ? "text-slate-900" : "text-slate-500"}`}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className={label}>Efecto</p>
                        <div className="flex flex-wrap gap-2">
                            {EFFECTS.map((ef) => (
                                <button key={ef.id} type="button" onClick={() => setEffect(ef.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold ${effect === ef.id ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}>
                                    {ef.icon}{ef.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {options.melodies.length > 0 && (
                        <MemorialMelodyPicker
                            melodies={options.melodies}
                            loading={false}
                            selectedId={melodyId}
                            active={melodyOn}
                            petName={pet.name}
                            onSelect={setMelodyId}
                            onToggleActive={setMelodyOn}
                        />
                    )}
                    <p className="text-xs text-slate-500">Podrás cambiar el diseño y la música cuando quieras con tu PIN.</p>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-5">
                    <div>
                        <p className={label}>Plan {lockedPlan && <span className="normal-case font-medium text-slate-400">(definido en tu enlace)</span>}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {options.plans.map((p) => {
                                const disabled = Boolean(lockedPlan && lockedPlan !== p.key);
                                return (
                                    <button key={p.key} type="button" disabled={disabled} onClick={() => setPlan(p.key)}
                                        className={`${card(plan === p.key)} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                                        <span className="flex items-center text-sm font-bold text-slate-800">
                                            {p.name}{plan === p.key && <Check size={15} className="ml-auto text-amber-600" />}
                                        </span>
                                        <span className="mt-1 block text-xl font-black text-slate-900">
                                            {p.price.toLocaleString("es-CL")} <span className="text-xs font-bold text-slate-500">{p.currency}</span>
                                        </span>
                                        <span className="block text-xs text-slate-500">
                                            {p.days === null ? "Pago único, para siempre" : p.days >= 365 ? "Por 1 año" : "Por 1 mes"} · hasta {p.max_images} fotos
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className={label}>Tu nombre *</label>
                            <input className={input} maxLength={120} value={family.name} onChange={(e) => setFamily({ ...family, name: e.target.value })} />
                        </div>
                        <div>
                            <label className={label}>Correo *</label>
                            <input type="email" className={input} maxLength={160} value={family.email} onChange={(e) => setFamily({ ...family, email: e.target.value })} placeholder="Aquí te llega el PIN" />
                        </div>
                        <div>
                            <label className={label}>WhatsApp</label>
                            <input type="tel" className={input} maxLength={30} value={family.phone} onChange={(e) => setFamily({ ...family, phone: e.target.value })} placeholder="+56 9 …" />
                        </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-bold text-slate-800">Resumen</p>
                        <p className="mt-1">
                            {pet.name || "—"} · {photos.length} foto{photos.length === 1 ? "" : "s"} · {MEMORIAL_SCENARIOS.find((s) => s.id === scenario)?.name}
                            {selectedPlan ? ` · Plan ${selectedPlan.name} (${selectedPlan.price} ${selectedPlan.currency})` : ""}
                        </p>
                    </div>
                    {extra}
                </div>
            )}

            {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

            <div className="mt-6 flex items-center gap-3">
                {step > 0 && (
                    <button type="button" onClick={() => { setError(null); setStep(step - 1); }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                        <ArrowLeft size={16} /> Atrás
                    </button>
                )}
                {step < STEPS.length - 1 ? (
                    <button type="button" onClick={next} disabled={processing}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
                        Continuar <ArrowRight size={16} />
                    </button>
                ) : (
                    <button type="button" onClick={submit} disabled={sending}
                        className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 disabled:opacity-60">
                        {sending && <Loader2 size={16} className="animate-spin" />}{sending ? "Creando…" : submitLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
