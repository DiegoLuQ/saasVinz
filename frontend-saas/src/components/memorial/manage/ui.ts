// Estilos compartidos de la página de gestión familiar del memorial
// (/memorials/m/{uuid}/gestion). Claro/oscuro según la preferencia del visitante.

export type ManageForm = {
    msg_despedida: string;
    diseno: {
        tema: string;
        particulas: string;
        tipo_diseno: string;
        portada_url: string;
        captions: Record<string, string>;
    };
    private_mode: boolean;
    pin: string;
    main_image_url: string;
    lista_imagenes: string[];
};

export type Dedication = {
    id_dedicatoria: number;
    mensajero: string;
    mensaje: string;
    fecha: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
};

export const cardClass = (isDark: boolean) =>
    `rounded-3xl border p-5 sm:p-6 shadow-sm ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/70'}`;

export const titleClass = (isDark: boolean) =>
    `text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`;

export const mutedClass = (isDark: boolean) => (isDark ? 'text-slate-400' : 'text-slate-500');

export const secondaryBtn = (isDark: boolean) =>
    `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${isDark ? 'bg-slate-900/40 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`;

export const primaryBtn =
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors';

export const slugify = (value: string) =>
    (value || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

export const publicMemorialPath = (tenantName: string | undefined, petName: string, uuid: string) =>
    `/memorials/v/${slugify(tenantName || 'memorial')}/${slugify(petName)}/${uuid}`;

export const validImages = (list: string[] | undefined | null) =>
    (list || []).filter((img) => img && img.startsWith('http'));
