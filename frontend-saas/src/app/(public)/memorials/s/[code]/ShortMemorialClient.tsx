"use client";

import MemorialLoader from '../../v/[cliente]/[mascota]/[uuid]/MemorialLoader';

export default function ShortMemorialClient({ uuid }: { uuid: string }) {
    return <MemorialLoader uuid={uuid} />;
}
