import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('URL requerida', { status: 400 });
    }

    try {
        console.log('Proxying image request for:', url);

        // 1. Descargar la imagen desde el servidor
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            cache: 'no-store' // Evitar cache del servidor para pruebas
        });

        if (!response.ok) {
            console.error(`Proxy: Error fetching image. Status: ${response.status}`);
            return new NextResponse(`Error al descargar imagen: ${response.statusText}`, { status: response.status });
        }

        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'image/webp';

        // 2. Entregar la imagen al cliente
        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error: any) {
        console.error('Proxy Error:', error.message);
        return new NextResponse(`Error fetching image: ${error.message}`, { status: 500 });
    }
}
