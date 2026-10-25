// Reglas de los campos del registro (vinzer.cl/crear-cuenta). Las mismas reglas
// se validan en el backend: backend/app/api/public/signup/router.py
// (PHONE_RULES, EMAIL_RE, NAME_FORBIDDEN). Mantener ambos iguales.

/** Códigos de Sudamérica y cuántos dígitos tiene el número sin el código. */
export const SA_PHONE_CODES = [
    { code: '+56', country: 'Chile', flag: '🇨🇱', min: 9, max: 9, placeholder: '912345678' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷', min: 10, max: 11, placeholder: '91123456789' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴', min: 8, max: 8, placeholder: '71234567' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷', min: 10, max: 11, placeholder: '11912345678' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴', min: 10, max: 10, placeholder: '3001234567' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨', min: 9, max: 9, placeholder: '991234567' },
    { code: '+592', country: 'Guyana', flag: '🇬🇾', min: 7, max: 7, placeholder: '6091234' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾', min: 9, max: 9, placeholder: '981123456' },
    { code: '+51', country: 'Perú', flag: '🇵🇪', min: 9, max: 9, placeholder: '912345678' },
    { code: '+597', country: 'Surinam', flag: '🇸🇷', min: 7, max: 7, placeholder: '7412345' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾', min: 8, max: 8, placeholder: '94231234' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪', min: 10, max: 10, placeholder: '4121234567' },
] as const;

export type PhoneCode = (typeof SA_PHONE_CODES)[number];

export const phoneRule = (code: string): PhoneCode => SA_PHONE_CODES.find((c) => c.code === code) ?? SA_PHONE_CODES[0];

/** Solo dígitos, hasta el máximo del país. */
export const cleanPhoneDigits = (value: string, code: string) => value.replace(/\D/g, '').slice(0, phoneRule(code).max);

export function phoneError(digits: string, code: string): string | null {
    const r = phoneRule(code);
    if (digits.length >= r.min && digits.length <= r.max) return null;
    return r.min === r.max
        ? `El número de ${r.country} debe tener ${r.min} dígitos.`
        : `El número de ${r.country} debe tener entre ${r.min} y ${r.max} dígitos.`;
}

export const EMAIL_MAX = 100;
export const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** Correo: solo letras, números y . _ % + - con una sola @, en minúsculas y sin espacios. */
export function cleanEmail(value: string): string {
    const v = value.toLowerCase().replace(/[^a-z0-9._%+\-@]/g, '');
    const at = v.indexOf('@');
    const single = at === -1 ? v : v.slice(0, at + 1) + v.slice(at + 1).replace(/@/g, '');
    return single.slice(0, EMAIL_MAX);
}

export function emailError(email: string): string | null {
    if (!email) return 'Ingresa tu correo.';
    if (!email.includes('@')) return 'El correo debe incluir @ (ej. nombre@crematorio.cl).';
    return EMAIL_RE.test(email) ? null : 'Revisa el correo: debe tener el formato nombre@dominio.cl.';
}

/** Nombres: texto normal, sin caracteres que sirvan para inyectar código (< > " ` { } \ ; =). */
export const cleanName = (value: string) => value.replace(/[<>"`{}\\;=]/g, '');
