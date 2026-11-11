export const formatRut = (rut: string): string => {
    if (!rut) return '';
    // Clean RUT (max 9 chars: 8 body + 1 dv, e.g. 12.123.456-7)
    const value = rut.replace(/[^0-9kK]/g, '').slice(0, 9);
    if (value.length < 2) return value;

    const body = value.slice(0, -1);
    const dv = value.slice(-1).toUpperCase();

    // Format body with dots
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedBody}-${dv}`;
};

export const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
    }).format(price);
};

/**
 * Sanitiza el correo en tiempo real mientras se escribe:
 * - Elimina espacios
 * - Solo permite letras, números, ".", "-", "_" y "@"
 * - Evita más de un "@" y puntos consecutivos ".."
 * - Máximo 100 caracteres
 */
export const sanitizeEmailInput = (raw: string): string => {
    if (!raw) return '';
    // Quitar espacios y caracteres no permitidos
    let clean = raw.replace(/\s+/g, '').replace(/[^a-zA-Z0-9._@-]/g, '');
    // Permitir solo un '@'
    const atIndex = clean.indexOf('@');
    if (atIndex !== -1) {
        const beforeAt = clean.slice(0, atIndex + 1);
        const afterAt = clean.slice(atIndex + 1).replace(/@/g, '');
        clean = beforeAt + afterAt;
    }
    // Reemplazar puntos consecutivos '..' por '.'
    clean = clean.replace(/\.{2,}/g, '.');
    return clean.slice(0, 100);
};

/**
 * Auto-corrige errores de tipeo típicos en dominios conocidos (al perder foco o guardar).
 */
export const autoFixEmailDomain = (email: string): string => {
    const clean = sanitizeEmailInput(email).toLowerCase();
    if (!clean.includes('@')) return clean;
    const [local, domain] = clean.split('@');
    if (!domain) return clean;

    const gmailTypos = [
        'gmail.con', 'gmail.co', 'gmail.cm', 'gmail.cpm', 'gmail.om', 'gmail.cl',
        'gmai.com', 'gamil.com', 'gmial.com', 'gmal.com', 'gmaill.com', 'gnail.com', 'gmail.comm'
    ];
    if (gmailTypos.includes(domain)) {
        return `${local}@gmail.com`;
    }
    if (domain === 'hotmail.con' || domain === 'hotmal.com' || domain === 'hotamil.com') {
        return `${local}@hotmail.com`;
    }
    if (domain === 'outlook.con' || domain === 'outlok.com') {
        return `${local}@outlook.com`;
    }
    if (domain === 'yahoo.con') {
        return `${local}@yahoo.com`;
    }
    return clean;
};

/**
 * Valida estrictamente el formato de correo según reglas del sistema.
 * Retorna null si es válido, o un mensaje de error claro si es inválido.
 */
export const validateEmailStrict = (rawEmail?: string): string | null => {
    if (!rawEmail || !rawEmail.trim()) return null;
    const email = rawEmail.trim();

    if (/\s/.test(email)) {
        return 'El correo no puede tener espacios';
    }
    if (email.length > 100) {
        return 'Máximo 100 caracteres';
    }
    if (!email.includes('@')) {
        return 'El correo debe incluir @';
    }
    if (/\.{2,}/.test(email)) {
        return 'El correo no puede tener puntos seguidos';
    }
    const [local, domain, ...rest] = email.split('@');
    if (rest.length > 0 || !local || !domain) {
        return 'Formato de correo inválido';
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(local)) {
        return 'Solo se permiten letras, números, puntos (.), guiones (-) y guion bajo (_)';
    }
    if (local.startsWith('.') || local.endsWith('.')) {
        return 'El correo no puede empezar ni terminar con punto antes del @';
    }
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain) || domain.startsWith('.') || domain.endsWith('.')) {
        return 'Dominio de correo inválido (ej: @gmail.com)';
    }

    const lowerDomain = domain.toLowerCase();
    // Si escribió alguna variante de Gmail que no termina exactamente en gmail.com
    if ((lowerDomain.startsWith('gmail.') || /^(gmai|gamil|gmial|gmal|gmaill|gnail)\./.test(lowerDomain)) && lowerDomain !== 'gmail.com') {
        return 'Si usas Gmail debe terminar en @gmail.com';
    }
    if (lowerDomain.endsWith('.con')) {
        return 'Revisa el dominio: ¿quisiste escribir .com en vez de .con?';
    }

    return null;
};

/**
 * Valida teléfono/celular según el código de país.
 * Retorna null si es válido, o un mensaje de error claro.
 */
export const validatePhoneStrict = (phone?: string): string | null => {
    if (!phone || !phone.trim()) return 'Requerido';
    const trimmed = phone.trim();

    // Si es Chile (+56)
    if (trimmed.startsWith('+56')) {
        const localDigits = trimmed.slice(3).replace(/\D/g, '');
        if (localDigits.length !== 9) {
            return 'Ingresa 9 dígitos (ej: 9 1234 5678)';
        }
        if (localDigits.startsWith('0') || /^(\d)\1{8}$/.test(localDigits)) {
            return 'Número de celular inválido';
        }
        return null;
    }

    // Otros países: mínimo 7 dígitos locales, máximo 15 en total
    const allDigits = trimmed.replace(/\D/g, '');
    if (allDigits.length < 8 || allDigits.length > 15) {
        return 'Ingresa un número de teléfono válido';
    }
    return null;
};
