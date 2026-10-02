import { extractCertSpec, renderCertSpecToCanvas } from '@/lib/certImageDraw';

const blobToDataURL = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
    });

// Reemplaza los src de <img> por dataURL (descargando vía fetch->blob) para
// que html2canvas pueda capturarlas aunque vengan de R2 (cross-origin).
const inlineImages = async (html: string): Promise<string> => {
    const urls = new Set<string>();
    const re = /<img\b[^>]*?\bsrc="([^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        const u = m[1];
        if (u && !u.startsWith('data:')) urls.add(u);
    }
    const entries = await Promise.all([...urls].map(async (u) => {
        try {
            const resp = await fetch(u, { mode: 'cors', cache: 'no-cache' });
            if (!resp.ok) return null;
            const blob = await resp.blob();
            return [u, await blobToDataURL(blob)] as const;
        } catch {
            return null;
        }
    }));
    for (const e of entries) {
        if (!e) continue;
        html = html.split(`src="${e[0]}"`).join(`src="${e[1]}"`);
    }
    return html;
};

const saveCanvasAsPdf = async (canvas: HTMLCanvasElement, fileName: string) => {
    const { default: JsPDF } = await import('jspdf');
    const w = canvas.width, h = canvas.height;
    const pdf = new JsPDF({ unit: 'px', format: [w, h], orientation: w >= h ? 'landscape' : 'portrait' });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    pdf.save(fileName);
};

export const pdfFileName = (name: string) => `${(name || 'documento').replace(/[^\w-]/g, '_')}.pdf`;

// Descarga un documento guardado (HTML del backend) como PDF, sin diálogo de
// impresión. Si el HTML trae el spec estructurado (certificadoImg) se redibuja
// en canvas con todos los efectos (borde/halo/feather), que html2canvas no
// soporta; si no, se renderiza en un iframe oculto y se captura con html2canvas.
export async function downloadHtmlAsPdf(html: string, fileName: string): Promise<void> {
    const spec = extractCertSpec(html);
    if (spec) {
        await saveCanvasAsPdf(await renderCertSpecToCanvas(spec, 816, 3), fileName);
        return;
    }

    // Hacer relativas las URLs de /storage y /static para same-origin (proxy).
    html = html.replace(/https?:\/\/[^/"')\s]+(\/(?:storage|static)\/)/g, '$1');
    // Incrustar las imágenes: las de R2 son cross-origin y sin esto el canvas
    // queda "tainted" y salen en blanco.
    html = await inlineImages(html);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '816px'; // ancho base ~A4 a 96dpi
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    try {
        const idoc = iframe.contentWindow!.document;
        idoc.open();
        idoc.write(html);
        idoc.close();

        await new Promise<void>((resolve) => {
            if (idoc.readyState === 'complete') resolve();
            else iframe.contentWindow!.addEventListener('load', () => resolve());
        });
        try { await (idoc as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* noop */ }
        const imgs = Array.from(idoc.images);
        await Promise.all(imgs.map((im) => im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); })));

        const target = (idoc.querySelector('.cert-canvas') as HTMLElement) || idoc.body;
        iframe.style.height = `${Math.max(target.scrollHeight, 200)}px`;

        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(target, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
        });
        await saveCanvasAsPdf(canvas, fileName);
    } finally {
        document.body.removeChild(iframe);
    }
}
