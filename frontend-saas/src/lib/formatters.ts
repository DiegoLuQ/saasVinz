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
