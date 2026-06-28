"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusCircle,
    Building2,
    User,
    CheckCircle2,
    ArrowRight,
    Rocket,
    Globe,
    ShieldCheck,
    Zap,
    Heart,
    FileText,
    Calculator,
    ChevronRight,
    Menu,
    X,
    Star,
    Settings,
    Layout,
    CreditCard
} from 'lucide-react';
import Carousel from '@/components/admin/Carousel';

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

// Icon mapper for dynamic features
const iconMap: any = {
    Globe, ShieldCheck, Zap, Heart, FileText, Building2, User, Star, Settings, Layout, CreditCard, Rocket, CheckCircle2
};

const getThemeColors = (theme: string) => {
    switch (theme) {
        case 'warm': return { text: 'text-[#c5a059]', bg: 'bg-[#c5a059]', border: 'border-[#c5a059]/20', shadow: 'shadow-[#c5a059]/20', bg_soft: 'bg-[#c5a059]/10' };
        case 'default':
        default: return { text: 'text-sky-400', bg: 'bg-sky-500', border: 'border-sky-500/20', shadow: 'shadow-sky-500/20', bg_soft: 'bg-sky-500/10' };
    }
};

export default function LandingPageClient({ initialConfig }: { initialConfig: any }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Config State
    const [config] = useState<any>(initialConfig);
    const [themeClasses, setThemeClasses] = useState(getThemeColors(initialConfig?.theme || 'default'));

    // Quotation State
    const [cremationsCount, setCremationsCount] = useState(10);
    const [estimatedPrice, setEstimatedPrice] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (config?.theme) {
            setThemeClasses(getThemeColors(config.theme));
        }
    }, [config]);

    useEffect(() => {
        const base = 50000;
        const perCremation = 15000;
        setEstimatedPrice(base + (cremationsCount * perCremation));
    }, [cremationsCount]);

    // Fallback content if config is loading or failed
    const heroH1 = config?.hero?.h1 || "Dignidad y Control";
    const heroH2 = config?.hero?.h2 || "en cada proceso.";
    const heroSubtitle = config?.hero?.subtitle || "Transforma la gestión de tu crematorio con nuestra solución integral.";

    const features = config?.features || [
        { icon: 'Globe', title: "Portal Público Emotivo", desc: "Permite que tus clientes envíen sus solicitudes." },
        { icon: 'FileText', title: "Certificados Automáticos", desc: "Genera certificados profesionales en segundos." },
        { icon: 'Zap', title: "Gestión Operativa Pro", desc: "Seguimiento en tiempo real de cada proceso." },
        { icon: 'ShieldCheck', title: "Control de Inventario", desc: "Administra urnas y productos adicionales." },
        { icon: 'Heart', title: "Muro de Recuerdos", desc: "Un espacio virtual para honrar a las mascotas." },
        { icon: 'Building2', title: "Multi-Sede / SaaS", desc: "Escala tu negocio permitiendo múltiples sucursales." }
    ];

    const plans = config?.plans || [
        { name: "Plan Base", price: "50.000", features: ['Hasta 50 cremaciones', 'Panel Básico'] },
        { name: "SaaS Pro", price: "120.000", features: ['Ilimitado', 'Soporte VIP', 'Multi-sede'] }
    ];

    return (
        <div className="min-h-screen bg-[#0a192f] text-white selection:bg-primary/30 font-sans overflow-x-hidden">
            {/* Background elements - Dynamic color */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 ${themeClasses.bg}`} />
                <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a192f]/80 backdrop-blur-lg border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 ${themeClasses.bg} ${themeClasses.shadow}`}>
                            <PlusCircle className="text-white" size={24} />
                        </div>
                        <span className="text-xl font-black tracking-tighter">SaaS<span className={themeClasses.text}>Crematorio</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        {['Características', 'Planes', 'Cotizador'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-white/60 hover:text-white transition-colors">{item}</a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowRegisterModal(true)}
                            className={`text-white text-sm font-black px-6 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl ${themeClasses.bg} ${themeClasses.shadow}`}
                        >
                            Comenzar
                        </button>
                        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-[#0a192f] p-8 pt-24 md:hidden"
                    >
                        <div className="flex flex-col gap-6 text-2xl font-black">
                            {['Características', 'Planes', 'Cotizador'].map((item) => (
                                <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setIsMenuOpen(false)}>{item}</a>
                            ))}
                            <button className={`${themeClasses.text} text-left`}>Iniciar Sesión</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center">
                {/* Background Image Logic */}
                {config?.hero?.backgroundImage ? (
                    <>
                        <div
                            className="absolute inset-0 z-0 transition-opacity duration-700"
                            style={{
                                backgroundImage: `url('${config.hero.backgroundImage}')`,
                                backgroundSize: config.hero.bgStretch !== false ? 'cover' : 'contain',
                                backgroundPosition: config.hero.bgCenter !== false ? 'center' : 'top center',
                                backgroundRepeat: 'no-repeat',
                                opacity: config.hero.bgOpacity ?? 0.5
                            }}
                        />
                        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0a192f]/30 via-[#0a192f]/80 to-[#0a192f]" />
                    </>
                ) : (
                    <div className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 ${themeClasses.bg}`} />
                )}

                <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
                    {config?.hero?.badge && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`inline-flex items-center gap-2 border px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md ${themeClasses.bg_soft} ${themeClasses.border} ${themeClasses.text}`}
                        >
                            {config.hero.badge}
                        </motion.div>
                    )}

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl md:text-8xl font-black leading-tight mb-8 drop-shadow-2xl"
                    >
                        {heroH1} <br /> <span className={`${themeClasses.text} italic`}>{heroH2}</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-white/70 max-w-2xl mb-12 drop-shadow-lg font-medium"
                    >
                        {heroSubtitle}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4"
                    >
                        <a
                            href={config?.hero?.button1Url || "/register"}
                            onClick={(e) => {
                                if (!config?.hero?.button1Url || config.hero.button1Url === '/register') {
                                    e.preventDefault();
                                    setShowRegisterModal(true);
                                }
                            }}
                            className={`text-white font-black px-10 py-5 rounded-2xl text-lg hover:scale-105 transition-all shadow-2xl flex items-center gap-3 ${themeClasses.bg} ${themeClasses.shadow}`}
                        >
                            {config?.hero?.button1Text || "Crear mi Sede Virtual"} <Rocket size={20} />
                        </a>
                        <a
                            href={config?.hero?.button2Url || "#cotizador"}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold px-10 py-5 rounded-2xl text-lg hover:bg-white/10 transition-all flex items-center gap-3 shadow-lg"
                        >
                            {config?.hero?.button2Text || "Ver Cotización"} <ChevronRight size={20} />
                        </a>
                    </motion.div>

                    {/* Carousel Section */}
                    {config?.carousel?.images?.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-20 w-full max-w-5xl space-y-8"
                        >
                            <div
                                className="relative aspect-video w-full overflow-hidden border border-white/10 shadow-2xl group"
                                style={{ borderRadius: config.carousel?.borderRadius || '2rem' }}
                            >
                                <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none group-hover:bg-transparent transition-colors duration-500" />

                                <Carousel
                                    images={config.carousel.images}
                                    transition={config.carousel.transition || 'fade'}
                                />
                            </div>

                            {config.carousel.ctaText && (
                                <div className="flex justify-center">
                                    <a
                                        href={config.carousel.ctaUrl || 'https://wa.me/56998239540'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-8 py-4 rounded-full font-black text-white flex items-center gap-3 hover:scale-105 transition-transform shadow-lg ${themeClasses.bg} ${themeClasses.shadow}`}
                                    >
                                        {config.carousel.ctaText} <ArrowRight size={20} />
                                    </a>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Dashboard Preview Mockup */}
                    {!config?.carousel?.images?.length && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-20 w-full max-w-5xl rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.3)] relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] via-transparent to-transparent z-10" />
                            <div className="bg-[#112240] p-4 flex items-center gap-2 border-b border-white/10">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                <div className="flex-1 bg-white/5 rounded-md h-6 mx-4 text-[10px] flex items-center px-3 text-white/20">admin.saascrematorio.cl/dashboard</div>
                            </div>
                            <div className="aspect-video bg-[#0a192f] p-8">
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
                                    <div className="h-32 rounded-2xl bg-white/5 animate-pulse delay-75" />
                                    <div className="h-32 rounded-2xl bg-white/5 animate-pulse delay-150" />
                                </div>
                                <div className="mt-8 h-64 rounded-2xl bg-white/5 animate-pulse" />
                            </div>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section id="características" className="py-32 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6">Todo lo que necesitas</h2>
                        <p className="text-white/40 max-w-xl mx-auto italic">Sistema modular configurable.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature: any, i: number) => {
                            const Icon = iconMap[feature.icon] || Star;
                            return (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -5 }}
                                    className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all cursor-default group"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${themeClasses.bg_soft} ${themeClasses.text}`}>
                                        <Icon size={30} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Quotation Section */}
            <section id="cotizador" className="py-32 px-6 bg-white/[0.02]">
                <div className="max-w-5xl mx-auto">
                    <div className="glass-card rounded-[3rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -mr-32 -mt-32 opacity-20 ${themeClasses.bg}`} />

                        <div className="md:w-1/2 space-y-6 relative">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${themeClasses.bg_soft} ${themeClasses.text}`}>
                                <Calculator size={24} />
                            </div>
                            <h2 className="text-4xl font-black leading-tight">Calcula tu <br /> <span className={`${themeClasses.text} italic`}>Cotización Mensual</span></h2>
                            <p className="text-white/40 text-sm">Ajusta el volumen esperado de cremaciones.</p>

                            <div className="pt-6 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-xs uppercase font-bold text-white/40 tracking-wider">Cremaciones al mes</label>
                                        <span className={`text-3xl font-black ${themeClasses.text}`}>{cremationsCount}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={cremationsCount}
                                        onChange={(e) => setCremationsCount(parseInt(e.target.value))}
                                        className={`w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-current ${themeClasses.text}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:w-1/2 w-full">
                            <div className="bg-[#112240] p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8 text-center relative overflow-hidden">
                                <div className="space-y-2">
                                    <span className={`text-xs font-bold uppercase tracking-widest opacity-60 ${themeClasses.text}`}>Inversión Estimada</span>
                                    <div className="text-5xl font-black">
                                        ${estimatedPrice.toLocaleString('es-CL')}
                                        <span className="text-sm font-normal text-white/30 ml-2">/mes</span>
                                    </div>
                                    <p className="text-[10px] text-white/20 italic mt-2">* Precio sujeto a cambios según módulos adicionales.</p>
                                </div>
                                <div className="h-[1px] bg-white/5 w-full" />
                                <ul className="text-left space-y-3 px-4">
                                    {['Hosting Incluido', 'Soporte 24/7', 'Actualizaciones Gratis'].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-xs text-white/60">
                                            <CheckCircle2 className={themeClasses.text || "text-primary"} size={14} /> {item}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => setShowRegisterModal(true)}
                                    className={`w-full py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl ${themeClasses.bg} text-white ${themeClasses.shadow}`}
                                >
                                    Obtener Acceso Ahora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Plans Section */}
            <section id="planes" className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6">Planes transparentes</h2>
                        <p className="text-white/40">Elige el que mejor se adapte a tu fase actual.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {plans.map((plan: any, i: number) => {
                            const isHighlighted = plan.isPopular || false;

                            return (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -10 }}
                                    className={`rounded-[3rem] p-12 relative group overflow-hidden border ${isHighlighted
                                        ? `${themeClasses.bg_soft} border-2`
                                        : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    {isHighlighted && (
                                        <div
                                            style={{ backgroundColor: plan.popularColor || '#10b981' }}
                                            className="absolute top-0 right-0 px-6 py-2 rounded-bl-[1.5rem] text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
                                        >
                                            Más Popular
                                        </div>
                                    )}

                                    <div className="space-y-6 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-3xl font-black">{plan.name}</h3>
                                        </div>

                                        <div>
                                            {plan.discountPercent > 0 ? (
                                                <div className="flex flex-col items-start">
                                                    <span className="text-lg text-white/40 line-through decoration-white/40 decoration-2 font-bold mb-[-5px]">
                                                        ${Number(plan.price).toLocaleString()} {plan.currency || 'CLP'}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-5xl font-black">
                                                            ${Number(plan.price * (1 - plan.discountPercent / 100)).toLocaleString()}
                                                        </span>
                                                        <div className="flex flex-col text-sm font-bold text-white/50 leading-tight">
                                                            <span>{plan.currency || 'CLP'}</span>
                                                            <span>/mes</span>
                                                        </div>
                                                        <div className="bg-green-500/20 text-green-400 text-xs font-black px-2 py-1 rounded-lg border border-green-500/20">
                                                            -{plan.discountPercent}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-5xl font-black">
                                                    ${Number(plan.price || 0).toLocaleString()}
                                                    <span className="text-sm font-normal text-white/30 ml-2">{plan.currency || 'CLP'} /mes</span>
                                                </div>
                                            )}
                                        </div>

                                        <ul className="space-y-4 pt-4">
                                            {plan.features?.map((item: string, idx: number) => (
                                                <li key={idx} className="flex items-center gap-3 text-sm text-white/70">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${themeClasses.bg_soft}`}>
                                                        <CheckCircle2 size={12} className={themeClasses.text} />
                                                    </div>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            onClick={() => setShowRegisterModal(true)}
                                            className={`w-full py-4 rounded-2xl font-black transition-all mt-4 
                                                ${isHighlighted
                                                    ? `${themeClasses.bg} text-white hover:opacity-90 ${themeClasses.shadow}`
                                                    : 'border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            Seleccionar {plan.name}
                                        </button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <PlusCircle className={themeClasses.text || "text-primary"} size={24} />
                        <span className="text-xl font-black tracking-tighter">SaaS<span className={themeClasses.text || "text-primary"}>Crematorio</span></span>
                    </div>
                    <p className="text-white/20 text-sm">© 2026 SaaS Crematorio. Todos los derechos reservados.</p>
                </div>
            </footer>

            {/* Registration Modal Overlay */}
            <AnimatePresence>
                {showRegisterModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRegisterModal(false)}
                            className="absolute inset-0 bg-[#0a192f]/80 backdrop-blur-md"
                        />
                        <RegisterModal onClose={() => setShowRegisterModal(false)} themeClasses={themeClasses} />
                    </div>
                )}
            </AnimatePresence>

            {/* Floating WhatsApp Button */}
            {config?.whatsapp?.show && config.whatsapp.phone && (
                <a
                    href={`https://api.whatsapp.com/send?phone=${config.whatsapp.phone.replace(/\D/g, '')}&text=${encodeURIComponent(config.whatsapp.message || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center group"
                    style={{ backgroundColor: config.whatsapp.color || '#25D366' }}
                >
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: config.whatsapp.color || '#25D366' }} />
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M18.403 5.633A8.919 8.919 0 0 0 12.053 3c-4.948 0-8.976 4.027-8.978 8.977 0 1.582.413 3.126 1.198 4.488L3 21.116l4.759-1.249a8.981 8.981 0 0 0 4.29 1.093h.004c4.947 0 8.975-4.027 8.977-8.977a8.926 8.926 0 0 0-2.627-6.35m-6.35 13.812h-.003a7.446 7.446 0 0 1-3.798-1.041l-.272-.162-2.824.741.753-2.753-.177-.282a7.448 7.448 0 0 1-1.141-3.971c.002-4.114 3.349-7.461 7.465-7.461a7.413 7.413 0 0 1 5.275 2.188 7.42 7.42 0 0 1 2.183 5.279c-.002 4.114-3.349 7.462-7.461 7.462m4.093-5.589c-.225-.113-1.327-.655-1.533-.73-.205-.075-.354-.112-.504.112-.15.224-.579.73-.71.88-.131.149-.262.168-.486.056-.224-.112-.949-.35-1.805-1.113-.667-.595-1.117-1.329-1.248-1.554-.131-.225-.014-.346.099-.458.101-.1.224-.262.336-.393.112-.131.149-.224.224-.374.075-.149.037-.28-.019-.393-.056-.112-.504-1.214-.69-1.663-.181-.435-.366-.377-.504-.383-.131-.006-.28-.006-.43-.006-.15 0-.393.056-.599.28-.206.225-.785.767-.785 1.871 0 1.104.804 2.17.916 2.32.112.15 1.582 2.415 3.832 3.387 1.336.577 1.859.614 2.508.519.789-.116 1.327-.542 1.514-1.066.187-.524.187-.973.131-1.066-.056-.094-.206-.15-.43-.262" />
                    </svg>
                </a>
            )}
        </div>
    );
}

// Separate component for the Register Modal
function RegisterModal({ onClose, themeClasses }: { onClose: () => void, themeClasses: any }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        tenantName: '', shortName: '', slug: '', tenantEmail: '', tenantRut: '',
        adminName: '', adminEmail: '', adminPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'shortName') {
            setFormData(prev => ({ ...prev, shortName: value, slug: slugify(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-md bg-[#112240] rounded-[2.5rem] border border-white/10 p-12 text-center space-y-6 shadow-2xl"
            >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto bg-green-500/20 text-green-500`}>
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black">¡Bienvenido!</h2>
                <p className="text-white/40">Tu sede virtual ha sido creada.</p>
                <p className={`${themeClasses.text} font-mono text-xs`}>admin.saascrematorio.cl</p>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-[#112240] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
            <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"><X size={24} /></button>

            <div className="p-10 pt-16">
                <div className="flex gap-2 mb-8">
                    {[1, 2].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? themeClasses.bg : 'bg-white/5'}`} />
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                                <h2 className="text-2xl font-black flex items-center gap-3"><Building2 className={themeClasses.text} /> Datos Empresa</h2>
                                <div className="space-y-4">
                                    <input name="tenantName" value={formData.tenantName} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none text-sm" placeholder="Nombre Comercial" />
                                    <input name="shortName" value={formData.shortName} onChange={handleChange} required maxLength={10} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none text-sm" placeholder="Nombre Corto" />
                                    <input name="tenantRut" value={formData.tenantRut} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none text-sm" placeholder="RUT Empresa" />
                                </div>
                                <button type="button" onClick={handleNext} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl ${themeClasses.bg} text-white`}>Continuar <ArrowRight size={20} /></button>
                            </motion.div>
                        ) : (
                            <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                                <h2 className="text-2xl font-black flex items-center gap-3"><User className={themeClasses.text} /> Administrador</h2>
                                <div className="space-y-4">
                                    <input name="adminName" value={formData.adminName} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none text-sm" placeholder="Nombre Admin" />
                                    <input type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none text-sm" placeholder="Email" />
                                    <input type="password" name="adminPassword" value={formData.adminPassword} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none text-sm" placeholder="Contraseña" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={handleBack} className="py-4 border border-white/10 rounded-2xl text-sm font-bold opacity-50">Atrás</button>
                                    <button type="submit" disabled={loading} className={`py-4 rounded-2xl text-sm font-black shadow-xl ${themeClasses.bg} text-white`}>{loading ? '...' : 'Crear'}</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </motion.div>
    );
}
