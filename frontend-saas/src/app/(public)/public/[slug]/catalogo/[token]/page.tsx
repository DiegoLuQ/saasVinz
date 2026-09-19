"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest, API_BASE_URL } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import {
    Package,
    Search,
    MessageCircle,
    Clock,
    Sparkles,
    ShieldAlert,
    Phone,
    Share2,
    Check,
    X,
    Filter,
    Layers,
    Tag,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductItem {
    id: number;
    code: string;
    name: string;
    sale_price: number;
    discount_percentage: number;
    stock: number;
    availability_status: string;
    description: string;
    image_url: string | null;
    images: string[];
    category_name: string;
}

interface PublicCatalogData {
    is_expired: boolean;
    tenant_name: string;
    tenant_slug: string;
    tenant_logo?: string | null;
    tenant_phone?: string | null;
    whatsapp?: string | null;
    expires_at?: string | null;
    products: ProductItem[];
}

export default function PublicCatalogPage() {
    const params = useParams();
    const slug = (params?.slug as string) || '';
    const token = (params?.token as string) || '';

    const [data, setData] = useState<PublicCatalogData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [onlyAvailable, setOnlyAvailable] = useState(false);

    // Product Preview Modal
    const [previewProduct, setPreviewProduct] = useState<ProductItem | null>(null);
    const [previewImageIndex, setPreviewImageIndex] = useState(0);

    // Copy link feedback
    const [copiedLink, setCopiedLink] = useState(false);

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        return `${API_BASE_URL}${cleanPath}`;
    };

    useEffect(() => {
        if (!slug || !token) return;

        let isMounted = true;
        const fetchCatalog = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await apiRequest(`/api/public/catalog/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`);
                if (isMounted) {
                    setData(res as PublicCatalogData);
                }
            } catch (err: any) {
                console.error("Error cargando catálogo público:", err);
                if (isMounted) {
                    setError("El catálogo solicitado no existe o el enlace ha caducado.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchCatalog();
        return () => { isMounted = false; };
    }, [slug, token]);

    // Categories list
    const categories = useMemo(() => {
        if (!data?.products) return [];
        const set = new Set<string>();
        data.products.forEach(p => {
            if (p.category_name) set.add(p.category_name);
        });
        return Array.from(set).sort();
    }, [data]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        if (!data?.products) return [];
        return data.products.filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = selectedCategory === 'all' || p.category_name === selectedCategory;

            const isOutOfStock = p.stock <= 0 || p.availability_status?.toLowerCase() === 'agotado';
            const matchesStock = onlyAvailable ? !isOutOfStock : true;

            return matchesSearch && matchesCategory && matchesStock;
        });
    }, [data, searchTerm, selectedCategory, onlyAvailable]);

    const handleShareLink = async () => {
        if (typeof window === 'undefined') return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Catálogo - ${data?.tenant_name || 'Productos'}`,
                    text: `Catálogo online oficial de ${data?.tenant_name}`,
                    url: window.location.href,
                });
                return;
            } catch {
                // User cancelled share, fallback to copy
            }
        }
        const ok = await copyToClipboard(window.location.href);
        if (ok) {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2500);
        }
    };

    const buildWhatsAppUrl = (product: ProductItem) => {
        if (!data) return '#';
        const phone = data.whatsapp || data.tenant_phone?.replace(/\D/g, '') || '';
        if (!phone) return '#';

        const finalPrice = product.discount_percentage > 0
            ? Math.round(product.sale_price * (1 - product.discount_percentage / 100))
            : product.sale_price;

        const formattedPrice = finalPrice.toLocaleString('es-CL');
        const refText = `${product.code || 'S/C'} / $${formattedPrice}`;
        
        // Exact user format: "Hola [Crematorio], me interesa: [Nombre del Producto] (Ref: [SKU / Precio])"
        const message = `Hola ${data.tenant_name}, me interesa: ${product.name} (Ref: ${refText})`;

        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    };

    const buildRenewalWhatsAppUrl = () => {
        if (!data) return '#';
        const phone = data.whatsapp || data.tenant_phone?.replace(/\D/g, '') || '';
        if (!phone) return '#';
        const msg = `Hola ${data.tenant_name}, estaba revisando su catálogo online y el enlace ha expirado. ¿Podrían facilitarme un nuevo enlace actualizado? Muchas gracias.`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    };

    // 1. Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col items-center justify-center p-6">
                <div className="relative flex items-center justify-center mb-6">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                    <Sparkles className="absolute text-amber-400 animate-pulse" size={24} />
                </div>
                <p className="text-muted-foreground text-sm font-medium tracking-wide">Cargando catálogo online...</p>
            </div>
        );
    }

    // 2. Not found / generic error
    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-xl shadow-red-500/5">
                    <ShieldAlert size={36} />
                </div>
                <h1 className="text-2xl font-black text-white mb-2">Catálogo no disponible</h1>
                <p className="text-sm text-neutral-400 max-w-md mb-8">
                    {error || "El enlace ingresado no existe o no tiene autorización de acceso."}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all active:scale-95"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    // 3. Expired Token State
    if (data.is_expired) {
        return (
            <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-md w-full bg-[#111622]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative z-10 space-y-6">
                    {data.tenant_logo ? (
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center justify-center shadow-inner">
                            <img
                                src={getImageUrl(data.tenant_logo)!}
                                alt={data.tenant_name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Clock size={36} />
                        </div>
                    )}

                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest mb-3">
                            <Clock size={13} />
                            Enlace Expirado
                        </span>
                        <h1 className="text-2xl font-black text-white">Este catálogo ha vencido</h1>
                        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                            Por motivos de seguridad y actualización de stock y tarifas, este enlace temporal ha caducado.
                        </p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-left">
                        <p className="text-xs text-neutral-400 font-medium">
                            Si deseas ver los modelos de urnas, relicarios y accesorios vigentes de <strong className="text-white">{data.tenant_name}</strong>, puedes solicitar un nuevo enlace con un solo toque:
                        </p>
                    </div>

                    <div className="space-y-3 pt-2">
                        {data.whatsapp ? (
                            <a
                                href={buildRenewalWhatsAppUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/20 text-sm"
                            >
                                <MessageCircle size={18} />
                                Solicitar Nuevo Catálogo
                            </a>
                        ) : null}

                        {data.tenant_phone && (
                            <a
                                href={`tel:${data.tenant_phone}`}
                                className="w-full bg-white/5 hover:bg-white/10 active:scale-95 text-neutral-300 font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/10 text-xs"
                            >
                                <Phone size={14} />
                                Llamar a {data.tenant_name}
                            </a>
                        )}
                    </div>
                </div>

                <p className="mt-8 text-[11px] text-neutral-500 font-mono">
                    {data.tenant_name} • Catálogo Digital Seguro
                </p>
            </div>
        );
    }

    // 4. Valid Active Catalog
    return (
        <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col selection:bg-amber-500 selection:text-black">
            {/* Top Branding & Expiration Banner */}
            <header className="sticky top-0 z-40 bg-[#0a0d14]/80 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20 gap-4">
                        {/* Tenant Info */}
                        <div className="flex items-center gap-3.5 min-w-0">
                            {data.tenant_logo ? (
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={getImageUrl(data.tenant_logo)!}
                                        alt={data.tenant_name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                    {data.tenant_name.charAt(0)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                                        {data.tenant_name}
                                    </h1>
                                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        <Sparkles size={10} /> Catálogo Oficial
                                    </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5 font-medium truncate">
                                    <span>Urnas & Accesorios Conmemorativos</span>
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {data.expires_at && (
                                <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                                    <Clock size={13} className="text-amber-400" />
                                    <span>Válido hasta: {new Date(data.expires_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}

                            <button
                                onClick={handleShareLink}
                                className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white border border-white/10 flex items-center gap-2 text-xs font-bold transition-all"
                                title="Compartir este catálogo"
                            >
                                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
                                <span className="hidden sm:inline">{copiedLink ? '¡Enlace Copiado!' : 'Compartir'}</span>
                            </button>

                            {data.whatsapp && (
                                <a
                                    href={`https://wa.me/${data.whatsapp}?text=${encodeURIComponent(`Hola ${data.tenant_name}, estoy viendo su catálogo online y me gustaría hacer una consulta.`)}`}
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

            {/* Hero / Filter Bar */}
            <section className="relative bg-gradient-to-b from-amber-500/[0.04] via-transparent to-transparent pt-8 pb-6 border-b border-white/[0.04]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Header text */}
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            Modelos y Accesorios Disponibles
                        </h2>
                        <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                            Selecciona cualquier producto para consultar disponibilidad o solicitarlo de inmediato mediante WhatsApp con atención personalizada.
                        </p>
                    </div>

                    {/* Search & Available Switch */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre, código o características..."
                                className="w-full bg-[#111622] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <label className="flex items-center justify-between sm:justify-start gap-3 bg-[#111622] border border-white/10 rounded-2xl px-4 py-3 cursor-pointer select-none text-xs font-bold text-neutral-300 hover:text-white transition-colors">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Solo Disponibles
                            </span>
                            <input
                                type="checkbox"
                                checked={onlyAvailable}
                                onChange={(e) => setOnlyAvailable(e.target.checked)}
                                className="w-4 h-4 rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                            />
                        </label>
                    </div>

                    {/* Category Filter Chips */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                                    selectedCategory === 'all'
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                Todos ({data.products.length})
                            </button>
                            {categories.map((cat) => {
                                const count = data.products.filter(p => p.category_name === cat).length;
                                const isSelected = selectedCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                                            isSelected
                                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                                : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10'
                                        }`}
                                    >
                                        {cat} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Products Grid */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {filteredProducts.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-4">
                            <Package size={32} />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">No se encontraron productos</h3>
                        <p className="text-xs text-neutral-400 max-w-xs mb-6">
                            Intenta ajustar los filtros de categoría o buscar con otra palabra clave.
                        </p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setOnlyAvailable(false); }}
                            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => {
                            const isOutOfStock = product.stock <= 0 || product.availability_status?.toLowerCase() === 'agotado';
                            const hasDiscount = product.discount_percentage > 0;
                            const finalPrice = hasDiscount
                                ? Math.round(product.sale_price * (1 - product.discount_percentage / 100))
                                : product.sale_price;

                            const whatsAppHref = buildWhatsAppUrl(product);

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    key={product.id}
                                    className="group bg-[#111622] rounded-3xl border border-white/[0.08] hover:border-amber-500/30 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1"
                                >
                                    {/* Image Container */}
                                    <div
                                        onClick={() => {
                                            setPreviewProduct(product);
                                            setPreviewImageIndex(0);
                                        }}
                                        className="relative w-full aspect-square bg-gradient-to-br from-white/[0.02] to-white/[0.06] overflow-hidden cursor-pointer"
                                    >
                                        {/* Discount Badge */}
                                        {hasDiscount && (
                                            <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-lg shadow-rose-500/30 flex items-center gap-1 uppercase tracking-wider">
                                                <Tag size={10} />
                                                <span>-{product.discount_percentage}%</span>
                                            </div>
                                        )}

                                        {/* Stock indicator badge */}
                                        <div className="absolute top-3 right-3 z-10">
                                            {isOutOfStock ? (
                                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-500/80 backdrop-blur-md text-white border border-red-500/30 shadow-lg shadow-red-500/20">
                                                    Agotado
                                                </span>
                                            ) : product.stock === 1 ? (
                                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/80 backdrop-blur-md text-black border border-amber-500/30 shadow-lg shadow-amber-500/20">
                                                    Última unidad
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/80 backdrop-blur-md text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                                                    Disponible
                                                </span>
                                            )}
                                        </div>

                                        {/* Main Photo */}
                                        {product.image_url ? (
                                            <img
                                                src={getImageUrl(product.image_url)!}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                                                <Package size={48} strokeWidth={1.5} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                                    Foto no disponible
                                                </span>
                                            </div>
                                        )}

                                        {/* Hover Overlay Icon */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
                                                Ver Detalle
                                            </span>
                                        </div>
                                    </div>

                                    {/* Product Details */}
                                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white/5 text-neutral-400 border border-white/5 uppercase tracking-wide">
                                                    {product.category_name || 'General'}
                                                </span>
                                                {product.code && (
                                                    <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider font-semibold">
                                                        REF: {product.code}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="font-bold text-base text-white leading-snug group-hover:text-amber-400 transition-colors line-clamp-2">
                                                {product.name}
                                            </h3>

                                            {product.description && (
                                                <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                                                    {product.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Price and CTA */}
                                        <div className="pt-3 border-t border-white/[0.06] space-y-3">
                                            <div className="flex items-baseline justify-between">
                                                <div>
                                                    <span className="text-xs text-neutral-500 block font-medium">Precio</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xl font-black text-amber-400 tracking-tight">
                                                            ${finalPrice.toLocaleString('es-CL')}
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="text-xs text-neutral-500 line-through">
                                                                ${product.sale_price.toLocaleString('es-CL')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* WhatsApp CTA Button */}
                                            <a
                                                href={whatsAppHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                                                    isOutOfStock
                                                        ? 'bg-white/10 hover:bg-white/15 text-neutral-300 border border-white/10 shadow-none'
                                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 hover:shadow-emerald-500/30'
                                                }`}
                                            >
                                                <MessageCircle size={16} />
                                                <span>{isOutOfStock ? 'Consultar Próximo Ingreso' : 'Pedir por WhatsApp'}</span>
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Product Detail Modal */}
            <AnimatePresence>
                {previewProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#111622] border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setPreviewProduct(null)}
                                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all border border-white/10"
                            >
                                <X size={18} />
                            </button>

                            <div className="overflow-y-auto p-6 space-y-6">
                                {/* Image display with gallery preview */}
                                {(() => {
                                    const allImages = [
                                        previewProduct.image_url,
                                        ...(previewProduct.images || [])
                                    ].filter(Boolean) as string[];

                                    const activeImg = allImages[previewImageIndex] || previewProduct.image_url;

                                    return (
                                        <div className="space-y-3">
                                            <div className="w-full aspect-video sm:aspect-[4/3] rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center relative">
                                                {activeImg ? (
                                                    <img
                                                        src={getImageUrl(activeImg)!}
                                                        alt={previewProduct.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-neutral-500">
                                                        <Package size={48} />
                                                        <span className="text-xs font-bold uppercase">Sin imagen</span>
                                                    </div>
                                                )}
                                            </div>

                                            {allImages.length > 1 && (
                                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                                    {allImages.map((img, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setPreviewImageIndex(idx)}
                                                            className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                                                                previewImageIndex === idx
                                                                    ? 'border-amber-400 scale-105'
                                                                    : 'border-white/10 opacity-60 hover:opacity-100'
                                                            }`}
                                                        >
                                                            <img
                                                                src={getImageUrl(img)!}
                                                                alt={`Foto ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Text & info */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-neutral-300 border border-white/10 uppercase tracking-wider">
                                            {previewProduct.category_name}
                                        </span>
                                        <span className="text-xs text-neutral-400 font-mono font-bold">
                                            REF: {previewProduct.code || 'S/C'}
                                        </span>
                                    </div>

                                    <h2 className="text-xl sm:text-2xl font-black text-white">
                                        {previewProduct.name}
                                    </h2>

                                    {previewProduct.description && (
                                        <p className="text-sm text-neutral-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                                            {previewProduct.description}
                                        </p>
                                    )}

                                    <div className="flex items-baseline gap-3 pt-2">
                                        <span className="text-3xl font-black text-amber-400">
                                            ${(
                                                previewProduct.discount_percentage > 0
                                                    ? Math.round(previewProduct.sale_price * (1 - previewProduct.discount_percentage / 100))
                                                    : previewProduct.sale_price
                                            ).toLocaleString('es-CL')}
                                        </span>
                                        {previewProduct.discount_percentage > 0 && (
                                            <span className="text-sm text-neutral-500 line-through">
                                                ${previewProduct.sale_price.toLocaleString('es-CL')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action button inside modal */}
                                    <a
                                        href={buildWhatsAppUrl(previewProduct)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-emerald-500/20 text-sm uppercase tracking-wider"
                                    >
                                        <MessageCircle size={20} />
                                        <span>Consultar por WhatsApp</span>
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="border-t border-white/[0.06] bg-[#07090e] py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        {data.tenant_logo && (
                            <img
                                src={getImageUrl(data.tenant_logo)!}
                                alt={data.tenant_name}
                                className="w-8 h-8 object-contain rounded-lg bg-white/5 p-1 border border-white/10"
                            />
                        )}
                        <div>
                            <p className="text-xs font-bold text-white">{data.tenant_name}</p>
                            <p className="text-[10px] text-neutral-500">Catálogo oficial de productos y memoriales</p>
                        </div>
                    </div>

                    <p className="text-[11px] text-neutral-500 font-mono">
                        Powered by <strong className="text-neutral-400">Vinzer SaaS</strong>
                    </p>
                </div>
            </footer>
        </div>
    );
}
