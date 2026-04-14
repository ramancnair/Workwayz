'use client';

import { redirect } from 'next/navigation';
import { use } from 'react';

export default function ResourcesRedirect({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  redirect(`/projects/${projectId}/resources/project-resources`);
}
