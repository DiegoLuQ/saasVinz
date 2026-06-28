import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('URL requerida', { status: 400 });
    }

    try {
        // 1. Tu servidor (Next.js) descarga la imagen.
        // Al ser servidor-a-servidor, NO existe el bloqueo CORS.
        const response = await fetch(url);

        if (!response.ok) throw new Error('Error al descargar imagen');

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/webp';

        // 2. Tu servidor se la entrega al navegador diciendo "Es seguro, es mía".
        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*', // Permitimos todo
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache agresivo
            },
        });
    } catch (error) {
        console.error('Proxy Error:', error);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}