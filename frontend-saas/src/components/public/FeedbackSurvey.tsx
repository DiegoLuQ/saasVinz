'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export interface FeedbackValue { rating: number; comment?: string | null }

/**
 * Encuesta de la familia al concluir el servicio (1–5 estrellas + comentario
 * opcional). Una por orden: POST /api/public/tracking/{slug}/{pet}/{token}/feedback.
 * El correo de agradecimiento enlaza aquí con ?encuesta=1 (se desplaza hasta ella).
 */
export default function FeedbackSurvey({ slug, petName, token, tenantName, isDark, initial, onDone }: {
    slug: string; petName: string; token: string; tenantName: string; isDark: boolean;
    initial: FeedbackValue | null; onDone: (v: FeedbackValue) => void;
}) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('encuesta')) {
            setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600);
        }
    }, []);

    const card = `mx-auto max-w-md rounded-3xl border px-6 py-5 text-center transition-colors duration-500 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/80 border-gray-200 shadow-sm'}`;
    const title = `text-sm font-semibold ${isDark ? 'text-neutral-100' : 'text-gray-800'}`;
    const sub = `mt-1 text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-gray-500'}`;

    if (initial) {
        return (
            <div ref={ref} id="encuesta" className={card}>
                <div className="flex justify-center gap-0.5 mb-2" aria-label={`${initial.rating} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} className={i <= initial.rating ? 'text-amber-400 fill-amber-400' : isDark ? 'text-neutral-700' : 'text-gray-300'} />)}
                </div>
                <p className={title}>Gracias por contarnos tu experiencia</p>
                <p className={sub}>Tu opinión ayuda a {tenantName} a acompañar mejor a cada familia.</p>
            </div>
        );
    }

    const send = async () => {
        if (!rating) return setError('Elige de 1 a 5 estrellas.');
        setSending(true); setError(null);
        try {
            const path = [slug, petName, token].map(encodeURIComponent).join('/');
            await apiRequest(`/api/public/tracking/${path}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, comment: comment.trim() || null }),
            });
            onDone({ rating, comment: comment.trim() || null });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'No pudimos guardar tu respuesta.');
        } finally {
            setSending(false);
        }
    };

    const shown = hover || rating;
    return (
        <div ref={ref} id="encuesta" className={card}>
            <p className={title}>¿Cómo fue tu experiencia con {tenantName}?</p>
            <p className={sub}>Es una sola pregunta. Tu respuesta llega directamente al equipo que te acompañó.</p>
            <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} estrella${i > 1 ? 's' : ''}`}
                        onMouseEnter={() => setHover(i)} onClick={() => { setRating(i); setError(null); }}
                        className="p-1 transition-transform hover:scale-110">
                        <Star size={30} className={i <= shown ? 'text-amber-400 fill-amber-400' : isDark ? 'text-neutral-600' : 'text-gray-300'} />
                    </button>
                ))}
            </div>
            {rating > 0 && (
                <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))} rows={3} maxLength={500}
                    placeholder="¿Quieres contarnos algo más? (opcional)"
                    className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none ${isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-500' : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400'}`} />
            )}
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <button type="button" onClick={send} disabled={sending || !rating}
                className={`mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold transition-colors disabled:opacity-40 ${isDark ? 'bg-white text-neutral-900 hover:bg-neutral-200' : 'bg-gray-900 text-white hover:bg-gray-700'}`}>
                {sending && <Loader2 size={13} className="animate-spin" />} Enviar
            </button>
        </div>
    );
}
