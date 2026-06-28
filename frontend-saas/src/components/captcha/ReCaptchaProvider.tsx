'use client';

import React from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

interface Props {
    children: React.ReactNode;
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

export default function ReCaptchaProvider({ children }: Props) {
    if (!SITE_KEY) {
        console.warn('⚠️ NEXT_PUBLIC_RECAPTCHA_SITE_KEY no configurada');
        return <>{children}</>;
    }

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={SITE_KEY}
            scriptProps={{
                async: true,
                defer: true,
                appendTo: 'head',
            }}
            language="es"
        >
            {children}
        </GoogleReCaptchaProvider>
    );
}
