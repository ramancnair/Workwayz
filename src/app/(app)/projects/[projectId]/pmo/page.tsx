'use client';

import { redirect, useParams } from 'next/navigation';

export default function PmoRootPage() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/pmo/documents`);
}
