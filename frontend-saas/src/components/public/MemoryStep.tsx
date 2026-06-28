import React from 'react';
import { Heart } from 'lucide-react';
import ImageUploadStep from './ImageUploadStep';

interface Props {
    images: File[];
    setImages: (files: File[]) => void;
    petName: string;
    petNickname?: string;
    dedication: string;
    onDedicationChange: (text: string) => void;
}

const DEDICATION_MAX = 1000;

export default function MemoryStep({
    images,
    setImages,
    petName,
    petNickname,
    dedication,
    onDedicationChange,
}: Props) {
    const displayName = petNickname || petName || 'tu mascota';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500 items-start">
            {/* Sección 1: Fotos */}
            <div className="space-y-6">
                <ImageUploadStep images={images} setImages={setImages} />
            </div>

            {/* Separador en móvil, pero oculto en desktop ya que tenemos layout lado a lado */}
            <div className="flex md:hidden items-center gap-4 py-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                <Heart size={14} className="text-rose-300 dark:text-rose-500/50" fill="currentColor" />
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
            </div>

            {/* Sección 2: Dedicatoria */}
            <div className="space-y-6">
                <div className="text-center md:text-left mb-6">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 mb-4 md:mb-3">
                        <Heart size={18} fill="currentColor" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-1">
                        Mensaje de Despedida
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold">
                        Opcional · un recuerdo para {displayName}
                    </p>
                </div>

                <div className="space-y-3">
                    <textarea
                        value={dedication}
                        onChange={(e) => onDedicationChange(e.target.value.slice(0, DEDICATION_MAX))}
                        className="input-emotional min-h-[140px] md:min-h-[160px] py-4 leading-relaxed"
                        placeholder={`Comparte un recuerdo, una despedida o las palabras que sientas. Esto se incluirá en el certificado y en el memorial digital de ${displayName}.`}
                        maxLength={DEDICATION_MAX}
                    />
                    <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
                            Tu dedicatoria puede aparecer en el certificado y en el memorial.
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                            {dedication.length} / {DEDICATION_MAX}
                        </span>
                    </div>
                </div>

                <div className="bg-rose-50/80 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-4 flex items-start gap-3">
                    <Heart size={14} className="text-rose-400 dark:text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-medium leading-relaxed">
                        Una sola frase es suficiente. También puedes saltar este paso si lo prefieres — completa el envío cuando estés lista.
                    </p>
                </div>
            </div>
        </div>
    );
}
