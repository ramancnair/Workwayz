'use client';

import { redirect, useParams } from 'next/navigation';

export default function SettingsRedirect() {
  const { projectId } = useParams() as { projectId: string };
  redirect(`/projects/${projectId}/project-settings/board`);
}
