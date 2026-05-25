'use client';

import { redirect, useParams } from 'next/navigation';

export default function ProjectGanttRedirect() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/resources/resource-workload`);
}
