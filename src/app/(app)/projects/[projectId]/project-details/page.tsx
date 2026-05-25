'use client';

import { redirect, useParams } from 'next/navigation';

export default function ProjectDetailsRedirect() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/project-details/project-status`);
}
