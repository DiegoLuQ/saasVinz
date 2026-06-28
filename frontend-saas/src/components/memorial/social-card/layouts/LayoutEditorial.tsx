import React from 'react';
import { getTranslations, type Locale } from '@/lib/translations';

interface LayoutEditorialProps {
    mascota: any;
    tenant_info: any;
    locale: Locale;
    bgImage: string;
    isPost: boolean;
    isStories: boolean;
}

export default function LayoutEditorial({ mascota, tenant_info, locale, bgImage, isPost, isStories }: LayoutEditorialProps) {
    const t = getTranslations(locale);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative w-full h-full overflow-hidden"
                style={{
                    borderColor: 'rgba(212, 175, 55, 0.3)',
                    width: '90%',
                    borderRadius: '500px 500px 30px 30px',
                    borderWidth: '1px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}>

                <img src={bgImage} crossOrigin="anonymous" className="w-full h-full object-cover" />

                <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
                <div className="absolute inset-0 h-[40%]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />
                <div className="absolute inset-0 top-[50%]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)' }} />

                <div className="relative z-10 h-full flex flex-col p-10 pt-16">
                    <div className="mt-auto mb-10 border-b pb-6 relative z-20" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em]" style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            color: isPost ? '#D4AF37' : '#ffffff'
                        }}>
                            {mascota?.birth_date ? new Date(mascota.birth_date).getFullYear() : '...'} — {mascota?.death_date ? new Date(mascota.death_date).getFullYear() : '...'}
                        </span>
                        <h1 className="font-serif mt-2 leading-[0.9] tracking-tighter" style={{
                            fontFamily: 'Georgia, serif',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            color: '#ffffff',
                            fontSize: isStories ? '3.75rem' : '3rem'
                        }}>
                            {mascota?.name}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
}
