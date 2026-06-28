export interface PlanTheme {
    border: string;
    text: string;
    bg: string;
    accent: string;
    shadow: string;
}

// Paleta cíclica indexada por display_order. Cubre hasta 8 niveles antes de repetir.
// Cada entrada usa colores Tailwind arbitrary values para mantener tonos exactos.
const PALETTE: PlanTheme[] = [
    { border: 'border-[#facc15]/20', text: 'text-[#facc15]', bg: 'bg-[#facc15]/10', accent: 'bg-[#facc15]', shadow: 'shadow-[#facc15]/20' }, // amarillo
    { border: 'border-[#0ea5e9]/20', text: 'text-[#0ea5e9]', bg: 'bg-[#0ea5e9]/10', accent: 'bg-[#0ea5e9]', shadow: 'shadow-[#0ea5e9]/20' }, // celeste
    { border: 'border-[#fb923c]/20', text: 'text-[#fb923c]', bg: 'bg-[#fb923c]/10', accent: 'bg-[#fb923c]', shadow: 'shadow-[#fb923c]/20' }, // naranja
    { border: 'border-[#10b981]/20', text: 'text-[#10b981]', bg: 'bg-[#10b981]/10', accent: 'bg-[#10b981]', shadow: 'shadow-[#10b981]/20' }, // esmeralda
    { border: 'border-[#a855f7]/20', text: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10', accent: 'bg-[#a855f7]', shadow: 'shadow-[#a855f7]/20' }, // violeta
    { border: 'border-[#ec4899]/20', text: 'text-[#ec4899]', bg: 'bg-[#ec4899]/10', accent: 'bg-[#ec4899]', shadow: 'shadow-[#ec4899]/20' }, // rosa
    { border: 'border-[#06b6d4]/20', text: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/10', accent: 'bg-[#06b6d4]', shadow: 'shadow-[#06b6d4]/20' }, // cyan
    { border: 'border-[#f43f5e]/20', text: 'text-[#f43f5e]', bg: 'bg-[#f43f5e]/10', accent: 'bg-[#f43f5e]', shadow: 'shadow-[#f43f5e]/20' }, // carmesí
];

// Overrides por nombre de plan (case/space-insensitive).
// Tienen prioridad sobre la paleta cíclica de display_order.
const NAMED_OVERRIDES: Record<string, PlanTheme> = {
    track: {
        border: 'border-[#d4af37]/30',
        text: 'text-[#d4af37]',
        bg: 'bg-[#d4af37]/10',
        accent: 'bg-[#d4af37]',
        shadow: 'shadow-[#d4af37]/30',
    },
};

function normalizePlanName(name: string | null | undefined): string {
    return (name || '').trim().toLowerCase();
}

export function getPlanTheme(
    displayOrder: number | null | undefined,
    name?: string | null
): PlanTheme {
    const key = normalizePlanName(name);
    if (key && NAMED_OVERRIDES[key]) {
        return NAMED_OVERRIDES[key];
    }
    const safe = typeof displayOrder === 'number' && displayOrder >= 0 ? displayOrder : 0;
    return PALETTE[safe % PALETTE.length];
}

export const PLAN_PALETTE_SIZE = PALETTE.length;
