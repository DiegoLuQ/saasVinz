import type { Metadata } from "next";
import "./globals.css";
import ReCaptchaProvider from "@/components/captcha/ReCaptchaProvider";

export const metadata: Metadata = {
    title: "Vinzer - Aliado en tu negocio",
    description: "Sistema integral de gestión para crematorios y servicios funerarios.",
    icons: {
        icon: "/minilogo.webp",
    }
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className="antialiased" suppressHydrationWarning>
                <ReCaptchaProvider>
                    {children}
                </ReCaptchaProvider>
            </body>
        </html>
    );
}
