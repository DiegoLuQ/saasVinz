"use client";

import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Layers, MessageCircle, Package, Search, Share2, Sparkles, X, Clock } from 'lucide-react';

export interface PublicPlanItem {
    name: string;
    description?: string | null;
    image_url?: string | null;
}

export interface PublicPlan {
    id: number;
    name: string;
    description?: string | null;
    price: number;
    image_url?: string | null;
    services: PublicPlanItem[];
    products: PublicPlanItem[];
}

interface Props {
    tenantName: string;
    tenantLogo?: string | null;
    whatsapp?: string | null;
    expiresAt?: string | null;
    plans: PublicPlan[];
    getImageUrl: (url?: string | null) => string | null;
    onShare: () => void;
    copiedLink: boolean;
}

const formatCLP = (value: number) => `$${Math.round(value).toLocaleString('es-CL')}`;

/** Catálogo público de planes: portada de cada plan + servicios y productos incluidos. */
export default function PublicPlansCatalog({
    tenantName,
    tenantLogo,
    whatsapp,
    expiresAt,
    plans,
    getImageUrl,
    onShare,
    copiedLink,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPlans = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return plans;
        return plans.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            p.services.some(s => s.name.toLowerCase().includes(q)) ||
            p.products.some(s => s.name.toLowerCase().includes(q))
        );
    }, [plans, searchTerm]);

    const planWhatsAppUrl = (plan: PublicPlan) => {
        if (!whatsapp) return null;
        const msg = `Hola ${tenantName}, me interesa el plan: ${plan.name} (${formatCLP(plan.price)})`;
        return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
    };

    return (
        <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col selection:bg-amber-500 selection:text-black">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0a0d14]/80 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20 gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            {tenantLogo ? (
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                                    <img src={getImageUrl(tenantLogo)!} alt={tenantName} className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                    {tenantName.charAt(0)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">{tenantName}</h1>
                                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        <Sparkles size={10} /> Catálogo Oficial
                                    </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 mt-0.5 font-medium truncate">Planes de Cremación</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {expiresAt && (
                                <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                                    <Clock size={13} className="text-amber-400" />
                                    <span>Válido hasta: {new Date(expiresAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}
                            <button
                                onClick={onShare}
                                className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white border border-white/10 flex items-center gap-2 text-xs font-bold transition-all"
                                title="Compartir este catálogo"
                            >
                                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
                                <span className="hidden sm:inline">{copiedLink ? '¡Enlace Copiado!' : 'Compartir'}</span>
                            </button>
                            {whatsapp && (
                                <a
                                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola ${tenantName}, estoy viendo sus planes de cremación y me gustaría hacer una consulta.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    <MessageCircle size={16} />
                                    <span className="hidden sm:inline">WhatsApp</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero + búsqueda */}
            <section className="bg-gradient-to-b from-amber-500/[0.04] via-transparent to-transparent pt-8 pb-6 border-b border-white/[0.04]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Nuestros Planes</h2>
                        <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                            Cada plan reúne los servicios y productos para acompañarte en la despedida. Consúltanos por WhatsApp para coordinar.
                        </p>
                    </div>
                    {plans.length > 3 && (
                        <div className="relative max-w-xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar plan o servicio incluido..."
                                className="w-full bg-[#111622] border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1" aria-label="Limpiar búsqueda">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Planes */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {filteredPlans.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-4">
                            <Layers size={32} />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">
                            {plans.length === 0 ? 'Aún no hay planes publicados' : 'No se encontraron planes'}
                        </h3>
                        <p className="text-xs text-neutral-400 max-w-xs">
                            {plans.length === 0 ? 'Contáctanos por WhatsApp para conocer nuestras opciones.' : 'Intenta buscar con otra palabra.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredPlans.map(plan => {
                            const cover = getImageUrl(plan.image_url);
                            const waUrl = planWhatsAppUrl(plan);
                            return (
                                <article key={plan.id} className="bg-[#111622] border border-white/[0.08] rounded-3xl overflow-hidden flex flex-col hover:border-amber-500/30 transition-colors">
                                    {/* Portada */}
                                    <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-500/10 to-amber-600/5">
                                        {cover ? (
                                            <img src={cover} alt={plan.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-amber-400/40">
                                                <Layers size={56} />
                                            </div>
                                        )}
                                        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5">
                                            <span className="text-lg font-black text-white tabular-nums">{formatCLP(plan.price)}</span>
                                        </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col gap-4">
                                        <div>
                                            <h3 className="text-lg font-black text-white leading-tight">{plan.name}</h3>
                                            {plan.description && (
                                                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{plan.description}</p>
                                            )}
                                        </div>

                                        {plan.services.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Servicios incluidos</p>
                                                <ul className="space-y-1.5">
                                                    {plan.services.map((s, i) => (
                                                        <li key={`${s.name}-${i}`} className="flex items-start gap-2 text-sm text-neutral-200">
                                                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                                                            <span>
                                                                {s.name}
                                                                {s.description && <span className="block text-[11px] text-neutral-500">{s.description}</span>}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {plan.products.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/80 mb-2">Productos incluidos</p>
                                                <ul className="space-y-1.5">
                                                    {plan.products.map((p, i) => (
                                                        <li key={`${p.name}-${i}`} className="flex items-center gap-2 text-sm text-neutral-200">
                                                            <Package size={14} className="text-sky-400 shrink-0" />
                                                            <span>{p.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {waUrl && (
                                            <a
                                                href={waUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-auto w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-emerald-500/20"
                                            >
                                                <MessageCircle size={16} />
                                                Consultar este plan
                                            </a>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            <footer className="border-t border-white/[0.06] py-6 text-center text-[11px] text-neutral-500 font-mono">
                {tenantName} • Catálogo Digital Seguro
            </footer>
        </div>
    );
}
