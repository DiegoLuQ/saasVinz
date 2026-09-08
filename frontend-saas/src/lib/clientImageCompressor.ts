/**
 * Comprime y redimensiona una imagen en el cliente antes de enviarla al servidor.
 * Convierte formatos pesados a JPEG optimizado reduciendo la resolución máxima si excede maxWidth/maxHeight.
 */
export async function compressImage(
    file: File,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82
): Promise<File> {
    // Si no es imagen o es SVG/GIF animado, retornar original
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target?.result as string;

            img.onload = () => {
                let { width, height } = img;

                // Calcular factor de escala manteniendo ratio de aspecto
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    // Si falla el contexto 2D, fallback al archivo original
                    return resolve(file);
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob || blob.size >= file.size) {
                            // Si el resultado comprimido no reduce tamaño, conservamos el original
                            return resolve(file);
                        }

                        // Reconstruir un nuevo File con el blob optimizado
                        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                        const compressedFile = new File([blob], newFileName, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });

                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => resolve(file);
        };

        reader.onerror = () => resolve(file);
    });
}

/**
 * Comprime múltiples archivos de imagen en paralelo
 */
export async function compressImages(files: File[]): Promise<File[]> {
    return Promise.all(files.map((file) => compressImage(file)));
}
