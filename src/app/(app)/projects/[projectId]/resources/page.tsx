'use client';

import { redirect, useParams } from 'next/navigation';

export default function ResourcesRedirect() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/resources/project-resources`);
}
