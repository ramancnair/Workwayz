'use client';
import { redirect } from 'next/navigation';
import { use } from 'react';

export default function ProjectRootPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  // The primary navigation logic is now handled by the links on the project-home page.
  // This page serves as a fallback, directing to the main dashboard.
  redirect(`/projects/${projectId}/development/dashboard`);
}
