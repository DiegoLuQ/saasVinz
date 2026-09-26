/**
 * Fotos del borrador del formulario público, guardadas en IndexedDB.
 *
 * localStorage solo guarda texto (y ~5 MB): los File de las fotos se perdían
 * al recargar. IndexedDB guarda Blobs directamente. Todo va en try/catch: en
 * navegación privada o sin permisos el formulario sigue funcionando, solo sin
 * recuperar las fotos.
 */
const DB_NAME = 'vinzer-form-drafts';
const STORE = 'images';

interface StoredImage {
    name: string;
    type: string;
    lastModified: number;
    blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB no disponible'));
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb();
    try {
        return await new Promise<T>((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const req = fn(tx.objectStore(STORE));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } finally {
        db.close();
    }
}

export async function saveDraftImages(key: string, files: File[]): Promise<void> {
    try {
        const data: StoredImage[] = files.map((f) => ({ name: f.name, type: f.type, lastModified: f.lastModified, blob: f }));
        await withStore('readwrite', (s) => s.put(data, key));
    } catch { /* sin IndexedDB: las fotos no se recuperan, el resto del formulario sí */ }
}

export async function loadDraftImages(key: string): Promise<File[]> {
    try {
        const data = (await withStore<StoredImage[] | undefined>('readonly', (s) => s.get(key))) || [];
        return data.map((d) => new File([d.blob], d.name, { type: d.type, lastModified: d.lastModified }));
    } catch {
        return [];
    }
}

export async function clearDraftImages(key: string): Promise<void> {
    try {
        await withStore('readwrite', (s) => s.delete(key));
    } catch { /* noop */ }
}
