'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RedirectToHolidaysLeaveSummary() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/holidays/leave-summary`);
    }
  }, [projectId, router]);

  return null;
}
