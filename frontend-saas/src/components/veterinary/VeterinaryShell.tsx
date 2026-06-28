"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import VeterinarySidebar from '@/components/veterinary/VeterinarySidebar';

import VeterinaryHeader from './VeterinaryHeader';

export default function VeterinaryShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname.includes('/login');

    return (
        <>
            {!isLoginPage && <VeterinarySidebar />}
            <div className={`transition-all duration-300 ${!isLoginPage ? 'md:ml-72' : ''}`}>
                {!isLoginPage && <VeterinaryHeader />}
                {children}
            </div>
        </>
    );
}
