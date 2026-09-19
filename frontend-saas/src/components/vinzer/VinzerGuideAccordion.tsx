'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface GuideFaqItem {
    question: string;
    answer: string;
}

interface VinzerGuideAccordionProps {
    items: GuideFaqItem[];
    theme?: 'dark' | 'light';
}

export function VinzerGuideAccordion({ items, theme = 'dark' }: VinzerGuideAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const isLight = theme === 'light';

    const toggle = (index: number) => {
        setOpenIndex((prev) => (prev === index ? null : index));
    };

    return (
        <div className="space-y-3.5 w-full">
            {items.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                    <div
                        key={idx}
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                            isOpen
                                ? isLight
                                    ? 'bg-sky-50/70 border-sky-300/80 shadow-md shadow-sky-500/5'
                                    : 'bg-[#071120]/90 border-[#19B5FE]/40 shadow-xl shadow-[#19B5FE]/5'
                                : isLight
                                    ? 'bg-white/80 border-slate-200/80 hover:border-slate-300'
                                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => toggle(idx)}
                            aria-expanded={isOpen}
                            className="w-full py-4 sm:py-5 px-5 sm:px-6 text-left flex items-center justify-between gap-4 select-none focus:outline-none"
                        >
                            <span className="flex items-center gap-3">
                                <HelpCircle
                                    size={18}
                                    className={`shrink-0 transition-colors ${
                                        isOpen ? 'text-[#19B5FE]' : isLight ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                                />
                                <span className={`text-sm sm:text-base font-bold transition-colors ${
                                    isOpen
                                        ? isLight ? 'text-sky-950' : 'text-white'
                                        : isLight ? 'text-slate-800' : 'text-slate-200'
                                }`}>
                                    {item.question}
                                </span>
                            </span>
                            <div className={`p-1.5 rounded-full border transition-all duration-300 shrink-0 ${
                                isOpen
                                    ? 'bg-[#19B5FE] text-[#020210] border-[#19B5FE] rotate-180'
                                    : isLight
                                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                                        : 'bg-white/5 text-slate-400 border-white/10'
                            }`}>
                                <ChevronDown size={14} />
                            </div>
                        </button>

                        {isOpen && (
                            <div className="px-5 sm:px-6 pb-5 pt-1 border-t border-white/5">
                                <p className={`text-xs sm:text-sm leading-relaxed ${
                                    isLight ? 'text-slate-600' : 'text-slate-300'
                                }`}>
                                    {item.answer}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
