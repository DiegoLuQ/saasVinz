"use client";

import { useRef, useState } from 'react';
import { Camera, Check, Pencil, Plus, Quote, X, Heart } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getSuggestedEpitaphs } from '@/lib/memorialDesign';
import { cardClass, mutedClass, primaryBtn, secondaryBtn, titleClass } from './ui';

const MAX_DEDICATION = 500;

type Props = {
    petName: string;
    mainImage: string;
    images: string[];
    imgLimit: number;
    dedication: string;
    ownerDedication?: string | null;
    isDark: boolean;
    locale: Locale;
    busy: boolean;
    onSelectMain: (url: string) => void;
    onUploadFile: (file: File) => void;
    onDeleteImage: (url: string) => void;
    onUploadBlocked: () => void;
    onDedicationChange: (text: string) => void;
    onDedicationDone: () => void;
};

export default function MemorialSummaryCard({
    petName, mainImage, images, imgLimit, dedication, ownerDedication, isDark, locale, busy,
    onSelectMain, onUploadFile, onDeleteImage, onUploadBlocked, onDedicationChange, onDedicationDone,
}: Props) {
    const es = locale === 'es';
    const fileRef = useRef<HTMLInputElement>(null);
    const [photosOpen, setPhotosOpen] = useState(false);
    const [editing, setEditing] = useState(false);

    const cover = mainImage || images[0] || '';
    const canAdd = images.length < imgLimit;
    const suggestions = [
        ...(ownerDedication && ownerDedication.trim() ? [ownerDedication.trim()] : []),
        ...getSuggestedEpitaphs(petName, locale).slice(0, 3),
    ];

    const pickFile = () => (canAdd ? fileRef.current?.click() : onUploadBlocked());

    const finishEditing = () => {
        setEditing(false);
        onDedicationDone();
    };

    return (
        <section className={cardClass(isDark)}>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadFile(file);
                    e.target.value = '';
                }}
            />

            <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
                {/* Foto de portada */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                    <div className={`w-36 h-36 rounded-full overflow-hidden border-4 flex items-center justify-center ${isDark ? 'border-slate-700 bg-slate-900' : 'border-sky-100 bg-sky-50'}`}>
                        {cover
                            ? <img src={cover} alt={petName} className="w-full h-full object-cover" />
                            : <Heart size={40} className={isDark ? 'text-slate-600' : 'text-sky-200'} />}
                    </div>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => (images.length === 0 ? pickFile() : setPhotosOpen((v) => !v))}
                        className={secondaryBtn(isDark)}
                    >
                        <Camera size={16} />
                        {images.length === 0 ? (es ? 'Subir foto' : 'Upload photo') : (es ? 'Cambiar foto' : 'Change photo')}
                    </button>
                </div>

                {/* Dedicatoria */}
                <div className="flex-1 min-w-0">
                    <h2 className={titleClass(isDark)}>{es ? 'Dedicatoria' : 'Dedication'}</h2>

                    {!editing ? (
                        <>
                            {dedication ? (
                                <p className={`mt-2 font-serif italic leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                    “{dedication}”
                                </p>
                            ) : (
                                <p className={`mt-2 text-sm ${mutedClass(isDark)}`}>
                                    {es
                                        ? `Escribe unas palabras para recordar a ${petName}. Se mostrarán en el memorial.`
                                        : `Write a few words to remember ${petName}. They will be shown on the memorial.`}
                                </p>
                            )}
                            <button type="button" onClick={() => setEditing(true)} className={`${secondaryBtn(isDark)} mt-4`}>
                                <Pencil size={15} />
                                {dedication ? (es ? 'Editar dedicatoria' : 'Edit dedication') : (es ? 'Escribir dedicatoria' : 'Write dedication')}
                            </button>
                        </>
                    ) : (
                        <div className="mt-3 space-y-3">
                            <textarea
                                autoFocus
                                value={dedication}
                                maxLength={MAX_DEDICATION}
                                onChange={(e) => onDedicationChange(e.target.value.slice(0, MAX_DEDICATION))}
                                placeholder={es ? 'Escribe unas palabras para honrar su memoria…' : 'Write a few words to honor their memory…'}
                                className={`w-full min-h-[130px] rounded-2xl border p-4 text-sm outline-none resize-none transition-colors ${isDark ? 'bg-slate-900/60 border-slate-700 text-slate-100 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-sky-400'}`}
                            />
                            <div className={`flex items-center justify-between text-xs ${mutedClass(isDark)}`}>
                                <span>{es ? 'Se guarda automáticamente' : 'Saved automatically'}</span>
                                <span className={dedication.length > 450 ? 'text-amber-500 font-semibold' : ''}>{dedication.length}/{MAX_DEDICATION}</span>
                            </div>

                            {suggestions.length > 0 && (
                                <div className="space-y-2">
                                    <p className={`text-xs font-semibold ${mutedClass(isDark)}`}>{es ? '¿Necesitas una idea?' : 'Need an idea?'}</p>
                                    <div className="flex flex-col gap-2">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => onDedicationChange(s.slice(0, MAX_DEDICATION))}
                                                className={`text-left text-xs px-3 py-2 rounded-xl border flex gap-2 transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-700/60' : 'border-slate-200 text-slate-600 hover:bg-sky-50'}`}
                                            >
                                                <Quote size={12} className="shrink-0 mt-0.5 opacity-60" />
                                                <span className="line-clamp-2">
                                                    {i === 0 && ownerDedication ? <strong>{es ? 'Tus palabras: ' : 'Your words: '}</strong> : null}
                                                    {s}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button type="button" onClick={finishEditing} className={primaryBtn}>
                                <Check size={16} /> {es ? 'Listo' : 'Done'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Fotos: se despliega con «Cambiar foto» */}
            {photosOpen && images.length > 0 && (
                <div className={`mt-5 pt-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {es ? 'Toca una foto para usarla de portada' : 'Tap a photo to use it as cover'}
                        </p>
                        <span className={`text-xs ${mutedClass(isDark)}`}>{images.length}/{imgLimit}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {images.map((img) => {
                            const active = img === cover;
                            return (
                                <div key={img} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => onSelectMain(img)}
                                        className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${active ? 'border-sky-500 ring-2 ring-sky-500/30' : isDark ? 'border-slate-700' : 'border-slate-200'}`}
                                        aria-label={es ? 'Usar como portada' : 'Use as cover'}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        {active && (
                                            <span className="absolute bottom-1.5 left-1.5 bg-sky-600 text-white rounded-full p-1">
                                                <Check size={12} strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => onDeleteImage(img)}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500 flex items-center justify-center shadow"
                                        aria-label={es ? 'Eliminar foto' : 'Delete photo'}
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            );
                        })}
                        {canAdd && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={pickFile}
                                className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:border-sky-500/60' : 'border-slate-200 text-slate-500 hover:border-sky-300'}`}
                            >
                                <Plus size={20} />
                                {es ? 'Agregar' : 'Add'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
