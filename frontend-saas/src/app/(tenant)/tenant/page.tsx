"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasSession } from '@/lib/auth/token';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hasSession()) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">Redirigiendo...</p>
      </div>
    </div>
  );
}
