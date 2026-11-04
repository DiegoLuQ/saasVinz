/** Mismo orden que el catálogo público de planes: Posición (sort_order), luego precio y nombre. */
export function sortPlansForCatalog<T extends { sort_order?: number | null; price?: number | null; name: string }>(plans: T[]): T[] {
    return [...plans].sort((a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
        || (a.price ?? 0) - (b.price ?? 0)
        || a.name.localeCompare(b.name, 'es')
    );
}
