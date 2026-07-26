'use client';

import { redirect, useParams } from 'next/navigation';

export default function TrashRedirectPage() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/project-trash`);
}
