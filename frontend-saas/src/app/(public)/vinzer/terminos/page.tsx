import type { Metadata } from 'next';
import LegalPage, { legalContactEmail } from '@/components/vinzer/LegalPage';
import { termsDoc } from '@/lib/vinzer/legal';

const meta = termsDoc('');

export const metadata: Metadata = {
    title: `${meta.title} | Vinzer`,
    description: meta.description,
};

export default async function Page() {
    return <LegalPage doc={termsDoc(await legalContactEmail())} />;
}
