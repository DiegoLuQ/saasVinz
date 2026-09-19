import ReCaptchaProvider from "@/components/captcha/ReCaptchaProvider";

// reCAPTCHA solo se usa en formularios públicos (registro, memorial gratuito, demo).
// Vive aquí y no en el layout raíz para no cargar el script de Google en las
// apps de tenant, admin y veterinaria.
export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
    return <ReCaptchaProvider>{children}</ReCaptchaProvider>;
}
