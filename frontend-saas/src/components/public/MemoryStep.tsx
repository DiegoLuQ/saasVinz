import React from 'react';
import { Heart, Sparkles, Feather, ImagePlus } from 'lucide-react';
import ImageUploadStep from './ImageUploadStep';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    images: File[];
    setImages: (files: File[]) => void;
    petName: string;
    petNickname?: string;
    dedication: string;
    onDedicationChange: (text: string) => void;
}

const DEDICATION_MAX = 500;

export default function MemoryStep({
    images,
    setImages,
    petName,
    petNickname,
    dedication,
    onDedicationChange,
}: Props) {
    const displayName = petNickname || petName || 'tu compañero';
    const hasPhotos = images.length > 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Cabecera Central Conmemorativa */}
            <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-100 to-rose-100 dark:from-amber-950/40 dark:to-rose-950/40 text-rose-500 dark:text-rose-400 mb-2 shadow-sm border border-rose-200/50 dark:border-rose-900/30">
                    <Heart size={20} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-extrabold uppercase italic tracking-tight text-slate-800 dark:text-slate-100 mb-1">
                    Espacio de Recuerdos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal tracking-wide">
                    Homenaje y dedicatoria para <span className="text-amber-600 dark:text-amber-400 font-semibold">{displayName}</span>
                </p>
            </div>

            {/* 1. Portarretratos / Álbum Horizontal */}
            <div className="rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-6 sm:p-7 shadow-sm">
                <ImageUploadStep images={images} setImages={setImages} petName={displayName} />
            </div>

            {/* 2. Carta de Despedida (Condicionada a la presencia de al menos 1 foto) */}
            <AnimatePresence mode="wait">
                {hasPhotos ? (
                    <motion.div
                        key="dedication-card"
                        initial={{ opacity: 0, y: 16, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -16, height: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-6 sm:p-7 shadow-sm space-y-4 overflow-hidden"
                    >
                        {/* Header de la Carta */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center">
                                    <Feather size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Carta de Despedida
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                                        Opcional · Aparecerá en su certificado conmemorativo y memorial
                                    </p>
                                </div>
                            </div>

                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                                {dedication.length} / {DEDICATION_MAX}
                            </span>
                        </div>

                        {/* Área de Escritura Amplia */}
                        <div className="relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-4 focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                            <textarea
                                value={dedication}
                                onChange={(e) => onDedicationChange(e.target.value.slice(0, DEDICATION_MAX))}
                                className="w-full bg-transparent border-0 outline-none resize-none min-h-[140px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm leading-relaxed"
                                placeholder={`Escribe unas palabras de amor, un agradecimiento o los recuerdos más bonitos que compartiste con ${displayName}...`}
                                maxLength={DEDICATION_MAX}
                            />
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900/60 mt-1">
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <Sparkles size={11} className="text-amber-500" /> Se incluirá con su nombre
                                </span>
                                {dedication.length > 0 && (
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        Dedicatoria guardada
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Mensaje Empático */}
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-rose-50/60 via-amber-50/40 to-slate-50/60 dark:from-rose-950/20 dark:via-amber-950/10 dark:to-slate-900/30 border border-rose-100/70 dark:border-rose-900/20 rounded-xl p-3.5 flex items-center gap-2.5"
                        >
                            <Heart size={14} className="text-rose-400 dark:text-rose-500 shrink-0" fill="currentColor" />
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                Si en este momento prefieres no escribir, puedes dejar este espacio en blanco y continuar con el siguiente paso.
                            </p>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="photo-hint"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-5 text-center flex items-center justify-center gap-3 text-slate-400 dark:text-slate-500"
                    >
                        <ImagePlus size={18} className="text-amber-500/70 shrink-0" />
                        <span className="text-xs font-medium">
                            Sube al menos 1 foto en los portarretratos para redactar su Carta de Despedida.
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
