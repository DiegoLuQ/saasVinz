"use client";

/**
 * Línea de tiempo pública del memorial (planes Eterno / Infinito): momentos que la familia
 * armó en la gestión, en vertical, cada uno con su fecha, título, texto y foto propia.
 * Datos: `memorial.timeline` (backend app/services/memorial_timeline.py).
 */
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { getImageUrl } from '@/lib/tenant/api';

export type TimelineMoment = { id: number; fecha: string | null; titulo: string; texto?: string | null; image_url?: string | null };

type Props = { moments: TimelineMoment[]; petName: string; locale: 'es' | 'en'; isDarkMode: boolean };

const fmtDate = (iso: string, en: boolean) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(en ? 'en-US' : 'es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function MemorialTimeline({ moments, petName, locale, isDarkMode }: Props) {
    if (!moments?.length) return null;
    const en = locale === 'en';
    const line = isDarkMode ? 'bg-gradient-to-b from-amber-300/0 via-amber-300/40 to-amber-300/0' : 'bg-gradient-to-b from-amber-500/0 via-amber-500/40 to-amber-500/0';
    const card = isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white/85 border-slate-200 shadow-sm';

    return (
        <section className="w-full max-w-3xl mx-auto mb-20" aria-label={en ? 'Timeline' : 'Línea de tiempo'}>
            <div className="text-center mb-10">
                <span className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-60 block mb-1">
                    {en ? 'Their story' : 'Su historia'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-medium">
                    {en ? `Moments with ${petName}` : `Momentos con ${petName}`}
                </h2>
            </div>

            <ol className="relative">
                <span aria-hidden className={`absolute top-0 bottom-0 left-4 sm:left-1/2 w-px sm:-translate-x-1/2 ${line}`} />
                {moments.map((m, i) => {
                    const right = i % 2 === 1;
                    const img = m.image_url ? (getImageUrl(m.image_url) || m.image_url) : null;
                    return (
                        <motion.li
                            key={m.id}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`relative pl-12 sm:pl-0 mb-10 last:mb-0 sm:flex ${right ? 'sm:justify-end' : 'sm:justify-start'}`}
                        >
                            <span aria-hidden className={`absolute left-4 sm:left-1/2 top-5 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full border ${isDarkMode ? 'bg-[#0f172a] border-amber-300/50 text-amber-200' : 'bg-white border-amber-400/60 text-amber-600'}`}>
                                <Heart size={13} fill="currentColor" />
                            </span>
                            <article className={`sm:w-[calc(50%-2rem)] rounded-2xl border overflow-hidden backdrop-blur-sm ${card}`}>
                                {img && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={img} alt={m.titulo} loading="lazy" className="w-full max-h-80 object-cover" />
                                )}
                                <div className="p-5">
                                    {m.fecha && (
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-amber-200/80' : 'text-amber-700'}`}>
                                            {fmtDate(m.fecha, en)}
                                        </p>
                                    )}
                                    <h3 className="font-serif text-xl leading-snug">{m.titulo}</h3>
                                    {m.texto && <p className="mt-2 text-sm leading-relaxed opacity-80 whitespace-pre-line">{m.texto}</p>}
                                </div>
                            </article>
                        </motion.li>
                    );
                })}
            </ol>
        </section>
    );
}
