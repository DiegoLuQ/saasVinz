import type { Metadata } from 'next';
import LegalPage, { legalContactEmail } from '@/components/vinzer/LegalPage';
import { cookiesDoc } from '@/lib/vinzer/legal';

const meta = cookiesDoc('');

export const metadata: Metadata = {
    title: `${meta.title} | Vinzer`,
    description: meta.description,
};

export default async function Page() {
    return <LegalPage doc={cookiesDoc(await legalContactEmail())} />;
}
