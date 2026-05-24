'use client';
import { redirect, useParams } from 'next/navigation';

export default function ProjectRootPage() {
  const { projectId } = useParams() as { projectId: string };
  // The primary navigation logic is now handled by the links on the project-home page.
  // This page serves as a fallback, directing to the main dashboard.
  redirect(`/projects/${projectId}/development/dashboard`);
}
