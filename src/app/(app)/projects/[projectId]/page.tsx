'use client';
import { useParams, useRouter } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';
import { useEffect } from 'react';

export default function ProjectRootPage() {
  const { projectId } = useParams() as { projectId: string };
  const { project, isLoading } = useProject();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && project) {
      if (project.status === 'Initial Estimation' || project.status === 'Not Started') {
        router.replace(`/projects/${projectId}/initial-estimation/specifications`);
      } else {
        router.replace(`/projects/${projectId}/development/dashboard`);
      }
    }
  }, [project, isLoading, projectId, router]);

  return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
}
