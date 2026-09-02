'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function TestBacklogRedirectPage() {
  const router = useRouter();
  const { projectId } = useParams() as { projectId: string };

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/testing/test-cases`);
    }
  }, [projectId, router]);

  return null;
}
