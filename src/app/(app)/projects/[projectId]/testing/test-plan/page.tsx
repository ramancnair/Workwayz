'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function TestPlanRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/testing/test-cycle`);
    }
  }, [projectId, router]);

  return (
    <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
      <p>Redirecting to Test Cycles...</p>
    </div>
  );
}
