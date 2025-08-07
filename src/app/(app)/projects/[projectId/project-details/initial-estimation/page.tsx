
'use client';

import { redirect } from 'next/navigation';

export default function DeprecatedPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/project-details/initial-estimation`);
}
