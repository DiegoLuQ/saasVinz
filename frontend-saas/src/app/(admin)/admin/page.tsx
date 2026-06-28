import React from 'react';
import LandingPageClient from './LandingPageClient';

export default async function LandingPage() {
    let config = null;

    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/public/landing-config`, {
            next: { tags: ['landing-config'] },
        });

        if (response.ok) {
            const data = await response.json();
            config = data.config;
        }
    } catch (error) {
        console.error('Error fetching landing config on the server:', error);
    }

    return <LandingPageClient initialConfig={config} />;
}
