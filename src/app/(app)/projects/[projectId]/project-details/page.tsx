
'use client';

import { redirect } from 'next/navigation';
import { use } from 'react';

export default function ProjectDetailsRedirect({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  redirect(`/projects/${projectId}/project-details/project-synopsis`);
}
