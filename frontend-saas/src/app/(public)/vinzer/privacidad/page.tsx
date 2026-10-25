import type { Metadata } from 'next';
import LegalPage, { legalContactEmail } from '@/components/vinzer/LegalPage';
import { privacyDoc } from '@/lib/vinzer/legal';

const meta = privacyDoc('');

export const metadata: Metadata = {
    title: `${meta.title} | Vinzer`,
    description: meta.description,
};

export default async function Page() {
    return <LegalPage doc={privacyDoc(await legalContactEmail())} />;
}
