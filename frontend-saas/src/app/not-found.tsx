"use client";

import React, { useState, useEffect } from 'react';
import { Home } from 'lucide-react';
import { getMainRootUrl } from '@/lib/publicUrls';
import "./globals.css";

export default function NotFound() {
    const [mainUrl, setMainUrl] = useState('http://lvh.me:3000');

    useEffect(() => {
        setMainUrl(getMainRootUrl());
    }, []);

    return (
        <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
            {/* Gradientes sutiles de fondo */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-md w-full relative z-10 text-center">
                <div className="bg-[#0e1320] rounded-3xl p-8 md:p-12 border border-slate-800 shadow-2xl">
                    
                    {/* Badge 404 */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Error 404</span>
                    </div>

                    {/* Número 404 */}
                    <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 tracking-tight mb-3">
                        404
                    </h1>

                    {/* Título y Mensaje */}
                    <h2 className="text-xl font-bold text-white mb-2">
                        Página no encontrada
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        La página a la que intentas acceder no existe, ha sido movida o la dirección es incorrecta.
                    </p>

                    {/* Botón a la página principal */}
                    <a
                        href={mainUrl}
                        className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 cursor-pointer group"
                    >
                        <Home size={18} className="transition-transform group-hover:-translate-y-0.5" />
                        <span>Ir a la Página Principal</span>
                    </a>
                </div>

                {/* Pie de página sutil */}
                <p className="text-xs text-slate-600 mt-6">
                    Vinzer — Plataforma Integral de Crematorios & Mascotas
                </p>
            </div>
        </div>
    );
}
