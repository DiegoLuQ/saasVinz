import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { apiRequest } from '@/lib/admin/api';

/** «Enviar correo de prueba»: verifica la cuenta SMTP del .env (MAIL_*), p. ej. no-reply@vinzer.cl en Hostinger. */
export default function TestEmailButton() {
    const [to, setTo] = useState('');
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const send = async () => {
        setSending(true);
        setMsg(null);
        try {
            const r = await apiRequest('/api/internal/creator/config/test-email', { method: 'POST', body: { to: to.trim() || null } });
            setMsg({ ok: true, text: `Enviado a ${r.sent_to.join(', ')} desde ${r.from}. Revisa también spam.` });
        } catch (e: unknown) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo enviar' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase text-white/40">Probar el envío de correos</p>
            <div className="flex gap-2">
                <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Vacío = correo para recibir mensajes"
                    className="flex-1 min-w-0 bg-[#0a192f] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-white/20" />
                <button type="button" onClick={send} disabled={sending}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold disabled:opacity-50">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar prueba
                </button>
            </div>
            {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-red-300'} break-words`}>{msg.text}</p>}
        </div>
    );
}
