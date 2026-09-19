'use client';

import React, { useEffect, useState } from 'react';
import { ListOrdered, Bookmark } from 'lucide-react';

export interface TOCItem {
    id: string;
    label: string;
    level?: 2 | 3;
}

interface VinzerGuideTOCProps {
    items: TOCItem[];
    theme?: 'dark' | 'light';
}

export function VinzerGuideTOC({ items, theme = 'dark' }: VinzerGuideTOCProps) {
    const [activeId, setActiveId] = useState<string>(items[0]?.id || '');
    const isLight = theme === 'light';

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                rootMargin: '-80px 0px -70% 0px',
                threshold: 0,
            }
        );

        items.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [items]);

    const scrollTo = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) {
            const navOffset = 90;
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
            setActiveId(id);
        }
    };

    return (
        <nav
            aria-label="Índice del artículo"
            className={`p-5 rounded-2xl border backdrop-blur-md sticky top-24 transition-all duration-300 ${
                isLight
                    ? 'bg-white/85 border-slate-200/90 shadow-lg shadow-slate-900/5'
                    : 'bg-[#071120]/80 border-white/10 shadow-xl shadow-black/40'
            }`}
        >
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
                <Bookmark size={15} className="text-[#19B5FE]" />
                <h3 className={`text-xs font-black uppercase tracking-wider ${
                    isLight ? 'text-slate-900' : 'text-white'
                }`}>
                    En este artículo
                </h3>
            </div>

            <ul className="space-y-1.5 text-xs">
                {items.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                        <li key={item.id} className={item.level === 3 ? 'pl-3' : ''}>
                            <a
                                href={`#${item.id}`}
                                onClick={(e) => scrollTo(e, item.id)}
                                className={`group flex items-start gap-2 py-1 px-2 rounded-lg transition-all duration-200 ${
                                    isActive
                                        ? isLight
                                            ? 'bg-sky-50 text-[#0284C7] font-bold shadow-xs'
                                            : 'bg-[#19B5FE]/10 text-[#19B5FE] font-bold'
                                        : isLight
                                            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 transition-all shrink-0 ${
                                    isActive ? 'bg-[#19B5FE] scale-125' : 'bg-slate-600 group-hover:bg-slate-400'
                                }`} />
                                <span className="line-clamp-2 leading-snug">{item.label}</span>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
