"use client";

import { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { cardClass, mutedClass, secondaryBtn, titleClass } from './ui';

type Props = {
    url: string;
    petName: string;
    isDark: boolean;
    locale: Locale;
};

export default function ShareBlock({ url, petName, isDark, locale }: Props) {
    const es = locale === 'es';
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* sin permiso de portapapeles: el enlace queda visible para copiarlo a mano */
        }
    };

    const whatsappText = es
        ? `Te comparto el memorial de ${petName}. Puedes encender una vela y dejarle un mensaje: ${url}`
        : `Here is ${petName}'s memorial. You can light a candle and leave a message: ${url}`;

    return (
        <section className={cardClass(isDark)}>
            <h2 className={titleClass(isDark)}>{es ? 'Compartir el memorial' : 'Share the memorial'}</h2>
            <p className={`text-sm mt-1 ${mutedClass(isDark)}`}>
                {es ? 'Envía el enlace a quienes quisieron a ' : 'Send the link to everyone who loved '}{petName}.
            </p>

            <div className={`mt-4 px-3 py-2.5 rounded-xl border text-xs break-all select-all ${isDark ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {url}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button type="button" onClick={copy} className={secondaryBtn(isDark)}>
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    {copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar enlace' : 'Copy link')}
                </button>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#25D366] text-white hover:brightness-95 transition"
                >
                    <MessageCircle size={16} /> WhatsApp
                </a>
                <a href={url} target="_blank" rel="noopener noreferrer" className={secondaryBtn(isDark)}>
                    <ExternalLink size={16} /> {es ? 'Abrir' : 'Open'}
                </a>
            </div>
        </section>
    );
}
