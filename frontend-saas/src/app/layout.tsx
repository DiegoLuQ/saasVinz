import type { Metadata } from "next";
import "./globals.css";
import ReCaptchaProvider from "@/components/captcha/ReCaptchaProvider";

export const metadata: Metadata = {
    title: "Vincer - Aliado en tu negocio",
    description: "Sistema integral de gestión para crematorios y servicios funerarios.",
    icons: {
        icon: "https://i.postimg.cc/Kv0HHfdm/Logo-Vincer-saas-crematorio.webp",
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
