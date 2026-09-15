import type { Metadata } from "next";
import "./globals.css";
import ReCaptchaProvider from "@/components/captcha/ReCaptchaProvider";

export const metadata: Metadata = {
    title: "Vinzer | Plataforma de Confianza y Trazabilidad para Crematorios",
    description: "La trazabilidad digital que garantiza la tranquilidad de cada familia y el control total de tu crematorio de mascotas.",
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
