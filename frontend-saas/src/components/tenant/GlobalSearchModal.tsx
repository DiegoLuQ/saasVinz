import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Dog, Users, FileText, Settings, X, Loader2, CornerDownLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/tenant/api';
import { Skeleton } from '@/components/tenant/ui/Skeleton';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResultItem {
    id: number;
    name: string;
    subtitle: string;
    url: string;
}

interface SearchResults {
    pets: SearchResultItem[];
    customers: SearchResultItem[];
    orders: SearchResultItem[];
    services: SearchResultItem[];
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResults | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Flatten results to easily navigate with arrow keys
    const getFlattenedResults = (): (SearchResultItem & { type: string })[] => {
        if (!results) return [];
        const flat: (SearchResultItem & { type: string })[] = [];
        results.orders.forEach(item => flat.push({ ...item, type: 'Cremación/Orden' }));
        results.pets.forEach(item => flat.push({ ...item, type: 'Mascota' }));
        results.customers.forEach(item => flat.push({ ...item, type: 'Cliente' }));
        results.services.forEach(item => flat.push({ ...item, type: 'Servicio' }));
        return flat;
    };

    const flatResults = getFlattenedResults();

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults(null);
            setSelectedIndex(0);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Handle debounced search
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        debounceTimerRef.current = setTimeout(async () => {
            try {
                const data = await apiRequest(`/api/internal/dashboard/search?q=${encodeURIComponent(trimmed)}`);
                setResults(data);
                setSelectedIndex(0);
            } catch (err) {
                console.error("Error searching global:", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [query]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (flatResults.length > 0 ? (prev + 1) % flatResults.length : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (flatResults.length > 0 ? (prev - 1 + flatResults.length) % flatResults.length : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatResults[selectedIndex]) {
                    handleNavigate(flatResults[selectedIndex].url);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, flatResults, selectedIndex]);

    const handleNavigate = (url: string) => {
        router.push(url);
        onClose();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'Mascota':
                return <Dog size={16} className="text-teal-400" />;
            case 'Cliente':
                return <Users size={16} className="text-sky-400" />;
            case 'Cremación/Orden':
                return <FileText size={16} className="text-amber-400" />;
            case 'Servicio':
                return <Settings size={16} className="text-purple-400" />;
            default:
                return <Sparkles size={16} className="text-primary" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[10vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -10 }}
                        className="relative w-full max-w-2xl bg-[#0f1322]/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] z-10"
                    >
                        {/* Search Bar Input */}
                        <div className="flex items-center px-5 py-4 border-b border-white/5 gap-3">
                            <Search className="text-muted-foreground shrink-0" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Escribe para buscar (mascotas, clientes, servicios, órdenes, tracking)..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm font-medium w-full py-1"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <div className="text-[10px] bg-white/5 border border-white/10 text-muted-foreground px-2 py-1 rounded-lg font-bold uppercase tracking-wider shrink-0 select-none">
                                Esc
                            </div>
                        </div>

                        {/* Search Results Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[150px]">
                            {loading && (
                                <div className="space-y-3 p-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/2 border border-white/5">
                                            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-1/3" />
                                                <Skeleton className="h-3 w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!loading && query.trim().length >= 2 && flatResults.length === 0 && (
                                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                                    <Search size={32} className="opacity-20 mb-3" />
                                    <p className="text-sm font-medium">No se encontraron resultados para "{query}"</p>
                                    <p className="text-xs opacity-50 mt-1">Prueba con palabras clave diferentes o términos parciales.</p>
                                </div>
                            )}

                            {!loading && query.trim().length < 2 && (
                                <div className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center">
                                    <Sparkles size={28} className="text-primary opacity-60 mb-3 animate-pulse" />
                                    <p className="text-sm font-semibold">Buscador Universal de la Plataforma</p>
                                    <p className="text-xs opacity-50 mt-1 max-w-sm leading-relaxed">
                                        Escribe el nombre de un cliente, una mascota, el número de una orden (OC) o un servicio para acceder rápidamente a su sección.
                                    </p>
                                </div>
                            )}

                            {!loading && results && flatResults.length > 0 && (
                                <div className="space-y-4">
                                    {/* Groups */}
                                    {Object.entries(results).map(([category, items]) => {
                                        const typedItems = items as SearchResultItem[];
                                        if (typedItems.length === 0) return null;
                                        
                                        const categoryLabels: Record<string, string> = {
                                            pets: 'Mascotas',
                                            customers: 'Clientes',
                                            orders: 'Órdenes de Cremación',
                                            services: 'Servicios de Catálogo'
                                        };

                                        return (
                                            <div key={category} className="space-y-1.5">
                                                <h4 className="text-[10px] font-black uppercase tracking-wider text-primary/75 px-3">
                                                    {categoryLabels[category] || category}
                                                </h4>
                                                <div className="space-y-1">
                                                    {typedItems.map((item: SearchResultItem) => {
                                                        const globalIndex = flatResults.findIndex(flat => flat.id === item.id && flat.name === item.name);
                                                        const isSelected = globalIndex === selectedIndex;

                                                        return (
                                                            <div
                                                                key={`${item.id}-${item.name}`}
                                                                onClick={() => handleNavigate(item.url)}
                                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                                className={`p-3 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${
                                                                    isSelected
                                                                        ? 'bg-primary/10 border-primary/20 text-white shadow-lg shadow-primary/5'
                                                                        : 'bg-white/2 border-white/5 text-slate-300 hover:bg-white/5 hover:text-white'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                                        isSelected ? 'bg-primary/20' : 'bg-white/5'
                                                                    }`}>
                                                                        {getIcon(flatResults[globalIndex]?.type)}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-sm truncate">{item.name}</p>
                                                                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                {isSelected && (
                                                                    <div className="flex items-center gap-1.5 text-[9px] bg-primary/20 text-primary px-2 py-1 rounded-lg font-black uppercase tracking-wider shrink-0 select-none">
                                                                        <CornerDownLeft size={10} /> Ir
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Shortcuts footer */}
                        <div className="px-5 py-3.5 bg-white/2 border-t border-white/5 flex justify-between items-center text-[10px] text-muted-foreground select-none font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-3">
                                <span>↑↓ Navegar</span>
                                <span>↵ Seleccionar</span>
                                <span>Esc Cerrar</span>
                            </div>
                            <div className="text-primary/75">
                                Búsqueda Integrada
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
