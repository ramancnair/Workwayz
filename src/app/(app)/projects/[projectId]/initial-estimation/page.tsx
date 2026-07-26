'use client';

import { redirect, useParams } from 'next/navigation';

export default function InitialEstimationRootPage() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/initial-estimation/specifications`);
}
