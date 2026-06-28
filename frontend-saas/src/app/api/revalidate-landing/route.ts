import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
    try {
        // Purge Next.js cache tags and paths associated with the landing page
        (revalidateTag as any)('landing-config');
        revalidatePath('/vincer');
        revalidatePath('/');

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            message: 'Landing page cache revalidated successfully'
        }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({
            revalidated: false,
            error: error.message || 'Unknown error during revalidation'
        }, { status: 500 });
    }
}
