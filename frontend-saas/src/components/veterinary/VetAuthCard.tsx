"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Stethoscope } from 'lucide-react';

/** Marco común de las páginas públicas del portal (login, olvidé y restablecer contraseña). */
export default function VetAuthCard({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400">
                            <Stethoscope size={28} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Portal <span className="text-teal-400">Veterinario</span></h1>
                    <p className="text-slate-400 text-sm">{subtitle}</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />
                    {children}
                    <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                            <ShieldCheck size={12} /> Área segura para socios
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export const vetInputCls =
    'w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-teal-500/50 focus:bg-slate-900/80 transition-all text-sm text-slate-200 placeholder:text-slate-600';

export const vetButtonCls =
    'w-full bg-teal-500 py-4 rounded-xl font-bold text-slate-900 text-sm flex items-center justify-center gap-2 hover:bg-teal-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:pointer-events-none';
