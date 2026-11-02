'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { usePlatformInfo, whatsappLink } from '@/lib/platformInfo';

/** Cabecera del Diagnóstico 360° (landing e informe): logo compacto + qué es Vinzer + WhatsApp. */
export default function DiagnosticoHeader({ right }: { right?: React.ReactNode }) {
    const { whatsapp } = usePlatformInfo();
    const wa = whatsappLink(whatsapp, 'Hola, vengo del Diagnóstico 360° de Vinzer y quiero saber más sobre la plataforma para mi crematorio.');

    return (
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#020210]/80 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-2.5 min-w-0 group" aria-label="Vinzer, plataforma para crematorios de mascotas">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-vinzer.webp" alt="" className="h-8 w-auto object-contain shrink-0" />
                    <span className="min-w-0 leading-tight border-l border-white/10 pl-2.5">
                        <span className="block text-sm font-black tracking-tight text-white group-hover:text-[#19B5FE] transition-colors">Vinzer</span>
                        <span className="block text-[10px] sm:text-[11px] text-slate-400 truncate">Plataforma para crematorios de mascotas</span>
                    </span>
                </Link>
                {right ?? (
                    <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <Link href="/" className={`${wa ? 'hidden sm:inline-flex' : 'inline-flex'} items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white`}>
                            Conocer Vinzer {!wa && <ArrowRight size={13} />}
                        </Link>
                        {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#25D366] text-[#04210f] text-xs font-black hover:brightness-110 transition">
                                <MessageCircle size={15} /><span><span className="hidden sm:inline">Escríbenos por </span>WhatsApp</span>
                            </a>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
}
