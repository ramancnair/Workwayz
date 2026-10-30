'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LegacyLeaveCalendarPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/resources/leave-calendar`);
    }
  }, [projectId, router]);

  return null;
}
