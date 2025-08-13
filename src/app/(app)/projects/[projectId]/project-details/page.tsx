'use client';

import { redirect } from 'next/navigation';

export default function ProjectDetailsPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/project-details/project-dashboard`);
}
