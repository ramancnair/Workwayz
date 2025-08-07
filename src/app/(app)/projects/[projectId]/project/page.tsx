

'use client';

import { redirect } from 'next/navigation';

export default function DeprecatedProjectPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/project-details/project-dashboard`);
}
