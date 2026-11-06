"use client";

/**
 * Código QR del memorial para imprimir (placa, urna, rincón de fotos). Solo planes con
 * `qr` (Eterno, Infinito). Descarga una tarjeta PNG en alta resolución con el QR del enlace corto.
 */
import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { cardClass, mutedClass, primaryBtn, titleClass } from './ui';

type Props = { url: string; petName: string; isDark: boolean; locale: Locale };

const W = 1200;
const H = 1600;

export default function QrCard({ url, petName, isDark, locale }: Props) {
    const es = locale === 'es';
    const qrWrap = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState(false);

    const download = async () => {
        const qr = qrWrap.current?.querySelector('canvas');
        if (!qr) return;
        setBusy(true);
        try {
            if (document.fonts?.ready) await document.fonts.ready;
            const c = document.createElement('canvas');
            c.width = W;
            c.height = H;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = '#c5a059';
            ctx.lineWidth = 6;
            ctx.strokeRect(40, 40, W - 80, H - 80);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#8a6d2f';
            ctx.font = '600 40px Georgia, serif';
            ctx.fillText(es ? 'En memoria de' : 'In loving memory of', W / 2, 190);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 96px Georgia, serif';
            let name = petName;
            while (ctx.measureText(name).width > W - 200 && name.length > 3) name = name.slice(0, -1);
            ctx.fillText(name === petName ? name : `${name}…`, W / 2, 300);

            const size = 800;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(qr, (W - size) / 2, 380, size, size);

            ctx.fillStyle = '#334155';
            ctx.font = '500 44px Georgia, serif';
            ctx.fillText(es ? 'Escanea para visitar su memorial' : 'Scan to visit their memorial', W / 2, 1290);
            ctx.fillStyle = '#64748b';
            ctx.font = '32px Arial, sans-serif';
            const shortUrl = url.replace(/^https?:\/\//, '');
            ctx.fillText(shortUrl.length > 56 ? `${shortUrl.slice(0, 55)}…` : shortUrl, W / 2, 1360);
            ctx.fillStyle = '#c5a059';
            ctx.font = 'bold 26px Arial, sans-serif';
            ctx.fillText('VINZER MEMORIAL', W / 2, 1480);

            const a = document.createElement('a');
            a.href = c.toDataURL('image/png');
            a.download = `memorial-${petName.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'qr'}-qr.png`;
            a.click();
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className={cardClass(isDark)}>
            <div className="flex items-center gap-2">
                <QrCode size={18} className={isDark ? 'text-amber-300' : 'text-amber-600'} />
                <h2 className={titleClass(isDark)}>{es ? 'Código QR para imprimir' : 'Printable QR code'}</h2>
            </div>
            <p className={`mt-1 text-sm ${mutedClass(isDark)}`}>
                {es
                    ? `Imprímelo o grábalo en una placa junto a la urna de ${petName}. Quien lo escanee llega a su memorial.`
                    : `Print it or engrave it on a plaque next to ${petName}'s urn. Anyone who scans it reaches the memorial.`}
            </p>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <QRCodeCanvas value={url} size={132} marginSize={1} />
                </div>
                <button type="button" onClick={download} disabled={busy} className={`${primaryBtn} w-full sm:w-auto`}>
                    <Download size={16} /> {es ? 'Descargar para imprimir' : 'Download to print'}
                </button>
            </div>
            {/* QR grande (oculto) para la tarjeta en alta resolución */}
            <div ref={qrWrap} className="hidden" aria-hidden>
                <QRCodeCanvas value={url} size={800} marginSize={2} level="M" />
            </div>
        </section>
    );
}
