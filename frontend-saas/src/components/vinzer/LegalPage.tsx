import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { VinzerLogo } from '@/components/vinzer/VinzerLogo';
import { LEGAL_ENTITY, LEGAL_UPDATED, type LegalDoc } from '@/lib/vinzer/legal';

const OTHER_DOCS = [
    { slug: 'terminos', label: 'Términos del Servicio' },
    { slug: 'privacidad', label: 'Política de Privacidad' },
    { slug: 'cookies', label: 'Política de Cookies' },
];

/** Correo de contacto legal: el de legal.ts o el de «Datos del SaaS» del admin. */
export async function legalContactEmail(): Promise<string> {
    if (LEGAL_ENTITY.email) return LEGAL_ENTITY.email;
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const r = await fetch(`${baseUrl}/api/public/platform-info`, { next: { revalidate: 3600 } });
        const info = r.ok ? await r.json() : null;
        if (info?.correo) return info.correo;
    } catch { /* sin API se usa el genérico */ }
    return 'el correo de contacto publicado en vinzer.cl';
}

/** Página legal (términos, privacidad, cookies) con el estilo de la web pública. */
export default function LegalPage({ doc }: { doc: LegalDoc }) {
    return (
        <div className="min-h-screen bg-[#020210] text-[#FFFFFF] font-sans antialiased overflow-x-hidden relative pb-20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-screen pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#19B5FE]/10 blur-[150px] rounded-full" />
            </div>

            <header className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between border-b border-white/5">
                <Link href="/"><VinzerLogo size="md" /></Link>
                <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#FFFFFF] transition-colors">
                    <ArrowLeft size={14} /> Volver al inicio
                </Link>
            </header>

            <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 mt-12">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E0B84D]">Legal</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">{doc.title}</h1>
                <p className="mt-2 text-xs text-slate-500">Última actualización: {LEGAL_UPDATED}</p>
                <p className="mt-6 text-sm text-slate-300 leading-relaxed">{doc.intro}</p>

                <div className="mt-10 space-y-9">
                    {doc.sections.map((s) => (
                        <section key={s.title}>
                            <h2 className="text-lg font-bold text-white">{s.title}</h2>
                            <div className="mt-3 space-y-2.5 text-sm text-slate-300 leading-relaxed">
                                {s.body.map((p, i) => p.startsWith('• ')
                                    ? <p key={i} className="pl-5 relative"><span className="absolute left-1 text-[#19B5FE]">•</span>{p.slice(2)}</p>
                                    : <p key={i}>{p}</p>)}
                            </div>
                        </section>
                    ))}
                </div>

                <nav className="mt-14 pt-6 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2 text-xs" aria-label="Documentos legales">
                    {OTHER_DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
                        <Link key={d.slug} href={`/${d.slug}`} className="text-slate-400 hover:text-[#19B5FE]">{d.label}</Link>
                    ))}
                </nav>
            </main>
        </div>
    );
}
