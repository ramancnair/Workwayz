'use client';

import { redirect, useParams } from 'next/navigation';

export default function ReleasesRedirect() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/releases/project-releases`);
}
