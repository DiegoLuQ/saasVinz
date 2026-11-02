"use client";

import { useState } from 'react';
import { Check, ChevronDown, Crown, Flower2, Heart, Snowflake, Star, X, Feather } from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';
import { MEMORIAL_SCENARIOS, normalizeScenarioId } from '@/lib/memorialDesign';
import { mutedClass, primaryBtn, titleClass, type ManageForm } from './ui';

const SCENARIO_ICONS: Record<string, string> = {
    normal: '🕯️',
    altar: '🏛️',
    cielo: '☁️',
    constelacion: '🌌',
};

// Los 5 colores principales (incluyen los temas por defecto de cada escenario).
const MAIN_THEMES = ['claro', 'oscuro', 'cielo', 'nocturno', 'dorado'];
const THEME_GRADIENTS: Record<string, string> = {
    claro: 'from-sky-100 via-slate-50 to-white',
    oscuro: 'from-slate-800 via-slate-900 to-slate-950',
    cielo: 'from-sky-200 via-sky-300 to-blue-400',
    nocturno: 'from-indigo-900 via-slate-900 to-black',
    esmeralda: 'from-emerald-400 via-emerald-600 to-emerald-900',
    dorado: 'from-amber-300 via-amber-500 to-amber-700',
    rosado: 'from-rose-300 via-rose-400 to-rose-600',
    safiro: 'from-blue-400 via-blue-600 to-blue-900',
};

type Props = {
    open: boolean;
    onClose: () => void;
    diseno: ManageForm['diseno'];
    onChange: (patch: Partial<ManageForm['diseno']>) => void;
    backgrounds: { id?: number | string; url: string; name?: string }[];
    isUltra: boolean;
    isDark: boolean;
    locale: Locale;
};

export default function AppearanceSheet({ open, onClose, diseno, onChange, backgrounds, isUltra, isDark, locale }: Props) {
    const es = locale === 'es';
    const t = getTranslations(locale);
    const [advancedOpen, setAdvancedOpen] = useState(Boolean(diseno.portada_url));

    if (!open) return null;

    const themeLabels: Record<string, string> = {
        claro: t.mg_theme_light,
        oscuro: t.mg_theme_dark,
        cielo: es ? 'Cielo' : 'Sky',
        nocturno: 'Cosmos',
        esmeralda: t.mg_theme_emerald,
        dorado: t.mg_theme_gold,
        rosado: t.mg_theme_rose,
        safiro: t.mg_theme_sapphire,
    };
    // Si el memorial usa un color fuera de los principales, se sigue mostrando.
    const themes = MAIN_THEMES.includes(diseno.tema) || !THEME_GRADIENTS[diseno.tema]
        ? MAIN_THEMES
        : [...MAIN_THEMES, diseno.tema];

    const effects = [
        { id: 'ninguna', label: t.mg_effect_none, icon: <X size={18} /> },
        { id: 'nieve', label: t.mg_effect_snow, icon: <Snowflake size={18} /> },
        { id: 'estrellas', label: t.mg_effect_stars, icon: <Star size={18} /> },
        { id: 'flores', label: es ? 'Pétalos' : 'Petals', icon: <Flower2 size={18} /> },
        ...(diseno.particulas === 'plumas' ? [{ id: 'plumas', label: es ? 'Plumas' : 'Feathers', icon: <Feather size={18} /> }] : []),
    ];

    const activeScenario = normalizeScenarioId(diseno.tipo_diseno);
    const hasLockedScenario = MEMORIAL_SCENARIOS.some((sc) => sc.requiresUltraPlan && !isUltra && activeScenario !== sc.id);

    const sectionLabel = `text-sm font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`;
    const optionClass = (active: boolean) =>
        `rounded-2xl border-2 transition-colors ${active
            ? (isDark ? 'border-sky-400 bg-sky-500/10' : 'border-sky-500 bg-sky-50')
            : (isDark ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300')}`;

    return (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className={`w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border p-5 sm:p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
            >
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className={titleClass(isDark)}>{es ? 'Apariencia del memorial' : 'Memorial appearance'}</h2>
                        <p className={`text-xs mt-0.5 ${mutedClass(isDark)}`}>{es ? 'Los cambios se guardan solos.' : 'Changes are saved automatically.'}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'} className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* Escenario */}
                <p className={sectionLabel}>{es ? 'Escenario' : 'Scene'}</p>
                <div className="grid grid-cols-2 gap-2.5">
                    {MEMORIAL_SCENARIOS.map((sc) => {
                        const locked = sc.requiresUltraPlan && !isUltra && activeScenario !== sc.id;
                        const active = activeScenario === sc.id;
                        return (
                            <button
                                key={sc.id}
                                type="button"
                                disabled={locked}
                                onClick={() => onChange({ tipo_diseno: sc.id, tema: sc.defaultTheme, particulas: sc.defaultParticles })}
                                className={`${optionClass(active)} p-3 text-left flex items-center gap-3 ${locked ? 'opacity-45 cursor-not-allowed' : ''}`}
                            >
                                <span className="text-2xl">{SCENARIO_ICONS[sc.id] || '🕯️'}</span>
                                <span className={`text-sm font-semibold flex-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{sc.name}</span>
                                {active && <Check size={16} className="text-sky-500" strokeWidth={3} />}
                                {locked && <Crown size={14} className="text-amber-500" />}
                            </button>
                        );
                    })}
                </div>

                {/* Color */}
                <p className={`${sectionLabel} mt-6`}>{es ? 'Color' : 'Color'}</p>
                <div className="flex flex-wrap gap-4">
                    {themes.map((key) => {
                        const active = diseno.tema === key;
                        return (
                            <button key={key} type="button" onClick={() => onChange({ tema: key })} className="flex flex-col items-center gap-1.5">
                                <span className={`w-11 h-11 rounded-full bg-gradient-to-br ${THEME_GRADIENTS[key]} border-2 transition-all ${active ? `border-sky-500 ring-2 ring-sky-500/30 ring-offset-2 ${isDark ? 'ring-offset-slate-900' : 'ring-offset-white'}` : isDark ? 'border-slate-700' : 'border-slate-200'}`} />
                                <span className={`text-[11px] ${active ? (isDark ? 'text-slate-100 font-semibold' : 'text-slate-800 font-semibold') : mutedClass(isDark)}`}>{themeLabels[key]}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Efecto */}
                <p className={`${sectionLabel} mt-6`}>{es ? 'Efecto' : 'Effect'}</p>
                <div className="grid grid-cols-4 gap-2">
                    {effects.map((p) => {
                        const active = diseno.particulas === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => onChange({ particulas: p.id })}
                                className={`${optionClass(active)} py-3 flex flex-col items-center gap-1.5 ${active ? 'text-sky-500' : mutedClass(isDark)}`}
                            >
                                {p.icon}
                                <span className="text-[11px] font-medium">{p.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Opciones avanzadas: fondo de portada */}
                {backgrounds.length > 0 && (
                    <div className={`mt-6 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                        <button type="button" onClick={() => setAdvancedOpen((v) => !v)} className={`w-full flex items-center justify-between text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {es ? 'Opciones avanzadas' : 'Advanced options'}
                            <ChevronDown size={18} className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {advancedOpen && (
                            <div className="mt-3">
                                <p className={`text-xs mb-2 ${mutedClass(isDark)}`}>{es ? 'Fondo de portada' : 'Cover background'}</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onChange({ portada_url: '' })}
                                        className={`${optionClass(!diseno.portada_url)} aspect-video flex flex-col items-center justify-center gap-1 text-[11px] ${mutedClass(isDark)}`}
                                    >
                                        <Heart size={16} /> {es ? 'Del escenario' : 'Scene default'}
                                    </button>
                                    {backgrounds.map((bg) => (
                                        <button
                                            key={bg.id ?? bg.url}
                                            type="button"
                                            onClick={() => onChange({ portada_url: bg.url })}
                                            className={`${optionClass(diseno.portada_url === bg.url)} aspect-video overflow-hidden relative`}
                                        >
                                            <img src={bg.url} alt={bg.name || ''} className="w-full h-full object-cover" />
                                            {diseno.portada_url === bg.url && (
                                                <span className="absolute top-1 right-1 bg-sky-600 text-white rounded-full p-0.5"><Check size={11} strokeWidth={3} /></span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {hasLockedScenario && (
                    <p className={`mt-5 text-xs flex items-center gap-1.5 ${mutedClass(isDark)}`}>
                        <Crown size={12} className="text-amber-500" />
                        {es ? 'Los escenarios con corona están disponibles en un plan superior.' : 'Scenes with a crown are available on a higher plan.'}
                    </p>
                )}

                <button type="button" onClick={onClose} className={`${primaryBtn} w-full mt-6`}>
                    {es ? 'Listo' : 'Done'}
                </button>
            </div>
        </div>
    );
}
