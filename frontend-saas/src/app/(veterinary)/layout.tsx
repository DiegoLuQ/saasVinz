import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import VeterinaryProviders from './providers';
import VeterinaryShell from '@/components/veterinary/VeterinaryShell';

export const metadata: Metadata = {
    title: 'Portal Veterinario | Partners',
    description: 'Portal de gestión para veterinarias asociadas',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function VeterinaryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="antialiased min-h-screen bg-[var(--background-color)] text-[var(--foreground-color)] font-sans selection:bg-[var(--primary-color)]/20 transition-colors duration-300">
            <VeterinaryProviders>
                <VeterinaryShell>
                    {children}
                </VeterinaryShell>
            </VeterinaryProviders>
        </div>
    );
}
