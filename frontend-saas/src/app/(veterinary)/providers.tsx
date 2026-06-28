'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { VeterinaryThemeProvider } from '@/app/(veterinary)/context/ThemeContext';

export default function VeterinaryProviders({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }));

    return (
        <VeterinaryThemeProvider>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </VeterinaryThemeProvider>
    );
}
