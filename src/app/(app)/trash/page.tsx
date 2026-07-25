'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TrashRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portfolio-trash');
  }, [router]);

  return null;
}
